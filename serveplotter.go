package main

import (
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
	
	cparse "github.com/SoftwareDefinedBuildings/sync2_quasar/configparser"
	cpint "github.com/SoftwareDefinedBuildings/quasar/cpinterface"
	capnp "github.com/glycerine/go-capnproto"
	ws "github.com/gorilla/websocket"
	uuid "code.google.com/p/go-uuid/uuid"
)

var upgrader = ws.Upgrader{}

type QueryMessagePart struct {
	segment *capnp.Segment
	request *cpint.Request
	query *cpint.CmdQueryStatisticalValues
}

var queryPool sync.Pool = sync.Pool{
	New: func () interface{} {
		var seg *capnp.Segment = capnp.NewBuffer(nil)
		var req cpint.Request = cpint.NewRootRequest(seg)
		var query cpint.CmdQueryStatisticalValues = cpint.NewCmdQueryStatisticalValues(seg)
		query.SetVersion(0)
		return QueryMessagePart{
			segment: seg,
			request: &req,
			query: &query,
		}
	},
}

type Writable interface {
	GetWriter () io.Writer
}

type RespWrapper struct {
	wr http.ResponseWriter
}

func (rw RespWrapper) GetWriter() io.Writer {
	return rw.wr
}

type ConnWrapper struct {
	Writing *sync.Mutex
	Conn *ws.Conn
	CurrWriter io.WriteCloser
}

func (cw *ConnWrapper) GetWriter() io.Writer {
	cw.Writing.Lock()
	w, err := cw.Conn.NextWriter(ws.TextMessage)
	if err == nil {
		cw.CurrWriter = w
		return w
	} else {
		fmt.Printf("Could not get writer on WebSocket: %v", err)
		return nil
	}
}

/** DataRequester encapsulates a series of connections used for obtaining data
    from QUASAR. */
type DataRequester struct {
	connections []net.Conn
	sendLocks []*sync.Mutex
	currID uint64
	connID uint32
	pending uint32
	maxPending uint32
	pendingLock *sync.Mutex
	responseWriters map[uint64]Writable
	synchronizers map[uint64]chan bool
	alive bool
}

/** Creates a new DataRequester object.
    dbAddr - the address of the database from where to obtain data.
    numConnections - the number of connections to use.
    maxPending - a limit on the maximum number of pending requests. */
func NewDataRequester(dbAddr string, numConnections int, maxPending uint32) *DataRequester {
	var connections []net.Conn = make([]net.Conn, numConnections)
	var locks []*sync.Mutex = make([]*sync.Mutex, numConnections)
	var err error
	var i int
	for i = 0; i < numConnections; i++ {
		connections[i], err = net.Dial("tcp", dbAddr)
		if err != nil {
			fmt.Printf("Could not connect to database at %v: %v\n", dbAddr, err)
			return nil
		}
		locks[i] = &sync.Mutex{}
	}
	
	var dr *DataRequester = &DataRequester{
		connections: connections,
		sendLocks: locks,
		currID: 0,
		connID: 0,
		pending: 0,
		maxPending: maxPending,
		pendingLock: &sync.Mutex{},
		responseWriters: make(map[uint64]Writable),
		synchronizers: make(map[uint64]chan bool),
		alive: true,
	}
	
	for i = 0; i < numConnections; i++ {
		go dr.handleDataResponse(connections[i])
	}
	
	return dr
}

