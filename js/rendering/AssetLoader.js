import { GameConfig } from '../config/GameConfig.js';

export class AssetLoader {
    constructor() {
        this.images = new Map();
        this.loadedCount = 0;
        this.totalCount = 0;
    }

    async loadImage(id, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images.set(id, img);
                this.loadedCount++;
                resolve(img);
            };
            img.onerror = () => {
                reject(new Error(`Failed to load image: ${path}`));
            };
            img.src = path;
        });
    }

    async preloadAll() {
        const tileAssets = Object.values(GameConfig.TILES);

        // Add structure images to preload list
        const additionalAssets = [
            { id: 'fence-horizontal.png', asset: './assets/fence-horizontal.png' },
            { id: 'fence-vertical.png', asset: './assets/fence-vertical.png' },
            { id: 'barrel.png', asset: './assets/barrel.png' }
        ];

        this.totalCount = tileAssets.length + additionalAssets.length;
        this.loadedCount = 0;

        const loadPromises = [
            ...tileAssets.map(tile => this.loadImage(tile.id, tile.asset)),
            ...additionalAssets.map(asset => this.loadImage(asset.id, asset.asset))
        ];

        try {
            await Promise.all(loadPromises);
            console.log(`Loaded ${this.loadedCount} assets successfully`);
        } catch (error) {
            console.error('Asset loading failed:', error);
            throw error;
        }
    }

    getAsset(id) {
        // Alias for getImage to support both tiles and other assets
        return this.getImage(id);
    }

    getImage(id) {
        const img = this.images.get(id);
        if (!img) {
            console.warn(`Image not found: ${id}`);
        }
        return img;
    }

    getLoadProgress() {
        return this.totalCount > 0 ? this.loadedCount / this.totalCount : 0;
    }

    isLoaded() {
        return this.loadedCount === this.totalCount && this.totalCount > 0;
    }
}
