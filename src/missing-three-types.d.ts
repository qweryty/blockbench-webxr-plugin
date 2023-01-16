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
        readonly linearVelocity: Vector3;
        hasAngularVelocity: boolean;
        readonly angularVelocity: Vector3;
    }

    interface XRGripSpace extends THREE.Group {
        hasLinearVelocity: boolean;
        readonly linearVelocity: Vector3;
        hasAngularVelocity: boolean;
        readonly angularVelocity: Vector3;
    }
}