
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

    let params = {
      color: document.getElementById('color').checked,
      pointNum: document.getElementById('point_num').value,
      birthRange: document.getElementById('birth_range').value,
      lifeStep: document.getElementById('life_step').value,
      amplitude: document.getElementById('amplitude').value
    }

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
      uniLocation[0] = gl.getUniformLocation(prg, 'uTime');
      uniLocation[1] = gl.getUniformLocation(prg, 'uRange');
      uniLocation[2] = gl.getUniformLocation(prg, 'uLifeStep');
      uniLocation[3] = gl.getUniformLocation(prg, 'uAmplitude');

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
      fUniLocation[1] = gl.getUniformLocation(fPrg, 'isColor');

      let pointCount = 1000000;

      let pointPositions = [];
      let pointVelocities = [];
      
      let pointFeedbackPositions = [];
      let pointFeedbackVelocities = [];

      let offsetPosition = 4;
      let offsetVelocity = 3;

      let range = params.birthRange;
      
      for (let i = 0; i < pointCount; i++) {

        // position
        let x = Math.random() * range - range * 0.5;
        let y = Math.random() * range - range * 0.5;
        let z = Math.random() * range - range * 0.5;
        let w = Math.random();
        pointPositions[i * offsetPosition] = x;
        pointPositions[i * offsetPosition + 1] = y;
        pointPositions[i * offsetPosition + 2] = z;
        pointPositions[i * offsetPosition + 3] = w;

        // velocity
        pointVelocities[i * offsetVelocity] = 0.0;
        pointVelocities[i * offsetVelocity + 1] = 0.0;
        pointVelocities[i * offsetVelocity + 2] = 0.0;
      }

      pointFeedbackPositions = new Float32Array(pointCount * 4);
      pointFeedbackVelocities = new Float32Array(pointCount * 3);

      let iPositionR = create_vbo(pointPositions);
      let iVelocityR = create_vbo(pointVelocities);
      let iPositionW = create_vbo_feedback(pointFeedbackPositions);
      let iVelocityW = create_vbo_feedback(pointFeedbackVelocities);

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
      run = true;

      let stats = new Stats();
      let container = document.getElementById('container');
      container.appendChild(stats.domElement);

      render();

      function render(){

        params = {
          color: document.getElementById('color').checked,
          pointNum: document.getElementById('point_num').value,
          birthRange: document.getElementById('birth_range').value,
          lifeStep: document.getElementById('life_step').value,
          amplitude: document.getElementById('amplitude').value
        }

        m.lookAt([0.0, 0.0, 15.0], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0], vMatrix);
        m.perspective(100, c.width / c.height, 0.01, 1000.0, pMatrix);
        m.multiply(pMatrix, vMatrix, tmpMatrix);

        stats.update();

        nowTime = (Date.now() - startTime) / 1000;

        ++count;

        pointCount = params.pointNum;
        range = params.birthRange;

        let eColor = document.getElementById('disp_color');
        let ePointNum = document.getElementById('disp_point_num');
        let eBirthRange = document.getElementById('disp_birth_range');
        let eLifeStep = document.getElementById('disp_life_step');
        let eAmplitude = document.getElementById('disp_amplitude');
        
        if (params.color) {
          eColor.innerHTML = 'HSV'; 
        } else {
          eColor.innerHTML = 'Mono'; 
        }
        ePointNum.innerHTML = String(pointCount);
        eBirthRange.innerHTML = String(params.birthRange);
        eLifeStep.innerHTML = String(params.lifeStep);
        eAmplitude.innerHTML = String(params.amplitude);

        gl.useProgram(prg);

        // uniform
        gl.uniform1f(uniLocation[0], nowTime);
        gl.uniform1f(uniLocation[1], range);
        gl.uniform1f(uniLocation[2], params.lifeStep);
        gl.uniform1f(uniLocation[3], params.amplitude);

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

        gl.drawArrays(gl.POINTS, 0, pointCount);

        gl.disable(gl.RASTERIZER_DISCARD);
        gl.endTransformFeedback();
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);

        // swap
        swapVBOs();

        // clear
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, c.width, c.height);

        gl.useProgram(fPrg);

        // bind buffer
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
        gl.uniform1i(fUniLocation[1], params.color);

        gl.drawArrays(gl.POINTS, 0, pointCount);

        gl.flush();

        if (run) {requestAnimationFrame(render);}
      }
    }
  }, false);

  // src: https://wgld.org/

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
