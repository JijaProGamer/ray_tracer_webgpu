//enable chromium_experimental_read_write_storage_texture;
const PI = 3.1415926535897932384626433832795028841971693993751058209749445923078164062;

struct InputGlobalData {
  resolution: vec2<f32>,
  totalFrames: f32,
  framesStatic: f32,
}

struct CameraData {
  CameraToWorldMatrix: mat4x4<f32>,
  position: vec3<f32>,
  fov: f32,
}

@group(0) @binding(0) var<storage, read> inputData: InputGlobalData;
@group(0) @binding(1) var<storage, read> cameraData: CameraData;

@group(1) @binding(0) var illuminationTexture: texture_storage_2d<rgba32float, write>;
@group(1) @binding(1) var normalTexture: texture_storage_2d<rgba8snorm, write>;
@group(1) @binding(2) var positionTexture: texture_storage_2d<rgba16float, write>;

fn hash(input: u32) -> u32 {
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
}

fn randomFromVec2(seed: ptr<function,f32>, vec: vec2<f32>) -> f32 {
    *seed += dot(vec, vec2<f32>(43.321312, 2.421333341));
    random(seed);

    return *seed;
}

fn randomFromVec3(seed: ptr<function,f32>, vec: vec3<f32>) -> f32 {
    *seed += dot(vec, vec3<f32>(31.85175124, 32.2415625, -50.23123));
    random(seed);

    return *seed;
}

fn randomVec2FromVec2(seed: ptr<function,f32>, vec: vec2<f32>) -> vec2<f32> {
    randomFromVec2(seed, vec);

    var x = random(seed);
    var y = random(seed);

    return vec2<f32>((x - 0.5) * 2, (y - 0.5) * 2);
}

fn randomVec3FromVec3(seed: ptr<function,f32>, vec: vec3<f32>) -> vec3<f32> {
    randomFromVec3(seed, vec);

    var x = random(seed);
    var y = random(seed);
    var z = random(seed);

    return vec3<f32>((x - 0.5) * 2, (y - 0.5) * 2, (z - 0.5) * 2);
}

fn randomPoint(seed: ptr<function,f32>, position: vec3<f32>) -> vec3<f32> {
    return normalize(randomVec3FromVec3(seed, position));
}

fn randomPoint2(seed: ptr<function,f32>, position: vec2<f32>) -> vec2<f32> {
    return normalize(randomVec2FromVec2(seed, position));
}

struct ray {
  origin: vec3<f32>,
  direction: vec3<f32>,
}

fn hit_sphere(sphere: sphere, r: ray) -> f32
{
    let oc = r.origin - sphere.position;

    let a = dot(r.direction, r.direction);
    let half_b = dot(oc, r.direction);
    let c = dot(oc, oc) - sphere.radius*sphere.radius;
    let discriminant = half_b*half_b - a*c;

    if (discriminant < 0) {
        return -1.0;
    } else {
        var root = (-half_b - sqrt(discriminant) ) / a;
        if root < 0.0 {
            root = (-half_b + sqrt(discriminant) ) / a;
        }

        return root;    
    }
}

struct material {
  color: vec3<f32>,
  //specularColor: vec3<f32>,
  emission: vec3<f32>,
  smoothness: f32,
  specularity: f32,
  transparency: f32,
}

struct hitResult {
  hit: bool,
  objectHit: i32,
  position: vec3<f32>,
  normal: vec3<f32>,
  material: material,
}

struct sphere {
  position: vec3<f32>,
  radius: f32,
  material: material,
}

