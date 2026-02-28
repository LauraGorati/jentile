import { mmLog, mmError, getMouseCoordOnCanvas, getUrlParameter} from './utils.js';
import { showLoading, hideLoading, displayErrorMessage, addToViewerContainer, reloadDescription, updateProgress} from './document.js'
import { makeSelectable, loadModelPropertiesFromJson, loadCameraPropertiesFromJson, configureControlsOptions} from './models.js';

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

function showTooltip(event) {

	const mouse = getMouseCoordOnCanvas(event, renderer);
	const hitObject = findHitObject(mouse);

	if (hitObject && hitObject.highlightModel) {

		div_tooltip.innerHTML = `<strong>
									${hitObject.tooltip.title}
								</strong>
								<br>
								${hitObject.tooltip.text}`;
		div_tooltip.style.display = 'block';

		updateTooltipPosition(hitObject);
		return hitObject;
	}
	div_tooltip.style.display = 'none';

	return null;
}

function updateTooltipPosition(currentTooltipObject) {

	const vector = currentTooltipObject.position.clone();
	vector.project(camera);

	const canvasRect = renderer.domElement.getBoundingClientRect();

	let x = (vector.x * 0.5 + 0.5) * canvasRect.width + canvasRect.left;
	let y = (-vector.y * 0.5 + 0.5) * canvasRect.height + canvasRect.top;

	const margin = 10;

	// Real dimensions computation
	div_tooltip.style.visibility = 'hidden';
	div_tooltip.style.display = 'block';

	const tooltipWidth = div_tooltip.offsetWidth;
	const tooltipHeight = div_tooltip.offsetHeight;

	x += margin;
	y += margin;

	// Clamp 
	if (x + tooltipWidth > window.innerWidth) {
		x = window.innerWidth - tooltipWidth - margin;
	}
	if (x < margin) {
		x = margin;
	}

	// Clamp 
	if (y + tooltipHeight > window.innerHeight) {
		y = window.innerHeight - tooltipHeight - margin;
	}
	if (y < margin) {
		y = margin;
	}

	div_tooltip.style.left = `${x}px`;
	div_tooltip.style.top = `${y}px`;
	div_tooltip.style.visibility = 'visible';
}


function hideTooltip(){
	div_tooltip.style.display = 'none';
}

function deselectModel(){
	mmLog("Object deselected");
	hideTooltip();
	selectedModel = null;
}

function loadCameraAndControlsProperties(link){
	let isInternal = loadCameraPropertiesFromJson(camera, config, link);
	if (isInternal) { 
		exit_btn.style.display = 'block'; 
	} 
	else {
		exit_btn.style.display = 'none'; 
	}
	configureControlsOptions(controls, isInternal, camera.position); // if internal, configure controls accordingly
}

