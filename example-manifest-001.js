
export const aaab_scene001 = {
	// @note loader could fix the order issue itself?
	unused_idea_load: {
		after: 'resources'
	},
	volume: {
		geometry: 'scene',
		div: 'volume001',
		near: 0.1,
		far: 100,
		cameraPosition:[0,1.5,1], // @todo move this behavior to camera
		cameraTarget:[0,1.5,0],
		cameraMin: 1,
		cameraMax: 100,
		background: 0x202020,
		alpha: false,
		axes: true,
		controls: false,
	}
}

export const aaac_camera001 = {
	volume: {
		geometry: 'camera',
		pose:{
			position:[0,1,4],
			lookat:[0,1.5,0]
		}
	}
}

export const light001 = {
	volume: {
		geometry:'light',
		light:'directional',
		intensity: 1,
		color: 0xffeae0,
		pose:{
			position:[1,1,1]
		},
	}
}

export const light002 = {
	volume: {
		geometry:'light',
		light:'ambient',
		color: 0xffeae0,
		intensity: 1
	}
}

export const person = {
	uuid: 'person',
	volume: {
		geometry: 'file',
		url: 'https://models.readyplayer.me/664956c743dbd726eefeb99b.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png',
		pose: {
			position: [0,0,0]
		},
	},
	puppet: {}
}