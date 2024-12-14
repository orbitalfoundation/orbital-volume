
const isServer = (typeof window === 'undefined') ? true : false

globalThis.THREE = null

if(isServer == false) {
	globalThis.THREE = await import('three')
}

///
/// get a handle on threejs on client - quirky hoop to be able to at least not have an import fail on a server
///

export function getThree() {
	return isServer == true ? null : globalThis.THREE
}

///
/// build a simple material from props
///

export function buildMaterial(props = null) {
	switch(props ? props.kind : 'fallback') {
		case 'fallback':
			return new THREE.MeshPhongMaterial({ color: 0xcccccc });
		case 'basic':
			props = { ... props }
			delete props.kind
			return new THREE.MeshBasicMaterial(props)
		default:
			props = { ... props }
			delete props.kind
			return new THREE.MeshPhongMaterial(props)
			break
	}
}


/**

While I want to encourage a pub/sub architecture of publishing events versus direct setters...
It is also very convenient to directly set pose information - and I want people to trust that.
Also I do feel that both client and server modes should leverage THREE.Vector3 and other math.

So my approach is that I rewrite exposed pose fields to be 'live' if we are on a client.
This lets callers directly manipulate those fields, while also allowing message based transport.
This could also be done with reactive observer proxy or javascript signal that wraps the variable.

It is important to note that passed state tends to reflect durable objects - not transient values.

Also I rewrite arrays of the form [0,1,2] into Vector3(0,1,2) or { x:0, y:1, z:2 }

*/


export function bindPose(scope) {

	const node = scope.node
	if(!node) return

	// given [0,1,2] or { x:0, y:1, z:2 } return [0,1,2]
	const unroll = (xyz) => { return Array.isArray(xyz) ? xyz : Object.values(xyz) }

	// pull values from outside manifests - can be arrays or objects
	let pose = scope.pose
	if(!pose) {
		pose = scope.pose = {}
	}

	// backwards support
	if(scope.xyz) pose.position = scope.xyz
	if(scope.ypr) pose.rotation = scope.ypr
	if(scope.whd) pose.scale = scope.whd

	// stuff this into every object as a way to set a target - avoiding using the reserved term 'target'
	Object.defineProperty(node, 'love', {
		value: new THREE.Vector3(),
		enumerable: true,
		configurable: true
	});

	// copy from manifest to node
	if(true) {
		if(pose.position) node.position.set(...unroll(pose.position) )
		if(pose.rotation) node.rotation.set(...unroll(pose.rotation) )
		if(pose.scale) node.scale.set(...unroll(pose.scale) )
		if(pose.quaternion) node.quaternion.set(...unroll(pose.quaternion) )
		if(pose.lookat) node.lookAt(...unroll(pose.lookat) )
		if(pose.love) node.love.set(...unroll(pose.love) )
	}

	// rewrite into manifest ... allows direct changes to live geometry ...
	// @todo there are some risks here; it may break expectations around publishing datagrams and original state
	if(true) {
		pose.position = node.position
		pose.rotation = node.rotation
		pose.scale = node.scale
		pose.quaternion = node.quaternion
		pose.lookat = node.lookAt
		pose.love = node.love
		pose.matrix = node.matrix
		pose.matrixWorld = node.matrixWorld
	}

	// force update for good luck
	node.updateMatrix()
	node.matrixWorldNeedsUpdate = true

}

