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
    
function TimeAxis (domainLo, domainHi, rangeLo, rangeHi, y) {
    this.domainLo = domainLo;
    this.domainHi = domainHi;
    this.rangeLo = rangeLo;
    this.rangeHi = rangeHi;
    
    // The actual object that will be drawn
    this.y = y;
    this.geom = new THREE.Geometry();
    this.geom.vertices.push(new THREE.Vector3(rangeLo, y + this.THICKNESS, this.AXISZ),
        new THREE.Vector3(rangeLo, y - this.THICKNESS, this.AXISZ),
        new THREE.Vector3(rangeHi, y - this.THICKNESS, this.AXISZ),
        new THREE.Vector3(rangeHi, y + this.THICKNESS, this.AXISZ));
    this.geom.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 3, 0));
    var material = new THREE.MeshBasicMaterial({color: 0x000000});
    this.obj = new THREE.Mesh(this.geom, material);
}

TimeAxis.prototype.THICKNESS = 0.5; // really half the thickness
TimeAxis.prototype.AXISZ = 0.01;

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
        this.y = y;
        var vertices = this.geom.vertices;
        vertices[0].y = y + this.THICKNESS;
        vertices[1].y = y - this.THICKNESS;
        vertices[2].y = y - this.THICKNESS;
        vertices[3].y = y + this.THICKNESS;
        this.geom.verticesNeedUpdate = true;
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
