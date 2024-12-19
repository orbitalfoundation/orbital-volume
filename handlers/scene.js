
const uuid = 'orbital/orbital-volume/scene'

import { getThree } from './three-helper.js'

//
// handle scene related events such as finding a rendering div and setting up a camera
//

export default async function scene(sys,surface,entity,delta) {

	// get 3js
	const THREE = getThree()
	if(!THREE) return

	const volume = entity.volume

	if(entity.obliterate) {

		if(surface.scene) {
			surface.scene.children.forEach( removeObject )
			surface.scene.clear()
			surface.scene = null
		}

		if(surface.resizeObserver) {
			surface.resizeObserver.disconnect()
			surface.resizeObserver = null
		}

		if(surface.renderer) {
			surface.renderer.renderLists.dispose();
		    surface.renderer.forceContextLoss();
		    surface.renderer.context = null;
		    surface.renderer.domElement = null;
		    surface.renderer.dispose();
		    surface.renderer = null;
		}

		surface.camera = null
		return
	}

	// if a surface exists just update it - @todo handle obliterate
	// requestAnimationFrame() is called elsewhere and this is called for us when it is time to repaint
	if(surface.renderer) {
		surface.renderer.render(surface.scene,surface.camera)
		return
	}

	// only run once
	if(surface._built) return
	surface._built = true

	//
	// find or build a parent dom element that the 3d view will be attached to
	//

	let div = surface.div = document.getElementById(surface.name)
	if(!div) {
		div = surface.div = document.createElement("div")
		div.style = "width:100%;height:100%;padding:0px;margin:0px;position:absolute;top:0;left:0;"
		div.id = surface.name
		document.body.appendChild(div)
	}
	const width = div.clientWidth
	const height = div.clientHeight

	//
	// build renderer with its own dom element that will be appended to the div
	//

	const alpha = volume.hasOwnProperty('alpha') ? volume.alpha : false
	const background = volume.hasOwnProperty('background') ? volume.background : 0x000000


	const renderer = surface.renderer = new THREE.WebGLRenderer({
		antialias: false,
		preserveDrawingBuffer: true,
		alpha
	})
	//renderer.autoClearColor = false
	if(background != 'transparent') {
		// for alpha must not set this
		renderer.setClearColor(background)
	}
	renderer.setSize(width,height)
	renderer.setPixelRatio(window.devicePixelRatio)

	//
	// nicer rendering - off for now due to alpha transparency desires
	//

	if(volume.prettier) {
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
	if(background != 'transparent') {
		scene.background = new THREE.Color(background)
	}

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
	// always have a default camera - can be overridden
	//

	const fov = volume.aperture || 35
	const near = volume.near || 0.01
	const far = volume.far || 100
	const aspect = width / height
	const camera = surface.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
	scene.add(camera)

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
		if(surface.camera && surface.scene) {
			surface.camera.aspect = width / height
			surface.camera.updateProjectionMatrix()
			renderer.setSize(width,height)
			renderer.render(surface.scene,surface.camera)
		}
	}

	surface.resizeObserver = new ResizeObserver(resized).observe(div)
}