/* Makes a request for data and writes the result to the specified Writer. */
func (dr *DataRequester) MakeDataRequest(uuidBytes uuid.UUID, startTime int64, endTime int64, pw uint8, writ Writable) {
	for true {
		dr.pendingLock.Lock()
		if dr.pending < dr.maxPending {
			dr.pending += 1
			dr.pendingLock.Unlock()
			break
		} else {
			dr.pendingLock.Unlock()
			time.Sleep(time.Second)
		}
	}
	
	defer atomic.AddUint32(&dr.pending, 0xFFFFFFFF)
	
	var mp QueryMessagePart = queryPool.Get().(QueryMessagePart)
	
	segment := mp.segment
	request := mp.request
	query := mp.query
	
	query.SetUuid([]byte(uuidBytes))
	query.SetVersion(0)
	query.SetStartTime(startTime)
	query.SetEndTime(endTime)
	query.SetPointWidth(pw)
	
	id := atomic.AddUint64(&dr.currID, 1)
	
	request.SetEchoTag(id)
	
	request.SetQueryStatisticalValues(*query)
	
	cid := atomic.AddUint32(&dr.connID, 1) % uint32(len(dr.connections))
	
	dr.sendLocks[cid].Lock()
	dr.responseWriters[id] = writ
	dr.synchronizers[id] = make(chan bool)
	_, sendErr := segment.WriteTo(dr.connections[cid])
	dr.sendLocks[cid].Unlock()
	
	defer delete(dr.responseWriters, id)
	defer delete(dr.synchronizers, id)
	
	queryPool.Put(mp)
	
	if sendErr != nil {
		w := writ.GetWriter()
		w.Write([]byte(fmt.Sprintf("Could not send query to database: %v", sendErr)))
		return
	}
	
	<- dr.synchronizers[id]
}

/** A function designed to handle QUASAR's response over Cap'n Proto.
    You shouldn't ever have to invoke this function. It is used internally by
    the constructor function. */
func (dr *DataRequester) handleDataResponse(connection net.Conn) {
	for dr.alive {
	    // Only one goroutine will be reading at a time, so a lock isn't needed
		responseSegment, respErr := capnp.ReadFromStream(connection, nil)
		
		if respErr != nil {
			if !dr.alive {
				break
			}
			fmt.Printf("Error in receiving response: %v\n", respErr)
			continue
		}
		
		responseSeg := cpint.ReadRootResponse(responseSegment)
		id := responseSeg.EchoTag()
		status := responseSeg.StatusCode()
		records := responseSeg.StatisticalRecords().Values()
		
		writ := dr.responseWriters[id]
		
		w := writ.GetWriter()
		
		if status != cpint.STATUSCODE_OK {
			w.Write([]byte(fmt.Sprintf("Database returns status code %v", status)))
			dr.synchronizers[id] <- false
			continue
		}
		
		length := records.Len()
		if length == 0 {
		    w.Write([]byte("[]"))
		} else {
			w.Write([]byte("["))
			for i := 0; i < length; i++ {
				record := records.At(i)
				time := record.Time()
				millis := time / 1000000
				nanos := time % 1000000
				if nanos < 0 {
					nanos += 1000000
					millis += 1
				}
				switch (i) {
				case 0:
					w.Write([]byte(fmt.Sprintf("[%v,%v,%v,%v,%v,%v]", millis, nanos, record.Min(), record.Mean(), record.Max(), record.Count())))
				default:
					w.Write([]byte(fmt.Sprintf(",[%v,%v,%v,%v,%v,%v]", millis, nanos, record.Min(), record.Mean(), record.Max(), record.Count())))
				}
			}
		
			w.Write([]byte("]"))
		}
		
		dr.synchronizers[id] <- true
	}
}

func (dr *DataRequester) stop() {
	dr.alive = false
}

