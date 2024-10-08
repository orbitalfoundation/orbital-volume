
// @todo have some kind of generic math library
// import "../babylon3d/libs/babylon.js"

function navigate(event,entity,sys) {

	if(!entity || !entity.volume || !entity.volume.transform || !entity.volume.transform.xyz || !entity.volume.transform.ypr) {
		console.error("navigate: error in entity",entity)
		return
	}

	const transform = entity.volume.transform

	// @todo note that this only works because of the way memory is being shared
	// the entity.volume.transform.xyz is a 'live' property on the last time it was written to db
	// realistically we should be polling for the entity and using that instead

	const xyz = transform.xyz || [ 0,0,0 ]
	const ypr = transform.ypr || [ 0,0,0 ]

	let m = 0
	let x = 0
	switch(event.keyCode) {
		case 39: event.shiftKey ? x = -0.1 : ypr[1] -=0.1; break
		case 37: event.shiftKey ? x = 0.1 : ypr[1] +=0.1; break
		case 40: m = -0.1; break
		case 38: m = 0.1; break
		case 0: break
		default: return
	}

	// get current orientation as euler and use to estimate translation target
	//let rot = BABYLON.Quaternion.FromEulerAngles(...ypr)
	//let vec = new BABYLON.Vector3(x,0,m).rotateByQuaternionToRef(rot,BABYLON.Vector3.Zero())
	let rot = new THREE.Quaternion().setFromEuler( new THREE.Euler(...ypr))
	let vec = new THREE.Vector3(x,0,m).applyQuaternion(rot)

	// translate as a function of direction
	xyz[0] += vec.x
	xyz[1] += vec.y
	xyz[2] += vec.z

	// broadcast player movement - @todo smoothing
	sys.resolve({
		uuid: entity.uuid,
		volume: {
			transform: { xyz, ypr }
		},
		network:{}
	})

	// update chase camera
	sys.resolve({
		uuid: entity.uuid,
		volume: {
			focus: { xyz: [xyz[0],xyz[1]+1.5,xyz[2]], ypr }
		},
	})

}

let handler = null

export const navigation_observer = {
	about: 'navigation observer',
	resolve: (blob,sys) => {

		if(blob.tick) return blob
		if(!blob.navigation) return blob

		if (typeof window === 'undefined' || document === 'undefined') {
			console.error("navigation: should not be run on server")
			return blob
		}

		if(handler == null) {
			handler = document.addEventListener('keydown',(event) => {
				navigate(event,blob,sys)
			})

			// force an initial event
			navigate({keyCode:0},blob,sys)
		}

		return true
	}
}

