import { Entity } from './Entity.js';
import { GameConfig } from '../config/GameConfig.js';

export class Plant extends Entity {
    constructor(x, y, itemId, targetItemId, sproutTime, maturityTime) {
        super(x, y, 'plant');

        this.seedItemId = itemId;          // Original seed item (for seedling scale lookup)
        this.itemId = itemId;              // Current appearance (seed, seedling, or mature)
        this.targetItemId = targetItemId;  // What it becomes when mature
        this.growthStage = 'seed';         // 'seed', 'seedling', or 'mature'
        this.plantedAt = Date.now();       // Timestamp when planted
        this.sproutTime = sproutTime * 1000;   // Convert seconds to milliseconds
        this.maturityTime = maturityTime * 1000;

        // Fruiting plant properties
        this.fruitSlot = null;            // {itemId, count} or null - stores generated fruits
        this.nextFruitTime = null;        // Timestamp when next fruit will be generated
    }

    update(deltaTime) {
        const now = Date.now();
        const elapsed = now - this.plantedAt;

        // Transition from seed to seedling
        if (this.growthStage === 'seed' && elapsed >= this.sproutTime) {
            this.growthStage = 'seedling';
            this.itemId = 'seedling';  // Generic seedling emoji
        }
        // Transition from seedling to mature
        else if (this.growthStage === 'seedling' &&
                 elapsed >= this.sproutTime + this.maturityTime) {
            this.growthStage = 'mature';
            this.itemId = this.targetItemId;

            // If this is a fruiting plant, start the fruit generation timer
            const fruitingConfig = GameConfig.FRUITING.PLANTS[this.targetItemId];
            if (fruitingConfig) {
                this.scheduleNextFruit(fruitingConfig);
            }
        }

        // Handle fruit generation for mature fruiting plants
        if (this.growthStage === 'mature') {
            const fruitingConfig = GameConfig.FRUITING.PLANTS[this.targetItemId];
            if (fruitingConfig) {
                const currentCount = this.fruitSlot ? this.fruitSlot.count : 0;

                // Start timer if we don't have one and we're below max
                if (currentCount < fruitingConfig.maxFruits && !this.nextFruitTime) {
                    this.scheduleNextFruit(fruitingConfig);
                }

                // Generate fruit if below max capacity and timer has expired
                if (currentCount < fruitingConfig.maxFruits && this.nextFruitTime && now >= this.nextFruitTime) {
                    this.generateFruit(fruitingConfig);
                }
            }
        }
    }

    scheduleNextFruit(fruitingConfig) {
        // Calculate random time for next fruit (baseTime to baseTime + timeVariance)
        const variance = Math.random() * fruitingConfig.timeVariance; // 0 to +timeVariance
        const nextFruitDelay = (fruitingConfig.baseTime + variance) * 1000; // Convert to ms
        this.nextFruitTime = Date.now() + nextFruitDelay;
    }

    generateFruit(fruitingConfig) {
        // Check if we can add more fruit
        const currentCount = this.fruitSlot ? this.fruitSlot.count : 0;
        if (currentCount >= fruitingConfig.maxFruits) {
            // Can't add more fruit, don't reschedule
            this.nextFruitTime = null;
            return;
        }

        // Add fruit
        if (!this.fruitSlot) {
            this.fruitSlot = { itemId: fruitingConfig.fruitItemId, count: 1 };
        } else {
            this.fruitSlot.count++;
        }

        // Schedule next fruit if we haven't reached max
        if (this.fruitSlot.count < fruitingConfig.maxFruits) {
            this.scheduleNextFruit(fruitingConfig);
        } else {
            this.nextFruitTime = null;
        }
    }

