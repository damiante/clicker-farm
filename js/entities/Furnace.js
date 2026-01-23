import { Entity } from './Entity.js';
import { GameConfig } from '../config/GameConfig.js';

export class Furnace extends Entity {
    constructor(x, y, itemId) {
        super(x, y, 'furnace');
        this.itemId = itemId;
        this.smeltSlot = null;  // Top input: {itemId, count} - Smeltable items
        this.fuelSlot = null;   // Bottom input: {itemId, count} - Fuel items
        this.outputSlot = null; // Output: {itemId, count} - Smelted items
        this.smeltingStartTime = null;  // Timestamp when smelting started
        this.smeltingTime = null;  // Time in seconds for current recipe
        this.maxStackSize = 5;  // Default
        this.isActive = false;  // Whether furnace is actively smelting
    }

    update(deltaTime) {
        // Check if smelting should complete
        if (this.isActive && this.smeltingStartTime) {
            const progress = this.getSmeltingProgress();

            // If smelting is complete, try to produce item
            if (progress >= 1.0) {
                this.completeSmelting();
            }
        }

        // If not active but have both inputs, start smelting
        if (!this.isActive && this.canStartSmelting()) {
            this.startSmelting();
        }
    }

    canStartSmelting() {
        // Need at least 1 smeltable item and 1 fuel item
        if (!this.smeltSlot || this.smeltSlot.count === 0) {
            return false;
        }
        if (!this.fuelSlot || this.fuelSlot.count === 0) {
            return false;
        }

        // Check if smeltable item has a recipe
        const recipe = GameConfig.SMELTING.RECIPES[this.smeltSlot.itemId];
        if (!recipe) {
            return false;
        }

        // Check if fuel is valid
        if (!GameConfig.SMELTING.FUEL_ITEMS.includes(this.fuelSlot.itemId)) {
            return false;
        }

        // Check if output slot can accept the result
        const outputItemId = recipe.output;
        if (this.outputSlot) {
            // Output slot has items - check if same type and not full
            if (this.outputSlot.itemId !== outputItemId) {
                return false; // Different item in output
            }
            if (this.outputSlot.count >= this.maxStackSize) {
                return false; // Output full
            }
        }

        return true;
    }

    startSmelting() {
        if (!this.canStartSmelting()) {
            return;
        }

        // Get the smeltable item ID before consuming
        const smeltItemId = this.smeltSlot.itemId;

        // Consume one item from each input slot
        this.smeltSlot.count--;
        if (this.smeltSlot.count === 0) {
            this.smeltSlot = null;
        }

        this.fuelSlot.count--;
        if (this.fuelSlot.count === 0) {
            this.fuelSlot = null;
        }

        // Get recipe to determine smelting time
        const recipe = GameConfig.SMELTING.RECIPES[smeltItemId];
        if (recipe) {
            this.smeltingTime = recipe.time;
            this.smeltingStartTime = Date.now();
            this.isActive = true;
            this.activeSmeltItemId = smeltItemId;
        }
    }

    getSmeltingProgress() {
        if (!this.isActive || !this.smeltingStartTime || !this.smeltingTime) {
            return 0;
        }

        const elapsed = (Date.now() - this.smeltingStartTime) / 1000; // Convert to seconds
        const progress = elapsed / this.smeltingTime;
        return Math.min(progress, 1.0);
    }

    completeSmelting() {
        if (!this.activeSmeltItemId) {
            return;
        }

        // Get the output item based on recipe
        const recipe = GameConfig.SMELTING.RECIPES[this.activeSmeltItemId];
        if (!recipe) {
            console.warn(`No smelting recipe for ${this.activeSmeltItemId}`);
            this.isActive = false;
            return;
        }

        const outputItemId = recipe.output;

        // Add to output slot
        if (!this.outputSlot) {
            this.outputSlot = { itemId: outputItemId, count: 1 };
        } else if (this.outputSlot.itemId === outputItemId && this.outputSlot.count < this.maxStackSize) {
            this.outputSlot.count++;
        } else {
            // Can't complete - output blocked
            // This shouldn't happen since we check before starting
            return;
        }

        // Clear active smelting
        this.isActive = false;
        this.activeSmeltItemId = null;
        this.smeltingStartTime = null;
        this.smeltingTime = null;

        // Next smelting will be started by update() if inputs are available
    }

