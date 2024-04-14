const Camera = require("./Camera.js")

class Renderer {
    Camera = new Camera()

    Frames = 0
    FramesStatic = 0

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
        this.shaderModule = this.Device.createShaderModule({
            code: await (await fetch("/renderer/shaders/renderer.wgsl")).text(),
        });

        this.sampler = this.Device.createSampler();

        this.dataBindGroupLayout = this.Device.createBindGroupLayout({
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

        this.pipelineDescriptor = {
            vertex: {
                module: this.shaderModule,
                entryPoint: "vertex_main",
                //buffers: vertexBuffers,
            },
            fragment: {
                module: this.shaderModule,
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
                bindGroupLayouts: [this.dataBindGroupLayout, this.historyImageLayout],
            }),
        };

        this.renderPipeline = this.Device.createRenderPipeline(this.pipelineDescriptor);
    }

    MakeBuffers() {
        this.GlobalDataBuffer = this.Device.createBuffer({
            size: 64 + 16 + 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        this.historyImage = this.Device.createTexture({
            size: [this.Canvas.width, this.Canvas.height],
            format: 'rgba16float',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
        });

        this.historyImageRead = this.Device.createTexture({
            size: [this.Canvas.width, this.Canvas.height],
            format: 'rgba16float',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });

        this.dataBindGroup = this.Device.createBindGroup({
            layout: this.dataBindGroupLayout,
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
                { binding: 0, resource: this.sampler },
                { binding: 1, resource: this.historyImage.createView() },
                { binding: 2, resource: this.historyImageRead.createView() },
            ],
        });
    }

    MakeFrame() {

    }

    RenderFrame() {
        // Copy history

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
        passEncoder.setBindGroup(0, this.dataBindGroup);
        passEncoder.setBindGroup(1, this.historyBindGroup);
        passEncoder.draw(3);

        passEncoder.end();

        this.Device.queue.submit([commandEncoder.finish()]);

        this.Frames += 1;
        this.FramesStatic += 1;
    }
}

module.exports = Renderer