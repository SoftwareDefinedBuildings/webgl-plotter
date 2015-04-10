function Axis (domainLo, domainHi, rangeLo, rangeHi, x) {
    x = x || 0;
    this.domainLo = domainLo;
    this.domainHi = domainHi;
    
    if (rangeLo != undefined) {
        this.rangeLo = rangeLo;
    }
    if (rangeHi != undefined) {
        this.rangeHi = rangeHi;
    }
    
    // The actual object that will be drawn
    this.x = x;
    this.geom = new THREE.Geometry();
    this.geom.vertices.push(new THREE.Vector3(this.THICKNESS, this.rangeLo, this.AXISZ),
        new THREE.Vector3(this.THICKNESS, this.rangeHi, this.AXISZ),
        new THREE.Vector3(-this.THICKNESS, this.rangeHi, this.AXISZ),
        new THREE.Vector3(-this.THICKNESS, this.rangeLo, this.AXISZ));
    this.geom.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 3, 0));
    var material = new THREE.MeshBasicMaterial({color: 0x000000});
    var baseline = new THREE.Mesh(this.geom, material);
    
    this.obj = new THREE.Object3D();
    this.obj.add(baseline);
    this.obj.translateX(x);
    
    this.tickObjs = [];
    
    this.plotter = undefined;
    
    this.right = false; // true means it's on the right side, false means it's on the left side, null means it's hidden
}

Axis.prototype.rangeLo = 0;
Axis.prototype.rangeHi = 1;

Axis.prototype.THICKNESS = 0.25;
Axis.prototype.TICKLENGTH = 2;
Axis.prototype.AXISZ = 0.01;
Axis.prototype.MINTICKS = 4;
Axis.prototype.MAXTICKS = 8;
Axis.prototype.LABELGAP = 1;

Axis.prototype.NAMETEXTSIZE = 4;

Axis.prototype.tgp = new TickGeomPool(100); // Prune more often to conserve memory

Axis.prototype.setName = function (name) {
        this.axisname = name;
        
        if (this.nameobj !== undefined) {
            this.obj.remove(this.nameobj);
            this.nameobj.geometry.dispose();
            this.nameobj.material.dispose();
        }
        
        this.namegeom = new THREE.TextGeometry(this.axisname, {size: this.NAMETEXTSIZE, height: this.AXISZ});
        this.namegeom.computeBoundingBox();
        this.nameobj = new THREE.Mesh(this.namegeom, new THREE.MeshBasicMaterial({color: 0x000000}));
        this.nameobj.position.z = 0;
        
        this.updateNamePosition();
        this.updateNameOrientation();
        
        this.obj.add(this.nameobj);
    };
    
Axis.prototype.updateNamePosition = function () {
        var bbox = this.namegeom.boundingBox;
        var width = bbox.max.y - bbox.min.y;
        var height = bbox.max.x - bbox.min.x;
        this.nameobj.position.y = this.rangeLo + (this.rangeHi - this.rangeLo - height) / 2;
    };
    
Axis.prototype.updateNameOrientation = function () {
        if (this.right) {
            this.nameobj.position.x = this.NAMETEXTSIZE + this.width;
            this.nameobj.rotation.z = -Math.PI / 2;
        } else {
            this.nameobj.position.x = this.NAMETEXTSIZE - this.width;
            this.nameobj.rotation.z = Math.PI / 2;
        }
    };

Axis.prototype.setRight = function (right) {
        this.right = right;
        if (this.hasOwnProperty("axisname")) {
            this.updateNameOrientation();
        }
    };

Axis.prototype.map = function (x) {
        return this.rangeLo + ((x - this.domainLo) / (this.domainHi - this.domainLo)) * (this.rangeHi - this.rangeLo);
    };
    
Axis.prototype.unmap = function (y) {
        return this.domainLo + ((y - this.rangeLo) / (this.rangeHi - this.rangeLo)) * (this.domainHi - this.domainLo);
    };
    
Axis.prototype.setDomain = function (domainLo, domainHi) {
        this.domainLo = domainLo || this.domainLo;
        this.domainHi = domainHi || this.domainHi;
    };
    
Axis.prototype.setRange = function (rangeLo, rangeHi) {
        this.rangeLo = rangeLo || this.rangeLo;
        this.rangeHi = rangeHi || this.rangeHi;
        
        // Update the actual object
        this.geom.vertices[0].y = this.rangeLo;
        this.geom.vertices[1].y = this.rangeHi;
        this.geom.vertices[2].y = this.rangeHi;
        this.geom.vertices[3].y = this.rangeLo;
        this.geom.verticesNeedUpdate = true;
        
        if (this.hasOwnProperty("axisname")) {
            this.updateNamePosition();
        }
    };
    
