# Notes regarding sparse voxel octree - Apr 4 2024

basic navigation requirements:

	- i think i need an algo that walks a room; building up a voxel map of the room by testing
		we could register points in the octree and use that preferentially to looking at the real world

	- due to my current design i currently cannot return empty voxels; only positive or navigable volume

	- a sparse linear octree that hashes results seems like it would be more efficient?
		- i am unsure why actually keep x,y,z independently in a linear array in octree nodes; seems expensive
		- may actually make sense to do some performance metrics and or look for other code bases
		- could try https://github.com/vanruesc/sparse-octree?tab=readme-ov-file
		- how fast and useful is the babylon3d octree implementation?

a navigation / walking algorithm might look like this:

	- can pre-scan the whole world using a simple collision detection

	- for all voxels give each one a height above the ground or number of voxels above a non-voxel void

	- given a current starting point

	- neighbors() can test if voxel has a ground that is not too far below nor too far above (may be possible to score this)

	- neighbors() could test the real world if there is no voxel in the database if we measure both positive and negative
					or we can have two voxel maps; one for all the tested spaces and one for the navigable spaces
					or we can store extra metadata per voxel; if it is tested and or if it is navigable

a flying algorithm can look like this:

	- do ordinary route find to find a way to a destination

	- when picking new destinations do further future probes; and maybe try do a sweep or left/right evaluation if blocked?

