/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

eval("const moveJoystick = new JoyStick('moveJoystick');\nconst rotateJoystick = new JoyStick('rotateJoystick');\n\nconst renderer = __webpack_require__(/*! ./renderer/Renderer.js */ \"./src/renderer/Renderer.js\")\nconst Vector3 = __webpack_require__(/*! ./renderer/classes/Vector3.js */ \"./src/renderer/classes/Vector3.js\")\nconst Renderer = new renderer()\n\nconst canvas = document.querySelector(`canvas[id=\"canvas\"]`)\nconst fpsCounter = document.querySelector(\"#fpsCount\")\nconst compression = document.querySelector(\"#compression-range\")\nconst FOV = document.querySelector(\"#fov-range\")\n\ncanvas.width = 86 / 100 * window.screen.width;\ncanvas.height = (9 / 16 * canvas.width) * (compression.value / 10) * window.devicePixelRatio\ncanvas.width *= (compression.value / 10) * window.devicePixelRatio;\n\nconst context = canvas.getContext(\"webgpu\");\nconst preferredCanvasFormat = navigator.gpu.getPreferredCanvasFormat()\n\nasync function init() {\n  if (!navigator.gpu) {\n    throw Error(\"WebGPU not supported.\");\n  }\n\n  const adapter = await navigator.gpu.requestAdapter();\n  if (!adapter) {\n    throw Error(\"Couldn't request WebGPU adapter.\");\n  }\n\n  const device = await adapter.requestDevice({\n    //requiredFeatures: [\"chromium-experimental-read-write-storage-texture\"],\n  });\n\n  context.configure({\n    device: device,\n    format: preferredCanvasFormat,\n    alphaMode: \"premultiplied\",\n  });\n\n  const shaderModule = device.createShaderModule({\n    code: await (await fetch(\"/renderer/shaders/renderer.wgsl\")).text(),\n  });\n\n  const GlobalDataBuffer = device.createBuffer({\n    size: 64 + 16 + 16,\n    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,\n  });\n\n  const historyImage = device.createTexture({\n    size: [canvas.width, canvas.height],\n    format: 'rgba16float',\n    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,\n  });\n\n  const historyImageRead = device.createTexture({\n    size: [canvas.width, canvas.height],\n    format: 'rgba16float',\n    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,\n  });\n\n  const bindGroupLayout = device.createBindGroupLayout({\n    entries: [\n      {\n        binding: 0,\n        visibility: GPUShaderStage.FRAGMENT,\n        buffer: {\n          type: \"read-only-storage\",\n        },\n      }\n    ],\n  });\n\n  const sampler = device.createSampler();\n  const historyImageLayout = device.createBindGroupLayout({\n    entries: [\n      {\n        binding: 0,\n        visibility: GPUShaderStage.FRAGMENT,\n        sampler: {},\n      },\n      {\n        binding: 1,\n        visibility: GPUShaderStage.FRAGMENT,\n        storageTexture: {\n          format: \"rgba16float\",\n        },\n      },\n      {\n        binding: 2,\n        visibility: GPUShaderStage.FRAGMENT,\n        texture: {\n          format: \"rgba16float\",\n        },\n      },\n    ],\n  });\n\n  const bindGroup = device.createBindGroup({\n    layout: bindGroupLayout,\n    entries: [\n      {\n        binding: 0,\n        resource: {\n          buffer: GlobalDataBuffer,\n        },\n      },\n    ],\n  });\n\n\n  const historyBindGroup = device.createBindGroup({\n    layout: historyImageLayout,\n    entries: [\n      { binding: 0, resource: sampler },\n      { binding: 1, resource: historyImage.createView() },\n      { binding: 2, resource: historyImageRead.createView() },\n    ],\n  });\n\n  const pipelineDescriptor = {\n    vertex: {\n      module: shaderModule,\n      entryPoint: \"vertex_main\",\n      //buffers: vertexBuffers,\n    },\n    fragment: {\n      module: shaderModule,\n      entryPoint: \"fragment_main\",\n      targets: [\n        {\n          format: navigator.gpu.getPreferredCanvasFormat(),\n        },\n      ],\n    },\n    primitive: {\n      topology: \"triangle-list\",\n    },\n    layout: device.createPipelineLayout({\n      bindGroupLayouts: [bindGroupLayout, historyImageLayout],\n    }),\n  };\n\n  const renderPipeline = device.createRenderPipeline(pipelineDescriptor);\n\n  let lastFPSDraw = Date.now()\n  let FPSNumber = 0\n\n  function setCameraRotation(x, y) {\n    Renderer.Camera.Orientation.setFromEulerAngles(x, y)\n    Renderer.Camera.Orientation = Renderer.Camera.Orientation\n  }\n\n  canvas.addEventListener('click', () => {\n    canvas.requestPointerLock();\n  });\n\n  let mouseX = 0\n  let mouseY = 0\n  let mouseDPI = 750;\n  let cameraSpeed = 2.5;\n\n  const movement = {\n    forward: false,\n    backward: false,\n    left: false,\n    right: false,\n    up: false,\n    down: false\n  };\n\n  function handleKeyDown(event) {\n    switch (event.key) {\n      case 'w':\n        movement.forward = true;\n        break;\n      case 'a':\n        movement.left = true;\n        break;\n      case 's':\n        movement.backward = true;\n        break;\n      case 'd':\n        movement.right = true;\n        break;\n      case 'q':\n        movement.up = true;\n        break;\n      case 'e':\n        movement.down = true;\n        break;\n    }\n  }\n\n  function handleKeyUp(event) {\n    switch (event.key) {\n      case 'w':\n        movement.forward = false;\n        break;\n      case 'a':\n        movement.left = false;\n        break;\n      case 's':\n        movement.backward = false;\n        break;\n      case 'd':\n        movement.right = false;\n        break;\n      case 'q':\n        movement.up = false;\n        break;\n      case 'e':\n        movement.down = false;\n        break;\n    }\n  }\n\n  let framesStatic = 0;\n  function updateCamera(deltaTime) {\n    const movementVector = new Vector3(0, 0, 0);\n\n    if (movement.forward) movementVector.add(Renderer.Camera.Orientation.forward);\n    if (movement.backward) movementVector.subtract(Renderer.Camera.Orientation.forward);\n    if (movement.left) movementVector.add(Renderer.Camera.Orientation.right);\n    if (movement.right) movementVector.add(Renderer.Camera.Orientation.right.clone().multiplyScalar(-1));\n    if (movement.up) movementVector.add(Renderer.Camera.Orientation.up);\n    if (movement.down) movementVector.subtract(Renderer.Camera.Orientation.up);\n\n    if (movementVector.magnitude() > 0) {\n      movementVector.normalize();\n      movementVector.multiplyScalar(-1 * deltaTime / 1000 * cameraSpeed);\n\n      Renderer.Camera.Position.add(movementVector);\n      framesStatic = 0\n    }\n  }\n\n  document.addEventListener('keydown', handleKeyDown);\n  document.addEventListener('keyup', handleKeyUp);\n\n  const handleMouseMove = (event) => {\n    if (document.pointerLockElement === canvas) {\n      mouseX += event.movementX / mouseDPI;\n      mouseY -= event.movementY / mouseDPI;\n\n      if (mouseY > Math.PI) {\n        mouseY = Math.PI;\n      }\n\n      if (mouseY < -Math.PI) {\n        mouseY = -Math.PI;\n      }\n\n      setCameraRotation(mouseY, mouseX)\n      framesStatic = 0;\n    }\n  };\n\n  setCameraRotation(0, 0)\n  document.addEventListener('mousemove', handleMouseMove, false);\n\n  let frameNumber = 0;\n  function updateViewData() {\n    const globalViewData = new Float32Array([\n      ...Renderer.Camera.CameraToWorldMatrix.data, // CameraToWorldMatrix\n      Renderer.Camera.Position.x, Renderer.Camera.Position.y, Renderer.Camera.Position.z, // position\n      Renderer.Camera.FieldOfView,\n      canvas.width, canvas.height, // resolution\n      frameNumber, framesStatic\n    ]);\n\n    device.queue.writeBuffer(GlobalDataBuffer, 0, globalViewData, 0, globalViewData.length);\n  }\n\n  let lastCall = performance.now()\n  function drawFrame() {\n    const copyCommandEncoder = device.createCommandEncoder();\n\n    copyCommandEncoder.copyTextureToTexture(\n      {\n        texture: historyImage,\n      },\n      {\n        texture: historyImageRead,\n      },\n      {\n        width: canvas.width,\n        height: canvas.height,\n        depthOrArrayLayers: 1,\n      },\n    );\n\n    device.queue.submit([copyCommandEncoder.finish()]);\n\n    const deltaTime = performance.now() - lastCall\n    lastCall = performance.now()\n\n    let fovValue = FOV.value / 57.2958\n    if (Renderer.Camera.FieldOfView !== fovValue) {\n      framesStatic = 0\n      Renderer.Camera.FieldOfView = fovValue\n    }\n\n      // joysticks\n\n      let moveJoystickX = moveJoystick.GetX() / 100;\n      let moveJoystickY = moveJoystick.GetY() / 100;\n  \n      let movePosition = Renderer.Camera.Orientation.forward.clone().multiplyScalar(-moveJoystickY)\n          .add(Renderer.Camera.Orientation.right.multiplyScalar(moveJoystickX)).normalize()\n          .multiplyScalar(deltaTime / 1000 * cameraSpeed);\n          \n      if(movePosition.magnitude() > 0){\n        Renderer.Camera.Position.add(movePosition);\n        framesStatic = 0;\n      }\n\n      let rotateJoystickX = rotateJoystick.GetX() / 100;\n      let rotateJoystickY = rotateJoystick.GetY() / 100;\n\n      mouseX += rotateJoystickX / mouseDPI * deltaTime;\n      mouseY += rotateJoystickY / mouseDPI * deltaTime;\n\n      if (mouseY > Math.PI /* - Math.PI / 5*/) {\n        mouseY = Math.PI ;//- Math.PI / 5;\n      }\n\n      if (mouseY < -Math.PI /*+ Math.PI / 5*/) {\n        mouseY = -Math.PI ;//+ Math.PI / 5;\n      }\n      \n      if(rotateJoystickX > 0 || rotateJoystickY > 0){\n        setCameraRotation(mouseY, mouseX)\n        framesStatic = 0;\n      }\n  \n    //\n\n    updateCamera(deltaTime)\n    updateViewData()\n\n    if (lastFPSDraw + 1000 <= Date.now()) {\n      lastFPSDraw = Date.now()\n      fpsCounter.textContent = `${FPSNumber} FPS`\n      FPSNumber = 0;\n    }\n\n    const commandEncoder = device.createCommandEncoder();\n\n    const clearColor = { r: 1, g: 0, b: 1, a: 1 };\n\n    const renderPassDescriptor = {\n      colorAttachments: [\n        {\n          clearValue: clearColor,\n          loadOp: \"clear\",\n          storeOp: \"store\",\n          view: context.getCurrentTexture().createView(),\n        },\n      ],\n    };\n\n    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);\n\n    passEncoder.setPipeline(renderPipeline);\n    passEncoder.setBindGroup(0, bindGroup);\n    passEncoder.setBindGroup(1, historyBindGroup);\n    passEncoder.draw(3);\n\n    passEncoder.end();\n\n    device.queue.submit([commandEncoder.finish()]);\n\n    FPSNumber += 1;\n    frameNumber += 1;\n    framesStatic += 1;\n    window.requestAnimationFrame(drawFrame)\n  }\n\n  window.requestAnimationFrame(drawFrame)\n}\n\ninit()\n\n//# sourceURL=webpack://ray_tracer_webgpu/./src/index.js?");

