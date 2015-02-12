package main

import (
	"fmt"
	"io/ioutil"
	"log"
    "net/http"
    
    cparse "github.com/SoftwareDefinedBuildings/sync2_quasar/configparser"
)

type DataRequestHandler struct {}

func (drh DataRequestHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		w.Write([]byte("You must send a POST request to get data."))
		return
	}
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

