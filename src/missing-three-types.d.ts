/// <reference types="./missing-three-types" />

import * as THREE from 'three';

// FIXME fixed in newer versions
declare module 'three' {
    interface WebXRManager {
        getCamera(): THREE.PerspectiveCamera;
        getController(index: number): THREE.XRTargetRaySpace;
        getControllerGrip(index: number): THREE.XRGripSpace;
    }

    interface XRTargetRaySpace extends THREE.Group {
        hasLinearVelocity: boolean;
        readonly linearVelocity: THREE.Vector3;
        hasAngularVelocity: boolean;
        readonly angularVelocity: THREE.Vector3;
    }

    interface XRGripSpace extends THREE.Group {
        hasLinearVelocity: boolean;
        readonly linearVelocity: THREE.Vector3;
        hasAngularVelocity: boolean;
        readonly angularVelocity: THREE.Vector3;
    }

    // import { Object3D, Camera, MOUSE, Raycaster, Mesh, Vector3, Quaternion } from '../../../src/Three';

    export class TransformControls extends THREE.Object3D {
        constructor(object: THREE.Camera, domElement?: HTMLElement);

        domElement: HTMLElement;

        // API

        camera: THREE.Camera;
        object: Object3D | undefined;
        enabled: boolean;
        axis: 'X' | 'Y' | 'Z' | 'E' | 'XY' | 'YZ' | 'XZ' | 'XYZ' | 'XYZE' | null;
        mode: 'translate' | 'rotate' | 'scale';
        translationSnap: number | null;
        rotationSnap: number | null;
        space: 'world' | 'local';
        size: number;
        dragging: boolean;
        showX: boolean;
        showY: boolean;
        showZ: boolean;
        readonly isTransformControls: true;
        mouseButtons: {
            LEFT: THREE.MOUSE;
            MIDDLE: THREE.MOUSE;
            RIGHT: THREE.MOUSE;
        };

        attach(object: THREE.Object3D): this;
        detach(): this;
        getMode(): 'translate' | 'rotate' | 'scale';
        getRaycaster(): THREE.Raycaster;
        setMode(mode: 'translate' | 'rotate' | 'scale'): void;
        setTranslationSnap(translationSnap: number | null): void;
        setRotationSnap(rotationSnap: number | null): void;
        setScaleSnap(scaleSnap: number | null): void;
        setSize(size: number): void;
        setSpace(space: 'world' | 'local'): void;
        reset(): void;
        dispose(): void;

        // Properties missing from three-ts-types
        scaleSnap?: number;
        worldPosition: THREE.Vector3;
		worldPositionStart: THREE.Vector3;
		worldQuaternion: THREE.Quaternion;
		worldQuaternionStart: THREE.Quaternion;
		cameraPosition: THREE.Vector3;
		cameraQuaternion: THREE.Quaternion;
		pointStart: THREE.Vector3;
		pointEnd: THREE.Vector3;
		rotationAxis: THREE.Vector3;
		rotationAngle: number;
		eye: THREE.Vector3;
        _gizmo: THREE.TransformControlsGizmo;
        _plane: THREE.TransformControlsPlane;

        _offset: THREE.Vector3;
		_startNorm: THREE.Vector3;
		_endNorm: THREE.Vector3;
		_cameraScale: THREE.Vector3;

		_parentPosition: THREE.Vector3;
		_parentQuaternion: THREE.Quaternion;
		_parentQuaternionInv: THREE.Quaternion;
		_parentScale: THREE.Vector3;

		_worldScaleStart: THREE.Vector3;
		_worldQuaternionInv: THREE.Quaternion;
		_worldScale: THREE.Vector3;

		_positionStart: THREE.Vector3;
		_quaternionStart: THREE.Quaternion;
		_scaleStart: THREE.Vector3;
    }

    export class TransformControlsGizmo extends THREE.Object3D {
        type: 'TransformControlsGizmo';
        isTransformControlsGizmo: true;

        gizmo: {
            translate: THREE.Object3D;
            rotate: THREE.Object3D;
            scale: THREE.Object3D;
        };
        helper: {
            translate: THREE.Object3D;
            rotate: THREE.Object3D;
            scale: THREE.Object3D;
        };
        picker: {
            translate: THREE.Object3D;
            rotate: THREE.Object3D;
            scale: THREE.Object3D;
        };

        constructor();
    }

    export class TransformControlsPlane extends THREE.Mesh {
        type: 'TransformControlsPlane';
        isTransformControlsPlane: true;

        constructor();

        mode: 'translate' | 'scale' | 'rotate';

        axis: 'X' | 'Y' | 'Z' | 'XY' | 'YZ' | 'XZ' | 'XYZ' | 'E';

        space: 'local' | 'world';

        eye: THREE.Vector3;
        worldPosition: THREE.Vector3;
        worldQuaternion: THREE.Quaternion;
    }
}