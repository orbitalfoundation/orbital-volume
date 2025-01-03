
const uuid = 'orbital/orbital-volume/scene'

import { getThree } from './three-helper.js'

//
// handle scene related events such as finding a rendering div and setting up a camera and updates
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

	// only run once for now - allow revisions in the future @todo
	if(surface._built) return
	surface._built = true

	//
	// find a dom element to bind to by name and build renderer
	//

	let div = surface.div = document.getElementById(surface.name)

	if(!div) {
		div = surface.div = document.createElement("div")
		div.style = "width:100%;height:100%;padding:0px;margin:0px;position:absolute;top:0;left:0;"
		div.id = surface.name
		document.body.appendChild(div)
	}
	const alpha = volume.hasOwnProperty('alpha') ? volume.alpha : false
	const background = volume.hasOwnProperty('background') ? volume.background : 0x000000
	const render_args = {
		antialias: false,
		preserveDrawingBuffer: true,
		alpha,
	}

	const canvas = div instanceof HTMLCanvasElement ? div : null
	if(canvas) {
		render_args.canvas = canvas
	}

	const renderer = surface.renderer = new THREE.WebGLRenderer(render_args)

	// this is an issue for transparent backdrops - disabled for now
	//renderer.autoClearColor = false

	// for transparent backdrops must not set clear color
	if(background != 'transparent') {
		renderer.setClearColor(background)
	}

	//
	// Better low level color space support - also causes issues with transparent backdrops
	//

	if(volume.prettier) {
		surface.renderer.outputColorSpace = THREE.SRGBColorSpace
		surface.renderer.outputEncoding = THREE.sRGBEncoding
		surface.renderer.toneMapping = THREE.ACESFilmicToneMapping
		surface.renderer.shadowMap.enabled = true
		surface.renderer.useLegacyLights = false
	}

	//
	// build scene
	//

	const scene = surface.scene = new THREE.Scene()
	if(background != 'transparent') {
		scene.background = new THREE.Color(background)
	}

	//
	// Scene lighting feature - this causes issues with transparent backdrops
	//

	if(volume.roomlighting) {
		const RoomEnvironment = (await import('three/addons/environments/RoomEnvironment.js')).RoomEnvironment
		const pmremGenerator = new THREE.PMREMGenerator( renderer )
		pmremGenerator.compileEquirectangularShader()
		scene.environment = pmremGenerator.fromScene( new RoomEnvironment() ).texture
	}

	//
	// adjust renderer size/aspect
	//

	surface.width = div.clientWidth || volume.width || 512
	surface.height = div.clientHeight || volume.height || 512
	surface.aspect = surface.width / surface.height
	//renderer.setSize(surface.width,surface.height)
	//renderer.setPixelRatio(window.devicePixelRatio)

	//
	// build default camera
	//

	const fov = volume.aperture || 35
	const near = volume.near || 0.01
	const far = volume.far || 100
	const camera = surface.camera = new THREE.PerspectiveCamera(fov, surface.aspect, near, far)
	scene.add(camera)

	//
	// other helpers
	//

	if(volume.axes && THREE.GridHelper && THREE.AxesHelper) {
		scene.add( new THREE.GridHelper( 16, 16 ) )
		scene.add( new THREE.AxesHelper( 8 ) )
	}

	//
	// resize observer leveraging https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
	//

	const resized = () => {
		if(!div.clientWidth || !div.clientHeight) return
		surface.width = div.clientWidth || volume.width || 512
		surface.height = div.clientHeight || volume.height || 512
		surface.aspect = surface.width / surface.height
		if(surface.camera) {
			surface.camera.aspect = surface.aspect
			surface.camera.updateProjectionMatrix()
		}
		renderer.setSize(surface.width,surface.height)
		renderer.render(surface.scene,surface.camera)
	}

	surface.resizeObserver = new ResizeObserver(resized).observe(div)

	//
	// attach this all to the display
	//

	if(!canvas) {
		div.appendChild(renderer.domElement)
	}
}

