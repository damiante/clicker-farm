import { GameConfig } from '../config/GameConfig.js';
import { InventoryConfig } from '../config/InventoryConfig.js';
import { StateManager } from './StateManager.js';
import { InputManager } from './InputManager.js';
import { Renderer } from '../rendering/Renderer.js';
import { AssetLoader } from '../rendering/AssetLoader.js';
import { ChunkManager } from '../world/ChunkManager.js';
import { UIManager } from '../ui/UIManager.js';
import { ItemRegistry } from '../items/ItemRegistry.js';
import { InventoryManager } from '../inventory/InventoryManager.js';
import { InventoryPanel } from '../inventory/InventoryPanel.js';
import { MenuManager } from '../menus/MenuManager.js';
import { ShopMenu } from '../menus/ShopMenu.js';
import { DragDropManager } from '../systems/DragDropManager.js';
import { WorldInteractionManager } from '../systems/WorldInteractionManager.js';
import { Plant } from '../entities/Plant.js';

export class Game {
    constructor() {
        this.canvas = null;
        this.assetLoader = null;
        this.renderer = null;
        this.stateManager = null;
        this.inputManager = null;
        this.chunkManager = null;
        this.uiManager = null;
        this.itemRegistry = null;
        this.inventoryManager = null;
        this.inventoryPanel = null;
        this.menuManager = null;
        this.shopMenu = null;
        this.dragDropManager = null;
        this.worldInteractionManager = null;

        this.player = {
            money: GameConfig.ECONOMY.STARTING_MONEY,
            peakMoney: GameConfig.ECONOMY.STARTING_MONEY,
            inventory: [],
            maxInventorySlots: InventoryConfig.INITIAL_SLOTS,
            maxStackSize: InventoryConfig.INITIAL_STACK_SIZE,
            inventorySlotsPrice: InventoryConfig.SLOT_BASE_PRICE,
            stackSizePrice: InventoryConfig.STACK_BASE_PRICE,
            unlockedMenus: [],
            expansionCount: 0  // Track number of world expansions
        };

        this.settings = {
            showGrid: false  // Grid lines disabled by default
        };

        this.entities = [];
        this.isRunning = false;
        this.lastFrameTime = 0;
    }

    async init() {
        this.canvas = document.getElementById('gameCanvas');
        this.assetLoader = new AssetLoader();
        this.stateManager = new StateManager();

        await this.assetLoader.preloadAll();

        // Load item registry first (required by other systems)
        this.itemRegistry = new ItemRegistry();
        await this.itemRegistry.load();

        // Load menu data
        this.menuManager = new MenuManager(this, this.itemRegistry);
        await this.menuManager.load();

        this.renderer = new Renderer(this.canvas, this.assetLoader);
        this.inputManager = new InputManager(this.canvas);

        // Initialize inventory system
        this.inventoryManager = new InventoryManager(this, this.itemRegistry);
        this.inventoryPanel = new InventoryPanel(this.inventoryManager, this.itemRegistry, this);

        // Initialize shop menu
        this.shopMenu = new ShopMenu(this.menuManager, this.inventoryManager, this.itemRegistry, this);

        // Initialize drag-drop system
        this.dragDropManager = new DragDropManager(
            this,
            this.inventoryManager,
            this.itemRegistry,
            this.renderer,
            this.inputManager
        );

        // Initialize world interaction system
        this.worldInteractionManager = new WorldInteractionManager(
            this,
            this.renderer,
            this.inputManager,
            this.itemRegistry,
            this.inventoryManager,
            this.inventoryPanel
        );

        // Setup input listeners
        this.inputManager.on('zoom', (event) => {
            const currentZoom = this.renderer.getZoom();
            const newZoom = currentZoom * event.delta;
            this.renderer.setZoom(newZoom, event.centerX, event.centerY);
        });

        this.inputManager.on('pan', (event) => {
            this.renderer.pan(event.deltaX, event.deltaY);
        });

        this.uiManager = new UIManager(this);
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

        // Initialize player state
        this.player.money = GameConfig.ECONOMY.STARTING_MONEY;
        this.player.peakMoney = GameConfig.ECONOMY.STARTING_MONEY;
        this.player.inventory = [];
        this.player.maxInventorySlots = InventoryConfig.INITIAL_SLOTS;
        this.player.maxStackSize = InventoryConfig.INITIAL_STACK_SIZE;
        this.player.unlockedMenus = [];
        this.player.expansionCount = 0;

        // Initialize inventory
        this.inventoryManager.deserialize(this.player);

        this.uiManager.updateMoney(this.player.money);

        console.log('New game started with seed:', seed);
    }

