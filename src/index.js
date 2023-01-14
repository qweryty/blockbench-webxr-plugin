import * as THREE from "three";
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { Controller } from './controller';

(function () {
    const BASE_NEAR = 0.1;
    const BASE_FAR = 2000;

    let sideGridsVisible;
    const preview = new Preview({ id: 'webxr', offscreen: true });
    let renderer, vrButton, controllers;
    const dolly = new THREE.Object3D();
    const clock = new THREE.Clock();
    dolly.name = 'dolly'

    function moveByVectors(last, current) {
        let lastPositionWorld = dolly.localToWorld(last.clone());
        let currentPositionWorld = dolly.localToWorld(current.clone());
        const positionDelta = lastPositionWorld.sub(currentPositionWorld);
        dolly.position.add(positionDelta);
    }

    function move(controller) {
        moveByVectors(controller.lastPosition, controller.position);
    }

    const originalObject3DAdd = THREE.Object3D.prototype.add
    const originalSceneAdd = THREE.Scene.prototype.add
    Plugin.register('webxr_viewer', {
        title: 'WebXR Viewer',
        author: 'Sergey Morozov',
        icon: 'icon',
        description: 'Allows previewing models using VR headsets, including Meta Quest 2',
        version: '0.0.1',
        variant: 'web',  // Not sure if this will work with electron app
        onload() {
            // three.js has a bug that incorrectly culls objects when dolly scale is too high
            THREE.Object3D.prototype.add = function (object) {
                object.frustumCulled = false;
                originalObject3DAdd.call(this, object);
            }
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
            vrButton = VRButton.createButton(renderer)
            mainPreview.canvas.parentNode.appendChild(vrButton);

            controllers = [new Controller(0, renderer, dolly), new Controller(1, renderer, dolly)]

            renderer.xr.addEventListener('sessionstart', () => {
                sideGridsVisible = Canvas.side_grids.x.visible;
                Canvas.side_grids.x.visible = false;
            });
            renderer.xr.addEventListener('sessionend', () => {
                Canvas.side_grids.x.visible = sideGridsVisible;
            });

            renderer.setAnimationLoop(function () {
                const dt = clock.getDelta();
                if (controllers[1].isSqueezing && controllers[0].isSqueezing) {
                    // Locomotion with translation; rotation and scale
                    let leftLastPosition = controllers[0].lastPosition.clone();
                    let rightLastPosition = controllers[1].lastPosition.clone();

                    let lastVector = leftLastPosition.clone().sub(rightLastPosition);
                    let currentVector = controllers[0].position.clone().sub(controllers[1].position);
                    let lastCenter = leftLastPosition.clone().lerp(rightLastPosition, 0.5)
                    let currentCenter = controllers[0].position.clone().lerp(controllers[1].position, 0.5);

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
                } else if (controllers[1].isSqueezing) {
                    move(controllers[1]);
                } else if (controllers[0].isSqueezing) {
                    move(controllers[0]);
                }
                controllers[0].update();
                controllers[1].update();
                preview.render();
            });
        },
        onunload() {
            mainPreview.canvas.parentNode.removeChild(vrButton);
            scene.remove(dolly);
            THREE.Object3D.prototype.add = originalObject3DAdd;
            THREE.Scene.prototype.add = originalSceneAdd;
            preview.delete();
        }
    });
})();
