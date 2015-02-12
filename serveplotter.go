package main

import (
	"fmt"
	"io/ioutil"
	"log"
    "net/http"
    "strconv"
    "strings"
    "sync"
    
    cparse "github.com/SoftwareDefinedBuildings/sync2_quasar/configparser"
    cpint "github.com/SoftwareDefinedBuildings/quasar/cpinterface"
	capnp "github.com/glycerine/go-capnproto"
	uuid "code.google.com/p/go-uuid/uuid"
)

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

type DataRequestHandler struct {}

func (drh DataRequestHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		w.Write([]byte("You must send a POST request to get data."))
		return
	}
	
	// TODO: don't just read the whole thing in one go. Instead give up after a reasonably long limit.
	payload, err := ioutil.ReadAll(r.Body)
	if err != nil {
		w.Write([]byte(fmt.Sprintf("Could not read received POST payload: %v", err)))
	}
	
	var args []string = strings.Split(string(payload), ",")
	
	if len(args) != 4 {
		w.Write([]byte(fmt.Sprintf("Four arguments are required; got %v", len(args))))
		return
	}
	
	var uuidBytes uuid.UUID = uuid.Parse(args[0])
	
	if uuidBytes == nil {
		w.Write([]byte(fmt.Sprintf("Invalid UUID: got %v", args[0])))
		return
	}
	
	var startTime int64
	var endTime int64
	var pw int64
	
	startTime, err = strconv.ParseInt(args[1], 16, 64)
	if err != nil {
		w.Write([]byte(fmt.Sprintf("Could not interpret %v as an int64: %v", args[1], err)))
		return
	}
	
	endTime, err = strconv.ParseInt(args[2], 16, 64)
	if err != nil {
		w.Write([]byte(fmt.Sprintf("Could not interpret %v as an int64: %v", args[2], err)))
		return
	}
	
	pw, err = strconv.ParseInt(args[3], 16, 16)
	if err != nil {
		w.Write([]byte(fmt.Sprintf("Could not interpret %v as an int16: 5v", args[3], err)))
	}
	
	var mp QueryMessagePart = queryPool.Get().(QueryMessagePart)
	
	// segment := mp.segment
	request := mp.request
	query := mp.query
	
	query.SetUuid([]byte(uuidBytes))
	query.SetVersion(0)
	query.SetStartTime(startTime)
	query.SetEndTime(endTime)
	query.SetPointWidth(uint8(pw))
	
	request.SetEchoTag(0) // TODO: Change to something meaningful so that we can actually match it to multiple requests
	
	request.SetQueryStatisticalValues(*query)
	
	fmt.Println("Prepared message to send")
	
	queryPool.Put(mp)
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
	
	var drh DataRequestHandler
	
	http.Handle("/", http.FileServer(http.Dir(directory.(string))))
	http.Handle("/data", drh)
	
	log.Fatal(http.ListenAndServe(":8080", nil))
}

