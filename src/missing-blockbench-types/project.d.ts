interface MeshSelection {
    vertices: [], // TODO
    edges: [], // TODO
    faces: [], // TODO
}

interface ModelProject {
    mesh_selection: Record<string, MeshSelection>
}