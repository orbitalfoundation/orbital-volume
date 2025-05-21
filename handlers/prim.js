
import { getThree, buildMaterial, removeNode, poseBind, poseUpdate } from './three-helper.js'

export default function prim(sys,surface,entity,delta) {

	// client side only
	const THREE = getThree()
	if(!THREE) return

	const volume = entity.volume

	if(entity.obliterate) {
		removeNode(volume.node)
		return
	}

	// update?
	if(volume._built) {
		poseUpdate(surface,volume)
		return
	}
	volume._built = true

	// in the case of multiple instances may avoid building geometry
	if(volume.instances) {
		poseBind(surface,volume)
		if(volume.node) return
	}

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
		const node = volume.node = new THREE.Mesh(geometry, material)
		poseBind(surface,volume,node)
	}

}

