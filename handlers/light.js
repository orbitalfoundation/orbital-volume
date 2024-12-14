
import { getThree, buildMaterial, bindPose } from './three-helper.js'

export default async function light(sys,surface,volume,isServer) {

	// only run on clients, and also only create once
	if(isServer || volume._built) return
	volume._built = true

	const THREE = getThree()

	const material = buildMaterial(volume.material)

	switch(volume.light) {
	case 'pointLight':
	case 'point':
		volume.node = new THREE.PointLight(volume.color, volume.intensity, volume.distance, volume.decay)
//		volume.node.add( new THREE.Mesh(new THREE.SphereGeometry(10, 32, 32), material ) )
		surface.scene.add(volume.node)
		break

	case 'ambientLight':
	case 'ambient':
		volume.node = new THREE.AmbientLight(volume.color, volume.intensity)
//		volume.node.add( new THREE.Mesh(new THREE.SphereGeometry(10, 32, 32), material ) )
		surface.scene.add(volume.node)
		break

	case 'directionalLight':
	case 'directional':
		volume.node = new THREE.DirectionalLight(volume.color, volume.intensity)
//		volume.node.add( new THREE.Mesh(new THREE.SphereGeometry(10, 32, 32), material ) )
		surface.scene.add(volume.node)
		break

	case 'spotLight':
	case 'spot':
		volume.node = new THREE.SpotLight(volume.color, volume.intensity)
//		volume.node.add( new THREE.Mesh(new THREE.CylinderGeometry(0.5, 10, 10, 8), material ) )
		surface.scene.add(volume.node)
		break

	default:
		console.error('orbital/orbital-volume/light - error unknown',volume)
		return

	}

	// rewrite the hopefully durable volume handle with live pose state; for ease of use
	bindPose(volume)

}