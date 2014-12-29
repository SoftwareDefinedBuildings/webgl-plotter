function ColorBox(width, height, depth) { // implements Clickable
    var geom = new THREE.BoxGeometry(width, height, depth);
    var material = new THREE.MeshBasicMaterial({color: 0xffffff});
    this.obj = new THREE.Mesh(geom, material);
    this.obj.wrapper = this; // an extra parameter I'm adding
    this.target = null;
    this.selected = false;
}

ColorBox.prototype.addToPlotter = function (plotter) {
    plotter.scene.add(this.obj);
    plotter.clickables.push(this.obj);
}

ColorBox.prototype.setPosition = function (x, y, z) {
    this.obj.position.set(x, y, z);
}

ColorBox.prototype.setTarget = function (otherBox) {
    this.target = otherBox;
}

ColorBox.prototype.click = function () {
    if (this.target.selected) {
        this.target.obj.material.setValues({color: 0xffffff});
        this.target.selected = false;
    } else {
        this.target.obj.material.setValues({color: 0xff0000});
        this.target.selected = true;
    }
}
