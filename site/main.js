import { mmLog, mmError, getMouseCoordOnCanvas, getUrlParameter, reloadDescription, addToViewerContainer, displayErrorMessage } from './utils.js';
import { highlightModel, makeSelectable, loadModelPropertiesFromJson } from './models.js';

function openFullscreenImage(src) 
{ 
	const fullscreenDiv = document.createElement('div'); 
	fullscreenDiv.className = 'fullscreen'; 
	const img = document.createElement('img'); 
	img.src = src; 
	img.style.width = '100vw'; // 100% of screen width 
	img.style.height = '100vh'; // 100% of screen height
	img.style.objectFit = 'contain'; // Maintain proportions
	
	fullscreenDiv.appendChild(img); 
	const closeButton = document.createElement('button'); 
	closeButton.className = 'close-btn'; 
	closeButton.textContent = 'Chiudi'; 
	closeButton.addEventListener('click', () => 
	{ 
		document.body.removeChild(fullscreenDiv); 
	}); 
	fullscreenDiv.appendChild(closeButton); 
	document.body.appendChild(fullscreenDiv); 
}

function findHitObject(mouse){
	raycaster.setFromCamera(mouse, camera);

	const intersects = raycaster.intersectObjects(scene.children, true);

	if (intersects.length > 0) {
		let hitObject = intersects[0].object;

		// find the root model
		while (hitObject.parent && hitObject.parent.type !== 'Scene') {
			hitObject = hitObject.parent;
		}
								 
		return hitObject;
	}

	return null;
}

function showTooltip(event, renderer){
	const mouse = getMouseCoordOnCanvas(event, renderer);

	let display_style_tooltip = 'none'

	const hitObject = findHitObject(mouse);

	if (hitObject) {
		
		// tooltip management
		if (hitObject.highlightModel){
			display_style_tooltip = 'block';
			div_tooltip.innerHTML = `<strong>
										${hitObject.tooltip.title}
									</strong>
									<br>
										${hitObject.tooltip.text}`;
			div_tooltip.style.left = (event.clientX + 10) + 'px';
			div_tooltip.style.top = (event.clientY + 10) + 'px';
		}
		hitObject;
	}
	div_tooltip.style.display = display_style_tooltip;
	return hitObject;
}

function hideTooltip(){
	div_tooltip.style.display = 'none';
}
function deselectModel(){
	mmLog("Object deselected");
	highlightModel(selectedModel, false);
	hideTooltip();
	selectedModel = null;
}

function openLink(link){

	if (link.endsWith('.glb') && !link.startsWith('http')) {
		//if link is a GLB file, update URL without reloading entire page
		const newUrl = new URL(window.location);
		newUrl.searchParams.set('file', link);
		history.pushState({}, '', newUrl);

		loadGLB(link); 
	}
	else if (link.endsWith('.mp4') && !link.startsWith('http')) {
		//if link is a mp4 file, update URL without reloading entire page
		const newUrl = new URL(window.location);
		newUrl.searchParams.set('file', link);
		history.pushState({}, '', newUrl);

		loadVideo(link, "mp4"); 
	} 
	else if (link.startsWith('http://') || link.startsWith('https://')) {
		// open in new tab
		window.open(link, '_blank');
	}

	selectedModel = null;
	
	mmLog(`You clicked on ${link}`);
	
}

function checkIfTouchMoved(event){
	
	isTouchMoved = false;

	if (selectedModel) {
		const deltaX = Math.abs(event.clientX - touchStartX);
		const deltaY = Math.abs(event.clientY - touchStartY);

		if (deltaX > 10 || deltaY > 10) {
			isTouchMoved = true;
			mmLog("Touch moved")
			// deselect model during movement
			if (selectedModel) {
				deselectModel();
			}
		}
	}
	touchStartX = event.clientX;
	touchStartY = event.clientY;
	
}

