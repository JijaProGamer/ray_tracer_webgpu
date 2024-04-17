const moveJoystick = new JoyStick('moveJoystick');
const rotateJoystick = new JoyStick('rotateJoystick');

const renderer = require("./renderer/Renderer.js")
const Vector3 = require("./renderer/classes/Vector3.js")

const canvas = document.querySelector(`canvas[id="canvas"]`)
const fpsCounter = document.querySelector("#fpsCount")
const sampleCounter = document.querySelector("#sampleCount")
const compression = document.querySelector("#compression-range")
const FOV = document.querySelector("#fov-range")

canvas.width = 86 / 100 * window.screen.width;
canvas.height = (9 / 16 * canvas.width) * (compression.value / 10) * window.devicePixelRatio
canvas.width *= (compression.value / 10) * window.devicePixelRatio;

canvas.width = Math.ceil(canvas.width / 8) * 8;
canvas.height = Math.ceil(canvas.height / 8) * 8;

const Renderer = new renderer({ Canvas: canvas });

let moved = false;
async function init() {
  await Renderer.Init()

  let lastFPSDraw = Date.now()
  let FPSNumber = 0

  function setCameraRotation(x, y) {
    Renderer.Camera.Orientation.setFromEulerAngles(x, y)
    Renderer.Camera.Orientation = Renderer.Camera.Orientation
    moved = true;
  }

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

init()