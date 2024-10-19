// WebGL starfield simulation with smooth twinkling, shooting stars, and parallax effect
var gl, program;
var starCount = 500;
var starVertices = [], starBrightness = [], starTargetBrightness = [], starSizes = [];
var shootingStars = [], shootingStarFrequency = 1000, lastShootingStarTime = 0;

// Initialize WebGL context
function getWebGLContext() {
    var canvas = document.getElementById("myCanvas");
    return canvas.getContext("webgl2") || console.error("WebGL not available");
}

// Initialize shaders
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

// Generate random star size with exponential distribution
function getRandomStarSize() {
    const minSize = 0.01, maxSize = 2.0;
    return Math.pow(Math.random(), 1.5) * (maxSize - minSize) + minSize;
}

// Generate stars with random position, brightness, and size
function generateStars(count) {
    starVertices = [], starBrightness = [], starTargetBrightness = [], starSizes = [];
    for (let i = 0; i < count; i++) {
        const x = (Math.random() * 2) - 1, y = (Math.random() * 2) - 1;
        starVertices.push(x, y);

        const brightness = Math.random() * 0.5 + 0.5;
        starBrightness.push(brightness);
        starTargetBrightness.push(brightness);

        starSizes.push(getRandomStarSize());
    }
}

// Initialize buffers for stars
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

// Create a new shooting star
function createShootingStar() {
    const x = (Math.random() * 2) - 1, y = (Math.random() * 2) - 1;
    const directionX = (Math.random() * 2 - 1) * 0.02;
    const directionY = (Math.random() * 2 - 1) * 0.02;
    const duration = Math.random() * 60 + 60;
    const trailLength = Math.random() * 0.1 + 0.05;  // Trail length factor
    shootingStars.push({ x, y, directionX, directionY, duration, frames: 0, trailLength });
}

// Update positions of shooting stars
function updateShootingStars() {
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const star = shootingStars[i];
        star.x += star.directionX;
        star.y += star.directionY;
        star.frames++;

        if (star.frames > star.duration) shootingStars.splice(i, 1);
    }
}

// Smooth twinkling by adjusting brightness towards target
function updateStarBrightness() {
    for (let i = 0; i < starCount; i++) {
        starBrightness[i] += (starTargetBrightness[i] - starBrightness[i]) * 0.02;
        if (Math.random() < 0.01) starTargetBrightness[i] = Math.random() * 0.5 + 0.5;
    }
}

// Update star positions for parallax effect
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

// Draw stars with smooth twinkling and shooting stars with trails
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

// Draw shooting stars and their trails with fading
function drawShootingStars() {
    for (const star of shootingStars) {
        gl.uniform1f(gl.getUniformLocation(program, "u_brightness"), 1.0);

        // Set a larger size for the shooting star
        gl.vertexAttrib1f(gl.getAttribLocation(program, "a_size"), 5.0); // Make shooting stars larger

        // Draw the shooting star
        gl.vertexAttribPointer(gl.getAttribLocation(program, "a_position"), 2, gl.FLOAT, false, 0, 0);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([star.x, star.y]), gl.STATIC_DRAW);
        gl.drawArrays(gl.POINTS, 0, 1);

        // Draw the trail with a fading effect
        let trailBrightness = 0.8; // Start the trail bright
        let trailX = star.x;
        let trailY = star.y;
        const trailLength = star.trailLength;

        // Draw multiple trail segments with decreasing brightness
        for (let j = 0; j < 5; j++) {
            trailX -= star.directionX * trailLength; // Adjust for trail length
            trailY -= star.directionY * trailLength;
            trailBrightness -= 0.15; // Gradually reduce brightness

            gl.uniform1f(gl.getUniformLocation(program, "u_brightness"), trailBrightness);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([trailX, trailY]), gl.STATIC_DRAW);
            gl.drawArrays(gl.POINTS, 0, 1);
        }
    }
}

// Main render loop
function drawScene(currentTime) {
    if (currentTime - lastShootingStarTime > (2000 - shootingStarFrequency)) {
        createShootingStar();
        lastShootingStarTime = currentTime;
    }

    updateShootingStars();
    drawStars();
    requestAnimationFrame(drawScene);
}

// Update star count based on slider
function updateStarCount() {
    starCount = parseInt(document.getElementById('starCount').value);
    generateStars(starCount);
    initBuffers();
}

// Update shooting star frequency based on slider
function updateShootingStarFrequency() {
    shootingStarFrequency = parseInt(document.getElementById('shootingStarFreq').value);
}

// Initialize WebGL
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

// Set canvas size based on viewport dimensions
function resizeCanvas() {
    const canvas = document.getElementById("myCanvas");
    const size = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8);
    canvas.width = size;
    canvas.height = size;
}

resizeCanvas();

initWebGL();