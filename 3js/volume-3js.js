
import * as THREE from './three/three.module.js';
globalThis.THREE = THREE

import { GLTFLoader } from './three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from './three/addons/loaders/KTX2Loader.js'
import { DRACOLoader } from './three/addons/loaders/DRACOLoader.js'
import { FBXLoader } from './three/addons/loaders/FBXLoader.js'
import './meshopt_decoder.js'
import { OrbitControls } from './three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from './three/addons/environments/RoomEnvironment.js'
import { VRM, VRMUtils, VRMHumanoid, VRMLoaderPlugin } from './three-vrm.module.js'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// GLTF Loader helpers
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const loader = globalThis.gltfloader = typeof GLTFLoader !== 'undefine' ? new GLTFLoader() : null
const fbxloader = globalThis.fbxloader = typeof FBXLoader !== 'undefined' ? new FBXLoader() : null

loader.setCrossOrigin('anonymous')

if(typeof DRACOLoader !== 'undefined') {
	const dracoLoader = new DRACOLoader()
	dracoLoader.setDecoderPath("/zones/volume/volume-3js/dracolibs/") // @todo hack
	loader.setDRACOLoader(dracoLoader)
	//console.log('volume - set draco loader')
}

if(typeof KTX2Loader !== 'undefined') {
	const ktx2Loader = new KTX2Loader()
	ktx2Loader.setTranscoderPath("/zones/volume/volume-3js/ktx2loaderlibs/") // @todo hack
	//ktx2Loader.detectSupport(this.renderer) // annoyingly stupid design of this library
	loader.setKTX2Loader(ktx2Loader)
	//console.log('volume - set ktx2loader')
}

if(typeof globalThis.MeshoptDecoder !== 'undefined') {
	loader.setMeshoptDecoder( globalThis.MeshoptDecoder )
	//console.log('volume - set meshopt decoder')
}

