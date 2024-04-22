//enable chromium_experimental_read_write_storage_texture;

struct InputGlobalData {
    resolution: vec2<f32>,
    totalFrames: f32,
    framesStatic: f32,
}

@group(0) @binding(0) var<storage, read> inputData: InputGlobalData;

@group(1) @binding(0) var fullTexture: texture_2d<f32>;
@group(1) @binding(1) var quarterTexture: texture_storage_2d<rgba32float, write>;

const downscaleKernel = array<f32, 5>(0.06136, 0.24477, 0.38774, 0.24477, 0.06136);

@compute @workgroup_size(8, 8)
fn main(
    @builtin(global_invocation_id) texID: vec3<u32>
){
    let uv = vec2<f32>(texID.xy);
        
    var totalColor: vec4<f32>;
    for (var i = -2.0; i < 2.0; i = i + 2.0) {
        for (var j = -2.0; j < 2.0; j = j + 2.0) {
            let sampleUV = uv + vec2<f32>(i, j);
            totalColor += textureLoad(fullTexture, vec2<u32>(sampleUV), 0);
        }
    }
    
    totalColor /= 25.0;
        
    textureStore(quarterTexture, texID.xy / 2, totalColor);
}