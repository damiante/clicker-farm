import { Button } from '../ui/Button.js';

export class NPCInfoPanel {
    constructor(itemRegistry) {
        this.itemRegistry = itemRegistry;
        this.panel = null;
        this.visible = false;
        this.currentNPC = null;
        this.onTakeItemCallback = null;
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

    show(npc, screenX, screenY, onTakeItem) {
        this.currentNPC = npc;
        this.onTakeItemCallback = onTakeItem;

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

        // Item slot
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

        const slot = this.createItemSlot(npc.itemSlot);

        slotContainer.appendChild(slotLabel);
        slotContainer.appendChild(slot);

        this.panel.appendChild(slotContainer);

        // Take button (if NPC has item)
        if (npc.itemSlot) {
            const takeBtn = new Button('Take', '🫴', () => {
                if (this.onTakeItemCallback) {
                    this.onTakeItemCallback(npc);
                    this.refresh();
                }
            }, 'success');

            this.panel.appendChild(takeBtn.getElement());
        }
    }

    createItemSlot(itemSlot) {
        const slot = document.createElement('div');
        slot.className = 'npc-item-slot';
        slot.style.cssText = `
            width: 60px;
            height: 60px;
            border: 2px solid #444;
            border-radius: 4px;
            background-color: #222;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            cursor: ${itemSlot ? 'pointer' : 'default'};
        `;

        if (itemSlot) {
            const slotItem = this.itemRegistry.getItem(itemSlot.itemId);
            if (slotItem) {
                if (slotItem.image) {
                    const img = document.createElement('img');
                    img.src = `./assets/${slotItem.image}`;
                    img.alt = slotItem.name;
                    img.style.width = '50px';
                    img.style.height = '50px';
                    img.style.objectFit = 'contain';
                    slot.appendChild(img);
                } else {
                    slot.textContent = slotItem.emoji;
                    slot.style.fontSize = '40px';
                }

                // Add count badge
                if (itemSlot.count > 1) {
                    const countBadge = document.createElement('div');
                    countBadge.className = 'count-badge';
                    countBadge.textContent = itemSlot.count;
                    countBadge.style.cssText = `
                        position: absolute;
                        bottom: 2px;
                        right: 2px;
                        background-color: #000;
                        color: #fff;
                        border-radius: 8px;
                        padding: 2px 5px;
                        font-size: 12px;
                        font-weight: bold;
                    `;
                    slot.appendChild(countBadge);
                }

                // Add click handler to take item
                slot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.onTakeItemCallback) {
                        this.onTakeItemCallback(this.currentNPC);
                        this.refresh();
                    }
                });
            }
        }

        return slot;
    }

    refresh() {
        if (this.visible && this.currentNPC) {
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
