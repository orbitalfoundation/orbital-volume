
import * as THREE from './three/three.module.js';

const mixamoVRMRigMap = {
  Hips: 'hips',
  Spine: 'spine',
  Spine1: 'chest',
  Spine2: 'upperChest',
  Neck: 'neck',
  Head: 'head',
  LeftShoulder: 'leftShoulder',
  LeftArm: 'leftUpperArm',
  LeftForeArm: 'leftLowerArm',
  LeftHand: 'leftHand',
  LeftHandThumb1: 'leftThumbMetacarpal',
  LeftHandThumb2: 'leftThumbProximal',
  LeftHandThumb3: 'leftThumbDistal',
  LeftHandIndex1: 'leftIndexProximal',
  LeftHandIndex2: 'leftIndexIntermediate',
  LeftHandIndex3: 'leftIndexDistal',
  LeftHandMiddle1: 'leftMiddleProximal',
  LeftHandMiddle2: 'leftMiddleIntermediate',
  LeftHandMiddle3: 'leftMiddleDistal',
  LeftHandRing1: 'leftRingProximal',
  LeftHandRing2: 'leftRingIntermediate',
  LeftHandRing3: 'leftRingDistal',
  LeftHandPinky1: 'leftLittleProximal',
  LeftHandPinky2: 'leftLittleIntermediate',
  LeftHandPinky3: 'leftLittleDistal',
  RightShoulder: 'rightShoulder',
  RightArm: 'rightUpperArm',
  RightForeArm: 'rightLowerArm',
  RightHand: 'rightHand',
  RightHandPinky1: 'rightLittleProximal',
  RightHandPinky2: 'rightLittleIntermediate',
  RightHandPinky3: 'rightLittleDistal',
  RightHandRing1: 'rightRingProximal',
  RightHandRing2: 'rightRingIntermediate',
  RightHandRing3: 'rightRingDistal',
  RightHandMiddle1: 'rightMiddleProximal',
  RightHandMiddle2: 'rightMiddleIntermediate',
  RightHandMiddle3: 'rightMiddleDistal',
  RightHandIndex1: 'rightIndexProximal',
  RightHandIndex2: 'rightIndexIntermediate',
  RightHandIndex3: 'rightIndexDistal',
  RightHandThumb1: 'rightThumbMetacarpal',
  RightHandThumb2: 'rightThumbProximal',
  RightHandThumb3: 'rightThumbDistal',
  LeftUpLeg: 'leftUpperLeg',
  LeftLeg: 'leftLowerLeg',
  LeftFoot: 'leftFoot',
  LeftToeBase: 'leftToes',
  RightUpLeg: 'rightUpperLeg',
  RightLeg: 'rightLowerLeg',
  RightFoot: 'rightFoot',
  RightToeBase: 'rightToes'
}


const hipsRegex = /hip|pelvis/i
export const recursiveHipsLookup = (model) => {
  let thing = null
  const name = model.name.toLowerCase()
  if (hipsRegex.test(name)) {
    return model
  }
  if (model.children.length > 0) {
    for (const child of model.children) {
      thing = recursiveHipsLookup(child)
      if(thing) break
    }
  }
  return thing
}

const restRotationInverse = new THREE.Quaternion()
const parentRestWorldRotation = new THREE.Quaternion()
const _quatA = new THREE.Quaternion()

function retargetAnimationClip(mixamoScene,clip) {

	const hips = recursiveHipsLookup(mixamoScene)

	const hipsPositionScale = hips.scale.y

	for (let i = 0; i < clip.tracks.length; i++) {
		const track = clip.tracks[i]
		const trackSplitted = track.name.split('.')
		const rigNodeName = trackSplitted[0]
		const rigNode = mixamoScene.getObjectByName(rigNodeName)

		mixamoScene.updateWorldMatrix(true, true)

		// Store rotations of rest-pose
		rigNode.getWorldQuaternion(restRotationInverse).invert()
		rigNode.parent.getWorldQuaternion(parentRestWorldRotation)

		if (track instanceof THREE.QuaternionKeyframeTrack) {
			// Retarget rotation of mixamoRig to NormalizedBone
			for (let i = 0; i < track.values.length; i += 4) {
				const flatQuaternion = track.values.slice(i, i + 4)
				_quatA.fromArray(flatQuaternion)
				_quatA.premultiply(parentRestWorldRotation).multiply(restRotationInverse)
				_quatA.toArray(flatQuaternion)
				flatQuaternion.forEach((v, index) => {
					track.values[index + i] = v
				})
			}
		} else if (track instanceof THREE.VectorKeyframeTrack) {
			const value = track.values.map((v) => v * hipsPositionScale)
			value.forEach((v, index) => {
				track.values[index] = v
			})
		}
	}

	return clip
}


///
/// Given an animation clip, bind it to a vrm rig
///

export const bindAnimationClipFromMixamo = (clip, vrm, scene) => {
  const tracks = []
  for (let i = 0; i < clip.tracks.length; i++) {
    const trackClone = clip.tracks[i].clone()
    const trackSplitted = trackClone.name.split('.')
    const mixamoRigName = trackSplitted[0]
    const vrmBoneName = mixamoVRMRigMap[mixamoRigName]
    const vrmNode = vrm.humanoid.getNormalizedBoneNode(vrmBoneName)
    if (vrmNode && vrmNode.name && vrmNode.name.length) {
      const propertyName = trackSplitted[1]
      trackClone.name = `${vrmNode.name}.${propertyName}`
      tracks.push(trackClone)
    }
  }
  return new THREE.AnimationClip(clip.name, clip.duration, tracks)
}


