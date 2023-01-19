interface FaceOptions { }

declare class Face {
    constructor(data: FaceOptions);
}

interface OutlinerThreeMesh extends THREE.Mesh {
    vertex_points?: THREE.Points;
    outline: THREE.LineSegments;
}

interface OutlinerElement {
    constructor(data, uuid?: string);

    get mesh(): OutlinerThreeMesh | null;

    visibility?: boolean;
}

interface Group {
    static selected?: Group;
    mesh: THREE.Object3D;
}