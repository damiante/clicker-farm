import { UITheme } from '../config/UITheme.js';

export class ShopMenu {
    constructor(menuManager, inventoryManager, itemRegistry, game) {
        this.menuManager = menuManager;
        this.inventoryManager = inventoryManager;
        this.itemRegistry = itemRegistry;
        this.game = game;

        this.container = null;
        this.expandedMenus = new Set();

        this.createContainer();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'shop-menus';
        this.refresh({ autoExpand: true });
    }

    refresh(options = {}) {
        this.container.innerHTML = '';

        const visibleMenus = this.menuManager.getVisibleMenus();

        for (const menu of visibleMenus) {
            const menuElement = this.createMenuElement(menu);
            this.container.appendChild(menuElement);
        }

        // Auto-expand first menu only on initial load or when explicitly requested
        if (options.autoExpand && visibleMenus.length > 0 && this.expandedMenus.size === 0) {
            this.expandedMenus.add(visibleMenus[0].id);
            // Need to rebuild to apply the expanded class
            this.container.innerHTML = '';
            for (const menu of visibleMenus) {
                const menuElement = this.createMenuElement(menu);
                this.container.appendChild(menuElement);
            }
        }

        // Update affordability
        this.updateAffordability();
    }

    createMenuElement(menu) {
        const menuDiv = document.createElement('div');
        menuDiv.className = 'shop-menu';
        menuDiv.dataset.menuId = menu.id;

        if (this.expandedMenus.has(menu.id)) {
            menuDiv.classList.add('expanded');
        }

        // Header
        const header = document.createElement('div');
        header.className = 'menu-header';

        const icon = document.createElement('span');
        icon.className = 'menu-icon';
        icon.textContent = menu.emoji;

        const name = document.createElement('span');
        name.className = 'menu-name';
        name.textContent = menu.name;

        const chevron = document.createElement('span');
        chevron.className = 'menu-chevron';
        chevron.textContent = this.expandedMenus.has(menu.id) ? '▼' : '▶';

        header.appendChild(icon);
        header.appendChild(name);
        header.appendChild(chevron);

        header.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.toggleMenu(menu.id);
        });

        // Items
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'menu-items';

        for (const itemId of menu.items) {
            const item = this.itemRegistry.getItem(itemId);
            if (item) {
                const itemElement = this.createItemElement(item);
                itemsContainer.appendChild(itemElement);
            }
        }

        menuDiv.appendChild(header);
        menuDiv.appendChild(itemsContainer);

        return menuDiv;
    }

    createItemElement(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'menu-item';
        itemDiv.dataset.itemId = item.id;

        const icon = document.createElement('span');
        icon.className = 'item-icon';
        icon.textContent = item.emoji;

        const name = document.createElement('span');
        name.className = 'item-name';
        name.textContent = item.name;

        const price = document.createElement('span');
        price.className = 'item-price';
        price.textContent = `$${item.salePrice}`;

        itemDiv.appendChild(icon);
        itemDiv.appendChild(name);
        itemDiv.appendChild(price);

        itemDiv.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.onItemClick(item);
        });

        return itemDiv;
    }

    toggleMenu(menuId) {
        if (this.expandedMenus.has(menuId)) {
            this.expandedMenus.delete(menuId);
        } else {
            this.expandedMenus.add(menuId);
        }

        this.refresh();
    }

    onItemClick(item) {
        // Check if player can afford
        if (this.game.player.money < item.salePrice) {
            console.warn(`Cannot afford ${item.name}`);
            return;
        }

        // Check if inventory has room
        if (!this.inventoryManager.hasRoomFor(item.id)) {
            console.warn('Inventory is full');
            return;
        }

        // Purchase item
        this.game.player.money -= item.salePrice;
        this.game.uiManager.updateMoney(this.game.player.money);

        // Add to inventory
        if (this.inventoryManager.addItem(item.id)) {
            // Refresh inventory panel if visible
            if (this.game.inventoryPanel.isVisible()) {
                this.game.inventoryPanel.refresh();
            }

            // Save state
            this.game.stateManager.scheduleSave(this.game.getGameState());

            // Update affordability for both shop and inventory
            this.updateAffordability();
            if (this.game.inventoryPanel.isVisible()) {
                this.game.inventoryPanel.updateControlButtons();
            }
        }
    }

    updateAffordability() {
        const items = this.container.querySelectorAll('.menu-item');
        items.forEach(itemElement => {
            const itemId = itemElement.dataset.itemId;
            const item = this.itemRegistry.getItem(itemId);

            if (item) {
                if (this.game.player.money < item.salePrice) {
                    itemElement.classList.add('disabled');
                } else {
                    itemElement.classList.remove('disabled');
                }
            }
        });
    }

    getElement() {
        return this.container;
    }
}
