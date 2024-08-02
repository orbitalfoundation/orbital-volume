
import { fixup_path } from '../fixup-path.js'

const global_animations = {}

//
// register animations on each volume
//

export async function animations_clips_load_bind(volume) {

	// sanity checks - don't do work if nothing to do
	if(!volume.animations) return
	const entries = Object.entries(volume.animations)
	if(!entries.length) return

	// each volume has a one or more clips per named key
	if(!volume._animation_clips) {
		volume._animation_clips = {}
	}

	// wire up volume animation_clips
	for(const [key,filename] of entries) {

		if(!filename) {
			console.warn("volume-3js empty key",volume.uuid,key,filename)
			volume._animation_clips[key] = null
			return
		}

		// just wire up if already fetched
		let clips = global_animations[filename]
		if (clips) {
			volume._animation_clips[key] = clips
			continue
		}

		// find path - this feature may be deprecated later
		const realfilename = fixup_path(filename)

		// memoize fresh load
		global_animations[filename] = clips = []

		// load
		try {
			if(filename.endsWith(".json")) {
				const response = await fetch(realfilename)
				const json = await response.json()
				json.forEach((jsonclip) => {
					let clip = THREE.AnimationClip.parse(jsonclip)
					clips.push(clip)
				})
			} else if(filename.endsWith(".glb") || filename.endsWith(".gltf")) {
				let blob = await globalThis.gltfloader.loadAsync(realfilename)
				blob.animations.forEach(clip => {
					clips.push(clip)
				})
			} else if(filename.endsWith(".fbx")) {
				let blob = await globalThis.fbxloader.loadAsync(realfilename)
				for(let clip of blob.animations) {
					clips.push(clip)
				}
			}
		} catch(err) {
			console.error("volume-3js: cannot load animation file",fixup_path(filename),err)
		}

		// cleanup
		clips.forEach(clip=>{

			// remove mixamo prefix
			clip.tracks.forEach((track) => {
				if(track.name.startsWith('mixamo')) {
					track.name = track.name.slice(9)
					console.log("volume - removing mixamo from",filename,key)
				}
			})

			// remove a few things we don't like - @todo a bit overly specific hack
			// removing the head from default allows custom head tracker to have more weight - @todo it is a bit overly specific
			// @todo the entire animation engine could move to puppet
			const rewrite = []
			clip.tracks.forEach(track => {
				if(key == "default" && track.name == 'Head.quaternion') return
				if(track.name.endsWith("_end.scale")) return
				if(track.name.endsWith("_end.position")) return
				if(track.name.endsWith("_end.quaternion")) return
				rewrite.push(track)
			})
			clip.tracks = rewrite

		})

		if(clips.length) {
			volume._animation_clips[key] = clips
		}
	}
}


//
// update anims every frame if any
//

export function animations_update(volume,time,delta) {

	// ignore?
	// anything that has any animation at all has 'animation' explicitly set to 'default' by this engine - unless the user sets it
	// @todo right now each volume has to register its own clips - there is some argument for a shared clip namespace to reduce burden per volume
	if(!volume._node || !volume._animation_clips || !volume.hasOwnProperty('animation')) {
		return
	}

	// update mixer
	if(volume._mixer) {
		volume._mixer.update(delta/1000)
	}

	// listen to user change requests - but for now ignores re-starting an animation while it is playing
	if(volume.animation === volume._animation_current_name) {
		return
	}

	//console.log("volume - noticed animation has changed for",volume.uuid,volume.animation,volume._animation_current_name)

	// make sure mixer is running - note handling of finished state is done outside of the enclosure to avoid a stale variable
	if(!volume._mixer) {
		console.log("volume - adding mixer",volume.uuid)
		volume._mixer = new THREE.AnimationMixer(volume._node)
		volume._mixer.addEventListener( 'finished', () => {
			console.log("animation is done",volume.uuid)

			// force start default if was in default - default is on a loop so hopefully this wouldn't happen
			if(volume.animation === 'default') {
				volume._animation_current_name = null
			}

			// force kick to default - unsure what else to do - could have some kind of queue or orchestrations scheme? @todo
			volume.animation = 'default'
			//console.log("volume - reverting to default",volume)
		})
	}

	// if nothing to do then just rest
	if(!volume.animation) {
		volume._animation_current_name = volume.animation = null
		return
	}

	// find clip? do nothing if not found?
	const clips = volume._animation_clips[volume.animation]
	if(!clips || !clips.length) {
		console.warn('volume - animation clip not found!',volume.uuid,volume.animation)
		return
	}

	// start fade old if any
	if(volume._animation_current_action) {
		volume._animation_current_action.fadeOut(0.5)
	}

	// pick first clip for now - later allow more fine grained picking
	const clip = clips[0]

	// fade in
	const action = volume._mixer.clipAction(clip)
	action.reset()
	action.fadeIn(0.5)
	action.loop = volume.animation === 'default' ? THREE.LoopRepeat : THREE.LoopOnce
	action.clampWhenFinished = true
	action.play()
	action.onLoop = (e) => {
		console.log('volume - animation has reached the end possibly',volume.uuid,volume.animation,e)
		if(event.type === 'loop' && event.willLoop === false) {
			// could cross fade to something else? @todo should crossfades be manual or?
			// action.crossFadeTo(newAction, duration, false)
		}
	}

	// remember current activity
	volume._animation_clip_current = clip
	volume._animation_current_name = volume.animation
	volume._animation_current_action = action

	//console.log("volume - playing new animation clip",volume)
}
