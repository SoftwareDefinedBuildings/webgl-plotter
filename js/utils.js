/* Performs binary search on SORTEDLST to find the index of item whose key is
   ITEM. KEY is a function that takes an element of the list as an argument and
   returns its key. If ITEM is not the key of any of the items in SORTEDLST,
   one of the indices closest to the index where it would be is returned. */
function binSearch(sortedLst, item, key) {
    var currVal;
    var low = 0;
    var high = sortedLst.length - 1;
    var i;
    while (low < high) {
        i = Math.floor((low + high) / 2);
        currVal = key(sortedLst[i]);
        if (currVal < item) {
            low = i + 1;
        } else if (currVal > item) {
            high = i - 1;
        } else {
            return i;
        }
    }
    return low;
}

/* Performs binary search of SORTEDLST to find the index of the item that,
   according to the comparator, is equal to ITEM. COMPARATOR is a function
   that, given two elements in the array, returns a negative number of the
   first is less than the second, a positive number if it is greater, and
   zero if the two are equal. If ITEM is not equal to any of the items in
   SORTEDLST, one of the indices closes to the index where it would be is
   returned. */
function binSearchCmp(sortedLst, item, comparator) {
    var comparison;
    var low = 0;
    var high = sortedLst.length - 1;
    var i;
    while (low < high) {
        i = Math.floor((low + high) / 2);
        comparison = comparator(sortedLst[i], item);
        if (comparison < 0) {
            low = i + 1;
        } else if (comparison > 0) {
            high = i - 1;
        } else {
            return i;
        }
    }
    return low;
}

function cmpTimes(t1, t2) {
    if (t1[0] < t2[0]) {
        return -1;
    } else if (t1[0] > t2[0]) {
        return 1;
    } else if (t1[1] < t2[1]) {
        return -1;
    } else if (t1[1] > t2[1]) {
        return 1;
    } else {
        return 0;
    }
}

function addTimes(time, toAdd) {
    time[0] += toAdd[0]
    time[1] += toAdd[1];
    if (time[1] >= 1000000) {
        time[0] += 1;
        time[1] -= 1000000;
    }
    return time;
}

function subTimes(time, toSub) {
    time[0] -= toSub[0];
    time[1] -= toSub[1];
    if (time[1] < 0) {
        time[0] -= 1;
        time[1] += 1000000;
    }
    return time;
}

function mulTime(time, c) {
    time[0] *= c;
    time[1] *= c;
    var intMillis = Math.floor(time[0]);
    var fracMillis = time[0] - intMillis;
    time[0] = intMillis;
    time[1] += 1000000 * fracMillis;
    intMillis = Math.floor(time[1] / 1000000);
    time[0] += intMillis;
    time[1] -= 1000000 * intMillis;
    return time;
}

function timeToStr(time) {
    if (time[0] > 0) {
        return time[0] + (1000000 + time[1]).toString().slice(1);
    } else if (time[0] < 0) {
        return (time[0] + 1) + (2000000 - time[1]).toString().slice(1);
    } else {
        return time[1].toString();
    }
}

function boundToRange(time, low, high) {
    if (cmpTimes(time, low) < 0) {
        return low;
    }
    if (cmpTimes(time, high) > 0) {
        return high;
    }
    return time;
}

function roundTime(time) {
    time[1] = Math.round(time[1]);
    if (time[1] == 1000000) {
        time[0]++;
        time[1] = 0;
    }
    return time;
}

/* Modifying the output of this function could seriously mess things up. */
function expToPW(pwe) {
    // I guess I could use repeated squaring to do this efficiently
    // But looking it up in an array is certainly faster
    return pws[pwe + 1];
}

/* NANOS is the number of nanoseconds in an interval, expressed as an array
   of two numbers. Returns the number x such that 2 ^ x <= nanos
   but 2 ^ (x + 1) > nanos. */
function getPWExponent(nanos) {
    var index = binSearchCmp(pws, nanos, cmpTimes);
    if (cmpTimes(pws[index], nanos) > 0) {
        index -= 2;
    } else if (index > 1) {
        index -= 1;
    }
    
    if (index <= 0) {
        return 0;
    }
    return index;
}

var pws = [[0, 0.5], [0, 1], [0, 2], [0, 4], [0, 8], [0, 16], [0, 32], [0, 64], [0, 128], [0, 256], [0, 512], [0, 1024], [0, 2048], [0, 4096], [0, 8192], [0, 16384], [0, 32768], [0, 65536], [0, 131072], [0, 262144], [0, 524288], [1, 48576], [2, 97152], [4, 194304], [8, 388608], [16, 777216], [33, 554432], [67, 108864], [134, 217728], [268, 435456], [536, 870912], [1073, 741824], [2147, 483648], [4294, 967296], [8589, 934592], [17179, 869184], [34359, 738368], [68719, 476736], [137438, 953472], [274877, 906944], [549755, 813888], [1099511, 627776], [2199023, 255552], [4398046, 511104], [8796093, 22208], [17592186, 44416], [35184372, 88832], [70368744, 177664], [140737488, 355328], [281474976, 710656], [562949953, 421312], [1125899906, 842624], [2251799813, 685248], [4503599627, 370496], [9007199254, 740992], [18014398509, 481984], [36028797018, 963968], [72057594037, 927936], [144115188075, 855872], [288230376151, 711744], [576460752303, 423488], [1152921504606, 846976], [2305843009213, 693952], [4611686018427, 387904]];

function packShaderUniforms(shader, affineMatrix, color, thickness, xAxis, yAxis, pixelShift, alpha, rotator90) {
    shader.uniforms.affineMatrix.value = affineMatrix;
    shader.uniforms.color.value = color;
    shader.uniforms.thickness.value = thickness;
    shader.uniforms.yDomainLo.value = yAxis.domainLo;
    shader.uniforms.xDomainLo1000.value = Math.floor(xAxis.domainLo[0] / 1000000);
    shader.uniforms.xDomainLoMillis.value = xAxis.domainLo[0] % 1000000;
    shader.uniforms.xDomainLoNanos.value = xAxis.domainLo[1];
    if (pixelShift != undefined) {
        shader.uniforms.horizPixelShift.value = pixelShift;
    }
    if (rotator90 != undefined) {
        shader.uniforms.rot90Matrix.value = rotator90;
    }
    if (alpha != undefined) {
        shader.uniforms.alpha.value = alpha;
    }
}

/* Gets a the child of PARENT with index INDEX, creating a new mesh with frustumCulled set to false if necessary.
   Then sets it GEOMETRY and MATERIAL. */
function setMeshChild(parent, index, geometry, material) {
    var obj, existing;
    if (index < parent.children.length) {
        existing = parent.children[index];
        if (existing.geometry == geometry && existing.material == material) {
            return;
        }
        // I got some of the code from the Object3D remove method. I don't
        // want to call "remove" because that would be slow.
        obj = new THREE.Mesh(geometry, material);
        obj.frustumCulled = false;
        
        obj.parent = parent;
        obj.dispatchEvent({type: "added"});
        
        parent.children[index] = obj;
        
        existing.parent = undefined;
        existing.dispatchEvent({type: "removed"});
    } else {
        obj = new THREE.Mesh(geometry, material);
        obj.frustumCulled = false;
        parent.add(obj);
    }
}
