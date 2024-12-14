
import { getThree, buildMaterial, bindPose, removeNode } from './three-helper.js'

export default function prim(sys,surface,entity,delta) {

	// client side only
	const THREE = getThree()
	if(!THREE) return

	const volume = entity.volume

	if(entity.obliterate) {
		removeNode(volume.node)
		return
	}

	// only update once for now
	if(volume._built) return
	volume._built = true

	const material = buildMaterial(volume.material)

	let geometry

	switch(volume.geometry) {
		case 'cube':
		case 'box':
			geometry = new THREE.BoxGeometry(1,1,1);
			break;

		case 'sphere':
			geometry = new THREE.SphereGeometry(1, 32, 32);
			break;

		case 'cylinder':
			if(!volume.props) throw "Need Props"
			geometry = new THREE.CylinderGeometry(...volume.props);
			break;

		case 'plane':
			if(!volume.props) throw "Need Props"
			geometry = new THREE.PlaneGeometry(...volume.props);
			break;

		default:
			return
	}

	if(geometry) {
		volume.node = new THREE.Mesh(geometry, material);
		if(entity.parent && entity.parent.volume && entity.parent.volume.node) {
			entity.parent.volume.node.add(volume.node)
		} else {
			surface.scene.add(volume.node)
		}
		bindPose(volume)
	}

}