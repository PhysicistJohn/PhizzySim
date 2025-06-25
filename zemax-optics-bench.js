/**
 * Professional Optics Bench Application
 * Zemax-level accuracy using Maxwell's equations
 */

class ZemaxOpticsBench {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.rayCanvas = document.getElementById('rayDiagram');
        this.rayCtx = this.rayCanvas.getContext('2d');
        
        // Physics engine
        this.physics = new MaxwellOpticsEngine();
        
        // Optical system
        this.components = [];
        this.sources = [];
        this.rays = [];
        
        // UI state
        this.mode = 'laser';
        this.selectedComponent = null;
        this.isDragging = false;
        this.isRotating = false;
        this.mousePos = { x: 0, y: 0 };
        this.dragOffset = { x: 0, y: 0 };
        
        // Simulation parameters
        this.wavelength = 532; // nm (green laser default)
        this.rayDensity = 10;
        this.currentMaterial = 'BK7';
        
        // Display settings
        this.scale = 1; // mm per pixel
        this.gridSize = 50; // pixels
        
        this.setupCanvas();
        this.setupControls();
        this.setupEventListeners();
        this.animate();
    }
    
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Set optical axis at center
        this.opticalAxis = {
            y: this.canvas.height / 2,
            x: 0,
            length: this.canvas.width
        };
    }
    
    setupControls() {
        // Light source buttons
        document.getElementById('addLaser').onclick = () => this.setMode('laser');
        document.getElementById('addPointSource').onclick = () => this.setMode('pointSource');
        document.getElementById('addCollimated').onclick = () => this.setMode('collimated');
        document.getElementById('addGaussian').onclick = () => this.setMode('gaussian');
        
        // Optical element buttons
        document.getElementById('addMirror').onclick = () => this.setMode('mirror');
        document.getElementById('addLens').onclick = () => this.setMode('lens');
        document.getElementById('addPrism').onclick = () => this.setMode('prism');
        document.getElementById('addGrating').onclick = () => this.setMode('grating');
        document.getElementById('addAperture').onclick = () => this.setMode('aperture');
        document.getElementById('addBeamSplitter').onclick = () => this.setMode('beamSplitter');
        
        // Tool buttons
        document.getElementById('selectMode').onclick = () => this.setMode('select');
        document.getElementById('moveMode').onclick = () => this.setMode('move');
        document.getElementById('rotateMode').onclick = () => this.setMode('rotate');
        document.getElementById('deleteMode').onclick = () => this.setMode('delete');
        
        // Wavelength control
        document.getElementById('wavelength').oninput = (e) => {
            this.wavelength = parseInt(e.target.value);
            document.getElementById('wavelengthValue').textContent = this.wavelength;
            this.updateWavelengthDisplay();
            this.traceRays();
        };
        
        // Ray density control
        document.getElementById('rayDensity').oninput = (e) => {
            this.rayDensity = parseInt(e.target.value);
            document.getElementById('rayDensityValue').textContent = this.rayDensity;
            this.traceRays();
        };
        
        // Material selection
        document.getElementById('materialSelect').onchange = (e) => {
            this.currentMaterial = e.target.value;
            this.updateMaterialProperties();
        };
        
        // Clear button
        document.getElementById('clearAll').onclick = () => this.clearAll();
        
        // Initialize displays
        this.updateWavelengthDisplay();
        this.updateMaterialProperties();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
    }
    
    setMode(mode) {
        this.mode = mode;
        
        // Update button states
        document.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        
        const buttonMap = {
            'laser': 'addLaser',
            'pointSource': 'addPointSource',
            'collimated': 'addCollimated',
            'gaussian': 'addGaussian',
            'mirror': 'addMirror',
            'lens': 'addLens',
            'prism': 'addPrism',
            'grating': 'addGrating',
            'aperture': 'addAperture',
            'beamSplitter': 'addBeamSplitter',
            'select': 'selectMode',
            'move': 'moveMode',
            'rotate': 'rotateMode',
            'delete': 'deleteMode'
        };
        
        if (buttonMap[mode]) {
            document.getElementById(buttonMap[mode]).classList.add('active');
        }
        
        // Update cursor
        this.updateCursor();
    }
    
    updateCursor() {
        switch (this.mode) {
            case 'move':
                this.canvas.style.cursor = 'move';
                break;
            case 'rotate':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'delete':
                this.canvas.style.cursor = 'not-allowed';
                break;
            case 'select':
                this.canvas.style.cursor = 'pointer';
                break;
            default:
                this.canvas.style.cursor = 'crosshair';
        }
    }
    
    handleClick(e) {
        if (this.isDragging || this.isRotating) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        switch (this.mode) {
            case 'delete':
                this.deleteComponentAt(x, y);
                break;
            case 'laser':
            case 'pointSource':
            case 'collimated':
            case 'gaussian':
                this.addSource(x, y, this.mode);
                break;
            case 'mirror':
            case 'lens':
            case 'prism':
            case 'grating':
            case 'aperture':
            case 'beamSplitter':
                this.addComponent(x, y, this.mode);
                break;
        }
    }
    
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.mousePos = { x, y };
        
        // Find component at position
        const component = this.getComponentAt(x, y);
        
        if (component) {
            this.selectedComponent = component;
            
            if (this.mode === 'move') {
                this.isDragging = true;
                this.dragOffset = {
                    x: x - component.position.x,
                    y: y - component.position.y
                };
                this.canvas.style.cursor = 'grabbing';
            } else if (this.mode === 'rotate') {
                this.isRotating = true;
            }
        }
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.mousePos = { x, y };
        
        if (this.isDragging && this.selectedComponent) {
            this.selectedComponent.position.x = x - this.dragOffset.x;
            this.selectedComponent.position.y = y - this.dragOffset.y;
            this.traceRays();
        } else if (this.isRotating && this.selectedComponent) {
            const dx = x - this.selectedComponent.position.x;
            const dy = y - this.selectedComponent.position.y;
            this.selectedComponent.angle = Math.atan2(dy, dx);
            this.traceRays();
        }
    }
    
    handleMouseUp(e) {
        this.isDragging = false;
        this.isRotating = false;
        
        if (this.mode === 'move') {
            this.canvas.style.cursor = 'move';
        }
    }
    
    handleWheel(e) {
        e.preventDefault();
        
        // Zoom functionality
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.scale *= zoomFactor;
        this.render();
    }
    
    addSource(x, y, type) {
        const source = {
            id: Date.now(),
            type: type,
            position: { x, y, z: 0 },
            angle: 0,
            wavelength: this.wavelength,
            power: 1.0, // Watts
            divergence: type === 'laser' ? 0.001 : 0.1, // radians
            beamDiameter: type === 'gaussian' ? 2 : 1 // mm
        };
        
        this.sources.push(source);
        this.traceRays();
    }
    
    addComponent(x, y, type) {
        const component = {
            id: Date.now(),
            type: type,
            position: { x, y, z: 0 },
            angle: 0,
            material: this.physics.materials[this.currentMaterial]
        };
        
        // Set component-specific properties
        switch (type) {
            case 'mirror':
                component.reflectivity = 0.99;
                component.size = { width: 50, height: 5 };
                break;
                
            case 'lens':
                component.focalLength = 100; // mm
                component.diameter = 50; // mm
                component.centerThickness = 5; // mm
                component.surfaces = [
                    { type: 'sphere', radius: 100, conic: 0 },
                    { type: 'sphere', radius: -100, conic: 0 }
                ];
                break;
                
            case 'prism':
                component.apexAngle = 60 * Math.PI / 180; // 60 degrees
                component.size = 40; // mm
                break;
                
            case 'grating':
                component.grooveDensity = 600; // lines/mm
                component.blazeAngle = 8.6 * Math.PI / 180; // degrees
                component.size = { width: 50, height: 50 };
                break;
                
            case 'aperture':
                component.diameter = 10; // mm
                component.shape = 'circular';
                break;
                
            case 'beamSplitter':
                component.reflectivity = 0.5;
                component.size = { width: 50, height: 50 };
                component.thickness = 5; // mm
                break;
        }
        
        this.components.push(component);
        this.traceRays();
    }
    
    getComponentAt(x, y) {
        // Check sources first
        for (const source of this.sources) {
            const dx = x - source.position.x;
            const dy = y - source.position.y;
            if (Math.sqrt(dx * dx + dy * dy) < 20) {
                return source;
            }
        }
        
        // Then check components
        for (const component of this.components) {
            const dx = x - component.position.x;
            const dy = y - component.position.y;
            if (Math.sqrt(dx * dx + dy * dy) < 30) {
                return component;
            }
        }
        
        return null;
    }
    
    deleteComponentAt(x, y) {
        const component = this.getComponentAt(x, y);
        
        if (component) {
            this.sources = this.sources.filter(s => s.id !== component.id);
            this.components = this.components.filter(c => c.id !== component.id);
            this.selectedComponent = null;
            this.traceRays();
        }
    }
    
    /**
     * Trace rays through the optical system using Maxwell physics
     */
    traceRays() {
        this.rays = [];
        
        // Create surfaces from components
        const surfaces = this.createSurfaces();
        
        // Trace rays from each source
        for (const source of this.sources) {
            const sourceRays = this.generateSourceRays(source);
            
            for (const ray of sourceRays) {
                const path = this.physics.propagateRay(ray, surfaces);
                
                if (path.length > 1) {
                    this.rays.push({
                        path: path,
                        wavelength: ray.wavelength,
                        intensity: ray.intensity,
                        polarization: ray.polarization
                    });
                }
            }
        }
        
        this.updateMeasurements();
    }
    
    createSurfaces() {
        const surfaces = [];
        
        for (const component of this.components) {
            switch (component.type) {
                case 'mirror':
                    surfaces.push({
                        type: 'plane',
                        position: component.position,
                        normal: {
                            x: -Math.sin(component.angle),
                            y: Math.cos(component.angle),
                            z: 0
                        },
                        bounds: { x: component.size.width / 2, y: component.size.height / 2 },
                        materialBefore: this.physics.materials.air,
                        materialAfter: this.physics.materials.air,
                        reflectivity: component.reflectivity
                    });
                    break;
                    
                case 'lens':
                    // Front surface
                    surfaces.push({
                        type: 'sphere',
                        center: {
                            x: component.position.x - component.centerThickness / 2,
                            y: component.position.y,
                            z: 0
                        },
                        radius: component.surfaces[0].radius,
                        materialBefore: this.physics.materials.air,
                        materialAfter: component.material
                    });
                    
                    // Back surface
                    surfaces.push({
                        type: 'sphere',
                        center: {
                            x: component.position.x + component.centerThickness / 2,
                            y: component.position.y,
                            z: 0
                        },
                        radius: component.surfaces[1].radius,
                        materialBefore: component.material,
                        materialAfter: this.physics.materials.air
                    });
                    break;
                    
                case 'prism':
                    // Three surfaces of the prism
                    const h = component.size * Math.sqrt(3) / 2;
                    
                    // Left face
                    surfaces.push({
                        type: 'plane',
                        position: {
                            x: component.position.x - component.size / 2,
                            y: component.position.y,
                            z: 0
                        },
                        normal: {
                            x: Math.cos(component.angle + Math.PI / 3),
                            y: Math.sin(component.angle + Math.PI / 3),
                            z: 0
                        },
                        materialBefore: this.physics.materials.air,
                        materialAfter: component.material
                    });
                    
                    // Right face
                    surfaces.push({
                        type: 'plane',
                        position: {
                            x: component.position.x + component.size / 2,
                            y: component.position.y,
                            z: 0
                        },
                        normal: {
                            x: Math.cos(component.angle - Math.PI / 3),
                            y: Math.sin(component.angle - Math.PI / 3),
                            z: 0
                        },
                        materialBefore: component.material,
                        materialAfter: this.physics.materials.air
                    });
                    
                    // Bottom face
                    surfaces.push({
                        type: 'plane',
                        position: component.position,
                        normal: {
                            x: -Math.sin(component.angle),
                            y: Math.cos(component.angle),
                            z: 0
                        },
                        materialBefore: component.material,
                        materialAfter: this.physics.materials.air
                    });
                    break;
            }
        }
        
        return surfaces;
    }
    
    generateSourceRays(source) {
        const rays = [];
        
        switch (source.type) {
            case 'laser':
                // Single ray for laser
                rays.push({
                    origin: { ...source.position },
                    direction: {
                        x: Math.cos(source.angle),
                        y: Math.sin(source.angle),
                        z: 0
                    },
                    wavelength: source.wavelength,
                    intensity: source.power,
                    polarization: 'unpolarized'
                });
                break;
                
            case 'pointSource':
                // Multiple rays in all directions
                const angleStep = (2 * Math.PI) / this.rayDensity;
                for (let i = 0; i < this.rayDensity; i++) {
                    const angle = i * angleStep;
                    rays.push({
                        origin: { ...source.position },
                        direction: {
                            x: Math.cos(angle),
                            y: Math.sin(angle),
                            z: 0
                        },
                        wavelength: source.wavelength,
                        intensity: source.power / this.rayDensity,
                        polarization: 'unpolarized'
                    });
                }
                break;
                
            case 'collimated':
                // Parallel rays
                const spacing = 2; // mm
                for (let i = -this.rayDensity / 2; i < this.rayDensity / 2; i++) {
                    rays.push({
                        origin: {
                            x: source.position.x,
                            y: source.position.y + i * spacing,
                            z: 0
                        },
                        direction: {
                            x: Math.cos(source.angle),
                            y: Math.sin(source.angle),
                            z: 0
                        },
                        wavelength: source.wavelength,
                        intensity: source.power / this.rayDensity,
                        polarization: 'unpolarized'
                    });
                }
                break;
                
            case 'gaussian':
                // Gaussian beam profile
                const beam = this.physics.gaussianBeam(0, source.beamDiameter / 2, source.wavelength * 1e-6, source.power);
                const beamSpacing = source.beamDiameter / this.rayDensity;
                
                // Sample rays across beam profile
                for (let i = -this.rayDensity / 2; i < this.rayDensity / 2; i++) {
                    const r = (i / (this.rayDensity / 2)) * source.beamDiameter;
                    const intensity = beam.intensity(Math.abs(r));
                    
                    rays.push({
                        origin: {
                            x: source.position.x,
                            y: source.position.y + r,
                            z: 0
                        },
                        direction: {
                            x: Math.cos(source.angle),
                            y: Math.sin(source.angle),
                            z: 0
                        },
                        wavelength: source.wavelength,
                        intensity: intensity * beamSpacing,
                        polarization: 'unpolarized'
                    });
                }
                break;
        }
        
        return rays;
    }
    
    updateWavelengthDisplay() {
        const rgb = this.wavelengthToRGB(this.wavelength);
        const color = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        document.getElementById('wavelengthColor').style.backgroundColor = color;
    }
    
    wavelengthToRGB(wavelength) {
        // CIE 1931 color matching approximation
        let r, g, b;
        
        if (wavelength >= 380 && wavelength < 440) {
            r = -(wavelength - 440) / (440 - 380);
            g = 0.0;
            b = 1.0;
        } else if (wavelength >= 440 && wavelength < 490) {
            r = 0.0;
            g = (wavelength - 440) / (490 - 440);
            b = 1.0;
        } else if (wavelength >= 490 && wavelength < 510) {
            r = 0.0;
            g = 1.0;
            b = -(wavelength - 510) / (510 - 490);
        } else if (wavelength >= 510 && wavelength < 580) {
            r = (wavelength - 510) / (580 - 510);
            g = 1.0;
            b = 0.0;
        } else if (wavelength >= 580 && wavelength < 645) {
            r = 1.0;
            g = -(wavelength - 645) / (645 - 580);
            b = 0.0;
        } else if (wavelength >= 645 && wavelength < 781) {
            r = 1.0;
            g = 0.0;
            b = 0.0;
        } else {
            r = 0.0;
            g = 0.0;
            b = 0.0;
        }
        
        // Intensity correction
        let factor;
        if (wavelength >= 380 && wavelength < 420) {
            factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
        } else if (wavelength >= 420 && wavelength < 701) {
            factor = 1.0;
        } else if (wavelength >= 701 && wavelength < 781) {
            factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
        } else {
            factor = 0.0;
        }
        
        return {
            r: Math.round(255 * r * factor),
            g: Math.round(255 * g * factor),
            b: Math.round(255 * b * factor)
        };
    }
    
    updateMaterialProperties() {
        const material = this.physics.materials[this.currentMaterial];
        const n = material.n(this.wavelength / 1000); // Convert nm to μm
        document.getElementById('refractiveIndex').textContent = n.toFixed(4);
    }
    
    updateMeasurements() {
        // Calculate various optical measurements
        let totalPath = 0;
        let totalPower = 0;
        let throughputPower = 0;
        
        this.rays.forEach(ray => {
            if (ray.path.length > 1) {
                // Calculate path length
                for (let i = 1; i < ray.path.length; i++) {
                    const dx = ray.path[i].point.x - ray.path[i-1].point.x;
                    const dy = ray.path[i].point.y - ray.path[i-1].point.y;
                    totalPath += Math.sqrt(dx * dx + dy * dy);
                }
                
                // Track power
                totalPower += ray.intensity;
                if (ray.path[ray.path.length - 1].intensity) {
                    throughputPower += ray.path[ray.path.length - 1].intensity;
                }
            }
        });
        
        const avgPath = this.rays.length > 0 ? totalPath / this.rays.length : 0;
        const throughput = totalPower > 0 ? (throughputPower / totalPower) * 100 : 100;
        
        document.getElementById('opticalPath').textContent = avgPath.toFixed(2) + ' mm';
        document.getElementById('powerThroughput').textContent = throughput.toFixed(1) + '%';
        
        // Update other measurements based on system
        this.updateSystemAnalysis();
    }
    
    updateSystemAnalysis() {
        // Analyze optical system for focal length, aberrations, etc.
        const lenses = this.components.filter(c => c.type === 'lens');
        
        if (lenses.length > 0) {
            // Simple thin lens approximation for display
            const lens = lenses[0];
            document.getElementById('focalLength').textContent = lens.focalLength.toFixed(1) + ' mm';
            
            // F-number calculation
            const fNumber = lens.focalLength / lens.diameter;
            document.getElementById('fNumber').textContent = 'f/' + fNumber.toFixed(1);
        } else {
            document.getElementById('focalLength').textContent = '--';
            document.getElementById('fNumber').textContent = '--';
        }
    }
    
    clearAll() {
        this.sources = [];
        this.components = [];
        this.rays = [];
        this.selectedComponent = null;
        this.render();
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw optical axis
        this.drawOpticalAxis();
        
        // Draw rays
        this.drawRays();
        
        // Draw components
        this.drawComponents();
        
        // Draw sources
        this.drawSources();
        
        // Update ray diagram
        this.updateRayDiagram();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x < this.canvas.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y < this.canvas.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    drawOpticalAxis() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 5]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.opticalAxis.y);
        this.ctx.lineTo(this.canvas.width, this.opticalAxis.y);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }
    
    drawRays() {
        this.rays.forEach(ray => {
            if (ray.path.length < 2) return;
            
            const color = this.wavelengthToRGB(ray.wavelength);
            this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${ray.intensity})`;
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            this.ctx.moveTo(ray.path[0].point.x, ray.path[0].point.y);
            
            for (let i = 1; i < ray.path.length; i++) {
                if (ray.path[i].point) {
                    this.ctx.lineTo(ray.path[i].point.x, ray.path[i].point.y);
                }
            }
            
            this.ctx.stroke();
        });
    }
    
    drawComponents() {
        this.components.forEach(component => {
            this.ctx.save();
            this.ctx.translate(component.position.x, component.position.y);
            this.ctx.rotate(component.angle);
            
            switch (component.type) {
                case 'mirror':
                    this.drawMirror(component);
                    break;
                case 'lens':
                    this.drawLens(component);
                    break;
                case 'prism':
                    this.drawPrism(component);
                    break;
                case 'grating':
                    this.drawGrating(component);
                    break;
                case 'aperture':
                    this.drawAperture(component);
                    break;
                case 'beamSplitter':
                    this.drawBeamSplitter(component);
                    break;
            }
            
            this.ctx.restore();
            
            // Highlight selected component
            if (component === this.selectedComponent) {
                this.ctx.strokeStyle = '#00ff88';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.arc(component.position.x, component.position.y, 40, 0, 2 * Math.PI);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        });
    }
    
    drawMirror(mirror) {
        const w = mirror.size.width;
        const h = mirror.size.height;
        
        // Mirror surface
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.fillRect(-w/2, -h/2, w, h);
        
        // Reflective coating
        const gradient = this.ctx.createLinearGradient(-w/2, 0, w/2, 0);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(-w/2, -h/2, w, h/2);
        
        // Back surface
        this.ctx.fillStyle = '#666';
        this.ctx.fillRect(-w/2, 0, w, h/2);
    }
    
    drawLens(lens) {
        const r = lens.diameter / 2;
        
        this.ctx.strokeStyle = '#4fc3f7';
        this.ctx.lineWidth = 3;
        this.ctx.fillStyle = 'rgba(79, 195, 247, 0.2)';
        
        // Simplified lens drawing (double convex)
        this.ctx.beginPath();
        this.ctx.arc(-10, 0, r * 1.2, -Math.PI/3, Math.PI/3, false);
        this.ctx.arc(10, 0, r * 1.2, 2*Math.PI/3, 4*Math.PI/3, false);
        this.ctx.closePath();
        
        this.ctx.fill();
        this.ctx.stroke();
        
        // Center line
        this.ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -r);
        this.ctx.lineTo(0, r);
        this.ctx.stroke();
    }
    
    drawPrism(prism) {
        const s = prism.size;
        
        this.ctx.fillStyle = 'rgba(79, 195, 247, 0.3)';
        this.ctx.strokeStyle = '#4fc3f7';
        this.ctx.lineWidth = 2;
        
        // Equilateral triangle
        this.ctx.beginPath();
        this.ctx.moveTo(0, -s * Math.sqrt(3) / 3);
        this.ctx.lineTo(-s/2, s * Math.sqrt(3) / 6);
        this.ctx.lineTo(s/2, s * Math.sqrt(3) / 6);
        this.ctx.closePath();
        
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    drawGrating(grating) {
        const w = grating.size.width;
        const h = grating.size.height;
        
        // Substrate
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(-w/2, -h/2, w, h);
        
        // Grating lines
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 1;
        
        const lineSpacing = 3; // pixels between lines for visualization
        for (let x = -w/2; x < w/2; x += lineSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, -h/2);
            this.ctx.lineTo(x + 2, h/2);
            this.ctx.stroke();
        }
    }
    
    drawAperture(aperture) {
        const r = aperture.diameter / 2;
        
        // Aperture holder
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(-30, -30, 60, 60);
        
        // Aperture opening
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.globalCompositeOperation = 'source-over';
        
        // Edge highlight
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r, 0, 2 * Math.PI);
        this.ctx.stroke();
    }
    
    drawBeamSplitter(bs) {
        const w = bs.size.width;
        const h = bs.size.height;
        
        // Glass substrate
        this.ctx.fillStyle = 'rgba(79, 195, 247, 0.2)';
        this.ctx.fillRect(-w/2, -h/2, w, h);
        
        // Partially reflective coating (diagonal)
        const gradient = this.ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
        
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(-w/2, -h/2);
        this.ctx.lineTo(w/2, h/2);
        this.ctx.stroke();
    }
    
    drawSources() {
        this.sources.forEach(source => {
            this.ctx.save();
            this.ctx.translate(source.position.x, source.position.y);
            this.ctx.rotate(source.angle);
            
            switch (source.type) {
                case 'laser':
                    this.drawLaserSource(source);
                    break;
                case 'pointSource':
                    this.drawPointSource(source);
                    break;
                case 'collimated':
                    this.drawCollimatedSource(source);
                    break;
                case 'gaussian':
                    this.drawGaussianSource(source);
                    break;
            }
            
            this.ctx.restore();
            
            // Highlight selected source
            if (source === this.selectedComponent) {
                this.ctx.strokeStyle = '#00ff88';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.arc(source.position.x, source.position.y, 30, 0, 2 * Math.PI);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        });
    }
    
    drawLaserSource(laser) {
        // Laser housing
        this.ctx.fillStyle = '#c62828';
        this.ctx.fillRect(-25, -10, 50, 20);
        
        // Output aperture
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(20, -3, 5, 6);
        
        // Power indicator
        const color = this.wavelengthToRGB(laser.wavelength);
        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        this.ctx.beginPath();
        this.ctx.arc(-15, 0, 3, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Label
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('LASER', 0, -15);
    }
    
    drawPointSource(source) {
        const color = this.wavelengthToRGB(source.wavelength);
        
        // Glowing sphere
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 1)`);
        gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(-15, -15, 30, 30);
        
        // Center point
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 3, 0, 2 * Math.PI);
        this.ctx.fill();
    }
    
    drawCollimatedSource(source) {
        // Collimator housing
        this.ctx.fillStyle = '#455a64';
        this.ctx.fillRect(-20, -15, 40, 30);
        
        // Collimating lens
        this.ctx.strokeStyle = '#4fc3f7';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(15, -10);
        this.ctx.lineTo(15, 10);
        this.ctx.stroke();
        
        // Output beam indicator
        const color = this.wavelengthToRGB(source.wavelength);
        this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
        this.ctx.lineWidth = 10;
        this.ctx.beginPath();
        this.ctx.moveTo(20, 0);
        this.ctx.lineTo(30, 0);
        this.ctx.stroke();
    }
    
    drawGaussianSource(source) {
        // Gaussian beam source (like a laser with beam shaping)
        this.ctx.fillStyle = '#1565c0';
        this.ctx.fillRect(-25, -10, 50, 20);
        
        // Beam shaping optics indicator
        this.ctx.strokeStyle = '#4fc3f7';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(10, 0, 8, -Math.PI/2, Math.PI/2);
        this.ctx.stroke();
        
        // Gaussian profile visualization
        const color = this.wavelengthToRGB(source.wavelength);
        const gradient = this.ctx.createRadialGradient(25, 0, 0, 25, 0, source.beamDiameter * 5);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`);
        gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(20, -source.beamDiameter * 5, 10, source.beamDiameter * 10);
    }
    
    updateRayDiagram() {
        // Clear ray diagram
        this.rayCtx.fillStyle = '#000';
        this.rayCtx.fillRect(0, 0, this.rayCanvas.width, this.rayCanvas.height);
        
        // Draw coordinate system
        this.rayCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.rayCtx.lineWidth = 1;
        
        // Axes
        this.rayCtx.beginPath();
        this.rayCtx.moveTo(20, this.rayCanvas.height / 2);
        this.rayCtx.lineTo(this.rayCanvas.width - 20, this.rayCanvas.height / 2);
        this.rayCtx.moveTo(this.rayCanvas.width / 2, 20);
        this.rayCtx.lineTo(this.rayCanvas.width / 2, this.rayCanvas.height - 20);
        this.rayCtx.stroke();
        
        // Labels
        this.rayCtx.fillStyle = '#fff';
        this.rayCtx.font = '10px Arial';
        this.rayCtx.textAlign = 'center';
        this.rayCtx.fillText('Ray Fan Plot', this.rayCanvas.width / 2, 15);
        
        // Draw ray fan if lens is present
        const lenses = this.components.filter(c => c.type === 'lens');
        if (lenses.length > 0 && this.rays.length > 0) {
            this.drawRayFan(lenses[0]);
        }
    }
    
    drawRayFan(lens) {
        // Simplified ray fan diagram showing aberrations
        const centerX = this.rayCanvas.width / 2;
        const centerY = this.rayCanvas.height / 2;
        const scale = 50;
        
        this.rayCtx.strokeStyle = '#00ff88';
        this.rayCtx.lineWidth = 2;
        
        // Draw rays converging to focal point
        this.rays.forEach((ray, index) => {
            if (index % 5 === 0 && ray.path.length > 2) { // Sample every 5th ray
                this.rayCtx.beginPath();
                this.rayCtx.moveTo(centerX - scale, centerY);
                
                // Find focal point (simplified)
                const lastPoint = ray.path[ray.path.length - 1];
                const focalX = centerX + (lastPoint.point.x - lens.position.x) * 0.2;
                const focalY = centerY + (lastPoint.point.y - lens.position.y) * 0.2;
                
                this.rayCtx.lineTo(focalX, focalY);
                this.rayCtx.stroke();
            }
        });
    }
    
    animate() {
        this.render();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize the optics bench
const opticsBench = new ZemaxOpticsBench();