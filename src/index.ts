/// <reference types="./missing-blockbench-types" />
/// <reference types="./missing-three-types" />
/// <reference types="blockbench-types" />


import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton';
import { Controller } from './controller';

(function () {
    const BASE_NEAR = 0.1;
    const BASE_FAR = 2000;

    let sideGridsVisible: boolean, mainPreview: Preview;
    const preview = new Preview({ id: 'webxr', offscreen: true });  // FIXME bug in blockbench-types
    let renderer: THREE.WebGLRenderer, vrButton: HTMLElement, controllers: Controller[];
    const dolly = new THREE.Object3D();
    const clock = new THREE.Clock();
    dolly.name = 'dolly'

    function moveByVectors(last: THREE.Vector3, current: THREE.Vector3) {
        let lastPositionWorld = dolly.localToWorld(last.clone());
        let currentPositionWorld = dolly.localToWorld(current.clone());
        const positionDelta = lastPositionWorld.sub(currentPositionWorld);
        dolly.position.add(positionDelta);
    }

    function move(controller: Controller) {
        moveByVectors(controller.lastGripPosition, controller.gripPosition);
    }

    const originalObject3DAdd = THREE.Object3D.prototype.add
    const originalSceneAdd = THREE.Scene.prototype.add
    BBPlugin.register('webxr_viewer', {
        title: 'WebXR Viewer',
        author: 'Sergey Morozov',
        icon: 'icon',
        description: 'Allows previewing models using VR headsets, including Meta Quest 2',
        version: '0.0.1',
        variant: 'web',  // Not sure if this will work with electron app
        onload() {
            // three.js has a bug that incorrectly culls objects when dolly scale is too high
            THREE.Object3D.prototype.add = function (object: any) {
                object.frustumCulled = false;
                return originalObject3DAdd.call(this, object);
            }
            THREE.Scene.prototype.add = function (object: any) {
                object.frustumCulled = false;
                return originalSceneAdd.call(this, object);
            }
            Canvas.scene.traverse(function (node) {
                if (node instanceof THREE.Object3D) {
                    node.frustumCulled = false;
                }
            });

            renderer = preview.renderer;
            renderer.xr.enabled = true;
            let camera: THREE.PerspectiveCamera = renderer.xr.getCamera();
            camera.near = BASE_NEAR;
            preview.camera.near = BASE_NEAR;
            camera.far = BASE_FAR;
            preview.camera.far = BASE_FAR;

            dolly.add(camera)
            dolly.add(preview.camera)
            Canvas.scene.add(dolly)

            // @ts-ignore
            mainPreview = Preview.all.find(preview => preview.id == 'main');
            vrButton = VRButton.createButton(renderer)
            // @ts-ignore
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
                    let leftLastPosition = controllers[0].lastGripPosition.clone();
                    let rightLastPosition = controllers[1].lastGripPosition.clone();

                    let lastVector = leftLastPosition.clone().sub(rightLastPosition);
                    let currentVector = controllers[0].gripPosition.clone().sub(controllers[1].gripPosition);
                    let lastCenter = leftLastPosition.clone().lerp(rightLastPosition, 0.5)
                    let currentCenter = controllers[0].gripPosition.clone().lerp(controllers[1].gripPosition, 0.5);

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
            // @ts-ignore
            mainPreview.canvas.parentNode.removeChild(vrButton);
            Canvas.scene.remove(dolly);
            THREE.Object3D.prototype.add = originalObject3DAdd;
            THREE.Scene.prototype.add = originalSceneAdd;
            preview.delete();
        }
    });
})();