function toggleInternalExternal(model, link){
	loadModelPropertiesFromJson(model, config, link);
	loadCameraAndControlsProperties(link);	
}
function openLink(link){
	deselectModel();

	exit_btn.style.display = 'none'; 

	let showBottomSheet = true;
	if (!link.startsWith('http')){
		showLoading();

		pushUrl("file", link);
		
		if (link.endsWith('.glb')) {
			if (currentGLB === link) {
				//reload properties from config form the old model name + _internal in case they were changed by hotspots
				//search for model name in scene, if found apply properties, otherwise reload whole model
				for (const child of scene.children) {
					if (child.name === link) {
						toggleInternalExternal(child, "INTERNAL_"+link);
						
						exit_btn.addEventListener('click', () => {
							const externalName = currentGLB.replace('INTERNAL_', '');
							toggleInternalExternal(child, externalName);
						});
						break;
					}
				}
				hideLoading();
			}
			else{
				loadGLB(link); 
			}
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
	controls = null;
	raycaster = null;
	loader = null;
	currentGLB = null;
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

	// Hide header when video plays, show when paused
	video.addEventListener('play', hideHeader);
	video.addEventListener('pause', showHeader);

	hideLoading();
	reloadDescription(videoPath);
	forceCloseSheet();

}

function hideHeader() {
	const header = document.querySelector('header');
	if (header) {
		header.classList.add('hidden-header');
	}
}

function showHeader() {
	const header = document.querySelector('header');
	if (header) {
		header.classList.remove('hidden-header');
	}
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

function removeModelsButKeepLights() {

	scene.children.slice().forEach(child => {
        if (child.isLight) return; // mantains all the lights
        scene.remove(child);
    });
}

function loadCamera(){
	camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight / 2), 0.1, 1000);
}

function loadSceneRendererControlsLoader(){
	// Create scene, renderer
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
	renderer.physicallyCorrectLights = true; // for better light rendering
	renderer.outputEncoding = THREE.sRGBEncoding; // for correct color rendering
	renderer.shadowMap.enabled = true; // enable shadows
	renderer.shadowMap.type = THREE.PCFSoftShadowMap; // softer shadows
	renderer.toneMapping = THREE.ACESFilmicToneMapping; // better dynamic range
	renderer.toneMappingExposure = 1.2; // default exposure

	raycaster = new THREE.Raycaster();

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

		if (orbitControlsisDragging) {
			hideTooltip();
			return;
		}
		
		showTooltip(event);
	});

	renderer.domElement.addEventListener('touchstart', (touch) => {
		touch.preventDefault(); //no scroll or zoom

		const event = touch.touches[0];
		checkIfTouchMoved(event);
	
		let hitObject = showTooltip(event);

		if (hitObject) {
			if (!isTouchMoved && selectedModel) {
			
				if (selectedModel.tooltip && selectedModel.tooltip.link) {
					openLink(selectedModel.tooltip.link);
				}
				else {
					deselectModel();
				}
			}

			// if highlightable...
			if (hitObject.highlightModel !== false) {
				selectedModel = hitObject;			
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
	
	// Hemispehere lightning from config.json
	if (config["lights"] && config["lights"].hemisphere && config["lights"].hemisphere.intensity > 0) {
		const hemi = config["lights"].hemisphere;
		const skyLight = new THREE.HemisphereLight(hemi.color, hemi.groundColor, hemi.intensity);
		scene.add(skyLight);
	}

	// Ambient lightning from config.json
	if (config["lights"] && config["lights"].ambient && config["lights"].ambient.intensity > 0) {
		const amb = config["lights"].ambient;
		const ambientLight = new THREE.AmbientLight(amb.color, amb.intensity);
		scene.add(ambientLight);
	}
	
	//directional lights from config.json
	if (config["lights"] && config["lights"].pointLights) {
		for (const key in config["lights"].pointLights) {
			const pt = config["lights"].pointLights[key];
			if (pt.intensity > 0) {			
				const pointLight = new THREE.DirectionalLight(pt.color, pt.intensity);
				pointLight.position.set(pt.position.x, pt.position.y, pt.position.z);
				scene.add(pointLight);
			}
		}
	}
	
	//sun light
	if (config["lights"] && config["lights"].sun && config["lights"].sun.intensity > 0) {
		const sun = new THREE.DirectionalLight(config["lights"].sun.color, config["lights"].sun.intensity);
		sun.position.set(config["lights"].sun.position.x, config["lights"].sun.position.y, config["lights"].sun.position.z);
		sun.castShadow = false; // enable shadows from sun
		scene.add(sun);
	}

	//init controls based on camera position type (internal/external)
	controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.25;
	controls.screenSpacePanning = true;

	controls.addEventListener('start', () => {
		orbitControlsisDragging = true;
	});
	controls.addEventListener('end', () => {
		orbitControlsisDragging = false;
	});

	loader = new THREE.GLTFLoader()
	const dracoLoader = new THREE.DRACOLoader();
	dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
	loader.setDRACOLoader(dracoLoader);
	
	animate();

}

function loadGLTF(url, onProgress) {
    if (gltfCache.has(url)) return Promise.resolve(gltfCache.get(url));
    return new Promise((resolve, reject) => {
        loader.load(url, (gltf) => {
            gltfCache.set(url, gltf);
            resolve(gltf);
        }, onProgress, reject);
    });
}

function animate() {
	if (scene) {
		requestAnimationFrame(animate);
		controls.update();

		renderer.render(scene, camera);

		// every second make objects  highlited by hotspots glow
		const time = Date.now() * 0.002;
		scene.traverse((child) => {
			if (child.isMesh && child.userData.originalEmissive) {
				const glow = 0.5 + 0.5 * Math.sin(time);
				//I want to glow the color from the original to red
				const red = new THREE.Color(0xff4444);
				const mixedColor = child.userData.originalEmissive.clone().lerp(red, glow);
				child.material.emissive.copy(mixedColor);
			}
		});
	}
}

function loadGLB(filename){
	const glbPath = `3Dobjects/${filename}`;
	// check if file exixsts
	fetch(glbPath)
		.then(response => {
			if (!response.ok) {
				throw new Error('GLB file not found.');
			}
			const configKey = glbPath.split('/').pop();

			if (!camera){
				loadCamera();
			}

			if (!renderer){
				loadSceneRendererControlsLoader();
			}

			loadCameraAndControlsProperties(configKey); // load camera properties based on config for this model (internal/external)

			if (currentGLB !== filename) {
			    currentGLB = filename;
				
				removeModelsButKeepLights(); // remove old model but keep lights and other scene settings

                //  use cacheable loadGLTF helper to load glb and avoid parsing it multiple times if not needed
                loadGLTF(glbPath, function(progressEvent) {
                    if (progressEvent.lengthComputable) {
                        const percentComplete = (progressEvent.loaded / progressEvent.total) * 100;
                        updateProgress(percentComplete);
                    }
                })
                .then(gltf => {
						
						const model = gltf.scene;
						loadModelPropertiesFromJson(model, config, configKey)
				
						model.highlightModel = false; //root object not highlightable
						scene.add(model);
							
						// load hotpots models, if they exists
						if (config[configKey] && config[configKey].hotspots) {
							config[configKey].hotspots.forEach(h => {
								
								const loader2 = new THREE.GLTFLoader(); 
								loader2.setDRACOLoader(loader.dracoLoader);
								loader2.load(`3Dobjects/${h.reference}`, 
									function (gltf_temp) {
										const secondary_model = gltf_temp.scene;
										loadModelPropertiesFromJson(secondary_model, config, h.reference)

										makeSelectable(h, secondary_model); 
										scene.add(secondary_model);
										
									}, 
									function (progressEvent) {
										if (progressEvent.lengthComputable) {
											const percentComplete = (progressEvent.loaded / progressEvent.total) * 100;
											updateProgress(percentComplete);
										}
									},
									function (error) {
										console.error("Error loading model", error);
									}
								);
							});								
						}

						hideLoading();

					}, 
					function (progressEvent) {
						if (progressEvent.lengthComputable) {
							const percentComplete = (progressEvent.loaded / progressEvent.total) * 100;
							updateProgress(percentComplete);
						}
					}, 
					function (error) {
						console.error("Error loading GLB:", error);
					});
				}
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

let orbitControlsisDragging = null;
let selectedModel = null; // model currrently selected by touch
let currentGLB = null; // currently loaded GLB file
let touchStartX = 0;
let touchStartY = 0;
let isTouchMoved = false;
let raycaster, camera, scene, controls, loader;
let renderer = null;

let div_tooltip, exit_btn;
let config = null;

//global variables for bottom-sheet
const sheet = document.getElementById('bottom-sheet');
const handle = document.getElementById('sheet-handle');

const collapsedH = parseInt(getComputedStyle(document.documentElement)
  .getPropertyValue('--sheet-collapsed-h'));
let startY = 0;
let startTranslate = 0;
let currentTranslate = null;

// cache for gltfs
const gltfCache = new Map();

// Top right dropdown menu
document.addEventListener('DOMContentLoaded', function() {
	div_tooltip = document.getElementById('model-tooltip');
	exit_btn = document.getElementById('exit-internal-btn');
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
