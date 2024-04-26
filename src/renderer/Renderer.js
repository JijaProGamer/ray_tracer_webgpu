const Camera = require("./Camera.js");
const Vector2 = require("./classes/Vector2.js");
const Vector3 = require("./classes/Vector3.js");

const processorList = require("./post_processing/processorList.js")

const floatsPerTriangle = 4 * 3 + 4 * 3 + 4 * 2
const floatsPerMaterial = 4 + 4 + 4 + 4

function closestPowerOfTwo(num) {
    let power = 1;
    while (power < num) {
        power *= 2;
    }

    return power;
}

class Renderer {
    Camera = new Camera()

    Frames = 0
    FramesStatic = 0

    //Denoiser = { type: "none" }
    Denoiser = { type: "ATrous", levels: [3, 5, 7/*, 9, 11*/], c_phi: 25, n_phi: 0.01, p_phi: 0.1 }
    PostProcessingStack = [
        //new processorList.BloomProcessor()
    ]

    Map = []
    Lights = []
    Materials = {}
    SampleSky = false

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

        let requiredFeatures = ["float32-filterable"]
        for (let feature of requiredFeatures) {
            if (!this.adapter.features.has(feature)) {
                throw new Error(`Couldn't request ${feature}`);
            }
        }

        this.Device = await this.adapter.requestDevice({
            //requiredFeatures: ["chromium-experimental-read-write-storage-texture"],
            requiredFeatures,
            requiredLimits: {
                //maxStorageTexturesPerShaderStage: 6,
            }
        });

