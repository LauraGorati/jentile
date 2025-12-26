
function makeSelectable(h, obj) {
	obj.tooltip = {
        title: h.title,
        text: h.text,
        link: h.link
    };
	
	obj.highlightModel = true;

	obj.traverse((child) => {
        if (child.isMesh && child.material) {
            // Save original color and emissive (if used) for later use
            child.userData.originalColor = child.material.color.clone();

			if (child.material.emissive) {
                child.userData.originalEmissive = child.material.emissive.clone();
            }
        }
    });
}

function highlightModel(model, highlight = true) {
    if (!model || !model.highlightModel) return;

    model.traverse((child) => {
        if (child.isMesh && child.material) {
            if (highlight) {
                // Highlight in red
                child.material.color.set(0xff0000); // rosso puro
                
                // add emissive glow if needed
                if (child.material.emissive) {
                    child.material.emissive.set(0xff4444);
                }
            } else {
                // restore original color
                if (child.userData.originalColor) {
                    child.material.color.copy(child.userData.originalColor);
                }
                if (child.userData.originalEmissive) {
                    child.material.emissive.copy(child.userData.originalEmissive);
                }
            }
        }
    });
}

function getUrlParameter(name) {
	name = name.replace('/[\[]/', '\\[').replace('/[\]]/', '\\]');
	
	var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
	var results = regex.exec(location.search);
	return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

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

function loadModelPropertiesFromJson(model, ref){
	model.name = ref.name;
	model.scale.set(ref.scale.x, ref.scale.y, ref.scale.z); 
	model.position.set(ref.position.x, ref.position.y, ref.position.z); 
}

function loadGLB(file){
	fileName = `3Dobjects/${file}`;
	// check if file exixsts
	fetch(fileName)
		.then(response => {
			if (!response.ok) {
				throw new Error('GLB file not found.');
			}

			// Create scene, camera, renderer
			const scene = new THREE.Scene();
			scene.background = new THREE.Color(0xffffff);

			const camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight / 2), 0.1, 1000);
			const renderer = new THREE.WebGLRenderer();
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(window.innerWidth, window.innerHeight / 2);
			
			const raycaster = new THREE.Raycaster();
			const mouse = new THREE.Vector2()

			renderer.domElement.addEventListener( 'click', (event) =>
			{
				event.preventDefault();

				// Ottieni la posizione del canvas rispetto alla finestra
				const rect = renderer.domElement.getBoundingClientRect();

				// Coordinate mouse relative al canvas
				mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
				mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

				raycaster.setFromCamera( mouse, camera );

				var intersects = raycaster.intersectObjects( scene.children, true );

				if (intersects.length > 0) {
					const hitObject = intersects[0].object;
					
					// Risali la gerarchia fino al root del modello (quello aggiunto con scene.add())
					let rootModel = hitObject;
					while (rootModel.parent && rootModel.parent.type !== 'Scene') {
						rootModel = rootModel.parent;
					}
					const nome = rootModel ? rootModel.name : 'Oggetto senza nome';
					
					//se esiste link associato, lo apro!
					if (rootModel.tooltip && rootModel.tooltip.link){
						const link = rootModel.tooltip.link;

						if (link.endsWith('.glb') && !link.startsWith('http')) {
							//if link is a GLB file, updtae URL without reloading entire page
							const newUrl = new URL(window.location);
							newUrl.searchParams.set('file', link);
							history.pushState({}, '', newUrl);

							loadGLB(link); 
						}
						else if (link.startsWith('http://') || link.startsWith('https://')) {
							// Apri in nuova scheda (consigliato)
               				 window.open(link, '_blank');
						}
	
						if (DEBUG){	
							console.log(`Hai cliccato su ${rootModel.tooltip.link}`);
												// Opzionale: log completo solo se tieni premuto Shift (per debug)
							if (event.shiftKey) {
								console.log('Complete details:', intersects[0]);
							}
						}
					}
					else{
						if (DEBUG){
							console.log(`You clicked on ${rootModel.name} but thers is no link! Check config.json`);
						}
					}		
				}
			} );

			renderer.domElement.addEventListener('mousemove', (event) => {
				// ignora hover if user is dragging
				if (orbitControlsisDragging) {
					div_tooltip.style.display = 'none';//remove tooltip
	
					if (currentHoveredModel) {
						highlightModel(currentHoveredModel, false);
						currentHoveredModel = null;
					}
					return;
				}
				// Canvas coordinates
				const rect = renderer.domElement.getBoundingClientRect();
				mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
				mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

				raycaster.setFromCamera(mouse, camera);

				// intersection with all objects in the scene
				const intersects = raycaster.intersectObjects(scene.children, true);

				let newHoveredModel = null;

				let display_style_tooltip = 'none'
				if (intersects.length > 0) {
					let hitObject = intersects[0].object;

					// find the root model
					while (hitObject.parent && hitObject.parent.type !== 'Scene') {
						hitObject = hitObject.parent;
					}
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
					newHoveredModel = hitObject;
				}
				div_tooltip.style.display = display_style_tooltip;

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
			const viewerContainer = document.getElementById('viewer-container');
			viewerContainer.innerHTML = '';
			viewerContainer.appendChild(renderer.domElement);

			// Ambient lightning
			const ambientLight = new THREE.AmbientLight(0xffffff, 1);
			scene.add(ambientLight);

			// load GLB
			const loader = new THREE.GLTFLoader();
			loader.load(fileName, function (gltf) {//è in questo punto che il modello viene caricato in gltf
				const configKey = fileName.split('/').pop();

				const model = gltf.scene;
				loadModelPropertiesFromJson(model, config[configKey])
		
				model.highlightModel = false; //oggetto padre non illuminabile
				scene.add(model);
					
				// Carica i modelli che faranno da hotspot
				if (config[configKey] && config[configKey].hotspots) {
					config[configKey].hotspots.forEach(h => {
						
						const loader2 = new THREE.GLTFLoader(); // puoi riutilizzare lo stesso loader, ma per chiarezza ne creo uno nuovo
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
				
				// Posizione camera da config
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
				console.error("Errore caricamento GLB:", error);
			});
		})
		.catch(error => {
			const errorMsg = document.createElement('div');
			errorMsg.style.color = 'red';
			errorMsg.style.fontWeight = 'bold';
			errorMsg.style.margin = '40px auto';
			errorMsg.style.textAlign = 'center';
			errorMsg.textContent = "Errore: il file GLB non esiste.";
			document.body.appendChild(errorMsg);
		});
}

//Manage forward/backward commands from browser
window.addEventListener('popstate', (event) => {
    const newFile = getUrlParameter('file');

    if (newFile && newFile.endsWith('.glb')) {
        if (DEBUG){
			console.log('Back to:', newFile);
		}
        loadGLB(newFile);
    } else {
		//fallback to remove old scene
		while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
    }
});

function mainLogic(){

	if (!folderName && !fileName) {
		const errorMsg = document.createElement('div');
		errorMsg.style.color = 'red';
		errorMsg.style.fontWeight = 'bold';
		errorMsg.style.margin = '40px auto';
		errorMsg.style.textAlign = 'center';
		errorMsg.textContent = "No file name provided in URL. Use '?file=name.glb' or '?imgFolder=folder'.";
		document.body.appendChild(errorMsg);
	}
	else {
		if (folderName != '') {
			fileName = folderName + '.xxx';

			// Visualizza le immagini come slider
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
				document.body.appendChild(swiperContainer);

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
						document.body.appendChild(img);
					})
					.catch(error => {
						const errorMsg = document.createElement('div');
						errorMsg.style.color = 'red';
						errorMsg.style.fontWeight = 'bold';
						errorMsg.style.margin = '40px auto';
						errorMsg.style.textAlign = 'center';
						errorMsg.textContent = "Errore: il file immagine non esiste.";
						document.body.appendChild(errorMsg);
						console.error(error);
					});
			} 
			else if (fileType === 'mp4' || fileType === 'webm' || fileType === 'ogg') {
				// display video
				const video = document.createElement('video');
				video.src = fileName;
				video.controls = true;
				video.autoplay = true;
				document.body.appendChild(video);
				
			} 		
			else {
				if (DEBUG){
					console.error('Video format not supported');
				}
			}
		}
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
				descriptionContainer.innerHTML = ''; // Pulisci eventuali precedenti
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
				if (DEBUG){
					console.error('Error loading description file:', error);
				}
			});
		}
}

// Main
// Global variables
const DEBUG = true;
const folderName = getUrlParameter('imgFolder');
var fileName = getUrlParameter('file');

let currentHoveredModel = null;
let orbitControlsisDragging = null;

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
                fetch('3Dobjects/menulist.json')
                    .then(response => response.json())
                    .then(files => {
                        dropdownMenu.innerHTML = '';
                        files.forEach(item => {
                            const link = document.createElement('a');
                            link.href = `?file=${encodeURIComponent(item.file)}`;
                            link.textContent = item.desc;
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
    .catch(err => console.warn('Cannot load html texts: config.json not found', err));

window.addEventListener('resize', () => {
   if (typeof camera !== 'undefined' && typeof renderer !== 'undefined') {
        camera.aspect = window.innerWidth / (window.innerHeight / 2);
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight / 2);
    }
});

