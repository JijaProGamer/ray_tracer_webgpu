const Camera = require("./Camera.js")

class Renderer {
    Camera = new Camera()

    Frames = 0
    FramesStatic = 0

    //Denoiser = {type: "none"}
    Denoiser = { type: "ATrous", levels: [3, 5, 7], c_phi: 0.1, n_phi: 0.5, p_phi: 0.1 }

    constructor({ Canvas }) {
        this.Canvas = Canvas;
    }

    async Init() {
        // init GPU

        if (!navigator.gpu) {
            throw new Error("WebGPU not supported.");
        }

        this.adapter = await navigator.gpu.requestAdapter();
        if (!this.adapter) {
            throw new Error("Couldn't request WebGPU adapter.");
        }

        this.Device = await this.adapter.requestDevice({
            //requiredFeatures: ["chromium-experimental-read-write-storage-texture"],
            requiredFeatures: ["float32-filterable"]
        });

        this.context = await this.Canvas.getContext("webgpu")
        this.preferredCanvasFormat = navigator.gpu.getPreferredCanvasFormat()

        this.context.configure({
            device: this.Device,
            format: this.preferredCanvasFormat,
            alphaMode: "premultiplied",
        });

        // init buffers & layouts

        await this.MakeLayouts();
        this.MakeBuffers();
    }

