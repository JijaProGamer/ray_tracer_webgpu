const Vector3 = require("./classes/Vector3.js")
const Matrix = require("./classes/Matrix.js")
const Quaternion = require("./classes/Quaternion.js")

class Camera {
    #Position = new Vector3(0, 0, 0);
    #Orientation = new Quaternion(0, 0, 0, 1);
    #FieldOfView = Math.PI / 2;

    CameraToWorldMatrix = new Matrix(4, 4);
    CameraMoved = false;

    set FieldOfView(fov){
        this.#FieldOfView = fov

        this.CameraMoved = true;
    }

    get FieldOfView(){
        return this.#FieldOfView
    }

    set Position(pos) {
        this.#Position = pos
        //this.#ComputeCameraToWorldMatrix()

        this.CameraMoved = true;
    }

    get Position(){
        return this.#Position
    }

    set Orientation(orientation) {
        this.#Orientation = orientation
        this.#ComputeCameraToWorldMatrix()

        this.CameraMoved = true;
    }

    get Orientation(){
        return this.#Orientation
    }

    #ComputeCameraToWorldMatrix() {
        this.CameraToWorldMatrix.set(0, 0, this.Orientation.right.x  ); this.CameraToWorldMatrix.set(0, 1, this.Orientation.right.y );  this.CameraToWorldMatrix.set(0, 2, this.Orientation.right.z  ); this.CameraToWorldMatrix.set(0, 3, 0);
        this.CameraToWorldMatrix.set(1, 0, this.Orientation.up.x     ); this.CameraToWorldMatrix.set(1, 1, this.Orientation.up.y    );  this.CameraToWorldMatrix.set(1, 2, this.Orientation.up.z     ); this.CameraToWorldMatrix.set(1, 3, 0);
        this.CameraToWorldMatrix.set(2, 0, this.Orientation.forward.x); this.CameraToWorldMatrix.set(2, 1, this.Orientation.forward.y); this.CameraToWorldMatrix.set(2, 2, this.Orientation.forward.z); this.CameraToWorldMatrix.set(2, 3, 0);
        this.CameraToWorldMatrix.set(3, 0, 0                         ); this.CameraToWorldMatrix.set(3, 1, 0                         ); this.CameraToWorldMatrix.set(3, 2, 0                         ); this.CameraToWorldMatrix.set(3, 3, 1);
    }

    SetOrientationMatrix(matrix){
        const rotationMatrix = new Matrix(3, 3, [
            matrix.get(0, 0), matrix.get(0, 1), matrix.get(0, 2),
            matrix.get(1, 0), matrix.get(1, 1), matrix.get(1, 2),
            matrix.get(2, 0), matrix.get(2, 1), matrix.get(2, 2)
        ]);
    
        const translationVector = new Vector3(
            matrix.get(0, 3),
            matrix.get(1, 3),
            matrix.get(2, 3)
        );
    
        const trace = rotationMatrix.get(0, 0) + rotationMatrix.get(1, 1) + rotationMatrix.get(2, 2);
        let qx, qy, qz, qw;
    
        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1.0);
            qw = 0.25 / s;
            qx = (rotationMatrix.get(2, 1) - rotationMatrix.get(1, 2)) * s;
            qy = (rotationMatrix.get(0, 2) - rotationMatrix.get(2, 0)) * s;
            qz = (rotationMatrix.get(1, 0) - rotationMatrix.get(0, 1)) * s;
        } else if (rotationMatrix.get(0, 0) > rotationMatrix.get(1, 1) && rotationMatrix.get(0, 0) > rotationMatrix.get(2, 2)) {
            const s = 2.0 * Math.sqrt(1.0 + rotationMatrix.get(0, 0) - rotationMatrix.get(1, 1) - rotationMatrix.get(2, 2));
            qw = (rotationMatrix.get(2, 1) - rotationMatrix.get(1, 2)) / s;
            qx = 0.25 * s;
            qy = (rotationMatrix.get(0, 1) + rotationMatrix.get(1, 0)) / s;
            qz = (rotationMatrix.get(0, 2) + rotationMatrix.get(2, 0)) / s;
        } else if (rotationMatrix.get(1, 1) > rotationMatrix.get(2, 2)) {
            const s = 2.0 * Math.sqrt(1.0 + rotationMatrix.get(1, 1) - rotationMatrix.get(0, 0) - rotationMatrix.get(2, 2));
            qw = (rotationMatrix.get(0, 2) - rotationMatrix.get(2, 0)) / s;
            qx = (rotationMatrix.get(0, 1) + rotationMatrix.get(1, 0)) / s;
            qy = 0.25 * s;
            qz = (rotationMatrix.get(1, 2) + rotationMatrix.get(2, 1)) / s;
        } else {
            const s = 2.0 * Math.sqrt(1.0 + rotationMatrix.get(2, 2) - rotationMatrix.get(0, 0) - rotationMatrix.get(1, 1));
            qw = (rotationMatrix.get(1, 0) - rotationMatrix.get(0, 1)) / s;
            qx = (rotationMatrix.get(0, 2) + rotationMatrix.get(2, 0)) / s;
            qy = (rotationMatrix.get(1, 2) + rotationMatrix.get(2, 1)) / s;
            qz = 0.25 * s;
        }
    
        const quaternion = new Quaternion(qx, qy, qz, qw).normalize();

        this.#Position = translationVector // only this one sets private, so that it doesnt call ComputeCameraToWorldMatrix 
        this.Orientation = quaternion;

        this.CameraMoved = true;
    }
}

module.exports = Camera