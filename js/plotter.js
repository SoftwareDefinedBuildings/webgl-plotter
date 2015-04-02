function Plotter() {
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.camera = undefined;
    this.canvas = this.renderer.domElement;
    this.hToW = 1;
    this.clickables = [];
    this.draggables = [];
    this.scrollables = [];
    
    this.translator = new Translator("English");
    
    this.VIRTUAL_WIDTH = 200; // The width of the plotter in virtual coordinates
    
    var self = this; // for callbacks where "this" is different
    window.onresize = function () {
            self.updateScreenSize();
        };
    
    var boxes = [null, null, null, null];
    boxes[0] = new ColorBox(2, 2, -10, -10, 0);
    boxes[1] = new ColorBox(2, 2, 10, -10, 0);
    boxes[2] = new ColorBox(2, 2, -10, -30, 0);
    boxes[3] = new ColorBox(2, 2, 10, -30, 0);
    
    for (var i = 0; i < 4; i++) {
        boxes[i].addToPlotter(this);
    }
    
    boxes[0].setTarget(boxes[3]);
    boxes[3].setTarget(boxes[0]);
    boxes[1].setTarget(boxes[2]);
    boxes[2].setTarget(boxes[1]);
       
    // Support for the clickable interface
    $(this.canvas).click(function (event) {
            var ray = self.getMouseRay(event);
            var intersections = ray.intersectObjects(self.clickables);
            
            var obj;
            if (intersections.length > 0) {
                intersections[0].object.click();
            }
        });
        
    // Support for the draggable interface
    self.dragging = null; // the object that we're currently dragging
    self.pressed = null; // the object that's currently pressed
    $(this.canvas).mousedown(function (event) {
            if (self.dragging !== null) {
                self.dragging.stopDrag();
                self.dragging = null;
            }
            
            var ray = self.getMouseRay(event);
            var intersections = ray.intersectObjects(self.draggables);
            
            if (intersections.length > 0) {
                self.dragging = intersections[0].object;
                intersections[0].object.startDrag(intersections[0].point);
            } else {
                intersections = ray.intersectObjects(self.clickables);
                if (intersections.length > 0) {
                    self.pressed = intersections[0].object;
                    intersections[0].object.press();
                }
            }
        });
        
    $(document).mouseup(function () {
            if (self.dragging !== null) {
                self.dragging.stopDrag();
                self.dragging = null;
            } else if (self.pressed !== null) {
                self.pressed.release();
                self.pressed = null;
            }
        });
        
    // Drags only the object that's being dragged.
    $(this.canvas).mousemove(function (event) {
            if (self.dragging !== null) {
                var dx, dy;
                if (event.originalEvent.hasOwnProperty("movementX")) {
                    dx = event.originalEvent.movementX;
                    dy = event.originalEvent.movementY;
                } else {
                    dx = event.originalEvent.mozMovementX;
                    dy = event.originalEvent.mozMovementY;
                }
                
                if (self.dragging !== null) {
                    self.dragging.drag(dx, dy);
                }
            }
        });
        
    this.canvas.onmousewheel = function (event) {
            var ray = self.getMouseRay(event);
            var intersections = ray.intersectObjects(self.scrollables);
            
            if (intersections.length > 0) {
                intersections[0].object.scroll(event.wheelDelta);
                return false;
            }
        };
        
    this.canvas.addEventListener("DOMMouseScroll", function (event) { // for Firefox
            var ray = self.getMouseRay(event);
            var intersections = ray.intersectObjects(self.scrollables);
            
            if (intersections.length > 0) {
                intersections[0].object.scroll(-120 * event.detail);
                event.preventDefault();
            }
        }, false);
    
    // all requests for external resources are done through the Requester
    //this.requester = new Requester('http://miranda.cs.berkeley.edu:4524/', 'http://miranda.cs.berkeley.edu:9000/data/uuid/');
	this.requester = new Requester('localhost:8080');
        
    this.plot = new Plot(this, 0, 0.5, -100, 0);
    
    this.plotterUI = new PlotterUI(this, -100, 0);
    
    // draw white background behind the plot
    var bgGeom = new THREE.Geometry();
    bgGeom.vertices.push(new THREE.Vector3(-200, -200, -100), new THREE.Vector3(200, -200, -100), new THREE.Vector3(200, 200, -100), new THREE.Vector3(-200, 200, -100));
    bgGeom.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 3, 0));
    this.scene.add(new THREE.Mesh(bgGeom, new THREE.MeshBasicMaterial({color: 0xffffff})));
        
    this.updateScreenSize();
           
    var render = function () {
            requestAnimationFrame(render);
            self.renderer.render(self.scene, self.camera);
        };
        
    render(); // start rendering
    
    this.settings = new Settings();
    
    var setting;
    
    setting = this.addStream({uuid: "9f67541c-95ee-11e4-a7ac-0026b6df9cf2", Properties: {UnitofMeasure: 'V'}, Path: "/vRandom"});
    setting.setColor(new THREE.Vector3(0, 0, 1));
    setting.select();
    
    setting = this.addStream({uuid: "221b154e-95de-11e4-bf98-0026b6df9cf2", Properties: {UnitofMeasure: 'N'}, Path: "/nRandom"});
    setting.setColor(new THREE.Vector3(1, 0, 0));

    this.selectedStartTime = [1420553456000, 0];
    this.selectedEndTime = [1421676656000, 0];
}