const objectNumber = 9;
const objects = array<sphere, objectNumber>(
  // walls 
  sphere(vec3<f32>(0, 106, 0), 100.0, material(vec3<f32>(0.76, 0.69, 0.56), vec3<f32>(0), 0, 0, 0)), // up
  sphere(vec3<f32>(0, -106, 0), 100.0, material(vec3<f32>(0.76, 0.69, 0.56), vec3<f32>(0), 0, 0, 0)), // down
  sphere(vec3<f32>(0, 0, 110), 100.0, material(vec3<f32>(0.76, 0.69, 0.56), vec3<f32>(0), 0, 0, 0)), // front
  sphere(vec3<f32>(0, 0, -110), 100.0, material(vec3<f32>(0.76, 0.69, 0.56), vec3<f32>(0), 0, 0, 0)), // back
  sphere(vec3<f32>(106, 0, 0), 100.0, material(vec3<f32>(0.05, 0.5, 0.05), vec3<f32>(0), 0, 0, 0)), // left
  sphere(vec3<f32>(-106, 0, 0), 100.0, material(vec3<f32>(0.5, 0.05, 0.05), vec3<f32>(0), 0, 0, 0)), //right

  // lights

  sphere(vec3<f32>(0, 2, -6), 2, material(vec3<f32>(1), vec3<f32>(2), 0, 0, 0)),

  // objects

  sphere(vec3<f32>(-3, -3.5, 1.5), 3, material(vec3<f32>(0.76, 0.69, 0.56), vec3<f32>(0, 0, 0), 0, 0, 0)),
  sphere(vec3<f32>(3, -3.5, -1.5), 3, material(vec3<f32>(0.76, 0.69, 0.56), vec3<f32>(0, 0, 0), 0, 0, 0)),

  //sphere(vec3<f32>(-4, 0, 1), 1.25, material(vec3<f32>(0.76, 0.69, 0.56), vec3<f32>(0, 0, 0), 0, 0, 0)),
  //sphere(vec3<f32>(1, 0, -1), 1.25, material(vec3<f32>(0.76, 0.69, 0.56), vec3<f32>(0, 0, 0), 0, 0, 0)),
);

const enviromentalLight = 0.0;
const lightNumber = 1;
const lights = array<f32, lightNumber>(
  6
);

fn getHit(ray: ray) -> hitResult {
  var output: hitResult;

  var bestObj: sphere;
  var bestDist = 999.0;
  var found = false;

  for(var i: i32 = 0; i < objectNumber; i++){
    let obj = objects[i];
    let dist = hit_sphere(obj, ray);

    if(dist < bestDist && dist >= 0){
      output.objectHit = i;
      bestDist = dist;
      bestObj = obj;
      found = true;
    }
  }

  if(found){
    output.hit = true;
    output.position = ray.origin + ray.direction * bestDist;
    output.normal = (output.position - bestObj.position) / bestObj.radius;
    output.material = bestObj.material;

    if (dot(ray.direction, output.normal) > 0.0) {
      output.normal = -output.normal;
    }
  }

  return output;
}

fn RandomValueNormalDistribution(seed: ptr<function,f32>) -> f32 {
  let theta = 2 * PI * random(seed);
  let rho = sqrt(-2 * log(random(seed)));
  return rho * cos(theta);
}

fn RandomSphereDirection(seed: ptr<function,f32>, normal: vec3<f32>) -> vec3<f32> {
  return normalize(vec3<f32>(RandomValueNormalDistribution(seed), RandomValueNormalDistribution(seed), RandomValueNormalDistribution(seed)));
}

fn getSkyColor(direction: vec3<f32>) -> vec3<f32>{
  let a = direction.y;
  let colorUp = vec3<f32>(0.2, 0.5, 1);
  let colorDown = vec3<f32>(0.9);

  //return vec3<f32>(0);
  //return min(direction, vec3<f32>(0));
  return mix(colorDown, colorUp, a);
}

fn getTriangleAlbedo(
    material: material,
    intersection: hitResult,
) -> vec4<f32> {
    if(!intersection.hit){
        return vec4<f32>(1);
    }

    /*let textureCoord = material.diffuse_atlas_start + intersection.uv * material.diffuse_atlas_extend;

    var textureColor = textureSampleLevel(textureAtlas, textureAtlasSampler, textureCoord, i32(material.texture_layer), 0);

    if(material.texture_layer == -1.0){
        textureColor = vec4<f32>(1);
    }*/

    let triangleColor = vec4<f32>(material.color, 1);

    return triangleColor;
    //return triangleColor * textureColor;
}

fn Le(
    material: material,
    intersection: hitResult,
) -> vec3<f32> {
    //let triangleColor = vec4<f32>(material.color, 1);
    return /*triangleColor **/ material.emission;
}

fn Eval_BRDF(
    incoming: vec3<f32>,
    outgoing: vec3<f32>,
    wasSpecular: f32,
) -> f32 {
    // Returns the weight of the BRDF
    // Lambertian Diffuse only for now

    return mix(1 / PI, f32(abs(dot(incoming, outgoing)) <= 0.01 ), wasSpecular);
}

struct directLightingData {
  direction: vec3<f32>,
  diminuation: f32,
  intersection: hitResult,
  hit: bool,
  material: material,
  lightArea: f32,
}