function vrm_test(volume,clip) {
	const vrm = volume._vrm
	if(!vrm || volume._started) return
	volume._started = true

	const armature = vrm.humanoid.normalizedHumanBonesRoot

	clip = retargetAnimationClip(clip._scene,clip)
	clip = bindAnimationClipFromMixamo(clip,vrm,armature)

	let mixer = new THREE.AnimationMixer(armature)

	const action = mixer.clipAction(clip)

	//action.clampWhenFinished = true

	action.play()

	setInterval( ()=> {

		mixer.update(1/60)

		armature.children[0].position.x = 0
		armature.children[0].position.y = 1
		armature.children[0].position.z = 0

		vrm.update(1/60)

	},30)


}



////////////////////////

import { fixup_path } from '../fixup-path.js'

const global_animations = {}

//
// register animations on each volume
//

export async function animations_clips_load_bind(animations,volume) {

	// don't commit these till fully ready since volume is constantly looking at the state
	let volume_animation_clips = {}

	// add built in animations
	if(animations && animations.length) {
		for(let clip of animations) {
			//console.log("volume-3js: noticed animation in the geometry file",volume.uuid,clip.name)
			volume_animation_clips[clip.name] = [clip]
		}
	}

	// add explicit animations
	if(volume.animations) {

		// wire up volume animation_clips
		for(const [key,value] of Object.entries(volume.animations)) {

			// it is legal to have empty keys
			if(!value) {
				console.warn("volume-3js empty key",volume.uuid,key,value)
				volume_animation_clips[key] = null
				continue
			}

			if(Array.isArray(value)) {
				console.error("volume-3js bad type")
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
					console.error("volume-3js - bad subclip",volume)
					continue
				}
			}

			// find named collection in global cache?
			let clips = global_animations[filename]

			// if not found then try load
			if (!clips) {

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
							clip._scene = blob.scene
							clips.push(clip)
						})
					} else if(filename.endsWith(".fbx")) {
						let blob = await globalThis.fbxloader.loadAsync(realfilename)
						for(let clip of blob.animations) {
							clip._scene = blob.scene
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

					// remove the tips because they just are not in mixamo
					// also remove the head from default only because it fights gaze() - @todo may not need to do this depending on timing
					// the last is a test for the stone glb @todo remove
					const rewrite = []
					clip.tracks.forEach(track => {
						if(key == "default" && track.name == 'Head.quaternion') return
						if(track.name.endsWith("_end.scale")) return
						if(track.name.endsWith("_end.position")) return
						if(track.name.endsWith("_end.quaternion")) return
						if(track.name.includes("_rootJoint.quaternion")) return
						if(track.name.includes("root_joint_00.quaternion")) return
						rewrite.push(track)
					})
					clip.tracks = rewrite
				})
			}

			// valid?
			if(!clips || !clips.length) {
				console.error('volume-3js - clips are too short')
				continue
			}

			// for now throw away all except first
			let clip = clips[0]

			// snip out a piece?
			if(subclip && subclip.hasOwnProperty('start') && subclip.hasOwnProperty('end')) {
				clip = THREE.AnimationUtils.subclip(clip,key+"clipped",0,20)
			}

 vrm_test(volume,clip)

			// stash
			volume_animation_clips[key] = [ clip ]
		}
	}

	// get collection
	const values = Object.values(volume_animation_clips)
	if(!values || !values.length) return

	// set a default if none
	if(!volume_animation_clips.hasOwnProperty('default')) {
		volume_animation_clips['default'] = values[0]
	}

	// activate default if nothing else was set
	if(!volume.hasOwnProperty('animation')) {
		volume.animation = 'default'
	}

	// activate overall
	volume._animation_clips = volume_animation_clips

}


//
// update anims every frame if any
//

export function animations_update(volume,time,delta) {

	// don't deal with vrms here for now
	if(volume._vrm) {
		return
	}

	// ignore?
	if(!volume._node || !volume._animation_clips || !volume.hasOwnProperty('animation')) {
		return
	}

	// update mixer?
	if(volume._mixer) {
		volume._mixer.update(delta/1000)
	}

	// no change?
	if(volume.animation === volume._animation_current_name) {
		return
	}

	console.log("volume - noticed animation has changed for",volume.uuid,volume.animation,volume._animation_current_name)

	// on finish force default
	const finished_callback = (event) => {
		const v = event.action._volume
		if(!v) {
			console.error("volume - back ref missing")
			return
		}
		if(v.animation == 'default') {
			volume._animation_current_name = null
		}
		v.animation = 'default'
	}

	// inject mixer?
	if(!volume._mixer) {
		volume._mixer = new THREE.AnimationMixer(volume._node)
		volume._mixer.addEventListener( 'finished', finished_callback )
	}

	// fade old?
	if(volume._animation_current_action) {
		volume._animation_current_action.fadeOut(0.5)
	}

	// no work to do?
	if(!volume.animation) {
		volume._animation_current_name = volume.animation = null
		return
	}

	// cannot find clip?
	const clips = volume._animation_clips[volume.animation.toLowerCase()]
	if(!clips || !clips.length) {
		volume._animation_current_name = volume.animation = null
		console.warn('volume - animation clip not found!',volume.uuid,volume.animation)
		return
	}

	// fade in clip
	const clip = clips[0]
	const action = volume._mixer.clipAction(clip)
	action._volume = volume
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

	// remember new state
	volume._animation_clip_current = clip
	volume._animation_current_name = volume.animation
	volume._animation_current_action = action

	console.log("volume - playing new animation clip",volume)
}



export class PuppetAnimation {

	constructor() {

		// - 
	}

	update() {
		// - ...
	}

}







