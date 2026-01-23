import { Button } from '../ui/Button.js';
import { Modal } from '../ui/Modal.js';
import { ItemSlot } from '../ui/ItemSlot.js';
import { UIComponentTheme } from '../config/UIComponentTheme.js';

export class MineInfoPanel {
    constructor(itemRegistry, assetLoader) {
        this.itemRegistry = itemRegistry;
        this.assetLoader = assetLoader;
        this.panel = null;
        this.visible = false;
        this.currentMine = null;
        this.onMineCallback = null;
        this.onDestroyCallback = null;
        this.onSlotClickCallback = null;

        // Component instances
        this.outputSlots = [];

        this.createPanel();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'mine-info-panel';
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

    show(mine, screenX, screenY, onMine, onDestroy, onSlotClick) {
        this.currentMine = mine;
        this.onMineCallback = onMine;
        this.onDestroyCallback = onDestroy;
        this.onSlotClickCallback = onSlotClick;

        const item = this.itemRegistry.getItem(mine.itemId);
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
        if (!this.currentMine) return;

        const mine = this.currentMine;
        const item = this.itemRegistry.getItem(mine.itemId);
        if (!item) return;

        this.panel.innerHTML = '';

        // Item icon
        const icon = document.createElement('div');
        icon.className = 'plant-info-icon';
        icon.textContent = item.emoji;

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

        // Mine button
        const mineBtn = new Button('Mine', '⛏️', () => {
            if (this.onMineCallback) {
                this.onMineCallback(mine);
                this.refresh();  // Refresh to show new items
            }
        }, 'success');

        const mineBtnElement = mineBtn.getElement();
        mineBtnElement.addEventListener('pointerdown', (e) => {
            e.stopPropagation();  // Prevent panel from closing
        });
        mineBtnElement.style.width = UIComponentTheme.PANEL.BUTTON.WIDTH;

        // Create button container for centering
        const mineButtonContainer = document.createElement('div');
        mineButtonContainer.className = 'plant-info-buttons';
        mineButtonContainer.appendChild(mineBtnElement);
        this.panel.appendChild(mineButtonContainer);

        // Output slots using ItemSlot component
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'mine-slots';
        slotsContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 10px;
            margin: 15px auto;
        `;

        // Create 3 output slots
        const slotLabels = ['Rock', 'Ore', 'Coal'];
        this.outputSlots = [];

        for (let i = 0; i < 3; i++) {
            const slotWrapper = document.createElement('div');
            slotWrapper.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
            `;

            const slotLabel = document.createElement('div');
            slotLabel.textContent = slotLabels[i];
            slotLabel.style.fontSize = '10px';
            slotLabel.style.color = '#888';

            // Create ItemSlot component
            const itemSlot = new ItemSlot('medium', mine.outputSlots[i], this.itemRegistry, this.assetLoader, {
                isOutput: true,
                clickable: true,
                onSlotClick: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (mine.outputSlots[i] && this.onSlotClickCallback) {
                        this.onSlotClickCallback(this.currentMine, i);
                        this.refresh();
                    }
                }
            });

            this.outputSlots.push(itemSlot);

            slotWrapper.appendChild(slotLabel);
            slotWrapper.appendChild(itemSlot.getElement());
            slotsContainer.appendChild(slotWrapper);
        }

        this.panel.appendChild(slotsContainer);

        // Destroy button
        const destroyBtn = new Button('Destroy', '💥', () => {
            if (this.onDestroyCallback) {
                this.onDestroyCallback(this.currentMine);
            }
            this.hide();
        }, 'danger');
        destroyBtn.getElement().style.width = UIComponentTheme.PANEL.BUTTON.WIDTH;

        // Create button container for centering
        const destroyButtonContainer = document.createElement('div');
        destroyButtonContainer.className = 'plant-info-buttons';
        destroyButtonContainer.appendChild(destroyBtn.getElement());
        this.panel.appendChild(destroyButtonContainer);
    }

    refresh() {
        if (!this.visible || !this.currentMine) return;

        const mine = this.currentMine;

        // Update slot contents using ItemSlot.updateContents()
        for (let i = 0; i < this.outputSlots.length; i++) {
            if (this.outputSlots[i]) {
                this.outputSlots[i].updateContents(mine.outputSlots[i]);
            }
        }
    }

    positionPanel(screenX, screenY) {
        const panelRect = this.panel.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = screenX;
        let top = screenY;

        // Adjust if panel goes off-screen
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

    hide() {
        this.panel.classList.add('hidden');
        this.visible = false;
        this.currentMine = null;
    }

    isVisible() {
        return this.visible;
    }

    getCurrentMine() {
        return this.currentMine;
    }
}
