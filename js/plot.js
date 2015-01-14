/** The Plot encapsulates the area of the screen where the plot is drawn. Its
    height (including the outer margin) is HTOW times the width of the
    plotter, and its width is always equal to that of the plotter.
    
    X and Y specify the coordinates of the bottom left corner of the plotter.
    
    The outer margin is fixed upon construction, though the inner margins
    change dynamically. The resizeToMargins method resizes the plot space
    according to the inner margins. */

function Plot (plotter, outermargin, hToW, x, y) { // implements Draggable, Scrollable
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
    
    this.PLOTBG_VIRTUAL_WIDTH = plotter.VIRTUAL_WIDTH - 2 * outermargin;
    
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
    
    // detect clicks in the plot space
    plotsp.wrapper = this;
    plotter.draggables.push(plotsp);
    plotter.scrollables.push(plotsp);
    
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
    
    // used to keep track of caching data
    this.drawRequestID = 0;
    
    // reuse ShaderMaterials to gain performance
    this.shaders = {};
}

/** Just draw the same data again with the new x-axis. In other words, we just
    read the first level of cache and draw that same data on the new axis. */
Plot.prototype.quickUpdate = function () {
        // Normally, I'd update the x-axis ticks here. But I'll implement that later
        this.drawGraph3();
    };
    
/** Draw the graph with the new x-axis, accounting for the fact that the data
    may have changed. In other words, we search in the second level of cache
    and draw the correct data. The method is not guaranteed to call CALLBACK
    synchronously, though it might. */
Plot.prototype.fullUpdate = function (callback, tempUpdate) {
        // Compute the new point width exponent
        var nanoDiff = this.endTime.slice(0);
        subTimes(nanoDiff, this.startTime);
        
        this.recomputePixelsWideIfNecessary();
        
        this.pwe = getPWExponent(mulTime(nanoDiff, 1 / this.pixelsWide));
        
        var numstreams = this.plotter.selectedStreams.length;
        var numreplies = 0;
        var newDrawingCache = {};
        
        var self = this;
        var currUUID;
        
        var thisRequestID = ++this.drawRequestID;
        var loRequestTime = roundTime(this.xAxis.domainLo.slice(0, 2));
        var hiRequestTime = roundTime(this.xAxis.domainHi.slice(0, 2));
        for (var i = 0; i < numstreams; i++) {
            currUUID = this.plotter.selectedStreams[i].uuid;
            this.dataCache.getData(currUUID, this.pwe, loRequestTime.slice(0), hiRequestTime.slice(0), (function (uuid) {
                    return function (entry) {
                            if (thisRequestID != self.drawRequestID) {
                                return; // another request has been made, so stop
                            }
                            
                            // start caching data in advance
                            setTimeout(function () {
                                    self.cacheDataInAdvance(uuid, thisRequestID, self.pwe, loRequestTime, hiRequestTime);
                                }, 1000);
                            
                            newDrawingCache[uuid] = entry;
                            numreplies += 1;
                            if (numreplies == numstreams) {
                                var cacheUuid, cacheEntry, shaders;
                                // Cleanup work for cache entries that are being removed
                                for (cacheUuid in self.drawingCache) {
                                    if (self.drawingCache.hasOwnProperty(cacheUuid)) {
                                        if (newDrawingCache[cacheUuid] === self.drawingCache[cacheUuid]) {
                                            continue;
                                        }
                                        cacheEntry = self.drawingCache[cacheUuid];
                                        cacheEntry.inPrimaryCache = false;
                                        if (!cacheEntry.inSecondaryCache && cacheEntry.cached_drawing.hasOwnProperty("graph")) {
                                            cacheEntry.freeDrawing();
                                        }
                                        if (newDrawingCache.hasOwnProperty(cacheUuid)) { // the stream isn't being removed, just a different cache entry
                                            continue;
                                        }
                                        shaders = self.shaders[cacheUuid];
                                        shaders[0].dispose();
                                        shaders[1].dispose();
                                        delete self.shaders[cacheUuid];
                                    }
                                }
                                // Setup work for cache entries that are being added
                                for (cacheUuid in newDrawingCache) {
                                    if (newDrawingCache.hasOwnProperty(cacheUuid)) {
                                        if (newDrawingCache[cacheUuid] === self.drawingCache[cacheUuid]) {
                                            continue;
                                        }
                                        var ce = newDrawingCache[cacheUuid];
                                        ce.inPrimaryCache = true;
                                        if (!ce.hasOwnProperty("graph")) {
                                            cacheDrawing(ce);
                                        }
                                        
                                        if (self.drawingCache.hasOwnProperty(cacheUuid)) { // the stream isn't being added, just a new cache entry
                                            shaders = self.shaders[cacheUuid];
                                        } else {
                                            shaders = Cache.makeShaders();
                                            self.shaders[cacheUuid] = shaders;
                                        }
                                        var shader = shaders[0];
                                        var rangeshader = shaders[1];
                                        shader.attributes.normalVector.value = ce.cached_drawing.normals;
                                        shader.attributes.timeNanos.value = ce.cached_drawing.timeNanos;
                                        rangeshader.attributes.timeNanos.value = ce.cached_drawing.rangeTimeNanos;
                                        shader.attributes.normalVector.needsUpdate = true;
                                        shader.attributes.timeNanos.needsUpdate = true;
                                        rangeshader.attributes.timeNanos.needsUpdate = true;
                                    }
                                }
                                self.drawingCache = newDrawingCache; // replace the first layer of the cache
                                callback();
                            }
                        };
                })(currUUID), false);
        }
        if (tempUpdate) {
            this.drawGraph3();
        }
    };
    
