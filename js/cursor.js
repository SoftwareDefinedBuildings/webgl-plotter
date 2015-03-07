function Cursor(getVtoR, vertical, coord, orthCoord, cursorLength, halfThickness, z, dragCallback, stopDragCallback) {
    this.vertical = vertical;
    this.getRatio = getVtoR;
    this.coord = coord;
    this.orthCoord = orthCoord;
    this.cursorLength = cursorLength;
    this.halfThickness = halfThickness;
    this.z = z;
    this.dragCallback = dragCallback;
    this.stopDragCallback = stopDragCallback;
    
    this.vToR = undefined;
    
    this.geom = new THREE.Geometry();
    this.geom.vertices.push(new THREE.Vector3(0, 0, z), new THREE.Vector3(0, 0, z), new THREE.Vector3(0, 0, z), new THREE.Vector3(0, 0, z));
    /*
    
    0        1
    3        2
    
    */
    this.updateForCoord();
    this.updateForLength();
    this.geom.faces.push(new THREE.Face3(0, 3, 2), new THREE.Face3(2, 1, 0));
    
    var material = new THREE.MeshBasicMaterial({color: 0x000000});
    
    this.obj = new THREE.Mesh(this.geom, material);
    this.obj.frustumCulled = false;
    // a cursor will be on the screen most of the time anyway, and we want it to appear even if we don't update the bounding sphere right away
    
    this.obj.startDrag = this.startDrag.bind(this);
    this.obj.drag = this.drag.bind(this);
    this.obj.stopDrag = this.stopDrag.bind(this);
}

Cursor.prototype.addToPlotter = function (plotter) {
        this.plotter = plotter;
        this.obj.mytype = "cursor";
        plotter.scene.add(this.obj);
        plotter.draggables.push(this.obj);
    };
    
Cursor.prototype.removeFromPlotter = function () {
        var plotter = this.plotter;
        plotter.scene.remove(this.obj);
        for (var i = 0; i < plotter.draggables.length; i++) {
            if (plotter.draggables[i] == this.obj) {
                plotter.draggables.splice(i, 1);
                return;
            }
        }
    };

Cursor.prototype.updateForCoord = function () {
        var close = this.coord - this.halfThickness;
        var far = this.coord + this.halfThickness;
        var vertices = this.geom.vertices;
        if (this.vertical) {
            vertices[0].x = close;
            vertices[1].x = far;
            vertices[2].x = far;
            vertices[3].x = close;
        } else {
            vertices[0].y = far;
            vertices[1].y = far;
            vertices[2].y = close;
            vertices[3].y = close;            
        }
        this.geom.verticesNeedUpdate = true;
    };
    
Cursor.prototype.updateForLength = function () {
        var base = this.orthCoord;
        var extent = this.orthCoord + this.cursorLength;
        var vertices = this.geom.vertices;
        if (this.vertical) {
            vertices[0].y = extent;
            vertices[1].y = extent;
            vertices[2].y = base;
            vertices[3].y = base;
        } else {
            vertices[0].x = base;
            vertices[1].x = extent;
            vertices[2].x = extent;
            vertices[3].x = base;
        }
        this.geom.verticesNeedUpdate = true;
    };

Cursor.prototype.fullUpdateForCoord = function () {
        this.updateForCoord();
        this.geom.computeBoundingSphere();
    };
    
Cursor.prototype.fullUpdateForLength = function () {
        this.updateForLength();
        this.geom.computeBoundingSphere();
    };
    
Cursor.prototype.startDrag = function () {
        this.vToR = this.getRatio();
    };
    
Cursor.prototype.drag = function (deltaX, deltaY, suppressCallback) {
        if (this.vertical) {
            this.coord += deltaX * this.vToR;
        } else {
            this.coord -= deltaY * this.vToR;
        }
        if (!suppressCallback) {
            this.dragCallback();
        }
        this.updateForCoord();
    };
    
Cursor.prototype.stopDrag = function () {
        this.geom.computeBoundingSphere();
        this.stopDragCallback();
    };
