/** Encapsulates the table of axes and streams. */
function AxisTable() {
    this.obj = new THREE.Object3D();
    
    this.totalEntryHeight = 0;
    
    this.streamMap = {}; // maps axis id to AxisTableEntry;
    this.currAxes = []; // the AxisTableEntries currently in the table
}

AxisTable.prototype.addAxis = function (axisObj) {
        var newentry = new AxisTableEntry(axisObj);
        newentry.index = this.currAxes.length;
        this.currAxes.push(newentry);
        this.streamMap[axisObj.axisid] = newentry;
        newentry.measuredHeight = newentry.getHeight();
        this.totalEntryHeight += newentry.measuredHeight;
        newentry.entry.position.setY(-this.totalEntryHeight);
        this.obj.add(newentry.entry);
    };
    
AxisTable.prototype.updateHeight = function (axisid) {
        var entry = this.axisMap[axisid];
        var newHeight = entry.getHeight();
        var diff = entry.measuredHeight - newHeight;
        entry.measuredHeight = newHeight;
        for (var i = entry.index + 1; i < this.currAxes.length; i++) {
            this.currAxes[i].entry.translateY(diff);
        }
        this.totalEntryHeight -= diff;
    };
    
AxisTable.prototype.rmAxis = function (axisid) {
        var entry = this.axisMap[axisid];
        delete this.axisMap[axisid];
        var rmHeight = entry.getHeight();
        var futEntry;
        for (var i = entry.index + 1; i < this.currAxes.length; i++) {
            futEntry = this.currAxes[i];
            this.currAxes[i - 1] = futEntry;
            futEntry.index--;
            futEntry.entry.translateY(rmHeight);
        }
        this.currAxes.pop();
        this.totalEntryHeight -= rmHeight;
        
        this.obj.remove(entry.entry);
        entry.dispose();
    };
    

/** Represents an Axis in the AxisTable. */
function AxisTableEntry(axisObj) {
    this.axis = axisObj;
    this.entry = new THREE.Object3D();
    
    this.totalStreamHeight = 0;
    
    this.streamMap = {}; // maps UUID to AxisTableStream
    this.currStreams = []; // the AxisTableStreams currently in this entry
    
    this.axisname = new THREE.Object3D();
    this.streams = new THREE.Object3D();
    this.streams.translateX(this.STREAMX);
    this.updateUnits();
    
    this.entry.add(this.axisname);
    this.entry.add(this.streams);
    this.entry.add(this.units);
}

AxisTableEntry.prototype.TEXTHEIGHT = 0.1;
AxisTableEntry.prototype.TEXTSIZE = 5;
AxisTableEntry.prototype.STREAMX = 50;
AxisTableEntry.prototype.UNITX = 100;

AxisTableEntry.prototype.addStream = function (stream) {
        var newrow = new AxisTableStream(stream);
        newrow.index = this.currStreams.length;
        this.currStreams.push(newrow);
        this.streamMap[stream.uuid] = newrow;
        this.totalStreamHeight += newrow.height;
        newrow.streamRow.position.setY(-this.totalStreamHeight);
        this.streams.add(newrow.streamRow);
    };
    
AxisTableEntry.prototype.rmStream = function (uuid) {
        var row = this.streamMap[uuid];
        delete this.streamMap[uuid];
        var futRow;
        for (var i = row.index + 1; i < this.currStreams.length; i++) {
            futRow = this.currStreams[i];
            this.currStreams[i - 1] = futRow;
            futRow.index--;
            futRow.translateY(row.height);
        }
        this.currStreams.pop(); // reduce the length of the array by 1
        this.totalStreamHeight -= row.height;
        
        this.streams.remove(row.streamRow);
        row.dispose();
    };

AxisTableEntry.prototype.updateUnits = function () {
        if (this.units !== undefined) {
            this.entry.remove(this.units);
            this.units.geometry.dispose();
        }
        var units = [];
        for (var unit in this.axis.units) {
            if (this.axis.units.hasOwnProperty(unit) && this.axis.units[unit] > 0) {
                units.push(unit);
            }
        }
        var textgeom = new THREE.TextGeometry(units.join(", "), {size: this.TEXTSIZE, height: this.TEXTHEIGHT});
        this.units = new THREE.Mesh(textgeom, new THREE.MeshBasicMaterial({color: 0x000000}));
        this.units.translateX(this.UNITX);
        this.entry.add(this.units);
    };
    
AxisTableEntry.prototype.getHeight = function () {
        return Math.max(this.TEXTSIZE, this.totalStreamHeight);
    };
    
AxisTableEntry.prototype.dispose = function () {
        for (var i = this.currStreams.length - 1; i >= 0; i--) {
            this.entry.remove(this.currStreams[i].streamRow);
            this.currStreams[i].dispose();
        }
    };
    
    
function AxisTableStream(streamObj) {
    this.stream = streamObj;
    
    // Contains each row of the path as a separate child object
    this.streamRow = new THREE.Object3D();
    
    this.height = 0;
    
    this.updatePath();
}

AxisTableStream.prototype.THRESHPATHLEN = 40;
AxisTableStream.prototype.MAXPATHLEN = 50;
AxisTableStream.prototype.TEXTHEIGHT = 0.1;
AxisTableStream.prototype.TEXTSIZE = 5;

AxisTableStream.prototype.updatePath = function () {
        var path = getFilePath(this.stream);
        var pathlen = path.length;
        
        var rowlen = this.THRESHPATHLEN;
        var numrows = Math.ceil(this.pathlength / this.THRESHPATHLEN)
        var lastrowlen = pathlen % this.THRESHPATHLEN;
        if (lastrowlen < numrows * (this.MAXPATHLEN - this.THRESHPATHLEN)) {
            rowlen += Math.ceil(lastrowlen / numrows);
        }
        
        var rows = [];
        
        var i;
        for (i = 0; i < pathlen; i += rowlen) {
            rows.push(path.slice(i, i + rowlen));
        }
        
        var obj;
        for (i = this.streamRow.children.length; i >= 0; i--) {
            obj = this.streamRow.children[i];
            this.streamRow.remove(obj);
            obj.geometry.dispose();
        }
        
        var textgeom;
        for (i = 0; i < rows.length; i++) {
            textgeom = new THREE.TextGeometry(rows[i], {size: this.TEXTSIZE, height: this.TEXTHEIGHT});
            obj = new THREE.Mesh(textgeom, new THREE.MeshBasicMaterial({color: 0xffffff}));
            obj.translateY(-i * this.TEXTSIZE);
            this.streamRow.add(obj);
        }
        
        this.height = i * this.TEXTSIZE;
    };
    
AxisTableStream.prototype.dispose = function () {
        for (var i = 0; i < this.streamRow.children.length; i++) {
            this.streamRow.children[i].geometry.dispose();
        }
    };
