//enable chromium_experimental_read_write_storage_texture;
const PI = 3.1415926535897932384626433832795028841971693993751058209749445923078164062;

struct InputGlobalData {
  resolution: vec2<f32>,
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
    for (var i = -1.0; i < 1.0; i = i + 1.0) {
        for (var j = -1.0; j < 1.0; j = j + 1.0) {
            let sampleUV = uv + vec2<f32>(i, j);
            totalColor += textureLoad(fullTexture, sampleUV, 0);
        }
    }
        
    textureStore(quarterTexture, texID.xy / 2, totalColor / 9.0);
}