/** The PLOT button. */
Plotter.prototype.plotData = function () {
        this.plot.plotData();
    };
    
Plotter.prototype.plotAllData = function () {
        // Create a list of UUIDs
        var uuids = [];
        for (var uuid in this.settings.streamMap) {
            if (this.settings.streamMap.hasOwnProperty(uuid)) {
                uuids.push(uuid);
            }
        }
        
        var self = this;
        // Get the brackets and draw the graph asynchronously
        this.requester.makeBracketRequest(uuids, function (result) {
                var times = JSON.parse(result);
                self.selectedStartTime = times.Merged[0];
                self.selectedEndTime = times.Merged[1];
                self.plotData();
            });
    };
    
Plotter.prototype.addStream = function (stream) {
        var axisTable = this.plotterUI.axisTable;
        var setting = this.settings.addStream(stream);
        var axisid = setting.axisid;
        var axisrow;
        if (axisTable.hasAxis(axisid)) {
            axisrow = axisTable.getAxisEntry(axisid);
        } else {
            axisrow = axisTable.addAxis(this.settings.getAxis(axisid));
        }
        axisrow.addStream(stream);
        return setting;
    };
    
Plotter.prototype.rmAxis = function (axisid) {
        var self = this;
        var affectedEntries = [];
        if (this.settings.rmAxis(axisid, function (stream, axis) {
                var entry = self.plotterUI.axisTable.getAxisEntry(axis.axisid);
                entry.addStream(stream);
                affectedEntries.push(entry);
                self.plotterUI.axisTable.updateHeight(axis.axisid);
            })) {
            this.plotterUI.axisTable.rmAxis(axisid);
            for (var i = 0; i < affectedEntries.length; i++) {
                affectedEntries[i].updateUnits();
            }
        }
    };

Plotter.prototype.updateScreenSize = function () {
        this.width = 0.9 * Math.min(window.innerWidth, 10000);
        this.canvas.style.width = this.width;
        this.height = this.hToW * this.width;
        this.canvas.style.height = this.height;
        this.camera = new THREE.PerspectiveCamera(90, this.width / this.height, 1, 1000);
        this.camera.position.z = 100;
        this.renderer.setSize(this.width, this.height);
        
        this.plot.pixelsWideChanged();
    };
    
Plotter.prototype.getCanvas = function () {
        return this.canvas;
    };
    
Plotter.prototype.getMouseRay = function (mouseEvent) {
        var offset = $(this.canvas).offset();
        var coordX = (mouseEvent.clientX - offset.left + document.body.scrollLeft) / (this.width / 2) - 1;
        var coordY = -1 * ((mouseEvent.clientY - offset.top + document.body.scrollTop) / (this.height / 2) - 1);
        var mouseClick = new THREE.Vector3(coordX, coordY, 0.5);
        
        mouseClick.unproject(this.camera); // get the coordinates in 3D space
        mouseClick.sub(this.camera.position); // a vector that points from the camera in the correct direction
        mouseClick.normalize(); // make it a unit vector
        
        return new THREE.Raycaster(this.camera.position, mouseClick);
    };
