USE_WEBSOCKETS = false

function Requester(tagsURL, dataURL) {
    this.tagsURL = tagsURL;
    this.dataURL = dataURL;
}

Requester.prototype.makeTagsRequest = function (message, success_callback, type, error_callback) {
        return $.ajax({
                type: "POST",
                url: 'http://localhost:7856',
                data: 'SENDPOST ' + this.tagsURL + ' ' + message,
                success: success_callback,
                dataType: type,
                error: error_callback == undefined ? function () {} : error_callback
            });
    };
    
Requester.prototype.makeDataRequest = function (request, success_callback, type, error_callback) {
		var request_str = request.join(',');
		if (USE_WEBSOCKETS) {
            var ws = new WebSocket("ws://localhost:8080/dataws")
        
            ws.onmessage = function (message) {
        	    success_callback(message.data)
                ws.close()
            }
        
            ws.onopen = function () {
                ws.send(request_str)
            }
        } else {
            return $.ajax({
                    type: "POST",
                    url: 'http://localhost:8080/data',
                    data: request_str,
                    success: success_callback,
                    dataType: type,
                    error: error_callback == undefined ? function () {} : error_callback
                });
        }
    };
