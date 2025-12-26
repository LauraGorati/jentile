// Funzione per salvare i colori originali (chiamala su ogni modello caricato)
function makeSelectable(h, obj) {
	obj.tooltip = {
        title: h.title,
        text: h.text,
        link: h.link
    };
	
	obj.highlightModel = true;
	// === INFO PER LA TOOLTIP ===
    obj.traverse((child) => {
        if (child.isMesh && child.material) {
            // Salva il colore originale (o emissive se usi emissiveMap)
            child.userData.originalColor = child.material.color.clone();
            // Se usi mappe emissive, salva anche quello
            if (child.material.emissive) {
                child.userData.originalEmissive = child.material.emissive.clone();
            }
        }
    });
}

// Funzione per evidenziare un modello intero di rosso
function highlightModel(model, highlight = true) {
    if (!model || !model.highlightModel) return;

    model.traverse((child) => {
        if (child.isMesh && child.material) {
            if (highlight) {
                // Evidenzia in rosso (puoi cambiare il colore)
                child.material.color.set(0xff0000); // rosso puro
                
                // Opzionale: aggiungi un glow emissivo
                if (child.material.emissive) {
                    child.material.emissive.set(0xff4444);
                }
            } else {
                // Ripristina colore originale
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
	div_tooltip = document.getElementById('model-tooltip');
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
// Variabile globale per tenere traccia del modello attualmente hoverato
let currentHoveredModel = null;
let orbitControlsisDragging = null;

const DEBUG = true;
const folderName = getUrlParameter('imgFolder');
var fileName = getUrlParameter('file');

let div_tooltip;// Mostra un messaggio di errore se non ci sono parametri nell'URL

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
							if (DEBUG){
								console.warn("Config caricata:", config);
							}

							// Crea scena, camera, renderer
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

										// Opzione 1: apre nella stessa finestra (l'utente esce dal viewer)
										window.location.href = link;

										// Opzione 2: apre in nuova scheda (consigliata – l'utente non perde il viewer 3D)
										//window.open(link, '_blank');
										if (DEBUG){	
											console.log(`Hai cliccato su ${rootModel.tooltip.link}`);
																// Opzionale: log completo solo se tieni premuto Shift (per debug)
											if (event.shiftKey) {
												console.log('Dettagli completi:', intersects[0]);
											}
										}
									}
									else{
										if (DEBUG){
											console.log(`Hai cliccato su ${rootModel.name} che non ha un link`);
										}
									}		
								}
							} );

							renderer.domElement.addEventListener('mousemove', (event) => {
								// ignora hover se l’utente sta trascinando
								if (orbitControlsisDragging) {
									div_tooltip.style.display = 'none';//rimuovo tooltip
									// opzionale: rimuovi highlight se ce n’era uno attivo
									if (currentHoveredModel) {
										highlightModel(currentHoveredModel, false);
										currentHoveredModel = null;
									}
									return;
								}
								// Coordinate normalizzate relative al canvas
								const rect = renderer.domElement.getBoundingClientRect();
								mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
								mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

								raycaster.setFromCamera(mouse, camera);

								// Interseca tutti gli oggetti nella scena
								const intersects = raycaster.intersectObjects(scene.children, true);

								let newHoveredModel = null;

								let display_style_tooltip = 'none'
								if (intersects.length > 0) {
									let hitObject = intersects[0].object;

									// Risali fino al modello root (quello con il nome che gli hai dato)
									while (hitObject.parent && hitObject.parent.type !== 'Scene') {
										hitObject = hitObject.parent;
									}
									// gestione tooltip
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
								div_tooltip.style.display = display_style_tooltip;//rimuovo tooltip



								// Se è cambiato il modello sotto il mouse
								if (newHoveredModel !== currentHoveredModel) {
									// Ripristina il precedente
									if (currentHoveredModel) {
										highlightModel(currentHoveredModel, false);
									}

									// Evidenzia il nuovo
									if (newHoveredModel) {
										highlightModel(newHoveredModel, true);
									}

									currentHoveredModel = newHoveredModel;
								}
							});
							const viewerContainer = document.getElementById('viewer-container');
							viewerContainer.innerHTML = '';
							viewerContainer.appendChild(renderer.domElement);
	
							// Luce ambientale
							const ambientLight = new THREE.AmbientLight(0xffffff, 1);
							scene.add(ambientLight);

							// Carica GLB
							const loader = new THREE.GLTFLoader();
							loader.load(fileName, function (gltf) {//è in questo punto che il modello viene caricato in gltf
								const configKey = fileName.split('/').pop();

								const model = gltf.scene;
								const ref = config[configKey]
								model.name = ref.name;
								model.scale.set(ref.scale.x, ref.scale.y, ref.scale.z); // scala
								model.position.set(ref.position.x, ref.position.y, ref.position.z); // spostalo rispetto all'origine

								model.highlightModel = false; //oggetto padre non illuminabile
								scene.add(model);
									
								// Carica i modelli che faranno da hotspot
								if (config[configKey] && config[configKey].hotspots) {
									config[configKey].hotspots.forEach(h => {
										
										const loader2 = new THREE.GLTFLoader(); // puoi riutilizzare lo stesso loader, ma per chiarezza ne creo uno nuovo
										loader2.load(`object3D/${h.reference}`, function (gltf_temp) {
											const secondary_model = gltf_temp.scene;
											
											// Opzionale: ridimensiona, ruota o riposiziona il secondo modello
											secondary_model.scale.set(h.scale.x, h.scale.y, h.scale.z); // scala
											secondary_model.position.set(h.position.x, h.position.y, h.position.z); // spostalo rispetto all'origine
											secondary_model.name = h.name;	
											// Se vuoi attaccarlo a una parte specifica del primo modello (es. un osso o un oggetto chiamato "Hand")
											// Prima trova il nodo nel primo modello:
											// const hand = model.getObjectByName('Hand'); // nome esatto nel GLB
											// if (hand) hand.add(model2);

											// Altrimenti, aggiungilo direttamente alla scena
											makeSelectable(h, secondary_model);  // ← salva colori originali
											scene.add(secondary_model);
											
											}, undefined, function (error) {
												console.error("Errore caricamento secondo modello:", error);
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

								// Controlli Orbit
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
								window.camera = camera; // debug

								// === FUNZIONE ANIMATE CORRETTA ===
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
				if (DEBUG){
					console.error('Tipo di file non supportato');
				}
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
    }
});

