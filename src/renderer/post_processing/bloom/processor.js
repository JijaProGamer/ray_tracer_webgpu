class BloomProcessor {
    Renderer;

    async Init(Renderer){
        this.Renderer = Renderer;

        let downsampleShaderModule = this.Renderer.Device.createShaderModule({
            code: await (await fetch("/renderer/post_processing/bloom/downsample.wgsl")).text(),
        });

        this.GlobalDataBuffer = this.Renderer.Device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        let computePipelineDescriptor = {
            compute: {
                module: tracerShaderModule,
                entryPoint: "main"
            },
            layout: this.Device.createPipelineLayout({
                bindGroupLayouts: [this.tracerDataBindGroupLayout, this.tracerTexturesLayout]
            }),
        }

        this.tracerPipeline = this.Device.createComputePipeline(computePipelineDescriptor);
    }

    MakeBuffers() {
        this.quarterTextureFrame = this.Renderer.Device.createTexture({
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
    }

    async ProcessFrame(){
        
    }
}

module.exports = BloomProcessor