const Vector2 = require("./Vector2");
const Vector3 = require("./Vector3");

class Texture {
    Width = 0;
    Height = 0;
    Pixels = null;

    loadFromURL(url){
        return new Promise((resolve, reject) => {
            var img = new Image();
            img.crossOrigin = "Anonymous";
    
            img.onload = () => {
                var canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
    
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, img.width, img.height);
    
                this.Width = img.width
                this.Height = img.height;
                this.Pixels = canvas

                resolve()
            };
            
            img.src = url;
        })
    }

    __AtlasPosition = new Vector3(0, 0, 0);
    __AtlasUVStart = new Vector2(0, 0);
    __AtlasUVExtend = new Vector2(0, 0);
}

module.exports = Texture