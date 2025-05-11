
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

// @todo decide if this is good enough for a uuid - could be much better
let id = 1

// volume update helper
async function _update(sys,entity,delta) {

	// a change request or a new object @todo merge
	if(delta) {
		if(!delta.uuid) {
			// for now grant a new uuid
			delta.uuid = delta._metadata ? `${delta._metadata.key}` : `volume-${id++}`
			console.log(uuid,'granted new uuid',delta.uuid)
		}
		entity = this._entities[delta.uuid]
		if(!entity) {
			entity = this._entities[delta.uuid] = delta
			delta = null
		}
	}

	// allow registering a render handler - test
	if(entity.volume.handler) {
		handlers[entity.volume.geometry] = entity.volume.handler
	}

	// find handler for the type
	const handler = handlers[entity.volume.geometry] || entity.volume.handler
	if(!handler) {
		console.error(uuid,'no handler for',entity)
		return
	}

	// volume components have an associated 'surface'
	const name = entity.volume.surface || 'volume001'
	const surface = this._surfaces[name] || (this._surfaces[name] = {name,isServer})

	// update
	await handler(sys,surface,entity,delta)

	// remove after handling if desired
	if(entity.obliterate && entity.uuid) {
		delete this._entities[entity.uuid]
	}

}

async function resolve(blob,sys) {

	// test - for now stuff a volume helper into sys @todo revisit
	// we need some formal way to talk to some services more directly
	// maybe one should actually formally request a direct connection via sys?
	sys.volume = this

	// visit all volume instances on tick
	if(blob.tick) {
		const entities = Object.values(this._entities)
		for(const entity of entities) {
			await this._update(sys,entity,null)
		}
	}

	// visit one volume instance delta on explicit update request
	if(blob.volume) {
		await this._update(sys,null,blob)
	}
}



///
/// volume system
///
/// observe and react to volume components on entities
///

export const volume_system = {
	uuid,
	resolve,
	query,
	_update,
	_entities: {},
	_surfaces: {},
}





