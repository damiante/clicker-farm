import { Button } from '../ui/Button.js';
import { Modal } from '../ui/Modal.js';
import { ItemSlot } from '../ui/ItemSlot.js';
import { ProgressArrow } from '../ui/ProgressArrow.js';
import { ItemDropdown } from '../ui/ItemDropdown.js';
import { UIComponentTheme } from '../config/UIComponentTheme.js';

export class FurnaceInfoPanel {
    constructor(itemRegistry, assetLoader) {
        this.itemRegistry = itemRegistry;
        this.assetLoader = assetLoader;
        this.panel = null;
        this.visible = false;
        this.currentFurnace = null;
        this.onDestroyCallback = null;
        this.onSmeltSlotClickCallback = null;
        this.onFuelSlotClickCallback = null;
        this.onOutputSlotClickCallback = null;
        this.refreshInterval = null;
        this.inventoryManager = null;

        // Component instances
        this.smeltSlot = null;
        this.fuelSlot = null;
        this.outputSlot = null;
        this.progressArrow = null;
        this.smeltDropdown = null;
        this.fuelDropdown = null;

        this.createPanel();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'furnace-info-panel';
        this.panel.className = 'plant-info-panel hidden';
        document.body.appendChild(this.panel);

        // Close when clicking outside
        document.addEventListener('pointerdown', (e) => {
            if (!this.visible) return;
            if (this.panel.contains(e.target)) return;

            // Don't close if clicking on dropdown
            if (this.smeltDropdown && this.smeltDropdown.element && this.smeltDropdown.element.contains(e.target)) return;
            if (this.fuelDropdown && this.fuelDropdown.element && this.fuelDropdown.element.contains(e.target)) return;

            // Don't close if clicking on the inventory panel
            const inventoryPanel = document.getElementById('inventory-panel');
            if (inventoryPanel && inventoryPanel.contains(e.target)) return;

            this.hide();
        });
    }

    show(furnace, screenX, screenY, onDestroy, onSmeltSlotClick, onFuelSlotClick, onOutputSlotClick, inventoryManager) {
        this.currentFurnace = furnace;
        this.onDestroyCallback = onDestroy;
        this.onSmeltSlotClickCallback = onSmeltSlotClick;
        this.onFuelSlotClickCallback = onFuelSlotClick;
        this.onOutputSlotClickCallback = onOutputSlotClick;
        this.inventoryManager = inventoryManager;

        const item = this.itemRegistry.getItem(furnace.itemId);
        if (!item) {
            this.hide();
            return;
        }

        this.buildPanel();
        this.positionPanel(screenX, screenY);

        this.panel.classList.remove('hidden');
        this.visible = true;

        // Start refresh interval to update smelting progress
        this.startRefreshInterval();
    }

