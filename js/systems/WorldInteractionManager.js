import { PlantInfoPanel } from './PlantInfoPanel.js';
import { FenceInfoPanel } from './FenceInfoPanel.js';
import { BarrelInfoPanel } from './BarrelInfoPanel.js';
import { GameConfig } from '../config/GameConfig.js';

export class WorldInteractionManager {
    constructor(game, renderer, inputManager, itemRegistry, inventoryManager, inventoryPanel, toolsPanel) {
        this.game = game;
        this.renderer = renderer;
        this.inputManager = inputManager;
        this.itemRegistry = itemRegistry;
        this.inventoryManager = inventoryManager;
        this.inventoryPanel = inventoryPanel;
        this.toolsPanel = toolsPanel;
        this.plantInfoPanel = new PlantInfoPanel(itemRegistry, game);
        this.fenceInfoPanel = new FenceInfoPanel(itemRegistry);
        this.barrelInfoPanel = new BarrelInfoPanel(itemRegistry);

        this.lastPointerDownPos = null;
        this.currentMousePos = null;  // Track mouse position for placement preview
        this.isDragging = false;  // Track if user is dragging
        this.paintedTiles = new Set();  // Track tiles painted during current drag
        this.justPlacedItem = false;  // Track if item was placed during current click sequence
        this.setupListeners();
    }

