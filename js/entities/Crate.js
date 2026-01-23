import { Entity } from './Entity.js';

export class Crate extends Entity {
    constructor(x, y, itemId) {
        super(x, y, 'crate');
        this.itemId = itemId;
        // 3x3 grid of slots (9 total)
        // Each slot: null or {itemId, count}
        this.slots = Array(9).fill(null);
        this.maxStackSize = 5;  // Default, updated when items are placed
    }

    update(deltaTime) {
        // Crates don't have any time-based updates
    }

    // Place items in a specific slot
    placeInSlot(slotIndex, itemId, count, maxStackSize) {
        if (slotIndex < 0 || slotIndex >= 9) {
            return { error: 'Invalid slot index' };
        }

        this.maxStackSize = maxStackSize;
        const slot = this.slots[slotIndex];

        if (!slot) {
            // Empty slot, place items
            const placed = Math.min(count, maxStackSize);
            this.slots[slotIndex] = { itemId, count: placed };
            const remaining = count - placed;
            return remaining > 0 ? { overflow: { itemId, count: remaining } } : null;
        } else if (slot.itemId === itemId) {
            // Same item, try to add to stack
            const spaceLeft = maxStackSize - slot.count;
            const toAdd = Math.min(count, spaceLeft);
            slot.count += toAdd;
            const remaining = count - toAdd;
            return remaining > 0 ? { overflow: { itemId, count: remaining } } : null;
        } else {
            // Different item, swap
            const swapped = { itemId: slot.itemId, count: slot.count };
            const placed = Math.min(count, maxStackSize);
            this.slots[slotIndex] = { itemId, count: placed };

            const overflow = count - placed;
            const result = { swapped };
            if (overflow > 0) {
                result.overflow = { itemId, count: overflow };
            }
            return result;
        }
    }

    // Take all items from a specific slot
    takeFromSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= 9) {
            return null;
        }

        const slot = this.slots[slotIndex];
        if (!slot) {
            return null;
        }

        const taken = { ...slot };
        this.slots[slotIndex] = null;
        return taken;
    }

    // Check if crate can be picked up (removed)
    canPickup() {
        // Can't pickup if any slot has items
        return this.slots.every(slot => slot === null);
    }

    // Get overlay icons for the crate contents (3x3 grid)
    getOverlayIcons() {
        const overlays = [];

        // 3x3 grid layout on the tile
        // Divide tile into 3x3 grid, each cell is 1/3 of tile
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const slotIndex = row * 3 + col;
                const slot = this.slots[slotIndex];

                if (slot && slot.itemId) {
                    overlays.push({
                        itemId: slot.itemId,
                        offsetX: col * 0.33 + 0.05,  // Position in grid with small margin
                        offsetY: row * 0.33 + 0.05,
                        scale: 0.28  // Slightly smaller than 1/3 to add spacing
                    });
                }
            }
        }

        return overlays.length > 0 ? overlays : null;
    }

    render(ctx, cameraX, cameraY, tileSize, assetLoader) {
        // Calculate screen position (ctx is already scaled by zoom)
        const screenX = Math.floor(this.x * tileSize - cameraX);
        const screenY = Math.floor(this.y * tileSize - cameraY);

        const image = assetLoader.getAsset('crate.png');

        if (image) {
            ctx.drawImage(
                image,
                screenX,
                screenY,
                tileSize,
                tileSize
            );
        } else {
            // Fallback: render a placeholder
            ctx.save();
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
            ctx.restore();
        }
    }

    serialize() {
        return {
            ...super.serialize(),
            itemId: this.itemId,
            slots: this.slots,
            maxStackSize: this.maxStackSize
        };
    }

    static deserialize(data) {
        const crate = new Crate(data.x, data.y, data.itemId);
        crate.slots = data.slots || Array(9).fill(null);
        crate.maxStackSize = data.maxStackSize || 5;
        return crate;
    }
}
