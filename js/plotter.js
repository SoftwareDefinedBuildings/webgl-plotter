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
            var dx, dy;
            if (event.originalEvent.hasOwnProperty("movementX")) {
                dx = event.originalEvent.movementX;
                dy = event.originalEvent.movementY;
            } else {
                dx = event.originalEvent.mozMovementX;
                dy = event.originalEvent.mozMovementY;
            }
            for (var i = 0; i < self.draggables.length; i++) {
                self.draggables[i].wrapper.drag(dx, dy);
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
        
    this.canvas.addEventListener("DOMMouseScroll", function (event) { // for Firefox
            var ray = self.getMouseRay(event);
            var intersections = ray.intersectObjects(self.scrollables);
            
            if (intersections.length > 0) {
                intersections[0].object.wrapper.scroll(-120 * event.detail);
                event.preventDefault();
            }
        }, false);
    
    // all requests for external resources are done through the Requester
    //this.requester = new Requester('http://miranda.cs.berkeley.edu:4524/', 'http://miranda.cs.berkeley.edu:9000/data/uuid/');
	this.requester = new Requester('http://localhost:4523/', 'http://localhost:9000/data/uuid/');
        
    this.plot = new Plot(this, 0, 0.5, -100, 0);
    
    // draw white background behind the plot
    var bgGeom = new THREE.Geometry();
    bgGeom.vertices.push(new THREE.Vector3(-200, 0, -100), new THREE.Vector3(200, 0, -100), new THREE.Vector3(200, 200, -100), new THREE.Vector3(-200, 200, -100));
    bgGeom.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 3, 0));
    this.scene.add(new THREE.Mesh(bgGeom, new THREE.MeshBasicMaterial({color: 0xffffff})));
        
    this.updateScreenSize();
    
    
    var composer, dpr, effectFXAA, renderScene;

    dpr = 1;
    if (window.devicePixelRatio !== undefined) {
      dpr = window.devicePixelRatio;
    }

    renderScene = new THREE.RenderPass(this.scene, this.camera);
    //effectFXAA = new THREE.ShaderPass(THREE.CopyShader);
    effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
    effectFXAA.uniforms['resolution'].value.set(1 / (this.width * dpr), 1 / (this.height * dpr));
    effectFXAA.renderToScreen = true;

    composer = new THREE.EffectComposer(this.renderer);
    composer.setSize(this.width * dpr, this.height * dpr);
    composer.addPass(renderScene);
    composer.addPass(effectFXAA);
           
    var render = function () {
            requestAnimationFrame(render);
            composer.render(0.05);
        };
        
    render(); // start rendering
    
    // selectedStreams is an array containing the metadata of each stream in a list
    this.selectedStreams = [{uuid: "9f67541c-95ee-11e4-a7ac-0026b6df9cf2"}, {uuid: "221b154e-95de-11e4-bf98-0026b6df9cf2"}]; // Until we have a working UI, we'll populate this manually.
    // streamSettings is a hashmap from the UUID of a stream to the object containing its display settings
    this.streamSettings = {"9f67541c-95ee-11e4-a7ac-0026b6df9cf2": {color: new THREE.Vector3(0.0, 0.0, 1.0), selected: true}, "221b154e-95de-11e4-bf98-0026b6df9cf2": {color: new THREE.Vector3(1.0, 0.0, 0.0), selected: false}};
    this.selectedStartTime = [1420553456000, 0];
    this.selectedEndTime = [1421676656000, 0];
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
