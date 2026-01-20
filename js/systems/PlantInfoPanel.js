import { Button } from '../ui/Button.js';

export class PlantInfoPanel {
    constructor(itemRegistry) {
        this.itemRegistry = itemRegistry;
        this.panel = null;
        this.visible = false;
        this.currentPlant = null;
        this.onHarvestCallback = null;
        this.createPanel();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'plant-info-panel';
        this.panel.className = 'plant-info-panel hidden';
        document.body.appendChild(this.panel);

        // Close when clicking outside
        document.addEventListener('pointerdown', (e) => {
            if (this.visible && !this.panel.contains(e.target)) {
                this.hide();
            }
        });
    }

    show(plant, screenX, screenY, onHarvest) {
        this.currentPlant = plant;
        this.onHarvestCallback = onHarvest;

        const item = this.itemRegistry.getItem(plant.itemId);
        if (!item) {
            this.hide();
            return;
        }

        this.panel.innerHTML = '';

        // Item icon
        const icon = document.createElement('div');
        icon.className = 'plant-info-icon';
        icon.textContent = item.emoji;

        // Item name
        const name = document.createElement('div');
        name.className = 'plant-info-name';
        name.textContent = item.name;

        // Growth description
        const description = document.createElement('div');
        description.className = 'plant-info-description';
        description.textContent = plant.getGrowthDescription(this.itemRegistry);

        this.panel.appendChild(icon);
        this.panel.appendChild(name);
        this.panel.appendChild(description);

        // Add harvest button if mature
        if (plant.canHarvest()) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'plant-info-buttons';

            const harvestBtn = new Button('Harvest', '✂️', () => {
                if (this.onHarvestCallback) {
                    this.onHarvestCallback(plant);
                }
                this.hide();
            }, 'success');

            buttonContainer.appendChild(harvestBtn.getElement());
            this.panel.appendChild(buttonContainer);
        }

        // Position the panel
        this.positionPanel(screenX, screenY);

        this.panel.classList.remove('hidden');
        this.visible = true;
    }

    positionPanel(tileScreenX, tileScreenY) {
        const panelWidth = 250;
        const panelHeight = 200; // Approximate height
        const offset = 20; // Distance from tile

        // Default: position to the left of the tile
        let left = tileScreenX - panelWidth - offset;
        let top = tileScreenY - (panelHeight / 2);

        // If too far left, position to the right instead
        if (left < 20) {
            left = tileScreenX + offset;
        }

        // If too far right, clamp
        if (left + panelWidth > window.innerWidth - 20) {
            left = window.innerWidth - panelWidth - 20;
        }

        // Clamp vertical position
        if (top < 20) {
            top = 20;
        }
        if (top + panelHeight > window.innerHeight - 20) {
            top = window.innerHeight - panelHeight - 20;
        }

        this.panel.style.left = `${left}px`;
        this.panel.style.top = `${top}px`;
    }

    hide() {
        this.panel.classList.add('hidden');
        this.visible = false;
        this.currentPlant = null;
        this.onHarvestCallback = null;
    }

    isVisible() {
        return this.visible;
    }
}
