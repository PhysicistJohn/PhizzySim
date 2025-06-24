import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EarthPhysics } from './physics.js';
import { createEarth, createMoon, createSun, createStars } from './celestialBodies.js';
import { createAtmosphere } from './atmosphere.js';
import { MagnetospherePhysics, createMagnetosphereVisualization, createSunFieldLines, createInterplanetaryField } from './magnetosphere.js';
import { VanAllenBelts, createRadiationBeltVisualization, createAuroraVisualization } from './radiationBelts.js';

class EarthSimulation {
    constructor() {
        this.visualScale = 1; // Scale factor for visualization (1 = physically accurate)
        
        this.physics = new EarthPhysics();
        this.magnetosphere = new MagnetospherePhysics();
        this.radiationBelts = new VanAllenBelts();
        this.timeMultiplier = 1;
        this.isPaused = false;
        this.clock = new THREE.Clock();
        
        this.showMagnetosphere = true;
        this.showSolarWind = true;
        this.showRadiationBelts = true;
        this.showAurora = true;
        this.showFieldLines = true;
        
        this.init();
        this.createScene();
        this.setupControls();
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000000, 1e10, 1e12);
        
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 1e5, 1e12);
        // Start very zoomed out to see everything
        this.camera.position.set(0, 0, 5e11);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 1e6;
        this.controls.maxDistance = 1e12;  // Allow zooming out to see full solar system
        
        const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
        this.scene.add(ambientLight);
        
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createScene() {
        this.stars = createStars();
        this.scene.add(this.stars);
        
        this.sun = createSun();
        this.scene.add(this.sun);
        
        this.sunFieldLines = createSunFieldLines();
        this.sun.add(this.sunFieldLines);
        
        const sunLight = new THREE.PointLight(0xffffff, 2, 0);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 1e9;
        sunLight.shadow.camera.far = 1e12;
        this.sun.add(sunLight);
        
        this.earthGroup = new THREE.Group();
        this.scene.add(this.earthGroup);
        
        this.earth = createEarth();
        this.earthGroup.add(this.earth);
        
        this.atmosphere = createAtmosphere();
        this.earthGroup.add(this.atmosphere);
        
        this.moon = createMoon();
        this.scene.add(this.moon);
        
        this.clouds = this.createClouds();
        this.earthGroup.add(this.clouds);
        
        this.magnetosphereGroup = createMagnetosphereVisualization(this.magnetosphere);
        this.scene.add(this.magnetosphereGroup);
        
        this.radiationBeltGroup = createRadiationBeltVisualization(this.radiationBelts);
        this.earthGroup.add(this.radiationBeltGroup);
        
        this.auroraGroup = createAuroraVisualization(this.radiationBelts);
        this.earthGroup.add(this.auroraGroup);
        
        this.interplanetaryField = createInterplanetaryField();
        this.scene.add(this.interplanetaryField);
    }

    createClouds() {
        const geometry = new THREE.SphereGeometry(6.371e6 * 1.01, 64, 64);
        const material = new THREE.MeshPhongMaterial({
            map: this.createCloudTexture(),
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        return new THREE.Mesh(geometry, material);
    }

    createCloudTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 50 + 10;
            const opacity = Math.random() * 0.5;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    setupControls() {
        document.getElementById('timeSpeed').addEventListener('input', (e) => {
            this.timeMultiplier = parseFloat(e.target.value);
            document.getElementById('speedLabel').textContent = `${this.timeMultiplier}x`;
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            document.getElementById('pauseBtn').textContent = this.isPaused ? 'Resume' : 'Pause';
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.physics.time = 0;
            this.timeMultiplier = 1;
            document.getElementById('timeSpeed').value = 1;
            document.getElementById('speedLabel').textContent = '1x';
        });
        
        document.getElementById('viewEarth').addEventListener('click', () => {
            const earthPos = this.earthGroup.position;
            this.camera.position.set(earthPos.x, earthPos.y, earthPos.z + 3e7);
            this.controls.target.copy(this.earthGroup.position);
        });
        
        document.getElementById('viewOrbit').addEventListener('click', () => {
            // View from above the solar system
            this.camera.position.set(0, 5e11, 0);
            this.controls.target.set(0, 0, 0);
        });
        
        document.getElementById('viewEarthSun').addEventListener('click', () => {
            // Position camera to see Earth-Sun relationship
            const earthPos = this.physics.getEarthPosition();
            
            // Camera positioned above and to side to see both Earth and Sun
            this.camera.position.set(
                0,  // Center x
                2e11,  // High above orbital plane
                1e11   // Offset in z
            );
            
            // Look at center of solar system
            this.controls.target.set(0, 0, 0);
        });
        
        document.getElementById('showMagnetosphere').addEventListener('change', (e) => {
            this.showMagnetosphere = e.target.checked;
            this.magnetosphereGroup.visible = this.showMagnetosphere;
        });
        
        document.getElementById('showSolarWind').addEventListener('change', (e) => {
            this.showSolarWind = e.target.checked;
        });
        
        document.getElementById('showRadiationBelts').addEventListener('change', (e) => {
            this.showRadiationBelts = e.target.checked;
            this.radiationBeltGroup.visible = this.showRadiationBelts;
        });
        
        document.getElementById('showAurora').addEventListener('change', (e) => {
            this.showAurora = e.target.checked;
            this.auroraGroup.visible = this.showAurora;
        });
        
        document.getElementById('showFieldLines').addEventListener('change', (e) => {
            this.showFieldLines = e.target.checked;
            this.sunFieldLines.visible = this.showFieldLines;
            this.interplanetaryField.visible = this.showFieldLines;
            
            // Toggle Earth field lines visibility in magnetosphere group
            if (this.magnetosphereGroup.children) {
                this.magnetosphereGroup.children.forEach(child => {
                    if (child.userData && child.userData.isFieldLine) {
                        child.visible = this.showFieldLines;
                    }
                });
            }
        });
        
        document.getElementById('windSpeed').addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value) * 1000; // Convert to m/s
            this.magnetosphere.solarWindVelocity = speed;
            document.getElementById('windSpeedLabel').textContent = e.target.value;
        });
        
        document.getElementById('windDensity').addEventListener('input', (e) => {
            const density = parseFloat(e.target.value) * 1e6; // Convert to particles/m³
            this.magnetosphere.solarWindDensity = density;
            document.getElementById('windDensityLabel').textContent = e.target.value;
        });
        
        document.getElementById('windTemp').addEventListener('input', (e) => {
            this.magnetosphere.solarWindTemperature = parseFloat(e.target.value);
            document.getElementById('tempLabel').textContent = e.target.value;
        });
        
        document.getElementById('windBField').addEventListener('input', (e) => {
            this.magnetosphere.solarWindMagneticField = parseFloat(e.target.value) * 1e-9; // Convert to Tesla
            document.getElementById('bFieldLabel').textContent = e.target.value;
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.isPaused) {
            const deltaTime = this.clock.getDelta();
            this.physics.updateTime(deltaTime * 3600, this.timeMultiplier);
            
            const earthRotation = this.physics.getEarthRotation();
            this.earth.rotation.y = earthRotation;
            this.clouds.rotation.y = earthRotation * 1.1;
            
            const earthPos = this.physics.getEarthPosition();
            this.earthGroup.position.set(earthPos.x / 1e6 * this.visualScale, earthPos.y / 1e6 * this.visualScale, earthPos.z / 1e6 * this.visualScale);
            
            this.earthGroup.rotation.z = this.physics.axialTilt;
            
            const moonPos = this.physics.getMoonPosition(earthPos);
            this.moon.position.set(moonPos.x / 1e6 * this.visualScale, moonPos.y / 1e6 * this.visualScale, moonPos.z / 1e6 * this.visualScale);
            
            // Update magnetosphere
            this.magnetosphere.updateParticles(deltaTime * this.timeMultiplier);
            if (this.magnetosphereGroup.userData.updateParticles) {
                this.magnetosphereGroup.userData.updateParticles(this.magnetosphere);
            }
            
            // Update aurora animation
            if (this.auroraGroup.userData.animate) {
                this.auroraGroup.userData.animate(this.physics.time);
            }
            
            this.updateInfo();
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    updateInfo() {
        const day = Math.floor(this.physics.time / this.physics.rotationPeriod);
        const hours = Math.floor((this.physics.time % this.physics.rotationPeriod) / 3600);
        const minutes = Math.floor((this.physics.time % 3600) / 60);
        
        document.getElementById('day').textContent = day;
        document.getElementById('time').textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        document.getElementById('season').textContent = this.physics.getSeason();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

new EarthSimulation();