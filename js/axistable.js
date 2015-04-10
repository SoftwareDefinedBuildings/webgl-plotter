/** Encapsulates the table of axes and streams. */
function AxisTable(x, y, z, plotter) {
    this.plotter = plotter;
    
    this.obj = new THREE.Object3D();
    this.obj.position.set(x, y, z);
    
    this.totalEntryHeight = 0;
    
    this.axisMap = {}; // maps axis id to AxisTableEntry;
    this.currAxes = []; // the AxisTableEntries currently in the table
}

AxisTable.prototype.addToObject = function (obj) {
        obj.add(this.obj);
    };

AxisTable.prototype.hasAxis = function (axisid) {
        return this.axisMap.hasOwnProperty(axisid);
    };
    
AxisTable.prototype.getAxisEntry = function (axisid) {
        return this.axisMap[axisid];
    };

AxisTable.prototype.addAxis = function (axisObj) {
        var newentry = new AxisTableEntry(axisObj, this.plotter);
        newentry.index = this.currAxes.length;
        this.currAxes.push(newentry);
        this.axisMap[axisObj.axisid] = newentry;
        newentry.measuredHeight = newentry.getHeight();
        this.totalEntryHeight += newentry.measuredHeight;
        newentry.entry.position.setY(-this.totalEntryHeight);
        newentry.addToObject(this.obj);
        return newentry;
    };
    
AxisTable.prototype.updateHeight = function (axisid) {
        var entry = this.axisMap[axisid];
        var newHeight = entry.getHeight();
        var diff = entry.measuredHeight - newHeight;
        entry.measuredHeight = newHeight;
        for (var i = entry.index + 1; i < this.currAxes.length; i++) {
            this.currAxes[i].entry.translateY(diff);
            this.currAxes[i].updateHTMLPortion();
        }
        this.totalEntryHeight -= diff;
    };
    
/** Does NOT take care of reassigning streams to different axes. */
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
            futEntry.updateHTMLPortion();
        }
        this.currAxes.pop();
        this.totalEntryHeight -= rmHeight;
        
        this.obj.remove(entry.entry);
        entry.dispose();
    };
    
AxisTable.prototype.updateHTMLPortion = function () {
        for (var i = 0; i < this.currAxes.length; i++) {
            this.currAxes[i].updateHTMLPortion();
        }
    };
    