    buildPanel() {
        if (!this.currentFurnace) return;

        const furnace = this.currentFurnace;
        const item = this.itemRegistry.getItem(furnace.itemId);
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

        // Furnace slots using new components
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'furnace-slots';
        slotsContainer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin: 15px 0;
        `;

        // Left side: 2 input slots stacked
        const inputSlotsContainer = document.createElement('div');
        inputSlotsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 5px;
        `;

        // Smelt slot (top) - using ItemSlot component
        this.smeltSlot = new ItemSlot('small', furnace.smeltSlot, this.itemRegistry, this.assetLoader, {
            isOutput: false,
            clickable: true,
            onSlotClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.onSmeltSlotClickCallback) {
                    this.onSmeltSlotClickCallback(this.currentFurnace);
                }
            }
        });
        this.smeltSlot.getElement().title = 'Smelt slot - Click to add/remove items';

        // Fuel slot (bottom) - using ItemSlot component
        this.fuelSlot = new ItemSlot('small', furnace.fuelSlot, this.itemRegistry, this.assetLoader, {
            isOutput: false,
            clickable: true,
            onSlotClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.onFuelSlotClickCallback) {
                    this.onFuelSlotClickCallback(this.currentFurnace);
                }
            }
        });
        this.fuelSlot.getElement().title = 'Fuel slot - Click to add/remove fuel';

        inputSlotsContainer.appendChild(this.smeltSlot.getElement());
        inputSlotsContainer.appendChild(this.fuelSlot.getElement());

        // Progress arrow - using ProgressArrow component
        this.progressArrow = new ProgressArrow(furnace.getSmeltingProgress(), {
            color: UIComponentTheme.PROGRESS.ARROW.COLORS.FURNACE
        });

        // Output slot (right) - using ItemSlot component
        this.outputSlot = new ItemSlot('small', furnace.outputSlot, this.itemRegistry, this.assetLoader, {
            isOutput: true,
            clickable: true,
            onSlotClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.onOutputSlotClickCallback && this.currentFurnace.outputSlot) {
                    this.onOutputSlotClickCallback(this.currentFurnace);
                }
            }
        });
        this.outputSlot.getElement().title = 'Output slot - Click to take items';

        slotsContainer.appendChild(inputSlotsContainer);
        slotsContainer.appendChild(this.progressArrow.getElement());
        slotsContainer.appendChild(this.outputSlot.getElement());

        this.panel.appendChild(slotsContainer);

        // Destroy button (disabled during smelting)
        const isSmelting = furnace.isSmelting();
        const destroyBtn = new Button(
            'Destroy',
            '💥',
            isSmelting ? null : () => {
                if (this.onDestroyCallback) {
                    this.onDestroyCallback(this.currentFurnace);
                }
                this.hide();
            },
            isSmelting ? 'disabled' : 'danger'
        );
        destroyBtn.getElement().style.width = UIComponentTheme.PANEL.BUTTON.WIDTH;

        if (isSmelting) {
            destroyBtn.getElement().title = 'Cannot destroy while smelting';
        }

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'plant-info-buttons';
        buttonContainer.appendChild(destroyBtn.getElement());
        this.panel.appendChild(buttonContainer);
    }

    refresh() {
        if (!this.visible || !this.currentFurnace) return;

        const furnace = this.currentFurnace;

        // Update slot contents using ItemSlot.updateContents()
        if (this.smeltSlot) {
            this.smeltSlot.updateContents(furnace.smeltSlot);
        }

        if (this.fuelSlot) {
            this.fuelSlot.updateContents(furnace.fuelSlot);
        }

        if (this.outputSlot) {
            this.outputSlot.updateContents(furnace.outputSlot);
        }

        // Update progress arrow using ProgressArrow.updateProgress()
        if (this.progressArrow) {
            this.progressArrow.updateProgress(furnace.getSmeltingProgress());
        }
    }

    showSmeltDropdown(onSelect) {
        this.hideSmeltDropdown();

        if (!this.inventoryManager || !this.smeltSlot) return;

        // Create dropdown using ItemDropdown component with 'smeltable' class
        this.smeltDropdown = new ItemDropdown(this.itemRegistry, this.inventoryManager, this.assetLoader, {
            allowedClasses: ['smeltable'],
            onSelect: (itemId) => {
                onSelect(itemId);
                this.hideSmeltDropdown();
            }
        });

        // Show dropdown anchored to smelt slot
        this.smeltDropdown.show(this.smeltSlot.getElement());
    }

    showFuelDropdown(onSelect) {
        this.hideFuelDropdown();

        if (!this.inventoryManager || !this.fuelSlot) return;

        // Create dropdown using ItemDropdown component with 'combustible' class
        this.fuelDropdown = new ItemDropdown(this.itemRegistry, this.inventoryManager, this.assetLoader, {
            allowedClasses: ['combustible'],
            onSelect: (itemId) => {
                onSelect(itemId);
                this.hideFuelDropdown();
            }
        });

        // Show dropdown anchored to fuel slot
        this.fuelDropdown.show(this.fuelSlot.getElement());
    }

    hideSmeltDropdown() {
        if (this.smeltDropdown) {
            this.smeltDropdown.destroy();
            this.smeltDropdown = null;
        }
    }

    hideFuelDropdown() {
        if (this.fuelDropdown) {
            this.fuelDropdown.destroy();
            this.fuelDropdown = null;
        }
    }

    startRefreshInterval() {
        this.stopRefreshInterval();

        // Refresh every 100ms to update progress bar
        this.refreshInterval = setInterval(() => {
            if (this.visible && this.currentFurnace) {
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
        const panelHeight = 320;
        const offset = 20;

        let left = tileScreenX - panelWidth - offset;
        let top = tileScreenY - (panelHeight / 2);

        if (left < 20) {
            left = tileScreenX + offset;
        }

        if (left + panelWidth > window.innerWidth - 20) {
            left = window.innerWidth - panelWidth - 20;
        }

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
        this.hideSmeltDropdown();
        this.hideFuelDropdown();
        this.panel.classList.add('hidden');
        this.visible = false;
        this.currentFurnace = null;
        this.onDestroyCallback = null;
        this.onSmeltSlotClickCallback = null;
        this.onFuelSlotClickCallback = null;
        this.onOutputSlotClickCallback = null;
        this.inventoryManager = null;
    }

    isVisible() {
        return this.visible;
    }
}
