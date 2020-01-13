#version 300 es

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

uniform sampler2D uSampler;
uniform uint uMapWidth;
uniform uint uMapHeight;

uniform float uHeightScale;

layout(location = 0) in vec2 iPosition;

out vec2 heightmapCoord;

void main() {
    heightmapCoord.x = iPosition.x / float(uMapWidth);
    heightmapCoord.y = iPosition.y / float(uMapHeight);

    float height = texture(uSampler, heightmapCoord).y * uHeightScale;

    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(iPosition, height, 1.f);
}
