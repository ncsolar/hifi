//
//  gun.js
//  examples
//
//  Created by Brad Hefta-Gaub on 12/31/13.
//  Modified by Philip on 3/3/14
//  Copyright 2013 High Fidelity, Inc.
//
//  This is an example script that turns the hydra controllers and mouse into a entity gun.
//  It reads the controller, watches for trigger pulls, and launches entities.
//  When entities collide with voxels they blow little holes out of the voxels. 
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

Script.include("libraries/globals.js");

function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

var lastX = 0;
var lastY = 0;
var yawFromMouse = 0;
var pitchFromMouse = 0;
var isMouseDown = false; 

var BULLET_VELOCITY = 20.0;
var MIN_THROWER_DELAY = 1000;
var MAX_THROWER_DELAY = 1000;
var LEFT_BUTTON_3 = 3;
var RELOAD_INTERVAL = 5;

var KICKBACK_ANGLE = 15;
var elbowKickAngle = 0.0;
var rotationBeforeKickback; 

var showScore = false;


// Load some sound to use for loading and firing 
var fireSound = SoundCache.getSound(HIFI_PUBLIC_BUCKET + "sounds/Guns/GUN-SHOT2.raw");
var loadSound = SoundCache.getSound(HIFI_PUBLIC_BUCKET + "sounds/Guns/Gun_Reload_Weapon22.raw");
var impactSound = SoundCache.getSound(HIFI_PUBLIC_BUCKET + "sounds/Guns/BulletImpact2.raw");
var targetHitSound = SoundCache.getSound(HIFI_PUBLIC_BUCKET + "sounds/Space%20Invaders/hit.raw");
var targetLaunchSound = SoundCache.getSound(HIFI_PUBLIC_BUCKET + "sounds/Space%20Invaders/shoot.raw");

var gunModel = "http://public.highfidelity.io/models/attachments/HaloGun.fst";

var audioOptions = {
  volume: 0.9
}

var shotsFired = 0;
var shotTime = new Date(); 

var activeControllers = 0; 

// initialize our controller triggers
var triggerPulled = new Array();
var numberOfTriggers = Controller.getNumberOfTriggers();
for (t = 0; t < numberOfTriggers; t++) {
    triggerPulled[t] = false;
}

var isLaunchButtonPressed = false; 
var score = 0; 

var bulletID = false;
var targetID = false;

//  Create a reticle image in center of screen 
var screenSize = Controller.getViewportDimensions();
var reticle = Overlays.addOverlay("image", {
                    x: screenSize.x / 2 - 16,
                    y: screenSize.y / 2 - 16,
                    width: 32,
                    height: 32,
                    imageURL: HIFI_PUBLIC_BUCKET + "images/reticle.png",
                    color: { red: 255, green: 255, blue: 255},
                    alpha: 1
                });

var offButton = Overlays.addOverlay("image", {
                    x: screenSize.x - 48,
                    y: 96,
                    width: 32,
                    height: 32,
                    imageURL: HIFI_PUBLIC_BUCKET + "images/close.png",
                    color: { red: 255, green: 255, blue: 255},
                    alpha: 1
                });

if (showScore) {
    var text = Overlays.addOverlay("text", {
                    x: screenSize.x / 2 - 100,
                    y: screenSize.y / 2 - 50,
                    width: 150,
                    height: 50,
                    color: { red: 0, green: 0, blue: 0},
                    textColor: { red: 255, green: 0, blue: 0},
                    topMargin: 4,
                    leftMargin: 4,
                    text: "Score: " + score
                });
}



function printVector(string, vector) {
    print(string + " " + vector.x + ", " + vector.y + ", " + vector.z);
}

