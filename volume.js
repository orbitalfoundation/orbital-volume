
const uuid = '/orbital/orbital-volume'

const isServer = (typeof window === 'undefined') ? true : false

import file from './handlers/file.js'
import layer from './handlers/layer.js'
import light from './handlers/light.js'
import scene from './handlers/scene.js'

const handlers = { file, layer, light, scene }

let id = 1

async function resolve(blob,sys) {

	// volume update helper
	const update = async (volume,changes)=> {

		let handler = handlers[volume.geometry]
		if(!handler) return

		// volumes always have a surface
		const name = volume.surface || 'volume001'
		const surface = this._surfaces[name] || (this._surfaces[name] = {name,isServer})

		// update
		await handler(sys,surface,volume,changes)
	}

	// react to tick
	if(blob.tick) {
		const volumes = Object.values(this._volumes)
		for(const volume of volumes) {
			await update(volume,null)
		}
	}

	// react to changes on a volume
	if(blob.volume) {
		// for now grant a uuid - @todo loader should do this or we should throw an error
		let uuid = blob.uuid
		if(!uuid) {
			uuid = blob.uuid = blob._metadata ? `${blob._metadata.key}` : `volume-${id++}`
		}
		// find previous volume if any and update changes
		let volume = this._volumes[uuid]
		if(!volume) {
			volume = this._volumes[uuid] = blob.volume
		}
		// apply changes
		await update(volume,blob.volume)
		// delete if desired
		if(blob.obliterate) {
			delete this._volumes[uuid]
		}
	}
}

// @tbd
function volume_time(blob) {
}

// @tbd
function volume_query() {
}

// @tbd - formalize schema?

/*
	schema: {
		volume: {
			geometry: "",
			pose: {},
			node {},
			animated: {
				vrm: {},
				original: {},
				animations: {},
				morphs: {},
				dictionary: {},
				targets: {},
				body: {},
				head: {},
				neck: {},
				left_eye: {},
				right_eye: {},
			}
		}
	}
*/

///
/// volume system
///
/// observe and react to volume components on entities
///

export const volume_system = {
	uuid,
	resolve,
	_volumes: {},
	_surfaces: {},
}





