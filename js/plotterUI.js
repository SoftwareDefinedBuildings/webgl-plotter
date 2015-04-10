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
    var plotButton = this.makeButton("Plot", 5, 40, 10, 0xff0000, 0x0000ff, 0x00ff00);
    plotButton.setPosition(25, -20);
    plotButton.setClickAction(function () { plotter.plotData(); });
    this.plotButton = plotButton;
    
    // The PLOT ALL DATA button
    var plotAllButton = this.makeButton("Plot all Data", 5, 40, 10, 0xff0000, 0x0000ff, 0x00ff00);
    plotAllButton.setPosition(100, -20);
    plotAllButton.setClickAction(function () { plotter.plotAllData(); });
    this.plotAllButton = plotAllButton;
    
    // The ADD Y-AXIS button
    var addAxisButton = this.makeButton("Add Y-Axis", 5, 40, 10, 0xff0000, 0x0000ff, 0x00ff00);
    addAxisButton.setPosition(25, -40);
    addAxisButton.setClickAction(function () { plotter.addAxis(); });
    this.addAxisButton = addAxisButton;
    
    // The Axis Table
    var axisTable = new AxisTable(0, -40, 0, plotter);
    axisTable.addToObject(this.plotterUI);
    this.axisTable = axisTable;
    
    this.plotterUI.position.set(x, y, 0);
    
    plotter.scene.add(this.plotterUI);
}

PlotterUI.prototype.setY = function (newY) {
        this.y = newY;
        this.plotterUI.position.setY(newY);
        this.updateHTMLPortion();
    };
    
PlotterUI.prototype.updateHTMLPortion = function () {
        this.axisTable.updateHTMLPortion();
    };
    
PlotterUI.prototype.makeButton = function (text, textsize, width, height, color, presscolor, textcolor) {
        var newButton = new Button(width, height, 0, color, this.plotter);
        newButton.addToObject(this.plotterUI);
        newButton.setText(text, textsize, textcolor)
        newButton.setPressAction(function () { newButton.setColor(presscolor); });
        newButton.setReleaseAction(function () { newButton.setColor(color); });
        return newButton;
    };
