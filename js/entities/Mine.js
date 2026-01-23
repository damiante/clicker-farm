import { Entity } from './Entity.js';
import { GameConfig } from '../config/GameConfig.js';

export class Mine extends Entity {
    constructor(x, y, itemId) {
        super(x, y, 'mine');
        this.itemId = itemId;
        // Mine is a 2x2 multi-tile structure
        this.width = 2;
        this.height = 2;

        // 3 output slots for rock, ore, coal
        this.outputSlots = [
            null,  // Slot 0: Rock
            null,  // Slot 1: Ore
            null   // Slot 2: Coal
        ];

        this.maxStackSize = GameConfig.MINING.MAX_STACK_SIZE;
    }

    update(deltaTime) {
        // Mines don't have any time-based updates
    }

    // Attempt to mine and generate items based on occurrence chance
    mine() {
        const outputs = GameConfig.MINING.OUTPUTS;
        const generated = [];

        // Try to generate each item based on its occurrence chance
        for (const output of outputs) {
            if (Math.random() < output.chance) {
                generated.push(output.itemId);
            }
        }

        // Add generated items to slots based on priority (rock > ore > coal)
        // The priority is already in the correct order from the config
        const results = [];
        for (const itemId of generated) {
            const result = this.addToSlot(itemId);
            if (result) {
                results.push(result);
            }
        }

        return results;
    }

    // Add an item to the appropriate output slot
    addToSlot(itemId) {
        // Find the slot index for this item
        let slotIndex;
        if (itemId === 'rock') {
            slotIndex = 0;
        } else if (itemId === 'ore') {
            slotIndex = 1;
        } else if (itemId === 'coal') {
            slotIndex = 2;
        } else {
            console.warn(`Unknown mine output item: ${itemId}`);
            return null;
        }

        const slot = this.outputSlots[slotIndex];

        if (!slot) {
            // Empty slot, add item
            this.outputSlots[slotIndex] = { itemId, count: 1 };
            return { slotIndex, itemId, added: true };
        } else if (slot.itemId === itemId && slot.count < this.maxStackSize) {
            // Same item and room in stack
            slot.count++;
            return { slotIndex, itemId, added: true };
        } else {
            // Slot is full or has different item (shouldn't happen)
            return { slotIndex, itemId, added: false, reason: 'full' };
        }
    }

    // Take all items from a specific output slot
    takeFromSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.outputSlots.length) {
            return null;
        }

        const slot = this.outputSlots[slotIndex];
        if (!slot) {
            return null;
        }

        const taken = { ...slot };
        this.outputSlots[slotIndex] = null;
        return taken;
    }

    // Universal output collection interface (for gloves painting)
    hasOutputToCollect() {
        return this.outputSlots.some(slot => slot !== null && slot.count > 0);
    }

    collectFirstOutput() {
        // Find first non-empty slot and take from it
        for (let i = 0; i < this.outputSlots.length; i++) {
            if (this.outputSlots[i]) {
                return this.takeFromSlot(i);
            }
        }
        return null;
    }

    // Check if mine can be picked up (removed)
    canPickup() {
        // Can't pickup if any slot has items
        return this.outputSlots.every(slot => slot === null);
    }

    // Get overlay icons for the output slots
    getOverlayIcons() {
        const overlays = [];

        // Slot 0 (Rock) - bottom-left position
        if (this.outputSlots[0]) {
            overlays.push({
                itemId: this.outputSlots[0].itemId,
                offsetX: 0.1,
                offsetY: 1.7,
                scale: 0.35
            });
        }

        // Slot 1 (Ore) - bottom-center position
        if (this.outputSlots[1]) {
            overlays.push({
                itemId: this.outputSlots[1].itemId,
                offsetX: 0.825,
                offsetY: 1.7,
                scale: 0.35
            });
        }

        // Slot 2 (Coal) - bottom-right position
        if (this.outputSlots[2]) {
            overlays.push({
                itemId: this.outputSlots[2].itemId,
                offsetX: 1.55,
                offsetY: 1.7,
                scale: 0.35
            });
        }

        return overlays.length > 0 ? overlays : null;
    }

    render(ctx, cameraX, cameraY, tileSize, assetLoader, itemRegistry) {
        // Calculate screen position (ctx is already scaled by zoom)
        const screenX = Math.floor(this.x * tileSize - cameraX);
        const screenY = Math.floor(this.y * tileSize - cameraY);

        // Mine is 2x2 tiles
        const mineSize = tileSize * 2;

        // Get the mine item to render emoji
        const item = itemRegistry.getItem(this.itemId);

        if (item && item.emoji) {
            // Render emoji centered in 2x2 area
            ctx.save();
            ctx.font = `${tileSize * 2}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                item.emoji,
                screenX + mineSize / 2,
                screenY + mineSize / 2
            );
            ctx.restore();
        } else {
            // Fallback: render a placeholder
            ctx.save();
            ctx.fillStyle = '#666';
            ctx.fillRect(screenX, screenY, mineSize, mineSize);
            ctx.restore();
        }
    }

    serialize() {
        return {
            ...super.serialize(),
            itemId: this.itemId,
            outputSlots: this.outputSlots,
            maxStackSize: this.maxStackSize,
            width: this.width,
            height: this.height
        };
    }

    static deserialize(data) {
        const mine = new Mine(data.x, data.y, data.itemId);
        mine.outputSlots = data.outputSlots || [null, null, null];
        mine.maxStackSize = data.maxStackSize || GameConfig.MINING.MAX_STACK_SIZE;
        mine.width = data.width || 2;
        mine.height = data.height || 2;
        return mine;
    }
}
