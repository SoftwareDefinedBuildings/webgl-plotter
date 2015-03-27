/** The Plot encapsulates the area of the screen where the plot is drawn. Its
    height (including the outer margin) is HTOW times the width of the
    plotter, and its width is always equal to that of the plotter.
    
    X and Y specify the coordinates of the bottom left corner of the plotter.
    
    The outer margin is fixed upon construction, though the inner margins
    change dynamically.
    
    In many ways, the Plot is where the data and the graphics come together.
    Unfortunately, that means that this class has to deal with both drawing
    graphics and manipulating data, making it a bit cluttered. */

function Plot (plotter, outermargin, hToW, x, y) { // implements Draggable, Scrollable
    this.plotter = plotter;
    this.outermargin = outermargin;
    this.hToW = hToW;
    
    this.x = x;
    this.y = y;
    
    this.plotmargin = {left: 20, right: 20, top: 20, bottom: 20};
    this.ddplotmargin = {top: 2, bottom: 2}; // left and right are shared with plot margin, since these will always be aligned
    this.wvplotmargin = {top: 2, bottom: 2, left: 2, right: 2}; // top is gap from plot, bottom is gap from bottom (after outermargin is applied)
    
    // draw the chart area
    this.plotbgGeom = new THREE.Geometry()
    var w = plotter.VIRTUAL_WIDTH;
    var h = w * hToW;
    
    this.w = plotter.VIRTUAL_WIDTH;
    this.h = h;
    var SCREENZ = 0.01;
    this.SCREENZ = SCREENZ;
    this.plotbgGeom.vertices.push(
            // four outer corner vertices (0 - 3): bl, br, tr, tl
            new THREE.Vector3(x + outermargin, y + outermargin, SCREENZ),
            new THREE.Vector3(x + w - outermargin, y + outermargin, SCREENZ),
            new THREE.Vector3(x + w - outermargin, y + h - outermargin, SCREENZ),
            new THREE.Vector3(x + outermargin, y + h - outermargin, SCREENZ),
            
            // four plot corner vertices (4 - 7): bl, br, tr, tl
            new THREE.Vector3(x + outermargin + this.plotmargin.left, y + outermargin + this.plotmargin.bottom, SCREENZ),
            new THREE.Vector3(x + w - outermargin - this.plotmargin.right, y + outermargin + this.plotmargin.bottom, SCREENZ),
            new THREE.Vector3(x + w - outermargin - this.plotmargin.right, y + h - outermargin - this.plotmargin.top, SCREENZ),
            new THREE.Vector3(x + outermargin + this.plotmargin.left, y + h - outermargin - this.plotmargin.top, SCREENZ),
            
            // four ddplot corner vertices (8 - 11): tr, br, tl, bl
            new THREE.Vector3(x + w - outermargin - this.plotmargin.right, y + h - outermargin - this.ddplotmargin.top, SCREENZ),
            new THREE.Vector3(x + w - outermargin - this.plotmargin.right, y + h - outermargin - this.plotmargin.top + this.ddplotmargin.bottom, SCREENZ),
            new THREE.Vector3(x + outermargin + this.plotmargin.left, y + h - outermargin - this.ddplotmargin.top, SCREENZ),
            new THREE.Vector3(x + outermargin + this.plotmargin.left, y + h - outermargin - this.plotmargin.top + this.ddplotmargin.bottom, SCREENZ),
            
            // four wrplot corner vertices (12 - 15): tr, br, tl, bl
            new THREE.Vector3(x + w - outermargin - this.wvplotmargin.right, y + outermargin + this.plotmargin.bottom - this.wvplotmargin.top, SCREENZ),
            new THREE.Vector3(x + w - outermargin - this.wvplotmargin.right, y + outermargin + this.wvplotmargin.bottom, SCREENZ),
            new THREE.Vector3(x + outermargin + this.wvplotmargin.left, y + outermargin + this.plotmargin.bottom - this.wvplotmargin.top, SCREENZ),
            new THREE.Vector3(x + outermargin + this.wvplotmargin.left, y + outermargin + this.wvplotmargin.bottom, SCREENZ)
        );
        
    /*
        This is a map of how the vertices are placed
    
        3          2
                    
          10     8  
          11     9  
                    
          7      6  
                    
          4      5  
                    
          14     12 
          15     13 
                    
        0          1
    */
        
    this.plotbgGeom.faces.push(
            // bottom trapezoid
            new THREE.Face3(0, 1, 15), new THREE.Face3(15, 1, 13),
            
            // top trapezoid
            new THREE.Face3(2, 3, 10), new THREE.Face3(10, 8, 2),
            
            // wvplot left and right
            new THREE.Face3(14, 0, 15), new THREE.Face3(12, 13, 1),
            
            // wvplot top / plot bottom
            new THREE.Face3(4, 14, 12), new THREE.Face3(4, 12, 5),
            
            // plot right / ddplot right
            new THREE.Face3(12, 1, 2), new THREE.Face3(5, 12, 2), new THREE.Face3(8, 5, 2),
            
            //plot left / ddplot left
            new THREE.Face3(3, 0, 14), new THREE.Face3(3, 14, 4), new THREE.Face3(3, 4, 10),
            
            // ddplot bottom / plot top
            new THREE.Face3(11, 7, 6), new THREE.Face3(11, 6, 9)
        );
        
    var plotbg = new THREE.Mesh(this.plotbgGeom, new THREE.MeshBasicMaterial({color: 0xaaaaaa}));
    plotter.scene.add(plotbg);
    
    this.PLOTBG_VIRTUAL_WIDTH = plotter.VIRTUAL_WIDTH - 2 * outermargin;
    
    this.updateWidth();
    
    var material;
    // Detect clicks in the plot space. It's transparent but it's needed to detect mouse clicks.
    this.plotspGeom = new THREE.Geometry();
    this.plotspGeom.vertices = this.plotbgGeom.vertices.slice(4, 8);
    this.plotspGeom.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 3, 0));
    material = new THREE.MeshBasicMaterial();
    material.transparent = true;
    material.opacity = 0;
    var plotsp = new THREE.Mesh(this.plotspGeom, material);
    plotter.scene.add(plotsp);
    plotsp.startDrag = this.startDragPlot.bind(this);
    plotsp.stopDrag = this.stopDragPlot.bind(this);
    plotsp.drag = this.dragPlot.bind(this);
    plotsp.scroll = this.scrollPlot.bind(this);
    plotter.draggables.push(plotsp);
    plotter.scrollables.push(plotsp);
    
    // Detect clicks in the summmary plot space. Again, we use a transparent object to sense mouse clicks.
    this.wvplotspGeom = new THREE.Geometry();
    this.wvplotspGeom.vertices = this.plotbgGeom.vertices.slice(12, 16);
    this.wvplotspGeom.faces.push(new THREE.Face3(0, 2, 1), new THREE.Face3(1, 2, 3));
    material = new THREE.MeshBasicMaterial();
    material.transparent = true;
    material.opacity = 0;
    var wvplotsp = new THREE.Mesh(this.wvplotspGeom, material);
    plotter.scene.add(wvplotsp);
    wvplotsp.startDrag = this.startDragWVPlot.bind(this);
    wvplotsp.stopDrag = this.stopDragWVPlot.bind(this);
    wvplotsp.drag = this.dragWVPlot.bind(this);
    plotter.draggables.push(wvplotsp);
    
    // Detect clicks in the plot drag area. It's transparent but it's needed to detect mouse clicks.
    this.plotdrGeom = new THREE.Geometry();
    this.plotdrGeom.vertices.push(this.plotbgGeom.vertices[4], this.plotbgGeom.vertices[5], this.plotbgGeom.vertices[12], this.plotbgGeom.vertices[14]);
    this.plotdrGeom.faces.push(new THREE.Face3(0, 3, 1), new THREE.Face3(1, 3, 2));
    material = new THREE.MeshBasicMaterial();
    material.transparent = true;
    material.opacity = 0;
    var plotdr = new THREE.Mesh(this.plotdrGeom, material);
    plotter.scene.add(plotdr);
    plotdr.startDrag = this.startResizePlot.bind(this);
    plotdr.stopDrag = this.stopResizePlot.bind(this);
    plotdr.drag = this.resizePlot.bind(this);
    plotter.draggables.push(plotdr);
    
    // create the first level of cache for the main plot
    this.drawingCache = {};
    this.shaders = {};
    
    // create the first level of cache for the summary plot
    this.summaryCache = {};
    this.summaryShaders = {};
    
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
    this.summaryRequestID = 0;
    
    // cursors for the summary plot
    this.summary1 = null;
    this.summary2 = null;
    
    // the axes currently being drawn
    this.currAxes = {};
    
    // Start polling brackets
    var self = this;
    var pollBracketsRepeatedly = function () {
            setTimeout(function () {
                    self.pollBracketsIfNecessary(pollBracketsRepeatedly);
                }, 5000);
        };
    pollBracketsRepeatedly();
    
    
    // Store whether the "Stage 2" initialization has been completed.
    this.initializedGraph = false;
    this.initializedSummaryGraph = false;
}

