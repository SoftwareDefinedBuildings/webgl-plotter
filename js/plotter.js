function Plotter() {
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.camera = undefined;
    this.canvas = this.renderer.domElement;
    this.hToW = 1;
    this.clickables = [];
    this.draggables = [];
    this.scrollables = [];
    
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
                intersections[0].object.wrapper.click();
            }
        });
        
    // Support for the draggable interface
    $(this.canvas).mousedown(function (event) {
            var ray = self.getMouseRay(event);
            var intersections = ray.intersectObjects(self.draggables);
            
            if (intersections.length > 0) {
                intersections[0].object.wrapper.startDrag();
            }
        });
        
    $(document).mouseup(function () {
            for (var i = 0; i < self.draggables.length; i++) {
                self.draggables[i].wrapper.stopDrag();
            }
        });
        
    $(this.canvas).mousemove(function (event) {
            for (var i = 0; i < self.draggables.length; i++) {
                self.draggables[i].wrapper.drag(event.originalEvent.movementX, event.originalEvent.movementY);
            }
        });
        
    this.canvas.onmousewheel = function (event) {
            var ray = self.getMouseRay(event);
            var intersections = ray.intersectObjects(self.scrollables);
            
            if (intersections.length > 0) {
                intersections[0].object.wrapper.scroll(event.wheelDelta);
                return false;
            }
        };
    
    // all requests for external resources are done through the Requester
    this.requester = new Requester('http://miranda.cs.berkeley.edu:4524/', 'http://miranda.cs.berkeley.edu:9000/data/uuid/');
        
    this.plot = new Plot(this, 2, 0.5, -100, 0);
        
    this.updateScreenSize();
           
    var render = function () {
            requestAnimationFrame(render);
            self.renderer.render(self.scene, self.camera);
        };
        
    render(); // start rendering
    
    this.selectedStreams = [{uuid: "abffcf07-9e17-404a-98c3-ea4d60042ff3"}, {uuid: "4d6525a9-b8ad-48a4-ae98-b171562cf817"}, {uuid: "fe580578-854d-43c5-95b4-9f305a70e6a3"}, {uuid: "888b8f61-c2a4-44a1-bd5c-9865ea6ea8ca"}, {uuid: "9f004502-3f99-4bef-b936-7f860b53bfdf"}, {uuid: "bd46f563-a6e1-4b93-9899-0faf8a70a1b3"}]; // Until we have a working UI, we'll populate this manually.
    this.selectedStartTime = [1415942251000, 0];
    this.selectedEndTime = [1416278894000, 0];
}

Plotter.prototype.updateScreenSize = function () {
        this.width = Math.min(window.innerWidth, 1000);
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
