
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
	box:prim,
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
	const update = async (entity,delta)=> {

		// a change request or a new object
		if(delta) {
			if(!delta.uuid) {
				// for now grant a new uuid
				delta.uuid = delta._metadata ? `${blob._metadata.key}` : `volume-${id++}`
				console.log(uuid,'granted new uuid',delta.uuid)
			}
			entity = this._entities[delta.uuid]
			if(!entity) {
				entity = this._entities[delta.uuid] = delta
				delta = null
			}
		}

		// find handler for the type
		const handler = handlers[entity.volume.geometry]
		if(!handler) {
			console.error(uuid,'no handler for',entity)
			return
		}

		// volumes always are granted a surface
		const name = entity.volume.surface || 'volume001'
		const surface = this._surfaces[name] || (this._surfaces[name] = {name,isServer})

		// update
		await handler(sys,surface,entity,delta)

		// remove?
		if(entity.obliterate && entity.uuid) {
			delete this._entities[uuid]
		}

	}

	// visit all volume instances on tick
	if(blob.tick) {
		const entities = Object.values(this._entities)
		for(const entity of entities) {
			await update(entity,null)
		}
	}

	// visit one volume instance delta on explicit update request
	if(blob.volume) {
		await update(null,blob)
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





