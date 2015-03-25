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
    var plotButton = new Button(40, 10, 0, 0xff0000, plotter);
    plotButton.addToObject(this.plotterUI);
    plotButton.setPosition(25, -20);
    plotButton.setText("Plot", 5, 0x00ff00);
    plotButton.setClickAction(function () { plotter.plotData(); });
    plotButton.setPressAction(function () { plotButton.setColor(0x0000ff); });
    plotButton.setReleaseAction(function () { plotButton.setColor(0xff0000); });
    this.plotButton = plotButton;
    
    // The PLOT ALL DATA button
    var plotAllButton = new Button(40, 10, 0, 0xff0000, plotter);
    plotAllButton.addToObject(this.plotterUI);
    plotAllButton.setPosition(100, -20);
    plotAllButton.setText("Plot all Data", 5, 0x00ff00);
    plotAllButton.setClickAction(function () { plotter.plotAllData(); });
    plotAllButton.setPressAction(function () { plotAllButton.setColor(0x0000ff); });
    plotAllButton.setReleaseAction(function () { plotAllButton.setColor(0xff0000); });
    this.plotAllButton = plotAllButton;
    
    this.plotterUI.position.set(x, y, 0);
    
    plotter.scene.add(this.plotterUI);
}

PlotterUI.prototype.setY = function (newY) {
        this.y = newY;
        this.plotterUI.position.setY(newY);
    };
