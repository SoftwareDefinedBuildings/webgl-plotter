function Axis (domainLo, domainHi, rangeLo, rangeHi) {
    this.domainLo = domainLo;
    this.domainHi = domainHi;
    
    if (rangeLo != undefined) {
        this.rangeLo = rangeLo;
    }
    if (rangeHi != undefined) {
        this.rangeHi = rangeHi;
    }
}

Axis.prototype.rangeLo = 0;
Axis.prototype.rangeHi = 1;

Axis.prototype.THICKNESS = 0.1;
Axis.prototype.AXISZ = 0.01;

Axis.prototype.map = function (x) {
        return this.rangeLo + ((x - this.domainLo) / (this.domainHi - this.domainLo)) * (this.rangeHi - this.rangeLo);
    };
    
Axis.prototype.unmap = function (y) {
        return this.domainLo + ((y - this.rangeLo) / (this.rangeHi - this.rangeLo)) * (this.domainHi - this.domainLo);
    };
    
Axis.prototype.setDomain = function (domainLo, domainHi) {
        this.domainLo = domainLo;
        this.domainHi = domainHi;
    };
    
Axis.prototype.setRange = function (rangeLo, rangeHi) {
        this.rangeLo = rangeLo;
        this.rangeHi = rangeHi;
    };
    
var MILLISECOND = 1;
var SECOND = 1000 * MILLISECOND;
var MINUTE = 60 * SECOND;
var HOUR = 60 * MINUTE;
var DAY = 24 * HOUR;
var YEAR = 365.24 * DAY;
var MONTH = YEAR / 12;
    
function TimeAxis (domainLo, domainHi, rangeLo, rangeHi, y) {
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
    
TimeAxis.prototype.updateRange = function (rangeLo, rangeHi) {
        this.rangeLo = rangeLo || this.rangeLo;
        this.rangeHi = rangeHi || this.rangeHi;
        var vertices = this.geom.vertices;
        vertices[0].x = this.rangeLo;
        vertices[1].x = this.rangeLo;
        vertices[2].x = this.rangeHi;
        vertices[3].x = this.rangeHi;
        this.geom.verticesNeedUpdate = true;
    };
    
TimeAxis.prototype.addToPlotter = function (plotter) {
        plotter.scene.add(this.obj);
    };
    
/* Returns a list of Ticks describing where the ticks should go. */
TimeAxis.prototype.getTicks = function () {
        var delta = subTimes(this.domainHi.slice(0, 2), this.domainLo);
        var millidelta = delta[0] + delta[1] / 1000000;
        var nanodelta = 1000000 * delta[0] + delta[1];
        
        var starttick;
        var deltatick;
        
        var month = false;
        var year = false;
        
        // First find deltatick. In the case of months and years, which are of variable length, just find the number of months or years.
        if (nanodelta <= this.MAXNANOTICK * this.MAXTICKS) {
            // deltatick is small enough to be measured in nanoseconds
            deltatick = [0, this.getTickDelta(this.MILLITICKINTERVALS, nanodelta)];
        } else if (millidelta <= this.MAXMILLITICK * this.MAXTICKS) {
            // deltatick is measured in milliseconds
            deltatick = [this.getTickDelta(this.MILLITICKINTERVALS, millidelta), 0];
        } else if (millidelta / SECOND <= this.MAXSECTICK * this.MAXTICKS) {
            deltatick = [this.getTickDelta(this.SECTICKINTERVALS, millidelta / SECOND) * SECOND, 0];
        } else if (millidelta / MINUTE <= this.MAXSECTICK * this.MAXTICKS) {
            deltatick = [this.getTickDelta(this.SECTICKINTERVALS, millidelta / MINUTE) * MINUTE, 0];
        } else if (millidelta / HOUR <= this.MAXHOURTICK * this.MAXTICKS) {
            deltatick = [this.getTickDelta(this.HOURTICKINTERVALS, millidelta / HOUR) * HOUR, 0];
        } else if (millidelta / DAY <= this.MAXDAYTICK * this.MAXTICKS) {
            deltatick = [this.getTickDelta(this.DAYTICKINTERVALS, millidelta / DAY) * DAY, 0];
        } else if (millidelta / MONTH <= this.MAXMONTHTICK * this.MAXTICKS) {
            deltatick = this.getTickDelta(this.MONTHTICKINTERVALS, millidelta / MONTH);
            month = true;
        } else {
            deltatick = this.getTickDelta(this.MONTHTICKINTERVALS, millidelta / YEAR);
            year = true;
        }
    };
    
/* Say the current axis spans SPAN units. Returns how far apart the ticks should be. */
TimeAxis.prototype.getTickDelta = function (span, intervals) {
        var idealWidth = span / this.MAXTICKS; // How wide the tick would be if we didn't care about corresponding to units of time
        var tickIndex = binSearch(intervals, idealWidth, function (x) { return x; });
        if (idealWidth < intervals[tickIndex]) {
            tickIndex--;
        }
        return this.intervals[tickIndex];
    };
    
function Tick(time, date, granularity) {
        this.time = time;
        this.date = date;
        this.granularity = granularity;
    };
    
Tick.prototype.getLabel = function (translate, granularity) {
        var prefix = "";
        var number;
        var suffix = "";
        var first = false;
        switch (granularity || this.granularity) {
        case "year":
            number = this.date.getFullYear();
            break;
        case "month":
            number = this.date.getMonth();
            if (number == 0) {
                first = "year";
            }
            break;
        case "day":
            number = this.date.getDate();
            if (number == 0) {
                first = "month";
                break;
            }
            suffix = " " + translate.trDay(this.date.getDay());
            break;
        case "hour":
            number = this.date.getHours();
            if (number == 0) {
                first = "day";
                break;
            }
            suffix = number < 12 ? " AM" : " PM";
            number %= 12;
            break;
        case "minute":
            number = this.date.getMinutes();
            if (number == 0) {
                first = "hour";
                break;
            }
            prefix = this.date.getHours() + ":";
            break;
        case "second":
            number = this.date.getSeconds();
            if (number == 0) {
                first = "minute";
                break;
            }
            prefix = ":";
            break;
        case "millisecond":
            number = this.date.getMilliseconds();
            if (number == 0) {
                first = "second";
                break;
            }
            prefix = ".";
            break;
        case "nanosecond":
            number = this.time[1];
            if (number == 0) {
                first = "millisecond";
                break;
            }
            prefix = ",";
            break;
        }
        if (first) {
            return this.getLabel(translate, first);
        }
        return prefix + number + first;
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
