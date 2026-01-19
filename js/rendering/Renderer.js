import { GameConfig } from '../config/GameConfig.js';

export class Renderer {
    constructor(canvas, assetLoader) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.assetLoader = assetLoader;
        this.camera = {
            x: 0,
            y: 0
        };
        this.zoom = 1.0;
        this.minZoom = 0.25;
        this.maxZoom = 4.0;

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setCamera(x, y) {
        this.camera.x = x;
        this.camera.y = y;
    }

    pan(deltaX, deltaY) {
        this.camera.x -= deltaX / this.zoom;
        this.camera.y -= deltaY / this.zoom;
    }

    centerCameraOn(worldX, worldY) {
        const tileSize = GameConfig.WORLD.TILE_SIZE;
        this.camera.x = worldX * tileSize - this.canvas.width / (2 * this.zoom);
        this.camera.y = worldY * tileSize - this.canvas.height / (2 * this.zoom);
    }

    setZoom(newZoom, centerX, centerY) {
        const oldZoom = this.zoom;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));

        if (centerX !== undefined && centerY !== undefined) {
            const worldPosBeforeX = (centerX / oldZoom) + this.camera.x;
            const worldPosBeforeY = (centerY / oldZoom) + this.camera.y;

            const worldPosAfterX = (centerX / this.zoom) + this.camera.x;
            const worldPosAfterY = (centerY / this.zoom) + this.camera.y;

            this.camera.x += (worldPosBeforeX - worldPosAfterX);
            this.camera.y += (worldPosBeforeY - worldPosAfterY);
        }
    }

    getZoom() {
        return this.zoom;
    }

    clear() {
        this.ctx.fillStyle = GameConfig.RENDERING.BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderWorld(chunkManager) {
        this.clear();

        this.ctx.save();
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.scale(this.zoom, this.zoom);

        const chunks = chunkManager.getAllChunks();
        const tileSize = GameConfig.WORLD.TILE_SIZE;
        const chunkSize = GameConfig.WORLD.INITIAL_CHUNK_SIZE;

        const visibleStartX = Math.floor(this.camera.x / tileSize) - 1;
        const visibleStartY = Math.floor(this.camera.y / tileSize) - 1;
        const visibleEndX = Math.ceil((this.camera.x + this.canvas.width / this.zoom) / tileSize) + 1;
        const visibleEndY = Math.ceil((this.camera.y + this.canvas.height / this.zoom) / tileSize) + 1;

        for (const chunk of chunks) {
            const chunkWorldX = chunk.x * chunkSize;
            const chunkWorldY = chunk.y * chunkSize;

            for (let y = 0; y < chunk.tiles.length; y++) {
                for (let x = 0; x < chunk.tiles[y].length; x++) {
                    const worldX = chunkWorldX + x;
                    const worldY = chunkWorldY + y;

                    if (worldX >= visibleStartX && worldX <= visibleEndX &&
                        worldY >= visibleStartY && worldY <= visibleEndY) {
                        const tileType = chunk.tiles[y][x];
                        this.renderTile(tileType, worldX, worldY);
                    }
                }
            }
        }

        this.ctx.restore();
    }

    renderTile(tileType, worldX, worldY) {
        const tileSize = GameConfig.WORLD.TILE_SIZE;
        const screenX = Math.floor(worldX * tileSize - this.camera.x);
        const screenY = Math.floor(worldY * tileSize - this.camera.y);

        const image = this.assetLoader.getImage(tileType);
        if (image) {
            this.ctx.drawImage(image, screenX, screenY, tileSize + 1, tileSize + 1);
        } else {
            this.ctx.fillStyle = tileType === 'water' ? '#4A90E2' : '#2ECC71';
            this.ctx.fillRect(screenX, screenY, tileSize + 1, tileSize + 1);
        }
    }

    renderExpansionButtons(chunkManager, onExpand) {
        const chunks = chunkManager.getAllChunks();
        const tileSize = GameConfig.WORLD.TILE_SIZE;
        const chunkSize = GameConfig.WORLD.INITIAL_CHUNK_SIZE;

        const buttons = [];

        for (const chunk of chunks) {
            const chunkWorldX = chunk.x * chunkSize;
            const chunkWorldY = chunk.y * chunkSize;

            // Check if this chunk has exposed edges (no adjacent chunk)
            const hasNorth = !chunkManager.hasChunk(chunk.x, chunk.y - 1);
            const hasSouth = !chunkManager.hasChunk(chunk.x, chunk.y + 1);
            const hasEast = !chunkManager.hasChunk(chunk.x + 1, chunk.y);
            const hasWest = !chunkManager.hasChunk(chunk.x - 1, chunk.y);

            // North edge button
            if (hasNorth) {
                const centerX = chunkWorldX + chunkSize / 2;
                const edgeY = chunkWorldY;
                const screenPos = this.worldToScreen(centerX, edgeY);

                if (screenPos.y > -100 && screenPos.y < this.canvas.height) {
                    buttons.push({
                        direction: 'north',
                        chunkX: chunk.x,
                        chunkY: chunk.y,
                        x: screenPos.x,
                        y: Math.max(60, screenPos.y - 30),
                        label: '⬆'
                    });
                }
            }

            // South edge button
            if (hasSouth) {
                const centerX = chunkWorldX + chunkSize / 2;
                const edgeY = chunkWorldY + chunkSize;
                const screenPos = this.worldToScreen(centerX, edgeY);

                if (screenPos.y > 0 && screenPos.y < this.canvas.height + 100) {
                    buttons.push({
                        direction: 'south',
                        chunkX: chunk.x,
                        chunkY: chunk.y,
                        x: screenPos.x,
                        y: Math.min(this.canvas.height - 60, screenPos.y + 30),
                        label: '⬇'
                    });
                }
            }

            // East edge button
            if (hasEast) {
                const edgeX = chunkWorldX + chunkSize;
                const centerY = chunkWorldY + chunkSize / 2;
                const screenPos = this.worldToScreen(edgeX, centerY);

                if (screenPos.x > 0 && screenPos.x < this.canvas.width + 100) {
                    buttons.push({
                        direction: 'east',
                        chunkX: chunk.x,
                        chunkY: chunk.y,
                        x: Math.min(this.canvas.width - 60, screenPos.x + 30),
                        y: screenPos.y,
                        label: '➡'
                    });
                }
            }

            // West edge button
            if (hasWest) {
                const edgeX = chunkWorldX;
                const centerY = chunkWorldY + chunkSize / 2;
                const screenPos = this.worldToScreen(edgeX, centerY);

                if (screenPos.x > -100 && screenPos.x < this.canvas.width) {
                    buttons.push({
                        direction: 'west',
                        chunkX: chunk.x,
                        chunkY: chunk.y,
                        x: Math.max(60, screenPos.x - 30),
                        y: screenPos.y,
                        label: '⬅'
                    });
                }
            }
        }

        return buttons;
    }

    worldToScreen(worldX, worldY) {
        const tileSize = GameConfig.WORLD.TILE_SIZE;
        return {
            x: (worldX * tileSize - this.camera.x) * this.zoom,
            y: (worldY * tileSize - this.camera.y) * this.zoom
        };
    }

    screenToWorld(screenX, screenY) {
        const tileSize = GameConfig.WORLD.TILE_SIZE;
        return {
            x: Math.floor((screenX / this.zoom + this.camera.x) / tileSize),
            y: Math.floor((screenY / this.zoom + this.camera.y) / tileSize)
        };
    }

    getCamera() {
        return { ...this.camera };
    }
}
