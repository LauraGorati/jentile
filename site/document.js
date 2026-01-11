
import {mmError} from './utils.js';

export function showLoading() {
  document.getElementById('loading-overlay').hidden = false;
}

export function hideLoading() {
  document.getElementById('loading-overlay').hidden = true;
}

export function addToViewerContainer(element){
	const viewerContainer = document.getElementById('viewer-container');
	viewerContainer.innerHTML = '';
	viewerContainer.appendChild(element);
}

export function displayErrorMessage(message, error){
	clearDescription();
	hideLoading();

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

function clearDescription() {
	const descrDiv = document.getElementById('description-container');
	descrDiv.textContent = '';        // empty content
	descrDiv.style.display = 'none';  // hide
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
			descriptionContainer.style.display = 'block'; // make sure is visible
			
			 // Split text by lines, make first line bold and preserve remaining line breaks with <br>
            const lines = text.split(/\r?\n/);
            const firstLine = lines.shift() || '';
            const rest = lines.join('\n');
			const restHtml = rest ? '<br><span class="desc-rest">' + rest + '</span>' : '';
            const html = `<span class="desc-first-line">${firstLine}</span>${restHtml}`;

            descriptionContainer.innerHTML = html;
			descriptionContainer.style.whiteSpace = 'normal'; 
			descriptionContainer.style.wordBreak = 'break-word'; 

		})
		.catch(error => {
			displayErrorMessage("Error: file description not found!", error)
		});
}