Axis.prototype.addToPlotter = function (plotter) {
        if (this.plotter === undefined) {
            plotter.scene.add(this.obj);
            this.plotter = plotter;
        }
    };
    
Axis.prototype.removeFromPlotter = function () {
        this.plotter.scene.remove(this.obj);
        this.plotter = undefined;
    };
    
Axis.prototype.updateX = function (x) {
        this.obj.translateX(x - this.x);
        this.x = x;
    };
    
Axis.prototype.removeFromPlotter = function () {
        plotter.scene.remove(this.obj);
        this.plotter = undefined;
    };
    
Axis.prototype.updateTicks = function () {
        var ticks = this.getTicks();
        var coord, geom, obj, textobj;
        var i;
        var maxLabelWidth = -Infinity;
        for (i = 0; i < ticks.length; i++) {
            coord = this.map(ticks[i][0]);
            if (i < this.tickObjs.length) {
                obj = this.tickObjs[i];
                obj.position.setY(coord);
                obj.userData.coord = coord;
                this.tgp.putLabel(obj.children[1]);
                obj.remove(obj.children[1]);
            } else {
                geom = new THREE.Geometry();
                geom.vertices.push(new THREE.Vector3(this.TICKLENGTH, this.THICKNESS, this.AXISZ),
                    new THREE.Vector3(0, this.THICKNESS, this.AXISZ),
                    new THREE.Vector3(0, -this.THICKNESS, this.AXISZ),
                    new THREE.Vector3(this.TICKLENGTH, -this.THICKNESS, this.AXISZ));
                geom.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 3, 0));
                obj = new THREE.Object3D();
                obj.add(new THREE.Mesh(geom, new THREE.MeshBasicMaterial({color: 0x000000})));
                this.tickObjs.push(obj);
                this.obj.add(obj);
                obj.position.setY(coord);
            }
            textobj = this.tgp.getLabel(ticks[i][1]);
            var bbox = textobj.geometry.boundingBox;
            var width = bbox.max.x - bbox.min.x;
            maxLabelWidth = Math.max(width, maxLabelWidth);
            if (this.right) {
                obj.position.setX(0);
                textobj.position.setX(this.TICKLENGTH + this.LABELGAP);
            } else {
                obj.position.setX(-this.TICKLENGTH);
                textobj.position.setX(-width - this.LABELGAP);
            }
            textobj.position.setY((bbox.min.y - bbox.max.y) / 2);
            obj.add(textobj);
        }
        for (var j = this.tickObjs.length - 1; j >= i; j--) {
            obj = this.tickObjs.pop();
            this.obj.remove(obj);
            obj.children[0].geometry.dispose();
            this.tgp.putLabel(obj.children[1]);
        }
        this.width = this.THICKNESS / 2 + this.TICKLENGTH + this.LABELGAP + maxLabelWidth + this.NAMETEXTSIZE + 2; // 2 is the gap between axis name and longest label
    };
    
/** Returns an array of tick values. */
Axis.prototype.getTicks = function () {
        var precision = Math.round(Math.log(this.domainHi - this.domainLo) /  Math.LN10 - 1);
        var delta = Math.pow(10, precision);
        
        var numTicks = (this.domainHi - this.domainLo) / delta;
        if (numTicks > this.MAXTICKS) {
            delta *= 2;
        } else if (numTicks < this.MINTICKS) {
            delta /= 2;
            precision += 1;
        }
        
        var low = Math.ceil(this.domainLo / delta) * delta;
        var ticks = [];
        
        precision = -precision;
        if (precision >= 0) {
            while (low < this.domainHi) {
                ticks.push([low, low.toFixed(precision)]);
                low += delta;
            }
        } else {
            var power = Math.pow(10, precision);
            while (low < this.domainHi) {
                ticks.push([low, (Math.round(low / power) * power).toFixed(0)]);
                low += delta;
            }
        }
        
        return ticks;
    };
    
/** Widens the domain so that it starts and ends on round numbers. */
Axis.prototype.niceDomain = function () {
        var precision = Math.round(Math.log(this.domainHi - this.domainLo) /  Math.LN10 - 1);
        var delta = Math.pow(10, precision);
        
        this.domainLo = Math.floor(this.domainLo / delta) * delta;
        this.domainHi = Math.ceil(this.domainHi / delta) * delta;
    };
    