function loadVideo(file, extension){
	const videoPath = `Video/${file}`;
	const subsPath = videoPath.replace(new RegExp(`\\.${extension}$`, 'i'), '.vtt');
	
	// display video
	const video = document.createElement('video');
	video.src = videoPath;
	video.controls = true;
	video.autoplay = true;
	video.style.width = '80vw'; // 80% of screen width 
	video.style.objectFit = 'contain'; // Maintain proportions

	// Verifica esistenza sottotitoli con HEAD
	(async () => {
	try {
		const res = await fetch(subsPath, { method: 'HEAD' });
		if (res.ok) {
		const track = document.createElement('track');
		track.kind    = 'subtitles';
		track.src     = subsPath;
		track.srclang = 'it';
		track.label   = 'Italiano';
		track.default = true;
		video.appendChild(track);
		mmLog(`Sottotitoli aggiunti: ${subsPath}`);
		} 
		else {
		console.warn('Sottotitoli non disponibili (status:', res.status, ')');
		}
	} catch (err) {
		mmLog('Errore nel controllo sottotitoli:', err);
	}
	})();

	addToViewerContainer(video);

	reloadDescription(videoPath);
}

function loadGLB(file){
	const glbPath = `3Dobjects/${file}`;
	// check if file exixsts
	fetch(glbPath)
		.then(response => {
			if (!response.ok) {
				throw new Error('GLB file not found.');
			}

			// Create scene, camera, renderer
			scene = new THREE.Scene();
			scene.background = new THREE.Color(0xffffff);

			const renderer = new THREE.WebGLRenderer();
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(window.innerWidth, window.innerHeight / 2);
			
			camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight / 2), 0.1, 1000);
			raycaster = new THREE.Raycaster();

			renderer.domElement.addEventListener( 'click', (event) =>
			{
				event.preventDefault();

				const mouse = getMouseCoordOnCanvas(event, renderer);

				const hitObject = findHitObject(mouse);

				if (hitObject && hitObject.tooltip && hitObject.tooltip.link) {
					openLink(hitObject.tooltip.link);
				}
			} );

			renderer.domElement.addEventListener('mousemove', (event) => {
				// ignora hover if user is dragging
				if (orbitControlsisDragging) {
					hideTooltip();
	
					if (currentHoveredModel) {
						highlightModel(currentHoveredModel, false);
						currentHoveredModel = null;
					}
					return;
				}
				
				let newHoveredModel = showTooltip(event, renderer);

				// if model changed....
				if (newHoveredModel !== currentHoveredModel) {
					// de-highlight old one
					if (currentHoveredModel) {
						highlightModel(currentHoveredModel, false);
					}
					// highlight new one
					if (newHoveredModel) {
						highlightModel(newHoveredModel, true);
					}

					currentHoveredModel = newHoveredModel;
				}
			});

			renderer.domElement.addEventListener('touchstart', (touch) => {
				touch.preventDefault(); //no scroll or zoom

				const event = touch.touches[0];
				checkIfTouchMoved(event);
			
				let hitObject = showTooltip(event, renderer);

				if (hitObject) {
					if (!isTouchMoved && selectedModel) {
					
						if (selectedModel.tooltip && selectedModel.tooltip.link) {
							openLink(selectedModel.tooltip.link);
						}
						deselectModel();
					}

					// if highlightable...
					if (hitObject.highlightModel !== false) {

						selectedModel = hitObject;

						highlightModel(selectedModel, true);
						
						mmLog('Touch start: selected ', selectedModel.name);

					}
				} 
				else {
					// Touchoutside: deselect and hide everything
					if (selectedModel) {
						deselectModel();
					}
				}
			});

			renderer.domElement.addEventListener('touchmove', (touch) => {
				const event = touch.touches[0];
				checkIfTouchMoved(event);
			});

			addToViewerContainer(renderer.domElement);
		
			// Ambient lightning
			const ambientLight = new THREE.AmbientLight(0xffffff, 1);
			scene.add(ambientLight);

			// load GLB
			const loader = new THREE.GLTFLoader();
			loader.load(glbPath, function (gltf) { //load model from file
				const configKey = glbPath.split('/').pop();

				const model = gltf.scene;
				loadModelPropertiesFromJson(model, config[configKey])
		
				model.highlightModel = false; //root object not highlightable
				scene.add(model);
					
				// load hotpots models, if they exists
				if (config[configKey] && config[configKey].hotspots) {
					config[configKey].hotspots.forEach(h => {
						
						const loader2 = new THREE.GLTFLoader(); 
						loader2.load(`3Dobjects/${h.reference}`, function (gltf_temp) {
							const secondary_model = gltf_temp.scene;
							loadModelPropertiesFromJson(secondary_model, h)

							makeSelectable(h, secondary_model); 
							scene.add(secondary_model);
							
							}, undefined, function (error) {
								console.error("Error loading model", error);
							});
						});								
					}
				
				//load camera position from config.json
				let isPanEnabled = true;
				if (config[configKey] && config[configKey].cameraPosition) {
					const camType = config[configKey].cameraPosition.type;
					if (camType === "internal") {
						isPanEnabled = false;
					}
					const pos = config[configKey].cameraPosition[camType];
					if (pos) {
						camera.position.set(pos.x, pos.y, pos.z);
						if (config[configKey].lookAt) {
							camera.lookAt(config[configKey].lookAt.x, config[configKey].lookAt.y, config[configKey].lookAt.z);
						}
					}
				}

				// Orbit controls
				const controls = new THREE.OrbitControls(camera, renderer.domElement);
				controls.enableDamping = true;
				controls.dampingFactor = 0.25;
				controls.screenSpacePanning = false;
				controls.minDistance = 0.5;
				controls.maxDistance = 1.5;
				controls.enablePan = isPanEnabled;

				controls.addEventListener('start', () => {
					orbitControlsisDragging = true;
				});
				controls.addEventListener('end', () => {
					orbitControlsisDragging = false;
				});

				function animate() {
					requestAnimationFrame(animate);
					controls.update();

					renderer.render(scene, camera);
				}

				animate();

			}, undefined, function (error) {
				console.error("Error loading GLB:", error);
			});
		})
		.catch(error => {
			displayErrorMessage("Error: GLB file do not exists", error);
		});
	reloadDescription(glbPath);
}

