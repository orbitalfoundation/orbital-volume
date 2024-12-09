import { getThree, buildMaterial, bindPose } from './three-helper.js'

import { load_animations } from './load-helpers/load-animations.js'
import { morph_targets } from './load-helpers/morph-targets.js'
import { copy_bones } from './load-helpers/copy-bones.js'
import { retarget_vrm } from './load-helpers/retarget-vrm.js'
import { misc_cleanup } from './load-helpers/misc-cleanup.js'

async function getLoader() {

	const GLTFLoader = (await import('three/addons/loaders/GLTFLoader.js')).GLTFLoader
	const gltfLoader = new GLTFLoader()

return gltfLoader

	const DRACOLoader = (await import('three/addons/loaders/DRACOLoader.js')).DRACOLoader
	const dracoLoader = new DRACOLoader()
	//dracoLoader.setDecoderPath("@todo")
	gltfLoader.setDRACOLoader(dracoLoader)

	const KTX2Loader = (await import('three/addons/loaders/KTX2Loader.js')).KTX2Loader
	const ktx2Loader = new KTX2Loader()
	//ktx2Loader.setTranscoderPath(import.meta.url+"@todo") 
	gltfLoader.setKTX2Loader(ktx2Loader)

	const MeshOptDecoder = (await import('three/addons/loaders/MeshOptDecoder.js')).MeshOptDecoder
	loader.setMeshoptDecoder(MeshOptDecoder)

	// import { VRM, VRMUtils, VRMHumanoid, VRMLoaderPlugin } from './three-vrm.module.js'
	// loader.register((parser) => { return new VRMLoaderPlugin(parser) })
}

//
// play a requested animation - this is a very simple animation blender
//

function _play(volume,requested='default') {

	// sanity
	if(!volume || !volume.clumps || !volume.node) return
	if(typeof requested !== 'string') return
	if(requested == volume.latched) return

	// latch new player
	volume.latched = requested.length ? requested : 'default'

	// fade old?
	if(volume.action) {
		volume.action.fadeOut(0.5)
		volume.action = null
	}

	// find clip clump
	const clump = volume.clumps[requested.toLowerCase()]
	if(!clump || !clump.length) {
		console.warn(uuid,'animation clip not found!',requested)
		return
	}

	// make sure there is a mixer; also when done play default
	if(!volume.mixer) {
		volume.mixer = new THREE.AnimationMixer(volume.node)
		volume.mixer.addEventListener( 'finished', () => {
			_play(volume)
		})
	}

	// fade in clip
	const clip = clump[0]
	const action = volume.action = volume.mixer.clipAction(clip)
	action.reset()
	action.fadeIn(0.5)
	action.loop = (requested === 'default') ? THREE.LoopRepeat : THREE.LoopOnce
	action.clampWhenFinished = true
	action.play()

	// there is a case where an animation hit an end to a set of loops @todo analyze
	action.onLoop = (e) => {
		// console.log('volume - animation has reached the end possibly',requested)
		if(event.type === 'loop' && event.willLoop === false) {
			// could cross fade to something else? @todo should crossfades be manual or?
			// action.crossFadeTo(newAction, duration, false)
		}
	}
}

//
// animation update
//

function _update(volume,time,delta) {
	if(!volume || !volume.mixer || !volume.clumps || !volume.node) return
	volume.mixer.update(delta/1000)
}

export default async function animated(sys,surface,volume,changes) {

	// client only
	if(surface.isServer) return

	// update?
	// @todo detect change to requested animation to play
	if(volume.node || volume._built) {
		const time = performance.now()
		const delta = volume._last_time ? (time-volume._last_time) : 0
		_update(volume,time,delta)
		if(volume.vrm) {
			volume.vrm.update(delta/1000)
		}
		volume._last_time = time
		return
	}
	volume._built = true

	// I use this approach because this code can run on a server and needs to exit gracefully
	const THREE = getThree()
	if(!THREE) return

	const loader = surface.loader || (surface.loader = await getLoader())

	//
	// Placeholder @todo switch below to be async?
	//

	const geometry = new THREE.SphereGeometry( 1, 32, 16 )
	const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } )
	const sphere = new THREE.Mesh( geometry, material )
	surface.scene.add( sphere )

	//
	// Real geometry
	// @todo should publish a loaded event instead of running synchronously
	//

	const gltf = await loader.loadAsync(volume.url)

	if(!gltf || !gltf.scene) {
		console.error('volume::gltf: cannot load',volume.url)
		return
	}

	// hack - don't delete meshes
	gltf.scene.traverse((child) => { if ( child.type == 'SkinnedMesh' ) { child.frustumCulled = false; } })

	// remember the root node although it is not used directly - but animations will need it
	volume.original = gltf

	// use this node for rendering, avoiding other errata such as cameras and lights in this file
	const node = volume.node = gltf.scene

	// set vrm if any - disabled for now but easy to turn back on by setting this - make sure to include vrm loaders
	const vrm = volume.vrm = null

	// rewrite the hopefully durable volume handle with live pose state; for ease of use
	bindPose(volume)

	// add to scene
	surface.scene.add(volume.node)

	// remove placeholder
	surface.scene.remove( sphere )

	// load animations - merge in any from the main gltf also
	const clumps = volume.clumps = await load_animations(loader,volume,gltf.animations)

	// find all the bones
	volume.bones = copy_bones(node,vrm)

	// find all the morph targets - can occur prior to finding bones
	volume.targets = {}
	volume.morphs = {}
	volume.dictionary = {}
	Object.assign(volume,morph_targets(node,vrm))

	// features related to loaded files that are human like
	{

		// vrms decided to go their own way in how the structure the transform hierarchy
		retarget_vrm(node,clumps,vrm)

		// some cleanup - do this last
		misc_cleanup(node,clumps)

		// eyes for gaze
		// head, neck, body
		volume.left_eye = volume.bones["LeftEye"]
		volume.right_eye = volume.bones["RightEye"]

	}

	// start play of default animation by default
	_play(volume)

}
