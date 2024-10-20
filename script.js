//preparación de variables globales para generar shaders, buffers, y estrellas
var gl, program;
var starCount = 500;
//arrays para guardar los origenes de las estrellas, brillo, tamaño...
var starVertices = [], starBrightness = [], starTargetBrightness = [], starSizes = [], starAngles = [], initialStarVertices = [];
var shootingStars = [], shootingStarFrequency = 1000, lastShootingStarTime = 0;

//variables para generar el planeta en el centro del canvas y sus anillos
var planet = { x: 0, y: 0, size: 0.02 }; 
var planetColor;
var ringCount = 3; 
var ringSegments = 100; 
var ringRadius = [0.1, 0.15, 0.20]; 
var ringVertices = [];
var ringRotationAngle = 0.0;

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

//generar planeta
function generatePlanet() {
    planet.x = 0; 
    planet.y = 0; 
}

//generar puntos a lo largo de la trayectoria del anillo
function generateRings() {
    ringVertices = []; 

    for (let i = 0; i < ringCount; i++) {
        let radiusX = ringRadius[i]; // Different x-radius
        let radiusY = ringRadius[i] * (Math.random() * 0.5 + 0.5); // Random y-radius to create the elliptical shape
        let tiltAngle = (Math.random() * 2 * Math.PI);  // Random tilt for each ring

        for (let j = 0; j < ringSegments; j++) {
            let angle = (j / ringSegments) * Math.PI * 2;
            let x = radiusX * Math.cos(angle);
            let y = radiusY * Math.sin(angle);

            // Apply elliptical transformation (skew) to simulate different tilts
            let skewX = x * Math.cos(tiltAngle) - y * Math.sin(tiltAngle);
            let skewY = x * Math.sin(tiltAngle) + y * Math.cos(tiltAngle);

            ringVertices.push(skewX, skewY);
        }
    }
}

//generar distribución aleatoria de estrellas
function getRandomStarSize() {
    const minSize = 0.01, maxSize = 2.0;
    return Math.pow(Math.random(), 1.5) * (maxSize - minSize) + minSize;
}

//generar estrellas con tamaño, posición y brillo aleatorios
function generateStars(count) {
    //inicialización de arrays para la generación de estrellas
    starVertices = [], initialStarVertices = [], starBrightness = [], starTargetBrightness = [], starSizes = [], starAngles=[];

    //bucle para cada estrella según la cantidad de estrellas del slider
    for (let i = 0; i < count; i++) {
        const x = (Math.random() * 2) - 1;
        const y = (Math.random() * 2) - 1;;

        starVertices.push(x, y);
        initialStarVertices.push(x, y);

        const brightness = Math.random() * 0.5 + 0.5; //brillo aleatorio entre 0.5 y 1
        starBrightness.push(brightness);
        starTargetBrightness.push(brightness);

        starSizes.push(getRandomStarSize());
        starAngles.push(Math.random() * Math.PI * 2); //angulo inicial de rotación aleatorio
    }
}

var starBuffer, sizeBuffer;
//inicializar buffers y atributos para las estrellas
function initStarBuffers() {
    starBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starVertices), gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    sizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starSizes), gl.STATIC_DRAW);
    
    const sizeLocation = gl.getAttribLocation(program, "a_size");
    gl.enableVertexAttribArray(sizeLocation);
    gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 0, 0);
}

var planetBuffer;
//inicializar buffer y atributos del planeta
function initPlanetBuffer() {
    const planetSegments = 50; // More segments for a smoother circle
    const planetVertices = [];

    // Create vertices for a circle using TRIANGLE_FAN
    for (let i = 0; i <= planetSegments; i++) {
        const angle = (i / planetSegments) * Math.PI * 2;
        const x = planet.size * Math.cos(angle);
        const y = planet.size * Math.sin(angle);
        planetVertices.push(x, y);
    }

    planetBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, planetBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(planetVertices), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
}

