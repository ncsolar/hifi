//
//  hydraGrab.js
//  examples
//
//  Created by Clément Brisset on 4/24/14.
//  Copyright 2014 High Fidelity, Inc.
//
//  This script allows you to edit models either with the razor hydras or with your mouse
//
//  Using the hydras :
//  grab models with the triggers, you can then move the models around or scale them with both hands.
//  You can switch mode using the bumpers so that you can move models around more easily.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
Script.include("libraries/entityPropertyDialogBox.js");
var entityPropertyDialogBox = EntityPropertyDialogBox;

var LASER_WIDTH = 4;
var LASER_COLOR = { red: 255, green: 0, blue: 0 };
var LASER_LENGTH_FACTOR = 500;

var MIN_ANGULAR_SIZE = 2;
var MAX_ANGULAR_SIZE = 45;
var allowLargeModels = false;
var allowSmallModels = false;
var wantEntityGlow = false;

var LEFT = 0;
var RIGHT = 1;

var jointList = MyAvatar.getJointNames();

var mode = 0;

function controller(wichSide) {
    this.side = wichSide;
    this.palm = 2 * wichSide;
    this.tip = 2 * wichSide + 1;
    this.trigger = wichSide;
    this.bumper = 6 * wichSide + 5;

    this.oldPalmPosition = Controller.getSpatialControlPosition(this.palm);
    this.palmPosition = Controller.getSpatialControlPosition(this.palm);

    this.oldTipPosition = Controller.getSpatialControlPosition(this.tip);
    this.tipPosition = Controller.getSpatialControlPosition(this.tip);

    this.oldUp = Controller.getSpatialControlNormal(this.palm);
    this.up = this.oldUp;

    this.oldFront = Vec3.normalize(Vec3.subtract(this.tipPosition, this.palmPosition));
    this.front = this.oldFront;

    this.oldRight = Vec3.cross(this.front, this.up);
    this.right = this.oldRight;

    this.oldRotation = Quat.multiply(MyAvatar.orientation, Controller.getSpatialControlRawRotation(this.palm));
    this.rotation = this.oldRotation;

    this.triggerValue = Controller.getTriggerValue(this.trigger);
    this.bumperValue = Controller.isButtonPressed(this.bumper);

    this.pressed = false; // is trigger pressed
    this.pressing = false; // is trigger being pressed (is pressed now but wasn't previously)

    this.grabbing = false;
    this.entityID = { isKnownID: false };
    this.modelURL = "";
    this.oldModelRotation;
    this.oldModelPosition;
    this.oldModelHalfDiagonal;

    this.positionAtGrab;
    this.rotationAtGrab;
    this.modelPositionAtGrab;
    this.rotationAtGrab;
    this.jointsIntersectingFromStart = [];

    this.laser = Overlays.addOverlay("line3d", {
        start: { x: 0, y: 0, z: 0 },
        end: { x: 0, y: 0, z: 0 },
        color: LASER_COLOR,
        alpha: 1,
        visible: false,
        lineWidth: LASER_WIDTH,
        anchor: "MyAvatar"
    });

    this.guideScale = 0.02;
    this.ball = Overlays.addOverlay("sphere", {
        position: { x: 0, y: 0, z: 0 },
        size: this.guideScale,
        solid: true,
        color: { red: 0, green: 255, blue: 0 },
        alpha: 1,
        visible: false,
        anchor: "MyAvatar"
    });
    this.leftRight = Overlays.addOverlay("line3d", {
        start: { x: 0, y: 0, z: 0 },
        end: { x: 0, y: 0, z: 0 },
        color: { red: 0, green: 0, blue: 255 },
        alpha: 1,
        visible: false,
        lineWidth: LASER_WIDTH,
        anchor: "MyAvatar"
    });
    this.topDown = Overlays.addOverlay("line3d", {
                                       start: { x: 0, y: 0, z: 0 },
                                       end: { x: 0, y: 0, z: 0 },
                                       color: { red: 0, green: 0, blue: 255 },
                                       alpha: 1,
                                       visible: false,
                                       lineWidth: LASER_WIDTH,
                                       anchor: "MyAvatar"
                                       });
    

    
    this.grab = function (entityID, properties) {
        print("Grabbing " + entityID.id);
        this.grabbing = true;
        this.entityID = entityID;
        this.modelURL = properties.modelURL;

        this.oldModelPosition = properties.position;
        this.oldModelRotation = properties.rotation;
        this.oldModelHalfDiagonal = Vec3.length(properties.dimensions) / 2.0;

        this.positionAtGrab = this.palmPosition;
        this.rotationAtGrab = this.rotation;
        this.modelPositionAtGrab = properties.position;
        this.rotationAtGrab = properties.rotation;
        this.jointsIntersectingFromStart = [];
        for (var i = 0; i < jointList.length; i++) {
            var distance = Vec3.distance(MyAvatar.getJointPosition(jointList[i]), this.oldModelPosition);
            if (distance < this.oldModelHalfDiagonal) {
                this.jointsIntersectingFromStart.push(i);
            }
        }
        this.showLaser(false);
    }

    this.release = function () {
        if (this.grabbing) {
            jointList = MyAvatar.getJointNames();

            var closestJointIndex = -1;
            var closestJointDistance = 10;
            for (var i = 0; i < jointList.length; i++) {
                var distance = Vec3.distance(MyAvatar.getJointPosition(jointList[i]), this.oldModelPosition);
                if (distance < closestJointDistance) {
                    closestJointDistance = distance;
                    closestJointIndex = i;
                }
            }

            if (closestJointIndex != -1) {
                print("closestJoint: " + jointList[closestJointIndex]);
                print("closestJointDistance (attach max distance): " + closestJointDistance + " (" + this.oldModelHalfDiagonal + ")");
            }

            if (closestJointDistance < this.oldModelHalfDiagonal) {

                if (this.jointsIntersectingFromStart.indexOf(closestJointIndex) != -1 ||
                    (leftController.grabbing && rightController.grabbing &&
                    leftController.entityID.id == rightController.entityID.id)) {
                    // Do nothing
                } else {
                    print("Attaching to " + jointList[closestJointIndex]);
                    var jointPosition = MyAvatar.getJointPosition(jointList[closestJointIndex]);
                    var jointRotation = MyAvatar.getJointCombinedRotation(jointList[closestJointIndex]);

                    var attachmentOffset = Vec3.subtract(this.oldModelPosition, jointPosition);
                    attachmentOffset = Vec3.multiplyQbyV(Quat.inverse(jointRotation), attachmentOffset);
                    var attachmentRotation = Quat.multiply(Quat.inverse(jointRotation), this.oldModelRotation);

                    MyAvatar.attach(this.modelURL, jointList[closestJointIndex],
                                    attachmentOffset, attachmentRotation, 2.0 * this.oldModelHalfDiagonal,
                                    true, false);
                    Entities.deleteEntity(this.entityID);
                }
            }
        }

        this.grabbing = false;
        this.entityID.isKnownID = false;
        this.jointsIntersectingFromStart = [];
        this.showLaser(true);
    }

    this.checkTrigger = function () {
        if (this.triggerValue > 0.9) {
            if (this.pressed) {
                this.pressing = false;
            } else {
                this.pressing = true;
            }
            this.pressed = true;
        } else {
            this.pressing = false;
            this.pressed = false;
        }
    }

    this.checkEntity = function (properties) {
        //                P         P - Model
        //               /|         A - Palm
        //              / | d       B - unit vector toward tip
        //             /  |         X - base of the perpendicular line
        //            A---X----->B  d - distance fom axis
        //              x           x - distance from A
        //
        //            |X-A| = (P-A).B
        //            X == A + ((P-A).B)B
        //            d = |P-X|

        var A = this.palmPosition;
        var B = this.front;
        var P = properties.position;

        var x = Vec3.dot(Vec3.subtract(P, A), B);
        var y = Vec3.dot(Vec3.subtract(P, A), this.up);
        var z = Vec3.dot(Vec3.subtract(P, A), this.right);
        var X = Vec3.sum(A, Vec3.multiply(B, x));
        var d = Vec3.length(Vec3.subtract(P, X));
        var halfDiagonal = Vec3.length(properties.dimensions) / 2.0;

        var angularSize = 2 * Math.atan(halfDiagonal / Vec3.distance(Camera.getPosition(), properties.position)) * 180 / 3.14;
        
        var sizeOK = (allowLargeModels || angularSize < MAX_ANGULAR_SIZE) 
                        && (allowSmallModels || angularSize > MIN_ANGULAR_SIZE);

        if (0 < x && sizeOK) {
            return { valid: true, x: x, y: y, z: z };
        }
        return { valid: false };
    }

    this.glowedIntersectingModel = { isKnownID: false };
    this.moveLaser = function () {
        // the overlays here are anchored to the avatar, which means they are specified in the avatar's local frame

        var inverseRotation = Quat.inverse(MyAvatar.orientation);
        var startPosition = Vec3.multiplyQbyV(inverseRotation, Vec3.subtract(this.palmPosition, MyAvatar.position));
        var direction = Vec3.multiplyQbyV(inverseRotation, Vec3.subtract(this.tipPosition, this.palmPosition));
        var distance = Vec3.length(direction);
        direction = Vec3.multiply(direction, LASER_LENGTH_FACTOR / distance);
        var endPosition = Vec3.sum(startPosition, direction);

        Overlays.editOverlay(this.laser, {
            start: startPosition,
            end: endPosition
        });


        Overlays.editOverlay(this.ball, {
            position: endPosition
        });
        Overlays.editOverlay(this.leftRight, {
            start: Vec3.sum(endPosition, Vec3.multiply(this.right, 2 * this.guideScale)),
            end: Vec3.sum(endPosition, Vec3.multiply(this.right, -2 * this.guideScale))
        });
        Overlays.editOverlay(this.topDown, {
            start: Vec3.sum(endPosition, Vec3.multiply(this.up, 2 * this.guideScale)),
            end: Vec3.sum(endPosition, Vec3.multiply(this.up, -2 * this.guideScale))
        });
        this.showLaser(!this.grabbing || mode == 0);

        if (this.glowedIntersectingModel.isKnownID) {
            Entities.editEntity(this.glowedIntersectingModel, { glowLevel: 0.0 });
            this.glowedIntersectingModel.isKnownID = false;
        }
        if (!this.grabbing) {
            var intersection = Entities.findRayIntersection({
                                                          origin: this.palmPosition,
                                                          direction: this.front
                                                          });
                                                          
            var halfDiagonal = Vec3.length(intersection.properties.dimensions) / 2.0;
                                                          
            var angularSize = 2 * Math.atan(halfDiagonal / Vec3.distance(Camera.getPosition(), intersection.properties.position)) * 180 / 3.14;
            var sizeOK = (allowLargeModels || angularSize < MAX_ANGULAR_SIZE) 
                            && (allowSmallModels || angularSize > MIN_ANGULAR_SIZE);
            if (intersection.accurate && intersection.entityID.isKnownID && sizeOK) {
                this.glowedIntersectingModel = intersection.entityID;
                
                if (wantEntityGlow) {
                    Entities.editEntity(this.glowedIntersectingModel, { glowLevel: 0.25 });
                }
            }
        }
    }

    this.showLaser = function (show) {
        Overlays.editOverlay(this.laser, { visible: show });
        Overlays.editOverlay(this.ball, { visible: show });
        Overlays.editOverlay(this.leftRight, { visible: show });
        Overlays.editOverlay(this.topDown, { visible: show });
    }
    this.moveEntity = function () {
        if (this.grabbing) {
            if (!this.entityID.isKnownID) {
                print("Unknown grabbed ID " + this.entityID.id + ", isKnown: " + this.entityID.isKnownID);
                this.entityID =  Entities.findRayIntersection({
                                                        origin: this.palmPosition,
                                                        direction: this.front
                                                           }).entityID;
                print("Identified ID " + this.entityID.id + ", isKnown: " + this.entityID.isKnownID);
            }
            var newPosition;
            var newRotation;

            switch (mode) {
                case 0:
                    newPosition = Vec3.sum(this.palmPosition,
                                           Vec3.multiply(this.front, this.x));
                    newPosition = Vec3.sum(newPosition,
                                           Vec3.multiply(this.up, this.y));
                    newPosition = Vec3.sum(newPosition,
                                           Vec3.multiply(this.right, this.z));


                    newRotation = Quat.multiply(this.rotation,
                                                Quat.inverse(this.oldRotation));
                    newRotation = Quat.multiply(newRotation,
                                                this.oldModelRotation);
                    break;
                case 1:
                    var forward = Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0, z: -1 });
                    var d = Vec3.dot(forward, MyAvatar.position);

                    var factor1 = Vec3.dot(forward, this.positionAtGrab) - d;
                    var factor2 = Vec3.dot(forward, this.modelPositionAtGrab) - d;
                    var vector = Vec3.subtract(this.palmPosition, this.positionAtGrab);

                    if (factor2 < 0) {
                        factor2 = 0;
                    }
                    if (factor1 <= 0) {
                        factor1 = 1;
                        factor2 = 1;
                    }

                    newPosition = Vec3.sum(this.modelPositionAtGrab,
                                           Vec3.multiply(vector,
                                                         factor2 / factor1));

                    newRotation = Quat.multiply(this.rotation,
                                                Quat.inverse(this.rotationAtGrab));
                    newRotation = Quat.multiply(newRotation,
                                                this.rotationAtGrab);
                    break;
            }
            Entities.editEntity(this.entityID, {
                             position: newPosition,
                             rotation: newRotation
                             });
            this.oldModelRotation = newRotation;
            this.oldModelPosition = newPosition;

            var indicesToRemove = [];
            for (var i = 0; i < this.jointsIntersectingFromStart.length; ++i) {
                var distance = Vec3.distance(MyAvatar.getJointPosition(this.jointsIntersectingFromStart[i]), this.oldModelPosition);
                if (distance >= this.oldModelHalfDiagonal) {
                    indicesToRemove.push(this.jointsIntersectingFromStart[i]);
                }

            }
            for (var i = 0; i < indicesToRemove.length; ++i) {
                this.jointsIntersectingFromStart.splice(this.jointsIntersectingFromStart.indexOf(indicesToRemove[i], 1));
            }
        }
    }

    this.update = function () {
        this.oldPalmPosition = this.palmPosition;
        this.oldTipPosition = this.tipPosition;
        this.palmPosition = Controller.getSpatialControlPosition(this.palm);
        this.tipPosition = Controller.getSpatialControlPosition(this.tip);

        this.oldUp = this.up;
        this.up = Vec3.normalize(Controller.getSpatialControlNormal(this.palm));

        this.oldFront = this.front;
        this.front = Vec3.normalize(Vec3.subtract(this.tipPosition, this.palmPosition));

        this.oldRight = this.right;
        this.right = Vec3.normalize(Vec3.cross(this.front, this.up));

        this.oldRotation = this.rotation;
        this.rotation = Quat.multiply(MyAvatar.orientation, Controller.getSpatialControlRawRotation(this.palm));

        this.triggerValue = Controller.getTriggerValue(this.trigger);

        var bumperValue = Controller.isButtonPressed(this.bumper);
        if (bumperValue && !this.bumperValue) {
            if (mode == 0) {
                mode = 1;
                Overlays.editOverlay(leftController.laser, { color: { red: 0, green: 0, blue: 255 } });
                Overlays.editOverlay(rightController.laser, { color: { red: 0, green: 0, blue: 255 } });
            } else {
                mode = 0;
                Overlays.editOverlay(leftController.laser, { color: { red: 255, green: 0, blue: 0 } });
                Overlays.editOverlay(rightController.laser, { color: { red: 255, green: 0, blue: 0 } });
            }
        }
        this.bumperValue = bumperValue;


        this.checkTrigger();

        this.moveLaser();

        if (!this.pressed && this.grabbing) {
            // release if trigger not pressed anymore.
            this.release();
        }

        if (this.pressing) {
            // Checking for attachments intersecting
            var attachments = MyAvatar.getAttachmentData();
            var attachmentIndex = -1;
            var attachmentX = LASER_LENGTH_FACTOR;

            var newModel;
            var newProperties;

            for (var i = 0; i < attachments.length; ++i) {
                var position = Vec3.sum(MyAvatar.getJointPosition(attachments[i].jointName),
                                        Vec3.multiplyQbyV(MyAvatar.getJointCombinedRotation(attachments[i].jointName), attachments[i].translation));
                var scale = attachments[i].scale;

                var A = this.palmPosition;
                var B = this.front;
                var P = position;

                var x = Vec3.dot(Vec3.subtract(P, A), B);
                var X = Vec3.sum(A, Vec3.multiply(B, x));
                var d = Vec3.length(Vec3.subtract(P, X));

                if (d < scale / 2.0 && 0 < x && x < attachmentX) {
                    attachmentIndex = i;
                    attachmentX = d;
                }
            }

            if (attachmentIndex != -1) {
                print("Detaching: " + attachments[attachmentIndex].modelURL);
                MyAvatar.detachOne(attachments[attachmentIndex].modelURL, attachments[attachmentIndex].jointName);

                newProperties = {
                    type: "Model",
                    position: Vec3.sum(MyAvatar.getJointPosition(attachments[attachmentIndex].jointName),
                                       Vec3.multiplyQbyV(MyAvatar.getJointCombinedRotation(attachments[attachmentIndex].jointName), attachments[attachmentIndex].translation)),
                    rotation: Quat.multiply(MyAvatar.getJointCombinedRotation(attachments[attachmentIndex].jointName),
                                                 attachments[attachmentIndex].rotation),
                                                 
                    // TODO: how do we know the correct dimensions for detachment???
                    dimensions: { x: attachments[attachmentIndex].scale / 2.0,
                                  y: attachments[attachmentIndex].scale / 2.0,
                                  z: attachments[attachmentIndex].scale / 2.0 },
                                  
                    modelURL: attachments[attachmentIndex].modelURL
                };

                newModel = Entities.addEntity(newProperties);


            } else {
                // There is none so ...
                // Checking model tree
                Vec3.print("Looking at: ", this.palmPosition);
                var pickRay = { origin: this.palmPosition,
                    direction: Vec3.normalize(Vec3.subtract(this.tipPosition, this.palmPosition)) };
                var foundIntersection = Entities.findRayIntersection(pickRay);
                
                if(!foundIntersection.accurate) {
                    print("No accurate intersection");
                    return;
                }
                newModel = foundIntersection.entityID;
                if (!newModel.isKnownID) {
                    var identify = Entities.identifyEntity(newModel);
                    if (!identify.isKnownID) {
                        print("Unknown ID " + identify.id + " (update loop " + newModel.id + ")");
                        return;
                    }
                    newModel = identify;
                }
                newProperties = Entities.getEntityProperties(newModel);
            }
            print("foundEntity.modelURL=" + newProperties.modelURL);
            var check = this.checkEntity(newProperties);
            if (!check.valid) {
                return;
            }

            this.grab(newModel, newProperties);

            this.x = check.x;
            this.y = check.y;
            this.z = check.z;
            return;
        }
    }

    this.cleanup = function () {
        Overlays.deleteOverlay(this.laser);
        Overlays.deleteOverlay(this.ball);
        Overlays.deleteOverlay(this.leftRight);
        Overlays.deleteOverlay(this.topDown);
    }
}