func parseDataRequest(request string, writ Writable) (uuidBytes uuid.UUID, startTime int64, endTime int64, pw uint8, extra string, success bool) {
	var args []string = strings.Split(string(request), ",")
	var err error
	
	success = false
	var w io.Writer

	if len(args) != 4 && len(args) != 5 {
		w = writ.GetWriter()
		w.Write([]byte(fmt.Sprintf("Four or five arguments are required; got %v", len(args))))
		return
	}
	
	if len(args) == 5 {
	    extra = args[4]
	}

	uuidBytes = uuid.Parse(args[0])

	if uuidBytes == nil {
		w = writ.GetWriter()
		w.Write([]byte(fmt.Sprintf("Invalid UUID: got %v", args[0])))
		return
	}
	var pwTemp int64

	startTime, err = strconv.ParseInt(args[1], 10, 64)
	if err != nil {
		w = writ.GetWriter()
		w.Write([]byte(fmt.Sprintf("Could not interpret %v as an int64: %v", args[1], err)))
		return
	}

	endTime, err = strconv.ParseInt(args[2], 10, 64)
	if err != nil {
		w = writ.GetWriter()
		w.Write([]byte(fmt.Sprintf("Could not interpret %v as an int64: %v", args[2], err)))
		return
	}

	pwTemp, err = strconv.ParseInt(args[3], 10, 16)
	if err != nil {
		w = writ.GetWriter()
		w.Write([]byte(fmt.Sprintf("Could not interpret %v as an int16: %v", args[3], err)))
		return
	}

	pw = uint8(pwTemp)
	
	startTime = ((startTime >> pw) << pw)
	endTime = (((endTime >> pw) + 1) << pw) // we add one pointwidth to the endtime to simulate an inclusive endpoint
	
	success = true
	
	return
}

func main() {
	configfile, err := ioutil.ReadFile("plotter.ini")
	if err != nil {
		fmt.Printf("Could not read plotter.ini: %v\n", err)
		return
	}
	
	config, isErr := cparse.ParseConfig(string(configfile))
    if isErr {
        fmt.Println("There were errors while parsing plotter.ini. See above.")
        return
    }
    
	directory, ok := config["plotter_dir"]
	if !ok {
	    fmt.Println("Configuration file is missing required key \"plotter_dir\"")
	    return
	}
	
	var dr *DataRequester = NewDataRequester("localhost:4410", 2, 8)
	
	http.Handle("/", http.FileServer(http.Dir(directory.(string))))
	http.HandleFunc("/dataws", func (w http.ResponseWriter, r *http.Request) {
		websocket, upgradeerr := upgrader.Upgrade(w, r, nil)
		if upgradeerr != nil {
			// TODO Perhaps we could redirect somehow?
			w.Write([]byte(fmt.Sprintf("Could not upgrade HTTP connection to WebSocket: %v\n", upgradeerr)))
			return
		}
		
		cw := ConnWrapper{
			Writing: &sync.Mutex{},
			Conn: websocket,
		}
		
		for {
			_, payload, err := websocket.ReadMessage()
			
			if err != nil {
				return // Most likely the connection was closed
			}
			
			uuidBytes, startTime, endTime, pw, echoTag, success := parseDataRequest(string(payload), &cw)
		
			if success {
				dr.MakeDataRequest(uuidBytes, startTime, endTime, uint8(pw), &cw)
			}
			if cw.CurrWriter != nil {
				cw.CurrWriter.Close()
			}
			
			writer, err := websocket.NextWriter(ws.TextMessage)
			if err != nil {
			    fmt.Println("Could not echo tag to client")
			}
			
			if cw.CurrWriter != nil {
			    _, err = writer.Write([]byte(echoTag))
				if err != nil {
					fmt.Println("Could not echo tag to client")
				}
				writer.Close()
			}
			
			cw.Writing.Unlock()
		}
	});
	http.HandleFunc("/data", func (w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			w.Write([]byte("You must send a POST request to get data."))
			return
		}

		// TODO: don't just read the whole thing in one go. Instead give up after a reasonably long limit.
		payload, err := ioutil.ReadAll(r.Body)
		if err != nil {
			w.Write([]byte(fmt.Sprintf("Could not read received POST payload: %v", err)))
		}
		
		wrapper := RespWrapper{w}
		
		uuidBytes, startTime, endTime, pw, _, success := parseDataRequest(string(payload), wrapper)
		
		if success {
			dr.MakeDataRequest(uuidBytes, startTime, endTime, uint8(pw), wrapper)
		}
	})
	
	log.Fatal(http.ListenAndServe(":8080", nil))
}