/***/ }),

/***/ "./src/renderer/Camera.js":
/*!********************************!*\
  !*** ./src/renderer/Camera.js ***!
  \********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("const Vector3 = __webpack_require__(/*! ./classes/Vector3.js */ \"./src/renderer/classes/Vector3.js\")\nconst Matrix = __webpack_require__(/*! ./classes/Matrix.js */ \"./src/renderer/classes/Matrix.js\")\nconst Quaternion = __webpack_require__(/*! ./classes/Quaternion.js */ \"./src/renderer/classes/Quaternion.js\")\n\nclass Camera {\n    #Position = new Vector3(0, 0, 0);\n    #Orientation = new Quaternion(0, 0, 0, 1);\n    FieldOfView = Math.PI / 2;\n\n    CameraToWorldMatrix = new Matrix(4, 4);\n\n    set Position(pos) {\n        this.#Position = pos\n        //this.#ComputeCameraToWorldMatrix()\n    }\n\n    get Position(){\n        return this.#Position\n    }\n\n    set Orientation(orientation) {\n        this.#Orientation = orientation\n        this.#ComputeCameraToWorldMatrix()\n    }\n\n    get Orientation(){\n        return this.#Orientation\n    }\n\n    #ComputeCameraToWorldMatrix() {\n        this.CameraToWorldMatrix.set(0, 0, this.Orientation.right.x  ); this.CameraToWorldMatrix.set(0, 1, this.Orientation.right.y );  this.CameraToWorldMatrix.set(0, 2, this.Orientation.right.z  ); this.CameraToWorldMatrix.set(0, 3, 0);\n        this.CameraToWorldMatrix.set(1, 0, this.Orientation.up.x     ); this.CameraToWorldMatrix.set(1, 1, this.Orientation.up.y    );  this.CameraToWorldMatrix.set(1, 2, this.Orientation.up.z     ); this.CameraToWorldMatrix.set(1, 3, 0);\n        this.CameraToWorldMatrix.set(2, 0, this.Orientation.forward.x); this.CameraToWorldMatrix.set(2, 1, this.Orientation.forward.y); this.CameraToWorldMatrix.set(2, 2, this.Orientation.forward.z); this.CameraToWorldMatrix.set(2, 3, 0);\n        this.CameraToWorldMatrix.set(3, 0, 0                         ); this.CameraToWorldMatrix.set(3, 1, 0                         ); this.CameraToWorldMatrix.set(3, 2, 0                         ); this.CameraToWorldMatrix.set(3, 3, 1);\n    }\n\n    SetOrientationMatrix(matrix){\n        const rotationMatrix = new Matrix(3, 3, [\n            matrix.get(0, 0), matrix.get(0, 1), matrix.get(0, 2),\n            matrix.get(1, 0), matrix.get(1, 1), matrix.get(1, 2),\n            matrix.get(2, 0), matrix.get(2, 1), matrix.get(2, 2)\n        ]);\n    \n        const translationVector = new Vector3(\n            matrix.get(0, 3),\n            matrix.get(1, 3),\n            matrix.get(2, 3)\n        );\n    \n        const trace = rotationMatrix.get(0, 0) + rotationMatrix.get(1, 1) + rotationMatrix.get(2, 2);\n        let qx, qy, qz, qw;\n    \n        if (trace > 0) {\n            const s = 0.5 / Math.sqrt(trace + 1.0);\n            qw = 0.25 / s;\n            qx = (rotationMatrix.get(2, 1) - rotationMatrix.get(1, 2)) * s;\n            qy = (rotationMatrix.get(0, 2) - rotationMatrix.get(2, 0)) * s;\n            qz = (rotationMatrix.get(1, 0) - rotationMatrix.get(0, 1)) * s;\n        } else if (rotationMatrix.get(0, 0) > rotationMatrix.get(1, 1) && rotationMatrix.get(0, 0) > rotationMatrix.get(2, 2)) {\n            const s = 2.0 * Math.sqrt(1.0 + rotationMatrix.get(0, 0) - rotationMatrix.get(1, 1) - rotationMatrix.get(2, 2));\n            qw = (rotationMatrix.get(2, 1) - rotationMatrix.get(1, 2)) / s;\n            qx = 0.25 * s;\n            qy = (rotationMatrix.get(0, 1) + rotationMatrix.get(1, 0)) / s;\n            qz = (rotationMatrix.get(0, 2) + rotationMatrix.get(2, 0)) / s;\n        } else if (rotationMatrix.get(1, 1) > rotationMatrix.get(2, 2)) {\n            const s = 2.0 * Math.sqrt(1.0 + rotationMatrix.get(1, 1) - rotationMatrix.get(0, 0) - rotationMatrix.get(2, 2));\n            qw = (rotationMatrix.get(0, 2) - rotationMatrix.get(2, 0)) / s;\n            qx = (rotationMatrix.get(0, 1) + rotationMatrix.get(1, 0)) / s;\n            qy = 0.25 * s;\n            qz = (rotationMatrix.get(1, 2) + rotationMatrix.get(2, 1)) / s;\n        } else {\n            const s = 2.0 * Math.sqrt(1.0 + rotationMatrix.get(2, 2) - rotationMatrix.get(0, 0) - rotationMatrix.get(1, 1));\n            qw = (rotationMatrix.get(1, 0) - rotationMatrix.get(0, 1)) / s;\n            qx = (rotationMatrix.get(0, 2) + rotationMatrix.get(2, 0)) / s;\n            qy = (rotationMatrix.get(1, 2) + rotationMatrix.get(2, 1)) / s;\n            qz = 0.25 * s;\n        }\n    \n        const quaternion = new Quaternion(qx, qy, qz, qw).normalize();\n\n        this.#Position = translationVector // only this one sets private, so that it doesnt call ComputeCameraToWorldMatrix \n        this.Orientation = quaternion;\n    }\n}\n\nmodule.exports = Camera\n\n//# sourceURL=webpack://ray_tracer_webgpu/./src/renderer/Camera.js?");

