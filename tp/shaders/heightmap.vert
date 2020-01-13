#version 300 es

uniform uint uMapWidth;
uniform uint uMapHeight;

out vec2 position;

void main() {
    float x = -1.f + float((gl_VertexID & 1) << 2);
    float y = -1.f + float((gl_VertexID & 2) << 1);

    position.x = x * 0.5 + 0.5;
    position.y = y * 0.5 + 0.5;

    position.x *= float(uMapWidth);
    position.y *= float(uMapHeight);

    gl_Position = vec4(x, y, 0.f, 1.0);
}