/** Represents an Axis in the AxisTable. */
function AxisTableEntry(axisObj, plotter) {
    this.plotter = plotter;
    
    this.axis = axisObj;
    this.entry = new THREE.Object3D();
    
    this.totalStreamHeight = 0;
    
    this.streamMap = {}; // maps UUID to AxisTableStream
    this.currStreams = []; // the AxisTableStreams currently in this entry
    
    this.axisname = new THREE.Object3D();
    this.streams = new THREE.Object3D();
    this.streams.position.setX(this.STREAMX);
    this.updateUnits();
    
    this.remove = plotter.plotterUI.makeButton("X", this.TEXTSIZE, this.BUTTONHEIGHT, this.BUTTONHEIGHT, 0xff0000, 0x0000ff, 0x000000);
    this.remove.setClickAction(function () {
            plotter.rmAxis(axisObj.axisid);
        });
    this.remove.setPosition(this.BUTTONX, 0);
    
    this.loc = new SelectableButtonGroup(3, this.LOCBUTTONWIDTH, this.BUTTONHEIGHT, 0, 0x00ffff, plotter);
    var button;
    button = this.loc.getButton(0);
    button.setText("<-", this.TEXTSIZE, 0x000000);
    button.setPosition(this.BUTTONX + this.BUTTONHEIGHT + 1, 0);
    button.click(); // Initially selected
    button = this.loc.getButton(1);
    button.setText("H", this.TEXTSIZE, 0x000000);
    button.setPosition(this.BUTTONX + this.BUTTONHEIGHT + 2 + this.LOCBUTTONWIDTH, 0);
    button = this.loc.getButton(2);
    button.setText("->", this.TEXTSIZE, 0x000000);
    button.setPosition(this.BUTTONX + this.BUTTONHEIGHT + 3 + 2 * this.LOCBUTTONWIDTH, 0);
    this.loc.setSelectAction(function (index, button) {
            button.setColor(0x00ff00);
            plotter.setAxisLocation(axisObj.axisid, index == 0 ? false : index == 1 ? null : true, true);
        });
    this.loc.setDeselectAction(function (index, button) {
            button.setColor(0x00ffff);
        });
        
    this.autoscale = plotter.plotterUI.makeButton("A", this.TEXTSIZE, this.BUTTONHEIGHT, this.BUTTONHEIGHT, 0xffff00, 0x0000ff, 0x000000);
    this.autoscale.setClickAction(function () {
            plotter.autoscale(axisObj.axisid);
        });
    this.autoscale.setPosition(this.AUTOSCALEX, 0);
    
    this.entry.add(this.axisname);
    this.entry.add(this.streams);
    this.entry.add(this.units);
    this.remove.addToObject(this.entry);
    this.autoscale.addToObject(this.entry);
    this.loc.addToObject(this.entry);
    
    this.ninput = document.createElement("input");
    this.ninput.style.position = "absolute";
    this.ninput.onchange = function () {
            plotter.renameAxis(axisObj.axisid, this.value);
        };
    
    this.linput = document.createElement("input");
    this.linput.style.position = "absolute";
    this.linput.onchange = function () {
            var intVal = Number(this.value);
            if (isFinite(intVal) && !isNaN(intVal)) {
                plotter.setScale(axisObj.axisid, intVal);
            } else {
                this.value = axisObj.autoscale ? "" : axisObj.domainLo.toString();
            }
        };
    
    this.hinput = document.createElement("input");
    this.hinput.style.position = "absolute";
    this.hinput.onchange = function () {
            var intVal = Number(this.value);
            if (isFinite(intVal) && !isNaN(intVal)) {
                plotter.setScale(axisObj.axisid, undefined, intVal);
            } else {
                this.value = axisObj.autoscale ? "" : axisObj.domainHi.toString();
            }
        };
}

AxisTableEntry.prototype.TEXTHEIGHT = 0.1;
AxisTableEntry.prototype.TEXTSIZE = 5;
AxisTableEntry.prototype.STREAMX = 20;
AxisTableEntry.prototype.UNITX = 120;
AxisTableEntry.prototype.LINEHEIGHT = 7;
AxisTableEntry.prototype.BUTTONHEIGHT = 6;
AxisTableEntry.prototype.BUTTONX = 135;
AxisTableEntry.prototype.LOCBUTTONWIDTH = 8;
AxisTableEntry.prototype.NAMEX = 0;
AxisTableEntry.prototype.NAMEWIDTH = 7;
AxisTableEntry.prototype.INPUTTEXTSIZE = 4;
AxisTableEntry.prototype.SCALEX = 170;
AxisTableEntry.prototype.AUTOSCALEX = 200 - AxisTableEntry.prototype.BUTTONHEIGHT;
AxisTableEntry.prototype.INPUTHEIGHT = 5.5;

AxisTableEntry.prototype.addToObject = function (obj) {
        obj.add(this.entry);
        this.plotter.addHTMLElem(this.ninput);
        this.plotter.addHTMLElem(this.linput);
        this.plotter.addHTMLElem(this.hinput);
        this.updateHTMLPortion();
    };

AxisTableEntry.prototype.addStream = function (stream) {
        var newrow = new AxisTableStream(stream, this, this.plotter);
        newrow.index = this.currStreams.length;
        this.currStreams.push(newrow);
        this.streamMap[stream.uuid] = newrow;
        this.streams.add(newrow.streamRow);
        newrow.streamRow.position.setY(-this.totalStreamHeight);
        this.totalStreamHeight += newrow.height;
    };
    