/***/ }),

/***/ "./src/renderer/Renderer.js":
/*!**********************************!*\
  !*** ./src/renderer/Renderer.js ***!
  \**********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("const Camera = __webpack_require__(/*! ./Camera.js */ \"./src/renderer/Camera.js\")\n\nclass Renderer {\n    Camera = new Camera()\n    \n\n}\n\nmodule.exports = Renderer\n\n//# sourceURL=webpack://ray_tracer_webgpu/./src/renderer/Renderer.js?");

/***/ }),

/***/ "./src/renderer/classes/Matrix.js":
/*!****************************************!*\
  !*** ./src/renderer/classes/Matrix.js ***!
  \****************************************/
/***/ ((module) => {

eval("class Matrix {\n    constructor(rows, cols, initial) {\n        this.rows = rows;\n        this.cols = cols;\n        this.data = initial || new Array(rows * cols);\n    }\n\n    getIndex(row, col) {\n        return row * this.cols + col;\n    }\n\n    set(row, col, value) {\n        const index = this.getIndex(row, col);\n        if (index >= 0 && index < this.rows * this.cols) {\n            this.data[index] = value;\n        } else {\n            throw new Error('Index out of range');\n        }\n    }\n\n    get(row, col) {\n        const index = this.getIndex(row, col);\n\n        if (index >= 0 && index < this.rows * this.cols) {\n            return this.data[index];\n        } else {\n            throw new Error('Index out of range');\n        }\n    }\n\n    multiply(otherMatrix) {\n        if (this.cols !== otherMatrix.rows) {\n            throw new Error('Incompatible matrices for multiplication');\n        }\n\n        const result = new Matrix(this.rows, otherMatrix.cols);\n\n        for (let i = 0; i < this.rows; i++) {\n            for (let j = 0; j < otherMatrix.cols; j++) {\n                let sum = 0;\n\n                for (let k = 0; k < this.cols; k++) {\n                    sum += this.get(i, k) * otherMatrix.get(k, j);\n                }\n\n                result.set(i, j, sum);\n            }\n        }\n\n        return result;\n    }\n}\n\nmodule.exports = Matrix;\n\n//# sourceURL=webpack://ray_tracer_webgpu/./src/renderer/classes/Matrix.js?");

/***/ }),

