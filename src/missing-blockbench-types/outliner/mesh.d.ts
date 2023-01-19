type Vertex = [number, number, number]

interface MeshFaceOptions extends FaceOptions { }

declare class MeshFace extends Face {
    constructor(mesh: Mesh, data: MeshFaceOptions);
    uv: any;  // TODO
    texture: boolean;  // TODO
    vertices: string[];  // TODO is it optional
}

interface MeshOptions {
    // TODO
}

declare class Mesh extends OutlinerElement {
    constructor(data: MeshOptions, uuid?: string)

    vertices: Record<string, Vertex>;
    faces: Record<string, MeshFace>;
    seams: Record<>; // TODO
}