//Manage forward/backward commands from browser
window.addEventListener('popstate', (event) => {
    const newFile = getUrlParameter('file');

    if (newFile && newFile.endsWith('.glb')) {
		mmLog('Back to:', newFile);

    	loadGLB(newFile);
    } else {
		//fallback to remove old scene
		while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
    }
});

function mainLogic(){
	var fileName = getUrlParameter('file');
	const folderName = getUrlParameter('imgFolder');

	if (!folderName && !fileName) {
		displayErrorMessage( "No file name provided in URL. Use '?file=name.glb' or '?imgFolder=folder' or top-right menu to select an asset", null); 
	}
	else {
		if (folderName != '') {
			fileName = folderName + '.xxx';

			// Display images as slider
			fetch(`${folderName}/images.json`)				
				.then(response => {
					if (!response.ok) {
						throw new Error('Image folder or file images.json not found.');
					}
					return response.json();
				})		
				.then(data => { 
				const images = data.images; 
				const swiperContainer = document.createElement('div'); 
				swiperContainer.className = 'swiper-container'; 
				const swiperWrapper = document.createElement('div'); 
				swiperWrapper.className = 'swiper-wrapper'; 
				images.forEach(image => 
					{ 
					const swiperSlide = document.createElement('div'); 
					swiperSlide.className = 'swiper-slide'; 
					const img = document.createElement('img'); 
					img.src = `${folderName}/${image}`; 
					img.addEventListener('click', () => openFullscreenImage(img.src));
					swiperSlide.appendChild(img); 
					swiperWrapper.appendChild(swiperSlide); 
				});
				swiperContainer.appendChild(swiperWrapper);

				addToViewerContainer(swiperContainer);
		
				const swiper = new Swiper('.swiper-container', {
					effect: 'coverflow',
					grabCursor: true, 
					centeredSlides: true,
					slidesPerView: '2',
					loop: false, 
					coverflowEffect: 
						{ 
						rotate: 50, 
						stretch: 0, 
						depth: 100, 
						modifier: 1, 
						slideShadows: true, 
					}, 
					pagination: 
						{ 
						el: '.swiper-pagination', 
						clickable: true, 
					}, 
					navigation: 
						{ 
						nextEl: '.swiper-button-next', 
						prevEl: '.swiper-button-prev', 
					},
				});
			})
			.catch(error => console.error('Error loading images page:', error));		
		}
		else
		{
			// obtan file name from file parameter
			fileName = getUrlParameter('file');
			
			const fileType = fileName.split('.').pop().toLowerCase();
		
			if (fileType === 'glb') {
				loadGLB(fileName);
			}
			else if (fileType === 'jpg' || fileType === 'png' || fileType === 'gif' || fileType === 'jpeg') {
				// Check if image file exists
				fetch(fileName)
					.then(response => {
						if (!response.ok) {
							throw new Error('Image file not found');
						}
						const img = document.createElement('img');
						img.src = fileName;
						addToViewerContainer(img);
					})
					.catch(error => {
						displayErrorMessage("Error: Image file do not exists", error);
					});
				reloadDescription(fileName);
			} 
			else if (fileType === 'mp4' || fileType === 'webm' || fileType === 'ogg') {
				loadVideo(fileName, fileType);
			} 		
			else {
				mmError('Video format not supported');
			}
		}
	}
}

