import { Button } from '../ui/Button.js';
import { Modal } from '../ui/Modal.js';

export class CrateInfoPanel {
    constructor(itemRegistry) {
        this.itemRegistry = itemRegistry;
        this.panel = null;
        this.visible = false;
        this.currentCrate = null;
        this.onDestroyCallback = null;
        this.onSlotClickCallback = null;
        this.dropdown = null;
        this.dropdownClickHandler = null;
        this.currentDropdownSlot = null;  // Track which slot the dropdown is for
        this.inventoryManager = null;  // Will be set via show() method
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

            // Don't close if clicking on the inventory panel
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

        // 3x3 grid of slots
        const gridContainer = document.createElement('div');
        gridContainer.className = 'crate-grid';
        gridContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 50px);
            grid-template-rows: repeat(3, 50px);
            gap: 5px;
            margin: 15px auto;
            justify-content: center;
        `;

        for (let i = 0; i < 9; i++) {
            const slot = this.createSlot(crate.slots[i], i);
            gridContainer.appendChild(slot);
        }

        this.panel.appendChild(gridContainer);

        // Destroy button
        const destroyBtn = new Button('Destroy', '💥', () => {
            this.showDestroyConfirmation();
        }, 'danger');

        this.panel.appendChild(destroyBtn.getElement());
    }

    createSlot(slotData, slotIndex) {
        const slot = document.createElement('div');
        slot.className = 'crate-slot';
        slot.style.cssText = `
            width: 50px;
            height: 50px;
            border: 2px solid #444;
            border-radius: 4px;
            background-color: #222;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            cursor: pointer;
        `;

        if (slotData) {
            const slotItem = this.itemRegistry.getItem(slotData.itemId);
            if (slotItem) {
                if (slotItem.image) {
                    const img = document.createElement('img');
                    img.src = `./assets/${slotItem.image}`;
                    img.alt = slotItem.name;
                    img.style.width = '40px';
                    img.style.height = '40px';
                    img.style.objectFit = 'contain';
                    slot.appendChild(img);
                } else {
                    slot.textContent = slotItem.emoji;
                    slot.style.fontSize = '30px';
                }

                // Add count badge
                if (slotData.count > 1) {
                    const countBadge = document.createElement('div');
                    countBadge.className = 'count-badge';
                    countBadge.textContent = slotData.count;
                    countBadge.style.cssText = `
                        position: absolute;
                        bottom: 2px;
                        right: 2px;
                        background-color: #000;
                        color: #fff;
                        border-radius: 8px;
                        padding: 2px 5px;
                        font-size: 10px;
                        font-weight: bold;
                    `;
                    slot.appendChild(countBadge);
                }
            }
        }

        // Add click handler
        slot.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // If slot already has items, clicking takes them out
            if (slotData) {
                if (this.onSlotClickCallback) {
                    this.onSlotClickCallback(this.currentCrate, slotIndex);
                    this.refresh();
                }
            } else {
                // Empty slot - show dropdown to select item to place
                this.showDropdown(slotIndex);
            }
        });

        return slot;
    }

    showDestroyConfirmation() {
        const modal = new Modal();
        modal.setTitle('Destroy Crate?');
        modal.setMessage('Are you sure? All materials will be lost.');

        const confirmBtn = new Button('Confirm', '✓', () => {
            if (this.onDestroyCallback) {
                this.onDestroyCallback(this.currentCrate);
            }
            modal.hide();
            this.hide();
        }, 'danger');

        const cancelBtn = new Button('Cancel', '✗', () => {
            modal.hide();
        }, 'secondary');

        modal.addButton(confirmBtn);
        modal.addButton(cancelBtn);
        modal.show();
    }

    refresh() {
        if (this.visible && this.currentCrate) {
            this.buildPanel();
        }
    }

    positionPanel(screenX, screenY) {
        const panelRect = this.panel.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = screenX;
        let top = screenY;

        if (left + panelRect.width > viewportWidth) {
            left = viewportWidth - panelRect.width - 10;
        }
        if (top + panelRect.height > viewportHeight) {
            top = viewportHeight - panelRect.height - 10;
        }
        if (left < 10) left = 10;
        if (top < 10) top = 10;

        this.panel.style.position = 'fixed';
        this.panel.style.left = `${left}px`;
        this.panel.style.top = `${top}px`;
    }

    showDropdown(slotIndex) {
        if (!this.inventoryManager) return;

        this.hideDropdown();
        this.currentDropdownSlot = slotIndex;

        // Get all items in inventory
        const inventoryItems = [];
        for (const slot of this.inventoryManager.slots) {
            if (slot && slot.itemId) {
                if (!inventoryItems.find(item => item.itemId === slot.itemId)) {
                    const totalCount = this.inventoryManager.getItemCount(slot.itemId);
                    inventoryItems.push({
                        itemId: slot.itemId,
                        count: totalCount
                    });
                }
            }
        }

        if (inventoryItems.length === 0) {
            return;
        }

        // Create dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'crate-item-dropdown';
        this.dropdown.style.cssText = `
            position: fixed;
            background: rgba(44, 62, 80, 0.98);
            border: 2px solid #34495e;
            border-radius: 8px;
            padding: 8px;
            z-index: 10001;
            max-height: 200px;
            overflow-y: auto;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        `;

        // Add items to dropdown
        for (const invItem of inventoryItems) {
            const option = this.createDropdownOption(invItem.itemId, invItem.count, () => {
                if (this.onSlotClickCallback) {
                    // Place the selected item in the crate slot
                    this.onSlotClickCallback(this.currentCrate, slotIndex, invItem.itemId);
                    this.refresh();
                }
            });
            this.dropdown.appendChild(option);
        }

        // Position dropdown near the crate panel
        const panelRect = this.panel.getBoundingClientRect();
        this.dropdown.style.left = `${panelRect.right + 5}px`;
        this.dropdown.style.top = `${panelRect.top}px`;

        document.body.appendChild(this.dropdown);

        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('pointerdown', this.dropdownClickHandler = (e) => {
                if (!this.dropdown.contains(e.target)) {
                    this.hideDropdown();
                }
            });
        }, 0);
    }

    createDropdownOption(itemId, count, onClick) {
        const item = this.itemRegistry.getItem(itemId);
        if (!item) return null;

        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 4px;
            transition: background-color 0.2s;
        `;