Plot.prototype.cacheDataInAdvance = function (uuid, drawID, pwe, startTime, endTime) {
        var sideCache = subTimes(endTime.slice(0), startTime);
        if (drawID != this.drawRequestID) {
            return;
        }
        var self = this;
        var leftStart = subTimes(startTime.slice(0), sideCache);
        var rightEnd = addTimes(sideCache, endTime);
        self.dataCache.getData(uuid, pwe, leftStart.slice(0), startTime.slice(0), function () {
                if (drawID != self.drawRequestID) {
                    return;
                }
                self.dataCache.getData(uuid, pwe, endTime.slice(0), rightEnd.slice(0), function () {
                        if (drawID != self.drawRequestID || pwe == 0) {
                            return;
                        }
                        self.dataCache.getData(uuid, pwe - 1, leftStart.slice(0), rightEnd.slice(0), function () {
                                if (drawID != self.drawRequestID || pwe == 1) {
                                    return;
                                }
                                self.dataCache.getData(uuid, pwe + 1, leftStart.slice(0), rightEnd.slice(0), function () {
                                        if (drawID != self.drawRequestID) {
                                            return;
                                        }
                                        self.dataCache.getData(uuid, pwe - 2, leftStart.slice(0), rightEnd.slice(0), function () {
                                                // Any GUI work to notify the user that caching is complete should be done here
                                            }, true);
                                    }, true);
                            }, true);
                    }, true);
            }, true);
    };
    

Plot.prototype.drawGraph1 = function () {
        // Normally we'd draw the x axis here. For now, I'm going to skip that.
        this.startTime = this.plotter.selectedStartTime.slice(0);
        this.endTime = this.plotter.selectedEndTime.slice(0);
        this.xAxis = new TimeAxis(this.startTime, this.endTime, this.plotspGeom.vertices[0].x, this.plotspGeom.vertices[1].x);
        
        var self = this;
        this.fullUpdate(function () {
                self.drawGraph2();
            }, false);
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
                for (k = 0; k < data.length; k++) {
                    for (i = 0; i < data[k].length; i++) {
		        if (data[k][i][2] < minval) {
		            minval = data[k][i][2];
		        }
		        if (data[k][i][4] > maxval) {
		            maxval = data[k][i][4];
		        }
                    }
                }
            }
        }
        
        this.yAxis = new Axis(minval, maxval, this.plotspGeom.vertices[0].y, this.plotspGeom.vertices[3].y);
        
        this.drawGraph3();
    };
    
