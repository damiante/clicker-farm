import { Entity } from './Entity.js';
import { GameConfig } from '../config/GameConfig.js';

export class Fence extends Entity {
    constructor(x, y, itemId) {
        super(x, y, 'fence');
        this.itemId = itemId;
        this.orientation = 'horizontal'; // Default orientation
    }

    update(deltaTime) {
        // Fences don't need updates
    }

    updateOrientation(game) {
        // Check neighbors to determine orientation
        const tileX = Math.floor(this.x);
        const tileY = Math.floor(this.y);

        const hasNorthFence = game.entities.some(e =>
            e.type === 'fence' && Math.floor(e.x) === tileX && Math.floor(e.y) === tileY - 1
        );
        const hasSouthFence = game.entities.some(e =>
            e.type === 'fence' && Math.floor(e.x) === tileX && Math.floor(e.y) === tileY + 1
        );

        // If has neighbors to North or South, use vertical orientation
        if (hasNorthFence || hasSouthFence) {
            this.orientation = 'vertical';
        } else {
            this.orientation = 'horizontal';
        }
    }

    render(ctx, cameraX, cameraY, tileSize, assetLoader) {
        // Calculate screen position (ctx is already scaled by zoom)
        const screenX = Math.floor(this.x * tileSize - cameraX);
        const screenY = Math.floor(this.y * tileSize - cameraY);

        // Determine which image to use based on orientation
        const imageName = this.orientation === 'vertical' ? 'fence-vertical.png' : 'fence-horizontal.png';
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
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
            ctx.restore();
        }
    }

    serialize() {
        return {
            ...super.serialize(),
            itemId: this.itemId,
            orientation: this.orientation
        };
    }

    static deserialize(data) {
        const fence = new Fence(data.x, data.y, data.itemId);
        fence.orientation = data.orientation || 'horizontal';
        return fence;
    }
}
