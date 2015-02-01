function Settings() {
    this.streams = []; // a list of stream metadata objects
    this.streamMap = {}; // maps UUID of a stream to an object containing its metadata
    this.settingMap = {}; // maps UUID of a stream to an object containing its settings
    this.axes = []; // a list of axes
    this.axisMap = {}; // maps the id of an axis to the axis object
    this.axisID = 10;
}

function StreamSettings(color, selected) {
    this.color = color || new THREE.Vector3(0, 0, 0);
    this.selected = selected || false;
}

StreamSettings.prototype.setColor = function (vector) {
        this.color = vector;
    };
    
StreamSettings.prototype.select = function () {
        this.selected = true;
    };
    
StreamSettings.prototype.deselect = function () {
        this.selected = false;
    };

Settings.prototype.addStream = function (metadata, color) {
        this.streams.push(metadata);
        this.streamMap[metadata.uuid] = metadata;
        var setting = new StreamSettings();
        this.settingMap[metadata.uuid] = setting;
        return setting;
    };
    
Settings.prototype.getSettings = function (uuid) {
        return this.settingMap[uuid];
    };
    
Settings.prototype.rmStream = function (metadata) {
        // TODO
    };
    
Settings.prototype.getStreams = function () {
        return this.streams;
    };
    
Settings.prototype.newAxis = function () {
    };