fn calculateDirectLighting(
  seed: ptr<function,f32>,
  origin: vec3<f32>,
) -> directLightingData {
  var output: directLightingData;

  let lightChosen = floor(random(seed) * (lightNumber + enviromentalLight)); // +1 for enviromental lighting in the future
  
  if(lightChosen == lightNumber){ // sky light
    let radius = 1000.0;
    let randomLightPoint = origin + radius * randomPoint(seed, origin);

    let direction = normalize(randomLightPoint - origin);
    let ray = ray(origin + 0.0001 * direction, direction);
    let hit = getHit(ray);

    if(!hit.hit){
      var fakeHit: hitResult;
      fakeHit.hit = true;
      fakeHit.objectHit = -1;
      fakeHit.position = origin + direction * radius;
      fakeHit.normal = (fakeHit.position - origin) / radius;

      var fakeMaterial: material;
      fakeMaterial.color = vec3<f32>(1);
      fakeMaterial.emission = getSkyColor(fakeHit.normal);
      fakeHit.material = fakeMaterial;

      let distance = distance(origin, randomLightPoint);

      output.lightArea = /*4 **/ PI * (radius * radius);
      output.intersection = fakeHit;
      output.direction = direction;
      output.diminuation = distance * distance;
      output.material = fakeHit.material;
      output.hit = true;
    }

    return output;
  }
  
  let lightIndex = i32(lights[i32(lightChosen)]);
  let light = objects[lightIndex];

  let randomLightPoint = light.position + (light.radius + 0.01) * randomPoint(seed, origin);

  let direction = normalize(randomLightPoint - origin);
  let ray = ray(origin + 0.01 * direction, direction);
  let hit = getHit(ray);

  if(hit.hit && hit.objectHit == i32(lightIndex)){
    let distance = distance(origin, hit.position);

    output.lightArea = /*4 **/ PI * (light.radius * light.radius);
    output.intersection = hit;
    output.direction = direction;
    output.diminuation = distance * distance;
    output.material = hit.material;
    output.hit = true;
  }

  return output;
}

const bounces = 3;
const spp = 1;

struct rayColor {
  color: vec3<f32>,
  intersection: vec3<f32>,
  normal: vec3<f32>
}

/*fn calculateRayColor(
  seed: ptr<function,f32>,
  ray: ray
) -> rayColor {
  var output: rayColor;
  let hit = getHit(ray);

  if(!hit.hit){
    output.normal = ray.direction;
    output.color = getSkyColor(ray.direction);
    output.intersection = ray.direction * 1000 + ray.origin;
    return output;  
  }

  output.normal = hit.normal;
  output.intersection = hit.position;

  let lightData = calculateDirectLighting(seed, hit.position);

  if(lightData.hit){
    let lightMaterial = lightData.material;
    let material = hit.material;

    let diffuseDirection = normalize(hit.normal + RandomSphereDirection(seed, hit.position));
    let G = abs(dot(hit.normal, lightData.direction) * dot(lightData.intersection.normal, lightData.direction)) / lightData.diminuation;
    let b = Eval_BRDF(diffuseDirection, lightData.direction);

    output.color = ((lightNumber + 1) * lightData.lightArea * b * G * Le(lightMaterial, lightData.intersection).rgb) * material.color;
    return output;
  }

  output.color = hit.material.emission;
  return output;
}*/