/** Frees memory associated with this axis. */
Axis.prototype.dispose = function () {
        var obj;
        for (var i = 0; i < this.tickObjs.length; i++) {
            var obj = this.tickObjs[i];
            obj.children[0].geometry.dispose();
            this.tgp.put(obj.children[1]);
        }
    };
    
var MILLISECOND = 1;
var SECOND = 1000 * MILLISECOND;
var MINUTE = 60 * SECOND;
var HOUR = 60 * MINUTE;
var DAY = 24 * HOUR;
var YEAR = 365.24 * DAY;
var MONTH = YEAR / 12;
    
function TimeAxis (domainLo, domainHi, rangeLo, rangeHi, y, translator) {
    this.domainLo = domainLo;
    this.domainHi = domainHi;
    this.rangeLo = rangeLo;
    this.rangeHi = rangeHi;
    
    // The actual object that will be drawn
    this.y = y;
    this.geom = new THREE.Geometry();
    this.geom.vertices.push(new THREE.Vector3(rangeLo, this.THICKNESS, this.AXISZ),
        new THREE.Vector3(rangeLo, -this.THICKNESS, this.AXISZ),
        new THREE.Vector3(rangeHi, -this.THICKNESS, this.AXISZ),
        new THREE.Vector3(rangeHi, this.THICKNESS, this.AXISZ));
    this.geom.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 3, 0));
    var material = new THREE.MeshBasicMaterial({color: 0x000000});
    baseline = new THREE.Mesh(this.geom, material);
    this.obj = new THREE.Object3D();
    this.obj.add(baseline);
    this.obj.translateY(y);
    
    this.tickObjs = []; // an array of objects that physically represent the ticks
    this.translator = translator;
}

TimeAxis.prototype.THICKNESS = 0.25; // really half the thickness
TimeAxis.prototype.AXISZ = 0.01;

TimeAxis.prototype.MAXTICKS = 7;
TimeAxis.prototype.MILLITICKINTERVALS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000];
TimeAxis.prototype.MAXNANOTICK = 500000;
TimeAxis.prototype.MAXMILLITICK = 500;

TimeAxis.prototype.SECTICKINTERVALS = [1, 2, 5, 10, 20, 30];
TimeAxis.prototype.MAXSECTICK = 30;

TimeAxis.prototype.HOURTICKINTERVALS = [1, 2, 3, 4, 6, 12];
TimeAxis.prototype.MAXHOURTICK = 12;

TimeAxis.prototype.DAYTICKINTERVALS = [1, 2, 4, 7, 14];
TimeAxis.prototype.MAXDAYTICK = 14;

TimeAxis.prototype.MONTHTICKINTERVALS = [1, 2, 3, 6];
TimeAxis.prototype.MAXMONTHTICK = 6;

TimeAxis.prototype.TICKLENGTH = 2; // the length of each tick in virtual coordinates
TimeAxis.prototype.TICKLABELSIZE = 3;
TimeAxis.prototype.LABELGAP = 1;

TimeAxis.prototype.tgp = new TickGeomPool(1000); // prune less often for better performance

TimeAxis.prototype.map = function (x) {
        var time = x.slice(0);
        var hi = this.domainHi.slice(0);
        
        subTimes(time, this.domainLo)
        subTimes(hi, this.domainLo)
        return this.rangeLo + ((1000000 * time[0] + time[1]) / (1000000 * hi[0] + hi[1])) * (this.rangeHi - this.rangeLo);
    };
    
TimeAxis.prototype.unmap = function (y) {
        var hi = this.domainHi.slice(0);
        
        subTimes(hi, this.domainLo);
        return addTimes(mulTime(hi, (y - this.rangeLo) / (this.rangeHi - this.rangeLo)), this.domainLo);
    };
    
TimeAxis.prototype.getPixelShift = function (pwe) {
        return this.map(addTimes(this.domainLo.slice(0, 2), expToPW(pwe - 1))) - this.rangeLo;
    };
    
TimeAxis.prototype.updateY = function (y) {
        this.obj.translateY(y - this.y);
        this.y = y;
    };
    
