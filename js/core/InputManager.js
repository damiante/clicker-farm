export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.listeners = {
            pointerdown: [],
            pointermove: [],
            pointerup: [],
            zoom: [],
            pan: []
        };

        this.touches = [];
        this.lastPinchDistance = 0;

        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.lastDragX = 0;
        this.lastDragY = 0;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.canvas.addEventListener('pointerdown', (e) => this.handleEvent('pointerdown', e));
        this.canvas.addEventListener('pointermove', (e) => this.handleEvent('pointermove', e));
        this.canvas.addEventListener('pointerup', (e) => this.handleEvent('pointerup', e));

        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        document.body.style.touchAction = 'none';
        this.canvas.style.touchAction = 'none';
    }

    handleEvent(type, event) {
        const position = this.getPointerPosition(event);

        if (type === 'pointerdown') {
            this.isDragging = true;
            this.dragStartX = position.x;
            this.dragStartY = position.y;
            this.lastDragX = position.x;
            this.lastDragY = position.y;
        } else if (type === 'pointermove' && this.isDragging && this.touches.length < 2) {
            const deltaX = position.x - this.lastDragX;
            const deltaY = position.y - this.lastDragY;

            this.lastDragX = position.x;
            this.lastDragY = position.y;

            for (const listener of this.listeners.pan) {
                listener({
                    type: 'drag',
                    deltaX,
                    deltaY,
                    position
                });
            }
        } else if (type === 'pointerup') {
            this.isDragging = false;
        }

        for (const listener of this.listeners[type]) {
            listener({ ...event, position });
        }
    }

    getPointerPosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    handleWheel(event) {
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            const centerX = event.clientX - rect.left;
            const centerY = event.clientY - rect.top;

            const zoomDelta = event.deltaY > 0 ? 0.95 : 1.05;

            for (const listener of this.listeners.zoom) {
                listener({
                    type: 'wheel',
                    delta: zoomDelta,
                    centerX,
                    centerY
                });
            }
        }
    }

    handleTouchStart(event) {
        this.touches = Array.from(event.touches);

        if (this.touches.length === 2) {
            event.preventDefault();
            this.lastPinchDistance = this.getPinchDistance();
        }
    }

    handleTouchMove(event) {
        this.touches = Array.from(event.touches);

        if (this.touches.length === 2) {
            event.preventDefault();

            const currentDistance = this.getPinchDistance();
            if (this.lastPinchDistance > 0) {
                const zoomDelta = currentDistance / this.lastPinchDistance;

                const rect = this.canvas.getBoundingClientRect();
                const centerX = (this.touches[0].clientX + this.touches[1].clientX) / 2 - rect.left;
                const centerY = (this.touches[0].clientY + this.touches[1].clientY) / 2 - rect.top;

                for (const listener of this.listeners.zoom) {
                    listener({
                        type: 'pinch',
                        delta: zoomDelta,
                        centerX,
                        centerY
                    });
                }
            }
            this.lastPinchDistance = currentDistance;
        }
    }

    handleTouchEnd(event) {
        this.touches = Array.from(event.touches);

        if (this.touches.length < 2) {
            this.lastPinchDistance = 0;
        }
    }

    getPinchDistance() {
        if (this.touches.length < 2) return 0;

        const dx = this.touches[0].clientX - this.touches[1].clientX;
        const dy = this.touches[0].clientY - this.touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    on(eventType, callback) {
        if (this.listeners[eventType]) {
            this.listeners[eventType].push(callback);
        }
    }

    off(eventType, callback) {
        if (this.listeners[eventType]) {
            const index = this.listeners[eventType].indexOf(callback);
            if (index > -1) {
                this.listeners[eventType].splice(index, 1);
            }
        }
    }

    clearListeners() {
        this.listeners = {
            pointerdown: [],
            pointermove: [],
            pointerup: [],
            zoom: [],
            pan: []
        };
    }
}
