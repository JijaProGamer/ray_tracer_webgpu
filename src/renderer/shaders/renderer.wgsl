//enable chromium_experimental_read_write_storage_texture;

struct InputGlobalData {
  resolution: vec2<f32>,
  totalFrames: f32,
  framesStatic: f32,
}

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) texcoord: vec2f,
}

@group(0) @binding(0) var<storage, read> inputData: InputGlobalData;

@group(1) @binding(0) var historyTexture: texture_storage_2d<rgba32float, write>;
@group(1) @binding(1) var historyReadTexture: texture_2d<f32>;

@group(2) @binding(0) var illuminationTexture: texture_2d<f32>;

/*fn hash(input: u32) -> u32 {
    let state = input * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn floatConstruct(m: u32) -> f32 {
    /*let ieeeMantissa: u32 = 0x007FFFFFu;
    let ieeeOne: u32 = 0x3F800000u; 

    var mBits: u32 = m & ieeeMantissa;
    mBits = mBits | ieeeOne;

    return bitcast<f32>(mBits) - 1;*/

    return fract(f32(m) / 4294967295);
}

fn random(seed: ptr<function,f32>) -> f32 {
    *seed = floatConstruct(hash(bitcast<u32>(*seed)));
    return fract(*seed);
}*/

fn isNan(num: f32) -> bool {
    return (bitcast<u32>(num) & 0x7fffffffu) > 0x7f800000u;
}

fn ACESFilm(x: vec3<f32>) -> vec3<f32> {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;

  return saturate((x * (a * x + b )) / (x * (c * x +d ) + e));
}

@vertex
fn vertex_main(@builtin(vertex_index) vertexIndex : u32) -> VertexOut
{
  let pos = array(
    vec2f(-1, 2),
    vec2f(-1, -1),
    vec2f(5, -1)
  );

  var output : VertexOut;
  let xy = pos[vertexIndex];
  
  output.position = vec4f(xy, 0.0, 1.0);
  output.texcoord = xy;
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
  var texCoord = fragData.texcoord;
  texCoord *= inputData.resolution;
  texCoord += inputData.resolution;
  texCoord /= 2;
  
  var lastColor = textureLoad(historyReadTexture, vec2<i32>(texCoord), 0);
  var newColor = textureLoad(illuminationTexture, vec2<i32>(texCoord), 0);
  //var newColor = textureLoad(illuminationTexture, vec2i(0, 0), 0);

  let blendWeight = 1.0 / (inputData.framesStatic + 1);
  let averageColor = mix(lastColor, newColor, blendWeight);

  textureStore(historyTexture, vec2<i32>(texCoord), averageColor);

  /*var ditherAmount: f32;

  for(var x = texCoord.x - 1; x < texCoord.x + 1; x += 1){
    for(var y = texCoord.y - 2; y < texCoord.y + 2; y += 1){
        var dither = x + y * inputData.resolution.x;
        ditherAmount += random(&dither);
    }
  }*/

  var outputColor = pow(ACESFilm(averageColor.xyz), vec3<f32>(1/2.2));
  //outputColor += vec3<f32>(ditherAmount / 500);

  //return averageColor;
  //return vec4<f32>(pow(averageColor.xyz, vec3<f32>(1/2.2)), 1.0);
  return vec4<f32>(outputColor, 1);
  //return vec4<f32>(texCoord / inputData.resolution, 0, 1);
}