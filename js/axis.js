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
        return addTime(mulTime(hi, (y - this.rangeLo) / (this.rangeHi - this.rangeLo)), this.domainLo);
    };
