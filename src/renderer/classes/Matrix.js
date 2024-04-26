const Vector3 = require("./Vector3")

class Matrix {
    constructor(rows, cols, initial) {
        this.rows = rows;
        this.cols = cols;
        this.data = initial || new Array(rows * cols);
    }

    getIndex(row, col) {
        return row * this.cols + col;
    }

    set(row, col, value) {
        const index = this.getIndex(row, col);
        if (index >= 0 && index < this.rows * this.cols) {
            this.data[index] = value;
        } else {
            throw new Error('Index out of range');
        }
    }

    get(row, col) {
        const index = this.getIndex(row, col);

        if (index >= 0 && index < this.rows * this.cols) {
            return this.data[index];
        } else {
            throw new Error('Index out of range');
        }
    }

    multiply(otherMatrix) {
        if (this.cols !== otherMatrix.rows) {
            throw new Error('Incompatible matrices for multiplication');
        }

        const result = new Matrix(this.rows, otherMatrix.cols);

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < otherMatrix.cols; j++) {
                let sum = 0;

                for (let k = 0; k < this.cols; k++) {
                    sum += this.get(i, k) * otherMatrix.get(k, j);
                }

                result.set(i, j, sum);
            }
        }

        return result;
    }

    multiplyVector(vector) {
        if (this.cols !== 3) {
            throw new Error('Incompatible dimensions for matrix-vector multiplication');
        }

        const result = new Vector3(
            this.get(0, 0) * vector.x + this.get(0, 1) * vector.y + this.get(0, 2) * vector.z,
            this.get(1, 0) * vector.x + this.get(1, 1) * vector.y + this.get(1, 2) * vector.z,
            this.get(2, 0) * vector.x + this.get(2, 1) * vector.y + this.get(2, 2) * vector.z
        );

        return result;
    }
}

module.exports = Matrix;