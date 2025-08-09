export function renderPheromoneCheckboxes(pheromoneTypes) {
    // Create or select the container
    let container = document.getElementById('pheromoneCheckboxes');
    if (!container) {
        container = document.createElement('div');
        container.id = 'pheromoneCheckboxes';
        container.style.position = 'fixed';
        container.style.top = '10px';
        container.style.left = '10px';
        container.style.background = 'rgba(255,255,255,0.8)';
        container.style.padding = '8px';
        container.style.borderRadius = '6px';
        document.body.appendChild(container);
    }
    container.innerHTML = '<strong>Pheromones:</strong><br>';

    // Initialize enabledPheromones as a Set if not present
    if (!window.enabledPheromones || !(window.enabledPheromones instanceof Set)) {
        window.enabledPheromones = new Set(pheromoneTypes);
    }

    pheromoneTypes.forEach(type => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `pheromone_${type}`;
        checkbox.checked = window.enabledPheromones.has(type);
        checkbox.onchange = () => {
            if (checkbox.checked) {
                window.enabledPheromones.add(type);
            } else {
                window.enabledPheromones.delete(type);
            }
        };
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = type;

        // Show max intensity from PHEROMONE_TYPES
        let maxIntensity = '';
        if (window.PHEROMONE_TYPES) {
            const pt = window.PHEROMONE_TYPES.find(pt => pt.key === type);
            if (pt && typeof pt.maxIntensity === 'number') {
                maxIntensity = ` (max: ${pt.maxIntensity.toFixed(2)})`;
            }
        }
        label.textContent += maxIntensity;

        container.appendChild(checkbox);
        container.appendChild(label);
        container.appendChild(document.createElement('br'));
    });
}