const moveJoystick = new JoyStick('moveJoystick');
const rotateJoystick = new JoyStick('rotateJoystick');

const renderer = require("./renderer/Renderer.js")
const Vector3 = require("./renderer/classes/Vector3.js")

const Triangle = require("./renderer/classes/Triangle.js")
const Material = require("./renderer/classes/Material.js");
const Vector2 = require("./renderer/classes/Vector2.js");

const canvas = document.querySelector(`canvas[id="canvas"]`)
const fpsCounter = document.querySelector("#fpsCount")
const sampleCounter = document.querySelector("#sampleCount")
const compression = document.querySelector("#compression-range")
const FOV = document.querySelector("#fov-range")

const Renderer = new renderer({ Canvas: canvas });

let lastCompression = compression.value
let isFullScreen = false;

let map = []
let materials = {}

// walls

/*let Khaki = new Material();
Khaki.Color = new Vector3(0.76, 0.69, 0.56);
materials["Khaki"] = Khaki

let wallUp = new Sphere()
wallUp.Position = new Vector3(0, 106, 0)
wallUp.Radius = 100;
wallUp.Material = "Khaki"
map.push(wallUp)

let wallDown = new Sphere()
wallDown.Position = new Vector3(0, -106, 0)
wallDown.Radius = 100;
wallDown.Material = "Khaki"
map.push(wallDown)

let wallFront = new Sphere()
wallFront.Position = new Vector3(0, 0, 110)
wallFront.Radius = 100;
wallFront.Material = "Khaki"
map.push(wallFront)

let wallBack = new Sphere()
wallBack.Position = new Vector3(0, 0, -110)
wallBack.Radius = 100;
wallBack.Material = "Khaki"
map.push(wallBack)

let Red = new Material();
Red.Color = new Vector3(0.5, 0.05, 0.05);
materials["Red"] = Red

let wallLeft = new Sphere()
wallLeft.Position = new Vector3(-106, 0, 0)
wallLeft.Radius = 100;
wallLeft.Material = "Red"
map.push(wallLeft)

let Green = new Material();
Green.Color = new Vector3(0.05, 0.5, 0.05);
materials["Green"] = Green

let wallRight = new Sphere()
wallRight.Position = new Vector3(106, 0, 0)
wallRight.Radius = 100;
wallRight.Material = "Green"
map.push(wallRight)

// light

let LightMaterial = new Material();
LightMaterial.Color = new Vector3(1, 1, 1);
LightMaterial.Emission = new Vector3(5, 5, 5);
materials["Light"] = LightMaterial

let light = new Sphere()
light.Position = new Vector3(0, 2, -6)
light.Radius = 1.5;
light.Material = "Light"
map.push(light)

// object

let object1 = new Sphere()
object1.Position = new Vector3(-3, -3.5, 1.25)
object1.Radius = 3;
object1.Material = "Khaki"
map.push(object1)

let object2 = new Sphere()
object2.Position = new Vector3(3, -3.5, -1.25)
object2.Radius = 3;
object2.Material = "Khaki"
map.push(object2)*/

function MakeQuad(Q, u, v, MaterialName){
  let a = Q;
  let b = Q.clone().add(u);
  let d = Q.clone().add(v);
  let c = Q.clone().add(u).add(v);

  let edge1 = b.clone().subtract(a);
  let edge2 = c.clone().subtract(a);
  let normal = edge2.cross(edge1).normalize();

  let tri1 = new Triangle()
  tri1.a = a;
  tri1.b = b;
  tri1.c = c;
  tri1.uva = new Vector2(0, 0);
  tri1.uvb = new Vector2(0, 0);
  tri1.uvc = new Vector2(0, 0);
  tri1.na = normal;
  tri1.nb = normal;
  tri1.nc = normal;
  tri1.Material = MaterialName
  map.push(tri1)

  let tri2 = new Triangle()
  tri2.a = d;
  tri2.b = a;
  tri2.c = c;
  tri2.uva = new Vector2(0, 0);
  tri2.uvb = new Vector2(0, 0);
  tri2.uvc = new Vector2(0, 0);
  tri2.na = normal;
  tri2.nb = normal;
  tri2.nc = normal;
  tri2.Material = MaterialName
  map.push(tri2)
}

function MakeBox(Q, u, v, w, MaterialName){
  //MakeQuad(Q, u, v, MaterialName);
  MakeQuad(Q.clone().add(w), u, v, MaterialName);

  MakeQuad(Q, w, v, MaterialName);
  MakeQuad(Q, w, u, MaterialName);

  MakeQuad(Q.clone().add(u), v, w, MaterialName);
  MakeQuad(Q.clone().add(v), u, w, MaterialName);
}

