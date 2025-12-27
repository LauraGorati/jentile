const DEBUG = true;

export function mmLog(string){
	if (DEBUG) console.log(string);
}

export function mmError(string){
	if (DEBUG) console.error(string);
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


export function reloadDescription(fileName){
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
			const description = document.createElement('p');
			description.textContent = text;
			const descriptionContainer = document.getElementById('description-container');
			descriptionContainer.innerHTML = ''; // Clean up
			descriptionContainer.appendChild(description);
		})
		.catch(error => {
			const errorMsg = document.createElement('div');
			errorMsg.style.color = 'red';
			errorMsg.style.fontWeight = 'bold';
			errorMsg.style.margin = '40px auto';
			errorMsg.style.textAlign = 'center';
			errorMsg.textContent = "Error: file description not found!";
			document.body.appendChild(errorMsg);

			mmError('Error loading description file:', error);
		});
}