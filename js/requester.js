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
    
Requester.prototype.makeDataRequest = function (request_str, success_callback, type, error_callback) {
        return $.ajax({
                type: "POST",
                url: 'http://localhost:7856',
                data: this.dataURL + request_str,
                success: success_callback,
                dataType: type,
                error: error_callback == undefined ? function () {} : error_callback
            });
    };