Plot.prototype.AXISWIDTH = 5;

Plot.prototype.getVirtualToRealPixelRatio = function () {
        this.recomputePixelsWideIfNecessary();
        return this.plotspVirtualWidth / this.pixelsWide;
    };


// After you're done changing the height, call FullUpdateForLength on each cursor so they're clickable again
Plot.prototype.setHeight = function (h) {
        h = h || this.h;
        this.y = this.y + this.h - h;
        this.h = h;
        var newBottom = this.y + this.outermargin;
        this.plotbgGeom.vertices[0].y = newBottom;
        this.plotbgGeom.vertices[1].y = newBottom;
        
        this.plotbgGeom.vertices[4].y = this.y - this.outermargin + this.plotmargin.bottom;
        this.plotbgGeom.vertices[5].y = this.y + this.outermargin + this.plotmargin.bottom;
        this.plotbgGeom.vertices[12].y = this.y + this.outermargin + this.plotmargin.bottom - this.wvplotmargin.top;
        this.plotbgGeom.vertices[14].y = this.y + this.outermargin + this.plotmargin.bottom - this.wvplotmargin.top;
        
        this.plotbgGeom.vertices[13].y = this.y + this.outermargin + this.wvplotmargin.bottom;
        this.plotbgGeom.vertices[15].y = this.y + this.outermargin + this.wvplotmargin.bottom;
        
        this.xAxis.updateY(this.y + this.outermargin + this.plotmargin.bottom);
        
        var wvCursorOrth = this.y + this.outermargin + this.wvplotmargin.bottom;
        this.wvcursor1.orthCoord = wvCursorOrth;
        this.wvcursor2.orthCoord = wvCursorOrth;
        this.wvcursor1.updateForLength();
        this.wvcursor2.updateForLength();
        this.summaryXAxis.updateY(wvCursorOrth);
        
        this.plotter.plotterUI.setY(this.y);
        
        this.plotbgGeom.verticesNeedUpdate = true;
    };

