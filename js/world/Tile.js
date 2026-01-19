export class Tile {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.entity = null;
    }

    hasEntity() {
        return this.entity !== null;
    }

    setEntity(entity) {
        this.entity = entity;
    }

    removeEntity() {
        this.entity = null;
    }

    serialize() {
        return {
            x: this.x,
            y: this.y,
            type: this.type,
            entity: this.entity ? this.entity.serialize() : null
        };
    }

    static deserialize(data) {
        const tile = new Tile(data.x, data.y, data.type);
        if (data.entity) {
            tile.entity = data.entity;
        }
        return tile;
    }
}