/***/ "./src/renderer/classes/Quaternion.js":
/*!********************************************!*\
  !*** ./src/renderer/classes/Quaternion.js ***!
  \********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("const Matrix = __webpack_require__(/*! ./Matrix.js */ \"./src/renderer/classes/Matrix.js\")\nconst Vector3 = __webpack_require__(/*! ./Vector3.js */ \"./src/renderer/classes/Vector3.js\")\n\nclass Quaternion {\n    constructor(w, x, y, z) {\n        this.w = w || 0;\n        this.x = x || 0;\n        this.y = y || 0;\n        this.z = z || 0;\n    }\n\n    get forward() {\n        return this.multiplyVector(new Vector3(0, 0, 1)).normalize();\n    }\n\n    get up() {\n        return this.multiplyVector(new Vector3(0, 1, 0)).normalize();\n    }\n\n    get right() {\n        return this.forward.cross(this.up).normalize();\n    }\n\n    multiplyVector(v) {\n        const qv = new Quaternion(0, v.x, v.y, v.z);\n        const conjugate = this.conjugate();\n        const rotatedVector = this.multiply(qv).multiply(conjugate);\n\n        return new Vector3(rotatedVector.x, rotatedVector.y, rotatedVector.z);\n    }\n\n    magnitude() {\n        return Math.sqrt(this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z);\n    }\n\n    normalize() {\n        const mag = this.magnitude();\n        this.w /= mag;\n        this.x /= mag;\n        this.y /= mag;\n        this.z /= mag;\n\n        return this;\n    }\n\n    multiply(q) {\n        const w = this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z;\n        const x = this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y;\n        const y = this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x;\n        const z = this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w;\n\n        return new Quaternion(w, x, y, z);\n    }\n\n    conjugate() {\n        return new Quaternion(this.w, -this.x, -this.y, -this.z);\n    }\n\n    setFromEulerAngles(xRotation, yRotation) {\n        xRotation = normalizeAngle(xRotation);\n        yRotation = normalizeAngle(yRotation);\n\n        const halfX = xRotation / 2;\n        const halfY = yRotation / 2;\n\n        const cosHalfX = Math.cos(halfX);\n        const sinHalfX = Math.sin(halfX);\n        const cosHalfY = Math.cos(halfY);\n        const sinHalfY = Math.sin(halfY);\n\n        this.w = cosHalfX * cosHalfY;\n        this.x = sinHalfX * cosHalfY;\n        this.y = cosHalfX * sinHalfY;\n        this.z = -sinHalfX * sinHalfY;\n\n        return this;\n    }\n\n    getEulerAngles(){\n        const { x, y, z, w } = this;\n\n        const sinP = 2.0 * (w * x + y * z);\n        const cosP = 1.0 - 2.0 * (x * x + y * y);\n        const pitch = Math.atan2(sinP, cosP);\n    \n        const sinY = 2.0 * (w * y - z * x);\n        const cosY = 1.0 - 2.0 * (y * y + z * z);\n        const yaw = Math.atan2(sinY, cosY);\n    \n        const sinR = 2.0 * (w * z + x * y);\n        const cosR = 1.0 - 2.0 * (y * y + z * z);\n        const roll = Math.atan2(sinR, cosR);\n    \n        return new Vector3(pitch, yaw, roll);\n    }\n\n    toRotationMatrix() {\n        const { w, x, y, z } = this;\n        const xx = x * x;\n        const yy = y * y;\n        const zz = z * z;\n        const xy = x * y;\n        const xz = x * z;\n        const yz = y * z;\n        const wx = w * x;\n        const wy = w * y;\n        const wz = w * z;\n\n        return new Matrix(3, 3, [\n            1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy),\n            2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx),\n            2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy)\n        ]);\n    }\n}\n\nfunction normalizeAngle(angle) {\n    angle %= 2 * Math.PI;\n    \n    if (angle > Math.PI) {\n        angle -= 2 * Math.PI;\n    } else if (angle < -Math.PI) {\n        angle += 2 * Math.PI;\n    }\n\n    return angle;\n}\n\n\nmodule.exports = Quaternion;\n\n\n//# sourceURL=webpack://ray_tracer_webgpu/./src/renderer/classes/Quaternion.js?");

