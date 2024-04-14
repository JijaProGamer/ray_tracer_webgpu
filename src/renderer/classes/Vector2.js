class Vector2 {
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag !== 0) {
            this.x /= mag;
            this.y /= mag;
        }
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
    }

    subtract(v) {
        this.x -= v.x;
        this.y -= v.y;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    multiplyScalar(scalar) {
        this.x *= scalar;
        this.y *= scalar;
    }

    clone() {
        return new Vector2(this.x, this.y);
    }

    static distance(v1, v2) {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

module.exports = Vector2;
