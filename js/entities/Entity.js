export class Entity {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.sprite = null;
    }

    update(deltaTime) {
    }

    render(ctx, cameraX, cameraY) {
    }

    serialize() {
        return {
            x: this.x,
            y: this.y,
            type: this.type
        };
    }

    static deserialize(data) {
        return new Entity(data.x, data.y, data.type);
    }
}
