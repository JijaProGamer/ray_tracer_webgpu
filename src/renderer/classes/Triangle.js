const Vector3 = require("./Vector3.js")
const Vector2 = require("./Vector2.js")

class Triangle {
    a = new Vector3(0, 0, 0);
    b = new Vector3(0, 0, 0);
    c = new Vector3(0, 0, 0);

    na = new Vector3(0, 0, 0);
    nb = new Vector3(0, 0, 0);
    nc = new Vector3(0, 0, 0);
    
    uva = new Vector2(0, 0, 0);
    uvb = new Vector2(0, 0, 0);

    Material = "default";
}

module.exports = Triangle