import { NPCBehavior } from '../NPC.js';

/**
 * Farmer behavior:
 * - Without item: Harvest mature plants or fruits
 * - With item: Deliver to nearest crate with capacity
 */
export class FarmerBehavior extends NPCBehavior {
    constructor(game) {
        super();
        this.game = game;  // Reference to game instance for accessing entities
        this.currentTarget = null;  // Current target entity
        this.state = 'idle';  // 'idle', 'moving_to_harvest', 'harvesting', 'moving_to_deliver', 'delivering'
    }

    update(deltaTime) {
        if (!this.npc) return;

        // Check if NPC has an item
        const hasItem = this.npc.hasItem();

        if (!hasItem) {
            this.handleHarvestingBehavior();
        } else {
            this.handleDeliveringBehavior();
        }
    }

    handleHarvestingBehavior() {
        // Find nearest harvestable plant
        const target = this.findNearestHarvestable();

        if (!target) {
            // No harvestable plants, stay idle
            this.state = 'idle';
            this.currentTarget = null;
            return;
        }

        // Check if we're orthogonally adjacent to target
        if (this.isOrthogonallyAdjacentTo(target.x, target.y)) {
            // We're adjacent, harvest it
            this.harvestTarget(target);
        } else if (!this.npc.isMoving()) {
            // Not adjacent and not moving, move towards it
            const orthPos = this.getOrthogonalPositionNear(target.x, target.y);
            if (orthPos) {
                const success = this.npc.setTarget(orthPos.x, orthPos.y);
                if (success) {
                    this.state = 'moving_to_harvest';
                    this.currentTarget = target;
                } else {
                    // No path found, give up on this target
                    this.state = 'idle';
                    this.currentTarget = null;
                }
            } else {
                // No walkable positions near target
                this.state = 'idle';
                this.currentTarget = null;
            }
        }
    }

    handleDeliveringBehavior() {
        // Check if farmer still has the item (might have been stolen)
        if (!this.npc.hasItem()) {
            // Item was taken, abort delivery and switch to idle
            this.npc.clearPath();
            this.state = 'idle';
            this.currentTarget = null;
            return;
        }

        // Find nearest crate with capacity
        const target = this.findNearestCrateWithCapacity();

        if (!target) {
            // No crates with capacity, stay idle
            this.state = 'idle';
            this.currentTarget = null;
            return;
        }

        // Check if we're orthogonally adjacent to target
        if (this.isOrthogonallyAdjacentTo(target.x, target.y)) {
            // We're adjacent, deliver item
            this.deliverToTarget(target);
        } else if (!this.npc.isMoving()) {
            // Not adjacent and not moving, move towards it
            const orthPos = this.getOrthogonalPositionNear(target.x, target.y);
            if (orthPos) {
                const success = this.npc.setTarget(orthPos.x, orthPos.y);
                if (success) {
                    this.state = 'moving_to_deliver';
                    this.currentTarget = target;
                } else {
                    // No path found, give up on this target
                    this.state = 'idle';
                    this.currentTarget = null;
                }
            } else {
                // No walkable positions near target
                this.state = 'idle';
                this.currentTarget = null;
            }
        }
    }

    findNearestHarvestable() {
        return this.findNearestEntity(this.game.entities, entity => {
            if (entity.type !== 'plant') return false;

            // Check if plant is mature
            if (entity.growthStage !== 'mature') return false;

            // Check plant type
            const plantType = this.getPlantType(entity);

            if (plantType === 'fruiting') {
                // Fruiting plant - only harvestable if it has fruit
                return entity.hasFruit && entity.hasFruit();
            } else if (plantType === 'flower' || plantType === 'grain') {
                // Regular harvestable plants
                return true;
            }

            // Trees and other plants not harvestable by farmer
            return false;
        });
    }

    findNearestCrateWithCapacity() {
        const heldItemId = this.npc.itemSlot?.itemId;
        if (!heldItemId) return null;

        return this.findNearestEntity(this.game.entities, entity => {
            if (entity.type !== 'crate') return false;

            // Check if crate has capacity for this item
            for (let i = 0; i < entity.slots.length; i++) {
                const slot = entity.slots[i];
                if (!slot) {
                    // Empty slot available
                    return true;
                } else if (slot.itemId === heldItemId && slot.count < entity.maxStackSize) {
                    // Same item with space
                    return true;
                }
            }

            return false;
        });
    }

    harvestTarget(target) {
        if (!target) return;

        const plantType = this.getPlantType(target);

        if (plantType === 'fruiting' && target.takeFruit) {
            // Take one fruit from plant
            const fruit = target.takeFruit(1);  // Take 1 fruit
            if (fruit) {
                this.npc.placeItem(fruit.itemId, fruit.count);
                this.state = 'idle';
            }
        } else if (plantType === 'flower' || plantType === 'grain') {
            // Harvest the plant itself
            const itemId = target.targetItemId || target.itemId;
            this.npc.placeItem(itemId, 1);

            // Remove plant from game
            this.game.removeEntity(target);
            this.state = 'idle';
        }

        this.currentTarget = null;
    }

    deliverToTarget(target) {
        if (!target || !this.npc.itemSlot) return;

        const heldItem = this.npc.itemSlot;

        // Find best slot to place item in crate
        let targetSlotIndex = -1;

        // First, look for existing stack of same item
        for (let i = 0; i < target.slots.length; i++) {
            const slot = target.slots[i];
            if (slot && slot.itemId === heldItem.itemId && slot.count < target.maxStackSize) {
                targetSlotIndex = i;
                break;
            }
        }

        // If no existing stack, find empty slot
        if (targetSlotIndex === -1) {
            for (let i = 0; i < target.slots.length; i++) {
                if (!target.slots[i]) {
                    targetSlotIndex = i;
                    break;
                }
            }
        }

        if (targetSlotIndex !== -1) {
            // Place item in crate
            const result = target.placeInSlot(targetSlotIndex, heldItem.itemId, heldItem.count, target.maxStackSize);

            // Clear farmer's item slot
            this.npc.itemSlot = null;

            // Handle overflow (unlikely, but possible)
            if (result && result.overflow) {
                this.npc.placeItem(result.overflow.itemId, result.overflow.count);
            }

            this.state = 'idle';
        }

        this.currentTarget = null;
    }

    getPlantType(plant) {
        // Get plant type from item registry
        if (!this.game.itemRegistry) return null;

        const item = this.game.itemRegistry.getItem(plant.targetItemId || plant.itemId);
        return item?.plantType || null;
    }

    serialize() {
        return {
            state: this.state,
            currentTarget: this.currentTarget ? { x: this.currentTarget.x, y: this.currentTarget.y } : null
        };
    }

    deserialize(data) {
        this.state = data.state || 'idle';
        // currentTarget will be re-found on next update
        this.currentTarget = null;
    }
}
