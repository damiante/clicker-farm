import { Button } from '../ui/Button.js';
import { GameConfig } from '../config/GameConfig.js';

export class BarrelInfoPanel {
    constructor(itemRegistry) {
        this.itemRegistry = itemRegistry;
        this.panel = null;
        this.visible = false;
        this.currentBarrel = null;
        this.onPickupCallback = null;
        this.onInputClickCallback = null;
        this.onInputTakeCallback = null;
        this.onOutputClickCallback = null;
        this.refreshInterval = null;
        this.itemDropdown = null;
        this.dropdownCallback = null;  // Store dropdown select callback
        this.dropdownInventoryManager = null;  // Store inventory manager for refresh
        // Store references to dynamic elements
        this.inputSlotElement = null;
        this.outputSlotElement = null;
        this.arrowElement = null;
        this.pickupButtonElement = null;
        this.takeInputButtonElement = null;
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
            if (this.itemDropdown && this.itemDropdown.contains(e.target)) return;

            // Don't close if clicking on the inventory panel
            const inventoryPanel = document.getElementById('inventory-panel');
            if (inventoryPanel && inventoryPanel.contains(e.target)) return;

            // Don't close if clicking on the item preview panel (where inventory items are selected)
            const itemPreviewPanel = document.getElementById('item-preview-panel');
            if (itemPreviewPanel && itemPreviewPanel.contains(e.target)) return;

            this.hide();
        });
    }

    show(barrel, screenX, screenY, onPickup, onInputClick, onInputTake, onOutputClick) {
        this.currentBarrel = barrel;
        this.onPickupCallback = onPickup;
        this.onInputClickCallback = onInputClick;
        this.onInputTakeCallback = onInputTake;
        this.onOutputClickCallback = onOutputClick;

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

        // Add fermentation slots
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'barrel-slots';
        slotsContainer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin: 15px 0;
        `;

        // Input slot (clickable)
        this.inputSlotElement = this.createSlot(barrel.inputSlot, false);
        this.inputSlotElement.title = 'Input slot - Click to add items';
        this.inputSlotElement.style.cursor = 'pointer';
        this.inputSlotElement.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onInputClickCallback) {
                this.onInputClickCallback(this.currentBarrel);
            }
        });

        // Arrow with progress fill
        this.arrowElement = this.createProgressArrow(barrel.getFermentationProgress());

        // Output slot (clickable, greyed out)
        this.outputSlotElement = this.createSlot(barrel.outputSlot, true);
        this.outputSlotElement.title = 'Output slot - Click to take items';
        this.outputSlotElement.style.cursor = 'pointer';
        this.outputSlotElement.addEventListener('click', () => {
            if (this.onOutputClickCallback && this.currentBarrel.outputSlot) {
                this.onOutputClickCallback(this.currentBarrel);
            }
        });

        slotsContainer.appendChild(this.inputSlotElement);
        slotsContainer.appendChild(this.arrowElement);
        slotsContainer.appendChild(this.outputSlotElement);

        this.panel.appendChild(slotsContainer);

        // Add buttons
        this.buttonContainerElement = document.createElement('div');
        this.buttonContainerElement.className = 'plant-info-buttons';

        // Create Take from Input button (always create it, visibility handled in refresh)
        this.takeInputButtonElement = new Button('Take from Input', '🫴', () => {
            if (this.onInputTakeCallback && this.currentBarrel) {
                this.onInputTakeCallback(this.currentBarrel);
            }
        }, 'primary');

        // Create Pickup button
        const canPickup = barrel.canPickup();
        const buttonText = canPickup ? 'Pick up' : 'Fermenting...';
        this.pickupButtonElement = new Button(buttonText, '🖐️', () => {
            if (this.currentBarrel.canPickup() && this.onPickupCallback) {
                this.onPickupCallback(this.currentBarrel);
                this.hide();
            }
        }, canPickup ? 'success' : 'disabled');

        if (!canPickup) {
            this.pickupButtonElement.getElement().style.opacity = '0.5';
            this.pickupButtonElement.getElement().style.cursor = 'not-allowed';
        }

        // Add buttons based on current state
        this.updateButtons();
        this.panel.appendChild(this.buttonContainerElement);
    }

    updateButtons() {
        if (!this.buttonContainerElement || !this.currentBarrel) return;

        // Clear button container
        this.buttonContainerElement.innerHTML = '';

        // Add Take from Input button if items in input slot
        if (this.currentBarrel.inputSlot && this.currentBarrel.inputSlot.count > 0) {
            this.buttonContainerElement.appendChild(this.takeInputButtonElement.getElement());
        }

        // Always add pickup button
        this.buttonContainerElement.appendChild(this.pickupButtonElement.getElement());
    }

    refresh() {
        if (!this.currentBarrel) return;

        const barrel = this.currentBarrel;

        // Update input slot contents
        if (this.inputSlotElement) {
            this.updateSlotContents(this.inputSlotElement, barrel.inputSlot, false);
        }

        // Update output slot contents
        if (this.outputSlotElement) {
            this.updateSlotContents(this.outputSlotElement, barrel.outputSlot, true);
        }

        // Update progress arrow
        if (this.arrowElement) {
            const newArrow = this.createProgressArrow(barrel.getFermentationProgress());
            this.arrowElement.replaceWith(newArrow);
            this.arrowElement = newArrow;
        }

        // Update pickup button
        if (this.pickupButtonElement) {
            const canPickup = barrel.canPickup();
            const buttonText = canPickup ? 'Pick up' : 'Fermenting...';

            // Use the Button's setText method
            this.pickupButtonElement.setText(buttonText);

            if (canPickup) {
                this.pickupButtonElement.setEnabled(true);
            } else {
                this.pickupButtonElement.setEnabled(false);
            }
        }

        // Update button visibility
        this.updateButtons();
    }

    updateSlotContents(slotElement, slotData, isOutput) {
        // Clear slot
        slotElement.innerHTML = '';

        if (slotData && slotData.itemId) {
            const item = this.itemRegistry.getItem(slotData.itemId);
            if (item) {
                // Render item icon
                if (item.image) {
                    const img = document.createElement('img');
                    img.src = `./assets/${item.image}`;
                    img.alt = item.name;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'contain';
                    slotElement.appendChild(img);
                } else {
                    slotElement.textContent = item.emoji || '?';
                }

                // Add count badge if count > 1
                if (slotData.count > 1) {
                    const countBadge = document.createElement('div');
                    countBadge.textContent = slotData.count;
                    countBadge.style.cssText = `
                        position: absolute;
                        bottom: 2px;
                        right: 2px;
                        background: rgba(0, 0, 0, 0.7);
                        color: white;
                        font-size: 12px;
                        padding: 2px 4px;
                        border-radius: 3px;
                        font-weight: bold;
                    `;
                    slotElement.appendChild(countBadge);
                }
            }
        }
    }

    createSlot(slotData, isOutput = false) {
        const slot = document.createElement('div');
        const opacity = isOutput ? '0.2' : '0.3';
        slot.style.cssText = `
            width: 50px;
            height: 50px;
            background: rgba(0, 0, 0, ${opacity});
            border: 2px solid #555;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            font-size: 28px;
        `;

        if (slotData && slotData.itemId) {
            const item = this.itemRegistry.getItem(slotData.itemId);
            if (item) {
                // Render item icon
                if (item.image) {
                    const img = document.createElement('img');
                    img.src = `./assets/${item.image}`;
                    img.alt = item.name;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'contain';
                    slot.appendChild(img);
                } else {
                    slot.textContent = item.emoji || '?';
                }

                // Add count badge if count > 1
                if (slotData.count > 1) {
                    const countBadge = document.createElement('div');
                    countBadge.textContent = slotData.count;
                    countBadge.style.cssText = `
                        position: absolute;
                        bottom: 2px;
                        right: 2px;
                        background: rgba(0, 0, 0, 0.7);
                        color: white;
                        font-size: 12px;
                        padding: 2px 4px;
                        border-radius: 3px;
                        font-weight: bold;
                    `;
                    slot.appendChild(countBadge);
                }
            }
        }

        return slot;
    }

    createProgressArrow(progress) {
        const container = document.createElement('div');
        container.style.cssText = `
            position: relative;
            width: 60px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Background bar (greyed-out solid)
        const background = document.createElement('div');
        background.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            background: rgba(52, 73, 94, 0.5);
            border: 2px solid rgba(52, 73, 94, 0.8);
            border-radius: 4px;
        `;

        // Progress bar (fills the background)
        const progressBar = document.createElement('div');
        const fillWidth = Math.max(0, Math.min(100, progress * 100));
        progressBar.style.cssText = `
            position: absolute;
            left: 0;
            width: ${fillWidth}%;
            height: 100%;
            background: linear-gradient(90deg, #3498db, #2ecc71);
            border-radius: 2px;
            transition: width 0.3s ease;
        `;

        container.appendChild(background);
        container.appendChild(progressBar);

        return container;
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
        const panelHeight = 300; // Taller than fence panel due to slots
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
    }

    isVisible() {
        return this.visible;
    }

    showItemDropdown(inventoryManager, onSelect) {
        // Remove existing dropdown if any
        this.hideItemDropdown();

        // Store callback and inventory manager for refresh
        this.dropdownCallback = onSelect;
        this.dropdownInventoryManager = inventoryManager;

        // Get all fermentable items in inventory
        const fermentableItems = [];
        const recipes = GameConfig.FERMENTATION.RECIPES;

        for (const slot of inventoryManager.slots) {
            if (slot && slot.itemId && recipes[slot.itemId]) {
                // Check if we've already added this item
                if (!fermentableItems.find(fi => fi.itemId === slot.itemId)) {
                    const totalCount = inventoryManager.getItemCount(slot.itemId);
                    fermentableItems.push({
                        itemId: slot.itemId,
                        count: totalCount
                    });
                }
            }
        }

        if (fermentableItems.length === 0) {
            return;
        }

        // Create dropdown
        this.itemDropdown = document.createElement('div');
        this.itemDropdown.className = 'barrel-item-dropdown';
        this.itemDropdown.style.cssText = `
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
        for (const fermentableItem of fermentableItems) {
            const option = this.createItemDropdownOption(fermentableItem.itemId, fermentableItem.count, () => {
                onSelect(fermentableItem.itemId);
            });
            this.itemDropdown.appendChild(option);
        }

        document.body.appendChild(this.itemDropdown);

        // Position dropdown near the barrel panel
        const panelRect = this.panel.getBoundingClientRect();
        const dropdownLeft = panelRect.left + (panelRect.width / 2) - 75; // Center-ish
        const dropdownTop = panelRect.top + panelRect.height + 10;

        this.itemDropdown.style.left = `${dropdownLeft}px`;
        this.itemDropdown.style.top = `${dropdownTop}px`;

        // Close on outside click
        setTimeout(() => {
            const closeHandler = (e) => {
                if (this.itemDropdown && !this.itemDropdown.contains(e.target)) {
                    this.hideItemDropdown();
                    document.removeEventListener('pointerdown', closeHandler);
                }
            };
            document.addEventListener('pointerdown', closeHandler);
        }, 100);
    }

    createItemDropdownOption(itemId, count, onClick) {
        const option = document.createElement('div');
        option.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s;
            min-width: 150px;
        `;

        option.addEventListener('mouseenter', () => {
            option.style.background = 'rgba(52, 152, 219, 0.3)';
        });

        option.addEventListener('mouseleave', () => {
            option.style.background = 'transparent';
        });

        option.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            onClick();
        });

        const item = this.itemRegistry.getItem(itemId);
        if (!item) return option;

        // Item icon
        const icon = document.createElement('div');
        icon.style.cssText = `
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        `;

        if (item.image) {
            const img = document.createElement('img');
            img.src = `./assets/${item.image}`;
            img.alt = item.name;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            icon.appendChild(img);
        } else {
            icon.textContent = item.emoji || '?';
        }

        // Item info
        const info = document.createElement('div');
        info.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
        `;

        const nameEl = document.createElement('div');
        nameEl.textContent = item.name;
        nameEl.style.cssText = `
            color: #ecf0f1;
            font-size: 14px;
            font-weight: bold;
        `;

        const countEl = document.createElement('div');
        countEl.textContent = `×${count}`;
        countEl.style.cssText = `
            color: #95a5a6;
            font-size: 12px;
        `;

        info.appendChild(nameEl);
        info.appendChild(countEl);

        option.appendChild(icon);
        option.appendChild(info);

        return option;
    }

    hideItemDropdown() {
        if (this.itemDropdown) {
            this.itemDropdown.remove();
            this.itemDropdown = null;
            this.dropdownCallback = null;
            this.dropdownInventoryManager = null;
        }
    }

    refreshDropdown() {
        // If dropdown is not visible or no callback stored, do nothing
        if (!this.itemDropdown || !this.dropdownCallback || !this.dropdownInventoryManager) return;

        // Get all fermentable items in inventory
        const fermentableItems = [];
        const recipes = GameConfig.FERMENTATION.RECIPES;

        for (const slot of this.dropdownInventoryManager.slots) {
            if (slot && slot.itemId && recipes[slot.itemId]) {
                // Check if we've already added this item
                if (!fermentableItems.find(fi => fi.itemId === slot.itemId)) {
                    const totalCount = this.dropdownInventoryManager.getItemCount(slot.itemId);
                    fermentableItems.push({
                        itemId: slot.itemId,
                        count: totalCount
                    });
                }
            }
        }

        // If no items, hide dropdown
        if (fermentableItems.length === 0) {
            this.hideItemDropdown();
            return;
        }

        // Clear and rebuild dropdown contents
        this.itemDropdown.innerHTML = '';

        for (const fermentableItem of fermentableItems) {
            const option = this.createItemDropdownOption(fermentableItem.itemId, fermentableItem.count, () => {
                this.dropdownCallback(fermentableItem.itemId);
            });
            this.itemDropdown.appendChild(option);
        }
    }
}