var leftController = new controller(LEFT);
var rightController = new controller(RIGHT);

function moveEntities() {
    if (leftController.grabbing && rightController.grabbing && rightController.entityID.id == leftController.entityID.id) {
        var newPosition = leftController.oldModelPosition;
        var rotation = leftController.oldModelRotation;
        var ratio = 1;


        switch (mode) {
            case 0:
                var oldLeftPoint = Vec3.sum(leftController.oldPalmPosition, Vec3.multiply(leftController.oldFront, leftController.x));
                var oldRightPoint = Vec3.sum(rightController.oldPalmPosition, Vec3.multiply(rightController.oldFront, rightController.x));

                var oldMiddle = Vec3.multiply(Vec3.sum(oldLeftPoint, oldRightPoint), 0.5);
                var oldLength = Vec3.length(Vec3.subtract(oldLeftPoint, oldRightPoint));


                var leftPoint = Vec3.sum(leftController.palmPosition, Vec3.multiply(leftController.front, leftController.x));
                var rightPoint = Vec3.sum(rightController.palmPosition, Vec3.multiply(rightController.front, rightController.x));

                var middle = Vec3.multiply(Vec3.sum(leftPoint, rightPoint), 0.5);
                var length = Vec3.length(Vec3.subtract(leftPoint, rightPoint));


                ratio = length / oldLength;
                newPosition = Vec3.sum(middle,
                                       Vec3.multiply(Vec3.subtract(leftController.oldModelPosition, oldMiddle), ratio));
                break;
            case 1:
                var u = Vec3.normalize(Vec3.subtract(rightController.oldPalmPosition, leftController.oldPalmPosition));
                var v = Vec3.normalize(Vec3.subtract(rightController.palmPosition, leftController.palmPosition));

                var cos_theta = Vec3.dot(u, v);
                if (cos_theta > 1) {
                    cos_theta = 1;
                }
                var angle = Math.acos(cos_theta) / Math.PI * 180;
                if (angle < 0.1) {
                    return;

                }
                var w = Vec3.normalize(Vec3.cross(u, v));

                rotation = Quat.multiply(Quat.angleAxis(angle, w), leftController.oldModelRotation);


                leftController.positionAtGrab = leftController.palmPosition;
                leftController.rotationAtGrab = leftController.rotation;
                leftController.modelPositionAtGrab = leftController.oldModelPosition;
                leftController.rotationAtGrab = rotation;
                rightController.positionAtGrab = rightController.palmPosition;
                rightController.rotationAtGrab = rightController.rotation;
                rightController.modelPositionAtGrab = rightController.oldModelPosition;
                rightController.rotationAtGrab = rotation;
                break;
        }
        Entities.editEntity(leftController.entityID, {
                         position: newPosition,
                         rotation: rotation,
                         // TODO: how do we know the correct dimensions for detachment???
                         //radius: leftController.oldModelHalfDiagonal * ratio
                         dimensions: { x: leftController.oldModelHalfDiagonal * ratio,
                                       y: leftController.oldModelHalfDiagonal * ratio,
                                       z: leftController.oldModelHalfDiagonal * ratio }


                         });
        leftController.oldModelPosition = newPosition;
        leftController.oldModelRotation = rotation;
        leftController.oldModelHalfDiagonal *= ratio;

        rightController.oldModelPosition = newPosition;
        rightController.oldModelRotation = rotation;
        rightController.oldModelHalfDiagonal *= ratio;
        return;
    }
    leftController.moveEntity();
    rightController.moveEntity();
}

