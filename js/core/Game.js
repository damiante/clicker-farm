import { GameConfig } from '../config/GameConfig.js';
import { StateManager } from './StateManager.js';
import { InputManager } from './InputManager.js';
import { Renderer } from '../rendering/Renderer.js';
import { AssetLoader } from '../rendering/AssetLoader.js';
import { ChunkManager } from '../world/ChunkManager.js';
import { UIManager } from '../ui/UIManager.js';

export class Game {
    constructor() {
        this.canvas = null;
        this.assetLoader = null;
        this.renderer = null;
        this.stateManager = null;
        this.inputManager = null;
        this.chunkManager = null;
        this.uiManager = null;

        this.player = {
            money: GameConfig.ECONOMY.STARTING_MONEY
        };

        this.entities = [];
        this.isRunning = false;
        this.lastFrameTime = 0;
    }

    async init() {
        this.canvas = document.getElementById('gameCanvas');
        this.assetLoader = new AssetLoader();
        this.stateManager = new StateManager();
        this.uiManager = new UIManager(this);

        await this.assetLoader.preloadAll();

        this.renderer = new Renderer(this.canvas, this.assetLoader);
        this.inputManager = new InputManager(this.canvas);

        this.inputManager.on('zoom', (event) => {
            const currentZoom = this.renderer.getZoom();
            const newZoom = currentZoom * event.delta;
            this.renderer.setZoom(newZoom, event.centerX, event.centerY);
        });

        this.inputManager.on('pan', (event) => {
            this.renderer.pan(event.deltaX, event.deltaY);
        });

        this.uiManager.initialize();

        const savedState = this.stateManager.load();
        if (savedState) {
            this.loadFromState(savedState);
        } else {
            this.startNewGame();
        }

        this.stateManager.setupAutoSave(() => this.getGameState());

        this.uiManager.hideLoadingScreen();
    }

    startNewGame() {
        const seed = Math.floor(Math.random() * 1000000);
        this.chunkManager = new ChunkManager(seed);

        const initialChunk = this.chunkManager.generateChunk(0, 0);

        this.centerViewOnPlayArea();

        this.player.money = GameConfig.ECONOMY.STARTING_MONEY;
        this.uiManager.updateMoney(this.player.money);

        console.log('New game started with seed:', seed);
    }

    loadFromState(state) {
        this.chunkManager = new ChunkManager(state.world.seed);
        this.chunkManager.deserialize(state.world);

        this.player.money = state.player.money;
        this.uiManager.updateMoney(this.player.money);

        this.centerViewOnPlayArea();

        console.log('Game loaded from saved state');
    }

    centerViewOnPlayArea() {
        const bounds = this.chunkManager.getWorldBounds();
        const tileSize = GameConfig.WORLD.TILE_SIZE;

        const worldWidthInPixels = (bounds.maxX - bounds.minX + 1) * tileSize;
        const worldHeightInPixels = (bounds.maxY - bounds.minY + 1) * tileSize;

        const zoomToFitWidth = this.canvas.width / worldWidthInPixels;
        const zoomToFitHeight = this.canvas.height / worldHeightInPixels;
        const initialZoom = Math.min(zoomToFitWidth, zoomToFitHeight) * 0.9;

        this.renderer.setZoom(initialZoom);

        const worldCenterX = (bounds.minX + bounds.maxX + 1) * tileSize / 2;
        const worldCenterY = (bounds.minY + bounds.maxY + 1) * tileSize / 2;

        const cameraX = worldCenterX - this.canvas.width / (2 * initialZoom);
        const cameraY = worldCenterY - this.canvas.height / (2 * initialZoom);
        this.renderer.setCamera(cameraX, cameraY);
    }

    getGameState() {
        return {
            player: {
                money: this.player.money
            },
            world: this.chunkManager.serialize(),
            entities: this.entities.map(e => e.serialize())
        };
    }

    start() {
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.gameLoop();
    }

    gameLoop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        for (const entity of this.entities) {
            entity.update(deltaTime);
        }
    }

    render() {
        this.renderer.renderWorld(this.chunkManager);

        const expansionButtons = this.renderer.renderExpansionButtons(
            this.chunkManager,
            (direction) => this.expandWorld(direction)
        );

        this.uiManager.updateExpansionButtons(expansionButtons, (buttonData) => {
            this.expandWorld(buttonData);
        });
    }

    expandWorld(buttonData) {
        console.log(`Expanding world: ${buttonData.direction} from chunk (${buttonData.chunkX}, ${buttonData.chunkY})`);

        this.chunkManager.expandChunk(buttonData.chunkX, buttonData.chunkY, buttonData.direction);

        this.stateManager.scheduleSave(this.getGameState());

        this.render();
    }

    addMoney(amount) {
        this.player.money += amount;
        this.uiManager.updateMoney(this.player.money);
        this.stateManager.scheduleSave(this.getGameState());
    }

    reset() {
        console.log('Resetting game...');

        this.stateManager.reset();

        this.entities = [];

        this.startNewGame();

        this.stateManager.scheduleSave(this.getGameState());

        console.log('Game reset complete');
    }

    stop() {
        this.isRunning = false;
    }
}
