"use strict";

//--------------------------------------------------------------------------------------------------------
// Global variables
//--------------------------------------------------------------------------------------------------------
// const
const mapWidth = 500;
const mapHeight = 500;
const verticesDensity = 2;
const verticesSpacing = 1 / verticesDensity;

const noiseOffset = Vec2(Math.random(), Math.random()).mult(1_000_000);

let slider_octaves;
let slider_persistance;
let slider_lacunarity;

let generate_button;

let slider_heightScale;
let slider_drawMode;

let layers = [
    {
        start_height: 0,
        color: Vec4(0, 0, 1, 0),
        texture_file: "images/textures/water.png",
        texture_period: 200,
        blend: 0,
        texture: -1
    }, {
        start_height: 0.078,
        color: Vec4(0.761, 0.698, 0.502, 0),
        texture_file: "images/textures/sandy_grass.png",
        texture_period: 200,
        blend: 0.02,
        texture: -1
    }, {
        start_height: 0.088,
        color: Vec4(0, 0.5, 0, 0),
        texture_file: "images/textures/grass.png",
        texture_period: 200,
        blend: 0.04,
        texture: -1
    }, {
        start_height: 0.225,
        color:Vec4(0.3, 0.3, 0.3, 0),
        texture_file: "images/textures/stony_ground.png",
        texture_period: 200,
        blend: 0.107,
        texture: -1
    }, {
        start_height: 0.431,
        color: Vec4(0.4, 0.4, 0.4, 0),
        texture_file: "images/textures/rocks_1.png",
        texture_period: 200,
        blend: 0.313,
        texture: -1
    }, {
        start_height: 0.843,
        color: Vec4(1, 1, 1, 0),
        texture_file: "images/textures/snow.png",
        texture_period: 200,
        blend: 0.284,
        texture: -1
    }
];

let heightMapGenerationShader = null;
let vao = null;
let ebo = null;
let triangles_count = 0;
let fbo = null;
let heightMap = null;
let normalizedHeightMap = null;

let renderShader = null;


//--------------------------------------------------------------------------------------------------------
// Initialization Functions
//--------------------------------------------------------------------------------------------------------

function generate_terrain_vert_tri(width, height) {
    let vertices = [];
    let triangles = [];

    for (let x = 0; x < width; ++x) {
        for (let y = 0; y < height; ++y) {
            vertices.push(x * verticesSpacing);
            vertices.push(y * verticesSpacing);
        }
    }

    for (let x = 1; x < width; ++x) {
        for (let y = 1; y < height; ++y) {
            const p1 = (x - 1) * height + (y - 1);
            const p2 = x * height + (y - 1);
            const p3 = x * height + y;
            const p4 = (x - 1) * height + y;

            triangles.push(p1);
            triangles.push(p4);
            triangles.push(p2);

            triangles.push(p2);
            triangles.push(p4);
            triangles.push(p3);
        }
    }

    return {
        vertices: new Float32Array(vertices),
        triangles: new Uint32Array(triangles)
    };
}


function init_heightmap() {
    layers.sort((l1 ,l2) => l1.start_height - l2.start_height);

    heightMap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, heightMap);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, mapWidth, mapHeight, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);

    normalizedHeightMap = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, normalizedHeightMap);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, mapWidth, mapHeight, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
}


function init_fbo() {
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    let depthRenderBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, mapWidth, mapHeight);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, heightMap, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}


function check_fbo(fbo) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    switch (status) {
        case gl.FRAMEBUFFER_COMPLETE:
            break;
        case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
            console.error("FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
            break;
        case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
            console.error("FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
            break;
        case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
            console.error("FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
            break;
        case gl.FRAMEBUFFER_UNSUPPORTED:
            console.error("FRAMEBUFFER_UNSUPPORTED");
            break;
    }
}


function init_heightmap_generation() {
    init_heightmap();
    init_fbo();
    check_fbo(fbo);

    heightMapGenerationShader = ShaderProgramFromFiles(
        "shaders/heightmap.vert",
        "shaders/heightmap.frag",
        'basic shader'
    );
}


function init_vao() {
    ////////// TRIANGLES CREATION //////////
    let data = generate_terrain_vert_tri(mapWidth, mapHeight);
    triangles_count = (mapWidth - 1) * (mapHeight - 1) * 2;


    ////////// VBO CREATION //////////
    let positionsVbo = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionsVbo);
    gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);


    ////////// EBO CREATION //////////
    ebo = gl.createBuffer();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,  ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.triangles, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,  null);


    ////////// VAO CREATION //////////
    vao = gl.createVertexArray();

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionsVbo);

    gl.vertexAttribPointer(0, 2, gl.FLOAT,false, 0, 0);
    gl.enableVertexAttribArray(0);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}


