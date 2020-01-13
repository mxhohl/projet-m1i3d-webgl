#version 300 es
precision highp float;

#define MAX_LAYERS 8

uniform sampler2D uHeightmapSampler;

uniform int uDrawMode;

uniform int uLayersCount;
uniform float uLayersHeights[MAX_LAYERS];
uniform vec4 uLayersColors[MAX_LAYERS];
uniform sampler2D uLayersSamplers[MAX_LAYERS];
uniform float uLayersTexturesPeriod[MAX_LAYERS];
uniform float uLayersBlend[MAX_LAYERS];

in vec2 heightmapCoord;

out vec4 oFragColor;

float invLerp(float a, float b, float v);
vec2 getLayerTexCoord(int layer);
vec3 getLayerColor(int layer, vec2 texCoord);

void main() {
    float height = texture(uHeightmapSampler, heightmapCoord).z;

    vec3 color = vec3(0.0);
    for (int i = 0; i < uLayersCount; ++i) {
        float drawStrength = invLerp(-uLayersBlend[i] / 2.0, uLayersBlend[i] / 2.0, height - uLayersHeights[i]);
        vec2 layerTexCoord = getLayerTexCoord(i);
        color = color  * (1.0 - drawStrength) + getLayerColor(i, layerTexCoord) * drawStrength;
    }
    oFragColor = vec4(color, 1.0);
}

float invLerp(float a, float b, float v) {
    return clamp((v - a) / (b - a), 0.0, 1.0);
}

vec2 getLayerTexCoord(int layer) {
    vec2 layerTexCoord = heightmapCoord * 2.0 * uLayersTexturesPeriod[layer];
    layerTexCoord.x -= floor(layerTexCoord.x);
    layerTexCoord.y -= floor(layerTexCoord.y);
    return layerTexCoord;
}

vec3 getLayerColor(int layer, vec2 texCoord) {
    vec3 layerColor;

    if (uDrawMode == 0) {
        return uLayersColors[layer].rgb;
    } else {
        if (layer == 0) {
            layerColor = texture(uLayersSamplers[0], texCoord).rgb;
        } else if (layer == 1) {
            layerColor = texture(uLayersSamplers[1], texCoord).rgb;
        } else if (layer == 2) {
            layerColor = texture(uLayersSamplers[2], texCoord).rgb;
        } else if (layer == 3) {
            layerColor = texture(uLayersSamplers[3], texCoord).rgb;
        } else if (layer == 4) {
            layerColor = texture(uLayersSamplers[4], texCoord).rgb;
        } else if (layer == 5) {
            layerColor = texture(uLayersSamplers[5], texCoord).rgb;
        } else if (layer == 6) {
            layerColor = texture(uLayersSamplers[6], texCoord).rgb;
        } else if (layer == 7) {
            layerColor = texture(uLayersSamplers[7], texCoord).rgb;
        } else {
            layerColor = vec3(1.0, 0.5, 0.5);
        }

        return mix(layerColor, uLayersColors[layer].rgb, uLayersColors[layer].a);
    }
}
