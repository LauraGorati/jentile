import { mmLog, mmError, getMouseCoordOnCanvas, getUrlParameter} from './utils.js';
import { showLoading, hideLoading, displayErrorMessage, addToViewerContainer, reloadDescription} from './document.js'
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
	hideTooltip();
	
	let showBottomSheet = true;
	if (!link.startsWith('http')){
		showLoading();

		pushUrl("file", link);
		
		if (link.endsWith('.glb')) {
			loadGLB(link); 
		}
		else if (link.endsWith('.jpg')|| link.endsWith('.png') || link.endsWith('.gif') || link.endsWith('.jpeg')) {
			loadImage(link);
		} 
		else if (link.endsWith('.mp4')) {
			loadVideo(link, "mp4");			
			showBottomSheet = false;
		} 
	}
	else if (link.startsWith('http://') || link.startsWith('https://')) {
		// open in new tab
		window.open(link, '_blank');
	}
	showSheet(showBottomSheet);

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

function disposeGLBResources(){
	scene = null;
	camera = null;
	renderer =null;
}

function applyPadding(element){
	element.style.display = 'block';      
	element.style.margin = '0 auto';       
	element.style.paddingTop = '56px';     
	element.style.paddingBottom = '56px';
	element.style.width = '100%';          
	element.style.height = 'auto';    
}

function loadImage(file){
	//clean camera, renderer, scene...
	disposeGLBResources();
	const imagePath = `Images/${file}`;

	// Check if image file exists
	fetch(imagePath)
		.then(response => {
			if (!response.ok) {
				throw new Error('Image file not found');
			}
			const img = document.createElement('img');
			img.src = imagePath;
						
			applyPadding(img);

			addToViewerContainer(img);
			hideLoading();
		})
		.catch(error => {
			displayErrorMessage("Error: Image file do not exists", error);
		});
	reloadDescription(imagePath);
}

function loadVideo(file, extension){
	//clean camera, renderer, scene...
	disposeGLBResources();

	const videoPath = `Video/${file}`;
	const subsPath = videoPath.replace(new RegExp(`\\.${extension}$`, 'i'), '.vtt');
	
	// display video
	const video = document.createElement('video');
	video.src = videoPath;
	video.controls = true;
	video.autoplay = true;
	video.style.width = '100vw'; // 80% of screen width 
	video.style.objectFit = 'contain'; // Maintain proportions

	// Check if subtitles exists
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
		mmLog(`Added subs: ${subsPath}`);
		} 
		else {
		console.warn('Subs not available (status:', res.status, ')');
		}
	} catch (err) {
		mmLog('Error loading subs:', err);
	}
	})();

	addToViewerContainer(video);

	hideLoading();
	reloadDescription(videoPath);
	forceCloseSheet();

}

function resizeToContainer() {
	const container = document.getElementById('viewer-container');
	const w = container.clientWidth;
	const h = container.clientHeight;
	if (w === 0 || h === 0) return; // prevents zero divisions!
	if (renderer){
		renderer.setSize(w, h, false);   
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	}
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
			// obtain color from CSS and remove alpha if is 'rgba(...)'
			const cssBg = getComputedStyle(document.documentElement)
								.getPropertyValue('--bg-color').trim();
			const bgForThree = cssBg.startsWith('rgba')
				? cssBg.replace(/rgba\((\s*\d+\s*,\s*\d+\s*,\s*\d+),\s*[\d.]+\)/, 'rgb($1)')
				: cssBg;
			scene.background = new THREE.Color(bgForThree);


			renderer = new THREE.WebGLRenderer();
			renderer.setClearColor(bgForThree, 1);

			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // qualità/performanza
			renderer.domElement.style.width = '100%';
			renderer.domElement.style.height = '100%';
			
			camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight / 2), 0.1, 1000);
			raycaster = new THREE.Raycaster();

			// Primo resize
			resizeToContainer();

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
			const ambientLight = new THREE.AmbientLight(config["viewer"].ambient, 1);
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
							const lookAt = new THREE.Vector3(
								config[configKey].lookAt.x,
								config[configKey].lookAt.y,
								config[configKey].lookAt.z
							);
							camera.lookAt(lookAt);
						}
					}
				}
				const controls = new THREE.OrbitControls(camera, renderer.domElement);
				controls.enableDamping = true;
				controls.dampingFactor = 0.25;
				controls.screenSpacePanning = false;
				controls.minDistance = 10;
				controls.maxDistance = 40;    

				controls.addEventListener('start', () => {
					orbitControlsisDragging = true;
				});
				controls.addEventListener('end', () => {
					orbitControlsisDragging = false;
				});

				function animate() {
					if (scene) {
						requestAnimationFrame(animate);
						controls.update();

						renderer.render(scene, camera);
					}
				}

				animate();

				hideLoading();

			}, undefined, function (error) {
				console.error("Error loading GLB:", error);
			});
		})
		.catch(error => {
			displayErrorMessage("Error: GLB file do not exists", error);
		});
	
	reloadDescription(glbPath);
	forceCloseSheet();
}

//Manage forward/backward commands from browser
window.addEventListener('popstate', (event) => {
    
	mainLogic();
});