    setupListeners() {
        // Track pointer down position
        this.inputManager.on('pointerdown', (event) => {
            this.lastPointerDownPos = { x: event.position.x, y: event.position.y };
            this.isDragging = false;
            this.paintedTiles.clear();
            this.justPlacedItem = false;

            const worldPos = this.renderer.screenToWorld(event.position.x, event.position.y);
            const tileX = worldPos.x;
            const tileY = worldPos.y;
            const tileKey = `${tileX},${tileY}`;

            // Check for tool or item selection
            const selectedTool = this.toolsPanel ? this.toolsPanel.getSelectedTool() : null;
            const selectedItem = this.inventoryPanel.getSelectedItem();

            // If a tool is selected, try to harvest on pointer down
            if (selectedTool) {
                if (this.tryHarvestWithTool(selectedTool, tileX, tileY)) {
                    this.paintedTiles.add(tileKey);
                    this.justPlacedItem = true;
                }
            }
            // If an item is selected, try to place on pointer down
            else if (selectedItem) {
                if (this.tryPlaceItem(selectedItem.itemId, selectedItem.slotIndex, tileX, tileY)) {
                    this.paintedTiles.add(tileKey);
                    this.justPlacedItem = true;
                }
            }
        });

        // Track pointer movement for placement preview and drag painting
        this.inputManager.on('pointermove', (event) => {
            this.currentMousePos = { x: event.position.x, y: event.position.y };

            // Handle drag painting
            if (this.lastPointerDownPos) {
                const dx = event.position.x - this.lastPointerDownPos.x;
                const dy = event.position.y - this.lastPointerDownPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Start dragging if moved more than threshold
                if (distance > 5) {
                    this.isDragging = true;
                }

                // If dragging, check for tool or item selection and paint
                if (this.isDragging) {
                    const selectedTool = this.toolsPanel ? this.toolsPanel.getSelectedTool() : null;
                    const selectedItem = this.inventoryPanel.getSelectedItem();

                    if (selectedTool || selectedItem) {
                        const worldPos = this.renderer.screenToWorld(event.position.x, event.position.y);
                        const tileX = worldPos.x;
                        const tileY = worldPos.y;
                        const tileKey = `${tileX},${tileY}`;

                        // Only paint if we haven't painted this tile yet in this drag
                        if (!this.paintedTiles.has(tileKey)) {
                            if (selectedTool) {
                                // Tool-based harvesting
                                if (this.tryHarvestWithTool(selectedTool, tileX, tileY)) {
                                    this.paintedTiles.add(tileKey);
                                    this.justPlacedItem = true;
                                }
                            } else if (selectedItem) {
                                // Item placement
                                if (this.tryPlaceItem(selectedItem.itemId, selectedItem.slotIndex, tileX, tileY)) {
                                    this.paintedTiles.add(tileKey);
                                }
                            }
                        }
                    }
                }
            }
        });

        // Handle click (pointer up near pointer down location)
        this.inputManager.on('pointerup', (event) => {
            if (!this.lastPointerDownPos) return;

            // Check if this was a click (not a drag)
            const dx = event.position.x - this.lastPointerDownPos.x;
            const dy = event.position.y - this.lastPointerDownPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 5 && !this.isDragging) {
                // Only handle click if no tool/item selected and we didn't just place/harvest
                const selectedTool = this.toolsPanel ? this.toolsPanel.getSelectedTool() : null;
                const selectedItem = this.inventoryPanel.getSelectedItem();
                if (!selectedTool && !selectedItem && !this.justPlacedItem) {
                    this.onCanvasClick(event.position.x, event.position.y);
                }
            }

            this.lastPointerDownPos = null;
            this.isDragging = false;
            this.paintedTiles.clear();
            this.justPlacedItem = false;
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
        const tileX = Math.floor(worldPos.x);
        const tileY = Math.floor(worldPos.y);

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
            } else if (entity.type === 'fence') {
                this.showFenceMenu(entity);
            } else if (entity.type === 'barrel') {
                this.showBarrelMenu(entity);
            }
        }
    }

    showFenceMenu(fence) {
        // Convert fence world coordinates to screen coordinates
        const screenPos = this.renderer.worldToScreen(fence.x + 0.5, fence.y + 0.5);

        // Show the fence info panel
        this.fenceInfoPanel.show(fence, screenPos.x, screenPos.y, (pickedUpFence) => {
            this.pickupFence(pickedUpFence);
        });
    }

    pickupFence(fence) {
        const itemId = fence.itemId;

        // Add to inventory
        if (this.inventoryManager.hasRoomFor(itemId)) {
            this.inventoryManager.addItem(itemId);

            // Notify about new item (shows pulse if inventory closed)
            this.game.inventoryPanel.notifyItemAdded();

            // Remove fence entity
            this.game.removeEntity(fence);

            // Update all remaining fence orientations
            this.game.updateFenceOrientations();

            // Refresh inventory panel if visible
            if (this.game.inventoryPanel.isVisible()) {
                this.game.inventoryPanel.refresh();
            }

            // Update shop affordability (items may now meet requirements)
            this.game.shopMenu.updateAffordability();

            // Save state
            this.game.stateManager.scheduleSave(this.game.getGameState());
        } else {
            console.warn('Inventory is full, cannot pick up fence');
        }
    }

    showBarrelMenu(barrel) {
        // Convert barrel world coordinates to screen coordinates
        const screenPos = this.renderer.worldToScreen(barrel.x + 0.5, barrel.y + 0.5);

        // Show the barrel info panel with callbacks
        this.barrelInfoPanel.show(
            barrel,
            screenPos.x,
            screenPos.y,
            (pickedUpBarrel) => this.pickupBarrel(pickedUpBarrel),
            (clickedBarrel) => this.onBarrelInputSlotClick(clickedBarrel),
            (clickedBarrel) => this.onBarrelInputTakeClick(clickedBarrel),
            (clickedBarrel) => this.onBarrelOutputSlotClick(clickedBarrel)
        );
    }

    onBarrelInputSlotClick(barrel) {
        // Get selected item from inventory
        const selectedItem = this.inventoryPanel.getSelectedItem();

        if (!selectedItem) {
            // No item selected - show dropdown menu
            this.barrelInfoPanel.showItemDropdown(this.inventoryManager, (selectedItemId) => {
                this.placeItemInBarrel(barrel, selectedItemId);
            });
            return;
        }

        // Item is selected - place it directly
        this.placeItemInBarrel(barrel, selectedItem.itemId);
    }

    onBarrelInputTakeClick(barrel) {
        // Take items from input slot
        const taken = barrel.takeFromInput();
        if (!taken) {
            console.warn('No items in input slot');
            return;
        }

        // Add to inventory
        if (this.inventoryManager.hasRoomFor(taken.itemId)) {
            this.inventoryManager.addItem(taken.itemId, taken.count);

            // Notify about new item
            this.game.inventoryPanel.notifyItemAdded();

            // Refresh inventory panel if visible
            if (this.game.inventoryPanel.isVisible()) {
                this.game.inventoryPanel.refresh();
            }

            // Refresh barrel panel to show updated slots
            if (this.barrelInfoPanel.isVisible()) {
                this.barrelInfoPanel.refresh();
            }

            // Update shop affordability
            this.game.shopMenu.updateAffordability();

            // Save state
            this.game.stateManager.scheduleSave(this.game.getGameState());
        } else {
            // Put items back if inventory is full
            barrel.inputSlot = taken;
            console.warn('Inventory is full, cannot take items from barrel');
        }
    }

    placeItemInBarrel(barrel, itemId) {
        const maxStackSize = this.game.player.maxStackSize;

        // Update barrel's max stack size
        barrel.maxStackSize = maxStackSize;

        // If barrel has a different item type in input, swap it out first
        if (barrel.inputSlot && barrel.inputSlot.itemId !== itemId) {
            const swapped = barrel.takeFromInput();
            if (swapped) {
                this.inventoryManager.addItem(swapped.itemId, swapped.count);
            }
        }

        // Calculate how many items we can add to barrel
        const currentCount = barrel.inputSlot ? barrel.inputSlot.count : 0;
        const capacity = maxStackSize - currentCount;

        if (capacity <= 0) {
            console.warn('Barrel input is full');
            return;
        }

        // Collect items from inventory slots until we fill the barrel
        let remainingCapacity = capacity;

        // Find all slots with this item
        for (let i = 0; i < this.inventoryManager.slots.length && remainingCapacity > 0; i++) {
            const slot = this.inventoryManager.slots[i];
            if (!slot || slot.itemId !== itemId) continue;

            // Take items from this slot
            const toTake = Math.min(slot.count, remainingCapacity);

            // Remove from inventory
            this.inventoryManager.removeItem(itemId, toTake);

            // Add to barrel input slot
            if (!barrel.inputSlot) {
                barrel.inputSlot = { itemId, count: toTake };
            } else {
                barrel.inputSlot.count += toTake;
            }

            remainingCapacity -= toTake;
        }

        // Refresh inventory panel
        this.inventoryPanel.refresh();

        // Refresh barrel panel to show updated slots
        if (this.barrelInfoPanel.isVisible()) {
            this.barrelInfoPanel.refresh();
        }

        // Refresh dropdown if it's open
        this.barrelInfoPanel.refreshDropdown();

        // Check if there are still items of this type
        const remainingCount = this.inventoryManager.getItemCount(itemId);
        if (remainingCount === 0) {
            this.inventoryPanel.clearSelection();
        }

        // Update shop affordability
        this.game.shopMenu.updateAffordability();

        // Save state
        this.game.stateManager.scheduleSave(this.game.getGameState());
    }

    onBarrelOutputSlotClick(barrel) {
        // Take item from output slot
        const taken = barrel.takeFromOutput();
        if (!taken) {
            console.warn('No item in output slot');
            return;
        }

        // Add to inventory
        if (this.inventoryManager.hasRoomFor(taken.itemId)) {
            this.inventoryManager.addItem(taken.itemId, taken.count);

            // Unlock gloves tool (first time collecting output)
            if (!this.game.player.hasCollectedOutput) {
                this.game.player.hasCollectedOutput = true;
                this.game.checkToolUnlocks();
            }

            // Notify about new item
            this.game.inventoryPanel.notifyItemAdded();

            // Refresh inventory panel if visible
            if (this.game.inventoryPanel.isVisible()) {
                this.game.inventoryPanel.refresh();
            }

            // Refresh barrel panel to show updated slots
            if (this.barrelInfoPanel.isVisible()) {
                this.barrelInfoPanel.refresh();
            }

            // Update shop affordability
            this.game.shopMenu.updateAffordability();

            // Save state
            this.game.stateManager.scheduleSave(this.game.getGameState());
        } else {
            // Put item back if inventory is full
            barrel.outputSlot = taken;
            console.warn('Inventory is full, cannot take item from barrel');
        }
    }

    pickupBarrel(barrel) {
        const itemId = barrel.itemId;

        // Add to inventory
        if (this.inventoryManager.hasRoomFor(itemId)) {
            this.inventoryManager.addItem(itemId);

            // Notify about new item (shows pulse if inventory closed)
            this.game.inventoryPanel.notifyItemAdded();

            // Remove barrel entity
            this.game.removeEntity(barrel);

            // Refresh inventory panel if visible
            if (this.game.inventoryPanel.isVisible()) {
                this.game.inventoryPanel.refresh();
            }

            // Update shop affordability (items may now meet requirements)
            this.game.shopMenu.updateAffordability();

            // Save state
            this.game.stateManager.scheduleSave(this.game.getGameState());
        } else {
            console.warn('Inventory is full, cannot pick up barrel');
        }
    }

    tryPlaceItem(itemId, _slotIndex, tileX, tileY) {
        // Silent version of placeItemOnTile for drag painting
        // Returns true if placement succeeded, false otherwise
        // Note: slotIndex parameter is kept for API compatibility but not used

        const item = this.itemRegistry.getItem(itemId);
        if (!item) return false;

        // Validate item is placeable
        if (item.itemType !== 'seed' && item.itemType !== 'structure') return false;

        // Check if player has this item in inventory
        if (this.inventoryManager.getItemCount(itemId) === 0) return false;

        // Ensure tile coordinates are integers
        tileX = Math.floor(tileX);
        tileY = Math.floor(tileY);

        // Get the tile at this position
        const tile = this.game.chunkManager.getTile(tileX, tileY);
        if (!tile || tile.type !== 'grass') return false;

        // Check if there's already an entity at this position
        const existingEntity = this.game.entities.find(e =>
            Math.floor(e.x) === tileX && Math.floor(e.y) === tileY
        );
        if (existingEntity) return false;

        // Valid placement - create the appropriate entity
        if (item.itemType === 'seed') {
            this.game.createPlantEntity(itemId, tileX, tileY);
        } else if (item.itemType === 'structure') {
            if (itemId === 'fence') {
                this.game.createFenceEntity(itemId, tileX, tileY);
            } else if (itemId === 'barrel') {
                this.game.createBarrelEntity(itemId, tileX, tileY);
            }
        }

        // Remove item from inventory
        this.inventoryManager.removeItem(itemId, 1);

        // Refresh inventory panel
        this.inventoryPanel.refresh();

        // Check if there are still items of this type
        const remainingCount = this.inventoryManager.getItemCount(itemId);
        if (remainingCount === 0) {
            // No more items of this type, clear selection
            this.inventoryPanel.clearSelection();
        } else {
            // Find the first slot with this itemId (might be different from original slot)
            const newSlotIndex = this.inventoryManager.slots.findIndex(s => s && s.itemId === itemId);
            if (newSlotIndex !== -1) {
                // Update selection to the new slot
                this.inventoryPanel.selectedSlotIndex = newSlotIndex;
                const slot = this.inventoryManager.slots[newSlotIndex];

                const onSell = () => {
                    const item = this.itemRegistry.getItem(slot.itemId);
                    if (item && item.salePrice > 0) {
                        this.inventoryManager.removeItem(slot.itemId, 1);
                        this.game.addMoney(item.salePrice);

                        const remainingCount = this.inventoryManager.getItemCount(slot.itemId);
                        if (remainingCount === 0) {
                            this.inventoryPanel.clearSelection();
                        } else {
                            this.inventoryPanel.refresh();
                            this.inventoryPanel.previewPanel.show(slot.itemId, onSell, onSellAll);
                        }
                    }
                };

                const onSellAll = () => {
                    const item = this.itemRegistry.getItem(slot.itemId);
                    if (item && item.salePrice > 0) {
                        const totalCount = this.inventoryManager.getItemCount(slot.itemId);
                        const totalValue = totalCount * item.salePrice;
                        this.inventoryManager.removeItem(slot.itemId, totalCount);
                        this.game.addMoney(totalValue);
                        this.inventoryPanel.clearSelection();
                        this.inventoryPanel.refresh();
                    }
                };

                this.inventoryPanel.previewPanel.show(slot.itemId, onSell, onSellAll);
            } else {
                // Shouldn't happen, but clear selection just in case
                this.inventoryPanel.clearSelection();
            }
        }

        // Save state
        this.game.stateManager.scheduleSave(this.game.getGameState());

        return true;
    }

    tryHarvestWithTool(tool, tileX, tileY) {
        // Silent version of harvest for drag painting with tools
        // Returns true if harvest succeeded, false otherwise

        // Ensure tile coordinates are integers
        tileX = Math.floor(tileX);
        tileY = Math.floor(tileY);

        // Find entity at this tile position
        const entity = this.game.entities.find(e =>
            Math.floor(e.x) === tileX && Math.floor(e.y) === tileY
        );

        if (!entity) return false;

        // Handle gloves tool for gathering fruits and fermented items
        if (tool === 'gloves') {
            // Check for fruiting plant with fruit
            if (entity.type === 'plant' && entity.isFruitingPlant && entity.isFruitingPlant() && entity.hasFruit()) {
                const fruit = entity.takeFruit();
                if (!fruit) return false;

                // Check if inventory has room
                if (!this.inventoryManager.hasRoomFor(fruit.itemId)) {
                    // Put fruit back
                    entity.fruitSlot = fruit;
                    return false;
                }

                // Add fruit to inventory
                this.inventoryManager.addItem(fruit.itemId, fruit.count);

                // Refresh UI
                if (this.inventoryPanel.isVisible()) {
                    this.inventoryPanel.refresh();
                }
                this.inventoryPanel.notifyItemAdded();
                this.game.shopMenu.updateAffordability();
                this.game.stateManager.scheduleSave(this.game.getGameState());

                return true;
            }

            // Check for barrel with output
            if (entity.type === 'barrel' && entity.outputSlot) {
                const output = entity.takeFromOutput();
                if (!output) return false;

                // Check if inventory has room
                if (!this.inventoryManager.hasRoomFor(output.itemId)) {
                    // Put output back
                    entity.outputSlot = output;
                    return false;
                }

                // Add output to inventory
                this.inventoryManager.addItem(output.itemId, output.count);

                // Refresh UI
                if (this.inventoryPanel.isVisible()) {
                    this.inventoryPanel.refresh();
                }
                this.inventoryPanel.notifyItemAdded();
                this.game.shopMenu.updateAffordability();
                this.game.stateManager.scheduleSave(this.game.getGameState());

                return true;
            }

            // Gloves tool doesn't work on anything else
            return false;
        }

        // Must be a plant to harvest (for non-gloves tools)
        if (entity.type !== 'plant') return false;

        const plant = entity;

        // Must be mature
        if (!plant.canHarvest()) return false;

        // Must take fruit first (if fruiting plant)
        if (plant.hasFruit()) return false;

        // Validate correct tool for plant type
        const targetItem = this.itemRegistry.getItem(plant.targetItemId);
        if (!targetItem) return false;

        // Handle scissors (flowers/grains)
        if (tool === 'scissors') {
            // Scissors only work on flowers and grains
            if (targetItem.plantType !== 'flower' && targetItem.plantType !== 'grain') {
                return false;
            }
        }
        // Handle saw (trees only)
        else if (tool === 'saw') {
            // Saw only works on trees
            if (targetItem.plantType !== 'tree') {
                return false;
            }
        }
        // Unknown tool
        else {
            return false;
        }

        // Perform harvest
        const harvestedItemId = plant.harvest(this.itemRegistry);

        // Add to inventory
        if (!this.inventoryManager.hasRoomFor(harvestedItemId)) {
            return false; // Inventory full
        }

        this.inventoryManager.addItem(harvestedItemId, 1);

        // Remove plant entity
        const index = this.game.entities.indexOf(plant);
        if (index > -1) {
            this.game.entities.splice(index, 1);
        }

        // Refresh inventory panel if visible
        if (this.inventoryPanel.isVisible()) {
            this.inventoryPanel.refresh();
        }

        // Notify inventory about new item
        this.inventoryPanel.notifyItemAdded();

        // Update shop affordability
        this.game.shopMenu.updateAffordability();

        // Save state
        this.game.stateManager.scheduleSave(this.game.getGameState());

        return true;
    }

    placeItemOnTile(itemId, slotIndex, tileX, tileY) {
        const item = this.itemRegistry.getItem(itemId);
        if (!item) {
            console.error(`Cannot place item: ${itemId} not found`);
            return;
        }

        // Validate item is placeable (seed or structure)
        if (item.itemType !== 'seed' && item.itemType !== 'structure') {
            console.warn(`Cannot place ${item.name}: only seeds and structures can be placed`);
            this.inventoryPanel.clearSelection();
            return;
        }

        // Ensure tile coordinates are integers
        tileX = Math.floor(tileX);
        tileY = Math.floor(tileY);

        // Get the tile at this position
        const tile = this.game.chunkManager.getTile(tileX, tileY);
        if (!tile) {
            console.warn('Cannot place item: tile not found');
            this.inventoryPanel.clearSelection();
            return;
        }

        // Check if tile is grass
        if (tile.type !== 'grass') {
            console.warn('Cannot place item: can only place on grass tiles');
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

        // Valid placement - create the appropriate entity
        if (item.itemType === 'seed') {
            this.game.createPlantEntity(itemId, tileX, tileY);
        } else if (item.itemType === 'structure') {
            if (itemId === 'fence') {
                this.game.createFenceEntity(itemId, tileX, tileY);
            } else if (itemId === 'barrel') {
                this.game.createBarrelEntity(itemId, tileX, tileY);
            }
        }

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
                        this.inventoryPanel.previewPanel.show(updatedSlot.itemId, onSell, onSellAll);
                    }
                }
            };

            const onSellAll = () => {
                const item = this.itemRegistry.getItem(slot.itemId);
                if (item && item.salePrice > 0) {
                    const totalCount = this.inventoryManager.getItemCount(slot.itemId);
                    const totalValue = totalCount * item.salePrice;
                    this.inventoryManager.removeItem(slot.itemId, totalCount);
                    this.game.addMoney(totalValue);
                    this.inventoryPanel.clearSelection();
                    this.inventoryPanel.refresh();
                }
            };

            this.inventoryPanel.previewPanel.show(slot.itemId, onSell, onSellAll);
        }

        // Save state
        this.game.stateManager.scheduleSave(this.game.getGameState());
    }

    showPlantMenu(plant) {
        // Convert plant world coordinates to screen coordinates
        const screenPos = this.renderer.worldToScreen(plant.x + 0.5, plant.y + 0.5);

        // Show the plant info panel
        this.plantInfoPanel.show(
            plant,
            screenPos.x,
            screenPos.y,
            (harvestedPlant) => {
                this.harvestPlant(harvestedPlant);
            },
            (fruitPlant) => {
                this.takePlantFruit(fruitPlant);
            }
        );
    }

    takePlantFruit(plant) {
        // Take fruit from the plant
        const taken = plant.takeFruit();
        if (!taken) {
            return;
        }

        // Add to inventory
        if (this.inventoryManager.hasRoomFor(taken.itemId)) {
            this.inventoryManager.addItem(taken.itemId, taken.count);

            // Unlock gloves tool (first time collecting output)
            if (!this.game.player.hasCollectedOutput) {
                this.game.player.hasCollectedOutput = true;
                this.game.checkToolUnlocks();
            }

            // Notify about new item
            this.game.inventoryPanel.notifyItemAdded();

            // Refresh panels
            if (this.game.inventoryPanel.isVisible()) {
                this.game.inventoryPanel.refresh();
            }

            // Hide and reshow the plant panel to update the fruit slot
            this.plantInfoPanel.hide();
            this.showPlantMenu(plant);

            // Save state
            this.game.stateManager.scheduleSave(this.game.getGameState());
        } else {
            console.warn('Inventory is full, cannot take fruit');
        }
    }

    harvestPlant(plant) {
        // Check if plant requires a tool
        if (plant.requiresTool(this.itemRegistry)) {
            const requiredTool = plant.getRequiredTool(this.itemRegistry);
            if (!this.game.player.ownedTools || !this.game.player.ownedTools.includes(requiredTool)) {
                console.warn(`Cannot harvest: ${requiredTool} required`);
                return;
            }
        }

        const harvestedItemId = plant.harvest(this.itemRegistry);

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

            // Update shop affordability (items may now meet requirements)
            this.game.shopMenu.updateAffordability();

            // Save state
            this.game.stateManager.scheduleSave(this.game.getGameState());
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
        if (!item || (item.itemType !== 'seed' && item.itemType !== 'structure')) return;

        // Convert mouse position to world coordinates
        const worldPos = this.renderer.screenToWorld(this.currentMousePos.x, this.currentMousePos.y);
        const tileX = Math.floor(worldPos.x);
        const tileY = Math.floor(worldPos.y);

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

        ctx.save();
        ctx.globalAlpha = GameConfig.ENTITIES.PLACEMENT_PREVIEW_OPACITY;

        // Handle image-based items differently from emoji items
        if (item.image) {
            // For image-based items (like fences), render the image
            const image = this.game.assetLoader.getAsset(item.image);
            if (image) {
                ctx.drawImage(
                    image,
                    screenX,
                    screenY,
                    tileSize,
                    tileSize
                );
            }
        } else {
            // For emoji-based items, render the emoji
            const scale = item.overworldScale !== undefined ? item.overworldScale : GameConfig.ENTITIES.DEFAULT_OVERWORLD_SCALE;
            const fontSize = Math.floor(GameConfig.ENTITIES.RENDER_EMOJI_FONT_SIZE * scale);

            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                item.emoji,
                screenX + (tileSize / 2),
                screenY + (tileSize / 2)
            );
        }

        ctx.restore();
    }
}