let Khaki = new Material();
Khaki.Color = new Vector3(0.76, 0.69, 0.56);
materials["Khaki"] = Khaki

let Red = new Material();
Red.Color = new Vector3(0.5, 0.1, 0.1);
materials["Red"] = Red

let Green = new Material();
Green.Color = new Vector3(0.1, 0.5, 0.1);
materials["Green"] = Green

let Light = new Material();
Light.Color = new Vector3(1, 1, 1);
Light.Emission = new Vector3(10, 10, 10);
materials["Light"] = Light

MakeQuad(new Vector3(-0.5, -1, -3), new Vector3(0, 0, 4), new Vector3(2, 0, 0), "Khaki") // bottom
MakeQuad(new Vector3(-0.5, 1, -3), new Vector3(0, 0, 4), new Vector3(2, 0, 0), "Khaki") // top

MakeQuad(new Vector3(-0.5, -1, -3), new Vector3(0, 2, 0), new Vector3(0, 0, 4), "Red") // left
MakeQuad(new Vector3(1.5, -1, -3), new Vector3(0, 2, 0), new Vector3(0, 0, 4), "Green") // right

MakeQuad(new Vector3(-0.5, -1, -3), new Vector3(0, 2, 0), new Vector3(2, 0, 0), "Khaki") // front
MakeQuad(new Vector3(-0.5, -1, 1), new Vector3(0, 2, 0), new Vector3(2, 0, 0), "Khaki") // back

MakeQuad(new Vector3(0.25, 0.99999, -2), new Vector3(0, 0, 0.5), new Vector3(0.5, 0, 0), "Light") // light

MakeBox(
  new Vector3(0.35, -1, -2.5), 
  new Vector3(0.75, 0, 0), 
  new Vector3(0, 0, 0.75), 
  new Vector3(0, 1.5, 0), 
  "Khaki"
)

MakeBox(
  new Vector3(-0.25, -1, -1.5), 
  new Vector3(0.75, 0, 0), 
  new Vector3(0, 0, 0.75), 
  new Vector3(0, 0.75, 0), 
  "Khaki"
)

function setCanvasSize(){
  let width 
  let height

  if(isFullScreen){
    width = canvas.width = window.screen.width;
    height = canvas.height = window.screen.height;
    isFullScreen = false;

  } else {
    width = canvas.width = 86 / 100 * window.screen.width;
    height = canvas.height = (9 / 16 * canvas.width)
  }

  canvas.height *= (compression.value / 10) * window.devicePixelRatio
  canvas.width *= (compression.value / 10) * window.devicePixelRatio;

  canvas.width = Math.ceil(canvas.width / 8) * 8;
  canvas.height = Math.ceil(canvas.height / 8) * 8;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  Renderer.MakeBuffers(true)
  Renderer.MakeBindGroups()
  Renderer.Camera.Position = Renderer.Camera.Position
}

document.addEventListener("fullscreenchange", setCanvasSize)

function setCameraRotation(x, y) {
  Renderer.Camera.Orientation.setFromEulerAngles(x, y)
  Renderer.Camera.Orientation = Renderer.Camera.Orientation
  moved = true;
}

let moved = false;