function pushUrl(parameter, value){
	const newUrl = new URL(window.location);

	newUrl.search = '';	// Removes all parameters from URL
	newUrl.searchParams.set(parameter, value);
	history.pushState({}, '', newUrl);
}
function loadSlideShow(folderName){
	
	pushUrl("imgFolder", folderName);

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
			
			// Mantain proportions and center content
			img.style.display = 'block';
			img.style.maxWidth = '100%';
			img.style.maxHeight = '100%';  
			img.style.objectFit = 'contain'; 
			img.style.margin = '0 auto'; // horizontal center

			img.addEventListener('click', () => openFullscreenImage(img.src));
			swiperSlide.appendChild(img); 
			swiperWrapper.appendChild(swiperSlide); 
		});
		
		swiperContainer.style.height = '60%';       
		swiperContainer.style.width = '100%';
		swiperContainer.style.margin = '0 auto';     

		swiperContainer.appendChild(swiperWrapper);

		applyPadding(swiperContainer);

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
				slideShadows: false, 
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

	reloadDescription(`${folderName}/Slideshow.txt`);

}

function mainLogic(){
	const fileName = getUrlParameter('file');
	const folderName = getUrlParameter('imgFolder');

	if (!folderName && !fileName) {
		forceOpenSheet();
		displayErrorMessage( "No file name provided in URL. Use '?file=name.glb' or '?imgFolder=folder' or top-right menu to select an asset", null); 
	}
	else {
		if (folderName) {
			loadSlideShow(folderName);	
		}
		else
		{
			// obtan file name from file parameter
			const link = getUrlParameter('file');			
			openLink(link);
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
let renderer = null;

let div_tooltip;
let config = null;

//global variables for bottom-sheet
const sheet = document.getElementById('bottom-sheet');
const handle = document.getElementById('sheet-handle');

const collapsedH = parseInt(getComputedStyle(document.documentElement)
  .getPropertyValue('--sheet-collapsed-h'));
let startY = 0;
let startTranslate = 0;
let currentTranslate = null;

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
						
                        link.addEventListener('click', (e) => {
                            e.preventDefault(); // block default navigation

							if (item.file){
                        		link.dataset.file = item.file; // save my link as attribute
								openLink(link.dataset.file);
							}
							else if (item.folder){
								link.dataset.file = item.folder; // save my link as attribute
								loadSlideShow(link.dataset.file);
							}
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

		mainLogic();
    })
    .catch(err => {
		displayErrorMessage("Cannot load html texts: config.json not found", err);
	});

window.addEventListener('resize', () => {
   if (typeof camera !== 'undefined' && renderer) {
        camera.aspect = window.innerWidth / (window.innerHeight / 2);
        camera.updateProjectionMatrix();

		resizeToContainer();
		if (!sheet.classList.contains('expanded')) {
			sheet.style.transform = '';
		}
    }
});


function setTranslateY(px) {
  sheet.style.transform = `translateY(${px}px)`;
}

function collapsedTranslate() {
  // altezza reale del sheet
  const h = sheet.getBoundingClientRect().height;
  const safe = (typeof CSS !== 'undefined' && CSS.supports('top: env(safe-area-inset-bottom)')) ? 0 : 0;
  return Math.max(0, h - collapsedH + safe);
}

function showSheet(show) {
	
    sheet.style.display = show ? 'block' : 'none';
}

function forceOpenSheet(){
	sheet.classList.add('expanded');
    handle.setAttribute('aria-expanded', 'true');
}

function forceCloseSheet(){
	sheet.classList.remove('expanded');
    handle.setAttribute('aria-expanded', 'false');
}

function toggleSheet() {
  const expanded = sheet.classList.toggle('expanded');
  handle.setAttribute('aria-expanded', String(expanded));
  sheet.style.transform = '';
}
handle.addEventListener('click', toggleSheet);

/* Drag: mouse/touch pointer events */
function onPointerDown(e) {
	
  // Block scroll and gestures on body
  e.stopPropagation();
  if (e.cancelable) e.preventDefault()

  sheet.classList.add('dragging');
  startY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
  const isExpanded = sheet.classList.contains('expanded');
  startTranslate = isExpanded ? 0 : collapsedTranslate();
  currentTranslate = startTranslate;

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('touchmove', onPointerMove, { passive: true });
  window.addEventListener('touchend', onPointerUp);
}

function onPointerMove(e) {
	
  // Block scroll and gestures on body
  e.stopPropagation();
  if (e.cancelable) e.preventDefault()

  const y = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
  const dy = y - startY;
  const maxCol = collapsedTranslate(); // limite basso
  const next = Math.min(Math.max(0, startTranslate + dy), maxCol);
  currentTranslate = next;
  setTranslateY(next);
}

function onPointerUp() {
  sheet.classList.remove('dragging');

  const threshold = collapsedTranslate() * 0.5; 
  if (currentTranslate !== null) {
    if (currentTranslate < threshold) {
    	forceOpenSheet();
    } else {
    	forceCloseSheet();
    }
  }
  
  sheet.style.transform = '';
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('touchmove', onPointerMove);
  window.removeEventListener('touchend', onPointerUp);
}


handle.addEventListener('pointerdown', onPointerDown);
handle.addEventListener('touchstart', onPointerDown, { passive: true });
