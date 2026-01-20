export class DragDropManager {
    constructor(game, inventoryManager, itemRegistry, renderer, inputManager) {
        this.game = game;
        this.inventoryManager = inventoryManager;
        this.itemRegistry = itemRegistry;
        this.renderer = renderer;
        this.inputManager = inputManager;

        this.state = 'idle';  // 'idle' or 'dragging'
        this.draggedItemId = null;
        this.draggedSlotIndex = null;
        this.ghostElement = null;
        this.currentTile = null;

        this.setupListeners();
    }

    setupListeners() {
        // Listen for pointer move to update drag preview
        this.inputManager.on('pointermove', (event) => {
            if (this.state === 'dragging') {
                this.updateDragPreview(event.position.x, event.position.y);
            }
        });

        // Listen for pointer up to complete drag
        this.inputManager.on('pointerup', (event) => {
            if (this.state === 'dragging') {
                this.endDrag(event.position.x, event.position.y);
            }
        });
    }

    startDrag(slotIndex, itemId) {
        const item = this.itemRegistry.getItem(itemId);
        if (!item) {
            console.error(`Cannot start drag: item ${itemId} not found`);
            return false;
        }

        this.state = 'dragging';
        this.draggedItemId = itemId;
        this.draggedSlotIndex = slotIndex;
        this.ghostElement = this.createGhostElement(item);

        return true;
    }

    createGhostElement(item) {
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        ghost.textContent = item.emoji;
        ghost.style.position = 'fixed';
        ghost.style.fontSize = '48px';
        ghost.style.opacity = '0.5';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '999';
        ghost.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(ghost);
        return ghost;
    }

    updateDragPreview(screenX, screenY) {
        if (!this.ghostElement) return;

        // Update ghost position
        this.ghostElement.style.left = `${screenX}px`;
        this.ghostElement.style.top = `${screenY}px`;

        // Convert to world coordinates and snap to grid
        const worldPos = this.renderer.screenToWorld(screenX, screenY);
        this.currentTile = worldPos;

        // Visual feedback could be added here
        // e.g., highlight the target tile if valid
    }

    endDrag(screenX, screenY) {
        if (!this.currentTile) {
            this.cancelDrag();
            return;
        }

        const tileX = this.currentTile.x;
        const tileY = this.currentTile.y;

        // Validate and place item
        if (this.canPlaceItem(this.draggedItemId, tileX, tileY)) {
            const item = this.itemRegistry.getItem(this.draggedItemId);

            // Check if it's a seed that needs to be planted
            if (item.itemType === 'seed') {
                // Create plant entity
                this.game.createPlantEntity(this.draggedItemId, tileX, tileY);

                // Remove from inventory
                this.inventoryManager.removeItem(this.draggedItemId, 1);

                // Refresh inventory panel
                this.game.inventoryPanel.refresh();

                // Save state
                this.game.stateManager.scheduleSave(this.game.getGameState());
            } else {
                console.warn('Only seeds can be planted currently');
            }
        }

        this.cancelDrag();
    }

    canPlaceItem(itemId, tileX, tileY) {
        // Get the tile
        const tile = this.game.chunkManager.getTile(tileX, tileY);

        if (!tile) {
            return false;  // Out of bounds
        }

        // Can only plant on grass tiles
        if (tile.type !== 'grass') {
            return false;
        }

        // Can't plant if tile already has an entity
        if (tile.hasEntity()) {
            return false;
        }

        return true;
    }

    cancelDrag() {
        // Remove ghost element
        if (this.ghostElement && this.ghostElement.parentNode) {
            this.ghostElement.parentNode.removeChild(this.ghostElement);
        }

        // Reset state
        this.state = 'idle';
        this.draggedItemId = null;
        this.draggedSlotIndex = null;
        this.ghostElement = null;
        this.currentTile = null;
    }

    isDragging() {
        return this.state === 'dragging';
    }
}