AxisTableEntry.prototype.rmStream = function (uuid) {
        var row = this.streamMap[uuid];
        delete this.streamMap[uuid];
        var futRow;
        for (var i = row.index + 1; i < this.currStreams.length; i++) {
            futRow = this.currStreams[i];
            this.currStreams[i - 1] = futRow;
            futRow.index--;
            futRow.streamRow.translateY(row.height);
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
        this.units.position.setX(this.UNITX);
        this.entry.add(this.units);
    };
    
AxisTableEntry.prototype.getHeight = function () {
        return Math.max(this.LINEHEIGHT, this.totalStreamHeight);
    };
    
AxisTableEntry.prototype.updateHTMLPortion = function () {
        this.entry.parent.parent.parent.updateMatrixWorld(true);
        this.entry.parent.parent.updateMatrixWorld(true);
        this.entry.parent.updateMatrixWorld(true);
        this.entry.updateMatrixWorld(true);
        var ratio = this.plotter.width / this.plotter.VIRTUAL_WIDTH;
        var nameinputposition = new THREE.Vector3(this.NAMEX, this.INPUTHEIGHT, 0);
        var globalnamepos = this.entry.localToWorld(nameinputposition);
        var screenpos = globalnamepos.project(this.plotter.camera);
        
        var leftninput = (screenpos.x + 1) * this.plotter.width / 2
        this.ninput.style.top = (-screenpos.y + 1) * this.plotter.height / 2;
        this.ninput.style.left = leftninput;
        this.ninput.style.width = (this.STREAMX - this.NAMEX - 2) * ratio;
        this.ninput.style["font-size"] = this.INPUTTEXTSIZE * ratio;
        
        var leftlinput = leftninput + (this.SCALEX - this.NAMEX) * ratio;
        var widthlinput = (this.AUTOSCALEX - this.SCALEX - 2) * ratio / 2
        this.linput.style.top = this.ninput.style.top;
        this.linput.style.left = leftlinput;
        this.linput.style.width = widthlinput;
        this.linput.style["font-size"] = this.INPUTTEXTSIZE * ratio;
        
        this.hinput.style.top = this.ninput.style.top;
        this.hinput.style.left = leftlinput + widthlinput + 1 * ratio;
        this.hinput.style.width = widthlinput;
        this.hinput.style["font-size"] = this.INPUTTEXTSIZE * ratio;
    };
    
AxisTableEntry.prototype.setScaleUI = function (low, high) {
        if (low != undefined) {
            this.linput.value = low.toString();
        }
        if (high != undefined) {
            this.hinput.value = high.toString();
        }
    };
    
AxisTableEntry.prototype.setAxisNameUI = function (newName) {
        this.ninput.value = newName;
    };
    
AxisTableEntry.prototype.dispose = function () {
        this.plotter.removeHTMLElem(this.ninput);
        this.plotter.removeHTMLElem(this.linput);
        this.plotter.removeHTMLElem(this.hinput);
        for (var i = this.currStreams.length - 1; i >= 0; i--) {
            this.entry.remove(this.currStreams[i].streamRow);
            this.currStreams[i].dispose();
        }
        this.remove.dispose();
    };
    
    
function AxisTableStream(streamObj, axisEntry, plotter) {
    this.axisEntry = axisEntry;
    
    this.stream = streamObj;
    
    // Contains each row of the path as a separate child object
    this.streamRow = new THREE.Object3D();
    
    this.height = 0;
    
    this.plotter = plotter;
    
    this.updatePath();
    
    this.startPos = new THREE.Vector3();
}

AxisTableStream.prototype.THRESHPATHLEN = 30;
AxisTableStream.prototype.MAXPATHLEN = 40;
AxisTableStream.prototype.TEXTHEIGHT = 0.1;
AxisTableStream.prototype.TEXTSIZE = 5;
AxisTableStream.prototype.LINEHEIGHT = 7;
AxisTableStream.prototype.BOTTOMLEFTEDGE = 1;
AxisTableStream.prototype.BACKHEIGHTOFFSET = -0.5;
AxisTableStream.prototype.TEXTWIDTH = AxisTableEntry.prototype.UNITX - AxisTableEntry.prototype.STREAMX - 1;

AxisTableStream.prototype.updatePath = function () {
        var path = getFilepath(this.stream);
        var pathlen = path.length;
        
        var rowlen = this.THRESHPATHLEN;
        var numrows = Math.ceil(this.pathlength / this.THRESHPATHLEN)
        var lastrowlen = pathlen % this.THRESHPATHLEN;
        if (lastrowlen < numrows * (this.MAXPATHLEN - this.THRESHPATHLEN)) {
            rowlen += Math.ceil(lastrowlen / numrows);
        }
        
        var rows = [];
        
        var i, dragIndex;
        for (i = 0; i < pathlen; i += rowlen) {
            rows.push(path.slice(i, i + rowlen));
        }
        
        var obj;
        var textentry = this.streamRow.children[0];
        if (textentry === undefined) {
            dragIndex = this.plotter.draggables.length;
        } else {
            this.streamRow.remove(textentry);
            for (i = textentry.children.length - 1; i >= 0; i--) {
                textentry.children[i].geometry.dispose();
            }
            textentry.geometry.dispose();
            for (dragIndex = 0; dragIndex < this.plotter.draggables.length; dragIndex++) {
                if (this.plotter.draggables[dragIndex] == textentry) {
                    break;
                }
            }
        }
        
        this.height = rows.length * this.LINEHEIGHT;
        
        var backheight = this.height + this.BACKHEIGHTOFFSET - this.BOTTOMLEFTEDGE;
        var backgeom = new THREE.Geometry();
        backgeom.vertices.push(new THREE.Vector3(-this.BOTTOMLEFTEDGE, -this.BOTTOMLEFTEDGE, 0), new THREE.Vector3(this.TEXTWIDTH, -this.BOTTOMLEFTEDGE, 0), new THREE.Vector3(this.TEXTWIDTH, backheight, 0), new THREE.Vector3(-this.BOTTOMLEFTEDGE, backheight, 0));
        backgeom.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 3, 0));
        textentry = new THREE.Mesh(backgeom, new THREE.MeshBasicMaterial({color: 0x888888}));
        
        var textgeom;
        var textobjs = [];
        for (i = 0; i < rows.length; i++) {
            textgeom = new THREE.TextGeometry(rows[i], {size: this.TEXTSIZE, height: this.TEXTHEIGHT});
            obj = new THREE.Mesh(textgeom, new THREE.MeshBasicMaterial({color: 0x000000}));
            obj.translateY(-i * this.LINEHEIGHT);
            textentry.add(obj);
        }
        textentry.startDrag = this.startDrag.bind(this);
        textentry.stopDrag = this.stopDrag.bind(this);
        textentry.drag = this.drag.bind(this);
        this.plotter.draggables[dragIndex] = textentry;
        
        this.streamRow.add(textentry);
        
        this.streamRow.children[0].geometry.computeBoundingSphere();
    };
    
