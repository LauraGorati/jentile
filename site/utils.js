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

export function addToViewerContainer(element){
	const viewerContainer = document.getElementById('viewer-container');
	viewerContainer.innerHTML = '';
	viewerContainer.appendChild(element);
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

export function displayErrorMessage(message, error){
	const errorDiv = document.getElementById('error-container');
	errorDiv.textContent = message;
	errorDiv.style.display = 'block';
	if (error) mmError(error);
}

function clearError() {
	const errorDiv = document.getElementById('error-container');
	errorDiv.textContent = '';        // empty content
	errorDiv.style.display = 'none';  // hide
}

export function reloadDescription(fileName){
	//clean up
	clearError();

	// Load description from txt
	const txtFileName = fileName.replace(/\.[^/.]+$/, ".txt");
	fetch(txtFileName)
		.then(response => {
			if (!response.ok) {
				throw new Error('Description file not found.');
			}
			return response.text();
		})
		.then(text => {
			const descriptionContainer = document.getElementById('description-container');
			descriptionContainer.textContent = text;
			descriptionContainer.style.display = 'block'; // assicura che sia visibile
		})
		.catch(error => {
			displayErrorMessage("Error: file description not found!", error)
		});
}