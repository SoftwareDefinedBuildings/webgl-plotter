function ColorBox(width, height, centerX, centerY, centerZ) { // implements Clickable
    var geom = new THREE.Geometry();
    geom.vertices.push(new THREE.Vector3(centerX - 1, centerY - 1, centerZ),
        new THREE.Vector3(centerX + 1, centerY - 1, centerZ),
        new THREE.Vector3(centerX + 1, centerY + 1, centerZ),
        new THREE.Vector3(centerX - 1, centerY + 1, centerZ));
    geom.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 3, 0));
    var material = new THREE.MeshBasicMaterial({color: 0x00ffff});
    this.obj = new THREE.Mesh(geom, material);
    this.obj.click = this.click.bind(this); // an extra parameter I'm adding
    this.obj.press = function () {};
    this.obj.release = function () {};
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
        this.target.obj.material.setValues({color: 0x00ffff});
        this.target.selected = false;
    } else {
        this.target.obj.material.setValues({color: 0xff0000});
        this.target.selected = true;
    }
}
