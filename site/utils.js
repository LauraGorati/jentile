const DEBUG = true;

export function mmLog(string){
	if (DEBUG) console.log(string);
}

export function mmError(string){
	if (DEBUG) {
		console.log(string);	
		console.error();
	}
}

export function getMouseCoordOnCanvas(event, renderer){
	// Canvas related mouse coordinates
	let mouse = new THREE.Vector2()

	const rect = renderer.domElement.getBoundingClientRect();
	mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
	mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
	return mouse;
}

export function getUrlParameter(name) {
	name = name.replace('/[\[]/', '\\[').replace('/[\]]/', '\\]');
	
	var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
	var results = regex.exec(location.search);
	return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}
