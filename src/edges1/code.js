const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;


async function main() {
  // Init Cytoscape
  const [ graph, style ] = await Promise.all([
    fetch('tokyo-railways.json').then(res => res.json()),
    fetch('tokyo-railways.cycss').then(res => res.text())
  ]);

  const cy = initCy('cy', graph, style);

  // Init WebGL
  const gl = initGl('gl');
  const program = await createShaderProgram(gl);

  const draw = () => drawCyEdgesInWebGL(cy, gl, program);
  
  // Set up events to sync from the cytoscape canvas to the webgl canvas
  cy.on('pan', draw);
  cy.nodes().on('drag', draw);
  cy.ready(draw);

  console.log("done");
}


function initGl(id) {
  const canvas = document.getElementById(id);

  // TODO why do I have to do this???
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight / 2;

  const gl = canvas.getContext('webgl2');

  gl.clearColor(0.3, 0.3, 0.3, 1); // background color
  return gl;
}


async function createShaderProgram(gl) {
  const [ vertexShader, fragmentShader ] = await Promise.all([
    utils.getShader(gl, 'shader-vertex.glsh'),
    utils.getShader(gl, 'shader-fragment.glsh'),
  ]);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Could not initialize shaders');
  }

  program.aVertexPosition   = gl.getAttribLocation(program,  'aVertexPosition');
  program.aVertexColor      = gl.getAttribLocation(program,  'aVertexColor');
  program.uTransformMatrix  = gl.getUniformLocation(program, 'uTransformMatrix');
  program.uProjectionMatrix = gl.getUniformLocation(program, 'uProjectionMatrix');

  gl.useProgram(program);
  return program;
}


function getTransformMatrix(cy) {
  const zoom = cy.zoom();
  const pan  = cy.pan();

  // TODO: should be able to combine these lines into one call to mat4.fromValues(...)
  const translateV = vec3.fromValues(pan.x, pan.y, 0);
  const scaleV = vec3.fromValues(zoom, zoom, 1);
  const transform = mat4.create();
  mat4.translate(transform, transform, translateV);
  mat4.scale(transform, transform, scaleV);

  return transform;
}


function getProjectionMatrix(cy, gl) {
  const { width, height } = gl.canvas;

  const projection = mat4.create();
  mat4.ortho(projection, 0, width, height, 0, -10, 10);

  return projection;
}


/**
 * TODO: This function loads the data from cytoscape on every frame. Find a way to keep
 * the data between frames and just update the transform/projection matricies. 
 * What about when nodes are moved?
 * 
 * @param {WebGLRenderingContext} gl
 */
function drawCyEdgesInWebGL(cy, gl, program) {
  const { vertices, colors } = getEdgeVertices(cy);

  const transformMatrix  = getTransformMatrix(cy);
  const projectionMatrix = getProjectionMatrix(cy, gl);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.vertexAttribPointer(program.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(program.aVertexPosition);

  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  gl.vertexAttribPointer(program.aVertexColor, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(program.aVertexColor);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.uniformMatrix4fv(program.uTransformMatrix, false, transformMatrix);
  gl.uniformMatrix4fv(program.uProjectionMatrix, false, projectionMatrix);

  gl.drawArrays(gl.LINES, 0, vertices.length / 3);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindVertexArray(null);
}


function getEdgeVertices(cy) {
  const edges = cy.edges();

  const vertices = edges
    .map(edge => {
      const sp = edge.source().position();
      const tp = edge.target().position();
      return [sp.x, sp.y, 0, tp.x, tp.y, 0];
    })
    .flat();

  const colors = edges
    .map(edge => {
      const color = edge.pstyle('line-color').value;
      // const opacity = e.pstyle('line-opacity').value;
      return [color[0], color[1], color[2], color[0], color[1], color[2]];
    })
    .flat()
    .map(c => c / 255);

  return { vertices, colors };
}


function initCy(id, graph, style) {
  const cy = cytoscape({
    container: document.getElementById(id),
    layout: { name: 'preset' },
    style,
    elements: graph.elements,
  });
  utils.mendRailwayData(cy);
  return cy;
}


window.addEventListener('load', main);