async function init() {
  await Renderer.Init()
  setCanvasSize()

  /*let val = 0
  setInterval(() => {
    val += 0.25;
    light.Position.x = Math.cos(val) * 4;
    light.Position.y = Math.sin(val) * 3;
    //light.Position.z = Math.sin(-val / 2) * 2;

    //LightMaterial.Emission.x = 5 + Math.cos(val) * 3;
    //LightMaterial.Emission.g = 5 + Math.sin(val) * 5;
    Renderer.SetMap(map, materials)
  }, 100)*/
  Renderer.SetMap(map, materials)

  let lastFPSDraw = Date.now()
  let FPSNumber = 0

  canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
  });

  let mouseX = 0
  let mouseY = 0
  let mouseDPI = 750;
  let cameraSpeed = 2.5;

  const movement = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false
  };

  function handleKeyDown(event) {
    switch (event.key) {
      case 'w':
        movement.forward = true;
        break;
      case 'a':
        movement.left = true;
        break;
      case 's':
        movement.backward = true;
        break;
      case 'd':
        movement.right = true;
        break;
      case 'q':
        movement.up = true;
        break;
      case 'e':
        movement.down = true;
        break;

      case "o":
        if(!isFullScreen){
          canvas.requestFullscreen()
          isFullScreen = true;
        } else {
          setCanvasSize()
        }

        break;
    }
  }

  function handleKeyUp(event) {
    switch (event.key) {
      case 'w':
        movement.forward = false;
        break;
      case 'a':
        movement.left = false;
        break;
      case 's':
        movement.backward = false;
        break;
      case 'd':
        movement.right = false;
        break;
      case 'q':
        movement.up = false;
        break;
      case 'e':
        movement.down = false;
        break;
    }
  }

  function updateCamera(deltaTime) {
    const movementVector = new Vector3(0, 0, 0);

    if (movement.forward) movementVector.add(Renderer.Camera.Orientation.forward);
    if (movement.backward) movementVector.subtract(Renderer.Camera.Orientation.forward);
    if (movement.left) movementVector.add(Renderer.Camera.Orientation.right);
    if (movement.right) movementVector.add(Renderer.Camera.Orientation.right.clone().multiplyScalar(-1));
    if (movement.up) movementVector.add(Renderer.Camera.Orientation.up);
    if (movement.down) movementVector.subtract(Renderer.Camera.Orientation.up);

    if (movementVector.magnitude() > 0) {
      movementVector.normalize();
      movementVector.multiplyScalar(-1 * deltaTime / 1000 * cameraSpeed);

      Renderer.Camera.Position.add(movementVector);
      Renderer.Camera.Position = Renderer.Camera.Position
      moved = true;
    }
  }

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  const handleMouseMove = (event) => {
    if (document.pointerLockElement === canvas) {
      mouseX += event.movementX / mouseDPI;
      mouseY -= event.movementY / mouseDPI;

      if (mouseY > Math.PI) {
        mouseY = Math.PI;
      }

      if (mouseY < -Math.PI) {
        mouseY = -Math.PI;
      }

      setCameraRotation(mouseY, mouseX)
      moved = true;
    }
  };

  setCameraRotation(0, 0)
  document.addEventListener('mousemove', handleMouseMove, false);

  let lastCall = performance.now()
  async function drawFrame() {
    if(lastCompression != compression.value){
        setCanvasSize(false)
        lastCompression = compression.value
    }

    const deltaTime = performance.now() - lastCall
    lastCall = performance.now()

    // joysticks

    let moveJoystickX = moveJoystick.GetX() / 100;
    let moveJoystickY = moveJoystick.GetY() / 100;

    let movePosition = Renderer.Camera.Orientation.forward.clone().multiplyScalar(-moveJoystickY)
      .add(Renderer.Camera.Orientation.right.multiplyScalar(moveJoystickX)).normalize()
      .multiplyScalar(deltaTime / 1000 * cameraSpeed);

    if (movePosition.magnitude() > 0) {
      Renderer.Camera.Position.add(movePosition);
      Renderer.Camera.Position = Renderer.Camera.Position
      moved = true;
    }

    let rotateJoystickX = rotateJoystick.GetX() / 100;
    let rotateJoystickY = rotateJoystick.GetY() / 100;

    mouseX += rotateJoystickX / mouseDPI * deltaTime;
    mouseY += rotateJoystickY / mouseDPI * deltaTime;

    if (mouseY > Math.PI) {
      mouseY = Math.PI;//- Math.PI / 5;
    }

    if (mouseY < -Math.PI) {
      mouseY = -Math.PI;//+ Math.PI / 5;
    }

    if (rotateJoystickX > 0 || rotateJoystickY > 0) {
      setCameraRotation(mouseY, mouseX)
    }

    //

    updateCamera(deltaTime)

    if (Renderer.FramesStatic < 2048 || moved) {
      let fovValue = FOV.value / 57.2958;
      if (Renderer.Camera.FieldOfView !== fovValue) {
        Renderer.Camera.FieldOfView = fovValue;
      }

      if (lastFPSDraw + 1000 <= Date.now()) {
        lastFPSDraw = Date.now();
        fpsCounter.textContent = `${FPSNumber} FPS`;
        FPSNumber = 0;
      }

      sampleCounter.textContent = `${Renderer.FramesStatic} samples`;

      await Renderer.MakeFrame();
      await Renderer.RenderFrame();
      FPSNumber += 1;
      moved = false;
    }

    window.requestAnimationFrame(drawFrame)
  }

  window.requestAnimationFrame(drawFrame)
}

init()/*.catch((err) => {
  console.log(err.toString(), err.stack)
})*/