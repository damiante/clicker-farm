import { GameConfig } from '../config/GameConfig.js';
import { SeededRandom } from '../utils/SeededRandom.js';

export class WorldGenerator {
    constructor(baseSeed) {
        this.baseSeed = baseSeed;
    }

    getChunkSeed(chunkX, chunkY) {
        return this.baseSeed + chunkX * 31 + chunkY * 37;
    }

    generateChunk(chunkX, chunkY, incomingBoundaries = null) {
        const size = GameConfig.WORLD.INITIAL_CHUNK_SIZE;
        const seed = this.getChunkSeed(chunkX, chunkY);
        const rng = new SeededRandom(seed);

        const tiles = this.createEmptyGrid(size, GameConfig.TILES.GRASS.id);

        const edgeBoundaries = {
            north: [],
            south: [],
            east: [],
            west: []
        };

        const activePaths = [];

        if (incomingBoundaries) {
            if (incomingBoundaries.west && incomingBoundaries.west.length > 0) {
                for (const entry of incomingBoundaries.west) {
                    activePaths.push({
                        x: 0,
                        y: entry.y,
                        width: entry.width,
                        dirX: entry.dirX !== undefined ? entry.dirX : 1,
                        dirY: entry.dirY !== undefined ? entry.dirY : 0,
                        segmentSteps: 0
                    });
                }
            }
            if (incomingBoundaries.north && incomingBoundaries.north.length > 0) {
                for (const entry of incomingBoundaries.north) {
                    activePaths.push({
                        x: entry.x,
                        y: 0,
                        width: entry.width,
                        dirX: entry.dirX !== undefined ? entry.dirX : 0,
                        dirY: entry.dirY !== undefined ? entry.dirY : 1,
                        segmentSteps: 0
                    });
                }
            }
            if (incomingBoundaries.east && incomingBoundaries.east.length > 0) {
                for (const entry of incomingBoundaries.east) {
                    activePaths.push({
                        x: size - 1,
                        y: entry.y,
                        width: entry.width,
                        dirX: entry.dirX !== undefined ? entry.dirX : -1,
                        dirY: entry.dirY !== undefined ? entry.dirY : 0,
                        segmentSteps: 0
                    });
                }
            }
            if (incomingBoundaries.south && incomingBoundaries.south.length > 0) {
                for (const entry of incomingBoundaries.south) {
                    activePaths.push({
                        x: entry.x,
                        y: size - 1,
                        width: entry.width,
                        dirX: entry.dirX !== undefined ? entry.dirX : 0,
                        dirY: entry.dirY !== undefined ? entry.dirY : -1,
                        segmentSteps: 0
                    });
                }
            }
        }

        if (activePaths.length === 0) {
            const numSources = rng.nextInt(
                GameConfig.WORLD.RIVER_SOURCES_MIN,
                GameConfig.WORLD.RIVER_SOURCES_MAX
            );

            for (let i = 0; i < numSources; i++) {
                const edge = rng.nextInt(0, 3);
                let x, y, dirX, dirY;

                if (edge === 0) {
                    x = 0;
                    y = rng.nextInt(5, size - 5);
                    dirX = 1;
                    dirY = 0;
                } else if (edge === 1) {
                    x = rng.nextInt(5, size - 5);
                    y = 0;
                    dirX = 0;
                    dirY = 1;
                } else if (edge === 2) {
                    x = size - 1;
                    y = rng.nextInt(5, size - 5);
                    dirX = -1;
                    dirY = 0;
                } else {
                    x = rng.nextInt(5, size - 5);
                    y = size - 1;
                    dirX = 0;
                    dirY = -1;
                }

                activePaths.push({
                    x,
                    y,
                    width: rng.nextInt(GameConfig.WORLD.RIVER_MIN_WIDTH, GameConfig.WORLD.RIVER_MAX_WIDTH),
                    dirX,
                    dirY,
                    segmentSteps: 0
                });
            }
        }

        const maxIterations = size * 10;
        let iterations = 0;

        while (activePaths.length > 0 && iterations < maxIterations) {
            iterations++;
            const path = activePaths.shift();

            const segmentLength = GameConfig.WORLD.RIVER_SEGMENT_LENGTH;

            for (let step = 0; step < segmentLength; step++) {
                this.drawRiverSegment(tiles, size, Math.floor(path.x), Math.floor(path.y), path.width);

                const meander = GameConfig.WORLD.RIVER_MEANDER_AMOUNT;
                const offsetX = (rng.next() - 0.5) * meander;
                const offsetY = (rng.next() - 0.5) * meander;

                path.x += path.dirX + offsetX;
                path.y += path.dirY + offsetY;

                if (path.x < 0 || path.x >= size || path.y < 0 || path.y >= size) {
                    break;
                }
            }

            path.segmentSteps++;

            if (path.x < 0 || path.x >= size || path.y < 0 || path.y >= size) {
                if (path.x < 0) {
                    const exitY = Math.max(0, Math.min(size - 1, path.y));
                    edgeBoundaries.west.push({ x: 0, y: exitY, width: path.width, dirX: path.dirX, dirY: path.dirY });
                } else if (path.x >= size) {
                    const exitY = Math.max(0, Math.min(size - 1, path.y));
                    edgeBoundaries.east.push({ x: size - 1, y: exitY, width: path.width, dirX: path.dirX, dirY: path.dirY });
                }

                if (path.y < 0) {
                    const exitX = Math.max(0, Math.min(size - 1, path.x));
                    edgeBoundaries.north.push({ x: exitX, y: 0, width: path.width, dirX: path.dirX, dirY: path.dirY });
                } else if (path.y >= size) {
                    const exitX = Math.max(0, Math.min(size - 1, path.x));
                    edgeBoundaries.south.push({ x: exitX, y: size - 1, width: path.width, dirX: path.dirX, dirY: path.dirY });
                }
                continue;
            }

            if (path.segmentSteps >= 2 && rng.nextBool(GameConfig.WORLD.RIVER_FORK_PROBABILITY)) {
                const newPath = {
                    x: path.x,
                    y: path.y,
                    width: rng.nextInt(GameConfig.WORLD.RIVER_MIN_WIDTH, GameConfig.WORLD.RIVER_MAX_WIDTH),
                    dirX: path.dirX,
                    dirY: path.dirY,
                    segmentSteps: 0
                };

                const angle = rng.nextBool() ? Math.PI / 2 : -Math.PI / 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                newPath.dirX = Math.round(path.dirX * cos - path.dirY * sin);
                newPath.dirY = Math.round(path.dirX * sin + path.dirY * cos);

                if (newPath.dirX !== 0 || newPath.dirY !== 0) {
                    activePaths.push(newPath);
                }
            }

            if (rng.nextBool(GameConfig.WORLD.RIVER_TURN_PROBABILITY)) {
                const angle = rng.nextBool() ? Math.PI / 4 : -Math.PI / 4;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const newDirX = Math.round(path.dirX * cos - path.dirY * sin);
                const newDirY = Math.round(path.dirX * sin + path.dirY * cos);

                if (newDirX !== 0 || newDirY !== 0) {
                    path.dirX = newDirX;
                    path.dirY = newDirY;
                }
            }

            activePaths.push(path);
        }

        return { tiles, edgeBoundaries };
    }