function init_textures() {
    let i = 1;

    for (let layer of layers) {
        let texture = gl.createTexture();

        let pixels = new Uint8Array([255, 255, 0]);
        gl.bindVertexArray(vao);
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, pixels);

        gl.bindVertexArray(null);

        const image = new Image();
        image.onload = function(i) {
            return function () {
                gl.bindVertexArray(vao);
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                layer.texture = i;

                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.generateMipmap(gl.TEXTURE_2D);

                gl.bindVertexArray(null);
            }
        }(i);
        image.onerror = function (image_path) {
            return function(event) {
                console.error(`Unable to load image: ${image_path}`);
            }
        }(layer.texture_file);
        image.src = layer.texture_file;

        ++i;
    }
}


function init_gui() {
    UserInterface.begin();
        UserInterface.use_field_set('V', "Generation");
            UserInterface.use_field_set('H', "");
                slider_octaves = UserInterface.add_slider('Octaves', 1, 10, 4, null);
                slider_persistance = UserInterface.add_slider('Persistance', 0, 100, 60, null);
                slider_lacunarity = UserInterface.add_slider('Lacunarity', 0, 300, 200, null);
            UserInterface.end_use();
            generate_button = UserInterface.add_button('Generate Heightmap', generate_heightmap);
        UserInterface.end_use();

        UserInterface.use_field_set('V', "Rendering");
            let mods = ['Colors', 'Textures', 'Heights', 'Normals', 'UVs'];
            slider_drawMode = UserInterface.add_list_input(mods, 0, update_wgl);
            UserInterface.use_field_set('H', "");
                slider_heightScale = UserInterface.add_slider('Height Scale', 1, 100, 30, update_wgl);
            UserInterface.end_use();
        UserInterface.end_use();
    UserInterface.end();
}


//--------------------------------------------------------------------------------------------------------
// Height Map
//--------------------------------------------------------------------------------------------------------

