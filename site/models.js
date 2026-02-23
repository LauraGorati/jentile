
export function makeSelectable(h, obj) {
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

export function loadModelPropertiesFromJson(model, config, key){
    let ref = config[key];
	model.name = key;
	model.scale.set(ref.scale.x, ref.scale.y, ref.scale.z); 
	model.position.set(ref.position.x, ref.position.y, ref.position.z); 
}

export function loadCameraPropertiesFromJson(camera, config, key){
    const camType = config[key].cameraPosition.type;
    let isInternal = false;
    if (camType === "internal") {
        isInternal = true;
    }
    const pos = config[key].cameraPosition.position;
    if (pos) {
        camera.position.set(pos.x, pos.y, pos.z);
    }

    return isInternal;
}

export function configureControlsOptions(controls, isInternal, position){
    // Disable up/down movement for external only: lock polar angle to current camera polar
    // compute current polar angle relative to controls.target
    controls.enablePan = !isInternal; // allow/deny panning per config
	controls.enableZoom = !isInternal;
    
    if (isInternal) {
        controls.minDistance = -5;
        controls.maxDistance = 5;  
        controls.minAzimuthAngle = -Infinity; // allow looking left/right freely
        controls.maxAzimuthAngle = Infinity;
        controls.minPolarAngle = 0; // allow looking up/down freely
        controls.maxPolarAngle = Math.PI;
        // Reset target
        controls.target.set(0, 0, 0);
    }
    else{
        controls.minDistance = 0.3;
        controls.maxDistance = 20;  
        // Limit left/right to ±45°, or custom values from config
        controls.minAzimuthAngle = -Math.PI / 2.25; // -80°
        controls.maxAzimuthAngle = Math.PI / 2.25;  // +80°
        const offset = new THREE.Vector3().copy(position).sub(controls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        controls.minPolarAngle = spherical.phi;
        controls.maxPolarAngle = spherical.phi;
    }
    controls.update();
}