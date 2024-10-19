//preparación de variables globales para generar shaders, buffers, y estrellas
var gl, program;
var starCount = 500;
//arrays para guardar los origenes de las estrellas, brillo, tamaño...
var starVertices = [], starBrightness = [], starTargetBrightness = [], starSizes = [];
var shootingStars = [], shootingStarFrequency = 1000, lastShootingStarTime = 0;

//inicializar contexto webgl
function getWebGLContext() {
    var canvas = document.getElementById("myCanvas");
    return canvas.getContext("webgl2") || console.error("WebGL no disponible");
}

//inicializar shaders
function initShaders() {
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, document.getElementById("myVertexShader").text);
    gl.compileShader(vertexShader);

    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, document.getElementById("myFragmentShader").text);
    gl.compileShader(fragmentShader);

    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);
}

//generar distribución aleatoria de estrellas
function getRandomStarSize() {
    const minSize = 0.01, maxSize = 2.0;
    return Math.pow(Math.random(), 1.5) * (maxSize - minSize) + minSize;
}

//generar estrellas con tamaño, posición y brillo aleatorios
function generateStars(count) {
    starVertices = [], starBrightness = [], starTargetBrightness = [], starSizes = [];
    for (let i = 0; i < count; i++) {
        const x = (Math.random() * 2) - 1, y = (Math.random() * 2) - 1;
        starVertices.push(x, y);

        const brightness = Math.random() * 0.5 + 0.5; //brillo aleatorio entre 0.5 y 1
        starBrightness.push(brightness);
        starTargetBrightness.push(brightness);

        starSizes.push(getRandomStarSize());
    }
}

//inicializar buffers para las estrellas
function initBuffers() {
    const starBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starVertices), gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const sizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starSizes), gl.STATIC_DRAW);
    
    const sizeLocation = gl.getAttribLocation(program, "a_size");
    gl.enableVertexAttribArray(sizeLocation);
    gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 0, 0);
}

//crear estrella fugaz: generar posición, dirección, duración y longitud de estela aleatorios
function createShootingStar() {
    const x = (Math.random() * 2) - 1, y = (Math.random() * 2) - 1;
    const directionX = (Math.random() * 2 - 1) * 0.02;
    const directionY = (Math.random() * 2 - 1) * 0.02;
    const duration = Math.random() * 60 + 60;
    const trailLength = Math.random() * 0.3 + 0.05;  
    shootingStars.push({ x, y, directionX, directionY, duration, frames: 0, trailLength });
}

//actualizar la posición de las estrellas fugaces según la dirección y la duración de la estrella
function updateShootingStars() {
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const star = shootingStars[i];
        star.x += star.directionX;
        star.y += star.directionY;
        star.frames++;

        if (star.frames > star.duration) shootingStars.splice(i, 1);
    }
}

//efecto de parpadeo de las estrellas 
function updateStarBrightness() {
    for (let i = 0; i < starCount; i++) {
        starBrightness[i] += (starTargetBrightness[i] - starBrightness[i]) * 0.02;
        if (Math.random() < 0.01) starTargetBrightness[i] = Math.random() * 0.5 + 0.5;
    }
}

//efecto de movimiento de las estrellas: velocidad varía según el tamaño de la estrella para simular proximidad
function updateStarPositions() {
    for (let i = 0; i < starCount; i++) {
        const speed = starSizes[i] * 0.00015;
        starVertices[i * 2] += speed;
        starVertices[i * 2 + 1] += speed * 0.5;
        
        if (starVertices[i * 2] > 1) starVertices[i * 2] = -1;
        if (starVertices[i * 2 + 1] > 1) starVertices[i * 2 + 1] = -1;
    }

    const starBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starVertices), gl.STATIC_DRAW);
}

//dibujar estrellas y estrellas fugaces
function drawStars() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    updateStarBrightness();
    updateStarPositions();

    for (let i = 0; i < starCount; i++) {
        gl.uniform1f(gl.getUniformLocation(program, "u_brightness"), starBrightness[i]);
        gl.drawArrays(gl.POINTS, i, 1);
    }

    drawShootingStars();
}

//dibujar estrellas fugaces: estela va disminuyendo en tamaño y brillo según disminuye la duración de la estrella fugaz
function drawShootingStars() {
    for (const star of shootingStars) {
        gl.uniform1f(gl.getUniformLocation(program, "u_brightness"), 1.0);

        //tamaño de las estrellas fugaces mayor que el de las estrellas normales para que destaquen
        gl.vertexAttrib1f(gl.getAttribLocation(program, "a_size"), 5.0); 

        gl.vertexAttribPointer(gl.getAttribLocation(program, "a_position"), 2, gl.FLOAT, false, 0, 0);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([star.x, star.y]), gl.STATIC_DRAW);
        gl.drawArrays(gl.POINTS, 0, 1);

        //efecto de estela
        let trailBrightness = 0.8; 
        let trailX = star.x;
        let trailY = star.y;
        const trailLength = star.trailLength;

        for (let j = 0; j < 5; j++) {
            trailX -= star.directionX * trailLength; 
            trailY -= star.directionY * trailLength;
            trailBrightness -= 0.15; 

            gl.uniform1f(gl.getUniformLocation(program, "u_brightness"), trailBrightness);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([trailX, trailY]), gl.STATIC_DRAW);
            gl.drawArrays(gl.POINTS, 0, 1);
        }
    }
}

//renderizado de la escena: tiene en cuenta la frecuencia a la que debe generar estrellas fugaces
function drawScene(currentTime) {
    if (currentTime - lastShootingStarTime > (2000 - shootingStarFrequency)) {
        createShootingStar();
        lastShootingStarTime = currentTime;
    }

    updateShootingStars();
    drawStars();
    requestAnimationFrame(drawScene);
}

//actualiza la cantidad de estrellas en el canvas según el valor del slider
function updateStarCount() {
    starCount = parseInt(document.getElementById('starCount').value);
    generateStars(starCount);
    initBuffers();
}

//actualiza la frencuencia a la que aparecen estrellas fugaces según el valor del slider
function updateShootingStarFrequency() {
    shootingStarFrequency = parseInt(document.getElementById('shootingStarFreq').value);
}

//inicializar webgl
function initWebGL() {
    gl = getWebGLContext();
    if (!gl) return;

    initShaders();
    updateStarCount();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    document.getElementById('starCount').addEventListener('input', updateStarCount);
    document.getElementById('shootingStarFreq').addEventListener('input', updateShootingStarFrequency);

    requestAnimationFrame(drawScene);
}

//ajustar tamaño del canvas según el tamaño de la ventana
function resizeCanvas() {
    const canvas = document.getElementById("myCanvas");
    const size = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8);
    canvas.width = size;
    canvas.height = size;
}


resizeCanvas();
initWebGL();
