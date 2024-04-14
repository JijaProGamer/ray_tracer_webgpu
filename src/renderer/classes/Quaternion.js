const Matrix = require("./Matrix.js")
const Vector3 = require("./Vector3.js")

class Quaternion {
    constructor(w, x, y, z) {
        this.w = w || 0;
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }

    get forward() {
        return this.multiplyVector(new Vector3(0, 0, 1)).normalize();
    }

    get up() {
        return this.multiplyVector(new Vector3(0, 1, 0)).normalize();
    }

    get right() {
        return this.forward.cross(this.up).normalize();
    }

    multiplyVector(v) {
        const qv = new Quaternion(0, v.x, v.y, v.z);
        const conjugate = this.conjugate();
        const rotatedVector = this.multiply(qv).multiply(conjugate);

        return new Vector3(rotatedVector.x, rotatedVector.y, rotatedVector.z);
    }

    magnitude() {
        return Math.sqrt(this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalize() {
        const mag = this.magnitude();
        this.w /= mag;
        this.x /= mag;
        this.y /= mag;
        this.z /= mag;

        return this;
    }

    multiply(q) {
        const w = this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z;
        const x = this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y;
        const y = this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x;
        const z = this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w;

        return new Quaternion(w, x, y, z);
    }

    conjugate() {
        return new Quaternion(this.w, -this.x, -this.y, -this.z);
    }

    setFromEulerAngles(xRotation, yRotation) {
        xRotation = normalizeAngle(xRotation);
        yRotation = normalizeAngle(yRotation);

        const halfX = xRotation / 2;
        const halfY = yRotation / 2;

        const cosHalfX = Math.cos(halfX);
        const sinHalfX = Math.sin(halfX);
        const cosHalfY = Math.cos(halfY);
        const sinHalfY = Math.sin(halfY);

        this.w = cosHalfX * cosHalfY;
        this.x = sinHalfX * cosHalfY;
        this.y = cosHalfX * sinHalfY;
        this.z = -sinHalfX * sinHalfY;

        return this;
    }

    getEulerAngles(){
        const { x, y, z, w } = this;

        const sinP = 2.0 * (w * x + y * z);
        const cosP = 1.0 - 2.0 * (x * x + y * y);
        const pitch = Math.atan2(sinP, cosP);
    
        const sinY = 2.0 * (w * y - z * x);
        const cosY = 1.0 - 2.0 * (y * y + z * z);
        const yaw = Math.atan2(sinY, cosY);
    
        const sinR = 2.0 * (w * z + x * y);
        const cosR = 1.0 - 2.0 * (y * y + z * z);
        const roll = Math.atan2(sinR, cosR);
    
        return new Vector3(pitch, yaw, roll);
    }

    toRotationMatrix() {
        const { w, x, y, z } = this;
        const xx = x * x;
        const yy = y * y;
        const zz = z * z;
        const xy = x * y;
        const xz = x * z;
        const yz = y * z;
        const wx = w * x;
        const wy = w * y;
        const wz = w * z;

        return new Matrix(3, 3, [
            1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy),
            2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx),
            2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy)
        ]);
    }
}

function normalizeAngle(angle) {
    angle %= 2 * Math.PI;
    
    if (angle > Math.PI) {
        angle -= 2 * Math.PI;
    } else if (angle < -Math.PI) {
        angle += 2 * Math.PI;
    }

    return angle;
}


module.exports = Quaternion;