Plot.prototype.setPlot = function (x, y, w, h) {
        if (x != undefined) {
            this.plotmargin.left = x;
            this.plotbgGeom.vertices[4].x = this.x + this.outermargin + this.plotmargin.left;
            this.plotbgGeom.vertices[7].x = this.x + this.outermargin + this.plotmargin.left;
            this.plotbgGeom.vertices[10].x = this.x + this.outermargin + this.plotmargin.left;
            this.plotbgGeom.vertices[11].x = this.x + this.outermargin + this.plotmargin.left;
        }
        if (y != undefined) {
            this.plotmargin.top = y;
            this.plotbgGeom.vertices[6].y = this.y + this.h - this.outermargin - this.plotmargin.top;
            this.plotbgGeom.vertices[7].y = this.y + this.h - this.outermargin - this.plotmargin.top;
            this.plotbgGeom.vertices[9].y = this.y + this.h - this.outermargin - this.plotmargin.top + this.ddplotmargin.bottom;
            this.plotbgGeom.vertices[11].y = this.y + this.h - this.outermargin - this.plotmargin.top + this.ddplotmargin.bottom;
        }
        if (w != undefined) {
            this.plotmargin.right = this.w - w - this.plotmargin.left;
            this.plotbgGeom.vertices[5].x = this.x + this.w - this.outermargin - this.plotmargin.right;
            this.plotbgGeom.vertices[6].x = this.x + this.w - this.outermargin - this.plotmargin.right;
            this.plotbgGeom.vertices[8].x = this.x + this.w - this.outermargin - this.plotmargin.right;
            this.plotbgGeom.vertices[9].x = this.x + this.w - this.outermargin - this.plotmargin.right;
            this.updateWidth();
        }
        if (h != undefined) {
            this.plotmargin.bottom = this.h - h - this.plotmargin.top;
            this.plotbgGeom.vertices[4].y = this.y - this.outermargin + this.plotmargin.bottom;
            this.plotbgGeom.vertices[5].y = this.y + this.outermargin + this.plotmargin.bottom;
            this.plotbgGeom.vertices[12].y = this.y + this.outermargin + this.plotmargin.bottom - this.wvplotmargin.top;
            this.plotbgGeom.vertices[14].y = this.y + this.outermargin + this.plotmargin.bottom - this.wvplotmargin.top;
        }
        
        if (x != undefined || w != undefined) {
            this.xAxis.setRange(this.plotbgGeom.vertices[4].x, this.plotbgGeom.vertices[5].x);
        }
        
        if (y != undefined || h != undefined) {
            var newWVCursorHeight = this.plotmargin.bottom - this.outermargin - this.wvplotmargin.top - this.wvplotmargin.bottom;
            this.wvcursor1.cursorLength = newWVCursorHeight;
            this.wvcursor2.cursorLength = newWVCursorHeight;
            this.wvcursor1.updateForLength();
            this.wvcursor2.updateForLength();
        }
                
        this.plotbgGeom.verticesNeedUpdate = true;
        this.plotspGeom.verticesNeedUpdate = true;
    };

/* Y is the y coordinate of the top left corner. */
Plot.prototype.setDDPlot = function (y, bottomGap) {
        // To change x or w, just use resizePlot. The DDPlot and the main plot are linked in x coordinate and width.
        // BottomGap is the space between the DDPlot and the main plot.
        if (y != undefined) {
            this.ddplotmargin.top = y;
            this.plotbgGeom.vertices[8].y = this.y + this.h - this.outermargin - this.ddplotmargin.top;
            this.plotbgGoem.vertices[10].y = this.y + this.h - this.outermargin - this.ddplotmargin.top;
        }
        if (bottomGap != undefined) {
            this.ddplotmargin.bottom = bottomGap;
            this.plotbgGeom.vertices[9].y = this.y + this.h - this.outermargin - this.plotmargin.top + this.ddplotmargin.bottom;
            this.plotbgGeom.vertices[11].y = this.y + this.h - this.outermargin - this.plotmargin.top + this.ddplotmargin.bottom;
        }
        
        this.plotbgGeom.verticesNeedUpdate = true;
    };
    
/* Y is the y coordinate of the bottom left corner. */
Plot.prototype.setWVPlot = function (y, topGap) {
        if (y != undefined) {
            this.wvplotmargin.bottom = y;
            this.plotbgGeom.vertices[13].y = this.y + this.outermargin + this.wvplotmargin.bottom;
            this.plotbgGeom.vertices[15].y = this.y + this.outermargin + this.wvplotmargin.bottom;
        }
        if (topGap != undefined) {
            this.wvplotmargin.top = topGap;
            this.plotbgGeom.vertices[12].y = this.y + this.outermargin + this.plotmargin.bottom - this.wvplotmargin.top;
            this.plotbgGeom.vertices[14].y = this.y + this.outermargin + this.plotmargin.bottom - this.wvplotmargin.top;
        }
        this.plotbgGeom.verticesNeedUpdate = true;
    };

/** Just draw the same data again with the new x-axis. In other words, we just
    read the first level of cache and draw that same data on the new axis. */
Plot.prototype.quickUpdate = function () {
        this.xAxis.updateTicks();
        this.drawGraph3();
    };
    
Plot.prototype.quickUpdateSummary = function () {
        this.summaryXAxis.updateTicks();
        this.drawSummary3();
    };
    
/** Polls brackets and updates the cache and screen if necessary. FINISHED is a
    callback function that is invoked after this process is completed. */
