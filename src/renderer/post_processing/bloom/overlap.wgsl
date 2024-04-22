//enable chromium_experimental_read_write_storage_texture;

struct InputGlobalData {
    resolution: vec2<f32>,
    totalFrames: f32,
    framesStatic: f32,
}

@group(0) @binding(0) var<storage, read> inputData: InputGlobalData;

@group(1) @binding(0) var thresholdTexture: texture_2d<f32>;
@group(1) @binding(1) var illuminationTexture: texture_2d<f32>;
@group(1) @binding(2) var outputTexture: texture_storage_2d<rgba32float, write>;

const downscaleKernel = array<f32, 5>(0.06136, 0.24477, 0.38774, 0.24477, 0.06136);

@compute @workgroup_size(8, 8)
fn main(
    @builtin(global_invocation_id) texID: vec3<u32>
){
    let uv = vec2<f32>(texID.xy);
    let illumination = textureLoad(illuminationTexture, texID.xy, 0);

    var totalThreshold: vec4<f32>;
    for (var i = -4.0; i < 4.0; i = i + 4.0) {
        for (var j = -4.0; j < 4.0; j = j + 4.0) {
            let sampleUV = uv / 2 + vec2<f32>(i, j);
            totalThreshold += textureLoad(thresholdTexture, vec2<u32>(sampleUV), 0);
        }
    }
    //totalThreshold /= 25.0;

    textureStore(outputTexture, texID.xy, illumination);    
    //textureStore(outputTexture, texID.xy, totalThreshold);      
    //textureStore(outputTexture, texID.xy, illumination + totalThreshold * 10);
}