    createEmptyGrid(size, fillType) {
        const grid = [];
        for (let y = 0; y < size; y++) {
            const row = [];
            for (let x = 0; x < size; x++) {
                row.push(fillType);
            }
            grid.push(row);
        }
        return grid;
    }

    drawRiverSegment(tiles, size, centerX, centerY, width) {
        const halfWidth = Math.floor(width / 2);

        for (let dy = -halfWidth; dy <= halfWidth; dy++) {
            for (let dx = -halfWidth; dx <= halfWidth; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;

                if (x >= 0 && x < size && y >= 0 && y < size) {
                    tiles[y][x] = GameConfig.TILES.WATER.id;
                }
            }
        }
    }

    compressTiles(tiles) {
        let compressed = '';
        let currentType = tiles[0][0];
        let count = 0;

        for (let y = 0; y < tiles.length; y++) {
            for (let x = 0; x < tiles[y].length; x++) {
                const type = tiles[y][x];
                if (type === currentType) {
                    count++;
                } else {
                    const code = this.getTileCode(currentType);
                    compressed += code + count;
                    currentType = type;
                    count = 1;
                }
            }
        }

        const code = this.getTileCode(currentType);
        compressed += code + count;

        return compressed;
    }

    decompressTiles(compressed, size) {
        const tiles = [];
        const matches = compressed.match(/([a-z])(\d+)/g);

        let index = 0;
        for (const match of matches) {
            const code = match[0];
            const count = parseInt(match.slice(1));
            const tileType = this.getTileType(code);

            for (let i = 0; i < count; i++) {
                const x = index % size;
                const y = Math.floor(index / size);

                if (!tiles[y]) {
                    tiles[y] = [];
                }

                tiles[y][x] = tileType;
                index++;
            }
        }

        return tiles;
    }

    getTileCode(tileType) {
        for (const tile of Object.values(GameConfig.TILES)) {
            if (tile.id === tileType) {
                return tile.code;
            }
        }
        return 'g';
    }

    getTileType(code) {
        for (const tile of Object.values(GameConfig.TILES)) {
            if (tile.code === code) {
                return tile.id;
            }
        }
        return GameConfig.TILES.GRASS.id;
    }
}
