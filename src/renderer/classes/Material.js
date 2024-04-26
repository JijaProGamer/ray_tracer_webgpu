const Vector3 = require("./Vector3.js")

class Material {
    Color = new Vector3(1, 1, 1);
    //SpecularColor = new Vector3(1, 1, 1);
    Emission = new Vector3(0, 0, 0);
    Texture = null;

    Smoothness = 0;
    Specularity = 0;
    Transparency = 1;
}

module.exports = Material