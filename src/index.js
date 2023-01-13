//import * as THREE from "three";
// import { Vector2 } from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

(function () {
    const BASE_NEAR = 0.1;
    const BASE_FAR = 2000;
    // gamepad.axes[0] - 
    // gamepad.axes[1] - 
    // gamepad.axes[2] - left/right
    // gamepad.axes[3] - up/down
    // gamepad.buttons[0] - trigger
    // gamepad.buttons[1] - grip
    // gamepad.buttons[2] - 
    // gamepad.buttons[3] - joysyick
    // gamepad.buttons[4] - a/x
    // gamepad.buttons[5] - b/y
    // gamepad.buttons[6] - 
    const TRIGGER_BUTTON = 0;
    const GRIP_BUTTON = 1;
    const JOYSTICK_BUTTON = 3;
    const AX_BUTTON = 4;
    const BY_BUTTON = 5;

    let sideGridsVisible;
    const preview = new Preview({ id: 'webxr', offscreen: true });
    let renderer, rightController, leftController;
    const dolly = new THREE.Object3D();
    const clock = new THREE.Clock();
    dolly.name = 'dolly'

    function onSelectStart() {
        this.userData.isSelecting = true;
        this.userData.startSelectingPosition = this.position.clone();
    }

    function onSelectEnd() {
        this.userData.isSelecting = false;
    }

    function onSqueezeStart() {
        this.userData.isSqueezing = true;
        this.userData.startSqueezingPosition = this.position.clone();
    }

    function onSqueezeEnd() {
        this.userData.isSqueezing = false;
    }

    function setupController(index, renderer, controllerModelFactory) {
        let controllerGrip = renderer.xr.getControllerGrip(index);
        controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
        dolly.add(controllerGrip);
        let controller = renderer.xr.getController(index);

        controller.userData.isSqueezing = false;
        controller.userData.isSelecting = false;
        controller.addEventListener('selectstart', onSelectStart);
        controller.addEventListener('selectend', onSelectEnd);
        controller.addEventListener('squeezestart', onSqueezeStart);
        controller.addEventListener('squeezeend', onSqueezeEnd);
        controller.addEventListener('connected', (e) => {
            console.log(`connected: ${JSON.stringify(e)} ${e.data.gamepad}`)
            controller.userData.gamepad = e.data.gamepad
        });
        controller.userData.lastPosition = controller.position.clone();

        return controller;
    }

    function moveByVectors(last, current) {
        let lastPositionWorld = dolly.localToWorld(last.clone());
        let currentPositionWorld = dolly.localToWorld(current.clone());
        const positionDelta = lastPositionWorld.sub(currentPositionWorld);
        dolly.position.add(positionDelta);
    }

    function move(controller) {
        moveByVectors(controller.userData.lastPosition, controller.position);
    }

    Plugin.register('webxr_viewer', {
        title: 'WebXR Viewer',
        author: 'Sergey Morozov',
        icon: 'icon',
        description: 'Allows previewing models using VR headsets, including Meta Quest 2',
        version: '0.0.1',
        variant: 'web',  // Not sure if this will work with electron app
        onload() {
            // three.js has a bug that incorrectly culls objects when dolly scale is too high
            const originalObject3DAdd = THREE.Object3D.prototype.add
            THREE.Object3D.prototype.add = function (object) {
                object.frustumCulled = false;
                originalObject3DAdd.call(this, object);
            }
            const originalSceneAdd = THREE.Scene.prototype.add
            THREE.Scene.prototype.add = function (object) {
                object.frustumCulled = false;
                originalSceneAdd.call(this, object);
            }
            scene.traverse(function (node) {
                if (node instanceof THREE.Object3D) {
                    node.frustumCulled = false;
                }
            });

            renderer = preview.renderer;
            renderer.xr.enabled = true;
            let camera = renderer.xr.getCamera();
            camera.near = BASE_NEAR;
            preview.camera.near = BASE_NEAR;
            camera.far = BASE_FAR;
            preview.camera.far = BASE_FAR;

            dolly.add(camera)
            dolly.add(preview.camera)
            scene.add(dolly)

            const mainPreview = Preview.all.find(preview => preview.id == 'main');
            mainPreview.canvas.parentNode.appendChild(VRButton.createButton(renderer));

            const controllerModelFactory = new XRControllerModelFactory();
            rightController = setupController(0, renderer, controllerModelFactory);
            leftController = setupController(1, renderer, controllerModelFactory);

            renderer.xr.addEventListener('sessionstart', () => {
                sideGridsVisible = Canvas.side_grids.x.visible;
                Canvas.side_grids.x.visible = false;
            });
            renderer.xr.addEventListener('sessionend', () => {
                Canvas.side_grids.x.visible = sideGridsVisible;
            });

            renderer.setAnimationLoop(function () {
                const dt = clock.getDelta();
                if (rightController.userData.isSqueezing && leftController.userData.isSqueezing) {
                    // Locomotion with translation; rotation and scale
                    let leftLastPosition = leftController.userData.lastPosition.clone();
                    let rightLastPosition = rightController.userData.lastPosition.clone();

                    let lastVector = leftLastPosition.clone().sub(rightLastPosition);
                    let currentVector = leftController.position.clone().sub(rightController.position.clone());
                    let lastCenter = leftLastPosition.clone().lerp(rightLastPosition, 0.5)
                    let currentCenter = leftController.position.clone().lerp(rightController.position.clone(), 0.5);

                    let scaleFactor = lastVector.length() / currentVector.length();

                    // Fixing dolly offset and moving
                    let positionbefore = dolly.localToWorld(lastCenter.clone());
                    dolly.scale.multiplyScalar(scaleFactor);
                    dolly.updateMatrixWorld();
                    let positionAfter = dolly.localToWorld(currentCenter.clone());
                    dolly.position.sub(positionAfter.sub(positionbefore));

                    // Rotating
                    let lastRotation = new THREE.Vector2(lastVector.x, lastVector.z).angle();
                    let currentRotation = new THREE.Vector2(currentVector.x, currentVector.z).angle();
                    let rotationAngle = currentRotation - lastRotation;
                    // https://stackoverflow.com/questions/42812861/three-js-pivot-point/42866733#42866733
                    dolly.localToWorld(currentCenter);
                    dolly.position.sub(currentCenter);
                    dolly.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle)
                    dolly.position.add(currentCenter);
                    dolly.rotateY(rotationAngle)
                } else if (rightController.userData.isSqueezing) {
                    move(rightController);
                } else if (leftController.userData.isSqueezing) {
                    move(leftController);
                }
                leftController.userData.lastPosition.copy(leftController.position);
                rightController.userData.lastPosition.copy(rightController.position);
                preview.render();
            });
        }
    });
})();
