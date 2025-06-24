import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { MHDSimulation } from './mhd.js';
import { MHDVisualization } from './mhdVisualization.js';

class MHDApp {
    constructor() {
        this.init();
        this.createScene();
        this.setupControls();
        this.animate();
    }
    
    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000011);
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(30, 20, 30);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        
        // Orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 0);
        this.scene.add(directionalLight);
        
        // Window resize handler
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    createScene() {
        // Initialize MHD simulation
        this.mhdSim = new MHDSimulation();
        
        // Create visualization
        this.mhdVis = new MHDVisualization(this.mhdSim);
        this.scene.add(this.mhdVis.group);
        
        // Add coordinate axes
        const axesHelper = new THREE.AxesHelper(10);
        this.scene.add(axesHelper);
        
        // Add grid
        const gridHelper = new THREE.GridHelper(40, 40);
        gridHelper.rotation.x = Math.PI / 2;
        this.scene.add(gridHelper);
        
        // Time control
        this.clock = new THREE.Clock();
        this.simulationTime = 0;
        this.timeStep = 0.01;  // seconds
        this.isPaused = false;
    }
    
    setupControls() {
        const gui = document.createElement('div');
        gui.style.position = 'absolute';
        gui.style.top = '10px';
        gui.style.right = '10px';
        gui.style.background = 'rgba(0, 0, 0, 0.8)';
        gui.style.color = 'white';
        gui.style.padding = '15px';
        gui.style.borderRadius = '5px';
        gui.style.fontFamily = 'Arial';
        gui.innerHTML = `
            <h3>MHD Simulation Controls</h3>
            <div>
                <label>
                    <input type="checkbox" id="showFieldLines" checked> Field Lines
                </label>
            </div>
            <div>
                <label>
                    <input type="checkbox" id="showStreamlines" checked> Streamlines
                </label>
            </div>
            <div>
                <label>
                    <input type="checkbox" id="showPressure" checked> Pressure
                </label>
            </div>
            <div>
                <label>
                    <input type="checkbox" id="showMagnetopause" checked> Magnetopause
                </label>
            </div>
            <div style="margin-top: 10px;">
                <button id="pauseBtn">Pause</button>
                <button id="resetBtn">Reset</button>
            </div>
            <div style="margin-top: 10px;">
                <label>Solar Wind Speed: <span id="swSpeed">400</span> km/s</label>
                <input type="range" id="swSpeedSlider" min="200" max="800" value="400" style="width: 100%;">
            </div>
            <div>
                <label>Solar Wind Density: <span id="swDensity">5</span> /cm³</label>
                <input type="range" id="swDensitySlider" min="1" max="20" value="5" style="width: 100%;">
            </div>
            <div style="margin-top: 10px;">
                <h4>Grid Resolution</h4>
                <label>Grid Size: <span id="gridSize">32×16×16</span></label>
                <select id="gridSizeSelect" style="width: 100%; margin-top: 5px;">
                    <option value="16,8,8">16×8×8 (Fast)</option>
                    <option value="32,16,16" selected>32×16×16 (Medium)</option>
                    <option value="64,32,32">64×32×32 (High)</option>
                    <option value="128,64,64">128×64×64 (Very High)</option>
                </select>
                <button id="applyGridSize" style="margin-top: 5px; width: 100%;">Apply & Restart</button>
            </div>
            <div style="margin-top: 10px; font-size: 12px;">
                <div>Simulation Time: <span id="simTime">0.0</span> s</div>
                <div>Magnetopause: <span id="mpDist">0.0</span> R<sub>E</sub></div>
                <div>Grid Points: <span id="totalGridPoints">8192</span></div>
            </div>
        `;
        document.body.appendChild(gui);
        
        // Event listeners
        document.getElementById('showFieldLines').addEventListener('change', (e) => {
            this.mhdVis.showFieldLines(e.target.checked);
        });
        
        document.getElementById('showStreamlines').addEventListener('change', (e) => {
            this.mhdVis.showStreamlines(e.target.checked);
        });
        
        document.getElementById('showPressure').addEventListener('change', (e) => {
            this.mhdVis.showPressure(e.target.checked);
        });
        
        document.getElementById('showMagnetopause').addEventListener('change', (e) => {
            this.mhdVis.showMagnetopause(e.target.checked);
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            document.getElementById('pauseBtn').textContent = this.isPaused ? 'Resume' : 'Pause';
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.mhdSim.setInitialConditions();
            this.simulationTime = 0;
            this.updateVisualization();
        });
        
        document.getElementById('swSpeedSlider').addEventListener('input', (e) => {
            this.mhdSim.swVelocity = parseFloat(e.target.value) * 1000;
            document.getElementById('swSpeed').textContent = e.target.value;
        });
        
        document.getElementById('swDensitySlider').addEventListener('input', (e) => {
            this.mhdSim.swDensity = parseFloat(e.target.value) * 1e6;
            document.getElementById('swDensity').textContent = e.target.value;
        });
        
        document.getElementById('gridSizeSelect').addEventListener('change', (e) => {
            const [nx, ny, nz] = e.target.value.split(',').map(Number);
            document.getElementById('gridSize').textContent = `${nx}×${ny}×${nz}`;
            document.getElementById('totalGridPoints').textContent = (nx * ny * nz).toLocaleString();
        });
        
        document.getElementById('applyGridSize').addEventListener('click', () => {
            const [nx, ny, nz] = document.getElementById('gridSizeSelect').value.split(',').map(Number);
            
            // Show loading message
            const btn = document.getElementById('applyGridSize');
            btn.textContent = 'Restarting...';
            btn.disabled = true;
            
            // Apply new grid size
            setTimeout(() => {
                this.mhdSim.nx = nx;
                this.mhdSim.ny = ny;
                this.mhdSim.nz = nz;
                this.mhdSim.dx = (this.mhdSim.xmax - this.mhdSim.xmin) / (nx - 1);
                this.mhdSim.dy = (this.mhdSim.ymax - this.mhdSim.ymin) / (ny - 1);
                this.mhdSim.dz = (this.mhdSim.zmax - this.mhdSim.zmin) / (nz - 1);
                
                // Reinitialize fields with new grid
                this.mhdSim.initializeFields();
                this.simulationTime = 0;
                
                // Update visualization
                this.updateVisualization();
                
                // Reset button
                btn.textContent = 'Apply & Restart';
                btn.disabled = false;
            }, 100);
        });
        
        // Update initial grid point count
        document.getElementById('totalGridPoints').textContent = 
            (this.mhdSim.nx * this.mhdSim.ny * this.mhdSim.nz).toLocaleString();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        // Run simulation
        if (!this.isPaused) {
            // Run multiple substeps for stability
            const substeps = 10;
            const dt = this.timeStep / substeps;
            
            for (let i = 0; i < substeps; i++) {
                this.mhdSim.step(dt);
            }
            
            this.simulationTime += this.timeStep;
            
            // Update visualization every few time steps
            if (Math.floor(this.simulationTime * 10) % 5 === 0) {
                this.updateVisualization();
            }
            
            // Update UI
            document.getElementById('simTime').textContent = this.simulationTime.toFixed(1);
            const mpDist = this.mhdSim.calculateMagnetopause() / this.mhdSim.earthRadius;
            document.getElementById('mpDist').textContent = mpDist.toFixed(1);
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    updateVisualization() {
        // Recreate visualization with current field data
        this.scene.remove(this.mhdVis.group);
        this.mhdVis = new MHDVisualization(this.mhdSim);
        this.scene.add(this.mhdVis.group);
        
        // Restore visibility settings
        this.mhdVis.showFieldLines(document.getElementById('showFieldLines').checked);
        this.mhdVis.showStreamlines(document.getElementById('showStreamlines').checked);
        this.mhdVis.showPressure(document.getElementById('showPressure').checked);
        this.mhdVis.showMagnetopause(document.getElementById('showMagnetopause').checked);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Start the app when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Starting MHD simulation...');
        new MHDApp();
    } catch (error) {
        console.error('Error starting MHD simulation:', error);
        document.body.innerHTML += `<div style="color: red; padding: 20px;">Error: ${error.message}</div>`;
    }
});