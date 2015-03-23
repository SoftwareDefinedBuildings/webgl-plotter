/* A button that performs an action when clicked. */

function Button(width, height, z, color, plotter) { // implements Clickable
    this.z = z;
    var geom = new THREE.Geometry();
    geom.vertices.push(new THREE.Vector3(0, 0, z),
        new THREE.Vector3(width, 0, z),
        new THREE.Vector3(width, height, z),
        new THREE.Vector3(0, height, z));
    geom.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 3, 0));
    this.material = new THREE.MeshBasicMaterial({"color": color});
    this.obj = new THREE.Mesh(geom, this.material);
    
    this.clickCB = function () {};
    this.pressCB = function () {};
    this.releaseCB = function () {};
    
    this.obj.click = this.click.bind(this); // an extra parameter I'm adding
    this.obj.press = this.press.bind(this);
    this.obj.release = this.release.bind(this);
    
    this.plotter = plotter;
    plotter.clickables.push(this.obj);
}

/* This is a more idiomatic way of doing something that I'll need to do very often. */
Button.prototype.addToObject = function (parent) {
        parent.add(this.obj);
    };

Button.prototype.setPosition = function (x, y, z) {
        this.obj.position.set(x, y, z || this.z);
    };
    
Button.prototype.setColor = function (newColor) {
        this.material.color.setHex(newColor);
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
