
// The bus is resolved via the import map in index.html (@orbitalfoundation/bus -> jsDelivr),
// which keeps its internal `@orbitalfoundation/utils` import working in the browser too.
import { createBus } from '@orbitalfoundation/bus'

//
// fetch volume itself - providing 3d services - and then some volume rendered 3d elements
//

const volume_system = {
	load:'here/volume.js'
}

const scene001 = {
	volume: {
		geometry: 'scene',
		div: 'volume001',
		background: 0x202020,
		near: 0.1,
		far: 100,
		alpha: false,
		axes: true,
		controls: false,
	}
}

const camera001 = {
	volume: {
		geometry: 'camera',
		cameraMin: 1,
		cameraMax: 100,
		pose:{
			position:[0,1.5,4],
			love:[0,1.5,0]
		}
	}
}

const light001 = {
	volume: {
		geometry:'light',
		light:'directional',
		intensity: 1,
		color: 0xffeae0,
		pose:{
			position:[1,1,1]
		},
	}
}

const light002 = {
	volume: {
		geometry:'light',
		light:'ambient',
		color: 0xffeae0,
		intensity: 1
	}
}

const cube001 = {
	volume: {
		geometry: 'cube',
		material: { color: 'red' },
		pose: {
			position:[-1,2,0],
			scale:[0.1,0.1,0.1],
		}
	}
}

const sphere001 = {
	volume: {
		geometry: 'sphere',
		material: { color: 'green' },
		pose: {
			position:[0,2,0],
			scale:[0.1,0.1,0.1],
		}
	}
}

const cylinder001 = {
	volume: {
		geometry: 'cylinder',

		// https://threejs.org/docs/#api/en/geometries/CylinderGeometry
		// radiusTop, radiusBottom, height, radialSegments, heightSegments
		props: [0.1,1,1,5,5],

		material: { color: 'blue' },
		pose: {
			position:[1,2,0],
			rotation:{x:0,y:0,z:0},
			scale:[0.1,0.1,0.1],
		}
	},
	uuid: 'cylinder001',
}

// A separate ticker that spins the cylinder. The new bus keeps DATA (the entity above, a plain
// blob the volume service renders) and BEHAVIOR (this listener) as separate blobs. The volume
// service binds pose straight into three.js, so mutating the entity's live pose here animates it
// each frame without re-publishing — the "direct binding" idea, now cleanly separated.
const cylinder001_spin = {
	id: 'cylinder001-spin',
	resolve(blob) {
		if(blob.tick) cylinder001.volume.pose.rotation.x += 0.01
	}
}

// do not export
const animations = {
	default: new URL('./assets/animations/unarmed-idle.glb', import.meta.url).href,
}

const person001 = {
	volume: {
		geometry: 'file',
		// the "Alex" avatar from the prismatic.blue scene — vendored locally so the demo is
		// self-contained (no external host / CORS). Despite the generic filename this is the
		// hand-tuned RPM+mixamo rig.
		url: new URL('./assets/rpm-mixamo-t-posed.glb', import.meta.url).href,
		animations,
	},
}


// Make a bus, then hand it the manifest. The first entry { load:'here/volume.js' } pulls in the
// volume service (registering it as a listener); the remaining entries are plain entities the
// volume service observes and renders. The array is processed in order, so volume is live before
// the entities arrive.
const bus = createBus()
await bus.resolve([volume_system,scene001,camera001,light001,light002,cube001,sphere001,cylinder001,cylinder001_spin,person001])

// Rendering happens on tick (scene.js repaints when visited), so start the realtime loop —
// in the browser this drives requestAnimationFrame. This replaces orbital-sys's implicit ticker.
bus.resolve({ run:'realtime', hz:60, dt:1/60 })