function shootBullet(position, velocity) {
    var BULLET_SIZE = 0.07;
    var BULLET_LIFETIME = 10.0;
    var BULLET_GRAVITY = -0.02;
    bulletID = Entities.addEntity(
        { type: "Sphere",
          position: position, 
          dimensions: { x: BULLET_SIZE, y: BULLET_SIZE, z: BULLET_SIZE }, 
          color: {  red: 255, green: 0, blue: 0 },  
          velocity: velocity, 
          lifetime: BULLET_LIFETIME,
          gravity: {  x: 0, y: BULLET_GRAVITY, z: 0 },
          ignoreCollisions: false,
          collisionsWillMove: true
      });

    // Play firing sounds 
    audioOptions.position = position;   
    Audio.playSound(fireSound, audioOptions);
    shotsFired++;
    if ((shotsFired % RELOAD_INTERVAL) == 0) {
        Audio.playSound(loadSound, audioOptions);
    }

    // Kickback the arm 
    rotationBeforeKickback = MyAvatar.getJointRotation("LeftForeArm"); 
    var armRotation = MyAvatar.getJointRotation("LeftForeArm"); 
    armRotation = Quat.multiply(armRotation, Quat.fromPitchYawRollDegrees(0.0, 0.0, KICKBACK_ANGLE));
    MyAvatar.setJointData("LeftForeArm", armRotation);
    elbowKickAngle = KICKBACK_ANGLE;
}

function shootTarget() {
    var TARGET_SIZE = 0.50;
    var TARGET_GRAVITY = -0.25;
    var TARGET_LIFETIME = 300.0;
    var TARGET_UP_VELOCITY = 0.5;
    var TARGET_FWD_VELOCITY = 1.0;
    var DISTANCE_TO_LAUNCH_FROM = 3.0;
    var ANGLE_RANGE_FOR_LAUNCH = 20.0;
    var camera = Camera.getPosition();
    //printVector("camera", camera);
    var targetDirection = Quat.angleAxis(getRandomFloat(-ANGLE_RANGE_FOR_LAUNCH, ANGLE_RANGE_FOR_LAUNCH), { x:0, y:1, z:0 });
    targetDirection = Quat.multiply(Camera.getOrientation(), targetDirection);
    var forwardVector = Quat.getFront(targetDirection);
 
    var newPosition = Vec3.sum(camera, Vec3.multiply(forwardVector, DISTANCE_TO_LAUNCH_FROM));

    var velocity = Vec3.multiply(forwardVector, TARGET_FWD_VELOCITY);
    velocity.y += TARGET_UP_VELOCITY;

    targetID = Entities.addEntity(
        { type: "Box",
          position: newPosition, 
          dimensions: { x: TARGET_SIZE, y: TARGET_SIZE, z: TARGET_SIZE }, 
          color: {  red: 0, green: 200, blue: 200 },  
          //angularVelocity: { x: 1, y: 0, z: 0 },
          velocity: velocity, 
          gravity: {  x: 0, y: TARGET_GRAVITY, z: 0 }, 
          lifetime: TARGET_LIFETIME,
          damping: 0.0001, 
          collisionsWillMove: true });

    // Record start time 
    shotTime = new Date();

    // Play target shoot sound
    audioOptions.position = newPosition;   
    Audio.playSound(targetLaunchSound, audioOptions);
}



function entityCollisionWithEntity(entity1, entity2, collision) {

    if (((entity1.id == bulletID.id) || (entity1.id == targetID.id)) && 
        ((entity2.id == bulletID.id) || (entity2.id == targetID.id))) {
        score++;
        if (showScore) {
            Overlays.editOverlay(text, { text: "Score: " + score } );
        }

        //  We will delete the bullet and target in 1/2 sec, but for now we can see them bounce!
        Script.setTimeout(deleteBulletAndTarget, 500); 

        // Turn the target and the bullet white
        Entities.editEntity(entity1, { color: { red: 255, green: 255, blue: 255 }});
        Entities.editEntity(entity2, { color: { red: 255, green: 255, blue: 255 }});

        // play the sound near the camera so the shooter can hear it
        audioOptions.position = Vec3.sum(Camera.getPosition(), Quat.getFront(Camera.getOrientation()));   
        Audio.playSound(targetHitSound, audioOptions);
    }
}

