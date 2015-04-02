/* A button that performs an action when clicked. */

function Button(width, height, z, color, plotter) { // implements Clickable
    this.z = z;
    this.width = width;
    this.height = height;
    this.geom = new THREE.Geometry();
    this.geom.vertices.push(new THREE.Vector3(0, 0, z),
        new THREE.Vector3(width, 0, z),
        new THREE.Vector3(width, height, z),
        new THREE.Vector3(0, height, z));
    this.geom.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 3, 0));
    this.material = new THREE.MeshBasicMaterial({"color": color});
    this.obj = new THREE.Mesh(this.geom, this.material);
    
    this.clickCB = function () {};
    this.pressCB = function () {};
    this.releaseCB = function () {};
    
    this.obj.click = this.click.bind(this); // an extra parameter I'm adding
    this.obj.press = this.press.bind(this);
    this.obj.release = this.release.bind(this);
    
    this.plotter = plotter;
    plotter.clickables.push(this.obj);
}

Button.prototype.TEXTTHICKNESS = 0.01;

/* This is a more idiomatic way of doing something that I'll need to do very often. */
Button.prototype.addToObject = function (parent) {
        parent.add(this.obj);
    };

Button.prototype.setPosition = function (x, y, z) {
        this.obj.position.set(x, y, z || this.z);
    };
    
Button.prototype.setColor = function (newColor) {
        this.material.color.setHex(newColor);
        this.material.needsUpdate = true;
    };
    
Button.prototype.setText = function (text, size, color) {
        if (this.textgeom !== undefined) {
            this.obj.remove(this.text);
            this.text.dispose();
        }
        this.textgeom = new THREE.TextGeometry(text, {"height": this.TEXTTHICKNESS, "size": size});
        this.text = new THREE.Mesh(this.textgeom, new THREE.MeshBasicMaterial({"color": color}));
        this.textgeom.computeBoundingBox();
        var bbox = this.textgeom.boundingBox;
        this.text.position.set((this.width - Math.abs(bbox.max.x - bbox.min.x)) / 2, (this.height - Math.abs(bbox.max.y - bbox.min.y)) / 2, this.z);
        this.obj.add(this.text);
    };

Button.prototype.setClickAction = function (action) {
        this.clickCB = action;
    };
    
Button.prototype.setPressAction = function (action) {
        this.pressCB = action;
    };
    
Button.prototype.setReleaseAction = function (action) {
        this.releaseCB = action;
    };

Button.prototype.click = function () {
        setTimeout(this.clickCB, 0);
    };

Button.prototype.press = function () {
        this.pressCB();
    };

Button.prototype.release = function () {
        this.releaseCB();
    };
    
Button.prototype.dispose = function () {
        this.geom.dispose();
        if (this.textgeom !== undefined) {
            this.textgeom.dispose();
        }
        for (var i = 0; i < this.plotter.clickables.length; i++) {
            if (this.plotter.clickables[i] === this.obj) {
                this.plotter.clickables.splice(i, 1);
                break;
            }
        }
    };
