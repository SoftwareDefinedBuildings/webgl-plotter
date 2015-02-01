function Axis (domainLo, domainHi, rangeLo, rangeHi) {
    this.domainLo = domainLo;
    this.domainHi = domainHi;
    this.rangeLo = rangeLo;
    this.rangeHi = rangeHi;
}

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
    
function TimeAxis (domainLo, domainHi, rangeLo, rangeHi) {
    this.domainLo = domainLo;
    this.domainHi = domainHi;
    this.rangeLo = rangeLo;
    this.rangeHi = rangeHi;
}

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
