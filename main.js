import * as THREE from 'three';

// --- Basic Setup ---
let scene, camera, renderer, clock;
let gameState = 'loading'; // loading, ready, playing, gameOver
let score = 0;
const LANES = [-2.5, 0, 2.5];
let bearLane = 1;

// --- Game Objects ---
let bear, platform, waterfall, activeFishes = [];

// --- UI Elements ---
const scoreElement = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreElement = document.getElementById('final-score');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');

// --- Audio Context ---
let audioContext;
const audioBuffers = {};

function init() {
    // --- Renderer and Scene ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    clock = new THREE.Clock();

    const canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    // --- Camera ---
    const aspect = window.innerWidth / window.innerHeight;
    const d = 10;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    camera.position.set(10, 10, 10);
    camera.lookAt(scene.position);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 5);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    scene.add(dirLight);

    // --- Create World ---
    createWorld();
    bear = createBear();
    scene.add(bear);

    // --- Event Listeners ---
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('touchstart', handleTouchStart, { passive: false });

    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);

    setupAudio();

    gameState = 'ready';
    animate();
}

function setupAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const soundFiles = ['catch.mp3', 'fall.mp3', 'game_over.mp3'];
    soundFiles.forEach(file => {
        fetch(file)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                audioBuffers[file] = audioBuffer;
            })
            .catch(e => console.error(`Error loading sound ${file}:`, e));
    });
}

function playSound(name) {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if (audioContext && audioBuffers[name]) {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[name];
        source.connect(audioContext.destination);
        source.start(0);
    }
}


function startGame() {
    score = 0;
    bearLane = 1;
    bear.position.x = LANES[bearLane];
    bear.position.y = 4.5;
    bear.rotation.set(0, 0, 0);

    activeFishes.forEach(fishData => scene.remove(fishData.mesh));
    activeFishes = [];

    scoreElement.textContent = `Score: 0`;
    scoreElement.style.display = 'block';
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';

    gameState = 'playing';
}

function gameOver() {
    playSound('fall.mp3');
    gameState = 'gameOver';

    // After a delay, show the game over screen
    setTimeout(() => {
        playSound('game_over.mp3');
        scoreElement.style.display = 'none';
        finalScoreElement.textContent = score;
        gameOverScreen.style.display = 'flex';
    }, 1500); // 1.5 second fall animation
}

// --- Object Creation ---
function createBear() {
    const bearGroup = new THREE.Group();
    const brownMat = new THREE.MeshLambertMaterial({ color: 0x8d5524 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 1), brownMat);
    body.castShadow = true;
    bearGroup.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), brownMat);
    head.position.y = 1.6;
    head.castShadow = true;
    bearGroup.add(head);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0xc19a6b }));
    snout.position.set(0, 1.4, 0.6);
    snout.castShadow = true;
    bearGroup.add(snout);

    const earGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const leftEar = new THREE.Mesh(earGeo, brownMat);
    leftEar.position.set(-0.5, 2.3, 0);
    leftEar.castShadow = true;
    bearGroup.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, brownMat);
    rightEar.position.set(0.5, 2.3, 0);
    rightEar.castShadow = true;
    bearGroup.add(rightEar);

    bearGroup.position.set(LANES[1], 4.5, 0);
    return bearGroup;
}

function createWorld() {
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x5a8a4d });
    const ground = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), groundMat);
    ground.position.y = -10;
    ground.receiveShadow = true;
    scene.add(ground);

    const platformMat = new THREE.MeshLambertMaterial({ color: 0x966F33 });
    platform = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 5), platformMat);
    platform.position.y = 3;
    platform.receiveShadow = true;
    scene.add(platform);

    const waterfallMat = new THREE.MeshLambertMaterial({ color: 0x4682B4, opacity: 0.8, transparent: true });
    waterfall = new THREE.Group();
    for (let i = 0; i < 15; i++) {
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), waterfallMat);
        strip.position.y = 2 - i * 1;
        strip.position.z = 2.55;
        waterfall.add(strip);
    }
    scene.add(waterfall);
}

function createFish(lane) {
    const fishGroup = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 }); // Silver
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.5), bodyMat);
    body.castShadow = true;
    fishGroup.add(body);
    
    const tailMat = new THREE.MeshLambertMaterial({ color: 0xff4500 }); // OrangeRed
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), tailMat);
    tail.position.x = -0.6;
    tail.castShadow = true;
    fishGroup.add(tail);

    fishGroup.position.set(LANES[lane], -2, 0);

    const fishData = {
        mesh: fishGroup,
        lane: lane,
        velocity: new THREE.Vector3(0, 9 + Math.random() * 3, 0),
        gravity: 18
    };

    activeFishes.push(fishData);
    scene.add(fishGroup);
}

// --- Game Loop and Updates ---
let fishSpawnTimer = 0;
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Animate waterfall
    waterfall.children.forEach(strip => {
        strip.position.y -= 3 * delta;
        if (strip.position.y < -12) {
            strip.position.y += 15;
        }
    });

    if (gameState === 'playing') {
        // Spawn fish
        fishSpawnTimer -= delta;
        if (fishSpawnTimer <= 0) {
            const speedMultiplier = Math.max(0.4, 1 - score * 0.02);
            fishSpawnTimer = (Math.random() * 1.0 + 0.5) * speedMultiplier;
            createFish(Math.floor(Math.random() * LANES.length));
        }

        // Update fishes
        for (let i = activeFishes.length - 1; i >= 0; i--) {
            const fishData = activeFishes[i];
            fishData.velocity.y -= fishData.gravity * delta;
            fishData.mesh.position.y += fishData.velocity.y * delta;

            // Check for catch or miss
            if (fishData.velocity.y < 0 && fishData.mesh.position.y < 4.5) {
                 if (fishData.lane === bearLane) {
                    // Catch!
                    playSound('catch.mp3');
                    score++;
                    scoreElement.textContent = `Score: ${score}`;
                    scene.remove(fishData.mesh);
                    activeFishes.splice(i, 1);
                } else if (fishData.mesh.position.y < 3) {
                    // Miss!
                    scene.remove(fishData.mesh);
                    activeFishes.splice(i, 1);
                    gameOver();
                }
            }
        }
    } else if (gameState === 'gameOver') {
        // Bear fall animation
        bear.position.y -= 10 * delta;
        bear.rotation.z += 5 * delta;
    }

    renderer.render(scene, camera);
}

// --- Event Handlers ---
function moveBear(direction) { // -1 for left, 1 for right
    if (gameState !== 'playing') return;
    bearLane = Math.max(0, Math.min(LANES.length - 1, bearLane + direction));
    bear.position.x = LANES[bearLane];
}

function handleKeyDown(event) {
    if (event.key === 'ArrowLeft') {
        moveBear(-1);
    } else if (event.key === 'ArrowRight') {
        moveBear(1);
    }
}

function handleInteraction(x) {
    const direction = x < window.innerWidth / 2 ? -1 : 1;
    moveBear(direction);
}

function handleMouseDown(event) {
    handleInteraction(event.clientX);
}

function handleTouchStart(event) {
    event.preventDefault();
    handleInteraction(event.touches[0].clientX);
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const d = 10;
    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.top = d;
    camera.bottom = -d;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();

