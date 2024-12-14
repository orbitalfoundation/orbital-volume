
const uuid = '/orbital/orbital-volume'

const isServer = (typeof window === 'undefined') ? true : false

import camera from './handlers/camera.js'
import file from './handlers/file.js'
import layer from './handlers/layer.js'
import light from './handlers/light.js'
import prim from './handlers/prim.js'
import scene from './handlers/scene.js'

import query from './volume_query.js'

const handlers = {
	camera,
	file,
	layer,
	light,
	scene,

	sphere:prim,
	cube:prim,
	plane:prim,
	cylinder:prim,
}

let id = 1

async function resolve(blob,sys) {

	// test - for now stuff a volume helper into sys @todo revisit
	// we need some formal way to talk to some services more directly
	// maybe one should actually formally request a direct connection via sys?
	sys.volume = this

	// volume update helper
	const update = async (entity,changes)=> {

		let handler = handlers[entity.volume.geometry]
		if(!handler) return

		// volumes always have a surface
		const name = entity.volume.surface || 'volume001'
		const surface = this._surfaces[name] || (this._surfaces[name] = {name,isServer})

		// update
		await handler(sys,surface,entity.volume,changes ? changes.volume : null,entity,changes)
	}

	// react to tick - each volume can have its own update
	if(blob.tick) {
		const entities = Object.values(this._entities)
		for(const entity of entities) {
			await update(entity,null)
		}
	}

	// a volume arrived via message event - track it and do work on int
	if(blob.volume) {
		// for now grant a uuid - @todo loader should do this or we should throw an error ??? finalize
		let uuid = blob.uuid
		if(!uuid) {
			uuid = blob.uuid = blob._metadata ? `${blob._metadata.key}` : `volume-${id++}`
			console.log("granting volume uuid",uuid)
		}
		// find previous volume if any and update changes
		let entity = this._entities[uuid]
		if(!entity) {
			entity = this._entities[uuid] = blob
		}
		// apply changes
		await update(entity,blob)
		// delete if desired
		if(blob.obliterate) {
			delete this._entities[uuid]
		}
	}
}

// @tbd
function volume_time(blob) {
}

// @tbd
function volume_query() {
}

// @todo - formalize schema and migrate animated to a sub property

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
	query,
	_entities: {},
	_surfaces: {},
}





