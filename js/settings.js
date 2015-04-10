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
    this.axisid = id;
    this.streams = new LinkedList(); // a linked list of streams
    this.streamMap = {}; // maps uuid of a stream to its node in the Linked List
    this.units = {};
    this.autoscale = true; // autoscale this axis when next computing the axes
}
StreamAxis.prototype = Object.create(Axis.prototype); // extends Axis

StreamAxis.prototype.automaticScale = function () {
        this.autoscale = true;
    };
    
StreamAxis.prototype.setDomain = function () { // overrides Axis.prototype.setDomain
        Axis.prototype.setDomain.apply(this, arguments);
        this.autoscale = false;
    };
    
StreamAxis.prototype.addStream = function (stream) {
        this.streamMap[stream.uuid] = this.streams.push(stream);
        var unit = stream.Properties.UnitofMeasure;
        if (this.units.hasOwnProperty(unit)) {
            this.units[unit]++;
        } else {
            this.units[unit] = 1;
        }
    };
    
StreamAxis.prototype.rmStream = function (uuid) {
        var listnode = this.streamMap[uuid];
        delete this.streamMap[uuid];
        var unit = listnode.elem.Properties.UnitofMeasure;
        if ((--this.units[unit]) == 0) {
            delete this.units[unit];
        }
        this.streams.removeNode(listnode);
    };

function Settings() {
    this.streams = new LinkedList(); // a list of stream metadata objects
    this.streamMap = {}; // maps UUID of a stream to a node in a linked list with an object containing its metadata
    this.settingMap = {}; // maps UUID of a stream to an object containing its settings
    this.axes = new LinkedList(); // a list of axes
    this.axisMap = {}; // maps the id of an axis to the node in the linked list containing the axis object
    this.axisID = 0;
}

Settings.prototype.addStream = function (metadata, color) {
        // Update this Settings' internal data structures
        this.streamMap[metadata.uuid] = this.streams.push(metadata);
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
    
Settings.prototype.mvStream = function (uuid, axisid) {
        var stream = this.streamMap[uuid].elem;
        var settings = this.settingMap[uuid];
        var fromAxis = this.axisMap[settings.axisid].elem;
        var toAxis = this.axisMap[axisid].elem;
        fromAxis.rmStream(uuid);
        toAxis.addStream(stream);
        settings.axisid = axisid;
        return stream;
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
    
/** Removes the specified axis, reassigning that axis' streams to other axes.
    Calls the specified callback function, if provided, for each reassignment,
    passing in the stream object as the first argument, and the axis it's being
    reassigned to as the second argument. */
Settings.prototype.rmAxis = function (axisid, callback) {
        if (this.axes.len <= 1) {
            return false;
        }
        callback = callback || function () {};
        var node = this.axes.removeNode(this.axisMap[axisid]);
        delete this.axisMap[axisid];
        var streams = node.elem.streams; // a linked list of streams that we have to reassign to new axes
        var unit;
        for (var streamnode = streams.head; streamnode !== null; streamnode = streamnode.next) {
            unit = streamnode.elem.Properties.UnitofMeasure;
            var axisnode;
            for (axisnode = this.axes.head; axisnode !== null; axisnode = axisnode.next) {
                if (axisnode.elem.units.hasOwnProperty(unit) && axisnode.elem.units[unit] > 0) {
                    axisnode.elem.addStream(streamnode.elem);
                    this.settingMap[streamnode.elem.uuid].axisid = axisnode.elem.axisid;
                    callback(streamnode.elem, axisnode.elem);
                    break;
                }
            }
            if (axisnode === null) { // no other axis had the stream's unit, so add it to the last axis
                this.axes.tail.elem.addStream(streamnode.elem);
                this.settingMap[streamnode.elem.uuid].axisid = this.axes.tail.elem.axisid;
                callback(streamnode.elem, this.axes.tail.elem);
            }
        }
        return true;
    };