/***/ }),

/***/ "./src/renderer/classes/Vector3.js":
/*!*****************************************!*\
  !*** ./src/renderer/classes/Vector3.js ***!
  \*****************************************/
/***/ ((module) => {

eval("class Vector3 {\n    constructor(x, y, z) {\n        this.x = x || 0;\n        this.y = y || 0;\n        this.z = z || 0;\n    }\n\n    magnitude() {\n        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);\n    }\n\n    normalize() {\n        const mag = this.magnitude();\n        if (mag !== 0) {\n            this.x /= mag;\n            this.y /= mag;\n            this.z /= mag;\n        }\n\n        return this;\n    }\n\n    add(v) {\n        this.x += v.x;\n        this.y += v.y;\n        this.z += v.z;\n\n        return this;\n    }\n\n    subtract(v) {\n        this.x -= v.x;\n        this.y -= v.y;\n        this.z -= v.z;\n\n        return this;\n    }\n\n    dot(v) {\n        return this.x * v.x + this.y * v.y + this.z * v.z;\n    }\n\n    cross(v) {\n        const x = this.y * v.z - this.z * v.y;\n        const y = this.z * v.x - this.x * v.z;\n        const z = this.x * v.y - this.y * v.x;\n        return new Vector3(x, y, z);\n    }\n\n    multiplyScalar(scalar) {\n        this.x *= scalar;\n        this.y *= scalar;\n        this.z *= scalar;\n\n        return this;\n    }\n\n    clone() {\n        return new Vector3(this.x, this.y, this.z);\n    }\n\n    static distance(v1, v2) {\n        const dx = v1.x - v2.x;\n        const dy = v1.y - v2.y;\n        const dz = v1.z - v2.z;\n        return Math.sqrt(dx * dx + dy * dy + dz * dz);\n    }\n}\n\nmodule.exports = Vector3;\n\n//# sourceURL=webpack://ray_tracer_webgpu/./src/renderer/classes/Vector3.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/index.js");
/******/ 	
/******/ })()
;