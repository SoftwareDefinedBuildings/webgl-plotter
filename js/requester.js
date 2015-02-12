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
		var request_str = request[0] + '?starttime=' + timeToStr(request[1]) + '&endtime=' + timeToStr(request[2]) + '&unitoftime=ns&pw=' + request[3];
        return $.ajax({
                type: "POST",
                url: 'http://localhost:7856',
                data: this.dataURL + request_str,
                success: success_callback,
                dataType: type,
                error: error_callback == undefined ? function () {} : error_callback
            });
    };
