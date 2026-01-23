import { Button } from '../ui/Button.js';

export class ItemPreviewPanel {
    constructor(itemRegistry, inventoryManager) {
        this.itemRegistry = itemRegistry;
        this.inventoryManager = inventoryManager;
        this.panel = null;
        this.visible = false;
        this.onSellCallback = null;
        this.onSellAllCallback = null;
        this.createPanel();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'item-preview-panel';
        this.panel.className = 'item-preview-panel hidden';
        document.body.appendChild(this.panel);
    }

    show(itemId, onSell, onSellAll = null) {
        const item = this.itemRegistry.getItem(itemId);
        if (!item) {
            this.hide();
            return;
        }

        this.onSellCallback = onSell;
        this.onSellAllCallback = onSellAll;
        this.panel.innerHTML = '';

        // Item icon
        const icon = document.createElement('div');
        icon.className = 'preview-icon';

        // Handle image-based items differently from emoji items
        if (item.image) {
            const img = document.createElement('img');
            img.src = `./assets/${item.image}`;
            img.alt = item.name;
            img.style.width = '80%';
            img.style.height = '80%';
            img.style.objectFit = 'contain';
            icon.appendChild(img);
        } else {
            icon.textContent = item.emoji || '?';
        }

        // Item name
        const name = document.createElement('div');
        name.className = 'preview-name';
        name.textContent = item.name;

        // Item description
        const description = document.createElement('div');
        description.className = 'preview-description';
        description.textContent = item.description;

        // Additional info for seeds
        if (item.itemType === 'seed') {
            const growthInfo = document.createElement('div');
            growthInfo.className = 'preview-growth-info';
            growthInfo.innerHTML = `
                <div class="growth-time">🌱 Sprouts in ${item.sproutTime}s</div>
                <div class="growth-time">🌻 Matures in ${item.maturityTime}s</div>
            `;
            this.panel.appendChild(icon);
            this.panel.appendChild(name);
            this.panel.appendChild(description);
            this.panel.appendChild(growthInfo);
        } else {
            this.panel.appendChild(icon);
            this.panel.appendChild(name);
            this.panel.appendChild(description);
        }

        // Sale price info
        if (item.salePrice && item.salePrice > 0) {
            const priceInfo = document.createElement('div');
            priceInfo.className = 'preview-price';
            priceInfo.textContent = `Sells for: $${item.salePrice}`;
            this.panel.appendChild(priceInfo);

            // Sell buttons
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'preview-buttons';

            const sellBtn = new Button('Sell (1)', '💰', () => {
                if (this.onSellCallback) {
                    this.onSellCallback();
                }
            }, 'success');

            buttonContainer.appendChild(sellBtn.getElement());

            // Add "Sell all" button if callback provided
            if (onSellAll) {
                const totalCount = this.inventoryManager.getItemCount(itemId);
                if (totalCount > 1) {
                    const sellAllBtn = new Button(`Sell all (${totalCount})`, '💰', () => {
                        if (this.onSellAllCallback) {
                            this.onSellAllCallback();
                        }
                    }, 'success');

                    buttonContainer.appendChild(sellAllBtn.getElement());
                }
            }

            this.panel.appendChild(buttonContainer);
        }

        // Hint text
        const hint = document.createElement('div');
        hint.className = 'preview-hint';
        hint.textContent = (item.itemType === 'seed' || item.itemType === 'structure') ? 'Click on the world to place' : '';
        this.panel.appendChild(hint);

        this.panel.classList.remove('hidden');
        this.visible = true;
    }

    hide() {
        this.panel.classList.add('hidden');
        this.panel.innerHTML = ''; // Clear content to remove button elements
        this.visible = false;
        this.onSellCallback = null; // Clear callbacks
        this.onSellAllCallback = null;
    }

    isVisible() {
        return this.visible;
    }
}
