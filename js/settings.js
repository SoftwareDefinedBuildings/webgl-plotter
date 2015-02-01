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
    
function StreamAxis(id, domainLo, domainHi, rangeLo, rangeHi) {
    Axis.call(this, domainLo || -1, domainHi || 1, rangeLo || 0, rangeHi || 1);
    this.axisname = id;
    this.axisid = id;
    this.streams = [];
    this.units = {};
    this.autoscale = true;
    this.right = false;
}
StreamAxis.prototype = Object.create(Axis.prototype); // extends Axis

StreamAxis.prototype.autoscale = function () {
        this.autoscale = true;
    };
    
StreamAxis.prototype.addStream = function (stream) {
        this.streams.push(stream);
        var unit = stream.Properties.UnitofMeasure;
        if (this.units.hasOwnProperty(unit)) {
            this.units[unit]++;
        } else {
            this.units[unit] = 1;
        }
    };
    
StreamAxis.prototype.rmStream = function (uuid) {
        // TODO
    };

function Settings() {
    this.streams = []; // a list of stream metadata objects
    this.streamMap = {}; // maps UUID of a stream to an object containing its metadata
    this.settingMap = {}; // maps UUID of a stream to an object containing its settings
    this.axes = []; // a list of axes
    this.axisMap = {}; // maps the id of an axis to the axis object
    this.axisID = 0;
}

Settings.prototype.addStream = function (metadata, color) {
        // Update this Settings' internal data structures
        this.streams.push(metadata);
        this.streamMap[metadata.uuid] = metadata;
        var setting = new StreamSettings();
        this.settingMap[metadata.uuid] = setting;
        
        // Figure out what axis we should add the stream to
        var unit = metadata.Properties.UnitofMeasure;
        var axis = null;
        for (var i = 0; i < this.axes.length; i++) {
            if (this.axes[i].units.hasOwnProperty(unit) && this.axes[i].units[unit] > 0) {
                axis = this.axes[i];
                break;
            }
        }
        if (axis == null) {
            axis = this.newAxis();
        }
        
        // Add the stream to the axis
        axis.addStream(metadata);
        
        return setting;
    };
    
Settings.prototype.getSettings = function (uuid) {
        return this.settingMap[uuid];
    };
    
Settings.prototype.rmStream = function (uuid) {
        // TODO
    };
    
Settings.prototype.getStreams = function () {
        return this.streams;
    };
    
Settings.prototype.newAxis = function () {
        var newID = ++this.axisID;
        var newAxis = new StreamAxis(newID);
        this.axes.push(newAxis);
        this.axisMap[newID] = newAxis;
        return newAxis;
    };
    
Settings.prototype.getAxes = function () {
        return this.axes;
    };
