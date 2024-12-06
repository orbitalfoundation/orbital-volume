
//
// this verison of volume.js does detect client or server conditions - later may split @todo
//

const isServer = (typeof window === 'undefined') ? true : false

//
// various geometry type handlers
//

const builders = {
	file: null,
	layer: null,
	scene: null,
	light: null,
	cube: null,
	box: null,
	sphere: null,
	cylinder: null,
	plane: null,
}

//
// handle volume objects - binding to geometry if needed
//

async function volume_resolve(blob,sys) {

	if(!blob.volume) return
	const volume = blob.volume

	// @todo index entities spatially

	// @todo handle deletions; including on rendering target if any

	// objects (lights, cameras, geometry) are on a 'surface' and there can be more than one surface
	const name = volume.surface || 'volume001'
	const surface = this._surfaces[name] || (this._surfaces[name] = {div:name,isServer})

	// fetch or find builder
	let builder = builders[volume.geometry]
	if(!builder && builders.hasOwnProperty(volume.geometry)) {
		builder = (await import(`./geometry/${volume.geometry}.js`)).default
	}

	// update or build object
	if(builder) {
		await builder(sys,surface,volume)
	}

}

// @tbd
function volume_time(blob) {
}

// @tbd
function volume_query() {
}

//
// volume manager
//

export const volume_manager = {

	uuid: '/service/volume',

	_surfaces: {},

	resolve: volume_resolve,

	// later switch to new pattern: @todo
	//	resolve: [
	//		{ handler: volume_resolve, filter: { volume: true }},
	//		{ handler: volume_time, filter: { time: true } }
	//	],

	query: volume_query // unsure how to do this
}


