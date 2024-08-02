
//
// '@' path and resource discovery helper - optional - @todo may deprecate this feature - using it not at all nowadays
//
// there is a problem with knowing where assets are - manifests can be anywhere - and the entire app can be in a subfolder
// for now i let the caller specify a @/ to indicate that they want the root of the app space
// that root should always be about 3 folders up from this file - because orbital is typically included as a child per app
//

export function fixup_path(path) {
	if(!path) {
		console.error("volume-3js no path!")
		return
	}
	if(path.startsWith('@/')) {
		let parts = new URL(import.meta.url).pathname.split('/')
		parts.pop()
		parts.pop()
		parts.pop()
		let more = path.split('/'); more.shift()
		parts = [ ...parts, ...more ]
		path = parts.join('/')
	}
	return path
}