Plot.prototype.drawGraph3 = function () {
        // This is where we actually draw the graph.
        var THICKNESS = 0.15;
        /*var transforms = [];
        var i, j;
        transforms.push(new THREE.Vector3(THICKNESS, 0, 0));
        for (i = 1; i < 6; i++) {
            transforms[i] = transforms[i - 1].clone();
            transforms[i].applyMatrix3(this.rotator60);
        }*/
        
        // For now, just draw the visible region.
        var data;
        var rangegraph;
        var mesh;
        var plot = new THREE.Object3D();
        var cacheEntry;
        var shaders, shader;
        
        var affineMatrix = getAffineTransformMatrix(this.xAxis, this.yAxis);
        
        for (var uuid in this.drawingCache) {
            if (this.drawingCache.hasOwnProperty(uuid)) {
                cacheEntry = this.drawingCache[uuid];
                if (!cacheEntry.cached_drawing.hasOwnProperty("graph")) {
                    // Compute the information we need to draw the graph
                    cacheDrawing(cacheEntry);
                }
                
                shaders = this.shaders[uuid];
                
                graph = cacheEntry.cached_drawing.rangegraph;
                shader = shaders[1];
                shader.uniforms.affineMatrix.value = affineMatrix;
                shader.uniforms.yDomainLo.value = this.yAxis.domainLo;
                shader.uniforms.xDomainLo1000.value = Math.floor(this.xAxis.domainLo[0] / 1000000);
                shader.uniforms.xDomainLoMillis.value = this.xAxis.domainLo[0] % 1000000;
                shader.uniforms.xDomainLoNanos.value = this.xAxis.domainLo[1];
                
                mesh = new THREE.Mesh(graph, shader);
                
                // The stream must always be drawn. I can't just check if it's in view since the
                // vertices change drastically due to vertex shading.
                mesh.frustumCulled = false;
                
                plot.add(mesh);
                
                
                graph = cacheEntry.cached_drawing.graph;
                shader = shaders[0];
                shader.uniforms.affineMatrix.value = affineMatrix;
                shader.uniforms.rot90Matrix.value = this.rotator90;
                shader.uniforms.thickness.value = THICKNESS;
                shader.uniforms.yDomainLo.value = this.yAxis.domainLo;
                shader.uniforms.xDomainLo1000.value = Math.floor(this.xAxis.domainLo[0] / 1000000);
                shader.uniforms.xDomainLoMillis.value = this.xAxis.domainLo[0] % 1000000;
                shader.uniforms.xDomainLoNanos.value = this.xAxis.domainLo[1];
                
                mesh = new THREE.Mesh(graph, shader);
                
                // The stream must always be drawn. I can't just check if it's in view since the
                // vertices change drastically due to vertex shading.
                mesh.frustumCulled = false;
                
                plot.add(mesh);
            }
        }
        if (this.plot != undefined) {
            this.plotter.scene.remove(this.plot);
        }
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
        
        this.plotspVirtualWidth = this.PLOTBG_VIRTUAL_WIDTH - this.innermargin.left - this.innermargin.right;
        
        this.pixelsWideChanged();
        
        this.plotspGeom.verticesNeedUpdate = true;
    };
    
Plot.prototype.pixelsWideChanged = function () {
        this.pixelsWide = NaN;
    };
    
Plot.prototype.recomputePixelsWideIfNecessary = function () {
        if (isNaN(this.pixelsWide)) {
            var leftVect = this.plotspGeom.vertices[0].clone().project(this.plotter.camera);
            var rightVect = this.plotspGeom.vertices[1].clone().project(this.plotter.camera);
            this.pixelsWide = rightVect.sub(leftVect).length() * this.plotter.width / 2;
        }
    };
    
Plot.prototype.startDrag = function () {
        this.scrolling = true;
    };
    
Plot.prototype.stopDrag = function () {
        this.scrolling = false;
        var self = this;
        this.fullUpdate(function () {
                self.drawGraph3();
            }, true);
    };
    
Plot.prototype.drag = function (deltaX, deltaY) {
        if (this.scrolling) {
            // Update the axis
            var trueDelta = (deltaX * this.plotspVirtualWidth / this.pixelsWide);
            this.recomputePixelsWideIfNecessary()
            
            var xStart = trueDelta + this.xAxis.rangeLo;
            var deltaTime = subTimes(this.xAxis.unmap(xStart), this.xAxis.domainLo);
            subTimes(this.xAxis.domainLo, deltaTime);
            subTimes(this.xAxis.domainHi, deltaTime);
            
            // Update the screen
            this.quickUpdate();
        }
    };
    
Plot.prototype.scroll = function (amount) {
        amount = Math.min(amount, 100);
        var currRange = subTimes(this.xAxis.domainHi.slice(0, 2), this.xAxis.domainLo);
        mulTime(currRange, amount / 1000);
        addTimes(this.xAxis.domainLo, currRange);
        subTimes(this.xAxis.domainHi, currRange);
        
        var self = this;
        // Update the screen
        this.fullUpdate(function () {
                self.drawGraph3();
            }, true);
    };
