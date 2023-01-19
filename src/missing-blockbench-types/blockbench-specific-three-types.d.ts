import * as THREE from 'three';

declare module 'three' {
    interface Object3D {
        isElement?: boolean;
        isKeyframe?: boolean;
        vertex_points?: THREE.Points;
    }
}