    placeInSmeltSlot(itemId, count, maxStackSize) {
        this.maxStackSize = maxStackSize;

        if (!this.smeltSlot) {
            const placed = Math.min(count, maxStackSize);
            this.smeltSlot = { itemId, count: placed };
            const remaining = count - placed;
            return remaining > 0 ? { overflow: { itemId, count: remaining } } : null;
        } else if (this.smeltSlot.itemId === itemId) {
            const spaceLeft = maxStackSize - this.smeltSlot.count;
            const toAdd = Math.min(count, spaceLeft);
            this.smeltSlot.count += toAdd;
            const remaining = count - toAdd;
            return remaining > 0 ? { overflow: { itemId, count: remaining } } : null;
        } else {
            // Different item, swap
            const swapped = { itemId: this.smeltSlot.itemId, count: this.smeltSlot.count };
            const placed = Math.min(count, maxStackSize);
            this.smeltSlot = { itemId, count: placed };

            const overflow = count - placed;
            const result = { swapped };
            if (overflow > 0) {
                result.overflow = { itemId, count: overflow };
            }
            return result;
        }
    }

    placeInFuelSlot(itemId, count, maxStackSize) {
        this.maxStackSize = maxStackSize;

        if (!this.fuelSlot) {
            const placed = Math.min(count, maxStackSize);
            this.fuelSlot = { itemId, count: placed };
            const remaining = count - placed;
            return remaining > 0 ? { overflow: { itemId, count: remaining } } : null;
        } else if (this.fuelSlot.itemId === itemId) {
            const spaceLeft = maxStackSize - this.fuelSlot.count;
            const toAdd = Math.min(count, spaceLeft);
            this.fuelSlot.count += toAdd;
            const remaining = count - toAdd;
            return remaining > 0 ? { overflow: { itemId, count: remaining } } : null;
        } else {
            // Different item, swap
            const swapped = { itemId: this.fuelSlot.itemId, count: this.fuelSlot.count };
            const placed = Math.min(count, maxStackSize);
            this.fuelSlot = { itemId, count: placed };

            const overflow = count - placed;
            const result = { swapped };
            if (overflow > 0) {
                result.overflow = { itemId, count: overflow };
            }
            return result;
        }
    }

    takeFromSmeltSlot() {
        if (!this.smeltSlot) {
            return null;
        }

        const taken = { ...this.smeltSlot };
        this.smeltSlot = null;
        return taken;
    }

    takeFromFuelSlot() {
        if (!this.fuelSlot) {
            return null;
        }

        const taken = { ...this.fuelSlot };
        this.fuelSlot = null;
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

    canPickup() {
        // Can't pickup if furnace has items or is smelting
        return !this.smeltSlot && !this.fuelSlot && !this.outputSlot && !this.isActive;
    }

    isSmelting() {
        return this.isActive;
    }

    getOverlayIcons() {
        const overlays = [];

        // Smelt slot overlay (top left)
        if (this.smeltSlot && this.smeltSlot.itemId) {
            overlays.push({
                itemId: this.smeltSlot.itemId,
                offsetX: 0.1,
                offsetY: 0.1,
                scale: 0.33
            });
        }

        // Fuel slot overlay (bottom left)
        if (this.fuelSlot && this.fuelSlot.itemId) {
            overlays.push({
                itemId: this.fuelSlot.itemId,
                offsetX: 0.1,
                offsetY: 0.57,
                scale: 0.33
            });
        }

        // Output slot overlay (right side)
        if (this.outputSlot && this.outputSlot.itemId) {
            overlays.push({
                itemId: this.outputSlot.itemId,
                offsetX: 0.57,
                offsetY: 0.33,
                scale: 0.33
            });
        }

        return overlays.length > 0 ? overlays : null;
    }

    render(ctx, cameraX, cameraY, tileSize, assetLoader) {
        // Calculate screen position (ctx is already scaled by zoom)
        const screenX = Math.floor(this.x * tileSize - cameraX);
        const screenY = Math.floor(this.y * tileSize - cameraY);

        // Use active/inactive image based on smelting state
        const imageName = this.isActive ? 'furnace-on.png' : 'furnace-off.png';
        const image = assetLoader.getAsset(imageName);

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
            ctx.fillStyle = this.isActive ? '#ff6600' : '#666666';
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
            ctx.restore();
        }
    }

    serialize() {
        return {
            ...super.serialize(),
            itemId: this.itemId,
            smeltSlot: this.smeltSlot,
            fuelSlot: this.fuelSlot,
            outputSlot: this.outputSlot,
            smeltingStartTime: this.smeltingStartTime,
            smeltingTime: this.smeltingTime,
            maxStackSize: this.maxStackSize,
            isActive: this.isActive,
            activeSmeltItemId: this.activeSmeltItemId
        };
    }

    static deserialize(data) {
        const furnace = new Furnace(data.x, data.y, data.itemId);
        furnace.smeltSlot = data.smeltSlot || null;
        furnace.fuelSlot = data.fuelSlot || null;
        furnace.outputSlot = data.outputSlot || null;
        furnace.smeltingStartTime = data.smeltingStartTime || null;
        furnace.smeltingTime = data.smeltingTime || null;
        furnace.maxStackSize = data.maxStackSize || 5;
        furnace.isActive = data.isActive || false;
        furnace.activeSmeltItemId = data.activeSmeltItemId || null;
        return furnace;
    }
}
