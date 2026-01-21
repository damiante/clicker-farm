import { Entity } from './Entity.js';
import { GameConfig } from '../config/GameConfig.js';

export class Barrel extends Entity {
    constructor(x, y, itemId) {
        super(x, y, 'barrel');
        this.itemId = itemId;
        this.inputSlot = null;  // {itemId, count} or null
        this.outputSlot = null; // {itemId, count} or null
        this.fermentationStartTime = null;  // Timestamp when fermentation started
        this.fermentationTime = null;  // Time in seconds for current recipe
        this.maxStackSize = 5;  // Default, updated when items are placed
    }

    update(deltaTime) {
        // Check if fermentation should complete
        if (this.inputSlot && this.fermentationStartTime) {
            const progress = this.getFermentationProgress();

            // If fermentation is complete, try to produce item (completeFermentation handles stack checking)
            if (progress >= 1.0) {
                this.completeFermentation();
            }
        }
    }

    getFermentationProgress() {
        if (!this.inputSlot || !this.fermentationStartTime || !this.fermentationTime) {
            return 0;
        }

        const elapsed = (Date.now() - this.fermentationStartTime) / 1000; // Convert to seconds
        const progress = elapsed / this.fermentationTime;
        return Math.min(progress, 1.0);
    }

    startFermentation() {
        if (this.inputSlot) {
            // Get recipe to determine fermentation time
            const recipe = GameConfig.FERMENTATION.RECIPES[this.inputSlot.itemId];
            if (recipe) {
                this.fermentationTime = recipe.time;
                this.fermentationStartTime = Date.now();
            }
        }
    }

    completeFermentation() {
        if (!this.inputSlot) {
            return; // Can't complete if no input
        }

        // Get the output item based on recipe
        const recipe = GameConfig.FERMENTATION.RECIPES[this.inputSlot.itemId];
        if (!recipe) {
            console.warn(`No fermentation recipe for ${this.inputSlot.itemId}`);
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
            // Different item or full stack - can't complete
            return;
        }

        // Decrease input count
        this.inputSlot.count--;
        if (this.inputSlot.count <= 0) {
            this.inputSlot = null;
            this.fermentationStartTime = null;
            this.fermentationTime = null;
        } else {
            // Restart fermentation for next item
            this.fermentationStartTime = Date.now();
        }
    }

    canPickup() {
        // Can't pickup if barrel has items or is fermenting
        return !this.inputSlot && !this.outputSlot;
    }

    placeInInput(itemId, count, maxStackSize) {
        // Update max stack size from player settings
        this.maxStackSize = maxStackSize;

        if (!this.inputSlot) {
            // Empty slot, place item
            this.inputSlot = { itemId, count: Math.min(count, maxStackSize) };
            this.startFermentation();
            return null; // No item to return
        } else if (this.inputSlot.itemId === itemId) {
            // Same item, try to add to stack
            const spaceLeft = maxStackSize - this.inputSlot.count;
            const toAdd = Math.min(count, spaceLeft);
            this.inputSlot.count += toAdd;
            const remaining = count - toAdd;
            return remaining > 0 ? { itemId, count: remaining } : null;
        } else {
            // Different item, swap
            const swapped = { itemId: this.inputSlot.itemId, count: this.inputSlot.count };
            this.inputSlot = { itemId, count: Math.min(count, maxStackSize) };
            this.startFermentation();
            return swapped;
        }
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
        return this.inputSlot !== null && this.fermentationStartTime !== null;
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
            outputSlot: this.outputSlot,
            fermentationStartTime: this.fermentationStartTime,
            fermentationTime: this.fermentationTime,
            maxStackSize: this.maxStackSize
        };
    }

    static deserialize(data) {
        const barrel = new Barrel(data.x, data.y, data.itemId);
        barrel.inputSlot = data.inputSlot || null;
        barrel.outputSlot = data.outputSlot || null;
        barrel.fermentationStartTime = data.fermentationStartTime || null;
        barrel.fermentationTime = data.fermentationTime || null;
        barrel.maxStackSize = data.maxStackSize || 5;
        return barrel;
    }
}