TimeAxis.prototype.setRange = function (rangeLo, rangeHi) {
        this.rangeLo = rangeLo || this.rangeLo;
        this.rangeHi = rangeHi || this.rangeHi;
        
        // Update the actual object
        var vertices = this.geom.vertices;
        vertices[0].x = this.rangeLo;
        vertices[1].x = this.rangeLo;
        vertices[2].x = this.rangeHi;
        vertices[3].x = this.rangeHi;
        this.geom.verticesNeedUpdate = true;
        
        this.updateTicks();
    };
    
TimeAxis.prototype.addToPlotter = function (plotter) {
        plotter.scene.add(this.obj);
    };
    
TimeAxis.prototype.updateTicks = function () {
        var ticks = this.getTicks();
        var coord, geom, obj, textobj;
        var i;
        for (i = 0; i < ticks.length; i++) {
            coord = this.map(ticks[i].time);
            if (i < this.tickObjs.length) {
                obj = this.tickObjs[i];
                obj.position.setX(coord);
                this.tgp.putLabel(obj.children[1]);
                obj.remove(obj.children[1]);
            } else {
                geom = new THREE.Geometry();
                geom.vertices.push(new THREE.Vector3(-this.THICKNESS, 0, this.AXISZ),
                    new THREE.Vector3(-this.THICKNESS, -this.TICKLENGTH, this.AXISZ),
                    new THREE.Vector3(this.THICKNESS, -this.TICKLENGTH, this.AXISZ),
                    new THREE.Vector3(this.THICKNESS, 0, this.AXISZ));
                geom.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 3, 0));
                obj = new THREE.Object3D();
                obj.add(new THREE.Mesh(geom, new THREE.MeshBasicMaterial({color: 0x000000})));
                this.tickObjs.push(obj);
                this.obj.add(obj);
                obj.position.setX(coord);
            }
            textobj = this.tgp.getLabel(ticks[i].getLabel(this.translator));
            var bbox = textobj.geometry.boundingBox;
            textobj.position.setX((bbox.min.x - bbox.max.x) / 2);
            textobj.position.setY((bbox.min.y - bbox.max.y) - this.TICKLENGTH - this.LABELGAP);
            obj.add(textobj);
        }
        for (var j = this.tickObjs.length - 1; j >= i; j--) {
            obj = this.tickObjs.pop();
            this.obj.remove(obj);
            obj.children[0].geometry.dispose();
            this.tgp.putLabel(obj.children[1]);
        }
    };
    
