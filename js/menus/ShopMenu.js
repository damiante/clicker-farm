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
        this.refresh();
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

        // Only show unlocked items
        const unlockedItems = this.menuManager.getUnlockedItemsForMenu(menu.id);
        for (const itemId of unlockedItems) {
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

        // Handle image-based items differently from emoji items
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

        const name = document.createElement('span');
        name.className = 'item-name';
        name.textContent = item.name;

        const priceContainer = document.createElement('span');
        priceContainer.className = 'item-price-container';

        // Show money price (or checkmark if tool is owned)
        const price = document.createElement('span');
        price.className = 'item-price';

        // Check if this is an owned tool
        const isOwnedTool = item.itemType === 'tool' &&
                           this.game.player.ownedTools &&
                           this.game.player.ownedTools.includes(item.id);

        if (isOwnedTool) {
            price.textContent = '✅';
            name.style.textDecoration = 'line-through';
        } else {
            price.textContent = `$${item.salePrice}`;
        }

        priceContainer.appendChild(price);

        // Show item requirements if any
        if (item.requirements) {
            const requirementsDiv = document.createElement('div');
            requirementsDiv.className = 'item-requirements';

            for (const [requiredItemId, requiredCount] of Object.entries(item.requirements)) {
                const requiredItem = this.itemRegistry.getItem(requiredItemId);
                if (requiredItem) {
                    const reqSpan = document.createElement('span');
                    reqSpan.className = 'requirement';
                    reqSpan.textContent = `${requiredItem.emoji || '?'} ${requiredCount}`;
                    reqSpan.title = `${requiredCount}x ${requiredItem.name}`;

                    // Add hover to show item description
                    reqSpan.addEventListener('pointerenter', (e) => {
                        e.stopPropagation();
                        this.showRequirementPreview(requiredItem, e.clientX, e.clientY);
                    });
                    reqSpan.addEventListener('pointerleave', (e) => {
                        e.stopPropagation();
                        this.hideRequirementPreview();
                    });

                    requirementsDiv.appendChild(reqSpan);
                }
            }

            priceContainer.appendChild(requirementsDiv);
        }

        itemDiv.appendChild(icon);
        itemDiv.appendChild(name);
        itemDiv.appendChild(priceContainer);

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
        // Check if tool is already owned
        if (item.itemType === 'tool') {
            if (this.game.player.ownedTools && this.game.player.ownedTools.includes(item.id)) {
                console.warn(`Already own ${item.name}`);
                return;
            }
        }

        // Check if player can afford money cost
        if (this.game.player.money < item.salePrice) {
            console.warn(`Cannot afford ${item.name}`);
            return;
        }

        // Check item requirements
        if (item.requirements) {
            for (const [requiredItemId, requiredCount] of Object.entries(item.requirements)) {
                const availableCount = this.inventoryManager.getItemCount(requiredItemId);
                if (availableCount < requiredCount) {
                    console.warn(`Need ${requiredCount}x ${requiredItemId}, only have ${availableCount}`);
                    return;
                }
            }
        }

        // For non-tools, check if inventory has room AFTER consuming requirements
        if (item.itemType !== 'tool') {
            // Temporarily remove required items to check space
            const removedItems = [];
            if (item.requirements) {
                for (const [requiredItemId, requiredCount] of Object.entries(item.requirements)) {
                    this.inventoryManager.removeItem(requiredItemId, requiredCount);
                    removedItems.push({ itemId: requiredItemId, count: requiredCount });
                }
            }

            const hasRoom = this.inventoryManager.hasRoomFor(item.id);

            // Restore temporarily removed items
            for (const { itemId, count } of removedItems) {
                this.inventoryManager.addItem(itemId, count);
            }

            if (!hasRoom) {
                console.warn('Not enough inventory space after consuming requirements');
                return;
            }
        }

        // Deduct money
        this.game.player.money = this.game.roundMoney(this.game.player.money - item.salePrice);
        this.game.uiManager.updateMoney(this.game.player.money);

        // Remove required items from inventory
        if (item.requirements) {
            for (const [requiredItemId, requiredCount] of Object.entries(item.requirements)) {
                this.inventoryManager.removeItem(requiredItemId, requiredCount);
            }
        }

        // Handle tool purchase (add to ownedTools)
        if (item.itemType === 'tool') {
            if (!this.game.player.ownedTools) {
                this.game.player.ownedTools = [];
            }
            this.game.player.ownedTools.push(item.id);
            console.log(`Unlocked tool: ${item.name}`);

            // Refresh tools panel and notify user
            if (this.game.toolsPanel) {
                this.game.toolsPanel.refresh();
                this.game.toolsPanel.notifyToolPurchased();
            }
        } else {
            // Add to inventory (non-tools)
            if (this.inventoryManager.addItem(item.id)) {
                // Notify about new item (shows pulse if inventory closed)
                this.game.inventoryPanel.notifyItemAdded();
            }
        }

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

    showRequirementPreview(item, x, y) {
        if (!this.requirementPreview) {
            this.requirementPreview = document.createElement('div');
            this.requirementPreview.className = 'requirement-preview';
            document.body.appendChild(this.requirementPreview);
        }

        this.requirementPreview.innerHTML = '';

        const icon = document.createElement('div');
        icon.className = 'preview-icon';
        icon.textContent = item.emoji || '?';

        const name = document.createElement('div');
        name.className = 'preview-name';
        name.textContent = item.name;

        const description = document.createElement('div');
        description.className = 'preview-description';
        description.textContent = item.description;

        this.requirementPreview.appendChild(icon);
        this.requirementPreview.appendChild(name);
        this.requirementPreview.appendChild(description);

        // Position near mouse
        this.requirementPreview.style.left = `${x + 10}px`;
        this.requirementPreview.style.top = `${y + 10}px`;
        this.requirementPreview.classList.add('visible');
    }

    hideRequirementPreview() {
        if (this.requirementPreview) {
            this.requirementPreview.classList.remove('visible');
        }
    }

    updateAffordability() {
        const items = this.container.querySelectorAll('.menu-item');
        items.forEach(itemElement => {
            const itemId = itemElement.dataset.itemId;
            const item = this.itemRegistry.getItem(itemId);

            if (item) {
                let canAfford = true;

                // Check if tool is already owned
                if (item.itemType === 'tool') {
                    if (this.game.player.ownedTools && this.game.player.ownedTools.includes(item.id)) {
                        itemElement.classList.add('disabled');

                        // Update visual indicators for owned tool
                        const priceElement = itemElement.querySelector('.item-price');
                        const nameElement = itemElement.querySelector('.item-name');
                        if (priceElement) {
                            priceElement.textContent = '✅';
                        }
                        if (nameElement) {
                            nameElement.style.textDecoration = 'line-through';
                        }
                        return;
                    } else {
                        // Tool not owned - ensure normal display
                        const priceElement = itemElement.querySelector('.item-price');
                        const nameElement = itemElement.querySelector('.item-name');
                        if (priceElement && priceElement.textContent === '✅') {
                            priceElement.textContent = `$${item.salePrice}`;
                        }
                        if (nameElement) {
                            nameElement.style.textDecoration = 'none';
                        }
                    }
                }

                // Check money
                if (this.game.player.money < item.salePrice) {
                    canAfford = false;
                }

                // Check item requirements
                if (item.requirements) {
                    for (const [requiredItemId, requiredCount] of Object.entries(item.requirements)) {
                        const availableCount = this.inventoryManager.getItemCount(requiredItemId);
                        if (availableCount < requiredCount) {
                            canAfford = false;
                            break;
                        }
                    }
                }

                if (canAfford) {
                    itemElement.classList.remove('disabled');
                } else {
                    itemElement.classList.add('disabled');
                }
            }
        });
    }

    getElement() {
        return this.container;
    }
}
