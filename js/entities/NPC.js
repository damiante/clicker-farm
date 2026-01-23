import { Entity } from './Entity.js';
import { Pathfinding } from '../utils/Pathfinding.js';

/**
 * Base class for NPCs with behavior system
 * NPCs can move, hold items, and execute behaviors
 * NPCs are tile-based and move orthogonally only
 */
export class NPC extends Entity {
    constructor(x, y, npcType, itemId, behavior) {
        super(x, y, 'npc');
        this.npcType = npcType;  // 'farmer', etc.
        this.itemId = itemId;    // Item definition ID
        this.itemSlot = null;    // {itemId, count} - Item held by NPC
        this.behavior = behavior; // NPCBehavior instance
        this.path = [];          // Array of {x, y} positions to follow
        this.tileTransitionTime = 0.75;  // Time in seconds to transition between tiles
        this.currentTileTransitionStart = null;  // Timestamp when current tile transition started
        this.isWalkableCallback = null;  // Function to check if tile is walkable

        // Snap to tile grid
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);

        if (this.behavior) {
            this.behavior.npc = this;
        }
    }

    /**
     * Set callback function to check if tile is walkable
     * @param {Function} callback - Function(x, y) that returns true if walkable
     */
    setIsWalkableCallback(callback) {
        this.isWalkableCallback = callback;
    }

    update(deltaTime) {
        // Execute behavior logic
        if (this.behavior) {
            this.behavior.update(deltaTime);
        }

        // Follow path if one exists
        if (this.path.length > 0) {
            this.followPath(deltaTime);
        }
    }

    followPath(deltaTime) {
        if (this.path.length === 0) {
            this.currentTileTransitionStart = null;
            return;
        }

        const nextPos = this.path[0];
        const currentTime = Date.now() / 1000;  // Convert to seconds

        // Check if we're already at the next position
        if (Math.floor(this.x) === nextPos.x && Math.floor(this.y) === nextPos.y) {
            // Already at target, move to next waypoint
            this.path.shift();
            this.currentTileTransitionStart = null;
            return;
        }

        // If we haven't started transitioning to this tile yet, start now
        if (this.currentTileTransitionStart === null) {
            this.currentTileTransitionStart = currentTime;
        }

        // Check if enough time has elapsed to step to the next tile
        const elapsed = currentTime - this.currentTileTransitionStart;
        if (elapsed >= this.tileTransitionTime) {
            // Snap to next tile
            this.x = nextPos.x;
            this.y = nextPos.y;
            this.path.shift();
            this.currentTileTransitionStart = null;
        }
        // Otherwise, stay at current position and wait
    }

    /**
     * Set target position using pathfinding
     * @param {number} goalX - Goal tile X
     * @param {number} goalY - Goal tile Y
     * @returns {boolean} True if path found, false otherwise
     */
    setTarget(goalX, goalY) {
        if (!this.isWalkableCallback) {
            console.warn('NPC: isWalkableCallback not set, cannot pathfind');
            return false;
        }

        const path = Pathfinding.findPath(
            Math.floor(this.x),
            Math.floor(this.y),
            Math.floor(goalX),
            Math.floor(goalY),
            this.isWalkableCallback,
            100  // Max distance
        );

        if (path) {
            // Remove first position (current position)
            this.path = path.slice(1);
            // Reset transition timer for new path
            this.currentTileTransitionStart = null;
            return true;
        } else {
            this.path = [];
            this.currentTileTransitionStart = null;
            return false;
        }
    }

    // Check if NPC is currently moving
    isMoving() {
        return this.path.length > 0;
    }

    // Check if NPC has reached target (or has no target)
    hasReachedTarget() {
        return this.path.length === 0;
    }

    // Clear current path
    clearPath() {
        this.path = [];
        this.currentTileTransitionStart = null;
    }

    // Place item in NPC's inventory slot
    placeItem(itemId, count) {
        if (!this.itemSlot) {
            this.itemSlot = { itemId, count };
            return null;
        } else if (this.itemSlot.itemId === itemId) {
            this.itemSlot.count += count;
            return null;
        } else {
            // Swap items
            const swapped = { ...this.itemSlot };
            this.itemSlot = { itemId, count };
            return swapped;
        }
    }

    // Take all items from NPC's inventory slot
    takeItem() {
        if (!this.itemSlot) {
            return null;
        }

        const taken = { ...this.itemSlot };
        this.itemSlot = null;
        return taken;
    }

    // Check if NPC is holding an item
    hasItem() {
        return this.itemSlot !== null && this.itemSlot.count > 0;
    }

    // Get overlay icon for held item
    getOverlayIcons() {
        if (!this.itemSlot || !this.itemSlot.itemId) {
            return null;
        }

        return [{
            itemId: this.itemSlot.itemId,
            offsetX: 0.6,   // Lower right of tile
            offsetY: 0.6,
            scale: 0.35
        }];
    }

    render(ctx, cameraX, cameraY, tileSize, assetLoader, itemRegistry) {
        // Calculate screen position (ctx is already scaled by zoom)
        const screenX = Math.floor(this.x * tileSize - cameraX);
        const screenY = Math.floor(this.y * tileSize - cameraY);

        // Get the NPC item to render emoji
        const item = itemRegistry.getItem(this.itemId);

        if (item && item.emoji) {
            // Render emoji
            ctx.save();
            const scale = item.overworldScale || 1.0;
            ctx.font = `${tileSize * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                item.emoji,
                screenX + tileSize / 2,
                screenY + tileSize / 2
            );
            ctx.restore();
        } else {
            // Fallback: render a placeholder
            ctx.save();
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
            ctx.restore();
        }
    }

    serialize() {
        return {
            ...super.serialize(),
            npcType: this.npcType,
            itemId: this.itemId,
            itemSlot: this.itemSlot,
            path: this.path,
            tileTransitionTime: this.tileTransitionTime,
            // Behavior state will be serialized separately if needed
            behaviorState: this.behavior ? this.behavior.serialize() : null
        };
    }

    static deserialize(data, behavior) {
        const npc = new NPC(data.x, data.y, data.npcType, data.itemId, behavior);
        npc.itemSlot = data.itemSlot || null;
        npc.path = data.path || [];
        npc.tileTransitionTime = data.tileTransitionTime || 0.75;
        // Don't restore currentTileTransitionStart - let it reset naturally

        if (npc.behavior && data.behaviorState) {
            npc.behavior.deserialize(data.behaviorState);
        }

        return npc;
    }
}

/**
 * Base class for NPC behaviors
 * Implement this to create different NPC types
 */
export class NPCBehavior {
    constructor() {
        this.npc = null;  // Set by NPC constructor
    }

    /**
     * Update behavior logic
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Override in subclasses
    }

    /**
     * Serialize behavior state
     * @returns {object} Serialized state
     */
    serialize() {
        return {};
    }

    /**
     * Deserialize behavior state
     * @param {object} data - Serialized state
     */
    deserialize(data) {
        // Override in subclasses
    }

    /**
     * Helper: Find nearest entity matching predicate
     * @param {Array} entities - All entities in game
     * @param {Function} predicate - Function to test each entity
     * @returns {Entity|null} Nearest matching entity or null
     */
    findNearestEntity(entities, predicate) {
        let nearest = null;
        let nearestDist = Infinity;

        for (const entity of entities) {
            if (predicate(entity)) {
                const dx = entity.x - this.npc.x;
                const dy = entity.y - this.npc.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = entity;
                }
            }
        }

        return nearest;
    }

    /**
     * Helper: Check if NPC is orthogonally adjacent to position
     * @param {number} x - Target tile X
     * @param {number} y - Target tile Y
     * @returns {boolean} True if orthogonally adjacent
     */
    isOrthogonallyAdjacentTo(x, y) {
        const dx = Math.abs(Math.floor(this.npc.x) - Math.floor(x));
        const dy = Math.abs(Math.floor(this.npc.y) - Math.floor(y));
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    /**
     * Helper: Get orthogonal position next to target that is walkable
     * @param {number} x - Target tile X
     * @param {number} y - Target tile Y
     * @returns {{x: number, y: number}|null} Orthogonal position or null if none walkable
     */
    getOrthogonalPositionNear(x, y) {
        if (!this.npc.isWalkableCallback) {
            console.warn('NPCBehavior: isWalkableCallback not set');
            return null;
        }

        return Pathfinding.findNearestOrthogonalPosition(
            Math.floor(this.npc.x),
            Math.floor(this.npc.y),
            Math.floor(x),
            Math.floor(y),
            this.npc.isWalkableCallback
        );
    }
}