var hydraConnected = false;
function checkController(deltaTime) {
    var numberOfButtons = Controller.getNumberOfButtons();
    var numberOfTriggers = Controller.getNumberOfTriggers();
    var numberOfSpatialControls = Controller.getNumberOfSpatialControls();
    var controllersPerTrigger = numberOfSpatialControls / numberOfTriggers;

    // this is expected for hydras
    if (numberOfButtons == 12 && numberOfTriggers == 2 && controllersPerTrigger == 2) {
        if (!hydraConnected) {
            hydraConnected = true;
        }

        leftController.update();
        rightController.update();
        moveEntities();
    } else {
        if (hydraConnected) {
            hydraConnected = false;

            leftController.showLaser(false);
            rightController.showLaser(false);
        }
    }
}

var glowedEntityID = { id: -1, isKnownID: false };

// In order for editVoxels and editModels to play nice together, they each check to see if a "delete" menu item already
// exists. If it doesn't they add it. If it does they don't. They also only delete the menu item if they were the one that
// added it.
var modelMenuAddedDelete = false;
var originalLightsArePickable = Entities.getLightsArePickable();
function setupModelMenus() {
    print("setupModelMenus()");
    // adj our menuitems
    Menu.addMenuItem({ menuName: "Edit", menuItemName: "Models", isSeparator: true, beforeItem: "Physics" });
    Menu.addMenuItem({ menuName: "Edit", menuItemName: "Edit Properties...",
        shortcutKeyEvent: { text: "`" }, afterItem: "Models" });
    if (!Menu.menuItemExists("Edit", "Delete")) {
        print("no delete... adding ours");
        Menu.addMenuItem({ menuName: "Edit", menuItemName: "Delete",
            shortcutKeyEvent: { text: "backspace" }, afterItem: "Models" });
        modelMenuAddedDelete = true;
    } else {
        print("delete exists... don't add ours");
    }

    Menu.addMenuItem({ menuName: "Edit", menuItemName: "Allow Selecting of Large Models", shortcutKey: "CTRL+META+L", 
                        afterItem: "Paste Models", isCheckable: true });
    Menu.addMenuItem({ menuName: "Edit", menuItemName: "Allow Selecting of Small Models", shortcutKey: "CTRL+META+S", 
                        afterItem: "Allow Selecting of Large Models", isCheckable: true });
    Menu.addMenuItem({ menuName: "Edit", menuItemName: "Allow Selecting of Lights", shortcutKey: "CTRL+SHIFT+META+L", 
                        afterItem: "Allow Selecting of Small Models", isCheckable: true });

    Entities.setLightsArePickable(false);
}

