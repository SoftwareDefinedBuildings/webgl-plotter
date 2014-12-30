/** The Plot encapsulates the area of the screen where the plot is drawn. Its
    height (including the outer margin) is HTOW times the width of the
    plotter, and its width is always equal to that of the plotter.
    
    X and Y specify the coordinates of the bottom left corner of the plotter.
    
    The outer margin is fixed upon construction, though the inner margins
    change dynamically. The resizeToMargins method resizes the plot space
    according to the inner margins. */

function Plot (plotter, outermargin, hToW, x, y) {
    this.plotter = plotter;
    this.outermargin = outermargin;
    this.hToW = hToW;
    
    this.innermargin = {left: 20, right: 20, top: 20, bottom: 20};
    
    // draw the chart area
    this.plotbgGeom = new THREE.Geometry()
    var w = plotter.VIRTUAL_WIDTH;
    var h = w * hToW;
    this.plotbgGeom.vertices.push(new THREE.Vector3(x + outermargin, y + outermargin, 0),
        new THREE.Vector3(x + w - outermargin, y + outermargin, 0),
        new THREE.Vector3(x + w - outermargin, y + h - outermargin, 0),
        new THREE.Vector3(x + outermargin, y + h - outermargin, 0));
    this.plotbgGeom.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 3, 0));
    var plotbg = new THREE.Mesh(this.plotbgGeom, new THREE.MeshBasicMaterial({color: 0x00ff00}));
    plotter.scene.add(plotbg);
    
    this.innermarginOffsets = [new THREE.Vector3(this.innermargin.left, this.innermargin.bottom, 0),
        new THREE.Vector3(-this.innermargin.right, this.innermargin.bottom, 0),
        new THREE.Vector3(-this.innermargin.right, -this.innermargin.top, 0),
        new THREE.Vector3(this.innermargin.left, -this.innermargin.top, 0)];
    
    // draw the plot space
    this.plotspGeom = new THREE.Geometry();
    
    this.plotspGeom.vertices.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0));
    this.resizeToMargins();
    this.plotspGeom.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 3, 0));
    var plotsp = new THREE.Mesh(this.plotspGeom, new THREE.MeshBasicMaterial({color: 0xffffff}));
    plotter.scene.add(plotsp);
}

Plot.prototype.drawGraph1 = function () {
    // Normally we'd draw the x axis here. For now, I'm going to skip that.
    
}

Plot.prototype.resizeToMargins = function () {
    this.innermarginOffsets[0].setX(this.innermargin.left);
    this.innermarginOffsets[1].setX(-this.innermargin.right);
    this.innermarginOffsets[2].setX(-this.innermargin.right);
    this.innermarginOffsets[3].setX(this.innermargin.left);
    
    this.innermarginOffsets[0].setY(this.innermargin.bottom);
    this.innermarginOffsets[1].setY(this.innermargin.bottom);
    this.innermarginOffsets[2].setY(-this.innermargin.top);
    this.innermarginOffsets[3].setY(-this.innermargin.top);
    
    
    for (var i = 0; i < 4; i++) {
        this.plotspGeom.vertices[i].addVectors(this.plotbgGeom.vertices[i], this.innermarginOffsets[i]);
    }
    this.plotspGeom.verticesNeedUpdate = true;
}
