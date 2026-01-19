import { GameConfig } from '../config/GameConfig.js';
import { WorldGenerator } from './WorldGenerator.js';

export class ChunkManager {
    constructor(seed) {
        this.chunks = new Map();
        this.generator = new WorldGenerator(seed);
        this.seed = seed;
    }

    getChunkKey(chunkX, chunkY) {
        return `${chunkX},${chunkY}`;
    }

    getChunk(chunkX, chunkY) {
        return this.chunks.get(this.getChunkKey(chunkX, chunkY));
    }

    hasChunk(chunkX, chunkY) {
        return this.chunks.has(this.getChunkKey(chunkX, chunkY));
    }

    generateChunk(chunkX, chunkY, incomingBoundaries = null) {
        if (this.hasChunk(chunkX, chunkY)) {
            return this.getChunk(chunkX, chunkY);
        }

        const chunkData = this.generator.generateChunk(chunkX, chunkY, incomingBoundaries);

        const chunk = {
            x: chunkX,
            y: chunkY,
            tiles: chunkData.tiles,
            edgeBoundaries: chunkData.edgeBoundaries
        };

        this.chunks.set(this.getChunkKey(chunkX, chunkY), chunk);

        return chunk;
    }

    expandChunk(chunkX, chunkY, direction) {
        const chunk = this.getChunk(chunkX, chunkY);
        if (!chunk) {
            console.error(`Cannot expand: chunk (${chunkX}, ${chunkY}) not found`);
            return null;
        }

        let newChunkX, newChunkY, incomingBoundaries;

        if (direction === 'north') {
            newChunkX = chunkX;
            newChunkY = chunkY - 1;
            incomingBoundaries = { south: chunk.edgeBoundaries.north };
        } else if (direction === 'south') {
            newChunkX = chunkX;
            newChunkY = chunkY + 1;
            incomingBoundaries = { north: chunk.edgeBoundaries.south };
        } else if (direction === 'east') {
            newChunkX = chunkX + 1;
            newChunkY = chunkY;
            incomingBoundaries = { west: chunk.edgeBoundaries.east };
        } else if (direction === 'west') {
            newChunkX = chunkX - 1;
            newChunkY = chunkY;
            incomingBoundaries = { east: chunk.edgeBoundaries.west };
        }

        const newChunk = this.generateChunk(newChunkX, newChunkY, incomingBoundaries);
        return newChunk;
    }

    expandWorld(direction, currentChunks) {
        const newChunks = [];

        if (direction === 'north') {
            const minY = Math.min(...currentChunks.map(c => c.y));
            const chunksAtEdge = currentChunks.filter(c => c.y === minY);

            for (const chunk of chunksAtEdge) {
                const incomingBoundaries = {
                    south: chunk.edgeBoundaries.north
                };
                const newChunk = this.generateChunk(chunk.x, chunk.y - 1, incomingBoundaries);
                newChunks.push(newChunk);
            }
        } else if (direction === 'south') {
            const maxY = Math.max(...currentChunks.map(c => c.y));
            const chunksAtEdge = currentChunks.filter(c => c.y === maxY);

            for (const chunk of chunksAtEdge) {
                const incomingBoundaries = {
                    north: chunk.edgeBoundaries.south
                };
                const newChunk = this.generateChunk(chunk.x, chunk.y + 1, incomingBoundaries);
                newChunks.push(newChunk);
            }
        } else if (direction === 'east') {
            const maxX = Math.max(...currentChunks.map(c => c.x));
            const chunksAtEdge = currentChunks.filter(c => c.x === maxX);

            for (const chunk of chunksAtEdge) {
                const incomingBoundaries = {
                    west: chunk.edgeBoundaries.east
                };
                const newChunk = this.generateChunk(chunk.x + 1, chunk.y, incomingBoundaries);
                newChunks.push(newChunk);
            }
        } else if (direction === 'west') {
            const minX = Math.min(...currentChunks.map(c => c.x));
            const chunksAtEdge = currentChunks.filter(c => c.x === minX);

            for (const chunk of chunksAtEdge) {
                const incomingBoundaries = {
                    east: chunk.edgeBoundaries.west
                };
                const newChunk = this.generateChunk(chunk.x - 1, chunk.y, incomingBoundaries);
                newChunks.push(newChunk);
            }
        }

        return newChunks;
    }

    getAllChunks() {
        return Array.from(this.chunks.values());
    }

    getWorldBounds() {
        const chunks = this.getAllChunks();
        if (chunks.length === 0) {
            return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        }

        const chunkSize = GameConfig.WORLD.INITIAL_CHUNK_SIZE;
        const chunkXs = chunks.map(c => c.x);
        const chunkYs = chunks.map(c => c.y);

        return {
            minX: Math.min(...chunkXs) * chunkSize,
            maxX: (Math.max(...chunkXs) + 1) * chunkSize - 1,
            minY: Math.min(...chunkYs) * chunkSize,
            maxY: (Math.max(...chunkYs) + 1) * chunkSize - 1
        };
    }

    serialize() {
        const chunks = this.getAllChunks();
        return {
            seed: this.seed,
            chunks: chunks.map(chunk => ({
                x: chunk.x,
                y: chunk.y,
                tiles: this.generator.compressTiles(chunk.tiles),
                edgeBoundaries: chunk.edgeBoundaries
            }))
        };
    }

    deserialize(data) {
        this.seed = data.seed;
        this.generator = new WorldGenerator(data.seed);
        this.chunks.clear();

        for (const chunkData of data.chunks) {
            const chunk = {
                x: chunkData.x,
                y: chunkData.y,
                tiles: this.generator.decompressTiles(
                    chunkData.tiles,
                    GameConfig.WORLD.INITIAL_CHUNK_SIZE
                ),
                edgeBoundaries: chunkData.edgeBoundaries
            };

            this.chunks.set(this.getChunkKey(chunk.x, chunk.y), chunk);
        }
    }
}
