import { Tile } from './Tile.js';
import { GameConfig } from '../config/GameConfig.js';

export class TileMap {
    constructor() {
        this.tiles = new Map();
        this.bounds = {
            minX: 0,
            maxX: 0,
            minY: 0,
            maxY: 0
        };
    }

    getTileKey(x, y) {
        return `${x},${y}`;
    }

    getTile(x, y) {
        return this.tiles.get(this.getTileKey(x, y));
    }

    setTile(x, y, type) {
        const key = this.getTileKey(x, y);
        const tile = new Tile(x, y, type);
        this.tiles.set(key, tile);

        this.updateBounds(x, y);

        return tile;
    }

    updateBounds(x, y) {
        if (this.tiles.size === 1) {
            this.bounds.minX = this.bounds.maxX = x;
            this.bounds.minY = this.bounds.maxY = y;
        } else {
            this.bounds.minX = Math.min(this.bounds.minX, x);
            this.bounds.maxX = Math.max(this.bounds.maxX, x);
            this.bounds.minY = Math.min(this.bounds.minY, y);
            this.bounds.maxY = Math.max(this.bounds.maxY, y);
        }
    }

    getTilesInView(cameraX, cameraY, viewWidth, viewHeight) {
        const tiles = [];
        const tileSize = GameConfig.WORLD.TILE_SIZE;

        const startX = Math.floor(cameraX / tileSize);
        const startY = Math.floor(cameraY / tileSize);
        const endX = Math.ceil((cameraX + viewWidth) / tileSize);
        const endY = Math.ceil((cameraY + viewHeight) / tileSize);

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const tile = this.getTile(x, y);
                if (tile) {
                    tiles.push(tile);
                }
            }
        }

        return tiles;
    }

    getAllTiles() {
        return Array.from(this.tiles.values());
    }

    clear() {
        this.tiles.clear();
        this.bounds = {
            minX: 0,
            maxX: 0,
            minY: 0,
            maxY: 0
        };
    }

    getBounds() {
        return { ...this.bounds };
    }

    getWorldSize() {
        return {
            width: this.bounds.maxX - this.bounds.minX + 1,
            height: this.bounds.maxY - this.bounds.minY + 1
        };
    }
}
