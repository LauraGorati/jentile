    // Funzione per ottenere i parametri URL
        function getUrlParameter(name) {
            name = name.replace('/[\[]/', '\\[').replace('/[\]]/', '\\]');
			
            var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
            var results = regex.exec(location.search);
            return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
        }

        const folderName = getUrlParameter('imgFolder');
		var fileName = getUrlParameter('file');

		
		if (folderName != '')
		{
			fileName = folderName + '.xxx';

			// Visualizza le immagini come slider
			fetch(`${folderName}/images.json`)				
				.then(response => response.json()) 
				.then(data => 
					{ 
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
				// Crea la scena
				const scene = new THREE.Scene();
				scene.background = new THREE.Color(0xffffff); // Imposta lo sfondo bianco
				const camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight / 2), 0.1, 1000);
				const renderer = new THREE.WebGLRenderer();
				renderer.setPixelRatio(window.devicePixelRatio); // Ottimizza la risoluzione
				renderer.setSize(window.innerWidth, window.innerHeight / 2);
				document.body.appendChild(renderer.domElement);

				// Aggiungi una luce ambientale
				const ambientLight = new THREE.AmbientLight(0xffffff, 1); // Luce ambientale bianca
				scene.add(ambientLight);

				// Carica il file GLB
				const loader = new THREE.GLTFLoader();
				loader.load(fileName, function (gltf) {
					scene.add(gltf.scene);
					renderer.render(scene, camera);
				}, undefined, function (error) {
					console.error(error);
				});

				fetch('config.json')
				.then(response => response.json())
				.then(config => {
					const configKey = fileName.split('/').pop(); // solo il nome del file

					if (config[configKey] && config[configKey].cameraPosition) {
					const camType = config[configKey].cameraPosition.type;
					const pos = config[configKey].cameraPosition[camType];
					if (pos) {
    					camera.position.set(pos.x, pos.y, pos.z);
    					console.warn('Caricato attributo "position"', `${pos.x} ${pos.y} ${pos.z}`);
						}
					}
				})
				.catch(err => {
					camera.position.z = 5; //default
					console.warn('Impossibile caricare config.json:', err);
				});

				// Aggiungi i controlli per la rotazione
				const controls = new THREE.OrbitControls(camera, renderer.domElement);
				controls.enableDamping = true; // Abilita l'ammortizzazione (inertia)
				controls.dampingFactor = 0.25;
				controls.screenSpacePanning = false;
				controls.minDistance = 1;
				controls.maxDistance = 1000;

				// Funzione di animazione
				function animate() {
					requestAnimationFrame(animate);
					controls.update(); // Aggiorna i controlli
					renderer.render(scene, camera);
				}
				  animate();
			} 
			else if (fileType === 'jpg' || fileType === 'png' || fileType === 'gif' || fileType === 'jpeg') {
				// Visualizza l'immagine
				const img = document.createElement('img');
				img.src = fileName;
				document.body.appendChild(img);
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
			.then(response => response.text()) 
			.then(text => { 
				const description = document.createElement('p'); 
				description.textContent = text; document.body.appendChild(description); 
				})
		.catch(error => console.error('Errore nel caricamento del file di descrizione:', error));
		
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