loader.register((parser) => { return new VRMLoaderPlugin(parser) })

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///
/// A volume represents a 3d scene with objects - there can be more than one on a given web page - a default is used if none specified
///
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class VolumeManager {

	uuid = 0
	volumes = {}
	parentDiv = null


	///
	/// init 3js scene with fundamental features
	///

	constructor (name="volume001",opt = { cameraHeight: 1.5, cameraDistance: 5 }) {

		if(!name) {
			console.error('volume - must have some kind of dom name')
			name = "volume001"
		}

		// does dom have the manager dom element?
		let parentDiv = this.parentDiv = document.getElementById(name)

		// force create if none
		if(!parentDiv) {
			//console.log("volume: taking over entire display because no parent html element was provided/found",name)
			parentDiv = this.parentDiv = document.createElement("div")
			parentDiv.style = "width:100%;height:100%;padding:0px;margin:0px;position:absolute;top:0;left:0"
			parentDiv.id = name
			document.body.appendChild(parentDiv)
		} else {
			//console.log("volume: attaching to a provided html node for rendering",name)
		}

		//
		// renderer
		//

		const renderer = this.renderer = new THREE.WebGLRenderer({
			antialias: true,
			//preserveDrawingBuffer: true,
			alpha: true
		})
		renderer.autoClearColor = false
		renderer.setClearColor(0xffffff, 0);
		renderer.setSize(parentDiv.clientWidth, parentDiv.clientHeight)
		renderer.setPixelRatio(window.devicePixelRatio)
		if(false) {
			this.renderer.outputColorSpace = THREE.SRGBColorSpace
			this.renderer.outputEncoding = THREE.sRGBEncoding
			this.renderer.toneMapping = THREE.ACESFilmicToneMapping
			this.renderer.shadowMap.enabled = false
			this.renderer.useLegacyLights = false
		}
		parentDiv.append(renderer.domElement)
		new ResizeObserver(this._resize.bind(this)).observe(this.parentDiv)

		//
		// scene
		//

		const scene = this.scene = new THREE.Scene();
		scene.background = new THREE.Color(0xffffff);

		if(true) {
			const pmremGenerator = new THREE.PMREMGenerator( this.renderer )
			pmremGenerator.compileEquirectangularShader()
			this.scene.environment = pmremGenerator.fromScene( new RoomEnvironment() ).texture
		}

		//
		// camera
		//

		const fov = 35
		const near = 0.01
		const far = 100
		const aspect = parentDiv.clientWidth / parentDiv.clientHeight
		const camera = scene.camera = this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
		camera.position.set(0,opt.cameraHeight,-opt.cameraDistance)
		camera.target = new THREE.Vector3(0,opt.cameraHeight,0)
		camera.focus = {
			xyz: [0,opt.cameraHeight,0],
			ypr: [0,0,0],
			node:false,
			when:0,
			latched:true,
		}
		this._camera_update()
		if(camera) {
			this.controls = new OrbitControls( camera, this.renderer.domElement )
			this.controls.enableZoom = true
			this.controls.enableRotate = true
			this.controls.enablePan = true
			this.controls.minDistance = 0.1
			this.controls.maxDistance = far
			this.controls.autoRotateSpeed = 0
			this.controls.autoRotate = false
		}
		scene.add(camera)

		//
		// default light
		//

		const light = this.light = new THREE.DirectionalLight( 0xffffff, Math.PI );
		light.position.set( 1.0, 1.0, -1.0 ).normalize();
		scene.add( light );

		//
		// helpers
		//

		//const gridHelper = new THREE.GridHelper( 10, 10 );
		//scene.add( gridHelper );

		//const axesHelper = new THREE.AxesHelper( 5 );
		//scene.add( axesHelper );

	}

	///
	/// advance all 3d ojects managed here over time
	///

	step(time=0,delta=0) {

		// update built in animations
		Object.values(this.volumes).forEach(volume=>{
			if(volume._mixer) volume._mixer.update(delta/1000)
		})

		// update camera if needed
		this._camera_update()

		// reprint the scene
		this.renderer.render( this.scene, this.camera )
	}

	//
	// browser window resized?
	//

	_resize() {
		this.camera.aspect = this.parentDiv.clientWidth / this.parentDiv.clientHeight
		this.camera.updateProjectionMatrix()
		this.renderer.setSize( this.parentDiv.clientWidth, this.parentDiv.clientHeight )
		if(this.controls)this.controls.update()
		this.renderer.render( this.scene, this.camera )
	}

	//
	// work around some issues with wanting orbit and nav at the same time - improve later @todo
	//

	_camera_update() {

		const camera = this.camera
		const focus = camera.focus

		// may move camera
		if(focus.latched) {

			// get target position
			const target = new THREE.Vector3(...focus.xyz)
			// distance to it desired
			let distance = 5 // camera.position.distanceTo(target)
			// orientation we want to be behind it
			let rot = new THREE.Quaternion().setFromEuler( new THREE.Euler(...focus.ypr))
			// form a vector describing that rotation at a distance
			const v = new THREE.Vector3(0,0,-distance).applyQuaternion(rot)
			// this is the target position plus that vector
			const ideal = target.clone().add(v)

			camera.position.set(ideal.x,ideal.y,ideal.z)
			//camera.position.x += (ideal.x - camera.position.x ) / 2
			//camera.position.y += (ideal.y - camera.position.y ) / 2
			//camera.position.z += (ideal.z - camera.position.z ) / 2

			// update lookat
			//camera.target.x += (focus.xyz[0] - camera.target.x) / 2
			//camera.target.y += (focus.xyz[1] - camera.target.y) / 2
			//camera.target.z += (focus.xyz[2] - camera.target.z) / 2
			camera.target.x = focus.xyz[0]
			camera.target.y = focus.xyz[1]
			camera.target.z = focus.xyz[2]

			camera.lookAt(camera.target.x,camera.target.y,camera.target.z)
			if(this.controls) {
				this.controls.target.set(camera.target.x,camera.target.y,camera.target.z)
			}
		}

		focus.latched = false

		// update controls
		if(this.controls) {
			this.controls.update()
		}

		// hide or show target
		if(focus.node) {
			let distance = camera.position.distanceTo(camera.target)
			focus.node.visible = distance < 2 ? false : true
		}

	}


	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//
	// update geometry - also load gltfs
	//
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	async _update_geometry(volume) {

		if(volume.light && !volume._node) {
			// @todo improve - this is just set once and clearly should be more reactive
			volume._node = this.light
		}

		else if(volume.camera && !volume._node) {
			// @todo improve - this is just set once and clearly should be more reactive
			volume._node = this.camera
		}

		// assign geometry and load art
		// @todo this runs once only for now improve later

		else if( volume.geometry &&
				!volume._node &&
				!volume._node_tried_load &&
				(volume.geometry.endsWith(".glb") || volume.geometry.endsWith(".gltf") || volume.geometry.endsWith(".vrm") )
		) {
			volume._node_tried_load = true

			const path = volume.geometry

			//console.log("volume-3js: loading",volume.geometry,path)

			const gltf = await loader.loadAsync( path )

			if(!gltf || !gltf.scene) {
				console.error("volume-3js: cannot load",volume.geometry)
				return
			}

			// specifically force these not to be culled
			gltf.scene.traverse((child) => { if ( child.type == 'SkinnedMesh' ) { child.frustumCulled = false; } })

			// track shared camera - this may need rethinking @todo
			volume._camera = this.camera

			// track built-in animations
			volume._built_in_animations = gltf.animations

			// support ordinary gltfs
			if(!gltf.userData || !gltf.userData.vrm) {
				volume._node = gltf.scene
			}

			// special support for vrms
			else {

				const vrm = gltf.userData.vrm

				// vrm 0.0 rigs are rotated backwards due to a bug - for now let's not support vrm 0.0 at all
				if(false) {
					const bones = vrm.humanoid.rawHumanBones
					vrm.humanoid.normalizedHumanBonesRoot.removeFromParent()
					bones.hips.node.rotateY(Math.PI)
					vrm.humanoid = new VRMHumanoid(bones)
					vrm.update(100)
				}

				// calling these functions greatly improves the performance but fails because of draco and other extension loaders
				//VRMUtils.removeUnnecessaryVertices( gltf.scene );
				//VRMUtils.removeUnnecessaryJoints( gltf.scene );

				// do not try hide parts of models - often it will make parts of them invisible due to scale issues with frustrum dist
				vrm.scene.traverse( ( obj ) => { obj.frustumCulled = false })

				// use the vrm.scene (not the gltf.scene)
				volume._node = vrm.scene

				// separately track the vrm itself 
				volume._vrm = vrm
			}

			// add to scene
			this.scene.add(volume._node)

			// play built in animations in some cases
			if(gltf.animations && gltf.animations.length && volume.animation === 'builtin') {
				try {
					const mixer = volume._mixer = new THREE.AnimationMixer(volume._node)
					const action = volume._action = mixer.clipAction(gltf.animations[0])
					action.reset()
					action.loop = THREE.LoopRepeat
					action.play()
					//console.log('volume 3js - playing a built in animation',volume.uuid,gltf.animations[0])
				} catch(err) {
					console.error(err)
				}
			}

			//console.log("volume-3js - fully loaded asset",volume.uuid)
		}

	}

	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//
	// apply changes to 3js
	//
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	_update_pose(volume) {

		// must have a node
		if(!volume._node) {
			console.warn("volume-3js - missing props",volume)
			return
		}

		// inject if does not exist
		if(!volume.transform) {
			volume.transform = { xyz:[0,0,0], ypr:[0,0,0], whd:[0,0,0]}
		}

		const transform = volume.transform
		const node = volume._node

		// @todo could allow update of quaternion itself say by passing rot

		// update ypr? - order of ypr is wrong @todo
		if(transform.ypr && node.rotation && !(node.rotation.x == transform.ypr[0] && node.rotation.y == transform.ypr[1] && node.rotation.z==transform.ypr[2])) {
			node.rotation.x = transform.ypr[0]
			node.rotation.y = transform.ypr[1]
			node.rotation.z = transform.ypr[2]
		}

		// update xyz?
		if(transform.xyz && node.position && !(node.position.x == transform.xyz[0] && node.position.y == transform.xyz[1] && node.position.z==transform.xyz[2])) {
			node.position.x = transform.xyz[0]
			node.position.y = transform.xyz[1]
			node.position.z = transform.xyz[2]
		}

		// update scale?
		if(transform.whd && node.scale && !(node.scale.x == transform.whd[0] && node.scale.y == transform.whd[1] && node.scale.z==transform.whd[2])) {
			node.scale.x = transform.whd[0]
			node.scale.y = transform.whd[1]
			node.scale.z = transform.whd[2]
		}

		// pull in properties from supplied focus if any
		if(volume.hasOwnProperty('focus') && this.camera) {
			this.camera.focus.latched = true
			this.camera.focus.when = performance.now()
			this.camera.focus.node = node
			this.camera.focus.xyz = volume.focus.xyz
			this.camera.focus.ypr = volume.focus.ypr
			//this.camera.focus = { ...this.camera.focus, volume.focus, node, when: performance.now(), latched:true }
		}
	}

	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//
	// have 3js react to changes on a given volume
	//
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	async resolve(volume,parent=null) {

		if(!volume.uuid) {
			console.error('volume - volume must have uuid',volume)
			return
		}

		// apply changes - @todo can i make art load async?
		await this._update_geometry(volume)

		// update pose after geometry loaded
		this._update_pose(volume)

		// update children?
		for(let i = 0; volume.children && i < volume.children.length; i++) {
			const child = volume.children[i].volume ? volume.children[i].volume : volume.children[i]
			child.uuid = `${volume.uuid}/${i++}`
			await this.resolve(child,volume)
		}
	}

	//
	// delete
	//

	obliterate(volume) {

		if(!volume.uuid) {
			console.error('volume - volume must have uuid',volume)
			return
		}

		console.log("volume-3js: being asked to destroy",volume)

		for(const child of volume.children) {
			this.obliterate(child.volume ? child.volume : child)
		}

		delete this.volumes[volume.uuid]
		delete _volumes[volume.uuid]

		if(!volume._node) return
		if(this.camera && this.camera.focus && this.camera.focus.node === volume._node) camera.focus.node = null
		volume._node.removeFromParent()
		volume._node = null
	}
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// volume manager helper - find the right manager
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const _volume_managers = {}
const _volumes = {}

function _volume_manager_get(volume) {

	// return manager if bound
	let manager = _volumes[volume.uuid]
	if(manager) {
		return manager
	}

	// volumes are associated with some manager either explicitly or implicitly
	const name = volume.dom && volume.dom.length ? volume.dom : "volume001"

	// build a manager?
	manager = _volume_managers[name]
	if(!manager) {
		manager = _volume_managers[name] = new VolumeManager(name)
	}

	// associate with volume
	_volumes[volume.uuid] = manager
	manager.volumes[volume.uuid] = volume
	return manager
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///
/// Volume observer
///		- handle tick events
///		- also handle changes to a volume
///
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const volume_observer = {

	about: 'volume observer using 3js',
	resolve: async (blob,sys) => {

		// advance volume systems?
		if(blob.tick) {
			Object.values(_volume_managers).forEach(manager=>{
				manager.step(blob.time,blob.delta)
			})
			return
		}

		// a request to change a valid volume?
		if(!blob.volume || !blob.uuid || !blob._entity || !blob._entity.volume) {
			return
		}

		// operate on whole volume not just changes
		const volume = blob._entity.volume

		// stuff the uuid into the volume for convenience
		volume.uuid = blob.uuid

		// find appropriate manager
		let manager = _volume_manager_get(volume)

		if(blob._entity.obliterate) {
			manager.obliterate(volume)
			return
		}

		await manager.resolve(volume)
	}
}

