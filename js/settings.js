function StreamSettings(color, selected) {
    this.color = color || new THREE.Vector3(0, 0, 0);
    this.selected = selected || false;
    this.axisid = null;
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
    Axis.call(this, domainLo || -1, domainHi || 1, rangeLo, rangeHi);
    this.axisname = id;
    this.axisid = id;
    this.streams = new LinkedList(); // a linked list of streams
    this.streamMap = {}; // maps uuid of a stream to its node in the Linked List
    this.units = {};
    this.autoscale = true;
    this.right = false;
}
StreamAxis.prototype = Object.create(Axis.prototype); // extends Axis

StreamAxis.prototype.autoscale = function () {
        this.autoscale = true;
    };
    
StreamAxis.prototype.addStream = function (stream) {
        this.streamMap[stream.uuid] = this.streams.push(stream);
        var unit = stream.Properties.UnitofMeasure;
        if (this.units.hasOwnProperty(unit)) {
            this.units[unit]++;
        } else {
            this.units[unit] = 1;
        }
        this.streamMap[stream.uuid] = this.axisid;
    };
    
StreamAxis.prototype.rmStream = function (uuid) {
        var listnode = this.streamMap[stream.uuid];
        delete this.streamMap[stream.uuid];
        var unit = listnode.elem.Properties.UnitofMeasure;
        this.units[unit]--;
        this.streams.removeNode(listnode);
    };

function Settings() {
    this.streams = new LinkedList(); // a list of stream metadata objects
    this.streamMap = {}; // maps UUID of a stream to an object containing its metadata
    this.settingMap = {}; // maps UUID of a stream to an object containing its settings
    this.axes = new LinkedList(); // a list of axes
    this.axisMap = {}; // maps the id of an axis to the node in the linked list containing the axis object
    this.axisID = 0;
}

Settings.prototype.addStream = function (metadata, color) {
        // Update this Settings' internal data structures
        this.streamMap[metadata.uuid] = this.streams.push(metadata);;
        var setting = new StreamSettings();
        this.settingMap[metadata.uuid] = setting;
        
        // Figure out what axis we should add the stream to
        var unit = metadata.Properties.UnitofMeasure;
        var axis = null;
        var currnode = this.axes.head;
        while (currnode != null) {
            if (currnode.elem.units.hasOwnProperty(unit) && currnode.elem.units[unit] > 0) {
                axis = currnode.elem;
                break;
            }
            currnode = currnode.next;
        }
        if (axis == null) {
            axis = this.newAxis();
        }
        
        // Add the stream to the axis
        axis.addStream(metadata);
        setting.axisid = axis.axisid;
        
        return setting;
    };
    
Settings.prototype.getSettings = function (uuid) {
        return this.settingMap[uuid];
    };
    
Settings.prototype.rmStream = function (uuid) {
        var streamnode = this.streams.removeNode(this.streamMap[uuid]);
        delete this.streamMap[uuid];
        this.axisMap[streamnode.elem.axisid].rmStream(uuid);
    };
    
Settings.prototype.getStreams = function () {
        return this.streams;
    };
    
Settings.prototype.newAxis = function () {
        var newID = ++this.axisID;
        var newAxis = new StreamAxis(newID);
        this.axisMap[newID] = this.axes.push(newAxis);
        return newAxis;
    };
    
Settings.prototype.getAxes = function () {
        return this.axes;
    };
    
Settings.prototype.getAxis = function (axisid) {
        if (this.axisMap.hasOwnProperty(axisid)) {
            return this.axisMap[axisid].elem;
        }
        console.log("Invalid Axis ID " + axisid);
    };
    
Settings.prototype.rmAxis = function (axisid) {
        if (this.axes.len == 0) {
            return;
        }
        var node = this.axes.removeNode(this.axisMap[axisid]);
        delete this.axisMap[axisid];
        var streams = node.elem.streams; // a linked list of streams that we have to reassign to new axes
        var unit;
        for (var streamnode = stream.head; streamnode != null; streamnode = streamnode.next) {
            unit = streamnode.elem.Properties.UnitofMeasure;
            for (var axisnode = this.axes.head; axisnode != null; axisnode = axisnode.next) {
                if (axisnode.elem.units.hasOwnProperty(unit) && axisnode.elem.units[unit] > 0) {
                    axisnode.elem.addStream(streamnode.elem)
                    break;
                }
            }
            if (axisnode == null) { // no other axis had the stream's unit, so add it to the last axis
                this.axes.tail.elem.addStream(streamnode.elem);
            }
        }
    };
