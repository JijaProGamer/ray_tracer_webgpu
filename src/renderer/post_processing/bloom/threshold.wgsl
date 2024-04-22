//enable chromium_experimental_read_write_storage_texture;

struct InputGlobalData {
    resolution: vec2<f32>,
    totalFrames: f32,
    framesStatic: f32,
}

@group(0) @binding(0) var<storage, read> inputData: InputGlobalData;

@group(1) @binding(0) var texture: texture_2d<f32>;
@group(1) @binding(1) var outputTexture: texture_storage_2d<rgba32float, write>;

const downscaleKernel = array<f32, 5>(0.06136, 0.24477, 0.38774, 0.24477, 0.06136);

@compute @workgroup_size(8, 8)
fn main(
    @builtin(global_invocation_id) texID: vec3<u32>
){
    let color = textureLoad(texture, texID.xy, 0);
    let lummaColor = vec4<f32>(0.2126, 0.7152, 0.0722, 1);

    let luminanceValue = dot(color, lummaColor);
    let thresholdAcceptance = f32(luminanceValue > 0.5);
            
    textureStore(outputTexture, texID.xy, mix(vec4<f32>(0, 0, 0, 1), color, thresholdAcceptance));
}