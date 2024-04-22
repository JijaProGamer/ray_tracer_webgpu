class BloomProcessor {
    Renderer;

    async Init(Renderer){
        this.Renderer = Renderer;

        let downsampleShaderModule = this.Renderer.Device.createShaderModule({
            code: await (await fetch("/renderer/post_processing/bloom/downsample.wgsl")).text(),
        });

        let thresholdShaderModule = this.Renderer.Device.createShaderModule({
            code: await (await fetch("/renderer/post_processing/bloom/threshold.wgsl")).text(),
        });

        let overlapShaderModule = this.Renderer.Device.createShaderModule({
            code: await (await fetch("/renderer/post_processing/bloom/overlap.wgsl")).text(),
        });

        this.dataBindGroupLayout = this.Renderer.Device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                }
            ],
        });

        this.downsampleTexturesLayout = this.Renderer.Device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {
                        format: "rgba32float",
                    },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        format: "rgba32float",
                    },
                },
            ],
        });

        this.thresholdTexturesLayout = this.Renderer.Device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {
                        format: "rgba32float",
                    },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        format: "rgba32float",
                    },
                },
            ],
        });

        this.overlapTexturesLayout = this.Renderer.Device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {
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
                    storageTexture: {
                        format: "rgba32float",
                    },
                },
            ],
        });

        let downsamplePipelineDescriptor = {
            compute: {
                module: downsampleShaderModule,
                entryPoint: "main"
            },
            layout: this.Renderer.Device.createPipelineLayout({
                bindGroupLayouts: [this.dataBindGroupLayout, this.downsampleTexturesLayout]
            }),
        }

        let thresholdPipelineDescriptor = {
            compute: {
                module: thresholdShaderModule,
                entryPoint: "main"
            },
            layout: this.Renderer.Device.createPipelineLayout({
                bindGroupLayouts: [this.dataBindGroupLayout, this.thresholdTexturesLayout]
            }),
        }

        let overlapPipelineDescriptor = {
            compute: {
                module: overlapShaderModule,
                entryPoint: "main"
            },
            layout: this.Renderer.Device.createPipelineLayout({
                bindGroupLayouts: [this.dataBindGroupLayout, this.overlapTexturesLayout]
            }),
        }

        this.downsamplePipeline = this.Renderer.Device.createComputePipeline(downsamplePipelineDescriptor);
        this.thresholdPipeline = this.Renderer.Device.createComputePipeline(thresholdPipelineDescriptor);
        this.overlapPipeline = this.Renderer.Device.createComputePipeline(overlapPipelineDescriptor);
    }

    MakeBuffers() {
        this.quarterTexture = this.Renderer.Device.createTexture({
            size: [this.Renderer.Canvas.width / 2, this.Renderer.Canvas.height / 2],
            format: 'rgba32float',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
        });

        this.quarterTextureRead = this.Renderer.Device.createTexture({
            size: [this.Renderer.Canvas.width / 2, this.Renderer.Canvas.height / 2],
            format: 'rgba32float',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });

        this.thresholdTexture = this.Renderer.Device.createTexture({
            size: [this.Renderer.Canvas.width / 2, this.Renderer.Canvas.height / 2],
            format: 'rgba32float',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
        });

        this.thresholdTextureRead = this.Renderer.Device.createTexture({
            size: [this.Renderer.Canvas.width / 2, this.Renderer.Canvas.height / 2],
            format: 'rgba32float',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });

        this.outputImage = this.Renderer.Device.createTexture({
            size: [this.Renderer.Canvas.width, this.Renderer.Canvas.height],
            format: 'rgba32float',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
        });

        this.dataBindGroup = this.Renderer.Device.createBindGroup({
            layout: this.dataBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.Renderer.GlobalDataBuffer,
                    },
                }
            ]
        })

        this.downsampleTexturesBindGroup = this.Renderer.Device.createBindGroup({
            layout: this.downsampleTexturesLayout,
            entries: [
                { binding: 0, resource: this.Renderer.illuminationTextureRead.createView() },
                { binding: 1, resource: this.quarterTexture.createView() },
            ],
        });

        this.thresholdTexturesBindGroup = this.Renderer.Device.createBindGroup({
            layout: this.thresholdTexturesLayout,
            entries: [
                { binding: 0, resource: this.quarterTextureRead.createView() },
                { binding: 1, resource: this.thresholdTexture.createView() },
            ],
        });

        this.overlapTexturesBindGroup = this.Renderer.Device.createBindGroup({
            layout: this.overlapTexturesLayout,
            entries: [
                { binding: 0, resource: this.thresholdTextureRead.createView() },
                { binding: 1, resource: this.Renderer.illuminationTextureRead.createView() },
                { binding: 2, resource: this.outputImage.createView() },
            ],
        });
    }

    async #DownsampleFrame(){
        // downsample
        var commandEncoder = this.Renderer.Device.createCommandEncoder();

        var passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.downsamplePipeline);

        passEncoder.setBindGroup(0, this.dataBindGroup);
        passEncoder.setBindGroup(1, this.downsampleTexturesBindGroup);

        passEncoder.dispatchWorkgroups(this.Renderer.Canvas.width / 16, this.Renderer.Canvas.height / 16);
        passEncoder.end();

        this.Renderer.Device.queue.submit([commandEncoder.finish()]);

        await this.Renderer.Device.queue.onSubmittedWorkDone();

        // copy downsampled texture
        let textureCopyCommandEncoder = this.Renderer.Device.createCommandEncoder();

        textureCopyCommandEncoder.copyTextureToTexture(
            {
                texture: this.quarterTexture,
            },
            {
                texture: this.quarterTextureRead,
            },
            {
                width: this.Renderer.Canvas.width / 2,
                height: this.Renderer.Canvas.height / 2,
                depthOrArrayLayers: 1,
            },
        );

        this.Renderer.Device.queue.submit([textureCopyCommandEncoder.finish()]);
    }

    async #ThresholdFrame(){
        // threshold
        var commandEncoder = this.Renderer.Device.createCommandEncoder();

        var passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.thresholdPipeline);

        passEncoder.setBindGroup(0, this.dataBindGroup);
        passEncoder.setBindGroup(1, this.thresholdTexturesBindGroup);

        passEncoder.dispatchWorkgroups(this.Renderer.Canvas.width / 16, this.Renderer.Canvas.height / 16);
        passEncoder.end();

        this.Renderer.Device.queue.submit([commandEncoder.finish()]);

        await this.Renderer.Device.queue.onSubmittedWorkDone();

        // copy threshold texture
        let textureCopyCommandEncoder = this.Renderer.Device.createCommandEncoder();

        textureCopyCommandEncoder.copyTextureToTexture(
            {
                texture: this.thresholdTexture,
            },
            {
                texture: this.thresholdTextureRead,
            },
            {
                width: this.Renderer.Canvas.width / 2,
                height: this.Renderer.Canvas.height / 2,
                depthOrArrayLayers: 1,
            },
        );

        this.Renderer.Device.queue.submit([textureCopyCommandEncoder.finish()]);
    }

    async #OverlapFrame(){
        // overlap
        var commandEncoder = this.Renderer.Device.createCommandEncoder();

        var passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.overlapPipeline);

        passEncoder.setBindGroup(0, this.dataBindGroup);
        passEncoder.setBindGroup(1, this.overlapTexturesBindGroup);

        passEncoder.dispatchWorkgroups(this.Renderer.Canvas.width / 8, this.Renderer.Canvas.height / 8);
        passEncoder.end();

        this.Renderer.Device.queue.submit([commandEncoder.finish()]);

        await this.Renderer.Device.queue.onSubmittedWorkDone();

        // copy overlapped texture
        let textureCopyCommandEncoder = this.Renderer.Device.createCommandEncoder();

        textureCopyCommandEncoder.copyTextureToTexture(
            {
                texture: this.outputImage,
            },
            {
                texture: this.Renderer.denoisedTexture,
            },
            {
                width: this.Renderer.Canvas.width,
                height: this.Renderer.Canvas.height,
                depthOrArrayLayers: 1,
            },
        );

        this.Renderer.Device.queue.submit([textureCopyCommandEncoder.finish()]);
    }

    async ProcessFrame(){
        await this.#DownsampleFrame()
        await this.#ThresholdFrame()
        await this.#OverlapFrame()
    }
}

module.exports = BloomProcessor