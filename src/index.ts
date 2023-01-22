/// <reference types="./missing-three-types" />
/// <reference types="./missing-blockbench-types/index" />

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton';
import { Controller, ControllerEvent } from './controller';
import { PieMenu } from './ui/pie-menu';
import { WebXRPreview } from './webxr-preview';
import { WebXRTransformControls } from './webxr-transform-controls';

(function () {
    const BASE_NEAR = 0.1;
    const BASE_FAR = 2000;

    let sideGridsVisible: boolean, mainPreview: Preview, oldTransformer: THREE.TransformControls;
    const preview = new WebXRPreview({ id: 'webxr', offscreen: true });
    let renderer: THREE.WebGLRenderer, vrButton: HTMLElement, controllers: Controller[];
    const dolly = new THREE.Object3D();
    dolly.name = 'dolly';
    const clock = new THREE.Clock();

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
        tags: ['interface'],
        variant: 'web',  // Not sure if this will work with electron app
        onload() {
            // FIXME gizmo center axes still being culled
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

            mainPreview = Preview.all.find(preview => preview.id == 'main') as Preview;

            renderer = preview.renderer;
            renderer.xr.enabled = true;

            // Setup Cameras
            let camera: THREE.PerspectiveCamera = renderer.xr.getCamera();
            camera.near = BASE_NEAR;
            preview.camera.near = BASE_NEAR;
            camera.far = BASE_FAR;
            preview.camera.far = BASE_FAR;
            // need this so gizmos will work correctly
            // @ts-ignore
            camera.preview = preview
            preview.camXR = camera;
            console.log(preview.camPers.parent)

            dolly.add(camera);
            dolly.add(preview.camOrtho);
            dolly.add(preview.camPers);
            Canvas.scene.add(dolly);

            controllers = [new Controller(0, renderer, dolly), new Controller(1, renderer, dolly)];

            // Replace gizmos with WebXRCompatible
            oldTransformer = Transformer;
            // FIXME TransformControls is not asignable to type Object3D
            // @ts-ignore
            Canvas.scene.remove(oldTransformer);
            Canvas.gizmos.remove(oldTransformer);

            Transformer = new WebXRTransformControls(preview.camOrtho, mainPreview.canvas);
            Transformer.setSize(0.5);
            Canvas.scene.add(Transformer);
            Canvas.gizmos.push(Transformer);
            mainPreview.occupyTransformer(); // TODO occu
            Transformer.camera = camera;

            // Setup VRButton
            vrButton = VRButton.createButton(renderer);
            (mainPreview.canvas.parentNode as Node).appendChild(vrButton);

            // Setup Pie Menus
            let xPieMenu = new PieMenu([
                // {icon: 'test'},
                // {icon: 'test'},
                // {icon: 'test'},
                // {icon: 'test'},
                {action: BarItems['undo'] as Action},
                {action: BarItems['redo'] as Action},
            ], {parent: dolly});

            // Setup events
            let mainHand: string | null = 'right';
            let mainHandActive: boolean = false;
            let selectstart = (e: ControllerEvent) => {
                if (!mainHandActive) {
                    mainHand = e.controller.handedness;
                    mainHandActive = true;
                    Transformer.onPointerDown(e);
                    preview.click(e);
                }
            };
            controllers[0].addEventListener('selectstart', <EventListener>selectstart);
            controllers[1].addEventListener('selectstart', <EventListener>selectstart);

            let selectend = (e: ControllerEvent) => {
                if (e.controller.handedness === mainHand) {
                    Transformer.onPointerUp(e);
                    preview.mouseup(e);
                    mainHandActive = false;
                }
            };
            controllers[0].addEventListener('selectend', <EventListener>selectend);
            controllers[1].addEventListener('selectend', <EventListener>selectend);

            let controllerMove = (e: ControllerEvent) => {
                if (e.controller.handedness === mainHand) {
                    Transformer.onPointerHover(e);
                    Transformer.onPointerMove(e);
                    preview.mousemove(e);
                }
            };
            controllers[0].addEventListener('controllermove', <EventListener>controllerMove);
            controllers[1].addEventListener('controllermove', <EventListener>controllerMove);

            renderer.xr.addEventListener('sessionstart', () => {
                sideGridsVisible = Canvas.side_grids.x.visible;
                Canvas.side_grids.x.visible = false;
                preview.occupyTransformer();
            });
            renderer.xr.addEventListener('sessionend', () => {
                Canvas.side_grids.x.visible = sideGridsVisible;
                mainPreview.occupyTransformer();
            });

            renderer.setAnimationLoop(function () {
                const dt = clock.getDelta();

                preview.controls.updateSceneScale();

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

                // console.log(controllers[0].buttons?.ax.pressed)
                if(controllers[0].buttons?.ax.pressed){
                    if(!xPieMenu.isActive){
                        let pieMenuRotation = controllers[0].rotation;
                        pieMenuRotation.z = 0
                        xPieMenu.activate(controllers[0].position, pieMenuRotation);
                    }
                    xPieMenu.onHover(controllers[0]);
                } else {
                    // TODO only on state change
                    xPieMenu.onRelease(controllers[0]);
                }
                preview.render();
                controllers[0].update();
                controllers[1].update();
            });
        },
        onunload() {
            (mainPreview.canvas.parentNode as Node).removeChild(vrButton);
            Canvas.scene.remove(dolly);
            THREE.Object3D.prototype.add = originalObject3DAdd;
            THREE.Scene.prototype.add = originalSceneAdd;
            preview.delete();
        }
    });
})();
