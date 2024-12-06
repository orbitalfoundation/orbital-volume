import { getThree, buildMaterial, bindPose } from './three.js'

//
// bring in loaders on client only
// @todo these extra hoops are not strictly needed anymore; the entire file is client side now
//

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

export default async function gltf(sys,surface,volume) {

	// only run on clients, and also only create once
	if(surface.isServer || volume.node || !surface.scene) return

	const THREE = getThree()

	const loader = surface.loader || (surface.loader = await getLoader())

	//
	// Placeholder
	//

	const geometry = new THREE.SphereGeometry( 1, 32, 16 );
	const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
	const sphere = new THREE.Mesh( geometry, material );
	surface.scene.add( sphere );

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

	// remember anims since the gltf loader stuffs them into a weird location
	volume._animations = gltf.animations

	// use this node, avoiding other errata
	volume.node = gltf.scene

	// rewrite the hopefully durable volume handle with live pose state; for ease of use
	bindPose(volume)

	// add to scene
	surface.scene.add(volume.node)

	// remove placeholder
	surface.scene.remove( sphere )

	// seems harmless to start built in animations if desired
	if(gltf.animations && gltf.animations.length && volume.animation === 'builtin') {
		try {
			const mixer = volume._mixer = new THREE.AnimationMixer(volume._node)
			const action = volume._action = mixer.clipAction(gltf.animations[0])
			action.reset()
			action.loop = THREE.LoopRepeat
			action.play()
		} catch(err) {
			console.error('volume::gltf:animation err',err)
		}
	}

}

