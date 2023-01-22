import * as THREE from 'three';
import { Controller } from '../controller';
import { iconFromName } from './icons'
import { Colors } from './colors'

function createSegmentShape(innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
    const shape = new THREE.Shape();
    let currentPoint = new THREE.Vector2(outerRadius, 0)
    currentPoint.rotateAround(new THREE.Vector2(), startAngle)
    shape.moveTo(currentPoint.x, currentPoint.y);
    // Bug in type definitions
    // @ts-ignore
    shape.ellipse(-currentPoint.x, -currentPoint.y, outerRadius, outerRadius, startAngle, endAngle, false);
    currentPoint.x = innerRadius;
    currentPoint.y = 0;
    currentPoint.rotateAround(new THREE.Vector2(), endAngle)
    shape.lineTo(currentPoint.x, currentPoint.y);
    // @ts-ignore
    shape.ellipse(-currentPoint.x, -currentPoint.y, innerRadius, innerRadius, endAngle, startAngle, true);
    return shape
}

interface CreatePieMeshParameters {
    segments: number
    innerRadius: number
    outerRadius: number
    gapAngle?: number
    material: THREE.Material
    startAngle?: number
    endAngle?: number
    thickness?: number
    curveSegmentsPerRotation?: number
    icons: THREE.Object3D[]
}

function createPieMesh({
    segments,
    innerRadius,
    outerRadius,
    gapAngle = 0.05,
    startAngle = 0,
    endAngle = 2 * Math.PI,
    thickness = .02,
    curveSegmentsPerRotation = 24,
    material,
    icons,
}: CreatePieMeshParameters) {
    let anglePerSegment = endAngle / segments;
    let curveSegmentsPerSegment = Math.round(curveSegmentsPerRotation / (2 * Math.PI / anglePerSegment))
    let shape = createSegmentShape(innerRadius, outerRadius, 0, anglePerSegment - gapAngle);
    let geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, curveSegments: curveSegmentsPerSegment, depth: thickness })

    let mesh = new THREE.InstancedMesh(geometry, material, segments)
    let rotationAxis = new THREE.Vector3(0, 0, 1)
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < segments; ++i) {
        let currentAngle = i * anglePerSegment + startAngle + gapAngle / 2;
        matrix.makeRotationZ(currentAngle);
        mesh.setMatrixAt(i, matrix);

        icons[i].position.set((innerRadius + outerRadius) / 2, 0, thickness+0.01).applyAxisAngle(rotationAxis, currentAngle + anglePerSegment / 2)
        mesh.add(icons[i])
    }

    return mesh;
}

interface PieMenuItem {
    icon?: string;
    name?: string;
    description?: string;
    action?: Action;
    subitems?: PieMenuItem[]
}

interface PieMenuOptions {
    parent?: THREE.Object3D
    width?: number
    submenuOffset?: number
    startRadius?: number
}

const SELECTED_COLOR = Colors.accent
const DEFAULT_COLOR = Colors.button

// TODO visibility depending on mode
// TODO togglable
// TODO submenu
class PieMenu extends THREE.Object3D {
    // items: PieMenuItem | PieMenu;
    _menuMesh: THREE.InstancedMesh;
    _raycaster: THREE.Raycaster;
    _items: PieMenuItem[];

    constructor(items: PieMenuItem[], { parent, width = .1, startRadius = .1, submenuOffset = .05 }: PieMenuOptions = {}) {
        super();
        if (parent)
            parent.add(this);

        this._raycaster = new THREE.Raycaster();
        this._items = items;

        let material = new THREE.MeshMatcapMaterial()
        let iconScale = width * .9;
        this._menuMesh = createPieMesh({
            segments: items.length,
            icons: this._items.map(v => iconFromName(v.action?.icon || v.icon, iconScale)),
            innerRadius: startRadius,
            outerRadius: startRadius + width,
            material: material
        })
        for (let i = 0; i < this._items.length; ++i) {
            this._menuMesh.setColorAt(i, DEFAULT_COLOR);
        }
        this.add(this._menuMesh);
        this._menuMesh.position.z = -.25
        this._menuMesh.rotation.z = -Math.PI / this._items.length + Math.PI / 2

        this.deactivate()
    }

    activate(position: THREE.Vector3, rotation: THREE.Euler) {
        this.position.copy(position);
        this.rotation.copy(rotation);
        this.visible = true;
    }

    get isActive() {
        return this.visible;
    }

    deactivate() {
        this.visible = false;
    }

    _intersect(controller: Controller): number | null {
        this._raycaster.set(controller.worldPosition, controller.worldDirection)
        var intersects = this._raycaster.intersectObject(this._menuMesh);

        let instanceId: number | null = null;
        if (intersects.length > 0) {
            instanceId = intersects[0].instanceId as number;
        }

        return instanceId
    }

    onHover(controller: Controller) {
        if (!this.isActive)
            return;

        let instanceId = this._intersect(controller);
        for (let i = 0; i < this._items.length; ++i) {
            if (i === instanceId) {
                this._menuMesh.setColorAt(i, SELECTED_COLOR);
            } else {
                this._menuMesh.setColorAt(i, DEFAULT_COLOR);
            }
        }
        (this._menuMesh.instanceColor as THREE.BufferAttribute).needsUpdate = true;
    }

    onRelease(controller: Controller) {
        if (!this.isActive)
            return;

        let instanceId = this._intersect(controller);
        if (instanceId != null) {
            if (this._items[instanceId].action instanceof Action) {
                this._items[instanceId].action?.trigger()
            }
        }

        this.deactivate();
    }
}

export { PieMenu }