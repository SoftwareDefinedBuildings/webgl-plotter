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
    
    // create the first level of cache
    this.drawingCache = {};
    
    // create the second level of cache
    this.dataCache = new Cache(plotter.requester);
    
    // a useful matrix
    this.rotator90 = new THREE.Matrix3();
    this.rotator90.set(0, -1, 0, 1, 0, 0, 0, 0, 1);
    this.rotator60 = new THREE.Matrix3();
    this.rotator60.set(0.5, -Math.sqrt(3) / 2, 0, Math.sqrt(3) / 2, 0.5, 0, 0, 0, 1);
    
    // geometries currently being displayed
    this.geometries = [];
}

/** Just draw the same data again with the new x-axis. In other words, we just
    read the first level of cache and draw that same data on the new axis. */
Plot.prototype.quickUpdate = function () {
    };
    
/** Draw the graph with the new x-axis, accounting for the fact that the data
    may have changed. In other words, we search in the second level of cache
    and draw the correct data. The method is not guaranteed to call CALLBACK
    synchronously, though it might. */
Plot.prototype.fullUpdate = function (callback) {
        // Compute the new point width exponent
        var nanoDiff = this.endTime.slice(0);
        subTimes(nanoDiff, this.startTime);
        
        var leftVect = this.plotspGeom.vertices[0].clone().project(this.plotter.camera);
        var rightVect = this.plotspGeom.vertices[1].clone().project(this.plotter.camera);
        var numPixels = rightVect.sub(leftVect).length() * this.plotter.width;
        
        this.pwe = getPWExponent(mulTime(nanoDiff, 1 / numPixels));
        
        var numstreams = this.plotter.selectedStreams.length;
        var numreplies = 0;
        var newDrawingCache = {};
        
        var self = this;
        var currUUID;
        for (var i = 0; i < numstreams; i++) {
            currUUID = this.plotter.selectedStreams[i].uuid;
            this.dataCache.getData(currUUID, this.pwe, this.xAxis.domainLo, this.xAxis.domainHi, (function (uuid) {
                    return function (entry) {
                            newDrawingCache[uuid] = entry;
                            numreplies += 1;
                            if (numreplies == numstreams) {
                                self.drawingCache = newDrawingCache; // replace the first layer of the cache
                                callback();
                            }
                        };
                })(currUUID), false);
        }
    };

Plot.prototype.drawGraph1 = function () {
        // Normally we'd draw the x axis here. For now, I'm going to skip that.
        this.startTime = this.plotter.selectedStartTime.slice(0);
        this.endTime = this.plotter.selectedEndTime.slice(0);
        this.xAxis = new TimeAxis(this.startTime, this.endTime, this.plotspGeom.vertices[0].x, this.plotspGeom.vertices[1].x);
        
        var self = this;
        this.fullUpdate(function () {
                self.drawGraph2();
            });
    };
    
Plot.prototype.drawGraph2 = function () {
        // Normally we'd draw the y axes here. For now, I'm going to skip that.
        var data;
        var i;
        var maxval = -Infinity;
        var minval = Infinity;
        for (var uuid in this.drawingCache) {
            if (this.drawingCache.hasOwnProperty(uuid)) {
                data = this.drawingCache[uuid].cached_data;
                for (i = 0; i < data.length; i++) {
                    if (data[i][2] < minval) {
                        minval = data[i][2];
                    }
                    if (data[i][4] > maxval) {
                        maxval = data[i][4];
                    }
                }
            }
        }
        
        this.yAxis = new Axis(minval, maxval, this.plotspGeom.vertices[0].y, this.plotspGeom.vertices[3].y);
        
        this.drawGraph3();
    };
    
