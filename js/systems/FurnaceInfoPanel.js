import { Button } from '../ui/Button.js';
import { Modal } from '../ui/Modal.js';
import { GameConfig } from '../config/GameConfig.js';

export class FurnaceInfoPanel {
    constructor(itemRegistry) {
        this.itemRegistry = itemRegistry;
        this.panel = null;
        this.visible = false;
        this.currentFurnace = null;
        this.onDestroyCallback = null;
        this.onSmeltSlotClickCallback = null;
        this.onFuelSlotClickCallback = null;
        this.onOutputSlotClickCallback = null;
        this.refreshInterval = null;
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

            // Don't close if clicking on the inventory panel
            const inventoryPanel = document.getElementById('inventory-panel');
            if (inventoryPanel && inventoryPanel.contains(e.target)) return;

            this.hide();
        });
    }

    show(furnace, screenX, screenY, onDestroy, onSmeltSlotClick, onFuelSlotClick, onOutputSlotClick) {
        this.currentFurnace = furnace;
        this.onDestroyCallback = onDestroy;
        this.onSmeltSlotClickCallback = onSmeltSlotClick;
        this.onFuelSlotClickCallback = onFuelSlotClick;
        this.onOutputSlotClickCallback = onOutputSlotClick;

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

        // Furnace slots
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

        // Smelt slot (top)
        const smeltSlot = this.createSlot(furnace.smeltSlot, false);
        smeltSlot.title = 'Smelt slot - Click to add smeltable items';
        smeltSlot.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.onSmeltSlotClickCallback) {
                this.onSmeltSlotClickCallback(this.currentFurnace);
            }
        });

        // Fuel slot (bottom)
        const fuelSlot = this.createSlot(furnace.fuelSlot, false);
        fuelSlot.title = 'Fuel slot - Click to add fuel';
        fuelSlot.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.onFuelSlotClickCallback) {
                this.onFuelSlotClickCallback(this.currentFurnace);
            }
        });

        inputSlotsContainer.appendChild(smeltSlot);
        inputSlotsContainer.appendChild(fuelSlot);

        // Arrow with progress fill
        const arrow = this.createProgressArrow(furnace.getSmeltingProgress());

        // Output slot (right)
        const outputSlot = this.createSlot(furnace.outputSlot, true);
        outputSlot.title = 'Output slot - Click to take items';
        outputSlot.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.onOutputSlotClickCallback && this.currentFurnace.outputSlot) {
                this.onOutputSlotClickCallback(this.currentFurnace);
            }
        });

        slotsContainer.appendChild(inputSlotsContainer);
        slotsContainer.appendChild(arrow);
        slotsContainer.appendChild(outputSlot);

        this.panel.appendChild(slotsContainer);

        // Destroy button (disabled during smelting)
        const isSmelting = furnace.isSmelting();
        const destroyBtn = new Button(
            'Destroy',
            '💥',
            isSmelting ? null : () => this.showDestroyConfirmation(),
            isSmelting ? 'disabled' : 'danger'
        );

        if (isSmelting) {
            destroyBtn.getElement().title = 'Cannot destroy while smelting';
        }

        // Create button container for centering
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'plant-info-buttons';
        buttonContainer.appendChild(destroyBtn.getElement());
        this.panel.appendChild(buttonContainer);
    }

    createSlot(slotData, isOutput) {
        const slot = document.createElement('div');
        slot.className = 'barrel-slot';
        slot.style.cssText = `
            width: 50px;
            height: 50px;
            border: 2px solid #444;
            border-radius: 4px;
            background-color: ${isOutput ? '#333' : '#222'};
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

        return slot;
    }

    createProgressArrow(progress) {
        const arrow = document.createElement('div');
        arrow.style.cssText = `
            width: 40px;
            height: 50px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Arrow background
        const arrowBg = document.createElement('div');
        arrowBg.textContent = '→';
        arrowBg.style.cssText = `
            font-size: 30px;
            color: #444;
            position: absolute;
        `;

        // Arrow fill (shows progress)
        const arrowFill = document.createElement('div');
        arrowFill.textContent = '→';
        arrowFill.style.cssText = `
            font-size: 30px;
            color: #ff6600;
            position: absolute;
            clip-path: inset(0 ${100 - progress * 100}% 0 0);
            transition: clip-path 0.1s;
        `;

        arrow.appendChild(arrowBg);
        arrow.appendChild(arrowFill);

        return arrow;
    }

    showDestroyConfirmation() {
        const modal = new Modal();
        modal.setTitle('Destroy Furnace?');
        modal.setMessage('Are you sure? All materials will be lost.');

        const confirmBtn = new Button('Confirm', '✓', () => {
            if (this.onDestroyCallback) {
                this.onDestroyCallback(this.currentFurnace);
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

    startRefreshInterval() {
        this.stopRefreshInterval();
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

    refresh() {
        if (this.visible && this.currentFurnace) {
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

    showSmeltDropdown(inventoryManager, onSelect) {
        this.hideSmeltDropdown();

        // Get all smeltable items in inventory
        const smeltableItems = [];
        const recipes = GameConfig.SMELTING.RECIPES;

        for (const slot of inventoryManager.slots) {
            if (slot && slot.itemId && recipes[slot.itemId]) {
                if (!smeltableItems.find(si => si.itemId === slot.itemId)) {
                    const totalCount = inventoryManager.getItemCount(slot.itemId);
                    smeltableItems.push({
                        itemId: slot.itemId,
                        count: totalCount
                    });
                }
            }
        }

        if (smeltableItems.length === 0) {
            return;
        }

        // Create dropdown
        this.smeltDropdown = document.createElement('div');
        this.smeltDropdown.className = 'furnace-item-dropdown';
        this.smeltDropdown.style.cssText = `
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
        for (const smeltableItem of smeltableItems) {
            const option = this.createDropdownOption(smeltableItem.itemId, smeltableItem.count, () => {
                onSelect(smeltableItem.itemId);
            });
            this.smeltDropdown.appendChild(option);
        }

        // Position dropdown near the smelt slot
        const slotElement = this.panel.querySelector('.furnace-slots');
        if (slotElement) {
            const slotRect = slotElement.getBoundingClientRect();
            this.smeltDropdown.style.left = `${slotRect.left}px`;
            this.smeltDropdown.style.top = `${slotRect.bottom + 5}px`;
        }

        document.body.appendChild(this.smeltDropdown);

        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('pointerdown', this.smeltDropdownClickHandler = (e) => {
                if (!this.smeltDropdown.contains(e.target)) {
                    this.hideSmeltDropdown();
                }
            });
        }, 0);
    }

    showFuelDropdown(inventoryManager, onSelect) {
        this.hideFuelDropdown();

        // Get all fuel items in inventory
        const fuelItems = [];
        const fuels = GameConfig.SMELTING.FUEL_ITEMS;

        for (const slot of inventoryManager.slots) {
            if (slot && slot.itemId && fuels.includes(slot.itemId)) {
                if (!fuelItems.find(fi => fi.itemId === slot.itemId)) {
                    const totalCount = inventoryManager.getItemCount(slot.itemId);
                    fuelItems.push({
                        itemId: slot.itemId,
                        count: totalCount
                    });
                }
            }
        }

        if (fuelItems.length === 0) {
            return;
        }

        // Create dropdown
        this.fuelDropdown = document.createElement('div');
        this.fuelDropdown.className = 'furnace-item-dropdown';
        this.fuelDropdown.style.cssText = `
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
        for (const fuelItem of fuelItems) {
            const option = this.createDropdownOption(fuelItem.itemId, fuelItem.count, () => {
                onSelect(fuelItem.itemId);
            });
            this.fuelDropdown.appendChild(option);
        }

        // Position dropdown near the fuel slot
        const slotElement = this.panel.querySelector('.furnace-slots');
        if (slotElement) {
            const slotRect = slotElement.getBoundingClientRect();
            this.fuelDropdown.style.left = `${slotRect.left}px`;
            this.fuelDropdown.style.top = `${slotRect.bottom + 5}px`;
        }

        document.body.appendChild(this.fuelDropdown);

        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('pointerdown', this.fuelDropdownClickHandler = (e) => {
                if (!this.fuelDropdown.contains(e.target)) {
                    this.hideFuelDropdown();
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
            this.hideSmeltDropdown();
            this.hideFuelDropdown();
        });

        return option;
    }

    hideSmeltDropdown() {
        if (this.smeltDropdown) {
            this.smeltDropdown.remove();
            this.smeltDropdown = null;
        }
        if (this.smeltDropdownClickHandler) {
            document.removeEventListener('pointerdown', this.smeltDropdownClickHandler);
            this.smeltDropdownClickHandler = null;
        }
    }

    hideFuelDropdown() {
        if (this.fuelDropdown) {
            this.fuelDropdown.remove();
            this.fuelDropdown = null;
        }
        if (this.fuelDropdownClickHandler) {
            document.removeEventListener('pointerdown', this.fuelDropdownClickHandler);
            this.fuelDropdownClickHandler = null;
        }
    }

    hide() {
        this.hideSmeltDropdown();
        this.hideFuelDropdown();
        this.panel.classList.add('hidden');
        this.visible = false;
        this.currentFurnace = null;
        this.stopRefreshInterval();
    }

    isVisible() {
        return this.visible;
    }

    getCurrentFurnace() {
        return this.currentFurnace;
    }
}
