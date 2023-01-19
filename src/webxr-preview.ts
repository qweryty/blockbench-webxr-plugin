/// <reference types="./missing-three-types" />
/// <reference types="./missing-blockbench-types/index" />

import { Object3D } from 'three';
import { ControllerEvent } from './controller';

class WebXRPreview extends Preview {
	raycast(event: ControllerEvent): false | RaycastResult {
		let controller = event.controller
		this.raycaster.set(controller.worldPosition, controller.worldDirection)

		var objects: THREE.Object3D[]  = []
		Outliner.elements.forEach(element => {
			if (element.mesh && element.mesh.geometry && element.visibility && !element.locked) {
				objects.push(element.mesh);
				if (Modes.edit && element.selected) {
					if (element.mesh.vertex_points && element.mesh.vertex_points.visible) {
						objects.push(element.mesh.vertex_points);
					}
					if (element instanceof Mesh && element.mesh.outline.visible && (BarItems.selection_mode as BarSelect).value == 'edge') {
						objects.push(element.mesh.outline);
					}
				}
			}
		})
		if (Group.selected && Group.selected.mesh.vertex_points) {
			objects.push(Group.selected.mesh.vertex_points);
		}
		if (Animator.open && settings.motion_trails.value && Group.selected) {
			Animator.motion_trail.children.forEach(object => {
				if (object.isKeyframe === true) {
					objects.push(object)
				}
			})
		}
		var intersects = this.raycaster.intersectObjects(objects);
		if (intersects.length > 0) {
			let mesh_gizmo = intersects.find(intersect => intersect.object.type == 'Points' || intersect.object.type == 'LineSegments');
			let intersect = mesh_gizmo || intersects[0];
			let intersect_object = intersect.object

			if (intersect_object.isElement) {
				var element = OutlinerNode.uuids[intersect_object.name]
				let face: string | undefined;
				if (element instanceof Cube) {
					let index = intersect.faceIndex as number;
					face = (intersect_object as CubeMesh).geometry.faces[Math.floor(index / 2)];
				} else if (element instanceof Mesh) {
					let index = intersect.faceIndex as number;
					for (let key in element.faces) {
						let { vertices } = element.faces[key];
						if (vertices.length < 3) continue;

						if (index == 0 || (index == 1 && vertices.length == 4)) {
							face = key;
							break;
						}
						if (vertices.length == 3) index -= 1;
						if (vertices.length == 4) index -= 2;
					}
				}

				return {
					type: 'element',
					event,
					intersects,
					face,
					element
				}
			} else if (intersect_object.isKeyframe) {
				let uuid = (intersect_object as KeyframePoints).keyframeUUIDs[intersect.index as number];
				let keyframe = Timeline.keyframes.find(kf => kf.uuid == uuid);
				return {
					type: 'keyframe',
					event,
					intersects,
					keyframe: keyframe
				}
			} else if (intersect_object.type == 'Points') {
				let points = intersect_object as OutlinePoints;
				var element = OutlinerNode.uuids[points.element_uuid];
				let index = intersect.index as number
				let vertex = element instanceof Mesh
					? Object.keys(element.vertices)[index]
					: points.vertices[index];
				return {
					type: 'vertex',
					event,
					element,
					intersects,
					intersect,
					vertex,
					vertex_index: index,
				}
			} else if (intersect_object.type == 'LineSegments') {
				let parent = intersect_object.parent as Object3D;
				var element = OutlinerNode.uuids[parent.name];
				let vertices: Vertex[] = (intersect_object as OutlineLineSegments).vertex_order.slice(intersect.index, intersect.index as number + 2);
				return {
					type: 'line',
					event,
					element,
					intersects,
					intersect,
					vertices
				}
			}
		}
		return false;
	}
}

export { WebXRPreview }