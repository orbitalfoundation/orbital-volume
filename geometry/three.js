
const isServer = (typeof window === 'undefined') ? true : false

globalThis.THREE = null

if(!isServer) {
	globalThis.THREE = await import('three')
}

///
/// get a handle on threejs on client
///

export function getThree() {
	return globalThis.THREE
}

///
/// build a simple material from props
///

export function buildMaterial(props = null) {
	switch(props ? props.kind : 'fallback') {
		case 'basic':
			return new THREE.MeshBasicMaterial(props)
		case 'fallback':
			return new THREE.MeshPhongMaterial({ color: 0xcccccc });
		default:
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

	let pose = scope.pose
	if(!pose) {
		pose = pose = {}
	} else {
		if(pose.position) node.position.set(...(Array.isArray(pose.position) ? pose.position : Object.values(pose.position) ) )
		if(pose.rotation) node.rotation.set(...(Array.isArray(pose.rotation) ? pose.rotation : Object.values(pose.rotation) ) )
		if(pose.scale) node.scale.set(...(Array.isArray(pose.scale) ? pose.scale : Object.values(pose.scale) ) )
		if(pose.quaternion) node.quaternion.set(...(Array.isArray(pose.quaternion) ? pose.quaternion : Object.values(pose.quaternion) ) )
		if(pose.lookat) node.lookAt(...(Array.isArray(pose.lookat) ? pose.lookat : Object.values(pose.lookat) ) )
	}

	pose.position = node.position
	pose.rotation = node.rotation
	pose.scale = node.scale
	pose.quaternion = node.quaternion
	pose.matrix = node.matrix
	pose.matrixWorld = node.matrixWorld
	pose.lookat = node.lookAt

}