/* Returns a list of Ticks describing where the ticks should go. */
TimeAxis.prototype.getTicks = function () {
        var delta = subTimes(this.domainHi.slice(0, 2), this.domainLo);
        var millidelta = delta[0] + delta[1] / 1000000;
        var nanodelta = 1000000 * delta[0] + delta[1];
        
        var starttime;
        var deltatick;
        
        var granularity;
        
        // First find deltatick. In the case of months and years, which are of variable length, just find the number of months or years.
        if (nanodelta <= this.MAXNANOTICK * this.MAXTICKS) {
            // deltatick is small enough to be measured in nanoseconds
            deltatick = [0, this.getTickDelta(this.MILLITICKINTERVALS, nanodelta)];
            granularity = "nanosecond";
        } else if (millidelta <= this.MAXMILLITICK * this.MAXTICKS) {
            // deltatick is measured in milliseconds
            deltatick = this.getTickDelta(this.MILLITICKINTERVALS, millidelta);
            granularity = "millisecond";
        } else if (millidelta / SECOND <= this.MAXSECTICK * this.MAXTICKS) {
            deltatick = this.getTickDelta(this.SECTICKINTERVALS, millidelta / SECOND) * SECOND;
            granularity = "second";
        } else if (millidelta / MINUTE <= this.MAXSECTICK * this.MAXTICKS) {
            deltatick = this.getTickDelta(this.SECTICKINTERVALS, millidelta / MINUTE) * MINUTE;
            granularity = "minute";
        } else if (millidelta / HOUR <= this.MAXHOURTICK * this.MAXTICKS) {
            deltatick = this.getTickDelta(this.HOURTICKINTERVALS, millidelta / HOUR) * HOUR;
            granularity = "hour";
        } else if (millidelta / DAY <= this.MAXDAYTICK * this.MAXTICKS) {
            deltatick = this.getTickDelta(this.DAYTICKINTERVALS, millidelta / DAY) * DAY;
            granularity = "day";
        } else if (millidelta / MONTH <= this.MAXMONTHTICK * this.MAXTICKS) {
            deltatick = this.getTickDelta(this.MONTHTICKINTERVALS, millidelta / MONTH);
            granularity = "month";
        } else {
            deltatick = this.getTickDelta(this.MILLITICKINTERVALS, millidelta / YEAR);
            granularity = "year";
        }
        
        var ticks = [];
        var curryear, currmonth;
        var date, dateMillis;
        
        // Now, generate the actual ticks.
        var firstdate = new Date(this.domainLo[0]);
        switch (granularity) {
        case "nanosecond":
            starttime = this.domainLo.slice(0, 2);
            dateMillis = this.domainLo[0];
            date = new Date(dateMillis);
            starttime[1] = Math.ceil(starttime[1] / deltatick[1]) * deltatick[1];
            if (starttime[1] >= 1000000) {
                starttime[0] += Math.floor(starttime[1] / 1000000)
                starttime[1] %= 1000000;
            }
            while (cmpTimes(starttime, this.domainHi) <= 0) {
                ticks.push(new Tick(starttime, date, granularity));
                starttime = addTimes(starttime.slice(0, 2), deltatick);
                if (starttime[0] > dateMillis) {
                    dateMillis = starttime[0];
                    date = new Date(dateMillis);
                }
            }
            break;
        case "year":
            curryear = Math.ceil((firstdate.getUTCFullYear() + 1) / deltatick) * deltatick;
            date = new Date(curryear, 0);
            if (this.domainLo[0] == date.getTime() && this.domainLo[1] > 0) { // in case the low range of the domain falls exactly on a year boundary
                curryear += deltatick;
                date = new Date(curryear, 0);
            }
            while (date.getTime() <= this.domainHi[0]) {
                ticks.push(new Tick([date.getTime(), 0], date, granularity));
                curryear += deltatick;
                date = new Date(curryear, 0);
            }
            break;
        case "month":
            currmonth = Math.ceil((firstdate.getUTCMonth() + 1) / deltatick) * deltatick;
            curryear = firstdate.getUTCFullYear() + Math.floor(currmonth / 12);
            currmonth %= 12;
            date = new Date(curryear, currmonth);
            if (this.domainLo[0] == date.getTime() && this.domainLo[1] > 0) { // in case the low range of the domain falls exactly on a month boundary
                currmonth += deltatick;
                if (currmonth == 12) {
                    currmonth = 0;
                    curryear++;
                }
                date = new Date(curryear, currmonth);
            }
            while (date.getTime() <= this.domainHi[0]) {
                ticks.push(new Tick([date.getTime(), 0], date, granularity));
                currmonth += deltatick;
                if (currmonth >= 12) {
                    curryear += Math.floor(currmonth / 12);
                    currmonth %= 12;
                }
                date = new Date(curryear, currmonth);
            }
            break;
        default:
            starttime = Math.ceil((this.domainLo[0] + (this.domainLo[1] != 0)) / deltatick) * deltatick;
            date = new Date(starttime);
            while (starttime <= this.domainHi[0]) {
                ticks.push(new Tick([date.getTime(), 0], date, granularity));
                starttime += deltatick;
                date = new Date(starttime);
            }
        }
        
        return ticks;
    };
    
/* Say the current axis spans SPAN units. Returns how far apart the ticks should be, as the index in the INTERVALS array. */
TimeAxis.prototype.getTickDelta = function (intervals, span) {
        var idealWidth = span / this.MAXTICKS; // How wide the tick would be if we didn't care about corresponding to units of time
        var tickIndex = binSearch(intervals, idealWidth, function (x) { return x; });
        if (idealWidth > intervals[tickIndex] && tickIndex < intervals.length) {
            tickIndex++;
        }
        return intervals[tickIndex];
    };
    
TimeAxis.prototype.dispose = function () {
        var obj;
        for (var i = 0; i < this.tickObjs.length; i++) {
            var obj = this.tickObjs[i];
            obj.children[0].geometry.dispose();
            this.tgp.put(obj.children[1]);
        }
    };
    
function TickGeomPool(pruneperiod) {
    this.pruneperiod = pruneperiod || 1000;
    this.labelMap = {};
    this.request = 0;
}

TickGeomPool.prototype.TICKLABELSIZE = TimeAxis.prototype.TICKLABELSIZE;
TickGeomPool.prototype.AXISZ = TimeAxis.prototype.AXISZ;
TickGeomPool.prototype.THICKNESS = TimeAxis.prototype.THICKNESS;