function cleanupModelMenus() {
    Menu.removeMenuItem("Edit", "Edit Properties...");
    if (modelMenuAddedDelete) {
        // delete our menuitems
        Menu.removeMenuItem("Edit", "Delete");
    }

    Menu.removeMenuItem("Edit", "Allow Selecting of Large Models");
    Menu.removeMenuItem("Edit", "Allow Selecting of Small Models");
    Menu.removeMenuItem("Edit", "Allow Selecting of Lights");

}

function scriptEnding() {
    leftController.cleanup();
    rightController.cleanup();
    cleanupModelMenus();
    Entities.setLightsArePickable(originalLightsArePickable);
}
Script.scriptEnding.connect(scriptEnding);

// register the call back so it fires before each data send
Script.update.connect(checkController);

setupModelMenus();

var editModelID = -1;
function showPropertiesForm(editModelID) {
    entityPropertyDialogBox.openDialog(editModelID);
}

Menu.menuItemEvent.connect(function (menuItem) {
    print("menuItemEvent() in JS... menuItem=" + menuItem);
    if (menuItem == "Allow Selecting of Small Models") {
        allowSmallModels = Menu.isOptionChecked("Allow Selecting of Small Models");
    } else if (menuItem == "Allow Selecting of Large Models") {
        allowLargeModels = Menu.isOptionChecked("Allow Selecting of Large Models");
    } else if (menuItem == "Allow Selecting of Lights") {
        Entities.setLightsArePickable(Menu.isOptionChecked("Allow Selecting of Lights"));
    } else if (menuItem == "Delete") {
        if (leftController.grabbing) {
            print("  Delete Entity.... leftController.entityID="+ leftController.entityID);
            Entities.deleteEntity(leftController.entityID);
            leftController.grabbing = false;
            if (glowedEntityID.id == leftController.entityID.id) {
                glowedEntityID = { id: -1, isKnownID: false };
            }
        } else if (rightController.grabbing) {
            print("  Delete Entity.... rightController.entityID="+ rightController.entityID);
            Entities.deleteEntity(rightController.entityID);
            rightController.grabbing = false;
            if (glowedEntityID.id == rightController.entityID.id) {
                glowedEntityID = { id: -1, isKnownID: false };
            }
        } else {
            print("  Delete Entity.... not holding...");
        }
    } else if (menuItem == "Edit Properties...") {
        editModelID = -1;
        if (leftController.grabbing) {
            print("  Edit Properties.... leftController.entityID="+ leftController.entityID);
            editModelID = leftController.entityID;
        } else if (rightController.grabbing) {
            print("  Edit Properties.... rightController.entityID="+ rightController.entityID);
            editModelID = rightController.entityID;
        } else {
            print("  Edit Properties.... not holding...");
        }
        if (editModelID != -1) {
            print("  Edit Properties.... about to edit properties...");
            showPropertiesForm(editModelID);
        }
    }
});

Controller.keyReleaseEvent.connect(function (event) {
    // since sometimes our menu shortcut keys don't work, trap our menu items here also and fire the appropriate menu items
    if (event.text == "`") {
        handeMenuEvent("Edit Properties...");
    }
    if (event.text == "BACKSPACE") {
        handeMenuEvent("Delete");
    }
});

