#version 300 es
precision highp float;

uniform vec2 uNoiseOffset;
uniform int uOctaves;
uniform float uPersistance;
uniform float uLacunarity;

uniform float uSeaLevel;

in vec2 position;

layout(location = 0) out vec3 oFragmentColor;


float generateHeight(vec2 pos);
float simplex(vec2 v);


void main() {
    oFragmentColor = vec3(generateHeight(position));
}


float generateHeight(vec2 pos) {
    float height = 0.f;

    float amplitude = 1.f;
    float frequency = 1.f;

    for (int i = 0; i < uOctaves; ++i) {
        vec2 coords = (pos + uNoiseOffset) / 25.f * frequency + vec2(1324, 6534);
        height += simplex(coords) * amplitude;

        amplitude *= uPersistance;
        frequency *= uLacunarity;
    }

    height = (height * 0.5f) + 0.01f;

    if (height <= uSeaLevel) {
        return uSeaLevel + 0.01f;
    }

    return height;
}


vec3 permute(vec3 x) {
    return mod(((x * 34.f) + 1.f) * x, 289.f);
}

float simplex(vec2 v) {
    const vec4 C = vec4(
    0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439
    );
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.f, 0.f) : vec2(0.f, 1.f);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.f);
    vec3 p = permute(permute(i.y + vec3(0.f, i1.y, 1.f)) + i.x + vec3(0.f, i1.x, 1.f));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.f);
    m = m * m;
    m = m * m;
    vec3 x = 2.f * fract(p * C.www) - 1.f;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.f * dot(m, g);
}
