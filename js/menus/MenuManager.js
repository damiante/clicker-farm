export class MenuManager {
    constructor(game, itemRegistry) {
        this.game = game;
        this.itemRegistry = itemRegistry;
        this.menus = [];
        this.loaded = false;
    }

    async load() {
        try {
            const response = await fetch('./data/menus.json');
            if (!response.ok) {
                throw new Error(`Failed to load menus.json: ${response.statusText}`);
            }

            this.menus = await response.json();
            this.loaded = true;
            console.log(`Loaded ${this.menus.length} menus`);
        } catch (error) {
            console.error('Error loading menus:', error);
            throw error;
        }
    }

    isMenuUnlocked(menuId) {
        return this.game.player.unlockedMenus.includes(menuId);
    }

    getVisibleMenus() {
        return this.menus.filter(menu => this.isMenuUnlocked(menu.id));
    }

    getAllMenus() {
        return this.menus;
    }

    checkUnlocks() {
        let unlocked = false;

        for (const menu of this.menus) {
            if (!this.isMenuUnlocked(menu.id)) {
                // Find minimum price in this menu
                let minPrice = Infinity;
                for (const itemId of menu.items) {
                    const item = this.itemRegistry.getItem(itemId);
                    if (item && item.salePrice < minPrice) {
                        minPrice = item.salePrice;
                    }
                }

                // Unlock if player has ever reached this amount
                if (this.game.player.peakMoney >= minPrice) {
                    this.game.player.unlockedMenus.push(menu.id);
                    unlocked = true;
                    console.log(`Unlocked menu: ${menu.name}`);
                }
            }
        }

        return unlocked;
    }

    checkItemUnlocks() {
        let unlocked = false;

        for (const menu of this.menus) {
            // Only check items in unlocked menus
            if (!this.isMenuUnlocked(menu.id)) {
                continue;
            }

            // Get items sorted by price
            const sortedItems = menu.items
                .map(itemId => this.itemRegistry.getItem(itemId))
                .filter(item => item !== null && item !== undefined)
                .sort((a, b) => a.salePrice - b.salePrice);

            for (const item of sortedItems) {
                if (!this.isItemUnlocked(item.id)) {
                    // Unlock if player has ever reached this price
                    if (this.game.player.peakMoney >= item.salePrice) {
                        this.game.player.unlockedItems.push(item.id);
                        unlocked = true;
                        console.log(`Unlocked item: ${item.name} ($${item.salePrice})`);
                    }
                }
            }
        }

        return unlocked;
    }

    isItemUnlocked(itemId) {
        return this.game.player.unlockedItems.includes(itemId);
    }

    getUnlockedItemsForMenu(menuId) {
        const menu = this.getMenu(menuId);
        if (!menu) return [];

        return menu.items.filter(itemId => {
            // Item must be unlocked by price
            if (!this.isItemUnlocked(itemId)) {
                return false;
            }

            // Check tool prerequisites
            const item = this.itemRegistry.getItem(itemId);
            if (item && item.toolPrerequisite) {
                // Player must own the prerequisite tool
                if (!this.game.player.ownedTools || !this.game.player.ownedTools.includes(item.toolPrerequisite)) {
                    return false;
                }
            }

            return true;
        });
    }

    getMenu(menuId) {
        return this.menus.find(menu => menu.id === menuId);
    }

    isLoaded() {
        return this.loaded;
    }
}
