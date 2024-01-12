
// TODO
/*
Get verticies and indicies from cy.js
Get the transform from cy.js
*/

const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;


async function main() {
  const graphP = fetch('tokyo-railways.json').then(res => res.json());
  const styleP = fetch('tokyo-railways.cycss').then(res => res.text());
  const [graph, style] = await Promise.all([graphP, styleP]);

  // const graph = {
  //   elements: [ 
  //     { data: { id: 'a' }, position: { x: -0.9, y:  0.9} },
  //     { data: { id: 'b' }, position: { x: -0.9, y: -0.9} },
  //     { data: { id: 'c' }, position: { x:  0.9, y: -0.9} },
  //     { data: { id: 'd' }, position: { x:  0.9, y:  0.9} },
  //     { data: { id: 'ab', source: 'a', target: 'b' } },
  //     { data: { id: 'bc', source: 'b', target: 'c' } },
  //     { data: { id: 'cd', source: 'c', target: 'd' } },
  //     { data: { id: 'da', source: 'd', target: 'a' } },
  //   ]
  // };
  // const style = [
  //   { selector: 'node',
  //     style: {
  //       width: 0.0,
  //       height: 0.0,
  //     }
  //   },
  //   { selector: 'edge',
  //     style: {
  //       color: 'white',
  //     }
  //   }
  // ];

  const cy = initCy('cy', graph, style);
  cy.fit();

  const gl = initGl('gl');
  const program = createShaderProgram(gl);
  
  cy.on('pan', evt => {
    drawCyEdgesInWebGL(cy, gl, program);
  });

  drawCyEdgesInWebGL(cy, gl, program);

  console.log("done");
}

function initGl(id) {
  const canvas = document.getElementById(id);
  // TODO why do I have to do this???
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight / 2;

  const gl = canvas.getContext('webgl2');

  gl.clearColor(0.3, 0.3, 0.3, 1); // Set the clear color to be black
  return gl;
}


function createShaderProgram(gl) {
  const vertexShader   = utils.getShader(gl, 'vertex-shader');
  const fragmentShader = utils.getShader(gl, 'fragment-shader');

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Could not initialize shaders');
  }

  program.aVertexPosition   = gl.getAttribLocation(program,  'aVertexPosition');
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
 * @param {WebGLRenderingContext} gl
 */
function drawCyEdgesInWebGL(cy, gl, program) {
  const vertices = getEdgeVertices(cy);

  const transformMatrix  = getTransformMatrix(cy);
  const projectionMatrix = getProjectionMatrix(cy, gl);

  // Load vertex buffer
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // Clear the scene 
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.vertexAttribPointer(program.aVertexPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(program.aVertexPosition);

  gl.uniformMatrix4fv(program.uTransformMatrix, false, transformMatrix);
  gl.uniformMatrix4fv(program.uProjectionMatrix, false, projectionMatrix);

  gl.drawArrays(gl.LINES, 0, vertices.length / 2);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}


function getEdgeVertices(cy) {
  return cy
    .edges()
    .map(edge => {
      const sp = edge.source().position();
      const tp = edge.target().position();
      return [sp.x, sp.y, tp.x, tp.y];
    })
    .flat();
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