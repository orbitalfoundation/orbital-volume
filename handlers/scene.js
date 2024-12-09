
const uuid = 'orbital/orbital-volume/scene'

import { getThree } from './three-helper.js'

//
// handle scene related events
//

export default async function scene(sys,surface,volume) {

	// only run on clients
	if(surface.isServer) {
		return
	}

	// if a surface exists just update it - @todo handle obliterate
	// requestAnimationFrame() is called elsewhere and this is called for us when it is time to repaint
	if(surface.renderer) {
		if(surface.controls) {
			surface.controls.update()
		}
		surface.renderer.render(surface.scene,surface.camera)
		return
	}

	// get 3js
	const THREE = getThree()
	if(!THREE) return

	//
	// find or build a parent dom element that the 3d view will be attached to
	//

	let div = surface.div = document.getElementById(surface.name)
	if(!div) {
		div = surface.div = document.createElement("div")
		div.style = "width:100%;height:100%;padding:0px;margin:0px;position:absolute;top:0;left:0;"
		div.id = surface.name
		div.innerHTML = "3d view"
		document.body.appendChild(div)
	}
	const width = div.clientWidth
	const height = div.clientHeight

	//
	// build renderer with its own dom element that will be appended to the div
	//

	const renderer = surface.renderer = new THREE.WebGLRenderer({
		antialias: false,
		preserveDrawingBuffer: true,
		alpha: volume.hasOwnProperty('alpha') ? volume.alpha : false
	})
	//renderer.autoClearColor = false
	renderer.setClearColor(volume.background || 0xfff0ff, 0);
	renderer.setSize(width,height)
	renderer.setPixelRatio(window.devicePixelRatio)

	//
	// nicer rendering - off for now due to alpha transparency desires
	//

	if(false) {
		surface.renderer.outputColorSpace = THREE.SRGBColorSpace
		surface.renderer.outputEncoding = THREE.sRGBEncoding
		surface.renderer.toneMapping = THREE.ACESFilmicToneMapping
		surface.renderer.shadowMap.enabled = false
		surface.renderer.useLegacyLights = false
	}
	div.append(renderer.domElement)

	//
	// build a 3js scene node which is mandatory
	//

	const scene = surface.scene = new THREE.Scene()
	scene.background = new THREE.Color(volume.background || 0x000000)

	//
	// Default room lighting
	//

	if(false) {
		const RoomEnvironment = (await import('three/addons/environments/RoomEnvironment.js')).RoomEnvironment
		const pmremGenerator = new THREE.PMREMGenerator( renderer )
		pmremGenerator.compileEquirectangularShader()
		scene.environment = pmremGenerator.fromScene( new RoomEnvironment() ).texture
	}

	//
	// build a default camera that can be attached to a controllable camera proxy later
	//

	const fov = volume.aperture || 35
	const near = volume.near || 0.01
	const far = volume.far || 100
	const aspect = width / height
	const camera = surface.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)

	const cameraPosition = volume.cameraPosition || [10,10,10]
	const cameraTarget = volume.cameraTarget || [0,0,0]
	const cameraMin = volume.cameraMin || 1
	const cameraMax = volume.cameraMax || 1000
	camera.position.set(...cameraPosition)
	camera.lookAt(new THREE.Vector3(...cameraTarget))
	camera.cameraTarget = surface.cameraTarget = cameraTarget // remember this for now
	scene.add(camera)

	let controls = null
	if(camera) {
		const OrbitControls = (await import('three/addons/controls/OrbitControls.js')).OrbitControls
		controls = surface.controls = new OrbitControls(camera, renderer.domElement)
		controls.target = new THREE.Vector3(...cameraTarget)
		controls.enableZoom = true
		controls.enableRotate = true
		controls.enableDamping = true
		controls.enablePan = true
		controls.autoRotateSpeed = 0
		controls.autoRotate = false
		controls.dampingFactor = 0.05
		controls.screenSpacePanning = false
		controls.minDistance = cameraMin
		controls.maxDistance = cameraMax
		//controls.maxPolarAngle = Math.PI / 2
		controls.update()
	}

	//
	// helpers
	//

	if(volume.axes && THREE.GridHelper && THREE.AxesHelper) {
		scene.add( new THREE.GridHelper( 16, 16 ) )
		scene.add( new THREE.AxesHelper( 8 ) )
	}

	//
	// attach this all to the display
	//

	div.appendChild(renderer.domElement)

	//
	// a resize observer leveraging https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
	//

	const resized = () => {
		surface.width = div.clientWidth
		surface.height = div.clientHeight
		camera.aspect = width / height
		camera.updateProjectionMatrix()
		renderer.setSize(width,height)
		if(controls) controls.update()
		renderer.render(scene,camera)
	}

	new ResizeObserver(resized).observe(div)
}





