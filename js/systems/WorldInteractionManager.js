import { Modal } from '../ui/Modal.js';
import { Button } from '../ui/Button.js';
import { PlantInfoPanel } from './PlantInfoPanel.js';
import { GameConfig } from '../config/GameConfig.js';

export class WorldInteractionManager {
    constructor(game, renderer, inputManager, itemRegistry, inventoryManager, inventoryPanel) {
        this.game = game;
        this.renderer = renderer;
        this.inputManager = inputManager;
        this.itemRegistry = itemRegistry;
        this.inventoryManager = inventoryManager;
        this.inventoryPanel = inventoryPanel;
        this.plantInfoPanel = new PlantInfoPanel(itemRegistry);

        this.lastPointerDownPos = null;
        this.currentMousePos = null;  // Track mouse position for placement preview
        this.setupListeners();
    }

    setupListeners() {
        // Track pointer down position
        this.inputManager.on('pointerdown', (event) => {
            this.lastPointerDownPos = { x: event.position.x, y: event.position.y };
        });

        // Track pointer movement for placement preview
        this.inputManager.on('pointermove', (event) => {
            this.currentMousePos = { x: event.position.x, y: event.position.y };
        });

        // Handle click (pointer up near pointer down location)
        this.inputManager.on('pointerup', (event) => {
            if (!this.lastPointerDownPos) return;

            // Check if this was a click (not a drag)
            const dx = event.position.x - this.lastPointerDownPos.x;
            const dy = event.position.y - this.lastPointerDownPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 5) {  // 5 pixel threshold for click vs drag
                this.onCanvasClick(event.position.x, event.position.y);
            }

            this.lastPointerDownPos = null;
        });
    }

    onCanvasClick(screenX, screenY) {
        // Don't process clicks if drag is in progress
        if (this.game.dragDropManager && this.game.dragDropManager.isDragging()) {
            return;
        }

        // Don't process clicks if inventory panel is in the way
        // (This is a simple check - could be improved)
        const inventoryPanel = document.getElementById('inventory-panel');
        if (inventoryPanel && inventoryPanel.classList.contains('visible')) {
            const rect = inventoryPanel.getBoundingClientRect();
            if (screenX >= rect.left && screenX <= rect.right &&
                screenY >= rect.top && screenY <= rect.bottom) {
                return;  // Click was on inventory panel
            }
        }

        // Convert to world coordinates
        const worldPos = this.renderer.screenToWorld(screenX, screenY);
        const tileX = worldPos.x;
        const tileY = worldPos.y;

        // Check if there's a selected item from inventory (placement mode)
        const selectedItem = this.inventoryPanel.getSelectedItem();

        if (selectedItem) {
            this.placeItemOnTile(selectedItem.itemId, selectedItem.slotIndex, tileX, tileY);
            return;
        }

        // Check if there's an entity at this position
        const entity = this.game.entities.find(e =>
            Math.floor(e.x) === tileX && Math.floor(e.y) === tileY
        );

        if (entity) {
            if (entity.type === 'plant') {
                this.showPlantMenu(entity);
            }
        }
    }

    placeItemOnTile(itemId, slotIndex, tileX, tileY) {
        const item = this.itemRegistry.getItem(itemId);
        if (!item) {
            console.error(`Cannot place item: ${itemId} not found`);
            return;
        }

        // Validate item is a seed
        if (item.itemType !== 'seed') {
            console.warn(`Cannot place ${item.name}: only seeds can be planted`);
            this.inventoryPanel.clearSelection();
            return;
        }

        // Get the tile at this position
        const tile = this.game.chunkManager.getTile(tileX, tileY);
        if (!tile) {
            console.warn('Cannot place item: tile not found');
            this.inventoryPanel.clearSelection();
            return;
        }

        // Check if tile is grass
        if (tile.type !== 'grass') {
            console.warn('Cannot place item: can only plant on grass tiles');
            this.inventoryPanel.clearSelection();
            return;
        }

        // Check if there's already an entity at this position
        const existingEntity = this.game.entities.find(e =>
            Math.floor(e.x) === tileX && Math.floor(e.y) === tileY
        );

        if (existingEntity) {
            console.warn('Cannot place item: tile is already occupied');
            this.inventoryPanel.clearSelection();
            return;
        }

        // Valid placement - create the plant entity
        this.game.createPlantEntity(itemId, tileX, tileY);

        // Remove item from inventory (use itemId, not slotIndex)
        this.inventoryManager.removeItem(itemId, 1);

        // Refresh inventory panel
        this.inventoryPanel.refresh();

        // Check if there are still items of this type - if not, clear selection
        const slot = this.inventoryManager.getSlot(slotIndex);
        if (!slot) {
            // Slot is now empty, clear selection
            this.inventoryPanel.clearSelection();
        } else {
            // Items still remain, keep selection and update preview
            const onSell = () => {
                const item = this.itemRegistry.getItem(slot.itemId);
                if (item && item.salePrice > 0) {
                    this.inventoryManager.removeItem(slot.itemId, 1);
                    this.game.addMoney(item.salePrice);

                    const updatedSlot = this.inventoryManager.getSlot(slotIndex);
                    if (!updatedSlot) {
                        this.inventoryPanel.clearSelection();
                    } else {
                        this.inventoryPanel.refresh();
                        this.inventoryPanel.previewPanel.show(updatedSlot.itemId, onSell);
                    }
                }
            };
            this.inventoryPanel.previewPanel.show(slot.itemId, onSell);
        }

        // Save state
        this.game.stateManager.scheduleSave(this.game.getGameState());

        console.log(`Placed ${item.name} at (${tileX}, ${tileY})`);
    }

    showPlantMenu(plant) {
        // Convert plant world coordinates to screen coordinates
        const screenPos = this.renderer.worldToScreen(plant.x + 0.5, plant.y + 0.5);

        // Show the plant info panel
        this.plantInfoPanel.show(plant, screenPos.x, screenPos.y, (harvestedPlant) => {
            this.harvestPlant(harvestedPlant);
        });
    }

    harvestPlant(plant) {
        const harvestedItemId = plant.harvest();

        // Add to inventory
        if (this.inventoryManager.hasRoomFor(harvestedItemId)) {
            this.inventoryManager.addItem(harvestedItemId);

            // Notify about new item (shows pulse if inventory closed)
            this.game.inventoryPanel.notifyItemAdded();

            // Remove plant entity
            this.game.removeEntity(plant);

            // Refresh inventory panel if visible
            if (this.game.inventoryPanel.isVisible()) {
                this.game.inventoryPanel.refresh();
            }

            // Save state
            this.game.stateManager.scheduleSave(this.game.getGameState());

            console.log(`Harvested ${harvestedItemId}`);
        } else {
            console.warn('Inventory is full, cannot harvest');
        }
    }

    renderPlacementPreview(ctx, tileSize) {
        // Only render if mouse is over canvas and item is selected
        if (!this.currentMousePos) return;

        const selectedItem = this.inventoryPanel.getSelectedItem();
        if (!selectedItem) return;

        const item = this.itemRegistry.getItem(selectedItem.itemId);
        if (!item || item.itemType !== 'seed') return;

        // Convert mouse position to world coordinates
        const worldPos = this.renderer.screenToWorld(this.currentMousePos.x, this.currentMousePos.y);
        const tileX = worldPos.x;
        const tileY = worldPos.y;

        // Check if this is a valid placement location
        const tile = this.game.chunkManager.getTile(tileX, tileY);
        if (!tile || tile.type !== 'grass') return;

        // Check if tile is already occupied
        const existingEntity = this.game.entities.find(e =>
            Math.floor(e.x) === tileX && Math.floor(e.y) === tileY
        );
        if (existingEntity) return;

        // Calculate screen position (ctx is already scaled by zoom)
        const camera = this.renderer.getCamera();
        const screenX = Math.floor(tileX * tileSize - camera.x);
        const screenY = Math.floor(tileY * tileSize - camera.y);

        // Apply item-specific overworld scale
        const scale = item.overworldScale !== undefined ? item.overworldScale : GameConfig.ENTITIES.DEFAULT_OVERWORLD_SCALE;
        const fontSize = Math.floor(GameConfig.ENTITIES.RENDER_EMOJI_FONT_SIZE * scale);

        // Render translucent emoji preview
        ctx.save();
        ctx.globalAlpha = GameConfig.ENTITIES.PLACEMENT_PREVIEW_OPACITY;
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
}
