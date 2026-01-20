export class ItemRegistry {
    constructor() {
        this.items = new Map();
        this.loaded = false;
    }

    async load() {
        try {
            const response = await fetch('./data/items.json');
            if (!response.ok) {
                throw new Error(`Failed to load items.json: ${response.statusText}`);
            }

            const itemsData = await response.json();

            for (const [itemId, itemData] of Object.entries(itemsData)) {
                this.items.set(itemId, itemData);
            }

            this.loaded = true;
            console.log(`Loaded ${this.items.size} items`);
        } catch (error) {
            console.error('Error loading items:', error);
            throw error;
        }
    }

    getItem(itemId) {
        if (!this.loaded) {
            console.warn('ItemRegistry: getItem() called before load()');
        }

        const item = this.items.get(itemId);
        if (!item) {
            console.warn(`ItemRegistry: Item '${itemId}' not found`);
        }

        return item;
    }

    getAllItems() {
        return Array.from(this.items.values());
    }

    isItemType(itemId, type) {
        const item = this.getItem(itemId);
        return item && item.itemType === type;
    }

    isLoaded() {
        return this.loaded;
    }
}
