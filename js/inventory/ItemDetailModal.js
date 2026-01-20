import { Modal } from '../ui/Modal.js';
import { Button } from '../ui/Button.js';

export class ItemDetailModal extends Modal {
    constructor(item, count, onSell) {
        const content = document.createElement('div');
        content.className = 'item-detail';
        content.style.textAlign = 'center';

        const iconLarge = document.createElement('div');
        iconLarge.className = 'item-icon-large';
        iconLarge.textContent = item.emoji;
        iconLarge.style.fontSize = '64px';
        iconLarge.style.marginBottom = '20px';

        const name = document.createElement('h3');
        name.textContent = item.name;
        name.style.margin = '0 0 10px 0';
        name.style.fontSize = '24px';

        const description = document.createElement('p');
        description.textContent = item.description;
        description.style.marginBottom = '15px';
        description.style.color = '#BDC3C7';

        const priceInfo = document.createElement('p');
        priceInfo.textContent = `Sell price: $${item.salePrice} each`;
        priceInfo.style.marginBottom = '10px';
        priceInfo.style.fontWeight = 'bold';
        priceInfo.style.color = '#2ECC71';

        const countInfo = document.createElement('p');
        countInfo.textContent = `You have: ${count}`;
        countInfo.style.marginBottom = '0';

        content.appendChild(iconLarge);
        content.appendChild(name);
        content.appendChild(description);
        content.appendChild(priceInfo);
        content.appendChild(countInfo);

        const buttons = [];

        // Only show sell button if item has a sale price
        if (item.salePrice > 0 && count > 0) {
            let modalRef = null;

            const sellBtn = new Button('Sell All', '💰', () => {
                onSell();
                if (modalRef) {
                    modalRef.hide();
                }
            }, 'success');

            buttons.push(sellBtn);

            super('Item Details', content, buttons);
            modalRef = this;
        } else {
            super('Item Details', content, buttons);
        }
    }
}