AxisTableStream.prototype.dispose = function () {
        var textentry = this.streamRow.children[0];
        if (textentry !== undefined) {
            this.streamRow.remove(textentry);
            for (i = textentry.children.length - 1; i >= 0; i--) {
                textentry.children[i].geometry.dispose();
            }
            textentry.geometry.dispose();
            for (i = 0; i < this.plotter.draggables.length; i++) {
                if (this.plotter.draggables[i] == textentry) {
                    this.plotter.draggables.splice(i, 1);
                    break;
                }
            }
        }
    };
    
AxisTableStream.prototype.startDrag = function () {
        this.startPos.copy(this.streamRow.position);
        this.streamRow.translateZ(1);
    };
    
AxisTableStream.prototype.stopDrag = function () {
        var y = this.streamRow.position.y + (this.height / 2) + this.axisEntry.entry.position.y;
        // y is the y coordinate of the middle of the stream row, relative to the origin (top left corner) of the axis table
        var table = this.plotter.plotterUI.axisTable;
        var assignedAxis = undefined;
        for (var i = 0; i < table.currAxes.length; i++) {
            if (y > 0) {
                assignedAxis = table.currAxes[i - 1];
                break;
            }
            y += table.currAxes[i].getHeight();
        }
        if (y > 0) {
            assignedAxis = table.currAxes[i - 1];
        }
        if (assignedAxis == undefined || assignedAxis == this.axisEntry) {
            this.streamRow.position.copy(this.startPos);
        } else {
            this.plotter.mvStream(this.stream.uuid, assignedAxis.axis.axisid);
        }
    };
    
AxisTableStream.prototype.drag = function (x, y) {
        this.streamRow.translateX(x * this.plotter.VIRTUAL_WIDTH / this.plotter.width);
        this.streamRow.translateY(-y * this.plotter.VIRTUAL_WIDTH / this.plotter.width);
    };


