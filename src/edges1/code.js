
// TODO
/*
Get verticies and indicies from cy.js
Get the transform from cy.js
*/

const mat4 = glMatrix.mat4;

async function main() {
  const graphP = fetch('tokyo-railways.json').then(res => res.json());
  const styleP = fetch('tokyo-railways.cycss').then(res => res.text());
  const [graph, style] = await Promise.all([graphP, styleP]);
  
  const cy = initCy('cy', graph, style);
  // cy.reset();

  const { gl, program } = initGl('gl');

  // cy.on('pan', evt => {
  //   const edges = cy.edges();
    
  //   console.log(vertices);
  // });

  drawCyEdgesInWebGL(cy, gl, program);

  console.log("done");
}

function initGl(id) {
  const canvas = document.getElementById(id);
  // TODO why do I have to do this???
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight / 2;

  console.log(canvas.width);
  
  /** @type {WebGLRenderingContext} */
  const gl = canvas.getContext('webgl2');
  
  gl.clearColor(0.5, 0.5, 0.5, 1); // Set the clear color to be black

  const vertexShader   = utils.getShader(gl, 'vertex-shader');
  const fragmentShader = utils.getShader(gl, 'fragment-shader');

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Could not initialize shaders');
  }

  gl.useProgram(program);
  program.aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');

  return { gl, program };
  // initBuffers();
  // draw();
}


/**
 * @param {WebGLRenderingContext} gl
 */
function drawCyEdgesInWebGL(cy, gl, program) {
  const zoom = cy.zoom();
  const pan  = cy.pan();

  console.log(zoom);
  console.log(pan);

  // const vertices = getEdgeVertices(cy);

  const vertices = [0.5, 0.5, -0.5, -0.5];

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

  gl.drawArrays(gl.LINES, 0, vertices.length / 2);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}


function getEdgeVertices(cy) {
  return cy
    .edges()
    .map(edge => edge.source().position())
    .flatMap(({x, y}) => [x, y]);
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