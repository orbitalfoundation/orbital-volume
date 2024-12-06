
import { getThree, buildMaterial, bindPose } from './three.js'

export default async function light(sys,surface,volume) {

	// only run on clients, and also only create once
	if(surface.isServer || volume.node) return

	const THREE = getThree()

	const material = buildMaterial(volume.material)

	switch(volume.light) {
	case 'point':
		volume.node = new THREE.PointLight(volume.color, volume.intensity, volume.distance, volume.decay)
		volume.node.add( new THREE.Mesh(new THREE.SphereGeometry(10, 32, 32), material ) )
		surface.scene.add(volume.node)
		break

	case 'ambient':
		volume.node = new THREE.AmbientLight(volume.color, volume.intensity)
		volume.node.add( new THREE.Mesh(new THREE.SphereGeometry(10, 32, 32), material ) )
		surface.scene.add(volume.node)
		break

	case 'directional':
		volume.node = new THREE.DirectionalLight(volume.color, volume.intensity)
		volume.node.add( new THREE.Mesh(new THREE.SphereGeometry(10, 32, 32), material ) )
		surface.scene.add(volume.node)
		break

	case 'spot':
		volume.node = new THREE.SpotLight(volume.color, volume.intensity)
		volume.node.add( new THREE.Mesh(new THREE.CylinderGeometry(0.5, 10, 10, 8), material ) )
		surface.scene.add(volume.node)
		break

	default:
		return

	}

	// rewrite the hopefully durable volume handle with live pose state; for ease of use
	bindPose(volume)

}