    async MakeLayouts() {
        let rendererShaderModule = this.Device.createShaderModule({
            code: await (await fetch("/renderer/shaders/renderer.wgsl")).text(),
        });

        let tracerShaderModule = this.Device.createShaderModule({
            code: await (await fetch("/renderer/shaders/tracer.wgsl")).text(),
        });

        let denoiserShaderModule = this.Device.createShaderModule({
            code: await (await fetch("/renderer/shaders/denoiser.wgsl")).text(),
        });

        this.rendererDataBindGroupLayout = this.Device.createBindGroupLayout({
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

        this.historyImageLayout = this.Device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    storageTexture: {
                        format: "rgba32float",
                    },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        format: "rgba32float",
                    },
                },
            ],
        });

        this.rendererTraceImageLayout = this.Device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        format: "rgba32float",
                    },
                },
            ],
        });

        this.tracerDataBindGroupLayout = this.Device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                }
            ],
        });

        this.tracerTexturesLayout = this.Device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        format: "rgba32float",
                    },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        format: "rgba8snorm",
                    },
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        format: "rgba16float",
                    },
                }
            ],
        });

        this.denoiserDataBindGroupLayout = this.Device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                }
            ],
        });

        this.denoiserTexturesLayout = this.Device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        format: "rgba32float",
                    },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {
                        format: "rgba32float",
                    },
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {
                        format: "rgba8snorm",
                    },
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {
                        format: "rgba16float",
                    },
                }
            ],
        });

        let renderPipelineDescriptor = {
            vertex: {
                module: rendererShaderModule,
                entryPoint: "vertex_main",
                //buffers: vertexBuffers,
            },
            fragment: {
                module: rendererShaderModule,
                entryPoint: "fragment_main",
                targets: [
                    {
                        format: this.preferredCanvasFormat,
                    },
                ],
            },
            primitive: {
                topology: "triangle-list",
            },
            layout: this.Device.createPipelineLayout({
                bindGroupLayouts: [this.rendererDataBindGroupLayout, this.historyImageLayout, this.rendererTraceImageLayout],
            }),
        };

        let computePipelineDescriptor = {
            compute: {
                module: tracerShaderModule,
                entryPoint: "main"
            },
            layout: this.Device.createPipelineLayout({
                bindGroupLayouts: [this.tracerDataBindGroupLayout, this.tracerTexturesLayout]
            }),
        }

        let denoiserPipelineDescriptor = {
            compute: {
                module: denoiserShaderModule,
                entryPoint: "main"
            },
            layout: this.Device.createPipelineLayout({
                bindGroupLayouts: [this.denoiserDataBindGroupLayout, this.denoiserTexturesLayout]
            }),
        }

        this.renderPipeline = this.Device.createRenderPipeline(renderPipelineDescriptor);
        this.tracerPipeline = this.Device.createComputePipeline(computePipelineDescriptor);
        this.denoiserPipeline = this.Device.createComputePipeline(denoiserPipelineDescriptor);
    }

    MakeBuffers() {
        this.GlobalDataBuffer = this.Device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        this.CameraDataBuffer = this.Device.createBuffer({
            size: 64 + 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        this.DenoiserDataBuffer = this.Device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });



        this.denoisedTexture = this.Device.createTexture({
            size: [this.Canvas.width, this.Canvas.height],
            format: 'rgba32float',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });

        this.historyImage = this.Device.createTexture({
            size: [this.Canvas.width, this.Canvas.height],
            format: 'rgba32float',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
        });

        this.historyImageRead = this.Device.createTexture({
            size: [this.Canvas.width, this.Canvas.height],
            format: 'rgba32float',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });



        this.illuminationTexture = this.Device.createTexture({
            size: [this.Canvas.width, this.Canvas.height],
            format: 'rgba32float',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
        });

        this.illuminationTextureRead = this.Device.createTexture({
            size: [this.Canvas.width, this.Canvas.height],
            format: 'rgba32float',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });

        this.normalTexture = this.Device.createTexture({
            size: [this.Canvas.width, this.Canvas.height],
            format: 'rgba8snorm',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
        });

        this.normalTextureRead = this.Device.createTexture({
            size: [this.Canvas.width, this.Canvas.height],
            format: 'rgba8snorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });

        this.positionTexture = this.Device.createTexture({
            size: [this.Canvas.width, this.Canvas.height],
            format: 'rgba16float',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
        });

        this.positionTextureRead = this.Device.createTexture({
            size: [this.Canvas.width, this.Canvas.height],
            format: 'rgba16float',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });

        /*this.albedoTexture = this.Device.createTexture({
            size: [this.Canvas.width, this.Canvas.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
        });

        this.albedoTextureRead = this.Device.createTexture({
            size: [this.Canvas.width, this.Canvas.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });*/


        this.rendererDataBindGroup = this.Device.createBindGroup({
            layout: this.rendererDataBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.GlobalDataBuffer,
                    },
                },
            ],
        });

        this.historyBindGroup = this.Device.createBindGroup({
            layout: this.historyImageLayout,
            entries: [
                { binding: 0, resource: this.historyImage.createView() },
                { binding: 1, resource: this.historyImageRead.createView() },
            ],
        });

        this.rendererTraceBindGrup = this.Device.createBindGroup({
            layout: this.rendererTraceImageLayout,
            entries: [
                { binding: 0, resource: this.denoisedTexture.createView() },
            ],
        });

        this.tracerDataBindGroup = this.Device.createBindGroup({
            layout: this.tracerDataBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.GlobalDataBuffer,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.CameraDataBuffer,
                    },
                },
            ],
        });

        this.tracerTexturesBindGroup = this.Device.createBindGroup({
            layout: this.tracerTexturesLayout,
            entries: [
                { binding: 0, resource: this.illuminationTexture.createView() },
                { binding: 1, resource: this.normalTexture.createView() },
                { binding: 2, resource: this.positionTexture.createView() },
            ],
        });

        this.denoiserDataBindGroup = this.Device.createBindGroup({
            layout: this.denoiserDataBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.GlobalDataBuffer,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.DenoiserDataBuffer,
                    },
                },
            ],
        });

        this.denoiserTexturesBindGroup = this.Device.createBindGroup({
            layout: this.denoiserTexturesLayout,
            entries: [
                { binding: 0, resource: this.illuminationTexture.createView() },
                { binding: 1, resource: this.illuminationTextureRead.createView() },
                { binding: 2, resource: this.normalTextureRead.createView() },
                { binding: 3, resource: this.positionTextureRead.createView() },
            ],
        });
    }

    #UpdateGlobalData() {
        const globalViewData = new Float32Array([
            this.Canvas.width, this.Canvas.height, // resolution
            this.Frames,
            this.FramesStatic
        ]);

        this.Device.queue.writeBuffer(this.GlobalDataBuffer, 0, globalViewData, 0, globalViewData.length);
    }

    #UpdateCameraData() {
        const cameraData = new Float32Array([
            ...this.Camera.CameraToWorldMatrix.data,
            this.Camera.Position.x, this.Camera.Position.y, this.Camera.Position.z, // position
            this.Camera.FieldOfView,
        ]);

        this.Device.queue.writeBuffer(this.CameraDataBuffer, 0, cameraData, 0, cameraData.length);
        this.FramesStatic = 0;
        this.Camera.CameraMoved = false
    }

    async DenoiseFrame() {
        switch (this.Denoiser.type) {
            case "none":
                var copyCommandEncoder = this.Device.createCommandEncoder();

                copyCommandEncoder.copyTextureToTexture(
                    {
                        texture: this.illuminationTexture,
                    },
                    {
                        texture: this.denoisedTexture,
                    },
                    {
                        width: this.Canvas.width,
                        height: this.Canvas.height,
                        depthOrArrayLayers: 1,
                    },
                );

                this.Device.queue.submit([copyCommandEncoder.finish()]);
                break;
            case "ATrous":
                var copyCommandEncoder = this.Device.createCommandEncoder();

                copyCommandEncoder.copyTextureToTexture(
                    {
                        texture: this.normalTexture,
                    },
                    {
                        texture: this.normalTextureRead,
                    },
                    {
                        width: this.Canvas.width,
                        height: this.Canvas.height,
                        depthOrArrayLayers: 1,
                    },
                );

                copyCommandEncoder.copyTextureToTexture(
                    {
                        texture: this.positionTexture,
                    },
                    {
                        texture: this.positionTextureRead,
                    },
                    {
                        width: this.Canvas.width,
                        height: this.Canvas.height,
                        depthOrArrayLayers: 1,
                    },
                );

                this.Device.queue.submit([copyCommandEncoder.finish()]);

                for (let i = 0; i < this.Denoiser.levels.length; i++) {
                    var textureCopyCommandEncoder = this.Device.createCommandEncoder();

                    textureCopyCommandEncoder.copyTextureToTexture(
                        {
                            texture: this.illuminationTexture,
                        },
                        {
                            texture: this.illuminationTextureRead,
                        },
                        {
                            width: this.Canvas.width,
                            height: this.Canvas.height,
                            depthOrArrayLayers: 1,
                        },
                    );

                    this.Device.queue.submit([textureCopyCommandEncoder.finish()]);

                    var denoiserData = new Float32Array([
                        this.Denoiser.c_phi,
                        this.Denoiser.n_phi,
                        this.Denoiser.p_phi,
                        this.Denoiser.levels[i]
                    ]);
            
                    this.Device.queue.writeBuffer(this.DenoiserDataBuffer, 0, denoiserData, 0, denoiserData.length);

                    var commandEncoder = this.Device.createCommandEncoder();

                    var passEncoder = commandEncoder.beginComputePass();
                    passEncoder.setPipeline(this.denoiserPipeline);
            
                    passEncoder.setBindGroup(0, this.denoiserDataBindGroup);
                    passEncoder.setBindGroup(1, this.denoiserTexturesBindGroup);
            
                    passEncoder.dispatchWorkgroups(this.Canvas.width / 8, this.Canvas.height / 8);
                    passEncoder.end();
            
                    this.Device.queue.submit([commandEncoder.finish()]);
            
                    await this.Device.queue.onSubmittedWorkDone();
                }

                

                var DenoisedTextureCopyCommandEncoder = this.Device.createCommandEncoder();

                DenoisedTextureCopyCommandEncoder.copyTextureToTexture(
                    {
                        texture: this.illuminationTexture,
                    },
                    {
                        texture: this.denoisedTexture,
                    },
                    {
                        width: this.Canvas.width,
                        height: this.Canvas.height,
                        depthOrArrayLayers: 1,
                    },
                );

                this.Device.queue.submit([DenoisedTextureCopyCommandEncoder.finish()]);

                break;
        }
    }

    async MakeFrame() {
        if (this.Camera.CameraMoved) {
            this.#UpdateCameraData()
        }

        this.#UpdateGlobalData()
        await this.DenoiseFrame()

        const commandEncoder = this.Device.createCommandEncoder();

        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.tracerPipeline);

        passEncoder.setBindGroup(0, this.tracerDataBindGroup);
        passEncoder.setBindGroup(1, this.tracerTexturesBindGroup);

        passEncoder.dispatchWorkgroups(this.Canvas.width / 8, this.Canvas.height / 8);
        passEncoder.end();

        this.Device.queue.submit([commandEncoder.finish()]);

        await this.Device.queue.onSubmittedWorkDone();
    }

    async RenderFrame() {
        // Copy history texture

        const copyCommandEncoder = this.Device.createCommandEncoder();

        copyCommandEncoder.copyTextureToTexture(
            {
                texture: this.historyImage,
            },
            {
                texture: this.historyImageRead,
            },
            {
                width: this.Canvas.width,
                height: this.Canvas.height,
                depthOrArrayLayers: 1,
            },
        );

        this.Device.queue.submit([copyCommandEncoder.finish()]);

        // Render

        const commandEncoder = this.Device.createCommandEncoder();

        const clearColor = { r: 1, g: 0, b: 1, a: 1 };

        const renderPassDescriptor = {
            colorAttachments: [
                {
                    clearValue: clearColor,
                    loadOp: "clear",
                    storeOp: "store",
                    view: this.context.getCurrentTexture().createView(),
                },
            ],
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

        passEncoder.setPipeline(this.renderPipeline);
        passEncoder.setBindGroup(0, this.rendererDataBindGroup);
        passEncoder.setBindGroup(1, this.historyBindGroup);
        passEncoder.setBindGroup(2, this.rendererTraceBindGrup);
        passEncoder.draw(3);

        passEncoder.end();

        this.Device.queue.submit([commandEncoder.finish()]);

        this.Frames += 1;
        this.FramesStatic += 1;
    }
}

module.exports = Renderer