function keyPressEvent(event) {
    // if our tools are off, then don't do anything
    if (event.text == "t") {
        var time = MIN_THROWER_DELAY + Math.random() * MAX_THROWER_DELAY;
        Script.setTimeout(shootTarget, time); 
    } else if (event.text == ".") {
        shootFromMouse();
    } else if (event.text == "r") {
        playLoadSound();
    } else if (event.text == "s") {
        //  Hit this key to dump a posture from hydra to log
        Quat.print("arm = ", MyAvatar.getJointRotation("LeftArm"));
        Quat.print("forearm = ", MyAvatar.getJointRotation("LeftForeArm"));
        Quat.print("hand = ", MyAvatar.getJointRotation("LeftHand"));

    }
}

function playLoadSound() {
    audioOptions.position = Vec3.sum(Camera.getPosition(), Quat.getFront(Camera.getOrientation())); 
    Audio.playSound(loadSound, audioOptions);
    // Raise arm to firing posture 
    takeFiringPose();
}

function clearPose() {
    MyAvatar.clearJointData("LeftForeArm");
    MyAvatar.clearJointData("LeftArm");
    MyAvatar.clearJointData("LeftHand");
}

function deleteBulletAndTarget() {
    Entities.deleteEntity(bulletID);
    Entities.deleteEntity(targetID);
    bulletID = false; 
    targetID = false; 
}

function takeFiringPose() {
    clearPose();
    if (Controller.getNumberOfSpatialControls() == 0) {
        MyAvatar.setJointData("LeftForeArm", {x: -0.251919, y: -0.0415449, z: 0.499487, w: 0.827843});
        MyAvatar.setJointData("LeftArm", { x: 0.470196, y: -0.132559, z: 0.494033, w: 0.719219});
        MyAvatar.setJointData("LeftHand", { x: -0.0104815, y: -0.110551, z: -0.352111, w: 0.929333});
    }
}

MyAvatar.attach(gunModel, "LeftHand", {x: -0.02, y: -.14, z: 0.07}, Quat.fromPitchYawRollDegrees(-70, -151, 72), 0.20);

//  Give a bit of time to load before playing sound
Script.setTimeout(playLoadSound, 2000); 

function update(deltaTime) {
    if (bulletID && !bulletID.isKnownID) {
        print("Trying to identify bullet");
        bulletID = Entities.identifyEntity(bulletID);
    }
    if (targetID && !targetID.isKnownID) {
        targetID = Entities.identifyEntity(targetID);
    }
    //  Check for mouseLook movement, update rotation 
       // rotate body yaw for yaw received from mouse
    var newOrientation = Quat.multiply(MyAvatar.orientation, Quat.fromVec3Radians( { x: 0, y: yawFromMouse, z: 0 } ));
    //MyAvatar.orientation = newOrientation;
    yawFromMouse = 0;

    // apply pitch from mouse
    var newPitch = MyAvatar.headPitch + pitchFromMouse;
    //MyAvatar.headPitch = newPitch;
    pitchFromMouse = 0;

    
    if (activeControllers == 0) {
        if (Controller.getNumberOfSpatialControls() > 0) { 
            activeControllers = Controller.getNumberOfSpatialControls();
            clearPose();
        }
    }

    var KICKBACK_DECAY_RATE = 0.125;
    if (elbowKickAngle > 0.0)  {       
        if (elbowKickAngle > 0.5) {
            var newAngle = elbowKickAngle * KICKBACK_DECAY_RATE;
            elbowKickAngle -= newAngle; 
            var armRotation = MyAvatar.getJointRotation("LeftForeArm");
            armRotation = Quat.multiply(armRotation, Quat.fromPitchYawRollDegrees(0.0, 0.0, -newAngle));
            MyAvatar.setJointData("LeftForeArm", armRotation);
        } else {
            MyAvatar.setJointData("LeftForeArm", rotationBeforeKickback);
            if (Controller.getNumberOfSpatialControls() > 0) {
                clearPose();
            }
            elbowKickAngle = 0.0;
        }
    }

    //  Check hydra controller for launch button press 
    if (!isLaunchButtonPressed && Controller.isButtonPressed(LEFT_BUTTON_3)) {
        isLaunchButtonPressed = true; 
        var time = MIN_THROWER_DELAY + Math.random() * MAX_THROWER_DELAY;
        Script.setTimeout(shootTarget, time);
    } else if (isLaunchButtonPressed && !Controller.isButtonPressed(LEFT_BUTTON_3)) {
        isLaunchButtonPressed = false;   
        
    }

    // check for trigger press

    var numberOfTriggers = 2; 
    var controllersPerTrigger = 2;

    if (numberOfTriggers == 2 && controllersPerTrigger == 2) {
        for (var t = 0; t < 2; t++) {
            var shootABullet = false;
            var triggerValue = Controller.getTriggerValue(t);
            if (triggerPulled[t]) {
                // must release to at least 0.1
                if (triggerValue < 0.1) {
                    triggerPulled[t] = false; // unpulled
                }
            } else {
                // must pull to at least 
                if (triggerValue > 0.5) {
                    triggerPulled[t] = true; // pulled
                    shootABullet = true;
                }
            }

            if (shootABullet) {
                var palmController = t * controllersPerTrigger; 
                var palmPosition = Controller.getSpatialControlPosition(palmController);

                var fingerTipController = palmController + 1; 
                var fingerTipPosition = Controller.getSpatialControlPosition(fingerTipController);
                
                var palmToFingerTipVector = 
                        {   x: (fingerTipPosition.x - palmPosition.x),
                            y: (fingerTipPosition.y - palmPosition.y),
                            z: (fingerTipPosition.z - palmPosition.z)  };
                                    
                // just off the front of the finger tip
                var position = { x: fingerTipPosition.x + palmToFingerTipVector.x/2, 
                                 y: fingerTipPosition.y + palmToFingerTipVector.y/2, 
                                 z: fingerTipPosition.z  + palmToFingerTipVector.z/2};   
                   
                var velocity = Vec3.multiply(BULLET_VELOCITY, Vec3.normalize(palmToFingerTipVector)); 

                shootBullet(position, velocity);
            }
        }
    }
}