Plot.prototype.drawGraph3 = function () {
        // This is where we actually draw the graph.
        var THICKNESS = 0.2;
        var transforms = [];
        var i, j;
        transforms.push(new THREE.Vector3(THICKNESS, 0, 0));
        for (i = 1; i < 6; i++) {
            transforms[i] = transforms[i - 1].clone();
            transforms[i].applyMatrix3(this.rotator60);
        }
        
        // For now, just draw the visible region.
        var data;
        var x;
        var vertexID;
        var pointID;
        var normal;
        var graph;
        //var points;
        //var pvect;
        var mesh;
        var plot = new THREE.Object3D();
        var geometries = [];
        var normals = [];
        for (var uuid in this.drawingCache) {
            if (this.drawingCache.hasOwnProperty(uuid)) {
                graph = new THREE.Geometry();
                points = new THREE.Geometry();
                data = this.drawingCache[uuid].cached_data;
                i = binSearchCmp(data, this.xAxis.domainLo, cmpTimes);
                x = this.xAxis.map(data[i]);
                y = this.yAxis.map(data[i++][3]);
                graph.vertices.push(new THREE.Vector3(x, y, 0));
                graph.vertices.push(new THREE.Vector3(x, y, 0));
                graph.vertices.push(new THREE.Vector3(x, y, 0));
                graph.vertices.push(new THREE.Vector3(x, y, 0));
                vertexID = 4;
                normals.push(new THREE.Vector3());
                normals.push(new THREE.Vector3());
                /*for (j = 0; j < 6; j++) {
                    pvect = new THREE.Vector3(x, y, 0);
                    pvect.add(transforms[j]);
                    points.vertices.push(pvect);
                }
                pointID = 6;*/
                do {
                    x = this.xAxis.map(data[i]);
                    y = this.yAxis.map(data[i][3]);
                    
                    graph.vertices.push(new THREE.Vector3(x, y, 0));
                    graph.vertices.push(new THREE.Vector3(x, y, 0));
                    graph.vertices.push(new THREE.Vector3(x, y, 0));
                    graph.vertices.push(new THREE.Vector3(x, y, 0));
                    
                    vertexID += 4;
                    
                    /*for (j = 0; j < 6; j++) {
                        pvect = new THREE.Vector3(x, y, 0);
                        pvect.add(transforms[j]);
                        points.vertices.push(pvect);
                    }
                    
                    pointID += 6;*/
                    
                    normal = new THREE.Vector3();
                    normal.subVectors(graph.vertices[vertexID - 4], graph.vertices[vertexID - 5]);
                    normal.applyMatrix3(this.rotator90);
                    normal.normalize();
                    normal.multiplyScalar(THICKNESS);
                    normals.push(normal);
                    normals.push(normal.clone());
                    normals.push(normal.clone());
                    normals.push(normal.clone());
                    normals[vertexID - 3].negate();
                    normals[vertexID - 5].negate();

                    
                    // It seems that faces only show up if you traverse their vertices counterclockwise
                    graph.faces.push(new THREE.Face3(vertexID - 6, vertexID - 5, vertexID - 4));
                    graph.faces.push(new THREE.Face3(vertexID - 4, vertexID - 5, vertexID - 3));
                    
                    /*points.faces.push(new THREE.Face3(pointID - 3, pointID - 5, pointID - 4));
                    points.faces.push(new THREE.Face3(pointID - 3, pointID - 6, pointID - 5));
                    points.faces.push(new THREE.Face3(pointID - 3, pointID - 1, pointID - 6));
                    points.faces.push(new THREE.Face3(pointID - 3, pointID - 2, pointID - 1));*/
                    
                    i++;
                } while (i < data.length && cmpTimes(data[i], this.xAxis.domainHi) < 0);
                graph.verticesNeedUpdate = true;
                graph.elementsNeedUpdate = true;
                normals.push(new THREE.Vector3());
                normals.push(new THREE.Vector3());
                
                var lineDrawer = new THREE.ShaderMaterial({
                        attributes: { "normalVector": {type: 'v3', value: normals} },
                        vertexShader: "\
                            attribute vec3 normalVector; \
                            void main() { \
                                vec4 newPosition = vec4(position, 1.0) + vec4(normalVector, 0.0); \
                                gl_Position = projectionMatrix * modelViewMatrix * newPosition; \
                             } \
                             ",
                        fragmentShader: "\
                             void main() { \
                                 gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0); \
                             } \
                             "
                    });
                
                mesh = new THREE.Mesh(graph, lineDrawer);//new THREE.MeshBasicMaterial({color: 0x0000ff}));
                plot.add(mesh);
                /*mesh = new THREE.Mesh(points, new THREE.MeshBasicMaterial({color: 0x0000ff}));
                plot.add(mesh);*/
                geometries.push(graph);
                //geometries.push(points);
            }
        }
        if (this.plot != undefined) {
            this.plotter.scene.remove(this.plot);
        }
        for (i = 0; i < this.geometries.length; i++) {
            this.geometries[i].dispose();
        }
        this.geometries = geometries;
        this.plot = plot;
        this.plotter.scene.add(plot);
    };

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
    };
