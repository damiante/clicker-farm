import { InventoryConfig } from '../config/InventoryConfig.js';

export class InventoryManager {
    constructor(game, itemRegistry) {
        this.game = game;
        this.itemRegistry = itemRegistry;

        this.slots = [];
        this.maxSlots = InventoryConfig.INITIAL_SLOTS;
        this.maxStackSize = InventoryConfig.INITIAL_STACK_SIZE;
        this.slotPrice = InventoryConfig.SLOT_BASE_PRICE;
        this.stackPrice = InventoryConfig.STACK_BASE_PRICE;

        // Initialize empty slots
        for (let i = 0; i < this.maxSlots; i++) {
            this.slots.push(null);
        }
    }

    hasRoomFor(itemId, count = 1) {
        // Check if item can fit in existing stack
        for (const slot of this.slots) {
            if (slot && slot.itemId === itemId && slot.count + count <= this.maxStackSize) {
                return true;
            }
        }

        // Check for empty slot
        return this.slots.some(slot => slot === null);
    }

    addItem(itemId, count = 1) {
        if (!this.itemRegistry.getItem(itemId)) {
            console.error(`Cannot add unknown item: ${itemId}`);
            return false;
        }

        // Try to add to existing stack
        for (const slot of this.slots) {
            if (slot && slot.itemId === itemId) {
                const spaceInStack = this.maxStackSize - slot.count;
                if (spaceInStack >= count) {
                    slot.count += count;
                    return true;
                } else if (spaceInStack > 0) {
                    // Partially fill this stack
                    slot.count = this.maxStackSize;
                    count -= spaceInStack;
                    // Continue to add remaining count
                }
            }
        }

        // Add to empty slot
        while (count > 0) {
            const emptyIndex = this.slots.findIndex(slot => slot === null);
            if (emptyIndex === -1) {
                console.warn('Inventory is full');
                return false;
            }

            const addCount = Math.min(count, this.maxStackSize);
            this.slots[emptyIndex] = {
                itemId: itemId,
                count: addCount
            };
            count -= addCount;
        }

        return true;
    }

    removeItem(itemId, count = 1) {
        let remaining = count;

        for (let i = 0; i < this.slots.length; i++) {
            const slot = this.slots[i];
            if (slot && slot.itemId === itemId) {
                if (slot.count >= remaining) {
                    slot.count -= remaining;
                    if (slot.count === 0) {
                        this.slots[i] = null;
                    }
                    return true;
                } else {
                    remaining -= slot.count;
                    this.slots[i] = null;
                }
            }
        }

        if (remaining > 0) {
            console.warn(`Not enough ${itemId} to remove ${count}`);
            return false;
        }

        return true;
    }

    getItemCount(itemId) {
        let total = 0;
        for (const slot of this.slots) {
            if (slot && slot.itemId === itemId) {
                total += slot.count;
            }
        }
        return total;
    }

    getSlot(index) {
        return this.slots[index];
    }

    getNextSlotPrice() {
        if (this.maxSlots >= InventoryConfig.MAX_SLOTS) {
            return null; // Max reached
        }

        // Calculate based on how many slots already owned
        const slotsOwned = this.maxSlots - InventoryConfig.INITIAL_SLOTS;
        return Math.floor(
            InventoryConfig.SLOT_BASE_PRICE *
            Math.pow(InventoryConfig.SLOT_PRICE_GROWTH, slotsOwned)
        );
    }

    getNextStackPrice() {
        if (this.maxStackSize >= InventoryConfig.MAX_STACK_SIZE) {
            return null; // Max reached
        }

        // Calculate based on how many upgrades already purchased
        const upgradesPurchased = (this.maxStackSize - InventoryConfig.INITIAL_STACK_SIZE) /
                                   InventoryConfig.STACK_SIZE_INCREMENT;
        return Math.floor(
            InventoryConfig.STACK_BASE_PRICE *
            Math.pow(InventoryConfig.STACK_PRICE_GROWTH, upgradesPurchased)
        );
    }

    expandSlots() {
        if (this.maxSlots >= InventoryConfig.MAX_SLOTS) {
            console.warn('Inventory already at max slots');
            return false;
        }

        const price = this.getNextSlotPrice();
        if (this.game.player.money < price) {
            console.warn('Not enough money to expand inventory');
            return false;
        }

        // Deduct money
        this.game.player.money -= price;
        this.game.uiManager.updateMoney(this.game.player.money);

        // Add slot
        this.maxSlots++;
        this.slots.push(null);

        // Save state
        this.game.stateManager.scheduleSave(this.game.getGameState());

        return true;
    }

    upgradeStackSize() {
        if (this.maxStackSize >= InventoryConfig.MAX_STACK_SIZE) {
            console.warn('Stack size already at maximum');
            return false;
        }

        const price = this.getNextStackPrice();
        if (this.game.player.money < price) {
            console.warn('Not enough money to upgrade stack size');
            return false;
        }

        // Deduct money
        this.game.player.money -= price;
        this.game.uiManager.updateMoney(this.game.player.money);

        // Increase stack size
        this.maxStackSize += InventoryConfig.STACK_SIZE_INCREMENT;

        // Save state
        this.game.stateManager.scheduleSave(this.game.getGameState());

        return true;
    }

    serialize() {
        return {
            slots: this.slots.map(slot => slot ? { ...slot } : null),
            maxSlots: this.maxSlots,
            maxStackSize: this.maxStackSize,
            slotPrice: this.slotPrice,
            stackPrice: this.stackPrice
        };
    }

    deserialize(data) {
        this.slots = data.slots || [];
        this.maxSlots = data.maxSlots || InventoryConfig.INITIAL_SLOTS;
        this.maxStackSize = data.maxStackSize || InventoryConfig.INITIAL_STACK_SIZE;
        this.slotPrice = data.slotPrice || InventoryConfig.SLOT_BASE_PRICE;
        this.stackPrice = data.stackPrice || InventoryConfig.STACK_BASE_PRICE;

        // Ensure slots array has correct length
        while (this.slots.length < this.maxSlots) {
            this.slots.push(null);
        }
    }
}
