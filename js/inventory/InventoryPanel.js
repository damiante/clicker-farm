import { ItemDetailModal } from './ItemDetailModal.js';
import { ItemPreviewPanel } from './ItemPreviewPanel.js';
import { UITheme } from '../config/UITheme.js';

export class InventoryPanel {
    constructor(inventoryManager, itemRegistry, game) {
        this.inventoryManager = inventoryManager;
        this.itemRegistry = itemRegistry;
        this.game = game;

        this.panel = null;
        this.gridContainer = null;
        this.visible = false;
        this.selectedSlotIndex = null; // Currently selected slot for placement
        this.previewPanel = new ItemPreviewPanel(itemRegistry);
        this.inventoryButton = null; // Reference to inventory button for notifications

        this.createPanel();
    }

    createPanel() {
        this.panel = document.getElementById('inventory-panel');
        if (!this.panel) {
            this.panel = document.createElement('div');
            this.panel.id = 'inventory-panel';
            this.panel.className = 'hidden';
            document.body.appendChild(this.panel);
        }

        // Create header
        const header = document.createElement('div');
        header.className = 'inventory-header';

        const title = document.createElement('h3');
        title.textContent = '🎒 Inventory';
        title.style.margin = '0';
        title.style.color = UITheme.COLORS.TEXT;
        title.style.fontSize = UITheme.TYPOGRAPHY.HEADER_FONT_SIZE;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'inventory-close-btn';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.hide();
        });

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Create grid container
        this.gridContainer = document.createElement('div');
        this.gridContainer.className = 'inventory-grid';

        // Create controls
        const controls = document.createElement('div');
        controls.className = 'inventory-controls';

        this.expandSlotBtn = document.createElement('button');
        this.expandSlotBtn.className = 'inventory-control-btn';
        this.expandSlotBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.onExpandSlots();
        });

        this.upgradeStackBtn = document.createElement('button');
        this.upgradeStackBtn.className = 'inventory-control-btn';
        this.upgradeStackBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.onUpgradeStack();
        });

        controls.appendChild(this.expandSlotBtn);
        controls.appendChild(this.upgradeStackBtn);

        // Assemble panel
        this.panel.innerHTML = '';
        this.panel.appendChild(header);
        this.panel.appendChild(this.gridContainer);
        this.panel.appendChild(controls);

        this.refresh();
    }

    refresh() {
        // Update grid
        this.gridContainer.innerHTML = '';

        for (let i = 0; i < this.inventoryManager.maxSlots; i++) {
            const slot = this.inventoryManager.getSlot(i);
            const slotElement = this.createSlotElement(i, slot);
            this.gridContainer.appendChild(slotElement);
        }

        // Update control buttons
        this.updateControlButtons();
    }

    createSlotElement(index, slot) {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'inventory-slot';
        slotDiv.dataset.slotIndex = index;

        // Highlight selected slot
        if (this.selectedSlotIndex === index) {
            slotDiv.classList.add('selected');
        }

        if (slot) {
            slotDiv.classList.add('filled');

            const item = this.itemRegistry.getItem(slot.itemId);
            if (item) {
                const icon = document.createElement('div');
                icon.className = 'item-icon';
                icon.textContent = item.emoji;

                const count = document.createElement('div');
                count.className = 'item-count';
                count.textContent = slot.count;

                slotDiv.appendChild(icon);
                slotDiv.appendChild(count);

                // Click to select item for placement
                slotDiv.addEventListener('pointerdown', (e) => {
                    e.preventDefault();
                    this.selectSlotForPlacement(index);
                });
            }
        } else {
            slotDiv.classList.add('empty');
        }

        return slotDiv;
    }

    updateControlButtons() {
        const slotPrice = this.inventoryManager.getNextSlotPrice();
        const stackPrice = this.inventoryManager.getNextStackPrice();

        // Expand slots button
        if (slotPrice === null) {
            this.expandSlotBtn.textContent = 'Max Slots';
            this.expandSlotBtn.disabled = true;
        } else {
            this.expandSlotBtn.textContent = `Add Slot ($${slotPrice})`;
            this.expandSlotBtn.disabled = this.game.player.money < slotPrice;
        }

        // Upgrade stack button
        if (stackPrice === null) {
            this.upgradeStackBtn.textContent = 'Max Stack';
            this.upgradeStackBtn.disabled = true;
        } else {
            this.upgradeStackBtn.textContent = `Stack +5 ($${stackPrice})`;
            this.upgradeStackBtn.disabled = this.game.player.money < stackPrice;
        }
    }

    selectSlotForPlacement(index) {
        const slot = this.inventoryManager.getSlot(index);
        if (!slot) return;

        // Toggle selection
        if (this.selectedSlotIndex === index) {
            this.selectedSlotIndex = null;
            this.previewPanel.hide();
        } else {
            this.selectedSlotIndex = index;

            // Sell callback - removes 1 item and adds money
            const onSell = () => {
                const item = this.itemRegistry.getItem(slot.itemId);
                if (item && item.salePrice > 0) {
                    // Remove 1 from inventory
                    this.inventoryManager.removeItem(slot.itemId, 1);

                    // Add money to player
                    this.game.addMoney(item.salePrice);

                    // Check if slot is now empty - clear selection if so
                    const updatedSlot = this.inventoryManager.getSlot(index);
                    if (!updatedSlot) {
                        this.clearSelection();
                    } else {
                        // Refresh preview with updated slot
                        this.refresh();
                        this.previewPanel.show(updatedSlot.itemId, onSell);
                    }
                }
            };

            this.previewPanel.show(slot.itemId, onSell);
        }

        this.refresh();
    }

    getSelectedItem() {
        if (this.selectedSlotIndex === null) return null;

        const slot = this.inventoryManager.getSlot(this.selectedSlotIndex);
        if (!slot) return null;

        return {
            itemId: slot.itemId,
            slotIndex: this.selectedSlotIndex
        };
    }

    clearSelection() {
        this.selectedSlotIndex = null;
        this.previewPanel.hide();
        this.refresh();
    }

    onExpandSlots() {
        if (this.inventoryManager.expandSlots()) {
            this.refresh();
            this.game.stateManager.scheduleSave(this.game.getGameState());
        }
    }

    onUpgradeStack() {
        if (this.inventoryManager.upgradeStackSize()) {
            this.refresh();
            this.game.stateManager.scheduleSave(this.game.getGameState());
        }
    }

    show() {
        this.panel.classList.remove('hidden');
        this.panel.classList.add('visible');
        this.visible = true;
        this.clearNotification();
        this.refresh();
    }

    hide() {
        this.panel.classList.remove('visible');
        this.panel.classList.add('hidden');
        this.visible = false;
        this.clearSelection();
    }

    isVisible() {
        return this.visible;
    }

    getElement() {
        return this.panel;
    }

    setInventoryButton(button) {
        this.inventoryButton = button;
    }

    notifyItemAdded() {
        // Only notify if inventory is currently closed
        if (!this.visible && this.inventoryButton) {
            this.game.player.inventoryNotification = true;
            this.inventoryButton.classList.add('has-notification');
        }
    }

    clearNotification() {
        if (this.game.player.inventoryNotification && this.inventoryButton) {
            this.game.player.inventoryNotification = false;
            this.inventoryButton.classList.remove('has-notification');
        }
    }

    restoreNotification() {
        // Called when loading from saved state to restore notification visual
        if (this.inventoryButton) {
            this.inventoryButton.classList.add('has-notification');
        }
    }
}
