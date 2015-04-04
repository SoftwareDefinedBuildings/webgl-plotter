/* A button that performs an action when clicked. */

function Button(width, height, z, color, plotter) { // implements Clickable
    this.z = z;
    this.width = width;
    this.height = height;
    this.geom = new THREE.Geometry();
    this.geom.vertices.push(new THREE.Vector3(0, 0, z),
        new THREE.Vector3(width, 0, z),
        new THREE.Vector3(width, height, z),
        new THREE.Vector3(0, height, z));
    this.geom.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 3, 0));
    this.material = new THREE.MeshBasicMaterial({"color": color});
    this.obj = new THREE.Mesh(this.geom, this.material);
    
    this.clickCB = function () {};
    this.pressCB = function () {};
    this.releaseCB = function () {};
    
    this.obj.click = this.click.bind(this); // an extra parameter I'm adding
    this.obj.press = this.press.bind(this);
    this.obj.release = this.release.bind(this);
    
    this.plotter = plotter;
    plotter.clickables.push(this.obj);
}

Button.prototype.TEXTTHICKNESS = 0.01;

/* This is a more idiomatic way of doing something that I'll need to do very often. */
Button.prototype.addToObject = function (parent) {
        parent.add(this.obj);
    };

Button.prototype.setPosition = function (x, y, z) {
        this.obj.position.set(x, y, z || this.z);
    };
    
Button.prototype.setColor = function (newColor) {
        this.material.color.setHex(newColor);
        this.material.needsUpdate = true;
    };
    
Button.prototype.setText = function (text, size, color) {
        if (this.textgeom !== undefined) {
            this.obj.remove(this.text);
            this.textgeom.dispose();
            this.textmaterial.dispose();
        }
        this.textgeom = new THREE.TextGeometry(text, {"height": this.TEXTTHICKNESS, "size": size});
        this.textmaterial = new THREE.MeshBasicMaterial({"color": color});
        this.text = new THREE.Mesh(this.textgeom, this.textmaterial);
        this.textgeom.computeBoundingBox();
        var bbox = this.textgeom.boundingBox;
        this.text.position.set((this.width - Math.abs(bbox.max.x - bbox.min.x)) / 2, (this.height - Math.abs(bbox.max.y - bbox.min.y)) / 2, this.z);
        this.obj.add(this.text);
    };

Button.prototype.setClickAction = function (action) {
        this.clickCB = action;
    };
    
Button.prototype.setPressAction = function (action) {
        this.pressCB = action;
    };
    
Button.prototype.setReleaseAction = function (action) {
        this.releaseCB = action;
    };

Button.prototype.click = function () {
        setTimeout(this.clickCB, 0);
    };

Button.prototype.press = function () {
        this.pressCB();
    };

Button.prototype.release = function () {
        this.releaseCB();
    };
    
Button.prototype.dispose = function () {
        this.geom.dispose();
        if (this.textgeom !== undefined) {
            this.textgeom.dispose();
            this.textmaterial.dispose();
        }
        for (var i = 0; i < this.plotter.clickables.length; i++) {
            if (this.plotter.clickables[i] === this.obj) {
                this.plotter.clickables.splice(i, 1);
                break;
            }
        }
    };
    
/** A checkbox. The click callback happens on both selection and deselection. */
function SelectableButton(width, height, z, color, plotter) {
    Button.call(this, width, height, z, color, plotter);
    this.selectCB = function () {};
    this.deselectCB = function () {};
    this.selected = false;
}
SelectableButton.prototype = Object.create(Button.prototype); // extends Button

SelectableButton.prototype.setSelectAction = function (action) {
        this.selectCB = action;
    };
    
SelectableButton.prototype.setDeselectAction = function (action) {
        this.deselectCB = action;
    };

SelectableButton.prototype.click = function () {
        this.selected = !this.selected;
        var self = this;
        if (this.selected) {
            setTimeout(function () {
                    self.clickCB();
                    self.selectCB();
                }, 0);
        } else {
            setTimeout(function () {
                    self.clickCB();
                    self.deselectCB();
                }, 0);
        }
    };
    
/** A radio button group. */
function SelectableButtonGroup(num, width, height, z, color, plotter) {
    var buttons = [];
    var button;
    for (var i = 0; i < num; i++) {
        button = new SelectableButton(width, height, z, color, plotter);
        button.click = (function (button) {
                return function () {
                        if (button.selected) { // you can't deselect a button
                            return;
                        }
                        SelectableButton.prototype.click.call(button);
                        if (button.selected) {
                            for (var j = 0; j < num; j++) {
                                if (buttons[j] != button && buttons[j].selected) {
                                    SelectableButton.prototype.click.call(buttons[j]);
                                    break;
                                }
                            }
                        } else {
                            for (var j = 0; j < num; j++) {
                                if (buttons[j] != button && !buttons[j].selected) {
                                    buttons[j].click();
                                    break;
                                }
                            }
                        }
                    };
            })(button);
        button.obj.click = button.click;
        buttons.push(button);
    }
    this.buttons = buttons;
}
SelectableButtonGroup.prototype.addToObject = function (obj) {
        for (var i = 0; i < this.buttons.length; i++) {
            this.buttons[i].addToObject(obj);
        }
    };

SelectableButtonGroup.prototype.getButton = function (i) {
        return this.buttons[i];
    };
    
/** A convenience method. action takes two arguments, namely the index and button which got pressed. */
SelectableButtonGroup.prototype.setPressAction = function (action) {
        this.setAction("setPressAction", action);
    };
    
SelectableButtonGroup.prototype.setReleaseAction = function (action) {
        this.setAction("setReleaseAction", action);
    };
    
SelectableButtonGroup.prototype.setClickAction = function (action) {
        this.setAction("setClickAction", action);
    };    
    
SelectableButtonGroup.prototype.setSelectAction = function (action) {
        this.setAction("setSelectAction", action);
    };
    
SelectableButtonGroup.prototype.setDeselectAction = function (action) {
        this.setAction("setDeselectAction", action);
    };
    
/** A private method that should not be invoked outside of this class. */
SelectableButtonGroup.prototype.setAction = function (setterName, action) {
        for (var i = 0; i < this.buttons.length; i++) {
                this.buttons[i][setterName]((function (index, button) {
                        return function () {
                                action(index, button);
                            };
                    })(i, this.buttons[i]));
        }
    };
    
SelectableButtonGroup.prototype.dispose = function () {
        for (var i = 0; i < this.buttons.length; i++) {
            this.buttons[i].dispose();
        }
    };
