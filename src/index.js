const moveJoystick = new JoyStick('moveJoystick');
const rotateJoystick = new JoyStick('rotateJoystick');

const renderer = require("./renderer/Renderer.js")
const Vector3 = require("./renderer/classes/Vector3.js")
const Renderer = new renderer()

const canvas = document.querySelector(`canvas[id="canvas"]`)
const fpsCounter = document.querySelector("#fpsCount")
const compression = document.querySelector("#compression-range")
const FOV = document.querySelector("#fov-range")

canvas.width = 86 / 100 * window.screen.width;
canvas.height = (9 / 16 * canvas.width) * (compression.value / 10) * window.devicePixelRatio
canvas.width *= (compression.value / 10) * window.devicePixelRatio;

const context = canvas.getContext("webgpu");
const preferredCanvasFormat = navigator.gpu.getPreferredCanvasFormat()

async function init() {
  if (!navigator.gpu) {
    throw Error("WebGPU not supported.");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw Error("Couldn't request WebGPU adapter.");
  }

  const device = await adapter.requestDevice({
    //requiredFeatures: ["chromium-experimental-read-write-storage-texture"],
  });

  context.configure({
    device: device,
    format: preferredCanvasFormat,
    alphaMode: "premultiplied",
  });

  const shaderModule = device.createShaderModule({
    code: await (await fetch("/renderer/shaders/renderer.wgsl")).text(),
  });

  const GlobalDataBuffer = device.createBuffer({
    size: 64 + 16 + 16,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const historyImage = device.createTexture({
    size: [canvas.width, canvas.height],
    format: 'rgba16float',
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
  });

  const historyImageRead = device.createTexture({
    size: [canvas.width, canvas.height],
    format: 'rgba16float',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: "read-only-storage",
        },
      }
    ],
  });

  const sampler = device.createSampler();
  const historyImageLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {},
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        storageTexture: {
          format: "rgba16float",
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          format: "rgba16float",
        },
      },
    ],
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: GlobalDataBuffer,
        },
      },
    ],
  });


  const historyBindGroup = device.createBindGroup({
    layout: historyImageLayout,
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: historyImage.createView() },
      { binding: 2, resource: historyImageRead.createView() },
    ],
  });

  const pipelineDescriptor = {
    vertex: {
      module: shaderModule,
      entryPoint: "vertex_main",
      //buffers: vertexBuffers,
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragment_main",
      targets: [
        {
          format: navigator.gpu.getPreferredCanvasFormat(),
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
    },
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout, historyImageLayout],
    }),
  };

  const renderPipeline = device.createRenderPipeline(pipelineDescriptor);

  let lastFPSDraw = Date.now()
  let FPSNumber = 0

  function setCameraRotation(x, y) {
    Renderer.Camera.Orientation.setFromEulerAngles(x, y)
    Renderer.Camera.Orientation = Renderer.Camera.Orientation
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

  let framesStatic = 0;
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
      framesStatic = 0
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
      framesStatic = 0;
    }
  };

  setCameraRotation(0, 0)
  document.addEventListener('mousemove', handleMouseMove, false);

  let frameNumber = 0;
  function updateViewData() {
    const globalViewData = new Float32Array([
      ...Renderer.Camera.CameraToWorldMatrix.data, // CameraToWorldMatrix
      Renderer.Camera.Position.x, Renderer.Camera.Position.y, Renderer.Camera.Position.z, // position
      Renderer.Camera.FieldOfView,
      canvas.width, canvas.height, // resolution
      frameNumber, framesStatic
    ]);

    device.queue.writeBuffer(GlobalDataBuffer, 0, globalViewData, 0, globalViewData.length);
  }

  let lastCall = performance.now()
  function drawFrame() {
    const copyCommandEncoder = device.createCommandEncoder();

    copyCommandEncoder.copyTextureToTexture(
      {
        texture: historyImage,
      },
      {
        texture: historyImageRead,
      },
      {
        width: canvas.width,
        height: canvas.height,
        depthOrArrayLayers: 1,
      },
    );

    device.queue.submit([copyCommandEncoder.finish()]);

    const deltaTime = performance.now() - lastCall
    lastCall = performance.now()

    let fovValue = FOV.value / 57.2958
    if (Renderer.Camera.FieldOfView !== fovValue) {
      framesStatic = 0
      Renderer.Camera.FieldOfView = fovValue
    }

      // joysticks

      let moveJoystickX = moveJoystick.GetX() / 100;
      let moveJoystickY = moveJoystick.GetY() / 100;
  
      let movePosition = Renderer.Camera.Orientation.forward.clone().multiplyScalar(-moveJoystickY)
          .add(Renderer.Camera.Orientation.right.multiplyScalar(moveJoystickX)).normalize()
          .multiplyScalar(deltaTime / 1000 * cameraSpeed);
          
      if(movePosition.magnitude() > 0){
        Renderer.Camera.Position.add(movePosition);
        framesStatic = 0;
      }

      let rotateJoystickX = rotateJoystick.GetX() / 100;
      let rotateJoystickY = rotateJoystick.GetY() / 100;

      mouseX += rotateJoystickX / mouseDPI * deltaTime;
      mouseY += rotateJoystickY / mouseDPI * deltaTime;

      if (mouseY > Math.PI /* - Math.PI / 5*/) {
        mouseY = Math.PI ;//- Math.PI / 5;
      }

      if (mouseY < -Math.PI /*+ Math.PI / 5*/) {
        mouseY = -Math.PI ;//+ Math.PI / 5;
      }
      
      if(rotateJoystickX > 0 || rotateJoystickY > 0){
        setCameraRotation(mouseY, mouseX)
        framesStatic = 0;
      }
  
    //

    updateCamera(deltaTime)
    updateViewData()

    if (lastFPSDraw + 1000 <= Date.now()) {
      lastFPSDraw = Date.now()
      fpsCounter.textContent = `${FPSNumber} FPS`
      FPSNumber = 0;
    }

    const commandEncoder = device.createCommandEncoder();

    const clearColor = { r: 1, g: 0, b: 1, a: 1 };

    const renderPassDescriptor = {
      colorAttachments: [
        {
          clearValue: clearColor,
          loadOp: "clear",
          storeOp: "store",
          view: context.getCurrentTexture().createView(),
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    passEncoder.setPipeline(renderPipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.setBindGroup(1, historyBindGroup);
    passEncoder.draw(3);

    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);

    FPSNumber += 1;
    frameNumber += 1;
    framesStatic += 1;
    window.requestAnimationFrame(drawFrame)
  }

  window.requestAnimationFrame(drawFrame)
}

init()