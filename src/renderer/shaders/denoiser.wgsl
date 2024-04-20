//enable chromium_experimental_read_write_storage_texture;

struct InputGlobalData {
    resolution: vec2<f32>,
    totalFrames: f32,
    framesStatic: f32,
}

struct DenoisingData {
    c_phi: f32,
    n_phi: f32, 
    p_phi: f32,
    stepwidth: f32
}

@group(0) @binding(0) var<storage, read> inputData: InputGlobalData;
@group(0) @binding(1) var<storage, read> denoisingData: DenoisingData;

@group(1) @binding(0) var colorTexture: texture_storage_2d<rgba32float, write>;
@group(1) @binding(1) var colorTextureRead: texture_2d<f32>;
@group(1) @binding(2) var normalTexture: texture_2d<f32>;
@group(1) @binding(3) var positionTexture: texture_2d<f32>;

@compute @workgroup_size(8, 8)
fn main(
    @builtin(global_invocation_id) texID: vec3<u32>
){
    let texCoord = vec2<i32>(texID.xy);

    var sum = vec4<f32>(0.0);
    var cval = textureLoad(colorTextureRead, texCoord, 0);
    var nval = textureLoad(normalTexture, texCoord, 0);
    var pval = textureLoad(positionTexture, texCoord, 0);
    var cum_w = 0.0;

    /*for(var i = 0; i < 25; i++) {
        let uv = texCoord + offset[i] * i32(denoisingData.stepwidth);

        let ctmp = textureLoad(colorTextureRead, uv, 0);
        var t = cval - ctmp;
        var dist2 = dot(t,t);
        let c_w = min(exp(-(dist2)/denoisingData.c_phi), 1.0);

        let ntmp = textureLoad(normalTexture, uv, 0);
        t = nval - ntmp;
        dist2 = max(dot(t,t)/(denoisingData.stepwidth*denoisingData.stepwidth),0.0);
        let n_w = min(exp(-(dist2)/denoisingData.n_phi), 1.0);

        let ptmp = textureLoad(positionTexture, uv, 0);
        t = pval - ptmp;
        dist2 = dot(t,t);
        let p_w = min(exp(-(dist2)/denoisingData.p_phi),1.0);

        let weight = n_w * p_w;
        //let weight = c_w * n_w * p_w;
        sum += ctmp * weight * kernel[i];
        cum_w += weight * kernel[i];
    }*/

    for(var x: i32 = -2; x < 2; x++) {
        for(var y: i32 = -2; y < 2; y++) {
            let i = (x + 2) * 5 + (y + 2);
            let uv = texCoord + vec2<i32>(x, y) * i32(denoisingData.stepwidth);

            let ctmp = textureLoad(colorTextureRead, uv, 0);
            let ntmp = textureLoad(normalTexture, uv, 0);
            let ptmp = textureLoad(positionTexture, uv, 0);

            var t1 = cval - ctmp;
            var t2 = nval - ntmp;
            var t3 = pval - ptmp;

            var dist1 = dot(t1,t1);
            var dist2 = max(dot(t2,t2) / (denoisingData.stepwidth * denoisingData.stepwidth), 0.0);
            var dist3 = dot(t3,t3);

            let c_w = min(exp(-(dist1)/denoisingData.c_phi), 1.0);
            let n_w = min(exp(-(dist2)/denoisingData.n_phi), 1.0);
            let p_w = min(exp(-(dist3)/denoisingData.p_phi),1.0);

            let position = vec2<f32>(f32(x), f32(y));
            //let kernel = sqrt(distance(position, vec2<f32>(0)));

            //let weight = n_w * p_w * c_w;
            let weight = n_w * p_w;
            cum_w += weight;// * kernel;
            sum += weight * ctmp;// * kernel;
        }
    }

    textureStore(colorTexture, texID.xy, sum / cum_w);
}

/*@compute @workgroup_size(8, 8)
fn main(
    @builtin(global_invocation_id) texID: vec3<u32>
){
    let texCoord = vec2<i32>(texID.xy);

    var sum = vec4<f32>(0.0);
    //var cval = textureLoad(colorTextureRead, texCoord, 0);
    var cum_w = 0.0;

    for(var i: u32 = 0; i < 25; i++) {
        let uv = texCoord + offset[i] * i32(denoisingData.stepwidth);
        //let ctmp = textureLoad(colorTextureRead, uv, 0);
        let ctmp = vec4<f32>(vec2<f32>(texID.xy) / inputData.resolution, 0.0, 1.0);

        //sum += ctmp * kernel[i];
        //cum_w += kernel[i];

        sum += ctmp;
        cum_w += 1;
    }

    textureStore(colorTexture, texID.xy, sum / cum_w);
}*/