fn calculateRayColor(
  seed: ptr<function,f32>,
  directRay: ray
) -> rayColor {
  var output: rayColor;

  let firstHit = getHit(directRay);
  if(!firstHit.hit){
    output.normal = directRay.direction;
    output.color = getSkyColor(directRay.direction);
    output.intersection = directRay.direction * 1000 + directRay.origin;
    return output;
  }

  let firstMaterial = firstHit.material;

  let diffuseDirection = normalize(firstHit.normal + RandomSphereDirection(seed, firstHit.position));
  let specularDirection = reflect(directRay.direction, firstHit.normal);
  let isSpecular = f32(firstMaterial.specularity > randomFromVec3(seed, firstHit.position));
  //let isTransparent = f32(firstMaterial.specularity > randomFromVec3(seed, firstHit.position));

  let rayDirection = mix(diffuseDirection, specularDirection, firstMaterial.smoothness * isSpecular);

  var nextRay: ray;
  nextRay.direction = rayDirection;
  nextRay.origin = firstHit.position + nextRay.direction * 0.0001;

  var lastDirection = rayDirection;
  var lastSpecularity = isSpecular;

  var incomingLight = firstMaterial.emission;
  var throughput = firstMaterial.color;

  output.normal = firstHit.normal;
  output.intersection = firstHit.position;

  for(var i: i32 = 0; i < bounces; i++){
    let hit = getHit(nextRay);
    if(!hit.hit){
      incomingLight += getSkyColor(nextRay.direction) * throughput;
      break;
    }

    if(i == 0 && isSpecular == 1.0){
      output.normal = hit.normal;
      output.intersection = hit.position;
    }

    let lightData = calculateDirectLighting(seed, hit.position);

    if(lightData.hit){
      let lightMaterial = lightData.material;
      let material = hit.material;

      let G = abs(dot(hit.normal, lightData.direction) * dot(lightData.intersection.normal, lightData.direction)) / lightData.diminuation;
      let b = Eval_BRDF(nextRay.direction, lightData.direction, lastSpecularity);

      incomingLight += (lightNumber * lightData.lightArea * b * G * Le(lightMaterial, lightData.intersection).rgb) * throughput;
    }

    let material = hit.material;

    let diffuseDirection = normalize(hit.normal + RandomSphereDirection(seed, hit.position));
    let specularDirection = reflect(nextRay.direction, hit.normal);
    let isSpecular = f32(material.specularity > randomFromVec3(seed, hit.position));
    //let isTransparent = f32(material.specularity > randomFromVec3(seed, hit.position));

    let rayDirection = mix(diffuseDirection, specularDirection, material.smoothness * isSpecular);

    nextRay.direction = rayDirection;
    nextRay.origin = hit.position + nextRay.direction * 0.00001;

    let cosTheta = abs(dot(hit.normal, nextRay.direction));
    let sinTheta = sqrt(1 - pow(cosTheta, 2));
    let p = (cosTheta * sinTheta) / PI;

    throughput *= getTriangleAlbedo(material, hit).rgb *
              Eval_BRDF(lastDirection, nextRay.direction, 0.0) 
              * cosTheta * sinTheta / p;

    lastDirection = nextRay.direction;
    lastSpecularity = isSpecular;
  }

  output.color = incomingLight;
  return output;
}

fn isNan(num: f32) -> bool {
    return (bitcast<u32>(num) & 0x7fffffffu) > 0x7f800000u;
}

@compute @workgroup_size(8, 8)
fn main(
    @builtin(global_invocation_id) texID: vec3<u32>
){
    let texCoord = vec2<f32>(texID.xy);
    var seed = inputData.totalFrames;
    //random(&seed);

    let depth = tan(cameraData.fov / 2.0);
    
    var pixelColor: vec3<f32>;
    var pixelNormal: vec3<f32>;
    var pixelPosition: vec3<f32>;

    var raysDone = 0;

    for(var i = 0; i < spp; i++){
        let fakePixelPosition = texCoord + randomVec2FromVec2(&seed, texCoord);
        var NDC = (fakePixelPosition + vec2<f32>(0.5)) / inputData.resolution;

        let aspectRatio = inputData.resolution.x / inputData.resolution.y;

        let screenX = 2 * NDC.x - 1;
        let screenY = 1 - 2 * NDC.y;

        let cameraX = screenX * depth * aspectRatio;
        let cameraY = screenY * depth;

        let rayDirection = (cameraData.CameraToWorldMatrix * vec4<f32>(cameraX, -cameraY, -1, 0)).xyz;

        let ray = ray(cameraData.position, rayDirection);
        let rayColor = calculateRayColor(&seed, ray);
        if(isNan(rayColor.color.r) || isNan(rayColor.color.g) || isNan(rayColor.color.b)){
            continue;
        }

        pixelColor += rayColor.color;
        pixelNormal += rayColor.normal;
        pixelPosition += (cameraData.position - rayColor.intersection);
        raysDone += 1;
    }

    pixelColor /= f32(max(raysDone, 1));
    pixelNormal /= f32(max(raysDone, 1));
    pixelPosition /= f32(max(raysDone, 1));

    //textureStore(illuminationTexture, texID.xy, vec4<f32>(texCoord.xy / inputData.resolution, 0, 1));
    textureStore(illuminationTexture, texID.xy, vec4<f32>(pixelColor, 1));
    textureStore(normalTexture, texID.xy, vec4<f32>(pixelNormal, 1));
    textureStore(positionTexture, texID.xy, vec4<f32>(pixelPosition, 1));

    //return vec4<f32>(random(&seed), random(&seed), random(&seed), 1);
    //return averageColor;
    //return vec4<f32>(pow(averageColor.xyz, vec3<f32>(1/2.2)), 1);
    //return vec4<f32>(pow(ACESFilm(averageColor.xyz), vec3<f32>(1/2.2)), 1);
    //return vec4<f32>(texCoord / inputData.resolution, 0, 1);
}