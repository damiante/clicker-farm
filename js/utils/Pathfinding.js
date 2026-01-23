/**
 * A* Pathfinding for grid-based movement
 * Uses Manhattan distance heuristic for orthogonal movement
 * Respects tile occupation and terrain rules
 */
export class Pathfinding {
    /**
     * Find path from start to goal using A* algorithm
     * @param {number} startX - Start tile X
     * @param {number} startY - Start tile Y
     * @param {number} goalX - Goal tile X
     * @param {number} goalY - Goal tile Y
     * @param {Function} isWalkable - Function(x, y) that returns true if tile is walkable
     * @param {number} maxDistance - Maximum path length to search (default 100)
     * @returns {Array<{x, y}>|null} Array of positions from start to goal, or null if no path
     */
    static findPath(startX, startY, goalX, goalY, isWalkable, maxDistance = 100) {
        // Round coordinates to integers
        startX = Math.floor(startX);
        startY = Math.floor(startY);
        goalX = Math.floor(goalX);
        goalY = Math.floor(goalY);

        // Check if start and goal are the same
        if (startX === goalX && startY === goalY) {
            return [{ x: startX, y: startY }];
        }

        // Check if goal is walkable
        if (!isWalkable(goalX, goalY)) {
            return null;
        }

        // Priority queue (sorted by f-score)
        const openSet = [];
        const closedSet = new Set();

        // Node structure: {x, y, g, h, f, parent}
        const startNode = {
            x: startX,
            y: startY,
            g: 0,
            h: this.manhattanDistance(startX, startY, goalX, goalY),
            f: 0,
            parent: null
        };
        startNode.f = startNode.g + startNode.h;

        openSet.push(startNode);

        // Map to track best g-score for each position
        const gScores = new Map();
        gScores.set(this.posKey(startX, startY), 0);

        while (openSet.length > 0) {
            // Get node with lowest f-score
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();

            // Check if we've reached the goal
            if (current.x === goalX && current.y === goalY) {
                return this.reconstructPath(current);
            }

            // Check max distance limit
            if (current.g >= maxDistance) {
                continue;
            }

            // Mark as visited
            const currentKey = this.posKey(current.x, current.y);
            closedSet.add(currentKey);

            // Check orthogonal neighbors
            const neighbors = [
                { x: current.x - 1, y: current.y },  // Left
                { x: current.x + 1, y: current.y },  // Right
                { x: current.x, y: current.y - 1 },  // Up
                { x: current.x, y: current.y + 1 }   // Down
            ];

            for (const neighbor of neighbors) {
                const neighborKey = this.posKey(neighbor.x, neighbor.y);

                // Skip if already visited
                if (closedSet.has(neighborKey)) {
                    continue;
                }

                // Skip if not walkable
                if (!isWalkable(neighbor.x, neighbor.y)) {
                    continue;
                }

                // Calculate tentative g-score
                const tentativeG = current.g + 1;

                // Check if this path to neighbor is better than previous
                const previousG = gScores.get(neighborKey);
                if (previousG !== undefined && tentativeG >= previousG) {
                    continue;
                }

                // This path is the best so far, record it
                gScores.set(neighborKey, tentativeG);

                const h = this.manhattanDistance(neighbor.x, neighbor.y, goalX, goalY);
                const neighborNode = {
                    x: neighbor.x,
                    y: neighbor.y,
                    g: tentativeG,
                    h: h,
                    f: tentativeG + h,
                    parent: current
                };

                // Add to open set if not already there
                const existingIndex = openSet.findIndex(n => n.x === neighbor.x && n.y === neighbor.y);
                if (existingIndex !== -1) {
                    // Update existing node if this path is better
                    if (neighborNode.g < openSet[existingIndex].g) {
                        openSet[existingIndex] = neighborNode;
                    }
                } else {
                    openSet.push(neighborNode);
                }
            }
        }

        // No path found
        return null;
    }

    /**
     * Calculate Manhattan distance between two points
     */
    static manhattanDistance(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }

    /**
     * Create unique key for position
     */
    static posKey(x, y) {
        return `${x},${y}`;
    }

    /**
     * Reconstruct path from goal to start
     */
    static reconstructPath(node) {
        const path = [];
        let current = node;

        while (current !== null) {
            path.unshift({ x: current.x, y: current.y });
            current = current.parent;
        }

        return path;
    }

    /**
     * Find nearest walkable position orthogonally adjacent to target
     * @param {number} startX - Start tile X
     * @param {number} startY - Start tile Y
     * @param {number} targetX - Target tile X
     * @param {number} targetY - Target tile Y
     * @param {Function} isWalkable - Function(x, y) that returns true if tile is walkable
     * @returns {{x, y}|null} Nearest orthogonal position or null if none found
     */
    static findNearestOrthogonalPosition(startX, startY, targetX, targetY, isWalkable) {
        const positions = [
            { x: targetX - 1, y: targetY },  // Left
            { x: targetX + 1, y: targetY },  // Right
            { x: targetX, y: targetY - 1 },  // Up
            { x: targetX, y: targetY + 1 }   // Down
        ];

        // Filter to walkable positions
        const walkablePositions = positions.filter(pos => isWalkable(pos.x, pos.y));

        if (walkablePositions.length === 0) {
            return null;
        }

        // Find closest walkable position
        let closest = walkablePositions[0];
        let closestDist = this.manhattanDistance(startX, startY, closest.x, closest.y);

        for (let i = 1; i < walkablePositions.length; i++) {
            const pos = walkablePositions[i];
            const dist = this.manhattanDistance(startX, startY, pos.x, pos.y);

            if (dist < closestDist) {
                closestDist = dist;
                closest = pos;
            }
        }

        return closest;
    }
}