function generate_heightmap_texture() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, mapWidth, mapHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    heightMapGenerationShader.bind();

    // TODO: correct
    Uniforms.uNoiseOffset = noiseOffset;

    Uniforms.uMapWidth = mapWidth;
    Uniforms.uMapHeight = mapHeight;

    Uniforms.uOctaves = slider_octaves.value;
    Uniforms.uPersistance = slider_persistance.value / 100;
    Uniforms.uLacunarity = slider_lacunarity.value / 100;

    if (layers.length > 1) {
        Uniforms.uSeaLevel = layers[1].start_height;
    } else {
        Uniforms.uSeaLevel = 0;
    }

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.useProgram(null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function generate_normals(data) {
    let normals = Array(mapWidth * mapHeight).fill(Vec3(0, 0, 0));
    let vertices = Array(mapWidth * mapHeight);

    for (let x = 0; x < mapWidth; ++x) {
        for (let y = 0; y < mapHeight; ++y) {
            let i = y * mapWidth + x;
            vertices[i] = Vec3(x, y, data.pixels[i * 4]);
        }
    }

    for (let x = 0; x < mapWidth -1; ++x) {
        for (let y = 0; y < mapHeight -1; ++y) {
            let ia = y * mapWidth + x;
            let ib = y * mapWidth + x + 1;
            let ic = (y + 1) * mapWidth + x;

            let e1 = vertices[ia].sub(vertices[ib]);
            let e2 = vertices[ic].sub(vertices[ib]);
            let n = e1.cross(e2);

            normals[ia] = normals[ia].add(n);
            normals[ib] = normals[ib].add(n);
            normals[ic] = normals[ic].add(n);
        }
    }

    for (let i = 0; i < mapWidth * mapHeight; ++i) {
        let len = Math.sqrt(normals[i].x * normals[i].x + normals[i].y * normals[i].y + normals[i].z * normals[i].z);
        data.pixels[i * 4 + 1] = (normals[i].x / len) * 255;
        data.pixels[i * 4 + 2] = (normals[i].y / len) * 255;
        data.pixels[i * 4 + 3] = (normals[i].z / len) * 255;
    }
}

function lerp_int(a, b, t) {
    return Math.round(a + t * (b - a));
}

function inverse_lerp(a, b, v) {
    return (v - a) / (b - a);
}

function normalize_heightmap() {
    // TODO: corriger, l'affichage n'est pas normalisé
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    let pixels = new Uint8Array(mapWidth * mapHeight * 4);
    gl.readPixels(0, 0, mapWidth, mapHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    let minVal = Number.POSITIVE_INFINITY;
    let maxVal = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < mapWidth * mapHeight; ++i) {
        let h = pixels[i * 4]; /* +0 because the height is in the r/x value */
        if (h < minVal) {
            minVal = h;
        } else if (h > maxVal) {
            maxVal = h;
        }
    }

    for (let i = 0; i < mapWidth * mapHeight; ++i) {
        pixels[i * 4] = 255 * inverse_lerp(minVal, maxVal, pixels[i * 4]);
    }

    generate_normals({pixels: pixels});

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, normalizedHeightMap);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, mapWidth, mapHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindTexture(gl.TEXTURE_2D, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}


function generate_heightmap() {
    console.log("Loading heightmap...");
    generate_button.disabled = true;

    generate_heightmap_texture();
    normalize_heightmap();

    generate_button.disabled = false;
    console.log("End loading");
}


//--------------------------------------------------------------------------------------------------------
// Rendering
//--------------------------------------------------------------------------------------------------------

function draw_terrain() {
    gl.drawBuffers([gl.BACK]);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    renderShader.bind();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, normalizedHeightMap);
    Uniforms.uHeightmapSampler = 0;

    Uniforms.uMapWidth = mapWidth;
    Uniforms.uMapHeight = mapHeight;

    Uniforms.uHeightScale = slider_heightScale.value / 10;

    Uniforms.uDrawMode = slider_drawMode.value;

    Uniforms.uLayersCount = layers.length;
    Uniforms.uLayersHeights = layers.map(layer => layer.start_height);
    Uniforms.uLayersColors = layers.map(l => l.color);
    Uniforms.uLayersSamplers = layers.map(l => l.texture);
    Uniforms.uLayersTexturesPeriod = layers.map(l => l.texture_period);
    Uniforms.uLayersBlend = layers.map(l => l.blend);

    const scale = 0.03;
    //const scale = 1;

    // verticesDencity
    let model = Matrix.mult(
        Matrix.translate(
            -(mapWidth * verticesSpacing / 2) * scale,
            -(mapHeight * verticesSpacing / 2) * scale,
            0
        ),
        Matrix.scale(scale, scale, scale)
    );

    Uniforms.uProjectionMatrix = ewgl.scene_camera.get_projection_matrix();
    Uniforms.uViewMatrix = ewgl.scene_camera.get_view_matrix();
    Uniforms.uModelMatrix = model;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.drawElements(gl.TRIANGLES, triangles_count * 3, gl.UNSIGNED_INT, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindVertexArray(null);

    gl.bindTexture(gl.TEXTURE_2D, null);

    gl.useProgram(null);
}


//--------------------------------------------------------------------------------------------------------
// Easy WebGL
//--------------------------------------------------------------------------------------------------------

function init_wgl() {
    ewgl.continuous_update = true;

    init_gui();

    init_heightmap_generation();

    renderShader = ShaderProgramFromFiles(
        "shaders/render.vert",
        "shaders/render.frag",
        'basic shader'
    );

    init_vao();
    init_textures();

    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);

    generate_heightmap();
}

function draw_wgl() {
    draw_terrain();
}

ewgl.launch_3d();
