export class SeededRandom {
    constructor(seed) {
        this.seed = seed;
        this.state = seed;
    }

    next() {
        this.state = (this.state * 1664525 + 1013904223) >>> 0;
        return this.state / 0xFFFFFFFF;
    }

    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    nextFloat(min = 0, max = 1) {
        return this.next() * (max - min) + min;
    }

    nextBool(probability = 0.5) {
        return this.next() < probability;
    }

    choice(array) {
        return array[this.nextInt(0, array.length - 1)];
    }

    reset() {
        this.state = this.seed;
    }
}
