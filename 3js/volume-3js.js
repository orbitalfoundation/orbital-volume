
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

import { animations_clips_load_bind, animations_update } from './animation.js'

import { fixup_path } from '../fixup-path.js'

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
	entities = {}
	parentDiv = null

	///
	/// init 3js scene with fundamental features
	///

	constructor (name="volume001",opt = {}) {

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
		// merge options if any
		//

		this.opt = {
			cameraView: 'full',
			cameraDistance: 0,
			cameraX: 0,
			cameraY: 0,
			cameraRotateX: 0,
			cameraRotateY: 0,
			cameraRotateEnable: true,
			cameraPanEnable: false,
			cameraZoomEnable: true,
		}
		Object.assign( this.opt, opt || {} )

		//
		// start renderer
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
		// create a default scene with a default camera and default controls for now
		//

		const scene = this.scene = new THREE.Scene();
		scene.background = new THREE.Color(0xffffff);

		if(true) {
			const pmremGenerator = new THREE.PMREMGenerator( this.renderer )
			pmremGenerator.compileEquirectangularShader()
			this.scene.environment = pmremGenerator.fromScene( new RoomEnvironment() ).texture
		}

		const fov = 35
		const aspect = parentDiv.clientWidth / parentDiv.clientHeight
		const near = 0.01
		const far = 100
		const camera = this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
		//scene.add(camera) <- not needed
		scene.camera = camera
		scene.parentDiv = parentDiv

		if(true && camera) {
			this.controls = new OrbitControls( camera, this.renderer.domElement )
			this.controls.enableZoom = this.opt.cameraZoomEnable
			this.controls.enableRotate = this.opt.cameraRotateEnable
			this.controls.enablePan = this.opt.cameraPanEnable
			this.controls.minDistance = 0.1
			this.controls.maxDistance = far
			this.controls.autoRotateSpeed = 0
			this.controls.autoRotate = false
		}

		this._camera_retarget()

		//
		// create a default light so we can see what is going on - can remove later if one shows up from data driven sources - @todo
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

		// update controls
		if (this.controls) {
			this._camera_hide_near_target()
			this.controls.update()
		}

		// reprint the scene
		this.renderer.render( this.scene, this.camera )

		// update the animations after render because this allows any other manual animation code to override any given animation driven effect
		Object.values(this.entities).forEach(entity=> {
			animations_update(entity.volume,time,delta)
		})

	}

	//
	// deal witih browser window resizing
	//

	_resize() {
		this.camera.aspect = this.parentDiv.clientWidth / this.parentDiv.clientHeight
		this.camera.updateProjectionMatrix()
		this.renderer.setSize( this.parentDiv.clientWidth, this.parentDiv.clientHeight )
		if(this.controls)this.controls.update()
		this.renderer.render( this.scene, this.camera )
	}

	//
	// work around some issues with wanting orbit and nav at the same time - improve later
	//

	_camera_retarget(node=null) {

		const camera = this.camera

		if(!node) {
			camera.distance = 5
			camera.height = 1.5
			camera.targetHeight = 1.5
			camera.target = new THREE.Vector3(0,camera.targetHeight,0)
			camera.position.set(camera.target.x,camera.target.y,camera.target.z+camera.distance)
			let delta = camera.targetHeight - camera.height
			camera.lookAt(camera.target.x,camera.target.y-delta,camera.target.z)
			return
		}

		// get distance prior to the object moving and after any control or other effects
		let distance = camera.position.distanceTo( camera.target )

		// update target
		camera.target.x = node.position.x
		camera.target.y = node.position.y + camera.targetHeight
		camera.target.z = node.position.z

		// put camera behind target
		const v = new THREE.Vector3(0,0,-distance).applyQuaternion(node.quaternion)
		const p = node.position.clone().add(v)
		camera.position.set(p.x,p.y+camera.height,p.z)

		// update lookat
		camera.lookAt(camera.target.x,camera.target.y,camera.target.z)

		// adjust control lookat
		if(this.controls) {
			this.controls.target.set(camera.target.x,camera.target.y,camera.target.z)
		}

		node.visible = true
		this.latchNode = node
	}

	//
	// hide the main player if the camera is close to them
	// @todo this could move to be a player navigation code responsibility rather than here
	//

	_camera_hide_near_target() {
		if(!this.latchNode) return
		const camera = this.camera
		let distance = camera.position.distanceTo( camera.target )
		this.latchNode.visible = distance < 2 ? false : true
	}

	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//
	// observe changes to volume geometry state and make sure the display reflects those changes - also gltfs and load animations
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
		// @todo detect dynamic changes to this string later and delete previous
		// this is just a quick hack to get some art assets loaded up for now - @todo improve and make more robust

		else if( volume.geometry &&
				!volume._node &&
				!volume._node_tried_load &&
				(volume.geometry.endsWith(".glb") || volume.geometry.endsWith(".gltf") || volume.geometry.endsWith(".vrm") )
		) {
			volume._node_tried_load = true

			const path = fixup_path(volume.geometry)

			//console.log("volume-3js: loading",volume.geometry,path)

			const gltf = await loader.loadAsync( path )

			if(!gltf || !gltf.scene) {
				console.error("volume-3js: cannot load",volume.geometry)
				return
			}

			// specifically force these not to be culled
			gltf.scene.traverse((child) => { if ( child.type == 'SkinnedMesh' ) { child.frustumCulled = false; } })

			// track the gltf
			volume._gltf = gltf

			// track of camera - this may need rethinking @todo
			volume._camera = this.camera

			// support ordinary gltfs
			if(!gltf.userData || !gltf.userData.vrm) {
				volume._node = gltf.scene
				this.scene.add(gltf.scene)
			}

			// special support for vrms
			else {

				const vrm = volume._vrm = gltf.scene._vrm = gltf._vrm = gltf.userData.vrm

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

				// track the vrm.scene (not the gltf.scene)
				volume._node = vrm.scene
				this.scene.add(vrm.scene)

				//console.log("volume-3js: loaded vrm",vrm)
			}

			// remember built in animations - first animation will play unless animation:null
			if(gltf.animations) {
				if(!volume._animation_clips) volume._animation_clips = {}
				for(let clip of gltf.animations) {
					//console.log("volume-3js: noticed animation in the geometry file",volume.uuid,clip.name)
					volume._animation_clips[clip.name] = [clip]
				}
			}

			// rememmber explicitly specified animations - first animation will play unless animation:null
			await animations_clips_load_bind(volume)

			// setup and play a 'default' if none exists
			const values = volume._animation_clips ? Object.values(volume._animation_clips) : null
			if(values && values.length) {
				if(!volume._animation_clips['default']) {
					volume._animation_clips['default'] = values[0]
				}
				if(!volume.hasOwnProperty('animation')) {
					volume.animation = 'default'
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

		if(!volume.transform) {
			volume.transform = { xyz:[0,0,0], ypr:[0,0,0], whd:[0,0,0]}
		}

		if(!volume._node) {
			console.warn("volume-3js - entity missing props",volume)
			return
		}

		const transform = volume.transform
		const node = volume._node

		// for now set the xyz and ypr to target - @todo introduce real interframe update smoothing
		if(transform.target_xyz) transform.xyz = transform.target_xyz
		if(transform.target_ypr) transform.ypr = transform.target_ypr

		// if ypr has changed then set it
		// yaw pitch and roll are not mapped correctly to xyz @todo
		if(transform.ypr && node.rotation && !(node.rotation.x == transform.ypr[0] && node.rotation.y == transform.ypr[1] && node.rotation.z==transform.ypr[2])) {
			node.rotation.x = transform.ypr[0]
			node.rotation.y = transform.ypr[1]
			node.rotation.z = transform.ypr[2]
		}

		// if position has changed then set it
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

		// 

		// revise lookat? have this last since it depends on camera state
		// todo - this is a bit of a hack to operate directly on the camera - it should ideally be node set target
		//if(transform.lookat && !(node.lookat && node.lookat.x == transform.lookat[0] && node.lookat.y == transform.lookat[1] && node.lookat.z==transform.lookat[2])) {
		//	//if(node.setTarget) node.setTarget(new BABYLON.Vector3(...volume.transform.lookat))
		//	node.lookat = transform.lookat
		//}

		// set position
		// @todo only if changed
		// @todo consolidate _vrm and _gltf - test if i can use node for vrm? 
		// @todo allow multiple cameras
		// @todo consolidate the concepts here - rather than special treatment
		// @todo allow anything to lookat anything

		if(volume.camera) {
			if(transform.lookat) {
				this.camera.lookAt(...transform.lookat)
				if(this.controls) this.controls.target.set(...transform.lookat)
			}
			if(transform.xyz) {
				this.camera.position.set(...transform.xyz)
			}
		}
		else if(transform.xyz) {
			if(volume._vrm) {
				const x = transform.xyz[0]
				const y = transform.xyz[1]
				const z = transform.xyz[2]
				volume._vrm.scene.position.set(x,y,z)
			}
			else if(volume._node) {
				const x = transform.xyz[0]
				const y = transform.xyz[1]
				const z = transform.xyz[2]
				volume._node.position.set(x,y,z)
			}
		}

		if(volume.camera_follow) {
			this._camera_retarget(volume._node)
		}

	}

	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//
	// deal with changes to entities that have volumes
	//
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	async resolve_entity(entity,parent=null) {

		// ignore invalid
		if(!entity.uuid || !entity.volume) {
			console.warn('volume-3js - entity has no uuid',entity)
			return
		}

		// stuff this in for now for convenience
		entity.volume.uuid = entity.uuid

		// laboriously examine entire entity for changes and then update threejs
		await this._update_geometry(entity.volume)
		this._update_pose(entity.volume)

		// peek directly entity children and also update them
		if(!entity.children) return
		let counter = 0
		for(const child of entity.children) {
			if(!child.volume) continue
			if(!child.uuid) child.uuid = `${entity.uuid}/child-${counter++}`
			await this.resolve_entity(child,entity)
		}
	}

	//
	// delete an entity
	//

	obliterate(entity) {

		console.log("volume-3js: being asked to destroy entity",entity)

		for(const child of entity.children) {
			this.obliterate(child)
		}

		const uuid = entity.uuid
		delete _volume_entities[uuid]
		delete this.entities[uuid]

		if(entity.volume._node) {
			entity.volume._node.removeFromParent()
			entity.volume._node = null
		}
	}
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// volume manager helper - find the right manager for any given entity
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const _volume_managers = {}
const _volume_entities = {}

function _volume_manager_get(entity) {

	if(!entity.uuid || !entity.volume) {
		console.error('volume - must have uuid and volume')
		return
	}

	// return manager if bound
	let manager = _volume_entities[entity.uuid]
	if(manager) {
		return manager
	}

	// volumes are associated with some manager either explicitly or implicitly
	// a volume can indicate a manager by name
	const name = entity.volume.dom && entity.volume.dom.length ? entity.volume.dom : "volume001"

	// may bind and return
	manager = _volume_managers[name]
	if(manager) {
		manager.entities[entity.uuid] = entity
		_volume_entities[entity.uuid] = manager
		return manager
	}

	// make manager?
	manager = _volume_entities[entity.uuid] = _volume_managers[name] = new VolumeManager(name)
	manager.entities[entity.uuid] = entity
	return manager
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///
/// Volume observer
///		- handle tick events
///		- also handle changes to volumes
///		- volume isn't interested in observing transient changes but in looking at the whole entity and detecting changes itself
///
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const volume_observer = {

	about: 'volume observer using 3js',
	resolve: async (blob,sys) => {

		if(blob.tick) {
			Object.values(_volume_managers).forEach(manager=>{
				manager.step(blob.time,blob.delta)
			})
			return
		}

		if(!blob.volume) {
			return
		}

		if(!blob.uuid) {
			console.warn('volume: volume entity must have uuid')
			return
		}

		let manager = _volume_manager_get(blob)

		let entities = sys.query({uuid:blob.uuid})

		if(entities && entities.length) {
			const entity = entities[0]

			if(entity.obliterate) {
				manager.obliterate(entity)
				return
			}

			await manager.resolve_entity(entity)
		}

		return
	}
}

