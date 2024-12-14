
import { getThree, buildMaterial, bindPose } from './three-helper.js'

export default function prim(sys,surface,volume,isServer) {

	// only run on clients, and also only create once
	if(isServer || volume._built) return
	volume._built = true

	const THREE = getThree()

	const material = buildMaterial(volume.material)

	let geometry

	switch(volume.geometry) {
		case 'cube':
		case 'box':
			geometry = new THREE.BoxGeometry(1,1,1);
			volume.node = new THREE.Mesh(geometry, material);
			surface.scene.add(volume.node)
			break;

		case 'sphere':
			geometry = new THREE.SphereGeometry(1, 32, 32);
			volume.node = new THREE.Mesh(geometry, material);
			surface.scene.add(volume.node)
			break;

		case 'cylinder':
			if(!volume.props) throw "Need Props"
			geometry = new THREE.CylinderGeometry(...volume.props);
			volume.node = new THREE.Mesh(geometry, material);
			surface.scene.add(volume.node)
			break;

		case 'plane':
			if(!volume.props) throw "Need Props"
			geometry = new THREE.PlaneGeometry(...volume.props);
			volume.node = new THREE.Mesh(geometry, material);
			surface.scene.add(volume.node)
			break;

		default:
			return
	}

	bindPose(volume)

}