    render(ctx, cameraX, cameraY, tileSize, itemRegistry) {
        const item = itemRegistry.getItem(this.itemId);
        if (!item) {
            console.warn(`Plant: Cannot find item ${this.itemId}`);
            return;
        }

        // Calculate screen position same way as tiles (no zoom multiplication - ctx is already scaled)
        const screenX = Math.floor(this.x * tileSize - cameraX);
        const screenY = Math.floor(this.y * tileSize - cameraY);

        // Determine scale based on growth stage
        let scale;
        if (this.growthStage === 'seedling') {
            // Use seedlingScale from the original seed item
            const seedItem = itemRegistry.getItem(this.seedItemId);
            scale = seedItem && seedItem.seedlingScale !== undefined
                ? seedItem.seedlingScale
                : GameConfig.ENTITIES.DEFAULT_OVERWORLD_SCALE;
        } else {
            // Use overworldScale from current item (seed or mature plant)
            scale = item.overworldScale !== undefined
                ? item.overworldScale
                : GameConfig.ENTITIES.DEFAULT_OVERWORLD_SCALE;
        }

        const fontSize = Math.floor(GameConfig.ENTITIES.RENDER_EMOJI_FONT_SIZE * scale);

        // Render emoji centered on tile
        ctx.save();
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            item.emoji,
            screenX + (tileSize / 2),
            screenY + (tileSize / 2)
        );
        ctx.restore();
    }

    getOverlayIcons() {
        // Return fruit overlay icons for fruiting plants
        if (!this.fruitSlot || !this.fruitSlot.count) {
            return null;
        }

        const fruitingConfig = GameConfig.FRUITING.PLANTS[this.targetItemId];
        if (!fruitingConfig) {
            return null;
        }

        const overlays = [];
        const fruitCount = this.fruitSlot.count;

        // Show fruits using configured positions (up to the number of fruits we have)
        for (let i = 0; i < fruitCount && i < fruitingConfig.positions.length; i++) {
            const position = fruitingConfig.positions[i];
            overlays.push({
                itemId: this.fruitSlot.itemId,
                offsetX: position.offsetX,
                offsetY: position.offsetY,
                scale: position.scale
            });
        }

        return overlays.length > 0 ? overlays : null;
    }

    takeFruit() {
        // Take all fruits from the fruit slot
        if (!this.fruitSlot) {
            return null;
        }

        const taken = { ...this.fruitSlot };
        this.fruitSlot = null;

        // Clear the timer - update() will schedule a new one on next frame
        // This ensures at least baseTime delay before next fruit
        this.nextFruitTime = null;

        return taken;
    }

    isFruitingPlant() {
        return GameConfig.FRUITING.PLANTS[this.targetItemId] !== undefined;
    }

    hasFruit() {
        return this.fruitSlot !== null && this.fruitSlot.count > 0;
    }

    canHarvest() {
        return this.growthStage === 'mature';
    }

    harvest(itemRegistry) {
        // Returns the item ID to add to inventory
        const targetItem = itemRegistry.getItem(this.targetItemId);

        // If it's a tree, return wood instead
        if (targetItem && targetItem.plantType === 'tree') {
            return 'wood';
        }

        // Otherwise return the plant itself (flowers)
        return this.targetItemId;
    }

    requiresTool(itemRegistry) {
        // Check if this plant requires a tool to harvest
        const targetItem = itemRegistry.getItem(this.targetItemId);
        return targetItem && targetItem.plantType === 'tree';
    }

    getRequiredTool(itemRegistry) {
        // Returns the tool ID required to harvest this plant, or null
        const targetItem = itemRegistry.getItem(this.targetItemId);
        if (targetItem && targetItem.plantType === 'tree') {
            return 'axe';
        }
        return null;
    }

    getGrowthDescription(itemRegistry) {
        const targetItem = itemRegistry.getItem(this.targetItemId);
        const targetName = targetItem ? targetItem.name : 'unknown';

        switch (this.growthStage) {
            case 'seed':
                return 'Just planted';
            case 'seedling':
                return `Growing into ${targetName}...`;
            case 'mature':
                return 'Ready to harvest!';
            default:
                return 'Unknown stage';
        }
    }

    serialize() {
        return {
            ...super.serialize(),
            seedItemId: this.seedItemId,
            itemId: this.itemId,
            targetItemId: this.targetItemId,
            growthStage: this.growthStage,
            plantedAt: this.plantedAt,
            sproutTime: this.sproutTime,
            maturityTime: this.maturityTime,
            fruitSlot: this.fruitSlot,
            nextFruitTime: this.nextFruitTime
        };
    }

    static deserialize(data, itemRegistry) {
        const plant = new Plant(
            data.x,
            data.y,
            data.seedItemId || data.itemId,  // Support old saves without seedItemId
            data.targetItemId,
            data.sproutTime / 1000,  // Convert back to seconds
            data.maturityTime / 1000
        );
        plant.itemId = data.itemId;
        plant.growthStage = data.growthStage;
        plant.plantedAt = data.plantedAt;
        plant.fruitSlot = data.fruitSlot || null;
        plant.nextFruitTime = data.nextFruitTime || null;
        return plant;
    }
}