Plot.prototype.pollBracketsIfNecessary = function (finished) {
        if (this.xAxis === undefined || this.summaryXAxis === undefined) {
            return;
        }

        var cutoff;
        if (cmpTimes(this.xAxis.domainHi, this.summaryXAxis.domainHi) > 0) {
            cutoff = this.xAxis.domainHi;
        } else {
            cutoff = this.summaryXAxis.domainHi;
        }
        
        var streams = this.plotter.settings.getStreams();
        var node, uuid;
        
        var streamsToPoll = [];
        
        for (node = streams.head; node !== null; node = node.next) {
            uuid = node.elem.uuid;
            if (this.dataCache.lastTimes.hasOwnProperty(uuid)) {
                if (cmpTimes(this.dataCache.lastTimes[uuid], cutoff) < 0) {
                    streamsToPoll.push(uuid);
                }
            } else {
                streamsToPoll.push(uuid); // We need to poll the brackets for a stream if we haven't done so before
            }
        }
        
        if (streamsToPoll.length > 0) {
            var self = this;
            this.plotter.requester.makeBracketRequest(streamsToPoll, function (result) {
                    var cutoff;
                    if (cmpTimes(self.xAxis.domainHi, self.summaryXAxis.domainHi) > 0) {
                        cutoff = self.xAxis.domainHi;
                    } else {
                        cutoff = self.summaryXAxis.domainHi;
                    }
                    if (self.dataCache.updateToBrackets(JSON.parse(result), cutoff)) {
                        self.fullUpdate(function () {
                                if (self.initializedSummaryGraph) {
                                    self.drawSummary3();
                                }
                                self.fullUpdate(function () {
                                        if (self.initializedGraph) {
                                            self.drawGraph3();
                                        }
                                        finished();
                                    }, false);
                            }, true);
                    } else {
                        finished();
                    }
                });
        } else {
            finished();
        }
    };
    
/** Draw the graph with the new x-axis, accounting for the fact that the data
    may have changed. In other words, we search in the second level of cache
    and draw the correct data. The method is not guaranteed to call CALLBACK
    synchronously, though it might. */