// Main
// Global variables

let currentHoveredModel = null;
let orbitControlsisDragging = null;
let selectedModel = null; // model currrently selected by touch
let touchStartX = 0;
let touchStartY = 0;
let isTouchMoved = false;
let raycaster, camera, scene;

let div_tooltip;
let config = null;

// Top right dropdown menu
document.addEventListener('DOMContentLoaded', function() {
	div_tooltip = document.getElementById('model-tooltip');
    const menuBtn = document.getElementById('menu-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    let menuLoaded = false;
	
    menuBtn.addEventListener('click', function() {
    if (dropdownMenu.style.display === 'none') {
        dropdownMenu.style.display = 'block';
        if (!menuLoaded) {
            fetch('menulist.json')
                .then(response => response.json())
                .then(files => {
                    dropdownMenu.innerHTML = '';
                    files.forEach(item => {
                        const link = document.createElement('a');
                        link.href = '#'; // # prevents navigation
                        link.textContent = item.desc;
                        link.dataset.file = item.file; // save my link as attribute

                        // Intercetta il click
                        link.addEventListener('click', (e) => {
                            e.preventDefault(); // block default navigation

							openLink(link.dataset.file);

                            // Close menu
                            dropdownMenu.style.display = 'none';
                            
                        });

                        dropdownMenu.appendChild(link);
                    });
                    menuLoaded = true;
                })
                .catch(() => {
                    dropdownMenu.innerHTML = '<div style="color:red;padding:8px;">Impossibile caricare la lista dei file.</div>';
                });
        	}
    	} else {
       		dropdownMenu.style.display = 'none';
    	}
	});

    // Close menu if user clicks outside
    document.addEventListener('click', function(e) {
        if (!menuBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.style.display = 'none';
        }
    });
});

// load html from config.json
fetch('config.json')
    .then(response => response.json())
    .then(data => {
		config = data; //save config on global variable for later use in mainLogic()
        document.title = config.html.pageTitle;
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = config.html.pageTitle;

        const headerEl = document.getElementById('header-title');
        if (headerEl) headerEl.textContent = config.html.headerTitle;

        const footerEl = document.getElementById('footer-text');
        if (footerEl) footerEl.textContent = config.html.footer;

		mainLogic();
    })
    .catch(err => {
		displayErrorMessage("Cannot load html texts: config.json not found", err);
	});

window.addEventListener('resize', () => {
   if (typeof camera !== 'undefined' && typeof renderer !== 'undefined') {
        camera.aspect = window.innerWidth / (window.innerHeight / 2);
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight / 2);
    }
});

