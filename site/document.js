
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
			descriptionContainer.textContent = text;
			descriptionContainer.style.display = 'block'; // make sure is visible
			descriptionContainer.style.whiteSpace = 'pre-wrap'; // follow \n e \r\n
			descriptionContainer.style.wordBreak = 'break-word'; 

		})
		.catch(error => {
			displayErrorMessage("Error: file description not found!", error)
		});
}