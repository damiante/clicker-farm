import { Button } from '../ui/Button.js';
import { ItemSlot } from '../ui/ItemSlot.js';
import { ProgressArrow } from '../ui/ProgressArrow.js';
import { ItemDropdown } from '../ui/ItemDropdown.js';
import { UIComponentTheme } from '../config/UIComponentTheme.js';

export class BarrelInfoPanel {
    constructor(itemRegistry, assetLoader) {
        this.itemRegistry = itemRegistry;
        this.assetLoader = assetLoader;
        this.panel = null;
        this.visible = false;
        this.currentBarrel = null;
        this.onPickupCallback = null;
        this.onInputClickCallback = null;
        this.onOutputClickCallback = null;
        this.refreshInterval = null;

        // Component instances
        this.inputSlot = null;
        this.outputSlot = null;
        this.progressArrow = null;
        this.itemDropdown = null;
        this.inventoryManager = null;  // Store for dropdown

        // DOM element references
        this.pickupButtonElement = null;
        this.buttonContainerElement = null;

        this.createPanel();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'barrel-info-panel';
        this.panel.className = 'plant-info-panel hidden'; // Reuse plant info panel styles
        document.body.appendChild(this.panel);

        // Close when clicking outside (but not on inventory panel or dropdown)
        document.addEventListener('pointerdown', (e) => {
            if (!this.visible) return;

            // Don't close if clicking on the panel itself
            if (this.panel.contains(e.target)) return;

            // Don't close if clicking on the dropdown
            if (this.itemDropdown && this.itemDropdown.element && this.itemDropdown.element.contains(e.target)) return;

            // Don't close if clicking on the inventory panel
            const inventoryPanel = document.getElementById('inventory-panel');
            if (inventoryPanel && inventoryPanel.contains(e.target)) return;

            // Don't close if clicking on the item preview panel
            const itemPreviewPanel = document.getElementById('item-preview-panel');
            if (itemPreviewPanel && itemPreviewPanel.contains(e.target)) return;

            this.hide();
        });
    }

    show(barrel, screenX, screenY, onPickup, onInputClick, onOutputClick, inventoryManager) {
        this.currentBarrel = barrel;
        this.onPickupCallback = onPickup;
        this.onInputClickCallback = onInputClick;
        this.onOutputClickCallback = onOutputClick;
        this.inventoryManager = inventoryManager;

        const item = this.itemRegistry.getItem(barrel.itemId);
        if (!item) {
            this.hide();
            return;
        }

        this.buildPanel();

        // Position the panel
        this.positionPanel(screenX, screenY);

        this.panel.classList.remove('hidden');
        this.visible = true;

        // Start refresh interval to update fermentation progress
        this.startRefreshInterval();
    }

