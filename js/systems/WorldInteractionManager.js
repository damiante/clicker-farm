import { PlantInfoPanel } from './PlantInfoPanel.js';
import { FenceInfoPanel } from './FenceInfoPanel.js';
import { BarrelInfoPanel } from './BarrelInfoPanel.js';
import { MineInfoPanel } from './MineInfoPanel.js';
import { FurnaceInfoPanel } from './FurnaceInfoPanel.js';
import { CrateInfoPanel } from './CrateInfoPanel.js';
import { NPCInfoPanel } from './NPCInfoPanel.js';
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
        this.plantInfoPanel = new PlantInfoPanel(itemRegistry, game, game.assetLoader);
        this.fenceInfoPanel = new FenceInfoPanel(itemRegistry, game.assetLoader);
        this.barrelInfoPanel = new BarrelInfoPanel(itemRegistry, game.assetLoader);
        this.mineInfoPanel = new MineInfoPanel(itemRegistry, game.assetLoader);
        this.furnaceInfoPanel = new FurnaceInfoPanel(itemRegistry, game.assetLoader);
        this.crateInfoPanel = new CrateInfoPanel(itemRegistry, game.assetLoader);
        this.npcInfoPanel = new NPCInfoPanel(itemRegistry, game.assetLoader);

        this.lastPointerDownPos = null;
        this.currentMousePos = null;  // Track mouse position for placement preview
        this.isDragging = false;  // Track if user is dragging
        this.lastPaintedTile = null;  // Track the last painted tile (allows re-painting if cursor moves away and back)
        this.lastPaintedEntity = null;  // Track the last entity interacted with during drag
        this.justPlacedItem = false;  // Track if item was placed during current click sequence
        this.setupListeners();
    }

    setupListeners() {
        // Track pointer down position
        this.inputManager.on('pointerdown', (event) => {
            this.lastPointerDownPos = { x: event.position.x, y: event.position.y };
            this.isDragging = false;
            this.lastPaintedTile = null;
            this.lastPaintedEntity = null;
            this.justPlacedItem = false;

            const worldPos = this.renderer.screenToWorld(event.position.x, event.position.y);
            const tileX = Math.floor(worldPos.x);
            const tileY = Math.floor(worldPos.y);
            const tileKey = `${tileX},${tileY}`;

            // Check for tool or item selection
            const selectedTool = this.toolsPanel ? this.toolsPanel.getSelectedTool() : null;
            const selectedItem = this.inventoryPanel.getSelectedItem();

            // If gloves selected (no item), try to collect output
            if (selectedTool === 'gloves' && !selectedItem) {
                const entity = this.getEntityAtTile(tileX, tileY);
                if (this.tryCollectOutput(tileX, tileY)) {
                    this.lastPaintedEntity = entity;
                    this.lastPaintedTile = tileKey;
                    this.justPlacedItem = true;
                }
            }
            // If other tool is selected (scissors, saw), try to harvest
            else if (selectedTool) {
                if (this.tryHarvestWithTool(selectedTool, tileX, tileY)) {
                    this.lastPaintedTile = tileKey;
                    this.justPlacedItem = true;
                }
            }
            // If item selected (no tool), try to paint into slot OR place on world
            else if (selectedItem) {
                // Try painting into slot first (requires gloves owned)
                const entity = this.getEntityAtTile(tileX, tileY);
                if (this.tryPaintIntoSlot(tileX, tileY)) {
                    this.lastPaintedEntity = entity;
                    this.lastPaintedTile = tileKey;
                    this.justPlacedItem = true;
                }
                // Otherwise try placing on world
                else if (this.tryPlaceItem(selectedItem.itemId, selectedItem.slotIndex, tileX, tileY)) {
                    this.lastPaintedTile = tileKey;
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
                        const tileX = Math.floor(worldPos.x);
                        const tileY = Math.floor(worldPos.y);
                        const tileKey = `${tileX},${tileY}`;

                        // Get entity at current tile for entity-based tracking
                        const entity = this.getEntityAtTile(tileX, tileY);
                        const entityChanged = entity !== this.lastPaintedEntity;
                        const tileChanged = this.lastPaintedTile !== tileKey;

                        // Gloves collecting output: interact when entity changes
                        if (selectedTool === 'gloves' && !selectedItem && entityChanged) {
                            if (this.tryCollectOutput(tileX, tileY)) {
                                this.lastPaintedEntity = entity;
                                this.lastPaintedTile = tileKey;
                                this.justPlacedItem = true;
                            } else {
                                // Even if collection failed, update entity tracker to allow re-entry detection
                                this.lastPaintedEntity = entity;
                            }
                        }
                        // Other tools (scissors, saw): interact when tile changes
                        else if (selectedTool && tileChanged) {
                            if (this.tryHarvestWithTool(selectedTool, tileX, tileY)) {
                                this.lastPaintedTile = tileKey;
                                this.justPlacedItem = true;
                            }
                        }
                        // Item selected: try painting into entity first (entity-based), then world placement (tile-based)
                        else if (selectedItem) {
                            // Try painting into slot first (requires gloves owned) - entity-based
                            if (entity && entityChanged) {
                                if (this.tryPaintIntoSlot(tileX, tileY)) {
                                    this.lastPaintedEntity = entity;
                                    this.lastPaintedTile = tileKey;
                                    this.justPlacedItem = true;
                                } else {
                                    // Even if painting failed, update entity tracker to allow re-entry detection
                                    this.lastPaintedEntity = entity;
                                }
                            }
                            // Otherwise try placing on world - tile-based
                            else if (!entity && tileChanged) {
                                if (this.tryPlaceItem(selectedItem.itemId, selectedItem.slotIndex, tileX, tileY)) {
                                    this.lastPaintedTile = tileKey;
                                }
                                // Update entity tracker when moving to empty space
                                this.lastPaintedEntity = null;
                            }
                        }
                        // Update entity tracker when moving to empty space (no item/tool selected, or tool that doesn't interact)
                        else if (!entity) {
                            this.lastPaintedEntity = null;
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
            this.lastPaintedTile = null;
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
        // Handle multi-tile entities (like 2x2 mine)
        const entity = this.game.entities.find(e => {
            const ex = Math.floor(e.x);
            const ey = Math.floor(e.y);

            // Check if entity occupies this tile
            if (e.width && e.height) {
                // Multi-tile entity
                return tileX >= ex && tileX < ex + e.width &&
                       tileY >= ey && tileY < ey + e.height;
            } else {
                // Single-tile entity
                return ex === tileX && ey === tileY;
            }
        });

        if (entity) {
            if (entity.type === 'plant') {
                this.showPlantMenu(entity);
            } else if (entity.type === 'fence') {
                this.showFenceMenu(entity);
            } else if (entity.type === 'barrel') {
                this.showBarrelMenu(entity);
            } else if (entity.type === 'mine') {
                this.showMineMenu(entity);
            } else if (entity.type === 'furnace') {
                this.showFurnaceMenu(entity);
            } else if (entity.type === 'crate') {
                this.showCrateMenu(entity);
            } else if (entity.type === 'npc') {
                this.showNPCMenu(entity);
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
            (clickedBarrel) => this.onBarrelOutputSlotClick(clickedBarrel),
            this.inventoryManager
        );
    }

    onBarrelInputSlotClick(barrel) {
        // Check if slot has items (taking out)
        if (barrel.inputSlot) {
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
            return;
        }

        // Slot is empty - get selected item from inventory or show dropdown
        const selectedItem = this.inventoryPanel.getSelectedItem();

        if (!selectedItem) {
            // No item selected - show dropdown menu
            this.barrelInfoPanel.showItemDropdown((selectedItemId) => {
                this.placeItemInBarrel(barrel, selectedItemId);
            });
            return;
        }

        // Item is selected - place it directly
        this.placeItemInBarrel(barrel, selectedItem.itemId);
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

    showMineMenu(mine) {
        const screenPos = this.renderer.worldToScreen(mine.x + 1, mine.y + 1); // Center of 2x2 mine

        this.mineInfoPanel.show(
            mine,
            screenPos.x,
            screenPos.y,
            (clickedMine) => this.onMineClick(clickedMine),
            (destroyedMine) => this.destroyStructure(destroyedMine),
            (clickedMine, slotIndex) => this.onMineSlotClick(clickedMine, slotIndex)
        );
    }

    onMineClick(mine) {
        // Execute mine operation
        const results = mine.mine();

        // Refresh mine panel to show new items
        if (this.mineInfoPanel.isVisible()) {
            this.mineInfoPanel.refresh();
        }

        // Save state
        this.game.stateManager.scheduleSave(this.game.getGameState());
    }

    onMineSlotClick(mine, slotIndex) {
        // Take items from mine output slot
        const taken = mine.takeFromSlot(slotIndex);
        if (!taken) {
            return;
        }

        // Add to inventory
        if (this.inventoryManager.hasRoomFor(taken.itemId)) {
            this.inventoryManager.addItem(taken.itemId, taken.count);

            // Notify about new item
            this.game.inventoryPanel.notifyItemAdded();

            // Refresh panels
            if (this.game.inventoryPanel.isVisible()) {
                this.game.inventoryPanel.refresh();
            }
            if (this.mineInfoPanel.isVisible()) {
                this.mineInfoPanel.refresh();
            }

            // Update shop affordability
            this.game.shopMenu.updateAffordability();

            // Save state
            this.game.stateManager.scheduleSave(this.game.getGameState());
        } else {
            // Put items back if inventory is full
            mine.outputSlots[slotIndex] = taken;
            console.warn('Inventory is full, cannot take items from mine');
        }
    }

    showFurnaceMenu(furnace) {
        const screenPos = this.renderer.worldToScreen(furnace.x + 0.5, furnace.y + 0.5);

        this.furnaceInfoPanel.show(
            furnace,
            screenPos.x,
            screenPos.y,
            (destroyedFurnace) => this.destroyStructure(destroyedFurnace),
            (clickedFurnace) => this.onFurnaceSmeltSlotClick(clickedFurnace),
            (clickedFurnace) => this.onFurnaceFuelSlotClick(clickedFurnace),
            (clickedFurnace) => this.onFurnaceOutputSlotClick(clickedFurnace),
            this.inventoryManager
        );
    }

    onFurnaceSmeltSlotClick(furnace) {
        // Check if slot has items (taking out)
        if (furnace.smeltSlot) {
            // Take items from smelt slot
            const taken = furnace.takeFromSmeltSlot();
            if (!taken) return;

            if (this.inventoryManager.hasRoomFor(taken.itemId)) {
                this.inventoryManager.addItem(taken.itemId, taken.count);
                this.game.inventoryPanel.notifyItemAdded();

                if (this.game.inventoryPanel.isVisible()) {
                    this.game.inventoryPanel.refresh();
                }
                if (this.furnaceInfoPanel.isVisible()) {
                    this.furnaceInfoPanel.refresh();
                }

                this.game.shopMenu.updateAffordability();
                this.game.stateManager.scheduleSave(this.game.getGameState());
            } else {
                // Put items back
                furnace.smeltSlot = taken;
                console.warn('Inventory is full');
            }
            return;
        }

        // Slot is empty - check for selected item or show dropdown
        const selectedItem = this.inventoryPanel.getSelectedItem();

        if (!selectedItem) {
            // No item selected - show dropdown menu
            this.furnaceInfoPanel.showSmeltDropdown((selectedItemId) => {
                this.placeItemInFurnaceSmeltSlot(furnace, selectedItemId);
            });
            return;
        }

        // Item is selected - place it directly
        this.placeItemInFurnaceSmeltSlot(furnace, selectedItem.itemId);
    }

    placeItemInFurnaceSmeltSlot(furnace, itemId) {
        // Place item in smelt slot
        const result = furnace.placeInSmeltSlot(itemId, 1, this.game.player.maxStackSize);

        // Remove from inventory
        this.inventoryManager.removeItem(itemId, 1);

        // Handle swapped items
        if (result && result.swapped) {
            this.inventoryManager.addItem(result.swapped.itemId, result.swapped.count);
        }

        // Refresh panels
        this.inventoryPanel.refresh();
        if (this.furnaceInfoPanel.isVisible()) {
            this.furnaceInfoPanel.refresh();
        }

        // Check if item still exists in inventory
        const remainingCount = this.inventoryManager.getItemCount(itemId);
        if (remainingCount === 0) {
            this.inventoryPanel.clearSelection();
        }

        // Update shop and save
        this.game.shopMenu.updateAffordability();
        this.game.stateManager.scheduleSave(this.game.getGameState());
    }

    onFurnaceFuelSlotClick(furnace) {
        // Check if slot has items (taking out)
        if (furnace.fuelSlot) {
            // Take items from fuel slot
            const taken = furnace.takeFromFuelSlot();
            if (!taken) return;

            if (this.inventoryManager.hasRoomFor(taken.itemId)) {
                this.inventoryManager.addItem(taken.itemId, taken.count);
                this.game.inventoryPanel.notifyItemAdded();

                if (this.game.inventoryPanel.isVisible()) {
                    this.game.inventoryPanel.refresh();
                }
                if (this.furnaceInfoPanel.isVisible()) {
                    this.furnaceInfoPanel.refresh();
                }

                this.game.shopMenu.updateAffordability();
                this.game.stateManager.scheduleSave(this.game.getGameState());
            } else {
                // Put items back
                furnace.fuelSlot = taken;
                console.warn('Inventory is full');
            }
            return;
        }

        // Slot is empty - check for selected item or show dropdown
        const selectedItem = this.inventoryPanel.getSelectedItem();

        if (!selectedItem) {
            // No item selected - show dropdown menu
            this.furnaceInfoPanel.showFuelDropdown((selectedItemId) => {
                this.placeItemInFurnaceFuelSlot(furnace, selectedItemId);
            });
            return;
        }

        // Item is selected - place it directly
        this.placeItemInFurnaceFuelSlot(furnace, selectedItem.itemId);
    }

    placeItemInFurnaceFuelSlot(furnace, itemId) {
        // Place item in fuel slot
        const result = furnace.placeInFuelSlot(itemId, 1, this.game.player.maxStackSize);

        // Remove from inventory
        this.inventoryManager.removeItem(itemId, 1);

        // Handle swapped items
        if (result && result.swapped) {
            this.inventoryManager.addItem(result.swapped.itemId, result.swapped.count);
        }

        // Refresh panels
        this.inventoryPanel.refresh();
        if (this.furnaceInfoPanel.isVisible()) {
            this.furnaceInfoPanel.refresh();
        }

        // Check if item still exists in inventory
        const remainingCount = this.inventoryManager.getItemCount(itemId);
        if (remainingCount === 0) {
            this.inventoryPanel.clearSelection();
        }

        // Update shop and save
        this.game.shopMenu.updateAffordability();
        this.game.stateManager.scheduleSave(this.game.getGameState());
    }

    onFurnaceOutputSlotClick(furnace) {
        const taken = furnace.takeFromOutput();
        if (!taken) return;

        if (this.inventoryManager.hasRoomFor(taken.itemId)) {
            this.inventoryManager.addItem(taken.itemId, taken.count);
            this.game.inventoryPanel.notifyItemAdded();

            if (this.game.inventoryPanel.isVisible()) {
                this.game.inventoryPanel.refresh();
            }
            if (this.furnaceInfoPanel.isVisible()) {
                this.furnaceInfoPanel.refresh();
            }

            this.game.shopMenu.updateAffordability();
            this.game.stateManager.scheduleSave(this.game.getGameState());
        } else {
            furnace.outputSlot = taken;
            console.warn('Inventory is full');
        }
    }

    showCrateMenu(crate) {
        const screenPos = this.renderer.worldToScreen(crate.x + 0.5, crate.y + 0.5);

        this.crateInfoPanel.show(
            crate,
            screenPos.x,
            screenPos.y,
            (destroyedCrate) => this.destroyStructure(destroyedCrate),
            (clickedCrate, slotIndex, itemId) => this.onCrateSlotClick(clickedCrate, slotIndex, itemId),
            this.inventoryManager
        );
    }

    onCrateSlotClick(crate, slotIndex, dropdownItemId = null) {
        // Check if clicking on slot with items (taking out)
        if (!dropdownItemId && crate.slots[slotIndex]) {
            // Take items from crate slot
            const taken = crate.takeFromSlot(slotIndex);
            if (!taken) return;

            if (this.inventoryManager.hasRoomFor(taken.itemId)) {
                this.inventoryManager.addItem(taken.itemId, taken.count);
                this.game.inventoryPanel.notifyItemAdded();

                if (this.game.inventoryPanel.isVisible()) {
                    this.game.inventoryPanel.refresh();
                }
                if (this.crateInfoPanel.isVisible()) {
                    this.crateInfoPanel.refresh();
                }

                this.game.shopMenu.updateAffordability();
                this.game.stateManager.scheduleSave(this.game.getGameState());
            } else {
                // Put items back
                crate.slots[slotIndex] = taken;
                console.warn('Inventory is full');
            }
            return;
        }

        // Placing items into crate slot (from selection or dropdown)
        const selectedItem = this.inventoryPanel.getSelectedItem();
        const itemIdToPlace = dropdownItemId || (selectedItem ? selectedItem.itemId : null);

        if (itemIdToPlace) {
            // Get count from inventory
            const count = this.inventoryManager.getItemCount(itemIdToPlace);
            if (count === 0) return;

            // Place items in crate
            const result = crate.placeInSlot(slotIndex, itemIdToPlace, count, this.game.player.maxStackSize);

            // Remove from inventory
            this.inventoryManager.removeItem(itemIdToPlace, count);

            // Handle swapped items
            if (result && result.swapped) {
                this.inventoryManager.addItem(result.swapped.itemId, result.swapped.count);
            }

            // Handle overflow
            if (result && result.overflow) {
                this.inventoryManager.addItem(result.overflow.itemId, result.overflow.count);
            }

            // Clear selection and refresh
            if (selectedItem) {
                this.inventoryPanel.clearSelection();
            }
            this.inventoryPanel.refresh();
            if (this.crateInfoPanel.isVisible()) {
                this.crateInfoPanel.refresh();
            }

            this.game.shopMenu.updateAffordability();
            this.game.stateManager.scheduleSave(this.game.getGameState());
        }
    }

    showNPCMenu(npc) {
        const screenPos = this.renderer.worldToScreen(npc.x + 0.5, npc.y + 0.5);

        this.npcInfoPanel.show(
            npc,
            screenPos.x,
            screenPos.y,
            (clickedNPC) => this.onNPCTakeItem(clickedNPC)
        );
    }

    onNPCTakeItem(npc) {
        const taken = npc.takeItem();
        if (!taken) return;

        if (this.inventoryManager.hasRoomFor(taken.itemId)) {
            this.inventoryManager.addItem(taken.itemId, taken.count);
            this.game.inventoryPanel.notifyItemAdded();

            // Unlock gloves tool (first time collecting output)
            if (!this.game.player.hasCollectedOutput) {
                this.game.player.hasCollectedOutput = true;
                this.game.checkToolUnlocks();
            }

            // Immediately trigger NPC behavior update to react to missing item
            if (npc.behavior) {
                npc.behavior.update(0);
            }

            if (this.game.inventoryPanel.isVisible()) {
                this.game.inventoryPanel.refresh();
            }
            if (this.npcInfoPanel.isVisible()) {
                this.npcInfoPanel.refresh();
            }

            this.game.shopMenu.updateAffordability();
            this.game.stateManager.scheduleSave(this.game.getGameState());
        } else {
            npc.itemSlot = taken;
            console.warn('Inventory is full');
        }
    }

    destroyStructure(structure) {
        // Remove structure entity
        this.game.removeEntity(structure);

        // Save state
        this.game.stateManager.scheduleSave(this.game.getGameState());
    }

    tryPlaceItem(itemId, _slotIndex, tileX, tileY) {
        // Silent version of placeItemOnTile for drag painting
        // Returns true if placement succeeded, false otherwise
        // Note: slotIndex parameter is kept for API compatibility but not used

        const item = this.itemRegistry.getItem(itemId);
        if (!item) return false;

        // Check if player has this item in inventory
        if (this.inventoryManager.getItemCount(itemId) === 0) return false;

        // Ensure tile coordinates are integers
        tileX = Math.floor(tileX);
        tileY = Math.floor(tileY);

        // Validate item is placeable
        if (item.itemType !== 'seed' && item.itemType !== 'structure' && item.itemType !== 'npc') return false;

        // Check for multi-tile entities (like Mine which is 2x2)
        const width = item.multiTile ? item.multiTile.width : 1;
        const height = item.multiTile ? item.multiTile.height : 1;

        // Validate all tiles are grass and not occupied
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const checkX = tileX + dx;
                const checkY = tileY + dy;

                // Check if tile is grass
                const tile = this.game.chunkManager.getTile(checkX, checkY);
                if (!tile || tile.type !== 'grass') return false;

                // Check if there's already an entity at this position
                const existingEntity = this.game.entities.find(e => {
                    const ex = Math.floor(e.x);
                    const ey = Math.floor(e.y);
                    if (e.width && e.height) {
                        // Multi-tile entity - check if it overlaps
                        return checkX >= ex && checkX < ex + e.width &&
                               checkY >= ey && checkY < ey + e.height;
                    } else {
                        // Single-tile entity
                        return ex === checkX && ey === checkY;
                    }
                });
                if (existingEntity) return false;
            }
        }

        // Valid placement - create the appropriate entity
        if (item.itemType === 'seed') {
            this.game.createPlantEntity(itemId, tileX, tileY);
        } else if (item.itemType === 'structure') {
            if (itemId === 'fence') {
                this.game.createFenceEntity(itemId, tileX, tileY);
            } else if (itemId === 'barrel') {
                this.game.createBarrelEntity(itemId, tileX, tileY);
            } else if (itemId === 'mine') {
                this.game.createMineEntity(itemId, tileX, tileY);
            } else if (itemId === 'furnace') {
                this.game.createFurnaceEntity(itemId, tileX, tileY);
            } else if (itemId === 'crate') {
                this.game.createCrateEntity(itemId, tileX, tileY);
            }
        } else if (item.itemType === 'npc') {
            if (itemId === 'farmer') {
                this.game.createFarmerEntity(itemId, tileX, tileY);
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

        // Find entity at this tile position (supports multi-tile entities)
        const entity = this.getEntityAtTile(tileX, tileY);
        if (!entity) return false;

        // Gloves are now handled by tryCollectOutput() in the painting system
        // This method only handles scissors and saw tools

        // Must be a plant to harvest
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

    getEntityAtTile(tileX, tileY) {
        // Find entity at tile position, accounting for multi-tile entities
        // Returns the entity or null if no entity found
        return this.game.entities.find(e => {
            const entityX = Math.floor(e.x);
            const entityY = Math.floor(e.y);
            const entityWidth = e.width || 1;
            const entityHeight = e.height || 1;

            // Check if tile is within entity's bounding box
            return tileX >= entityX && tileX < entityX + entityWidth &&
                   tileY >= entityY && tileY < entityY + entityHeight;
        });
    }

    tryPaintIntoSlot(tileX, tileY) {
        // Try to paint selected inventory item into entity slot using gloves
        // Returns true if painting succeeded, false otherwise

        console.log(`[Painting] tryPaintIntoSlot called at (${tileX}, ${tileY})`);

        // Require inventory item to be selected
        const selectedItem = this.inventoryPanel.getSelectedItem();
        console.log(`[Painting] selectedItem:`, selectedItem);
        if (!selectedItem) {
            console.log(`[Painting] No item selected, exiting`);
            return false;
        }

        // Require NO tool to be selected (item selection is mutually exclusive with tool selection)
        const selectedTool = this.toolsPanel ? this.toolsPanel.getSelectedTool() : null;
        console.log(`[Painting] selectedTool:`, selectedTool);
        if (selectedTool) {
            console.log(`[Painting] Tool is selected, cannot paint items (mutually exclusive)`);
            return false;
        }

        // Require gloves to be owned (not selected - that's for collecting outputs)
        const hasGloves = this.game.player.ownedTools && this.game.player.ownedTools.includes('gloves');
        console.log(`[Painting] hasGloves:`, hasGloves);
        if (!hasGloves) {
            console.log(`[Painting] Gloves not owned, cannot paint into slots`);
            return false;
        }

        // Ensure tile coordinates are integers
        tileX = Math.floor(tileX);
        tileY = Math.floor(tileY);

        // Find entity at this tile position (supports multi-tile entities)
        const entity = this.getEntityAtTile(tileX, tileY);
        if (!entity) return false;

        console.log(`[Painting] Found entity: ${entity.type}, item: ${selectedItem.itemId}`);

        // Check if entity has painting interface
        if (!entity.acceptsItemInSlot || !entity.placeItemInSlot) {
            console.log(`[Painting] Entity ${entity.type} does not have painting interface`);
            return false;
        }

        // Check if entity accepts this item
        const slotType = entity.acceptsItemInSlot(selectedItem.itemId, this.itemRegistry);
        console.log(`[Painting] Entity ${entity.type} acceptsItemInSlot returned: ${slotType}`);
        if (!slotType) {
            return false;
        }

        // Try to place one item into the slot
        const success = entity.placeItemInSlot(
            selectedItem.itemId,
            slotType,
            1,  // Place one at a time during painting
            this.game.player.maxStackSize,
            this.itemRegistry
        );

        console.log(`[Painting] placeItemInSlot returned: ${success}`);

        if (success) {
            // Remove one item from inventory
            this.inventoryManager.removeItem(selectedItem.itemId, 1);

            // Check if that was the last item of this type and clear selection if so
            const remainingCount = this.inventoryManager.getItemCount(selectedItem.itemId);
            if (remainingCount === 0) {
                this.inventoryPanel.clearSelection();
            }

            // Refresh inventory panel if visible
            if (this.inventoryPanel.isVisible()) {
                this.inventoryPanel.refresh();
            }

            // Update shop affordability
            this.game.shopMenu.updateAffordability();

            // Save state
            this.game.stateManager.scheduleSave(this.game.getGameState());

            return true;
        }

        return false;
    }

    tryCollectOutput(tileX, tileY) {
        // Try to collect output from entity using gloves (no item selected)
        // Returns true if collection succeeded, false otherwise

        // Require gloves tool to be selected
        const selectedTool = this.toolsPanel ? this.toolsPanel.getSelectedTool() : null;
        if (selectedTool !== 'gloves') {
            return false;
        }

        // Require NO item to be selected
        const selectedItem = this.inventoryPanel.getSelectedItem();
        if (selectedItem) {
            return false;
        }

        // Ensure tile coordinates are integers
        tileX = Math.floor(tileX);
        tileY = Math.floor(tileY);

        // Find entity at this tile position (supports multi-tile entities)
        const entity = this.getEntityAtTile(tileX, tileY);
        if (!entity) return false;

        // Check if entity has output collection interface
        if (!entity.hasOutputToCollect || !entity.collectFirstOutput) {
            return false;
        }

        // Check if entity has output to collect
        if (!entity.hasOutputToCollect()) {
            return false;
        }

        // Note: We can't check inventory space before collecting because we don't know
        // what item will be collected without actually calling collectFirstOutput().
        // We'll just fail if inventory is full - the items stay in the entity.

        // Try to collect the output
        const collected = entity.collectFirstOutput();
        if (!collected) {
            return false;
        }

        // Check if inventory has room for the collected items
        if (!this.inventoryManager.hasRoomFor(collected.itemId)) {
            // Can't add to inventory - need to put items back
            // We'll attempt to restore them to the entity
            if (entity.type === 'barrel' || entity.type === 'furnace') {
                // Restore to output slot
                entity.outputSlot = collected;
            } else if (entity.type === 'plant') {
                // Restore to fruit slot
                entity.fruitSlot = collected;
            } else if (entity.type === 'mine') {
                // Find the appropriate slot to restore to
                if (collected.itemId === 'rock') {
                    entity.outputSlots[0] = collected;
                } else if (collected.itemId === 'ore') {
                    entity.outputSlots[1] = collected;
                } else if (collected.itemId === 'coal') {
                    entity.outputSlots[2] = collected;
                }
            } else if (entity.type === 'npc') {
                // Restore to item slot
                entity.itemSlot = collected;
            }
            return false;
        }

        // Add collected items to inventory
        this.inventoryManager.addItem(collected.itemId, collected.count);

        // Refresh inventory panel if visible
        if (this.inventoryPanel.isVisible()) {
            this.inventoryPanel.refresh();
        }

        // Notify inventory about new item
        this.inventoryPanel.notifyItemAdded();

        // Update shop affordability
        this.game.shopMenu.updateAffordability();

        // Check tool unlocks (e.g., first fruit collection)
        this.game.checkToolUnlocks();

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

        // Validate item is placeable (seed, structure, or npc)
        if (item.itemType !== 'seed' && item.itemType !== 'structure' && item.itemType !== 'npc') {
            console.warn(`Cannot place ${item.name}: only seeds, structures, and NPCs can be placed`);
            this.inventoryPanel.clearSelection();
            return;
        }

        // Ensure tile coordinates are integers
        tileX = Math.floor(tileX);
        tileY = Math.floor(tileY);

        // Check for multi-tile entities (like Mine which is 2x2)
        const width = item.multiTile ? item.multiTile.width : 1;
        const height = item.multiTile ? item.multiTile.height : 1;

        // Validate all tiles are grass and not occupied
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const checkX = tileX + dx;
                const checkY = tileY + dy;

                // Check if tile exists
                const tile = this.game.chunkManager.getTile(checkX, checkY);
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
                const existingEntity = this.game.entities.find(e => {
                    const ex = Math.floor(e.x);
                    const ey = Math.floor(e.y);
                    if (e.width && e.height) {
                        // Multi-tile entity - check if it overlaps
                        return checkX >= ex && checkX < ex + e.width &&
                               checkY >= ey && checkY < ey + e.height;
                    } else {
                        // Single-tile entity
                        return ex === checkX && ey === checkY;
                    }
                });

                if (existingEntity) {
                    console.warn('Cannot place item: tile is already occupied');
                    this.inventoryPanel.clearSelection();
                    return;
                }
            }
        }

        // Valid placement - create the appropriate entity
        if (item.itemType === 'seed') {
            this.game.createPlantEntity(itemId, tileX, tileY);
        } else if (item.itemType === 'structure') {
            if (itemId === 'fence') {
                this.game.createFenceEntity(itemId, tileX, tileY);
            } else if (itemId === 'barrel') {
                this.game.createBarrelEntity(itemId, tileX, tileY);
            } else if (itemId === 'mine') {
                this.game.createMineEntity(itemId, tileX, tileY);
            } else if (itemId === 'furnace') {
                this.game.createFurnaceEntity(itemId, tileX, tileY);
            } else if (itemId === 'crate') {
                this.game.createCrateEntity(itemId, tileX, tileY);
            }
        } else if (item.itemType === 'npc') {
            if (itemId === 'farmer') {
                this.game.createFarmerEntity(itemId, tileX, tileY);
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

        // Get multi-tile dimensions if applicable
        const width = item.multiTile ? item.multiTile.width : 1;
        const height = item.multiTile ? item.multiTile.height : 1;

        // Check if all tiles in the area are valid for placement
        let allValid = true;
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const checkX = tileX + dx;
                const checkY = tileY + dy;

                const tile = this.game.chunkManager.getTile(checkX, checkY);
                if (!tile || tile.type !== 'grass') {
                    allValid = false;
                    break;
                }

                // Check if tile is already occupied
                const existingEntity = this.game.entities.find(e =>
                    Math.floor(e.x) === checkX && Math.floor(e.y) === checkY
                );
                if (existingEntity) {
                    allValid = false;
                    break;
                }
            }
            if (!allValid) break;
        }

        if (!allValid) return;

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
                    tileSize * width,
                    tileSize * height
                );
            }
        } else {
            // For emoji-based items, render the emoji
            const scale = item.overworldScale !== undefined ? item.overworldScale : GameConfig.ENTITIES.DEFAULT_OVERWORLD_SCALE;
            const fontSize = Math.floor(GameConfig.ENTITIES.RENDER_EMOJI_FONT_SIZE * scale);

            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // For multi-tile structures, center the emoji in the full area
            ctx.fillText(
                item.emoji,
                screenX + (tileSize * width / 2),
                screenY + (tileSize * height / 2)
            );
        }

        ctx.restore();
    }
}