function mousePressEvent(event) {
    isMouseDown = true;
    lastX = event.x;
    lastY = event.y;

    if (Overlays.getOverlayAtPoint({ x: event.x, y: event.y }) === offButton) {
        Script.stop();
    } else {
        shootFromMouse();
    } 
}

function shootFromMouse() {
    var DISTANCE_FROM_CAMERA = 2.0;
    var camera = Camera.getPosition();
    var forwardVector = Quat.getFront(Camera.getOrientation());
    var newPosition = Vec3.sum(camera, Vec3.multiply(forwardVector, DISTANCE_FROM_CAMERA));
    var velocity = Vec3.multiply(forwardVector, BULLET_VELOCITY);
    shootBullet(newPosition, velocity);
}

function mouseReleaseEvent(event) { 
    //  position 
    isMouseDown = false;
}

function mouseMoveEvent(event) {
    if (isMouseDown) {
        var MOUSE_YAW_SCALE = -0.25;
        var MOUSE_PITCH_SCALE = -12.5;
        var FIXED_MOUSE_TIMESTEP = 0.016;
        yawFromMouse += ((event.x - lastX) * MOUSE_YAW_SCALE * FIXED_MOUSE_TIMESTEP);
        pitchFromMouse += ((event.y - lastY) * MOUSE_PITCH_SCALE * FIXED_MOUSE_TIMESTEP);
        lastX = event.x;
        lastY = event.y;
    }
}

function scriptEnding() {
    Overlays.deleteOverlay(reticle); 
    Overlays.deleteOverlay(offButton);
    Overlays.deleteOverlay(text);
    MyAvatar.detachOne(gunModel);
    clearPose();
}

Entities.entityCollisionWithEntity.connect(entityCollisionWithEntity);
Script.scriptEnding.connect(scriptEnding);
Script.update.connect(update);
Controller.mousePressEvent.connect(mousePressEvent);
Controller.mouseReleaseEvent.connect(mouseReleaseEvent);
Controller.mouseMoveEvent.connect(mouseMoveEvent);
Controller.keyPressEvent.connect(keyPressEvent);



