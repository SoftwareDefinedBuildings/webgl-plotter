/** The PlotterUI encapsulates the area of the screen with UI controls.
    The origin is at the top left corner of the UI area. So x-coordinates
    are positive, and y-coordinates are negative.
    
    X and Y specify the top left coordinate of the PlotterUI. Of course,
    these may change as the plot is resized. */

function PlotterUI(plotter, x, y) {
    this.plotterUI = new THREE.Object3D(); // the object that contains the entire UI
    
    this.plotter = plotter;
    this.x = x;
    this.y = y;
    
    // The PLOT button
    var plotButton = new Button(25, 10, 0, 0xff0000, plotter);
    plotButton.addToObject(this.plotterUI);
    plotButton.setPosition(25, -20);
    plotButton.setText("Plot", 7, 0x00ff00);
    plotButton.setClickAction(function () { plotter.plot.plotData(); });
    plotButton.setPressAction(function () { plotButton.setColor(0x0000ff); });
    plotButton.setReleaseAction(function () { plotButton.setColor(0xff0000); });
    this.plotButton = plotButton;
    
    this.plotterUI.position.set(x, y, 0);
    
    plotter.scene.add(this.plotterUI);
}

PlotterUI.prototype.setY = function (newY) {
        this.y = newY;
        this.plotterUI.position.setY(newY);
    };