TickGeomPool.prototype.getLabel = function (label) {
        var arr;
        if (this.labelMap.hasOwnProperty(label)) {
            arr = this.labelMap[label];
        } else {
            arr = [];
            this.labelMap[label] = arr;
        }
        if (arr.length > 0) {
            return this.labelMap[label].pop();
        } else {
            var textgeom = new THREE.TextGeometry(label, {size: this.TICKLABELSIZE, height: this.AXISZ});
            var textobj = new THREE.Mesh(textgeom, new THREE.MeshBasicMaterial({color: 0x000000}));
            textgeom.computeBoundingBox();
            textobj.userData.label = label;
            return textobj;
        }
    };
    
TickGeomPool.prototype.putLabel = function (labelObj) {
        this.labelMap[labelObj.userData.label].push(labelObj);
        if (++this.request == this.pruneperiod) {
            this.request = 0;
            this.pruneCache();
        }
    };
    
TickGeomPool.prototype.pruneCache = function () {
        for (var label in this.labelMap) {
            if (this.labelMap.hasOwnProperty(label)) {
                var objs = this.labelMap[label];
                for (var i = 0; i < objs.length; i++) {
                    objs[i].geometry.dispose();
                }
                this.labelMap[label] = [];
            }
        }
    };
    
/* Logically represents a tick. */
function Tick(time, date, granularity) {
        this.time = time;
        this.date = date;
        this.granularity = granularity;
    };
    
Tick.prototype.getLabel = function (translator, granularity) {
        var prefix = "";
        var number;
        var suffix = "";
        var first = false;
        switch (granularity || this.granularity) {
        case "year":
            number = this.date.getUTCFullYear();
            break;
        case "month":
            number = this.date.getUTCMonth();
            if (number == 0) {
                first = "year";
                break;
            }
            number = translator.trMonth(number);
            break;
        case "day":
            number = this.date.getUTCDate();
            if (number == 1) {
                first = "month";
                break;
            }
            suffix = " " + translator.trDay(this.date.getUTCDay());
            break;
        case "hour":
            number = this.date.getUTCHours();
            if (number == 0) {
                first = "day";
                break;
            }
            suffix = number < 12 ? " AM" : " PM";
            number = ((number - 1) % 12) + 1;
            break;
        case "minute":
            number = this.date.getUTCMinutes();
            if (number == 0) {
                first = "hour";
                break;
            }
            number = ("0" + number).substr(-2);
            prefix = ((this.date.getUTCHours() - 1 % 12) + 1) + ":";
            break;
        case "second":
            number = this.date.getUTCSeconds();
            if (number == 0) {
                first = "minute";
                break;
            }
            number = ("0" + number).substr(-2);
            prefix = ":";
            break;
        case "millisecond":
            number = this.date.getUTCMilliseconds();
            if (number == 0) {
                first = "second";
                break;
            }
            number = ("00" + number).substr(-3);
            prefix = ".";
            break;
        case "nanosecond":
            number = this.time[1];
            if (number == 0) {
                first = "millisecond";
                break;
            }
            number = ("00000" + number).substr(-6);
            prefix = ",";
            break;
        }
        if (first) {
            return this.getLabel(translator, first);
        }
        return prefix + number + suffix;
    };
    
/** Given a TimeAxis the operates on x-coordinates and an Axis that operates on
    y-coordinates, returns a 4 x 4 matrix that performs the Affine Transform.
    Due to the fact that nanosecond timestamps cannot be represented exactly as
    Numbers in Javascript, and due to the nature of Affine Transforms, the
    vector that gets transformed is not the <x, y, z> point, but is instead
    <x - timeaxis.domainLo, y - axis.domainLo, z>. The idea is that any
    precision lost by representing x - timeaxis.domainLo as a float will
    produce a negligible effect in the graph. */
function getAffineTransformMatrix(timeaxis, axis) {
    var timeDomainDiff = subTimes(timeaxis.domainHi.slice(0), timeaxis.domainLo);
    var transform = new THREE.Matrix4();
    transform.set((timeaxis.rangeHi - timeaxis.rangeLo) / (1000000 * timeDomainDiff[0] + timeDomainDiff[1]), 0, 0, timeaxis.rangeLo,
        0, (axis.rangeHi - axis.rangeLo) / (axis.domainHi - axis.domainLo), 0, axis.rangeLo,
        0, 0, 1, 0,
        0, 0, 0, 1);
    
    return transform;
}