var ringBuffer;
//inicializar buffer y atributos para anillos
function initRingBuffers() {
    ringBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ringBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ringVertices), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
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
    //constantes para trayectoria de curva
    const rotationSpeed = 0.0008;

    for (let i = 0; i < starCount; i++) {
        starAngles[i] += rotationSpeed; //simular rotación para las estrellas

        //posiciones iniciales de cada estrella
        const originalX = initialStarVertices[i * 2];
        const originalY = initialStarVertices[i * 2 + 1];

        //aplicar matriz de rotación a coords
        const cosAngle = Math.cos(starAngles[i]);
        const sinAngle = Math.sin(starAngles[i]);

        //nuevas posiciones rotadas
        const x = originalX * cosAngle - originalY * sinAngle;
        const y = originalX * sinAngle + originalY * cosAngle;
        
        //actualizar la posición actual
        starVertices[i * 2] = x;
        starVertices[i * 2 + 1] = y;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starVertices), gl.STATIC_DRAW);
}

//dibujar estrellas y estrellas fugaces
function drawStars() {
    const isPlanetLocation = gl.getUniformLocation(program, "u_isPlanet");
    gl.uniform1i(isPlanetLocation, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    const sizeLocation = gl.getAttribLocation(program, "a_size");
    gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 0, 0);

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

//generar color de planeta aleatorio, entre 0.5 y 1.0 para mantener el contraste con el fondo
function getRandomColor() {
    const r = 0.5 + Math.random() * 0.5;
    const g = 0.5 + Math.random() * 0.5;
    const b = 0.5 + Math.random() * 0.5;
    return [r, g, b];
}

//dibujar planeta
function drawPlanet() {
    gl.bindBuffer(gl.ARRAY_BUFFER, planetBuffer);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Set uniform for planet color and specify that we are drawing the planet
    const planetColorLocation = gl.getUniformLocation(program, "u_planetColor");
    const isPlanetLocation = gl.getUniformLocation(program, "u_isPlanet");

    gl.uniform3fv(planetColorLocation, planetColor); // Set planet color
    gl.uniform1i(isPlanetLocation, 1); // Indicate we are drawing the planet

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 51);
}


//dibujar anillos
function drawRings() {
    // Update the rotation angle (speed can be adjusted)
    ringRotationAngle += 0.005;

    // Apply rotation matrix to ring vertices
    const cosAngle = Math.cos(ringRotationAngle);
    const sinAngle = Math.sin(ringRotationAngle);

    let rotatedRingVertices = [];
    for (let i = 0; i < ringVertices.length; i += 2) {
        let x = ringVertices[i];
        let y = ringVertices[i + 1];

        // Rotate the vertices
        let rotatedX = x * cosAngle - y * sinAngle;
        let rotatedY = x * sinAngle + y * cosAngle;

        rotatedRingVertices.push(rotatedX, rotatedY);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, ringBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rotatedRingVertices), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Draw each ring
    for (let i = 0; i < ringCount; i++) {
        gl.uniform1f(gl.getUniformLocation(program, "u_brightness"), 0.8);
        gl.drawArrays(gl.LINE_LOOP, i * ringSegments, ringSegments);
    }
}

//renderizado de la escena: tiene en cuenta la frecuencia a la que debe generar estrellas fugaces
function drawScene(currentTime) {
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (currentTime - lastShootingStarTime > (2000 - shootingStarFrequency)) {
        createShootingStar();
        lastShootingStarTime = currentTime;
    }

    updateShootingStars();

    drawStars();
    drawPlanet();  
    drawRings();

    requestAnimationFrame(drawScene);
}

//actualiza la cantidad de estrellas en el canvas según el valor del slider
function updateStarCount() {
    starCount = parseInt(document.getElementById('starCount').value);
    generateStars(starCount);
    initStarBuffers();
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
    generatePlanet();
    generateRings();

    initStarBuffers();
    initPlanetBuffer();
    initRingBuffers();

    planetColor = getRandomColor();
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
