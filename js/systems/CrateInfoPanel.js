import { Button } from '../ui/Button.js';
import { Modal } from '../ui/Modal.js';
import { ItemSlot } from '../ui/ItemSlot.js';
import { ItemDropdown } from '../ui/ItemDropdown.js';
import { UIComponentTheme } from '../config/UIComponentTheme.js';

export class CrateInfoPanel {
    constructor(itemRegistry, assetLoader) {
        this.itemRegistry = itemRegistry;
        this.assetLoader = assetLoader;
        this.panel = null;
        this.visible = false;
        this.currentCrate = null;
        this.onDestroyCallback = null;
        this.onSlotClickCallback = null;
        this.inventoryManager = null;

        // Component instances - 9 slots for 3x3 grid
        this.slots = [];
        this.dropdown = null;
        this.currentDropdownSlotIndex = null;

        this.createPanel();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'crate-info-panel';
        this.panel.className = 'plant-info-panel hidden';
        document.body.appendChild(this.panel);

        // Close when clicking outside
        document.addEventListener('pointerdown', (e) => {
            if (!this.visible) return;
            if (this.panel.contains(e.target)) return;

            // Don't close if clicking on dropdown
            if (this.dropdown && this.dropdown.element && this.dropdown.element.contains(e.target)) return;

            // Don't close if clicking on inventory panel
            const inventoryPanel = document.getElementById('inventory-panel');
            if (inventoryPanel && inventoryPanel.contains(e.target)) return;

            this.hide();
        });
    }

    show(crate, screenX, screenY, onDestroy, onSlotClick, inventoryManager) {
        this.currentCrate = crate;
        this.onDestroyCallback = onDestroy;
        this.onSlotClickCallback = onSlotClick;
        this.inventoryManager = inventoryManager;

        const item = this.itemRegistry.getItem(crate.itemId);
        if (!item) {
            this.hide();
            return;
        }

        this.buildPanel();
        this.positionPanel(screenX, screenY);

        this.panel.classList.remove('hidden');
        this.visible = true;
    }

    buildPanel() {
        if (!this.currentCrate) return;

        const crate = this.currentCrate;
        const item = this.itemRegistry.getItem(crate.itemId);
        if (!item) return;

        this.panel.innerHTML = '';
        this.slots = [];

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

        // 3x3 Grid of slots using ItemSlot component
        const gridContainer = document.createElement('div');
        gridContainer.className = 'crate-grid';
        gridContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 5px;
            margin: 15px 0;
            justify-items: center;
        `;

        for (let i = 0; i < 9; i++) {
            const slotData = crate.slots[i];
            const slot = new ItemSlot('small', slotData, this.itemRegistry, this.assetLoader, {
                isOutput: false,
                clickable: true,
                onSlotClick: () => {
                    // Check current state, not captured slotData
                    if (this.currentCrate && this.currentCrate.slots[i]) {
                        // Has items - take them out
                        if (this.onSlotClickCallback) {
                            this.onSlotClickCallback(this.currentCrate, i);
                        }
                    } else {
                        // Empty slot - show dropdown
                        this.showDropdownForSlot(i);
                    }
                }
            });

            this.slots.push(slot);
            gridContainer.appendChild(slot.getElement());
        }

        this.panel.appendChild(gridContainer);

        // Destroy button
        const destroyBtn = new Button('Destroy', '💥', () => {
            if (this.onDestroyCallback) {
                this.onDestroyCallback(this.currentCrate);
            }
            this.hide();
        }, 'danger');
        destroyBtn.getElement().style.width = UIComponentTheme.PANEL.BUTTON.WIDTH;

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'plant-info-buttons';
        buttonContainer.appendChild(destroyBtn.getElement());
        this.panel.appendChild(buttonContainer);
    }

    refresh() {
        if (!this.visible || !this.currentCrate) return;

        const crate = this.currentCrate;

        // Update all slot contents
        for (let i = 0; i < 9; i++) {
            if (this.slots[i]) {
                this.slots[i].updateContents(crate.slots[i]);
            }
        }
    }

    showDropdownForSlot(slotIndex) {
        this.hideDropdown();

        if (!this.inventoryManager || !this.slots[slotIndex]) return;

        this.currentDropdownSlotIndex = slotIndex;

        // Create dropdown using ItemDropdown component with 'storable' class (most items)
        this.dropdown = new ItemDropdown(this.itemRegistry, this.inventoryManager, this.assetLoader, {
            allowedClasses: ['storable'],
            onSelect: (itemId) => {
                // Call the slot click callback with itemId to handle placement
                if (this.onSlotClickCallback) {
                    this.onSlotClickCallback(this.currentCrate, slotIndex, itemId);
                }
                this.hideDropdown();
            }
        });

        // Show dropdown anchored to the clicked slot
        this.dropdown.show(this.slots[slotIndex].getElement());
    }

    hideDropdown() {
        if (this.dropdown) {
            this.dropdown.destroy();
            this.dropdown = null;
        }
        this.currentDropdownSlotIndex = null;
    }

    positionPanel(tileScreenX, tileScreenY) {
        const panelWidth = 250;
        const panelHeight = 380;
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
        this.hideDropdown();
        this.panel.classList.add('hidden');
        this.visible = false;
        this.currentCrate = null;
        this.onDestroyCallback = null;
        this.onSlotClickCallback = null;
        this.inventoryManager = null;
        this.slots = [];
    }

    isVisible() {
        return this.visible;
    }
}
