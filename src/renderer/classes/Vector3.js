class Vector3 {
    constructor(x, y, z) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    lengthSquared() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    normalize() {
        const mag = this.magnitude();
        if (mag !== 0) {
            this.x /= mag;
            this.y /= mag;
            this.z /= mag;
        }

        return this;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;

        return this;
    }

    subtract(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;

        return this;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v) {
        const x = this.y * v.z - this.z * v.y;
        const y = this.z * v.x - this.x * v.z;
        const z = this.x * v.y - this.y * v.x;
        return new Vector3(x, y, z);
    }

    multiplyScalar(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;

        return this;
    }

    negate(){
        return this.multiplyScalar(-1);
    }

    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    static distance(v1, v2) {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        const dz = v1.z - v2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    rotateAxis(x, y, z) {
        const cosX = Math.cos(x);
        const sinX = Math.sin(x);
        const cosY = Math.cos(y);
        const sinY = Math.sin(y);
        const cosZ = Math.cos(z);
        const sinZ = Math.sin(z);

        const newX = this.x * (cosY * cosZ) - this.y * (cosY * sinZ) + this.z * sinY;
        const newY = this.x * (sinX * sinY * cosZ + cosX * sinZ) + this.y * (-sinX * sinY * sinZ + cosX * cosZ) - this.z * (sinX * cosY);
        const newZ = this.x * (-cosX * sinY * cosZ + sinX * sinZ) + this.y * (cosX * sinY * sinZ + sinX * cosZ) + this.z * (cosX * cosY);

        this.x = newX;
        this.y = newY;
        this.z = newZ;

        return this;
    }
}

module.exports = Vector3;