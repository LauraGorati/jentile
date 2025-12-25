    // Funzione per ottenere i parametri URL
function getUrlParameter(name) {
	name = name.replace('/[\[]/', '\\[').replace('/[\]]/', '\\]');
	
	var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
	var results = regex.exec(location.search);
	return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Funzione per aprire l'immagine a schermo intero 
function openFullscreen(src) 
{ 
	const fullscreenDiv = document.createElement('div'); 
	fullscreenDiv.className = 'fullscreen'; 
	const img = document.createElement('img'); 
	img.src = src; 
	img.style.width = '100vw'; // Imposta la larghezza dell'immagine al 100% della larghezza dello schermo 
	img.style.height = '100vh'; // Imposta l'altezza dell'immagine al 100% dell'altezza dello schermo 
	img.style.objectFit = 'contain'; // Mantiene le proporzioni dell'immagine
	
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

// Menu a tendina
document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.getElementById('menu-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    let menuLoaded = false;

    menuBtn.addEventListener('click', function() {
        if (dropdownMenu.style.display === 'none') {
            dropdownMenu.style.display = 'block';
            if (!menuLoaded) {
                fetch('object3D/list.json')
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

    // Chiudi il menu se clicchi fuori
    document.addEventListener('click', function(e) {
        if (!menuBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.style.display = 'none';
        }
    });
});

// Main
const folderName = getUrlParameter('imgFolder');
var fileName = getUrlParameter('file');

// Mostra un messaggio di errore se non ci sono parametri nell'URL
if (!folderName && !fileName) {
	const errorMsg = document.createElement('div');
	errorMsg.style.color = 'red';
	errorMsg.style.fontWeight = 'bold';
	errorMsg.style.margin = '40px auto';
	errorMsg.style.textAlign = 'center';
	errorMsg.textContent = "Errore: nessun parametro URL fornito. Usa '?file=nome.glb' oppure '?imgFolder=cartella'.";
	document.body.appendChild(errorMsg);
}
else {
	if (folderName != '') {
		fileName = folderName + '.xxx';

		// Visualizza le immagini come slider
		fetch(`${folderName}/images.json`)				
 			.then(response => {
                if (!response.ok) {
                    throw new Error('Cartella o file images.json non trovati.');
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
				img.addEventListener('click', () => openFullscreen(img.src));
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
				loop: false, // Disabilita la modalitÃ  ad anello
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
		.catch(error => console.error('Errore nel caricamento delle immagini:', error));		
	}
	else
	{
		// Ottieni il nome del file dal parametro URL
		fileName = getUrlParameter('file');
		
		const fileType = fileName.split('.').pop().toLowerCase();
	
	if (fileType === 'glb') {		
    fileName = `object3D/${fileName}`;

    // Verifica che il file GLB esista
    fetch(fileName)
        .then(response => {
            if (!response.ok) {
                throw new Error('File GLB non trovato.');
            }

            // Carica config.json
            fetch('config.json')
                .then(r => r.json())
					.then(config => {
						console.warn("Config caricata:", config);

						// Crea scena, camera, renderer
						const scene = new THREE.Scene();
						scene.background = new THREE.Color(0xffffff);

						const camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight / 2), 0.1, 1000);
						const renderer = new THREE.WebGLRenderer();
						renderer.setPixelRatio(window.devicePixelRatio);
						renderer.setSize(window.innerWidth, window.innerHeight / 2);
						
						// CSS2DRenderer per hotspot (labels) -- richiede three/examples/jsm/renderers/CSS2DRenderer.js incluso nella pagina
						const labelRenderer = new THREE.CSS2DRenderer();
						labelRenderer.setSize(window.innerWidth, window.innerHeight / 2);
						labelRenderer.domElement.style.position = 'absolute';
						labelRenderer.domElement.style.top = '0';
						labelRenderer.domElement.style.pointerEvents = 'none'; // non blocca eventi sul canvas; i singoli div avranno pointerEvents attivi
	
						const viewerContainer = document.getElementById('viewer-container');
						viewerContainer.innerHTML = '';
						viewerContainer.appendChild(renderer.domElement);
						viewerContainer.appendChild(labelRenderer.domElement);
						window.labelRenderer = labelRenderer;
  
						// Luce ambientale
						const ambientLight = new THREE.AmbientLight(0xffffff, 1);
						scene.add(ambientLight);

						// Carica GLB
						const loader = new THREE.GLTFLoader();
						loader.load(fileName, function (gltf) {
							const model = gltf.scene;

							const configKey = fileName.split('/').pop();

							// === HOTSPOT CON CSS2DObject ===
							if (config[configKey] && config[configKey].hotspots) {
								config[configKey].hotspots.forEach(h => {
									// Div HTML per l'hotspot
									const div = document.createElement('div');
									div.className = 'hotspot';
									div.textContent = '●';
									div.style.color = 'red';
									div.style.fontSize = '30px';
									div.style.cursor = 'pointer';
									div.style.userSelect = 'none';
									div.style.pointerEvents = 'auto'; // consente il click sul div anche se labelRenderer ha pointerEvents:none

																		// Anchor nel modello: posizione locale corretta e label a (0,0,0) rispetto all'anchor
									const anchor = new THREE.Object3D();
									anchor.position.set(h.position.x, h.position.y, h.position.z);
									const hotspotLabel = new THREE.CSS2DObject(div);
									hotspotLabel.position.set(0, 0, 0);
									anchor.add(hotspotLabel);
									// Se config fornisce un parentName, aggancia lì; altrimenti cerca il primo mesh visibile
									let attachTo = model;
									if (h.parentName) {
										const p = model.getObjectByName(h.parentName);
										if (p) attachTo = p;
									} else {
										const meshChild = model.children.find(c => c.isMesh || c.type === 'Mesh');
										if (meshChild) attachTo = meshChild;
									}
									attachTo.add(anchor);

									// Click sull'hotspot
									div.addEventListener('click', (event) => {
										event.stopPropagation(); // impedisce che il click interferisca con la rotazione
										if (h.link) {
											window.open(h.link, '_blank');
										} else if (h.text) {
											alert(h.text);
										}
									});
								});
							}

							scene.add(model);

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

							// Controlli Orbit
							const controls = new THREE.OrbitControls(camera, renderer.domElement);
							controls.enableDamping = true;
							controls.dampingFactor = 0.25;
							controls.screenSpacePanning = false;
							controls.minDistance = 0.5;
							controls.maxDistance = 1.5;
							controls.enablePan = isPanEnabled;

							window.camera = camera; // debug

							// === FUNZIONE ANIMATE CORRETTA ===
							function animate() {
								requestAnimationFrame(animate);
								controls.update();

								renderer.render(scene, camera);
								// render labels sopra il canvas (si aggiorna con la camera)
								if (window.labelRenderer) {
 									window.labelRenderer.render(scene, camera);
								}
							}

							animate();

						}, undefined, function (error) {
							console.error("Errore caricamento GLB:", error);
						});

					})
					.catch(err => console.error("Errore nel caricamento config:", err));
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
		else if (fileType === 'jpg' || fileType === 'png' || fileType === 'gif' || fileType === 'jpeg') {
			// Verifica che il file immagine esista
            fetch(fileName)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('File immagine non trovato.');
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
			// Visualizza il video
			const video = document.createElement('video');
			video.src = fileName;
			video.controls = true;
			video.autoplay = true;
			document.body.appendChild(video);
			
		} 
		
		else {
			console.error('Tipo di file non supportato');
		}
	}
	// Carica la descrizione dal file .txt 
	const txtFileName = fileName.replace(/\.[^/.]+$/, ".txt");
	fetch(txtFileName)
		.then(response => {
			if (!response.ok) {
				throw new Error('File di descrizione non trovato.');
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
			errorMsg.textContent = "Errore: il file di descrizione non esiste.";
			document.body.appendChild(errorMsg);
			console.error('Errore nel caricamento del file di descrizione:', error);
		});
}

window.addEventListener('resize', () => {
   if (typeof camera !== 'undefined' && typeof renderer !== 'undefined') {
        camera.aspect = window.innerWidth / (window.innerHeight / 2);
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight / 2);
        if (window.labelRenderer){
			window.labelRenderer.setSize(window.innerWidth, window.innerHeight / 2);
		} 
    }
});
