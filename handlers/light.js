
import { getThree, buildMaterial, removeNode, poseBind } from './three-helper.js'

export default async function light(sys,surface,entity,delta) {

	const THREE = getThree()
	if(!THREE) return

	const volume = entity.volume

	if(entity.obliterate) {
		removeNode(volume.node)
		return
	}

	// only run on clients, and also only create once
	if(volume._built) return
	volume._built = true

	const material = buildMaterial(volume.material)

	switch(volume.light) {
	case 'pointLight':
	case 'point':
		// @todo would like to tidy up props under say volume.light = {} 
		volume.node = new THREE.PointLight(volume.color, volume.intensity, volume.distance, volume.decay)
		break

	case 'ambientLight':
	case 'ambient':
		volume.node = new THREE.AmbientLight(volume.color, volume.intensity)
		break

	case 'directionalLight':
	case 'directional':
		volume.node = new THREE.DirectionalLight(volume.color, volume.intensity)
		break

	case 'spotLight':
	case 'spot':
		volume.node = new THREE.SpotLight(volume.color, volume.intensity)
		break

	default:
		console.error('orbital/orbital-volume/light - error unknown',volume)
		return

	}

	// live binding
	poseBind(surface,volume)

}