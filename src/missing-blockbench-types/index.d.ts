/// <reference types="blockbench-types" />

/// <reference types="./outliner/mesh" />
/// <reference types="./outliner/outliner" />
/// <reference types="./action" />
/// <reference types="./blockbench-specific-three-types" />
/// <reference types="./misc" />
/// <reference types="./modes" />
/// <reference types="./plugin" />
/// <reference types="./preview" />
/// <reference types="./project" />
/// <reference types="./settings" />


interface KeyframePoints extends THREE.Points {
    isKeyframe: true;
    keyframeUUIDs: UUID[]
}

interface CubeGeometry extends THREE.BoxGeometry {
    faces: string[]
}

interface CubeMesh extends THREE.Mesh {
    geometry: CubeGeometry
}

interface OutlineLineSegments extends THREE.LineSegments {
    no_export: true;
    vertex_order: Vertex[];
}

interface OutlinePoints extends THREE.Points {
    element_uuid: UUID
    vertices: Vertex[];  // FIXME possibly optional?
}