
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

export function highlightModel(model, highlight = true) {
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

export function loadModelPropertiesFromJson(model, ref){
	model.name = ref.name;
	model.scale.set(ref.scale.x, ref.scale.y, ref.scale.z); 
	model.position.set(ref.position.x, ref.position.y, ref.position.z); 
}