    buildPanel() {
        if (!this.currentBarrel) return;

        const barrel = this.currentBarrel;
        const item = this.itemRegistry.getItem(barrel.itemId);
        if (!item) return;

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

        // Add fermentation slots using new components
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'barrel-slots';
        slotsContainer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin: 15px 0;
        `;

        // Input slot (clickable) - using ItemSlot component
        this.inputSlot = new ItemSlot('small', barrel.inputSlot, this.itemRegistry, this.assetLoader, {
            isOutput: false,
            clickable: true,
            onSlotClick: (e) => {
                e.stopPropagation();
                if (this.onInputClickCallback) {
                    this.onInputClickCallback(this.currentBarrel);
                }
            }
        });
        const inputElement = this.inputSlot.getElement();
        inputElement.title = 'Input slot - Click to add/remove items';

        // Progress arrow - using ProgressArrow component
        this.progressArrow = new ProgressArrow(barrel.getFermentationProgress(), {
            color: UIComponentTheme.PROGRESS.ARROW.COLORS.BARREL
        });

        // Output slot (clickable, greyed out) - using ItemSlot component
        this.outputSlot = new ItemSlot('small', barrel.outputSlot, this.itemRegistry, this.assetLoader, {
            isOutput: true,
            clickable: true,
            onSlotClick: () => {
                if (this.onOutputClickCallback && this.currentBarrel.outputSlot) {
                    this.onOutputClickCallback(this.currentBarrel);
                }
            }
        });
        const outputElement = this.outputSlot.getElement();
        outputElement.title = 'Output slot - Click to take items';

        slotsContainer.appendChild(inputElement);
        slotsContainer.appendChild(this.progressArrow.getElement());
        slotsContainer.appendChild(outputElement);

        this.panel.appendChild(slotsContainer);

        // Add buttons
        this.buttonContainerElement = document.createElement('div');
        this.buttonContainerElement.className = 'plant-info-buttons';

        // Create Pickup button
        const canPickup = barrel.canPickup();
        const buttonText = canPickup ? 'Pick up' : 'Fermenting...';
        this.pickupButtonElement = new Button(buttonText, '🖐️', () => {
            if (this.currentBarrel.canPickup() && this.onPickupCallback) {
                this.onPickupCallback(this.currentBarrel);
                this.hide();
            }
        }, canPickup ? 'success' : 'disabled');
        this.pickupButtonElement.getElement().style.width = UIComponentTheme.PANEL.BUTTON.WIDTH;

        // Add pickup button
        this.buttonContainerElement.appendChild(this.pickupButtonElement.getElement());
        this.panel.appendChild(this.buttonContainerElement);
    }

    refresh() {
        if (!this.currentBarrel) return;

        const barrel = this.currentBarrel;

        // Update input slot contents using ItemSlot.updateContents()
        if (this.inputSlot) {
            this.inputSlot.updateContents(barrel.inputSlot);
        }

        // Update output slot contents using ItemSlot.updateContents()
        if (this.outputSlot) {
            this.outputSlot.updateContents(barrel.outputSlot);
        }

        // Update progress arrow using ProgressArrow.updateProgress()
        if (this.progressArrow) {
            this.progressArrow.updateProgress(barrel.getFermentationProgress());
        }

        // Update pickup button
        if (this.pickupButtonElement) {
            const canPickup = barrel.canPickup();
            const buttonText = canPickup ? 'Pick up' : 'Fermenting...';

            this.pickupButtonElement.setText(buttonText);

            if (canPickup) {
                this.pickupButtonElement.setEnabled(true);
            } else {
                this.pickupButtonElement.setEnabled(false);
            }
        }
    }

    startRefreshInterval() {
        // Clear any existing interval
        this.stopRefreshInterval();

        // Refresh every 100ms to update progress bar
        this.refreshInterval = setInterval(() => {
            if (this.visible && this.currentBarrel) {
                this.refresh();
            }
        }, 100);
    }

    stopRefreshInterval() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    positionPanel(tileScreenX, tileScreenY) {
        const panelWidth = 250;
        const panelHeight = 300;
        const offset = 20;

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
        this.stopRefreshInterval();
        this.hideItemDropdown();
        this.panel.classList.add('hidden');
        this.visible = false;
        this.currentBarrel = null;
        this.onPickupCallback = null;
        this.onInputClickCallback = null;
        this.onOutputClickCallback = null;
        this.inventoryManager = null;
    }

    isVisible() {
        return this.visible;
    }

    showItemDropdown(onSelect) {
        // Remove existing dropdown if any
        this.hideItemDropdown();

        if (!this.inventoryManager || !this.inputSlot) return;

        // Create dropdown using ItemDropdown component
        this.itemDropdown = new ItemDropdown(this.itemRegistry, this.inventoryManager, this.assetLoader, {
            allowedClasses: ['fermentable'],
            onSelect: (itemId) => {
                onSelect(itemId);
                this.hideItemDropdown();
            }
        });

        // Show dropdown anchored to input slot
        this.itemDropdown.show(this.inputSlot.getElement());
    }

    hideItemDropdown() {
        if (this.itemDropdown) {
            this.itemDropdown.destroy();
            this.itemDropdown = null;
        }
    }

    refreshDropdown() {
        // Dropdown auto-refreshes via ItemDropdown component
        if (this.itemDropdown) {
            this.itemDropdown.refresh();
        }
    }
}
