import { Button } from '../ui/Button.js';

export class ItemPreviewPanel {
    constructor(itemRegistry) {
        this.itemRegistry = itemRegistry;
        this.panel = null;
        this.visible = false;
        this.onSellCallback = null;
        this.createPanel();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'item-preview-panel';
        this.panel.className = 'item-preview-panel hidden';
        document.body.appendChild(this.panel);
    }

    show(itemId, onSell) {
        const item = this.itemRegistry.getItem(itemId);
        if (!item) {
            this.hide();
            return;
        }

        this.onSellCallback = onSell;
        this.panel.innerHTML = '';

        // Item icon
        const icon = document.createElement('div');
        icon.className = 'preview-icon';
        icon.textContent = item.emoji;

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

            // Sell button
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'preview-buttons';

            const sellBtn = new Button('Sell (1)', '💰', () => {
                if (this.onSellCallback) {
                    this.onSellCallback();
                }
            }, 'success');

            buttonContainer.appendChild(sellBtn.getElement());
            this.panel.appendChild(buttonContainer);
        }

        // Hint text
        const hint = document.createElement('div');
        hint.className = 'preview-hint';
        hint.textContent = item.itemType === 'seed' ? 'Click on the world to place' : '';
        this.panel.appendChild(hint);

        this.panel.classList.remove('hidden');
        this.visible = true;
    }

    hide() {
        this.panel.classList.add('hidden');
        this.visible = false;
    }

    isVisible() {
        return this.visible;
    }
}
