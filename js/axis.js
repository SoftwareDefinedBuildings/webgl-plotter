function Axis (domainLo, domainHi, rangeLo, rangeHi) {
    this.domainLo = domainLo;
    this.domainHi = doomainHi;
    this.rangeLo = rangeLo;
    this.rangeHi = rangeHi;
}

Axis.prototype.map = function (x) {
        return this.rangeLo + ((x - this.domainLo) / (this.domainHi - this.domainLo)) * (this.rangeHi - this.rangeLo);
    };
    
Axis.prototype.unmap = function (y) {
        return this.domainLo + ((x - this.rangeLo) / (this.rangeHi - this.rangeLo)) * (this.domainHi - this.domainLo);
    };
