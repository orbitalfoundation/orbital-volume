
const uuid = 'puppet-animation'

const cache = {}

//
// load some animations once only ever - returning a hash of { key: array of clips }
//

async function _load_raw_animations(animations={}) {

	// result set
	const clumps = {}

	// paranoia checks
	if(!animations) return {}
	if(!Array.isArray(animations) || typeof animations === 'object') {
		console.error(uuid,'corrupt target')
		return {}
	}

	// visit each file
	for(const [key,value] of Object.entries(animations)) {

		// it is legal to have empty keys
		if(!value) {
			console.warn(uuid,"empty key",key,value)
			clumps[key] = null
			continue
		}

		if(Array.isArray(value)) {
			console.error(uuid,"unsupported type")
			continue
		}

		// vanilla clip?
		let filename
		let subclip = null
		if(typeof value === 'string' || value instanceof String) {
			filename = value
		}

		// subclip?
		else if(typeof value === 'object') {
			subclip = value
			filename = value.path
			if(!filename) {
				console.error(uuid,"bad subclip",filename,key,value)
				continue
			}
		}

		// find named collection in global cache?
		let clump = cache[filename]

		// load?
		if (!clump) {

			cache[filename] = clump = []

			try {
				if(filename.endsWith(".json")) {
					const response = await fetch(filename)
					const json = await response.json()
					json.forEach((jsonclip) => {
						let clip = THREE.AnimationClip.parse(jsonclip)
						clip._scene = null
						clump.push(clip)
					})
				} else if(filename.endsWith(".glb") || filename.endsWith(".gltf")) {
					let blob = await globalThis.gltfloader.loadAsync(filename)
					blob.animations.forEach(clip => {
						clip._scene = blob.scene
						clump.push(clip)
					})
				} else if(filename.endsWith(".fbx")) {
					let blob = await globalThis.fbxloader.loadAsync(filename)
					for(let clip of blob.animations) {
						clip._scene = blob.scene
						clump.push(clip)
					}
				}
			} catch(err) {
				console.error(uuid,"cannot load animation file",filename,err)
			}
		}

		// valid?
		if(!clump || !clump.length) {
			console.error(uuid,'loaded clips are too short',filename,clump)
			continue
		}
		//console.log(uuid,'loaded clips',filename)

		// for now throw away all except first
		let clip = clump[0]

		// snip out a piece?
		if(subclip && subclip.hasOwnProperty('start') && subclip.hasOwnProperty('end')) {
			clip = THREE.AnimationUtils.subclip(clip,key+"clipped",0,20)
		}

		// stash just one for now @todo improve
		clumps[key.toLowerCase()] = [ clip ]
	}

	return clumps
}


//
// attempt to blend to a new animation - very crude animation engine
//
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

function _update(volume,time,delta) {
	if(!volume || !volume.mixer || !volume.clumps || !volume.node) return
	volume.mixer.update(delta/1000)
}

///
/// given a volume component, load animations and write some state into that volume component
///
/// @todo note this is critical state but there is no formal schema for a volume component yet
///

async function _load(volume,built_in=null) {

	if(!volume) return

	if(volume.animations) {
		volume.clumps = _load_raw_animations(volume.animations)
	} else {
		volume.clumps = {}
	}
	const clumps = volume.clumps

	if(built_in && built_in.length) {
		for(let clip of built_in) {
			clumps[clip.name] = [clip]
		}
	}

	const values = Object.values(clumps)
	if(values && values.length && !clumps.hasOwnProperty('default')) {
		clumps['default'] = values[0]
	}
}

//
// animate volume geometry
//

function resolve(blob) {

	const volumes = this._volumes

	// update
	if(blob.tick) {
		volumes.forEach(volume=>{
			animation_update(volume)
		})
	}

	// obliterate?
	if(blob.obliterate && blob.uuid && volumes[blob.uuid]) {
		delete volumes[blob.uuid]
		// stop animations @todo
		return
	}

	// track volumes that have uuids
	// @todo overall it should be possible to change animations rather than set once
	if(blob.volume && blob.uuid && blob.animations && !volumes[blob.uuid]) {
		console.log(uuid,'loading animations for',blob.uuid)
		volumes[blob.uuid] = blob
		animation_loader(volume)
		animation_play(volume,'default')
	}

	// @todo detect change requests

}

export const volume_animation_system = {
	uuid,
	resolve,
	_volumes
}
