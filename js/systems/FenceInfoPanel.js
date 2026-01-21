import { Button } from '../ui/Button.js';

export class FenceInfoPanel {
    constructor(itemRegistry) {
        this.itemRegistry = itemRegistry;
        this.panel = null;
        this.visible = false;
        this.currentFence = null;
        this.onPickupCallback = null;
        this.createPanel();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'fence-info-panel';
        this.panel.className = 'plant-info-panel hidden'; // Reuse plant info panel styles
        document.body.appendChild(this.panel);

        // Close when clicking outside
        document.addEventListener('pointerdown', (e) => {
            if (this.visible && !this.panel.contains(e.target)) {
                this.hide();
            }
        });
    }

    show(fence, screenX, screenY, onPickup) {
        this.currentFence = fence;
        this.onPickupCallback = onPickup;

        const item = this.itemRegistry.getItem(fence.itemId);
        if (!item) {
            this.hide();
            return;
        }

        this.panel.innerHTML = '';

        // Item icon
        const icon = document.createElement('div');
        icon.className = 'plant-info-icon';

        if (item.image) {
            const img = document.createElement('img');
            img.src = `./assets/${item.image}`;
            img.alt = item.name;
            img.style.width = '60px';
            img.style.height = '60px';
            img.style.objectFit = 'contain';
            icon.appendChild(img);
        } else {
            icon.textContent = item.emoji;
        }

        // Item name
        const name = document.createElement('div');
        name.className = 'plant-info-name';
        name.textContent = item.name;

        // Item description
        const description = document.createElement('div');
        description.className = 'plant-info-description';
        description.textContent = item.description;

        this.panel.appendChild(icon);
        this.panel.appendChild(name);
        this.panel.appendChild(description);

        // Add pickup button
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'plant-info-buttons';

        const pickupBtn = new Button('Pick up', '🖐️', () => {
            if (this.onPickupCallback) {
                this.onPickupCallback(fence);
            }
            this.hide();
        }, 'success');

        buttonContainer.appendChild(pickupBtn.getElement());
        this.panel.appendChild(buttonContainer);

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
        this.currentFence = null;
        this.onPickupCallback = null;
    }

    isVisible() {
        return this.visible;
    }
}