        this.Device.lost.then((info) => {
            console.error(`WebGPU device was lost: ${info.message}`);
            this.Device = null;

            /*if (info.reason !== "destroyed") {
              init();
            }*/
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
        this.#MakeStaticBuffers()
        this.MakeBuffers(false);
        this.#MakeStaticBindGroups()

        this.SetMap([], {})
        this.MakeBindGroups()


        // post processing stack

        for (let PostProcessingStackElement of this.PostProcessingStack) {
            await PostProcessingStackElement.Init(this)
            await PostProcessingStackElement.MakeBuffers()
        }
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
                {
                    binding: 1,
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

        this.tracerMapDataBindGroupLayout = this.Device.createBindGroupLayout({
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
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {
                        format: "rgba8unorm",
                        multisampled: false,
                        viewDimension: "2d-array",
                    }
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    sampler: {},
                },
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
                        format: "rgba8unorm",
                    },
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        format: "rgba8snorm",
                    },
                },
                {
                    binding: 3,
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
                bindGroupLayouts: [this.tracerDataBindGroupLayout, this.tracerMapDataBindGroupLayout, this.tracerTexturesLayout]
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

    #MakeStaticBuffers() {
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

        this.textureMapSampler = this.Device.createSampler({
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
            magFilter: "nearest", // linear
            minFilter: "nearest", // linear
            mipmapFilter: "nearest",
        });
    }

    MakeBuffers(updatePostProcessStack) {
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

        this.albedoTexture = this.Device.createTexture({
            size: [this.Canvas.width, this.Canvas.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
        });

        this.albedoTextureRead = this.Device.createTexture({
            size: [this.Canvas.width, this.Canvas.height],
            format: 'rgba8unorm',
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



        if (updatePostProcessStack) {
            for (let PostProcessingStackElement of this.PostProcessingStack) {
                PostProcessingStackElement.MakeBuffers()
            }
        }
    }

    #MakeStaticBindGroups() {
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
    }

    MakeBindGroups() {
        this.tracerTexturesBindGroup = this.Device.createBindGroup({
            layout: this.tracerTexturesLayout,
            entries: [
                { binding: 0, resource: this.illuminationTexture.createView() },
                { binding: 1, resource: this.albedoTexture.createView() },
                { binding: 2, resource: this.normalTexture.createView() },
                { binding: 3, resource: this.positionTexture.createView() },
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
                { binding: 1, resource: this.albedoTextureRead.createView() },
            ],
        });
    }

    #MakeMapBindGroups() {
        this.tracerMapDataBindGroup = this.Device.createBindGroup({
            layout: this.tracerMapDataBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.mapBuffer,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.lightBuffer,
                    },
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.materialBuffer,
                    },
                },
                {
                    binding: 3,
                    resource: this.materialTextureMap.createView()
                },
                {
                    binding: 4,
                    resource: this.textureMapSampler,
                }
            ],
        });
    }

    async #UpdateTextures(Materials) {
        let shouldMakeMapBindGroups = false;

        let layers = 1;
        let textureSizeLimit = this.Device.limits.maxTextureDimension2D;
        let texturesStored = [];

        let MaterialKeys = Object.keys(Materials)
        for (let MaterialName of MaterialKeys) {
            let Material = Materials[MaterialName]
            if (!Material.Texture) continue;
            /*if ((Material.Texture.Width * Material.Texture.Height * 4) !== Material.Texture.Pixels.length) {
                throw new Error("Texture pixel count doesn't match width and height used");
            }*/

            let layerIndex = 0;

            let textureFits = false;
            while (!textureFits) {
                let availableSpace = new Vector3(0, 0, layerIndex);
                let spaceFound = false;

                let texturesOnLayer = texturesStored
                    .filter(texture => texture.Position.z == layerIndex)

                for(let x = 0; x < textureSizeLimit; x++){
                    for(let y = 0; y < textureSizeLimit; y++){

                        for(let texture of texturesOnLayer){
                            if((x < texture.Position.x || 
                                x > texture.Position.x + texture.Texture.Width) &&
                                (y < texture.Position.y || 
                                y > texture.Position.y + texture.Texture.Height)
                            ){
                                availableSpace.x = x;
                                availableSpace.y = y;
                                spaceFound = true;
                                break;
                            }
                        }

                        if(texturesOnLayer.length == 0) spaceFound = true;
                        if(spaceFound) break;
                    }
                    if(spaceFound) break;
                }

                if (spaceFound) {
                    Material.Texture.__AtlasPosition = availableSpace;
                    Material.Texture.__AtlasUVStart = new Vector2(availableSpace.x / textureSizeLimit, availableSpace.y / textureSizeLimit);
                    Material.Texture.__AtlasUVExtend = new Vector2(Material.Texture.Width / textureSizeLimit, Material.Texture.Height / textureSizeLimit);

                    texturesStored.push({
                        Texture: Material.Texture,
                        Position: availableSpace,
                    });

                    textureFits = true;
                } else {
                    layerIndex++;

                    if (layerIndex == layers) {
                        layers++;
                    }
                }
            }
        }

        if (!this.materialTextureMap) {
            this.materialTextureMap = this.Device.createTexture({
                size: [textureSizeLimit, textureSizeLimit, Math.max(layers, 2)],
                format: 'rgba8unorm',
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC,
            });

            shouldMakeMapBindGroups = true;
        }

        for(let textureStored of texturesStored){
            if(textureStored.Texture.Pixels instanceof Uint8Array){
                this.Device.queue.writeTexture(
                    { 
                        texture: this.materialTextureMap,
                        origin: [textureStored.Position.x, textureStored.Position.y, textureStored.Position.z + 1],
                        mipLevel: 0,
                    }, 
                    textureStored.Texture.Pixels, 
                    {
                        bytesPerRow: 4 * textureStored.Texture.Width,
                    }, 
                    [textureStored.Texture.Width, textureStored.Texture.Height, 1]
                )            
            } else {
                this.Device.queue.copyExternalImageToTexture(
                    {
                        source: textureStored.Texture.Pixels
                    },
                    {
                        origin: [textureStored.Position.x, textureStored.Position.y, textureStored.Position.z + 1],
                        texture: this.materialTextureMap,
                        mipLevel: 0,
                    },
                    [textureStored.Texture.Width, textureStored.Texture.Height,   1]
                )
            }
        }

        return shouldMakeMapBindGroups;
    }

    async #UpdateMaterials(Materials) {
        let shouldMakeMapBindGroups = false;

        const MaterialKeys = Object.entries(Materials)
        if (MaterialKeys.length != Object.keys(this.Materials).length || Object.keys(this.Materials).length == 0) {
            this.materialBuffer = this.Device.createBuffer({
                size: (4 + (closestPowerOfTwo(Object.keys(Materials).length) * floatsPerMaterial)) * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });

            this.#UpdateTextures(Materials);
            shouldMakeMapBindGroups = true;
        }

        const materialData = new Float32Array(4 + Object.keys(Materials).length * floatsPerMaterial);

        materialData[0] = MaterialKeys.length;

        let materialIndex = 0;
        for (let [MaterialName, Material] of MaterialKeys) {
            let MaterialMemoryIndex = 4 + materialIndex * floatsPerMaterial;

            materialData[MaterialMemoryIndex + 0] = Material.Color.x;
            materialData[MaterialMemoryIndex + 1] = Material.Color.y;
            materialData[MaterialMemoryIndex + 2] = Material.Color.z;
            materialData[MaterialMemoryIndex + 3] = Material.Smoothness;

            materialData[MaterialMemoryIndex + 4] = Material.Emission.x;
            materialData[MaterialMemoryIndex + 5] = Material.Emission.y;
            materialData[MaterialMemoryIndex + 6] = Material.Emission.z;
            materialData[MaterialMemoryIndex + 7] = Material.Specularity;

            materialData[MaterialMemoryIndex + 8] = Material.Transparency;

            if(Material.Texture){
                materialData[MaterialMemoryIndex + 9] = Material.Texture.__AtlasPosition.z + 1;

                materialData[MaterialMemoryIndex + 12] = Material.Texture.__AtlasUVStart.x;
                materialData[MaterialMemoryIndex + 13] = Material.Texture.__AtlasUVStart.y;
                materialData[MaterialMemoryIndex + 14] = Material.Texture.__AtlasUVExtend.x;
                materialData[MaterialMemoryIndex + 15] = Material.Texture.__AtlasUVExtend.y;
            } else {
                materialData[MaterialMemoryIndex + 9] = -1;
            }

            materialIndex += 1;
        }

        this.Device.queue.writeBuffer(this.materialBuffer, 0, materialData, 0, materialData.length);
        this.Materials = Materials;

        return shouldMakeMapBindGroups;
    }

    async #UpdateLights(Map, Materials) {
        let shouldMakeMapBindGroups = false;

        let EmmisiveMaterials = Object.keys(Materials)
            .filter((Material) => Materials[Material].Emission.lengthSquared() > 0)

        let Lights = Map.filter((Sphere) => EmmisiveMaterials.includes(Sphere.Material))

        if (Lights.length !== this.Lights.length || this.Lights.length == 0) {
            this.lightBuffer = this.Device.createBuffer({
                size: (4 + closestPowerOfTwo(Lights.length)) * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });

            shouldMakeMapBindGroups = true;
        }

        const lightData = new Float32Array(4 + Lights.length);

        lightData[0] = Lights.length;
        lightData[1] = this.SampleSky;

        for (let LightIndex = 0; LightIndex < Lights.length; LightIndex++) {
            lightData[LightIndex + 4] = Map.indexOf(Lights[LightIndex]);
        }

        this.Device.queue.writeBuffer(this.lightBuffer, 0, lightData, 0, lightData.length);
        this.Lights = Lights

        return shouldMakeMapBindGroups;
    }

    async SetMap(Map, Materials) {
        let shouldMakeMapBindGroups = this.#UpdateMaterials(Materials)
        this.Camera.CameraMoved = true

        shouldMakeMapBindGroups = this.#UpdateLights(Map, Materials) || shouldMakeMapBindGroups;

        if (Map.length !== this.Map.length || this.Map.length == 0) {
            this.mapBuffer = this.Device.createBuffer({
                size: (4 + (closestPowerOfTwo(Map.length) * floatsPerTriangle)) * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });

            shouldMakeMapBindGroups = true;
        }

        const MaterialKeys = Object.keys(Materials)
        const mapData = new Float32Array(4 + Map.length * floatsPerTriangle);

        mapData[0] = Map.length;

        for (let [TriangleIndex, Triangle] of Map.entries()) {
            let TriangleMemoryIndex = 4 + TriangleIndex * floatsPerTriangle;

            mapData[TriangleMemoryIndex + 0] = Triangle.a.x;
            mapData[TriangleMemoryIndex + 1] = Triangle.a.y;
            mapData[TriangleMemoryIndex + 2] = Triangle.a.z;
            mapData[TriangleMemoryIndex + 3] = MaterialKeys.findIndex((value) => value == Triangle.Material);

            mapData[TriangleMemoryIndex + 4] = Triangle.b.x;
            mapData[TriangleMemoryIndex + 5] = Triangle.b.y;
            mapData[TriangleMemoryIndex + 6] = Triangle.b.z;

            mapData[TriangleMemoryIndex + 8] = Triangle.c.x;
            mapData[TriangleMemoryIndex + 9] = Triangle.c.y;
            mapData[TriangleMemoryIndex + 10] = Triangle.c.z;

            mapData[TriangleMemoryIndex + 12] = Triangle.na.x;
            mapData[TriangleMemoryIndex + 13] = Triangle.na.y;
            mapData[TriangleMemoryIndex + 14] = Triangle.na.z;

            mapData[TriangleMemoryIndex + 16] = Triangle.nb.x;
            mapData[TriangleMemoryIndex + 17] = Triangle.nb.y;
            mapData[TriangleMemoryIndex + 18] = Triangle.nb.z;

            mapData[TriangleMemoryIndex + 20] = Triangle.nc.x;
            mapData[TriangleMemoryIndex + 21] = Triangle.nc.y;
            mapData[TriangleMemoryIndex + 22] = Triangle.nc.z;

            mapData[TriangleMemoryIndex + 24] = Triangle.uva.x;
            mapData[TriangleMemoryIndex + 25] = Triangle.uva.y;
            mapData[TriangleMemoryIndex + 26] = Triangle.uvb.x;
            mapData[TriangleMemoryIndex + 27] = Triangle.uvb.y;
            mapData[TriangleMemoryIndex + 28] = Triangle.uvc.x;
            mapData[TriangleMemoryIndex + 29] = Triangle.uvc.y;
        }

        this.Device.queue.writeBuffer(this.mapBuffer, 0, mapData, 0, mapData.length);
        this.Map = Map

        if (shouldMakeMapBindGroups) {
            this.#MakeMapBindGroups()
        }
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

    async #DenoiseFrame() {
        switch (this.Denoiser.type) {
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
                break;
        }

        var TextureCopyCommandEncoder = this.Device.createCommandEncoder();

        TextureCopyCommandEncoder.copyTextureToTexture(
            {
                texture: this.albedoTexture,
            },
            {
                texture: this.albedoTextureRead,
            },
            {
                width: this.Canvas.width,
                height: this.Canvas.height,
                depthOrArrayLayers: 1,
            },
        );
        TextureCopyCommandEncoder.copyTextureToTexture(
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

        this.Device.queue.submit([TextureCopyCommandEncoder.finish()]);
    }

    async MakeFrame() {
        if (this.Camera.CameraMoved) {
            this.#UpdateCameraData()
        }

        this.#UpdateGlobalData()

        const commandEncoder = this.Device.createCommandEncoder();

        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.tracerPipeline);

        passEncoder.setBindGroup(0, this.tracerDataBindGroup);
        passEncoder.setBindGroup(1, this.tracerMapDataBindGroup);
        passEncoder.setBindGroup(2, this.tracerTexturesBindGroup);

        passEncoder.dispatchWorkgroups(this.Canvas.width / 8, this.Canvas.height / 8);
        passEncoder.end();

        this.Device.queue.submit([commandEncoder.finish()]);

        await this.Device.queue.onSubmittedWorkDone();

        await this.#DenoiseFrame()

        for (let PostProcessingStackElement of this.PostProcessingStack) {
            await PostProcessingStackElement.ProcessFrame();
        }
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

        const renderPassDescriptor = {
            colorAttachments: [
                {
                    clearValue: { r: 1, g: 0, b: 1, a: 1 },
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
        await this.Device.queue.onSubmittedWorkDone();

        this.Frames += 1;
        this.FramesStatic += 1;
    }
}

module.exports = Renderer