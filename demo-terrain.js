
// Terrain + vegetation demo
//
// Declares a satellite-draped heightfield fetched from public elevation
// tiles, then plants ~2,400 bamboo culms on it that grow in and sway in the
// wind - all rendered as two instanced draw calls by the vegetation handler.

import { createBus } from '@orbitalfoundation/bus'
import { volume_system } from 'here/volume.js'

const scene001 = {
	volume: {
		geometry: 'scene',
		div: 'volume001',
		background: 0x9db8cc,
		near: 0.5,
		far: 2000,
		aperture: 45,

		// prettier pipeline + atmosphere (new in 2.1)
		prettier: true,
		exposure: 1.15,
		sky: true,
		fog: { color: 0xdfe9f0, near: 260, far: 950 },
		hemisphere: { sky: 0xcfe4f4, ground: 0x8f7f5e, intensity: 1.25 },
		sun: {
			color: 0xfff1d8,
			intensity: 2.4,
			position: [160, 220, 60],
			target: [0, 0, 0],
			shadow: { extent: 240, far: 900 }
		}
	}
}

const camera001 = {
	volume: {
		geometry: 'camera',
		cameraMin: 10,
		cameraMax: 900,
		pose: {
			position: [230, 170, 230],
			love: [0, 35, 0]
		}
	}
}

// Grand Canyon rim - lots of relief, reliable public tiles
const terrain001 = {
	uuid: 'terrain001',
	volume: {
		geometry: 'terrain',
		terrain: {
			bounds: { north: 36.115, south: 36.055, east: -112.06, west: -112.14 },
			zoom: 13,
			satellite: true,
			size: [340, 340],
			heightScale: 0.055
		},
		pose: { position: [0, 0, 0] }
	}
}

const vegetation001 = {
	uuid: 'vegetation001',
	volume: {
		geometry: 'vegetation',
		vegetation: {
			capacity: 4096,
			plants: [],
			dirty: false
		},
		pose: { position: [0, 0, 0] }
	}
}

// a tight bamboo palette - fresh greens with the occasional golden culm
function culmColor(r) {
	const golden = r > 0.93
	const hue = (golden ? 52 : 94) + (r * 14 - 7)
	const sat = golden ? 0.5 : 0.4
	const lit = (golden ? 0.47 : 0.34) + (r * 0.08 - 0.04)
	const k = (n) => (n + (hue / 360) * 12) % 12
	const a = sat * Math.min(lit, 1 - lit)
	const f = (n) => lit - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
	return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255)
}

// Behavior blob: once the terrain reports ready, scatter clumped bamboo
// across it (using terrain.sample for ground height), then grow every culm
// toward its target height by mutating the plants array in place.
const planter = {
	id: 'bamboo-planter',
	planted: false,
	resolve(blob) {
		if(!blob.tick) return
		const terrain = terrain001.volume.terrain
		const veg = vegetation001.volume.vegetation
		if(!terrain.ready) return

		if(!this.planted) {
			this.planted = true
			const plants = veg.plants = []
			for(let c = 0; c < 90; c++) {
				const cx = (Math.random() - 0.5) * 300
				const cz = (Math.random() - 0.5) * 300
				const culms = 20 + Math.floor(Math.random() * 15)
				for(let i = 0; i < culms; i++) {
					const angle = Math.random() * Math.PI * 2
					const dist = Math.pow(Math.random(), 2) * 1.6
					const x = cx + Math.cos(angle) * dist
					const z = cz + Math.sin(angle) * dist
					plants.push({
						xyz: [x, terrain.sample(x, z), z],
						height: 0.01,
						radius: 0.06 + Math.random() * 0.05,
						color: culmColor(Math.random()),
						tilt: [angle, (dist / 1.6) * 0.17],
						_target: 9 + Math.random() * 9
					})
				}
			}
		}

		let growing = false
		for(const plant of veg.plants) {
			if(plant.height < plant._target) {
				plant.height = Math.min(plant._target, plant.height + plant._target * 0.012)
				growing = true
			}
		}
		if(growing) veg.dirty = true
	}
}

const bus = createBus()
await bus.resolve([volume_system, scene001, camera001, terrain001, vegetation001, planter])
bus.resolve({ run: 'realtime', hz: 60, dt: 1/60 })