    loadFromState(state) {
        this.chunkManager = new ChunkManager(state.world.seed);
        this.chunkManager.deserialize(state.world);

        // Restore player state
        this.player.money = state.player.money;
        this.player.peakMoney = state.player.peakMoney || state.player.money;
        this.player.unlockedMenus = state.player.unlockedMenus || [];
        this.player.expansionCount = state.player.expansionCount || 0;

        // Restore settings
        if (state.settings) {
            this.settings.showGrid = state.settings.showGrid !== undefined ? state.settings.showGrid : false;
        }

        // Restore inventory
        this.inventoryManager.deserialize(state.player);
        this.inventoryPanel.refresh();

        // Restore menus
        this.shopMenu.refresh({ autoExpand: true });

        // Restore entities
        this.entities = [];
        for (const entityData of state.entities || []) {
            if (entityData.type === 'plant') {
                const plant = Plant.deserialize(entityData, this.itemRegistry);
                this.entities.push(plant);
            }
        }

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
        const inventoryState = this.inventoryManager.serialize();

        return {
            player: {
                money: this.player.money,
                peakMoney: this.player.peakMoney,
                slots: inventoryState.slots,
                maxSlots: inventoryState.maxSlots,
                maxStackSize: inventoryState.maxStackSize,
                slotPrice: inventoryState.slotPrice,
                stackPrice: inventoryState.stackPrice,
                unlockedMenus: this.player.unlockedMenus,
                expansionCount: this.player.expansionCount
            },
            settings: this.settings,
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

        // Render entities after tiles
        this.renderer.renderEntities(this.entities, this.itemRegistry);

        // Render grid lines if enabled
        if (this.settings.showGrid) {
            this.renderer.renderGrid(this.chunkManager);
        }

        // Render placement preview after entities
        const ctx = this.renderer.ctx;
        const tileSize = this.renderer.constructor.name === 'Renderer' ? 32 : this.renderer.tileSize;
        ctx.save();
        ctx.scale(this.renderer.zoom, this.renderer.zoom);
        this.worldInteractionManager.renderPlacementPreview(ctx, 32);
        ctx.restore();

        const expansionButtons = this.renderer.renderExpansionButtons(
            this.chunkManager,
            (direction) => this.expandWorld(direction)
        );

        this.uiManager.updateExpansionButtons(expansionButtons, (buttonData) => {
            this.expandWorld(buttonData);
        });
    }

    getExpansionPrice() {
        const basePrice = GameConfig.WORLD.EXPANSION_BASE_PRICE;
        const growth = GameConfig.WORLD.EXPANSION_PRICE_GROWTH;
        return Math.floor(basePrice * Math.pow(growth, this.player.expansionCount));
    }

    expandWorld(buttonData) {
        const price = this.getExpansionPrice();

        // Check if player can afford expansion
        if (this.player.money < price) {
            console.warn(`Cannot afford expansion (need $${price}, have $${this.player.money})`);
            return;
        }

        console.log(`Expanding world: ${buttonData.direction} from chunk (${buttonData.chunkX}, ${buttonData.chunkY}) for $${price}`);

        // Deduct money
        this.player.money -= price;
        this.uiManager.updateMoney(this.player.money);

        // Increment expansion count
        this.player.expansionCount++;

        // Perform expansion
        this.chunkManager.expandChunk(buttonData.chunkX, buttonData.chunkY, buttonData.direction);

        // Update shop affordability in case money changed
        this.shopMenu.updateAffordability();

        this.stateManager.scheduleSave(this.getGameState());

        this.render();
    }

    addMoney(amount) {
        this.player.money += amount;

        // Track peak money for menu unlocks
        if (this.player.money > this.player.peakMoney) {
            this.player.peakMoney = this.player.money;
            const unlocked = this.menuManager.checkUnlocks();
            // Auto-expand if new menus were unlocked
            this.shopMenu.refresh({ autoExpand: unlocked });
        }

        this.uiManager.updateMoney(this.player.money);

        // Update shop menu affordability
        this.shopMenu.updateAffordability();

        // Update inventory panel button affordability
        if (this.inventoryPanel.isVisible()) {
            this.inventoryPanel.updateControlButtons();
        }

        this.stateManager.scheduleSave(this.getGameState());
    }

    createPlantEntity(itemId, tileX, tileY) {
        const item = this.itemRegistry.getItem(itemId);
        if (!item || item.itemType !== 'seed') {
            console.error('Can only plant seeds');
            return null;
        }

        const plant = new Plant(
            tileX,
            tileY,
            itemId,
            item.growsInto,
            item.sproutTime,
            item.maturityTime
        );

        this.entities.push(plant);

        this.stateManager.scheduleSave(this.getGameState());
        return plant;
    }

    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
        }

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
