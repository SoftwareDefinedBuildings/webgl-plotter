function Plotter() {
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer();
    this.camera = undefined;
    this.canvas = this.renderer.domElement;
    this.hToW = 1;
    this.clickables = [];
    
    var self = this; // for callbacks where "this" is different
    window.onresize = function () {
            self.updateScreenSize();
        };
        
    this.plot = new Plot(this);
    
    var boxes = [null, null, null, null];
    boxes[0] = new ColorBox(2, 2, -10, -10, -20);
    boxes[1] = new ColorBox(2, 2, 10, -10, -20);
    boxes[2] = new ColorBox(2, 2, -10, 10, -20);
    boxes[3] = new ColorBox(2, 2, 10, 10, -20);
    
    for (var i = 0; i < 4; i++) {
        boxes[i].addToPlotter(this);
    }
    
    boxes[0].setTarget(boxes[3]);
    boxes[3].setTarget(boxes[0]);
    boxes[1].setTarget(boxes[2]);
    boxes[2].setTarget(boxes[1]);

    var render = function () {
            requestAnimationFrame(render);
            self.renderer.render(self.scene, self.camera);
        };
        
    this.updateScreenSize();
        
    render(); // start rendering
    
    $(this.canvas).click(function (event) {
            var offset = $(self.canvas).offset();
            var coordX = (event.clientX - offset.left + document.body.scrollLeft) / (self.width / 2) - 1;
            var coordY = -1 * ((event.clientY - offset.top + document.body.scrollTop) / (self.height / 2) - 1);
            var mouseClick = new THREE.Vector3(coordX, coordY, 0.5);
            
            mouseClick.unproject(self.camera); // get the coordinates in 3D space
            mouseClick.sub(self.camera.position); // a vector that points from the camera in the correct direction
            mouseClick.normalize(); // make it a unit vector
            
            var ray = new THREE.Raycaster(self.camera.position, mouseClick);
            var intersections = ray.intersectObjects(self.clickables);
            
            var obj;
            if (intersections.length > 0) {
                intersections[0].object.wrapper.click();
            }
        });
}

Plotter.prototype.updateScreenSize = function () {
        this.width = Math.min(window.innerWidth, 1000);
        this.canvas.style.width = this.width;
        this.height = this.hToW * this.width;
        this.canvas.style.height = this.height;
        this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 1, 1000);
        this.camera.position.z = 100;
        this.renderer.setSize(this.width, this.height);
    };
    
Plotter.prototype.getCanvas = function () {
        return this.canvas;
    };