Plot.prototype.fullUpdate = function (callback, summary) {
        var cache, cachedShaders, axis;
        if (summary) {
            cache = this.summaryCache;
            cachedShaders = this.summaryShaders;
            axis = this.summaryXAxis;
        } else {
            cache = this.drawingCache;
            cachedShaders = this.shaders;
            axis = this.xAxis;
        }
        
        // Compute the new point width exponent
        var nanoDiff = subTimes(axis.domainHi.slice(0), axis.domainLo);
        
        var pwe;
        
        if (summary) {
            this.recomputePixelsWideSummaryIfNecessary();
            pwe = getPWExponent(mulTime(nanoDiff, 1 / this.pixelsWideSummary));
        } else {
            this.recomputePixelsWideIfNecessary();
            pwe = getPWExponent(mulTime(nanoDiff, 1 / this.pixelsWide));
        }
        
        var streams = this.plotter.settings.getStreams();
        
        var numstreams = streams.len;
        var numreplies = 0;
        var newDrawingCache = {};
        
        var self = this;
        var currUUID;
        
        if (summary) {
            var thisRequestID = ++this.summaryRequestID;
        } else {
            var thisRequestID = ++this.drawRequestID;
        }
        var loRequestTime = roundTime(axis.domainLo.slice(0, 2));
        var hiRequestTime = roundTime(axis.domainHi.slice(0, 2));
        
        if (thisRequestID % 5 == 0) {
            this.dataCache.limitMemory(streams, loRequestTime.slice(0), hiRequestTime.slice(0), pwe, 100000, 500000);
        }
        
        for (var streamnode = streams.head; streamnode !== null; streamnode = streamnode.next) {
            currUUID = streamnode.elem.uuid;
            this.dataCache.getData(currUUID, pwe, loRequestTime.slice(0), hiRequestTime.slice(0), (function (uuid) {
                    return function (entry) {
                            if (summary) {
                                if (thisRequestID != self.summaryRequestID) {
                                    return; // another request has been made, so stop
                                }
                            } else if (thisRequestID != self.drawRequestID) {
                                return; // another request has been made, so stop
                            }
                            
                            // start caching data in advance
                            setTimeout(function () {
                                    self.cacheDataInAdvance(uuid, thisRequestID, pwe, loRequestTime, hiRequestTime);
                                }, 1000);
                            
                            var toDispose = [];
                            
                            newDrawingCache[uuid] = entry;
                            numreplies += 1;
                            if (numreplies == numstreams) {
                                var cacheUuid, cacheEntry, shaders;
                                // Cleanup work for cache entries that are being removed
                                for (cacheUuid in cache) {
                                    if (cache.hasOwnProperty(cacheUuid)) {
                                        if (newDrawingCache[cacheUuid] === cache[cacheUuid]) {
                                            continue;
                                        }
                                        cacheEntry = cache[cacheUuid];
                                        if (summary) {
                                            cacheEntry.inSummaryCache = false;
                                        } else {
                                            cacheEntry.inPrimaryCache = false;
                                        }
                                        toDispose.push(cacheEntry);
                                        if (newDrawingCache.hasOwnProperty(cacheUuid)) { // the stream isn't being removed, just a different cache entry
                                            continue;
                                        }
                                        shaders = cachedShaders[cacheUuid];
                                        shaders[0].dispose();
                                        shaders[1].dispose();
                                        shaders[2].dispose();
                                        delete cachedShaders[cacheUuid];
                                    }
                                }
                                // Setup work for cache entries that are being added
                                for (cacheUuid in newDrawingCache) {
                                    if (newDrawingCache.hasOwnProperty(cacheUuid)) {
                                        if (newDrawingCache[cacheUuid] === cache[cacheUuid]) {
                                            continue;
                                        }
                                        var ce = newDrawingCache[cacheUuid];
                                        if (summary) {
                                            ce.inSummaryCache = true;
                                        } else {
                                            ce.inPrimaryCache = true;
                                        }
                                        if (!ce.cached_drawing.hasOwnProperty("graph")) {
                                            ce.cacheDrawing(pwe);
                                        }
                                        
                                        if (cache.hasOwnProperty(cacheUuid)) { // the stream isn't being added, just a new cache entry
                                            shaders = cachedShaders[cacheUuid];
                                        } else {
                                            shaders = Cache.makeShaders();
                                            cachedShaders[cacheUuid] = shaders;
                                        }
                                        var shader = shaders[0];
                                        var rangeshader = shaders[1];
                                        var ddshader = shaders[2];
                                        shader.attributes.normalVector.value = ce.cached_drawing.normals;
                                        shader.attributes.timeNanos.value = ce.cached_drawing.timeNanos;
                                        rangeshader.attributes.timeNanos.value = ce.cached_drawing.rangeTimeNanos;
                                        rangeshader.attributes.rangePerturb.value = ce.cached_drawing.rangePerturb;
                                        ddshader.attributes.normalVector.value = ce.cached_drawing.ddplotnormals;
                                        ddshader.attributes.timeNanos.value = ce.cached_drawing.ddplotNanos;
                                        shader.attributes.normalVector.needsUpdate = true;
                                        shader.attributes.timeNanos.needsUpdate = true;
                                        rangeshader.attributes.timeNanos.needsUpdate = true;
                                        rangeshader.attributes.rangePerturb.needsUpdate = true;
                                        ddshader.attributes.normalVector.needsUpdate = true;
                                        ddshader.attributes.timeNanos.needsUpdate = true;
                                    }
                                }
                                fp = null;
                                
                                // replace the first layer of the cache
                                if (summary) {
                                    self.summaryCache = newDrawingCache;
                                } else {
                                    self.drawingCache = newDrawingCache;
                                }
                                
                                callback();
                                
                                //setTimeout(function () {
                                        for (var i = 0; i < toDispose.length; i++) {
                                            toDispose[i].disposeIfPossible();
                                        }
                                //    }, 20000);
                            }
                        };
                })(currUUID), false);
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
        var firstLevel = 2
            
        var cacheRest = function () {
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
            };
            
        self.dataCache.getData(uuid, pwe, endTime.slice(0), rightEnd.slice(0), function (ce) {
                if (drawID != self.drawRequestID || pwe == 0) {
                    return;
                }
                firstLevel--;
                if (firstLevel == 0) {
                    cacheRest()
                }
            }, true);
            
        self.dataCache.getData(uuid, pwe, leftStart.slice(0), startTime.slice(0), function (ce) {
                if (drawID != self.drawRequestID) {
                    return;
                }
                firstLevel--;
                if (firstLevel == 0) {
                    cacheRest()
                }
            }, true);
            
    };
    
Plot.prototype.updateDefaultAxisRange = function () {
        var rangeLo = this.plotbgGeom.vertices[4].y;
        var rangeHi = this.plotbgGeom.vertices[7].y;
        var axis;
        for (var axisid in this.plotter.settings.axisMap) {
            axis = this.plotter.settings.axisMap[axisid].elem;
            axis.setRange(rangeLo, rangeHi);
            axis.updateTicks();
        }
    };
    
/* Eventually, this will replace drawGraph1 and drawSummary1. */
Plot.prototype.plotData = function () {
        this.startTime = this.plotter.selectedStartTime.slice(0, 2);
        this.endTime = this.plotter.selectedEndTime.slice(0, 2);
        if (this.xAxis === undefined) {
            this.xAxis = new TimeAxis(this.startTime.slice(0), this.endTime.slice(0), this.plotbgGeom.vertices[4].x, this.plotbgGeom.vertices[5].x, this.plotbgGeom.vertices[4].y, this.plotter.translator);
            this.xAxis.addToPlotter(this.plotter);
        } else {
            this.xAxis.domainLo = this.startTime.slice(0);
            this.xAxis.domainHi = this.endTime.slice(0);
        }
        this.xAxis.updateTicks();
        if (this.summaryXAxis === undefined) {
            this.summaryXAxis = new TimeAxis(this.startTime.slice(0), this.endTime.slice(0), this.plotbgGeom.vertices[15].x, this.plotbgGeom.vertices[13].x, this.plotbgGeom.vertices[15].y, this.plotter.translator);
            this.summaryXAxis.addToPlotter(this.plotter);
        } else {
            this.summaryXAxis.domainLo = this.startTime.slice(0);
            this.summaryXAxis.domainHi = this.endTime.slice(0);
        }
        this.summaryXAxis.updateTicks();
        
        var self = this;
        this.pollBracketsIfNecessary(function () {
                self.fullUpdate(function () {
                        self.drawGraph2();
                        self.fullUpdate(function () {
                                if (self.wvcursor1 === undefined) {
                                    self.initWVCursors();
                                } else {
                                    self.updateWVCursorsFromXAxis(true);
                                }
                                self.drawSummary2();
                            }, true);
                    }, false);
            });
    };
    
Plot.prototype.updateWVCursorsFromXAxis = function (full) {
        this.wvcursor1.coord = this.summaryXAxis.map(this.xAxis.domainLo);
        this.wvcursor2.coord = this.summaryXAxis.map(this.xAxis.domainHi);
        if (full) {
            this.wvcursor1.fullUpdateForCoord();
            this.wvcursor2.fullUpdateForCoord();
        } else {
            this.wvcursor1.updateForCoord();
            this.wvcursor2.updateForCoord();
        }
    };
    
Plot.prototype.updateXAxisFromWVCursors = function (full) {
        var lowc, highc;
        if (this.wvcursor2.coord < this.wvcursor1.coord) {
            lowc = this.wvcursor2.coord;
            highc = this.wvcursor1.coord;
        } else {
            lowc = this.wvcursor1.coord;
            highc = this.wvcursor2.coord;
        }
        this.xAxis.domainLo = this.summaryXAxis.unmap(lowc);
        this.xAxis.domainHi = this.summaryXAxis.unmap(highc);
        
        this.quickUpdate(); // In case we have to get data from the server
        
        if (full) {
            var self = this;
            this.fullUpdate(function () {
                    self.drawGraph3();
                }, false);
        }
            
    };
    
Plot.prototype.initWVCursors = function () {
        var self = this;
        var update = function () {
                self.updateXAxisFromWVCursors(true);
            };
        var animate = function () {
                self.updateXAxisFromWVCursors(false);
            };
        this.wvcursor1 = new Cursor(this.getVirtualToRealPixelRatio.bind(this), true, this.summaryXAxis.rangeLo, this.plotbgGeom.vertices[15].y, this.plotbgGeom.vertices[14].y - this.plotbgGeom.vertices[15].y, 0.5, 2 * this.SCREENZ, animate, update);
        this.wvcursor1.addToPlotter(this.plotter);
        this.wvcursor2 = new Cursor(this.getVirtualToRealPixelRatio.bind(this), true, this.summaryXAxis.rangeHi, this.plotbgGeom.vertices[15].y, this.plotbgGeom.vertices[14].y - this.plotbgGeom.vertices[15].y, 0.5, 2 * this.SCREENZ, animate, update);
        this.wvcursor2.addToPlotter(this.plotter);
    };

Plot.prototype.drawGraph1 = function () {
        // Normally we'd draw the x axis here. For now, I'm going to skip that.
        this.startTime = this.plotter.selectedStartTime.slice(0, 2);
        this.endTime = this.plotter.selectedEndTime.slice(0, 2);
        this.xAxis = new TimeAxis(this.startTime.slice(0), this.endTime.slice(0), this.plotbgGeom.vertices[4].x, this.plotbgGeom.vertices[5].x);
        
        var self = this;
        this.fullUpdate(function () {
                self.drawGraph2();
            }, false);
    };
    
Plot.prototype.drawSummary1 = function () {
        // Normally we'd draw the x axis here. For now, I'm going to skip that.
        this.startTime = this.plotter.selectedStartTime.slice(0, 2);
        this.endTime = this.plotter.selectedEndTime.slice(0, 2);
        this.summaryXAxis = new TimeAxis(this.startTime.slice(0), this.endTime.slice(0), this.plotbgGeom.vertices[15].x, this.plotbgGeom.vertices[13].x);
        
        var self = this;
        this.fullUpdate(function () {
                self.drawSummary2();
            }, true);
    };
    
Plot.prototype.drawGraph2 = function () {
        // We draw the y axes here.
        var data;
        var a, i, j, k;
        var maxval;
        var minval;
        var axes = this.plotter.settings.getAxes();
        var axisstreams;
        var axisnode, streamnode;
        var axis, stream;
        
        var leftaxisnum = 0;
        var rightaxisnum = 0;
        
        var newAxes = {};
        
        for (axisnode = axes.head; axisnode != null; axisnode = axisnode.next) {
            axis = axisnode.elem;
            maxval = -Infinity;
            minval = Infinity;
            if (axis.autoscale) {
                for (streamnode = axis.streams.head; streamnode != null; streamnode = streamnode.next) {
                    stream = streamnode.elem;
                    if (this.drawingCache.hasOwnProperty(stream.uuid)) {
                        data  = this.drawingCache[stream.uuid].cached_data;
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
                newAxes[axis.axisid] = axis;
                if (maxval < minval) {
                    axis.setDomain(-10, 10);
                } else if (maxval == minval) {
                    axis.setDomain(minval - 1, maxval + 1);
                } else {
                    axis.setDomain(minval, maxval);
                }
                axis.niceDomain();
                axis.updateX(this.x + this.outermargin + this.wvplotmargin.left + this.AXISWIDTH * (++leftaxisnum));
                axis.addToPlotter(this.plotter);
            }
        }
        
        var newX = this.AXISWIDTH * leftaxisnum + this.wvplotmargin.left;
        var newW = this.w - newX - this.wvplotmargin.right - this.AXISWIDTH * rightaxisnum;
        this.setPlot(newX, undefined, newW, undefined);
        
        for (var id in this.currAxes) {
            if (this.currAxes.hasOwnProperty(id) && !newAxes.hasOwnProperty(id)) {
                this.currAxes[id].removeFromPlotter(this.plotter);
            }
        }
        
        this.currAxes = newAxes;
        
        this.updateDefaultAxisRange();
        
        this.initializedGraph = true;
        this.drawGraph3();
    };
    
Plot.prototype.drawSummary2 = function () {
        var maxval = -Infinity;
        var minval = Infinity;
        for (var uuid in self.summaryCache) {
            if (self.summaryCache.hasOwnProperty(uuid)) {
                for (var k = 0; k < data.length; k++) {
                    for (var i = 0; i < data[k].length; i++) {
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
        
        if (maxval < minval) {
            minval = -10;
            maxval = 10;
        } else if (maxval == minval) {
            minval -= 1;
            maxval += 1;
        }
        
        this.summaryYAxis = new Axis(minval, maxval, this.plotbgGeom.vertices[15].y, this.plotbgGeom.vertices[14].y);
        
        this.initializedSummaryGraph = true;
        this.drawSummary3();
    };
    
Plot.prototype.drawGraph3 = function () {
        // This is where we actually draw the graph.
        var THICKNESS = 0.15;
        var data;
        var rangegraph;
        var mesh;
        var meshNum = 0;
        if (this.plot == undefined) {
            this.plot = new THREE.Object3D();
            this.plotter.scene.add(this.plot);
        }
        var cacheEntry;
        var shaders;
        
        var dispSettings;
        
        var ddPlotMax = -Infinity;
        
        for (uuid in this.drawingCache) {
            if (this.drawingCache.hasOwnProperty(uuid)) {
                ddPlotMax = Math.max(ddPlotMax, this.drawingCache[uuid].cached_drawing.ddplotMax);
            }
        }
        
        var ddAxis = new Axis(0, ddPlotMax, this.plotbgGeom.vertices[7].y + 2, this.plotbgGeom.vertices[7].y + 18);
        
        var ddMatrix = getAffineTransformMatrix(this.xAxis, ddAxis);
        
        var axes = this.plotter.settings.getAxes();
        var axisnode, streamnode;
        var affineMatrix, axis, uuid;
        
        var pwe, pixelShift;
        
        for (axisnode = axes.head; axisnode != null; axisnode = axisnode.next) {
            axis = axisnode.elem;
            affineMatrix = getAffineTransformMatrix(this.xAxis, axis);
            for (streamnode = axis.streams.head; streamnode != null; streamnode = streamnode.next) {
                uuid = streamnode.elem.uuid;
                if (this.drawingCache.hasOwnProperty(uuid)) {
                    cacheEntry = this.drawingCache[uuid];
                    cacheEntry.compressIfPossible();
                    
                    shaders = this.shaders[uuid];
                    
                    dispSettings = this.plotter.settings.getSettings(uuid);
                    
                    if (pwe != cacheEntry.cached_drawing.pwe) {
                        pwe = cacheEntry.cached_drawing.pwe;
                        pixelShift = this.xAxis.getPixelShift(pwe);
                    }
                    
                    if (cacheEntry.getLength() > 0) {
                        graph = cacheEntry.cached_drawing.rangegraph;
                        packShaderUniforms(shaders[1], affineMatrix, dispSettings.color, dispSettings.selected ? THICKNESS * 1.5 : THICKNESS, this.xAxis, axis, pixelShift, dispSettings.selected ? 0.6 : 0.3);
                        setMeshChild(this.plot, meshNum++, graph, shaders[1]);
                        
                        graph = cacheEntry.cached_drawing.graph;
                        packShaderUniforms(shaders[0], affineMatrix, dispSettings.color, dispSettings.selected ? THICKNESS * 1.5 : THICKNESS, this.xAxis, axis, pixelShift, undefined, this.rotator90);
                        setMeshChild(this.plot, meshNum++, graph, shaders[0]);
                    } else {
                        meshNum += 2;
                    }
                    
                    graph = cacheEntry.cached_drawing.ddplot;
                    packShaderUniforms(shaders[2], ddMatrix, dispSettings.color, dispSettings.selected ? THICKNESS * 2 : THICKNESS, this.xAxis, ddAxis);
                    setMeshChild(this.plot, meshNum++, graph, shaders[2]);
                    
                }
            }
        }
        for (var i = this.plot.children.length - 1; i >= meshNum; i++) {
            this.plot.remove(this.plot.children[i]);
        }
    };
    
Plot.prototype.drawSummary3 = function () {
        // This is where we actually draw the graph.
        var THICKNESS = 0.15;
        var data;
        var rangegraph;
        var mesh;
        var meshNum = 0;
        if (this.wvplot == undefined) {
            this.wvplot = new THREE.Object3D();
            this.plotter.scene.add(this.wvplot);
        }
        var cacheEntry;
        var shaders;
        
        var dispSettings;
        
        var axisnode, streamnode;
        
        var pwe, pixelShift;
        var affineMatrix = getAffineTransformMatrix(this.summaryXAxis, this.summaryYAxis);
        
        var axes = this.plotter.settings.getAxes();
        var axisnode, streamnode;
        var axis, uuid;
        
        for (axisnode = axes.head; axisnode != null; axisnode = axisnode.next) {
            axis = axisnode.elem;
            for (streamnode = axis.streams.head; streamnode != null; streamnode = streamnode.next) {
                uuid = streamnode.elem.uuid;
                if (this.summaryCache.hasOwnProperty(uuid)) {
                    cacheEntry = this.summaryCache[uuid];
                    cacheEntry.compressIfPossible();
                    
                    shaders = this.summaryShaders[uuid];
                    
                    dispSettings = this.plotter.settings.getSettings(uuid);
                    
                    if (pwe != cacheEntry.cached_drawing.pwe) {
                        pwe = cacheEntry.cached_drawing.pwe;
                        pixelShift = this.summaryXAxis.getPixelShift(pwe);
                    }
                    
                    if (cacheEntry.getLength() > 0) {
                        graph = cacheEntry.cached_drawing.rangegraph;
                        packShaderUniforms(shaders[1], affineMatrix, dispSettings.color, dispSettings.selected ? THICKNESS * 1.5 : THICKNESS, this.summaryXAxis, this.summaryYAxis, pixelShift, dispSettings.selected ? 0.6 : 0.3);
                        setMeshChild(this.wvplot, meshNum++, graph, shaders[1]);
                        
                        graph = cacheEntry.cached_drawing.graph;
                        packShaderUniforms(shaders[0], affineMatrix, dispSettings.color, dispSettings.selected ? THICKNESS * 1.5 : THICKNESS, this.summaryXAxis, this.summaryYAxis, pixelShift, undefined, this.rotator90)
                        setMeshChild(this.wvplot, meshNum++, graph, shaders[0]);
                        
                    } else {
                        meshNum += 2;
                    }
                }
            }
        }
        for (var i = this.wvplot.children.length - 1; i >= meshNum; i++) {
            this.wvplot.remove(this.wvplot.children[i]);
        }
    };

Plot.prototype.updateWidth = function () {        
        this.plotspVirtualWidth = this.PLOTBG_VIRTUAL_WIDTH - this.plotmargin.left - this.plotmargin.right;
        this.wvplotspVirtualWidth = this.PLOTBG_VIRTUAL_WIDTH - this.wvplotmargin.left - this.wvplotmargin.right;
        this.pixelsWideChanged();
        this.pixelsWideSummaryChanged();
    };
    
Plot.prototype.pixelsWideChanged = function () {
        this.pixelsWide = NaN;
    };
    
Plot.prototype.pixelsWideSummaryChanged = function () {
        this.pixelsWideSummary = NaN;
    };
    
Plot.prototype.recomputePixelsWideIfNecessary = function () {
        if (isNaN(this.pixelsWide)) {
            var leftVect = this.plotbgGeom.vertices[4].clone().project(this.plotter.camera);
            var rightVect = this.plotbgGeom.vertices[5].clone().project(this.plotter.camera);
            this.pixelsWide = rightVect.sub(leftVect).length() * this.plotter.width / 2;
        }
    };
    
Plot.prototype.recomputePixelsWideSummaryIfNecessary = function () {
        if (isNaN(this.pixelsWideSummary)) {
            var leftVect = this.plotbgGeom.vertices[15].clone().project(this.plotter.camera);
            var rightVect = this.plotbgGeom.vertices[13].clone().project(this.plotter.camera);
            this.pixelsWideSummary = rightVect.sub(leftVect).length() * this.plotter.width / 2;
        }
    };
    
Plot.prototype.startDragPlot = function () {
        this.scrolling = true;
        this.drawGraph3();
        var self = this;
        this.fullUpdate(function () {
                self.drawGraph3();
            }, false);
    };
    
Plot.prototype.stopDragPlot = function () {
        this.scrolling = false;
        this.drawGraph3();
        this.updateWVCursorsFromXAxis(true);
        var self = this;
        this.fullUpdate(function () {
                self.drawGraph3();
            }, false);
    };
    
Plot.prototype.dragPlot = function (deltaX, deltaY) {
        // Update the axis
        this.recomputePixelsWideIfNecessary()
        var trueDelta = (deltaX * this.plotspVirtualWidth / this.pixelsWide);
        
        var xStart = trueDelta + this.xAxis.rangeLo;
        var deltaTime = subTimes(this.xAxis.unmap(xStart), this.xAxis.domainLo);
        subTimes(this.xAxis.domainLo, deltaTime);
        subTimes(this.xAxis.domainHi, deltaTime);
        
        // Update the screen
        this.quickUpdate();
        this.updateWVCursorsFromXAxis(false);
    };
    
Plot.prototype.scrollPlot = function (amount) {
        amount = Math.max(Math.min(amount, 100), -100);
        var currRange = subTimes(this.xAxis.domainHi.slice(0, 2), this.xAxis.domainLo);
        mulTime(currRange, amount / 1000);
        addTimes(this.xAxis.domainLo, currRange);
        subTimes(this.xAxis.domainHi, currRange);
        // Update the screen
        this.quickUpdate();
        this.updateWVCursorsFromXAxis(true);
        var self = this;
        this.fullUpdate(function () {
                self.drawGraph3();
            }, false);
        
    };
    
Plot.prototype.startResizePlot = function () {
        this.resizingPlot = true;
    };
    
Plot.prototype.stopResizePlot = function () {
        this.resizingPlot = false;
        this.wvcursor1.fullUpdateForLength();
        this.wvcursor2.fullUpdateForLength();
    };
    
Plot.prototype.resizePlot = function (deltaX, deltaY) {
        // technically, we should divide the virtual height and true height; I'm assuming that the image isn't stretched somehow
        var virtualDeltaY = deltaY * this.plotspVirtualWidth / this.pixelsWide;
        this.setHeight(this.h + virtualDeltaY);
        this.summaryYAxis.rangeLo -= virtualDeltaY;
        this.summaryYAxis.rangeHi -= virtualDeltaY;
        this.updateDefaultAxisRange();
        this.drawGraph3();
        this.drawSummary3();
    };
    
Plot.prototype.startDragWVPlot = function (point) {
        if ((point.x > this.wvcursor1.coord && point.x < this.wvcursor2.coord) || (point.x < this.wvcursor1.coord && point.x > this.wvcursor2.coord)) {
            this.draggingV = true;
            this.wvcursor1.startDrag(point);
            this.wvcursor2.startDrag(point);
        } else {
            this.scrollingWV = true;
            this.drawSummary3();
            var self = this;
            this.fullUpdate(function () {
                    self.drawSummary3();
                }, true);
        }
    };
    
Plot.prototype.stopDragWVPlot = function () {
        if (this.scrollingWV) {
            this.scrollingWV = false;
            this.drawSummary3();
            this.updateXAxisFromWVCursors(true);
            var self = this;
            this.fullUpdate(function () {
                    self.drawSummary3();
                }, true);
        } else if (this.draggingV) {
            this.draggingV = false;
            this.wvcursor1.stopDrag();
            this.wvcursor2.stopDrag();
        }
    };
    
Plot.prototype.dragWVPlot = function (deltaX, deltaY) {
        if (this.scrollingWV) {
            this.recomputePixelsWideSummaryIfNecessary()
            var trueDelta = (deltaX * this.wvplotspVirtualWidth / this.pixelsWideSummary);
            
            var xStart = trueDelta + this.summaryXAxis.rangeLo;
            var deltaTime = subTimes(this.summaryXAxis.unmap(xStart), this.summaryXAxis.domainLo);
            subTimes(this.summaryXAxis.domainLo, deltaTime);
            subTimes(this.summaryXAxis.domainHi, deltaTime);
            
            // Update the screen
            this.quickUpdateSummary();
        } else if (this.draggingV) {
            this.wvcursor1.drag(deltaX, deltaY, true);
            this.wvcursor2.drag(deltaX, deltaY, true);
        }
        this.updateXAxisFromWVCursors(false);
    };
