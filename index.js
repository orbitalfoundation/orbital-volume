
// @todo for some reason /+esm does something very strange with import maps - they stop working!
import sys from 'https://cdn.jsdelivr.net/npm/orbital-sys@1.0.8/src/sys.js'

sys({
	load:[
		'here/volume.js',
		'here/example-manifest-001.js',
	],
})

