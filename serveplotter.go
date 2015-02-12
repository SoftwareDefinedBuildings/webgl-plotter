package main

import (
	"log"
    "net/http"
)

/*type PlotRequestHandler struct {}

func (prh PlotRequestHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
}*/

func main() {
	log.Fatal(http.ListenAndServe(":8080", http.FileServer(http.Dir("."))))
}

