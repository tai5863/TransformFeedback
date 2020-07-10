
(function(){
  'use strict';

  let gl, run, c;

  window.addEventListener('load', function(){
    c = document.getElementById('canvas');
    const resizeCanvas = function() {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    gl = c.getContext('webgl2');

    if (gl) {
      console.log('ready');
    } else {
      alert('webgl2 unsupported');
      return;
    }

    let cubeSize = document.getElementById('cube_size');
    let dispCubeSize = document.getElementById('disp_cube_size');
    let instNum = document.getElementById('instance_num');
    let dispInstNum = document.getElementById('disp_instance_num');
    let bgR = document.getElementById('bg_color_r');
    let bgG = document.getElementById('bg_color_g');
    let bgB = document.getElementById('bg_color_b');

    init();

    function init(){
      // transform feedback object
      let transformFeedback = gl.createTransformFeedback();
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);

      let outVaryings = ['vPosition', 'vVelocity'];

      let v_shader = create_shader('vs_transform');
      let f_shader = create_shader('fs_transform');
      let prg = create_program_tf_separate(v_shader, f_shader, outVaryings);

      let attLocation = [];
      attLocation[0] = 0;
      attLocation[1] = 1;

      let attStride = [];
      attStride[0] = 4;
      attStride[1] = 3;

      let uniLocation = [];
      uniLocation[0] = gl.getUniformLocation(prg, 'time');

      v_shader = create_shader('vs_main');
      f_shader = create_shader('fs_main');
      let fPrg = create_program(v_shader, f_shader);

      let fAttLocation = [];
      fAttLocation[0] = 0;
      fAttLocation[1] = 1;
      fAttLocation[2] = 2;
      fAttLocation[3] = 3;
      fAttLocation[4] = 4;

      let fAttStride = [];
      fAttStride[0] = 3;
      fAttStride[1] = 3;
      fAttStride[2] = 4;
      fAttStride[3] = 3;

      let fUniLocation = [];
      fUniLocation[0] = gl.getUniformLocation(fPrg, 'mvpMatrix');

      let cubeData = cube(0.03);
      let cPosition = create_vbo(cubeData.p);
      let cNormal = create_vbo(cubeData.n);
      let cVBOList = [cPosition, cNormal];
      let cIndex = create_ibo(cubeData.i);

      let instanceCount = 1000000;

      let instancePositions = [];
      let instanceVelocities = [];
      
      let instanceFeedbackPositions = [];
      let instanceFeedbackVelocities = [];

      let offsetPosition = 4;
      let offsetVelocity = 3;
      
      for (let i = 0; i < instanceCount; i++) {
        // position
        let range = 10.0;
        let x = Math.random() * range - range / 2.0;
        let y = Math.random() * range - range / 2.0;
        let z = Math.random() * range - range / 2.0;
        let w = Math.random();
        instancePositions[i * offsetPosition] = x;
        instancePositions[i * offsetPosition + 1] = y;
        instancePositions[i * offsetPosition + 2] = z;
        instancePositions[i * offsetPosition + 3] = w;

        // velocity
        instanceVelocities[i * offsetVelocity] = 0.0;
        instanceVelocities[i * offsetVelocity + 1] = 0.0;
        instanceVelocities[i * offsetVelocity + 2] = 0.0;
      }

      instanceFeedbackPositions = new Float32Array(instanceCount * 4);
      instanceFeedbackVelocities = new Float32Array(instanceCount * 3);

      let iPositionR = create_vbo(instancePositions);
      let iVelocityR = create_vbo(instanceVelocities);
      let iPositionW = create_vbo_feedback(instanceFeedbackPositions);
      let iVelocityW = create_vbo_feedback(instanceFeedbackVelocities);

      const swapVBOs = function(){
        let tmpP = iPositionR;
        let tmpV = iVelocityR;
        iPositionR = iPositionW;
        iVelocityR = iVelocityW;
        iPositionW = tmpP;
        iVelocityW = tmpV;
      };

      let m = new matIV();
      let mMatrix = m.identity(m.create());
      let vMatrix = m.identity(m.create());
      let pMatrix = m.identity(m.create());
      let tmpMatrix = m.identity(m.create());
      let mvpMatrix = m.identity(m.create());

      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.disable(gl.RASTERIZER_DISCARD);

      let startTime = Date.now();
      let nowTime = 0;
      let count = 0;
      let cSize = 0;
      run = true;

      let stats = new Stats();
      let container = document.getElementById('container');
      container.appendChild(stats.domElement);

      render();

      function render(){

        m.lookAt([0.0, 0.0, 15.0], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0], vMatrix);
        m.perspective(100, c.width / c.height, 0.01, 1000.0, pMatrix);
        m.multiply(pMatrix, vMatrix, tmpMatrix);

        stats.update();

        nowTime = (Date.now() - startTime) / 1000;

        ++count;

        cSize = cubeSize.value * 0.005;
        dispCubeSize.innerHTML = Math.round((cSize * 10) * 100) / 100;

        instanceCount = instNum.value;
        dispInstNum.innerHTML = instanceCount;

        cubeData = cube(cSize);
        cPosition = create_vbo(cubeData.p);
        cNormal = create_vbo(cubeData.n);
        cVBOList = [cPosition, cNormal];
        cIndex = create_ibo(cubeData.i);

        gl.useProgram(prg);

        // uniform
        gl.uniform1f(uniLocation[0], nowTime);

        // bind buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, iPositionR);
        gl.enableVertexAttribArray(attLocation[0]);
        gl.vertexAttribPointer(attLocation[0], attStride[0], gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, iVelocityR);
        gl.enableVertexAttribArray(attLocation[1]);
        gl.vertexAttribPointer(attLocation[1], attStride[1], gl.FLOAT, false, 0, 0);

        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, iPositionW);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, iVelocityW);

        gl.enable(gl.RASTERIZER_DISCARD);
        gl.beginTransformFeedback(gl.POINTS);

        gl.drawArrays(gl.POINTS, 0, instanceCount);

        gl.disable(gl.RASTERIZER_DISCARD);
        gl.endTransformFeedback();
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);

        // swap
        swapVBOs();

        let bColor = [bgR.value, bgG.value, bgB.value];
        bColor = normalizeColor(bColor);
        // clear
        gl.clearColor(bColor[0], bColor[1], bColor[2], 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, c.width, c.height);

        gl.useProgram(fPrg);

        // bind buffer
        set_attribute(cVBOList, fAttLocation, fAttStride);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cIndex);

        gl.bindBuffer(gl.ARRAY_BUFFER, iPositionR);
        gl.enableVertexAttribArray(fAttLocation[2]);
        gl.vertexAttribPointer(fAttLocation[2], fAttStride[2], gl.FLOAT, false, 0, 0);

        gl.vertexAttribDivisor(2, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, iVelocityR);
        gl.enableVertexAttribArray(fAttLocation[3]);
        gl.vertexAttribPointer(fAttLocation[3], fAttStride[3], gl.FLOAT, false, 0, 0);

        gl.vertexAttribDivisor(3, 1);

        m.multiply(tmpMatrix, mMatrix, mvpMatrix);

        // uniform
        gl.uniformMatrix4fv(fUniLocation[0], false, mvpMatrix);

        gl.drawElementsInstanced(gl.TRIANGLES, cubeData.i.length, gl.UNSIGNED_SHORT, 0, instanceCount);

        gl.flush();

        if (run) {requestAnimationFrame(render);}
      }
    }
  }, false);

  // src: https://wgld.org/

  function cube(side, color){
    let hs = side * 0.5;
    let pos = [
      -hs, -hs,  hs,  hs, -hs,  hs,  hs,  hs,  hs, -hs,  hs,  hs,
      -hs, -hs, -hs, -hs,  hs, -hs,  hs,  hs, -hs,  hs, -hs, -hs,
      -hs,  hs, -hs, -hs,  hs,  hs,  hs,  hs,  hs,  hs,  hs, -hs,
      -hs, -hs, -hs,  hs, -hs, -hs,  hs, -hs,  hs, -hs, -hs,  hs,
       hs, -hs, -hs,  hs,  hs, -hs,  hs,  hs,  hs,  hs, -hs,  hs,
      -hs, -hs, -hs, -hs, -hs,  hs, -hs,  hs,  hs, -hs,  hs, -hs
    ];
    let nor = [
      -1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,  1.0,  1.0, -1.0,  1.0,  1.0,
      -1.0, -1.0, -1.0, -1.0,  1.0, -1.0,  1.0,  1.0, -1.0,  1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0, -1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0, -1.0,
      -1.0, -1.0, -1.0,  1.0, -1.0, -1.0,  1.0, -1.0,  1.0, -1.0, -1.0,  1.0,
       1.0, -1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,  1.0,  1.0, -1.0,  1.0,
      -1.0, -1.0, -1.0, -1.0, -1.0,  1.0, -1.0,  1.0,  1.0, -1.0,  1.0, -1.0
    ];
    let col = new Array();
    for(var i = 0; i < pos.length / 3; i++){
      if(color){
        var tc = color;
      }else{
        tc = hsva(360 / pos.length / 3 * i, 1, 1, 1);
      }
      col.push(tc[0], tc[1], tc[2], tc[3]);
    }
    let st = [
      0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0
    ];
    let idx = [
       0,  1,  2,  0,  2,  3,
       4,  5,  6,  4,  6,  7,
       8,  9, 10,  8, 10, 11,
      12, 13, 14, 12, 14, 15,
      16, 17, 18, 16, 18, 19,
      20, 21, 22, 20, 22, 23
    ];
    return {p : pos, n : nor, c : col, t : st, i : idx};
  }

	function create_shader(id){
    let shader;
    let scriptElement = document.getElementById(id);
    if(!scriptElement){return;}
    switch(scriptElement.type){
      case 'x-shader/x-vertex':
        shader = gl.createShader(gl.VERTEX_SHADER);
        break;
      case 'x-shader/x-fragment':
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        break;
      default :
        return;
    }
    gl.shaderSource(shader, scriptElement.text);
    gl.compileShader(shader);
    if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
      return shader;
    }else{
      alert(gl.getShaderInfoLog(shader));
    }
  }

  function create_program(vs, fs){
    let program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if(gl.getProgramParameter(program, gl.LINK_STATUS)){
      gl.useProgram(program);
      return program;
    }else{
      alert(gl.getProgramInfoLog(program));
    }
  }

  function create_program_tf_separate(vs, fs, varyings){
    let program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.transformFeedbackVaryings(program, varyings, gl.SEPARATE_ATTRIBS);
    gl.linkProgram(program);
    if(gl.getProgramParameter(program, gl.LINK_STATUS)){
      gl.useProgram(program);
      return program;
    }else{
      alert(gl.getProgramInfoLog(program));
    }
  }

  function create_vbo(data){
    let vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vbo;
  }

  function create_vbo_feedback(data){
    let vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vbo;
  }

  function set_attribute(vbo, attL, attS){
    for(let i in vbo){
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
      gl.enableVertexAttribArray(attL[i]);
      gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
    }
  }

	function create_ibo(data){

		let ibo = gl.createBuffer();

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		return ibo;
  }
  // color normalization
  function normalizeColor(color){
    color[0] /= 255;
    color[1] /= 255;
    color[2] /= 255;

    return color;
  }
})();