        option.addEventListener('pointerenter', () => {
            option.style.backgroundColor = 'rgba(52, 73, 94, 0.8)';
        });

        option.addEventListener('pointerleave', () => {
            option.style.backgroundColor = 'transparent';
        });

        // Item icon
        const icon = document.createElement('div');
        icon.style.cssText = `
            font-size: 24px;
            width: 30px;
            text-align: center;
        `;

        if (item.image) {
            const img = document.createElement('img');
            img.src = `./assets/${item.image}`;
            img.alt = item.name;
            img.style.width = '30px';
            img.style.height = '30px';
            img.style.objectFit = 'contain';
            icon.appendChild(img);
        } else {
            icon.textContent = item.emoji || '?';
        }

        // Item name and count
        const info = document.createElement('div');
        info.style.cssText = `
            flex: 1;
            color: #ecf0f1;
            font-size: 14px;
        `;
        info.textContent = `${item.name} (${count})`;

        option.appendChild(icon);
        option.appendChild(info);

        option.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            onClick();
            this.hideDropdown();
        });

        return option;
    }

    hideDropdown() {
        if (this.dropdown) {
            this.dropdown.remove();
            this.dropdown = null;
        }
        if (this.dropdownClickHandler) {
            document.removeEventListener('pointerdown', this.dropdownClickHandler);
            this.dropdownClickHandler = null;
        }
        this.currentDropdownSlot = null;
    }

    hide() {
        this.hideDropdown();
        this.panel.classList.add('hidden');
        this.visible = false;
        this.currentCrate = null;
    }

    isVisible() {
        return this.visible;
    }

    getCurrentCrate() {
        return this.currentCrate;
    }
}
