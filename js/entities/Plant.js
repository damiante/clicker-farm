import { Entity } from './Entity.js';
import { GameConfig } from '../config/GameConfig.js';

export class Plant extends Entity {
    constructor(x, y, itemId, targetItemId, sproutTime, maturityTime) {
        super(x, y, 'plant');

        this.itemId = itemId;              // Current appearance (seed, seedling, or mature)
        this.targetItemId = targetItemId;  // What it becomes when mature
        this.growthStage = 'seed';         // 'seed', 'seedling', or 'mature'
        this.plantedAt = Date.now();       // Timestamp when planted
        this.sproutTime = sproutTime * 1000;   // Convert seconds to milliseconds
        this.maturityTime = maturityTime * 1000;
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

        // Apply item-specific overworld scale (defaults to 1.0)
        const scale = item.overworldScale !== undefined ? item.overworldScale : GameConfig.ENTITIES.DEFAULT_OVERWORLD_SCALE;
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

    canHarvest() {
        return this.growthStage === 'mature';
    }

    harvest() {
        // Returns the item ID to add to inventory
        return this.targetItemId;
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
            itemId: this.itemId,
            targetItemId: this.targetItemId,
            growthStage: this.growthStage,
            plantedAt: this.plantedAt,
            sproutTime: this.sproutTime,
            maturityTime: this.maturityTime
        };
    }

    static deserialize(data, itemRegistry) {
        const plant = new Plant(
            data.x,
            data.y,
            data.itemId,
            data.targetItemId,
            data.sproutTime / 1000,  // Convert back to seconds
            data.maturityTime / 1000
        );
        plant.growthStage = data.growthStage;
        plant.plantedAt = data.plantedAt;
        return plant;
    }
}
