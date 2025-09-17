import * as THREE from 'three';
import { TWEEN } from 'https://unpkg.com/three@0.160.0/examples/jsm/libs/tween.module.min.js';

// --- Basic Setup ---
let scene, camera, renderer, clock;
let gameState = 'loading'; // loading, ready, playing, gameOver
let score = 0;
const LANES = [-2.5, 0, 2.5];
let bearLane = 1;
const BEAR_Y_START = 1;

// --- Game Objects ---
let bear, platform, waterfall, activeFishes = [];

// --- UI Elements ---
const scoreElement = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreElement = document.getElementById('final-score');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const canvas = document.getElementById('game-canvas');

// --- Audio Context ---
let audioContext;
const audioBuffers = {};

function init() {
    // --- Renderer and Scene ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    clock = new THREE.Clock();

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    // --- Camera ---
    const aspect = window.innerWidth / window.innerHeight;
    const d = 12; // Increased distance for a wider view
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    camera.position.set(15, 12, 15);
    camera.lookAt(scene.position);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(15, 25, 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // --- Create World ---
    createWorld();
    bear = createBear();
    scene.add(bear);

    // --- Event Listeners ---
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

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
    bear.position.y = BEAR_Y_START;
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
    const darkBrownMat = new THREE.MeshLambertMaterial({ color: 0x5C4033 });
    const beigeMat = new THREE.MeshLambertMaterial({ color: 0xc19a6b });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 1), brownMat);
    body.castShadow = true;
    bearGroup.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), brownMat);
    head.position.y = 1.6;
    head.castShadow = true;
    bearGroup.add(head);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), beigeMat);
    snout.position.set(0, 1.4, 0.65);
    snout.castShadow = true;
    bearGroup.add(snout);
    
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.1), darkBrownMat);
    nose.position.set(0, 1.5, 0.88);
    nose.castShadow = true;
    bearGroup.add(nose);

    const eyeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.1);
    const leftEye = new THREE.Mesh(eyeGeo, darkBrownMat);
    leftEye.position.set(-0.3, 1.7, 0.6);
    bearGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, darkBrownMat);
    rightEye.position.set(0.3, 1.7, 0.6);
    bearGroup.add(rightEye);

    const earGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const leftEar = new THREE.Mesh(earGeo, brownMat);
    leftEar.position.set(-0.5, 2.3, 0);
    leftEar.castShadow = true;
    bearGroup.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, brownMat);
    rightEar.position.set(0.5, 2.3, 0);
    rightEar.castShadow = true;
    bearGroup.add(rightEar);

    bearGroup.position.set(LANES[1], BEAR_Y_START, 0);
    return bearGroup;
}

function createWorld() {
    // Ground
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x5a8a4d });
    const ground = new THREE.Mesh(new THREE.BoxGeometry(30, 40, 30), groundMat);
    ground.position.y = -20;
    ground.receiveShadow = true;
    scene.add(ground);

    // Log
    const logMat = new THREE.MeshLambertMaterial({ color: 0x966F33 });
    const logGeo = new THREE.CylinderGeometry(0.5, 0.5, 12, 8);
    const log = new THREE.Mesh(logGeo, logMat);
    log.rotation.z = Math.PI / 2;
    log.position.y = 0.5;
    log.receiveShadow = true;
    scene.add(log);

    // Waterfall
    const waterfallMat = new THREE.MeshLambertMaterial({ color: 0x4682B4, opacity: 0.7, transparent: true });
    const waterfallFoamMat = new THREE.MeshLambertMaterial({ color: 0xffffff, opacity: 0.8, transparent: true });
    waterfall = new THREE.Group();
    for (let i = 0; i < 30; i++) {
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), waterfallMat);
        strip.position.y = 12 - i * 1.5;
        strip.position.z = -1;
        strip.rotation.x = -0.1;
        waterfall.add(strip);
    }
     // Add some foam at the base
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(9, 3), waterfallFoamMat);
    foam.position.y = -1;
    foam.position.z = -0.5;
    foam.rotation.x = -Math.PI / 2;
    waterfall.add(foam);
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

    fishGroup.position.set(LANES[lane], -1, -0.5);

    const fishData = {
        mesh: fishGroup,
        lane: lane,
        velocity: new THREE.Vector3(0, 14 + Math.random() * 4, 0),
        gravity: 22
    };

    activeFishes.push(fishData);
    scene.add(fishGroup);
}

// --- Game Loop and Updates ---
let fishSpawnTimer = 0;
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    TWEEN.update();

    // Animate waterfall
    waterfall.children.forEach(strip => {
        strip.position.y -= 5 * delta;
        if (strip.position.y < -15) {
            strip.position.y += 45; // 30 strips * 1.5 height
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

            // Miss logic
            if (fishData.mesh.position.y < -2) { // Fish fell past the log
                scene.remove(fishData.mesh);
                activeFishes.splice(i, 1);
                gameOver();
            }
        }
    } else if (gameState === 'gameOver') {
        // Bear fall animation
        bear.position.y -= 10 * delta;
        bear.rotation.z += 5 * delta;
    }

    renderer.render(scene, camera);
}


function catchFish(fishData, index) {
    if (gameState !== 'playing') return;

    // Move bear to the correct lane
    bearLane = fishData.lane;
    new TWEEN.Tween(bear.position)
        .to({ x: LANES[bearLane] }, 100)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    // Bear catch animation
    new TWEEN.Tween(bear.position)
        .to({ z: 1 }, 150)
        .easing(TWEEN.Easing.Quadratic.Out)
        .yoyo(true)
        .repeat(1)
        .start();

    playSound('catch.mp3');
    score++;
    scoreElement.textContent = `Score: ${score}`;
    scene.remove(fishData.mesh);
    activeFishes.splice(index, 1);
}


// --- Event Handlers ---
function moveBear(direction) { // -1 for left, 1 for right
    if (gameState !== 'playing') return;
    bearLane = Math.max(0, Math.min(LANES.length - 1, bearLane + direction));
    new TWEEN.Tween(bear.position)
        .to({ x: LANES[bearLane] }, 150)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
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
    if (gameState !== 'playing') return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    
    const fishMeshes = activeFishes.map(f => f.mesh);
    const intersects = raycaster.intersectObjects(fishMeshes, true);

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object.parent; // get the fish group
        const fishIndex = activeFishes.findIndex(f => f.mesh === intersectedObject);
        if (fishIndex !== -1) {
            catchFish(activeFishes[fishIndex], fishIndex);
        }
    } else {
        // If not clicking a fish, fallback to move controls
        handleInteraction(event.clientX);
    }
}

function handleTouchStart(event) {
    event.preventDefault();
    if (gameState !== 'playing') return;

    const raycaster = new THREE.Raycaster();
    const touch = new THREE.Vector2();
    touch.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    touch.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(touch, camera);
    
    const fishMeshes = activeFishes.map(f => f.mesh);
    const intersects = raycaster.intersectObjects(fishMeshes, true);

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object.parent; // get the fish group
        const fishIndex = activeFishes.findIndex(f => f.mesh === intersectedObject);
        if (fishIndex !== -1) {
            catchFish(activeFishes[fishIndex], fishIndex);
        }
    } else {
        // If not tapping a fish, fallback to move controls
        handleInteraction(event.touches[0].clientX);
    }
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const d = 12;
    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.top = d;
    camera.bottom = -d;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();