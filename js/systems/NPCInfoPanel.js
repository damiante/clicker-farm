import { Button } from '../ui/Button.js';
import { ItemSlot } from '../ui/ItemSlot.js';
import { UIComponentTheme } from '../config/UIComponentTheme.js';

export class NPCInfoPanel {
    constructor(itemRegistry, assetLoader) {
        this.itemRegistry = itemRegistry;
        this.assetLoader = assetLoader;
        this.panel = null;
        this.visible = false;
        this.currentNPC = null;
        this.onTakeItemCallback = null;
        this.onFireCallback = null;

        // Component instances
        this.itemSlot = null;

        this.createPanel();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'npc-info-panel';
        this.panel.className = 'plant-info-panel hidden';
        document.body.appendChild(this.panel);

        // Close when clicking outside
        document.addEventListener('pointerdown', (e) => {
            if (!this.visible) return;
            if (this.panel.contains(e.target)) return;

            this.hide();
        });
    }

    show(npc, screenX, screenY, onTakeItem, onFire) {
        this.currentNPC = npc;
        this.onTakeItemCallback = onTakeItem;
        this.onFireCallback = onFire;

        const item = this.itemRegistry.getItem(npc.itemId);
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
        if (!this.currentNPC) return;

        const npc = this.currentNPC;
        const item = this.itemRegistry.getItem(npc.itemId);
        if (!item) return;

        this.panel.innerHTML = '';

        // NPC icon
        const icon = document.createElement('div');
        icon.className = 'plant-info-icon';
        icon.textContent = item.emoji;

        // NPC name
        const name = document.createElement('div');
        name.className = 'plant-info-name';
        name.textContent = item.name;

        // NPC description
        const description = document.createElement('div');
        description.className = 'plant-info-description';
        description.textContent = item.description;

        this.panel.appendChild(icon);
        this.panel.appendChild(name);
        this.panel.appendChild(description);

        // Item slot using ItemSlot component
        const slotContainer = document.createElement('div');
        slotContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
            margin: 15px 0;
        `;

        const slotLabel = document.createElement('div');
        slotLabel.textContent = 'Inventory';
        slotLabel.style.fontSize = '12px';
        slotLabel.style.color = '#888';

        // Create ItemSlot component
        this.itemSlot = new ItemSlot('medium', npc.itemSlot, this.itemRegistry, this.assetLoader, {
            isOutput: true,
            clickable: true,
            onSlotClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (npc.itemSlot && this.onTakeItemCallback) {
                    this.onTakeItemCallback(this.currentNPC);
                    this.refresh();
                }
            }
        });

        slotContainer.appendChild(slotLabel);
        slotContainer.appendChild(this.itemSlot.getElement());

        this.panel.appendChild(slotContainer);

        // Take button (if NPC has item)
        if (npc.itemSlot) {
            const takeBtn = new Button('Take', '🫴', () => {
                if (this.onTakeItemCallback) {
                    this.onTakeItemCallback(npc);
                    this.refresh();
                }
            }, 'success');
            takeBtn.getElement().style.width = UIComponentTheme.PANEL.BUTTON.WIDTH;

            this.panel.appendChild(takeBtn.getElement());
        }

        // Fire button
        const fireBtn = new Button('Fire', '🔥', () => {
            if (this.onFireCallback) {
                this.onFireCallback(npc);
                this.hide();
            }
        }, 'secondary');
        fireBtn.getElement().style.width = UIComponentTheme.PANEL.BUTTON.WIDTH;

        this.panel.appendChild(fireBtn.getElement());
    }

    refresh() {
        if (!this.visible || !this.currentNPC) return;

        const npc = this.currentNPC;

        // Update slot contents using ItemSlot.updateContents()
        if (this.itemSlot) {
            this.itemSlot.updateContents(npc.itemSlot);
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

    hide() {
        this.panel.classList.add('hidden');
        this.visible = false;
        this.currentNPC = null;
    }

    isVisible() {
        return this.visible;
    }

    getCurrentNPC() {
        return this.currentNPC;
    }
}
