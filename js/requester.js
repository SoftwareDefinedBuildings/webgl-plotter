USE_WEBSOCKETS = true;

function DataConn(url) {
    this.ws = new WebSocket(url);
    this.openMessages = {};
    this.currMessage = 0;
    this.currResponse = null;
    this.ready = false;
    var self = this;
    this.ws.onopen = function () {
            self.ready = true;
        };
    this.ws.onmessage = function (response) {
            response = response.data;
            if (self.currResponse === null) {
                self.currResponse = response;
            } else {
                var callback = self.openMessages[response];
                delete self.openMessages[response];
                var response = self.currResponse;
                self.currResponse = null;
                callback(response);
            }
        };
}

DataConn.prototype.send = function(message, callback) {
    if (this.ready) {
        this.openMessages[this.currMessage] = callback;
        this.ws.send(message + "," + this.currMessage++);
        if (this.currMessage > 2000000) {
            this.currMessage = 0;
        }
    } else {
        console.log("WebSocket is not ready yet.");
    }
}

function Requester(tagsURL, dataURL) {
    this.tagsURL = tagsURL;
    this.dataURL = dataURL;
    this.connections = [];
    for (var i = 0; i < 8; i++) {
        this.connections.push(new DataConn("wss://localhost:8080/dataws"))
    }
    this.currConnection = 0;
}

Requester.prototype.makeTagsRequest = function (message, success_callback, type, error_callback) {
        return $.ajax({
                type: "POST",
                url: 'https://192.168.1.16:7856',
                data: 'SENDPOST ' + this.tagsURL + ' ' + message,
                success: success_callback,
                dataType: type,
                error: error_callback == undefined ? function () {} : error_callback
            });
    };
    
Requester.prototype.makeDataRequest = function (request, success_callback, type, error_callback) {
		var request_str = request.join(',');
		if (USE_WEBSOCKETS) {
		    this.connections[this.currConnection++].send(request_str, success_callback);
		    if (this.currConnection == 8) {
		        this.currConnection = 0;
		    }
        } else {
            return $.ajax({
                    type: "POST",
                    url: 'https://localhost:8080/data',
                    data: request_str,
                    success: success_callback,
                    dataType: type,
                    error: error_callback == undefined ? function () {} : error_callback
                });
        }
    };
