import { Entity } from './Entity.js';
import { GameConfig } from '../config/GameConfig.js';

export class Barrel extends Entity {
    constructor(x, y, itemId) {
        super(x, y, 'barrel');
        this.itemId = itemId;
        this.inputSlot = null;  // {itemId, count} - Queued items (can be retrieved)
        this.activeItem = null; // {itemId} - Currently fermenting (always 1 item)
        this.outputSlot = null; // {itemId, count} - Fermented items
        this.fermentationStartTime = null;  // Timestamp when fermentation started
        this.fermentationTime = null;  // Time in seconds for current recipe
        this.maxStackSize = 5;  // Default, updated when items are placed
    }

    update(deltaTime) {
        // Check if fermentation should complete
        if (this.activeItem && this.fermentationStartTime) {
            const progress = this.getFermentationProgress();

            // If fermentation is complete, try to produce item
            if (progress >= 1.0) {
                this.completeFermentation();
            }
        }

        // If no active fermentation but have queued items, start next fermentation
        if (!this.activeItem && this.inputSlot) {
            this.startNextFermentation();
        }
    }

    getFermentationProgress() {
        if (!this.activeItem || !this.fermentationStartTime || !this.fermentationTime) {
            return 0;
        }

        const elapsed = (Date.now() - this.fermentationStartTime) / 1000; // Convert to seconds
        const progress = elapsed / this.fermentationTime;
        return Math.min(progress, 1.0);
    }

    startNextFermentation() {
        // Take one item from queue and start fermenting it
        if (!this.inputSlot || this.inputSlot.count === 0) {
            return;
        }

        // Move one item from queue to active
        this.activeItem = { itemId: this.inputSlot.itemId };
        this.inputSlot.count--;
        if (this.inputSlot.count === 0) {
            this.inputSlot = null;
        }

        // Get recipe to determine fermentation time
        const recipe = GameConfig.FERMENTATION.RECIPES[this.activeItem.itemId];
        if (recipe) {
            this.fermentationTime = recipe.time;
            this.fermentationStartTime = Date.now();
        }
    }

    completeFermentation() {
        if (!this.activeItem) {
            return; // Can't complete if nothing is fermenting
        }

        // Get the output item based on recipe
        const recipe = GameConfig.FERMENTATION.RECIPES[this.activeItem.itemId];
        if (!recipe) {
            console.warn(`No fermentation recipe for ${this.activeItem.itemId}`);
            return;
        }

        const outputItemId = recipe.output;

        // Check if we can add to output slot
        if (!this.outputSlot) {
            // Empty output slot
            this.outputSlot = { itemId: outputItemId, count: 1 };
        } else if (this.outputSlot.itemId === outputItemId && this.outputSlot.count < this.maxStackSize) {
            // Same item and room in stack
            this.outputSlot.count++;
        } else {
            // Different item or full stack - can't complete, keep fermenting
            return;
        }

        // Clear active item (fermentation complete)
        this.activeItem = null;
        this.fermentationStartTime = null;
        this.fermentationTime = null;

        // Next fermentation will be started by update() if items are queued
    }

    canPickup() {
        // Can't pickup if barrel has items or is fermenting
        return !this.inputSlot && !this.activeItem && !this.outputSlot;
    }

    placeInInput(itemId, count, maxStackSize) {
        // Update max stack size from player settings
        this.maxStackSize = maxStackSize;

        if (!this.inputSlot) {
            // Empty slot, place items (only up to max)
            const placed = Math.min(count, maxStackSize);
            this.inputSlot = { itemId, count: placed };
            // Fermentation will be started automatically by update() if no active item
            const remaining = count - placed;
            return remaining > 0 ? { overflow: { itemId, count: remaining } } : null;
        } else if (this.inputSlot.itemId === itemId) {
            // Same item, try to add to stack
            const spaceLeft = maxStackSize - this.inputSlot.count;
            const toAdd = Math.min(count, spaceLeft);
            this.inputSlot.count += toAdd;
            const remaining = count - toAdd;
            return remaining > 0 ? { overflow: { itemId, count: remaining } } : null;
        } else {
            // Different item, swap
            const swapped = { itemId: this.inputSlot.itemId, count: this.inputSlot.count };
            const placed = Math.min(count, maxStackSize);
            this.inputSlot = { itemId, count: placed };

            // Return object with both swapped items and any overflow
            const overflow = count - placed;
            const result = { swapped };
            if (overflow > 0) {
                result.overflow = { itemId, count: overflow };
            }
            return result;
        }
    }

    takeFromInput() {
        // Take all queued items from input slot (doesn't affect active fermentation)
        if (!this.inputSlot) {
            return null;
        }

        const taken = { ...this.inputSlot };
        this.inputSlot = null;
        return taken;
    }

    takeFromOutput() {
        if (!this.outputSlot) {
            return null;
        }

        const taken = { ...this.outputSlot };
        this.outputSlot = null;
        return taken;
    }

    isFermenting() {
        return this.activeItem !== null && this.fermentationStartTime !== null;
    }

    getOverlayIcons() {
        // Return array of overlay icons for barrel contents
        // This allows multiple icons to be displayed on the same entity
        const overlays = [];

        // Input slot overlay (left side)
        if (this.inputSlot && this.inputSlot.itemId) {
            overlays.push({
                itemId: this.inputSlot.itemId,
                offsetX: 0.1,    // Left side of tile (0 = left, 1 = right)
                offsetY: 0.67,   // Bottom of tile (0 = top, 1 = bottom)
                scale: 0.33      // 33% of tile size
            });
        }

        // Output slot overlay (right side)
        if (this.outputSlot && this.outputSlot.itemId) {
            overlays.push({
                itemId: this.outputSlot.itemId,
                offsetX: 0.57,   // Right side of tile
                offsetY: 0.67,   // Bottom of tile (same as input)
                scale: 0.33      // 33% of tile size
            });
        }

        return overlays.length > 0 ? overlays : null;
    }

    render(ctx, cameraX, cameraY, tileSize, assetLoader) {
        // Calculate screen position (ctx is already scaled by zoom)
        const screenX = Math.floor(this.x * tileSize - cameraX);
        const screenY = Math.floor(this.y * tileSize - cameraY);

        const image = assetLoader.getAsset('barrel.png');

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
            ctx.fillStyle = '#654321';
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
            ctx.restore();
        }
    }

    serialize() {
        return {
            ...super.serialize(),
            itemId: this.itemId,
            inputSlot: this.inputSlot,
            activeItem: this.activeItem,
            outputSlot: this.outputSlot,
            fermentationStartTime: this.fermentationStartTime,
            fermentationTime: this.fermentationTime,
            maxStackSize: this.maxStackSize
        };
    }

    static deserialize(data) {
        const barrel = new Barrel(data.x, data.y, data.itemId);
        barrel.inputSlot = data.inputSlot || null;
        barrel.activeItem = data.activeItem || null;
        barrel.outputSlot = data.outputSlot || null;
        barrel.fermentationStartTime = data.fermentationStartTime || null;
        barrel.fermentationTime = data.fermentationTime || null;
        barrel.maxStackSize = data.maxStackSize || 5;
        return barrel;
    }
}
