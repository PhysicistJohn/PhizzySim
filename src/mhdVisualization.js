import * as THREE from 'three';

export class MHDVisualization {
    constructor(mhdSim) {
        console.log('MHDVis: Starting visualization...');
        this.mhd = mhdSim;
        this.group = new THREE.Group();
        
        // Visualization parameters
        this.scale = 1 / this.mhd.earthRadius;  // Scale to Earth radii
        
        // Create visualizations
        console.log('MHDVis: Creating Earth...');
        this.createEarth();
        console.log('MHDVis: Creating field lines...');
        this.createFieldLines();
        console.log('MHDVis: Creating streamlines...');
        this.createStreamlines();
        console.log('MHDVis: Creating pressure contours...');
        this.createPressureContours();
        console.log('MHDVis: Creating magnetopause...');
        this.createMagnetopause();
        console.log('MHDVis: Visualization complete');
    }
    
    createEarth() {
        const geometry = new THREE.SphereGeometry(1, 32, 32);  // 1 Earth radius
        const material = new THREE.MeshPhongMaterial({
            color: 0x2233ff,
            emissive: 0x112244,
            shininess: 10
        });
        
        this.earth = new THREE.Mesh(geometry, material);
        this.group.add(this.earth);
    }
    
    createFieldLines() {
        this.fieldLineGroup = new THREE.Group();
        
        // Sample starting points for field lines
        const startPoints = [];
        
        // Add field lines from different latitudes
        for (let lat = -60; lat <= 60; lat += 30) {
            for (let lon = 0; lon < 360; lon += 60) {
                const theta = lat * Math.PI / 180;
                const phi = lon * Math.PI / 180;
                
                const r = 2;  // Start at 2 Earth radii
                const x = r * Math.cos(theta) * Math.cos(phi);
                const y = r * Math.cos(theta) * Math.sin(phi);
                const z = r * Math.sin(theta);
                
                startPoints.push({ x, y, z });
            }
        }
        
        // Trace field lines
        startPoints.forEach(start => {
            const line = this.traceFieldLine(start, 500);
            if (line.length > 10) {
                const geometry = new THREE.BufferGeometry();
                const vertices = [];
                
                line.forEach(point => {
                    vertices.push(point.x, point.y, point.z);
                });
                
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                
                const material = new THREE.LineBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.4
                });
                
                const lineObj = new THREE.Line(geometry, material);
                this.fieldLineGroup.add(lineObj);
            }
        });
        
        this.group.add(this.fieldLineGroup);
    }
    
    traceFieldLine(start, maxSteps) {
        const line = [];
        let pos = { ...start };
        const stepSize = 0.1;  // In Earth radii
        
        for (let i = 0; i < maxSteps; i++) {
            line.push({ ...pos });
            
            // Get magnetic field at current position
            const field = this.mhd.getFieldAt(
                pos.x * this.mhd.earthRadius,
                pos.y * this.mhd.earthRadius,
                pos.z * this.mhd.earthRadius
            );
            
            if (!field) break;
            
            const B = field.magneticField;
            const Bmag = Math.sqrt(B.x * B.x + B.y * B.y + B.z * B.z);
            
            if (Bmag < 1e-12) break;  // Field too weak
            
            // Step along field line
            pos.x += stepSize * B.x / Bmag;
            pos.y += stepSize * B.y / Bmag;
            pos.z += stepSize * B.z / Bmag;
            
            // Check boundaries
            const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
            if (r < 1 || r > 30) break;  // Hit Earth or too far
        }
        
        return line;
    }
    
    createStreamlines() {
        this.streamlineGroup = new THREE.Group();
        
        // Create 3D velocity streamlines from multiple starting surfaces
        const streamlines = [];
        
        // Start streamlines from multiple locations for 3D visualization
        
        // 1. Upstream plane (main solar wind flow)
        for (let y = -15; y <= 15; y += 4) {
            for (let z = -15; z <= 15; z += 4) {
                const x = -25;  // Upstream position
                const r = Math.sqrt(y*y + z*z);
                if (r <= 18) {  // Within reasonable distance
                    const streamline = this.traceStreamline({ x, y, z }, 200);
                    if (streamline.length > 10) {
                        streamlines.push(streamline);
                    }
                }
            }
        }
        
        // 2. Side flows (bow shock region)
        for (let x = -15; x <= -5; x += 5) {
            for (let y = -20; y <= 20; y += 8) {
                for (let z = -10; z <= 10; z += 10) {
                    const r = Math.sqrt(x*x + y*y + z*z);
                    if (r > 3 && r < 25) {  // Outside Earth, reasonable distance
                        const streamline = this.traceStreamline({ x, y, z }, 150);
                        if (streamline.length > 5) {
                            streamlines.push(streamline);
                        }
                    }
                }
            }
        }
        
        // 3. Magnetotail region
        for (let x = 5; x <= 20; x += 5) {
            for (let y = -8; y <= 8; y += 4) {
                for (let z = -5; z <= 5; z += 5) {
                    const r = Math.sqrt(x*x + y*y + z*z);
                    if (r > 2) {  // Outside Earth
                        const streamline = this.traceStreamline({ x, y, z }, 100);
                        if (streamline.length > 5) {
                            streamlines.push(streamline);
                        }
                    }
                }
            }
        }
        
        // Visualize streamlines
        streamlines.forEach(line => {
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const colors = [];
            
            line.forEach((point, i) => {
                vertices.push(point.x, point.y, point.z);
                
                // Color by velocity magnitude with better scaling
                const speed = point.speed || Math.sqrt(point.vx * point.vx + point.vy * point.vy + point.vz * point.vz);
                const normalizedSpeed = Math.min(speed / this.mhd.swVelocity, 1);
                
                // Better color scheme: blue (slow) -> green (medium) -> red (fast)
                if (normalizedSpeed < 0.5) {
                    const t = normalizedSpeed * 2;
                    colors.push(0.2, 0.2 + t * 0.6, 1.0); // Blue to cyan
                } else {
                    const t = (normalizedSpeed - 0.5) * 2;
                    colors.push(0.2 + t * 0.8, 0.8, 1.0 - t * 0.8); // Cyan to red
                }
            });
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            
            const material = new THREE.LineBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 0.6
            });
            
            const lineObj = new THREE.Line(geometry, material);
            this.streamlineGroup.add(lineObj);
        });
        
        this.group.add(this.streamlineGroup);
    }
    
    traceStreamline(start, maxSteps) {
        const line = [];
        let pos = { ...start };
        const dt = 0.02;  // Smaller time step for accuracy
        
        for (let i = 0; i < maxSteps; i++) {
            const field = this.mhd.getFieldAt(
                pos.x * this.mhd.earthRadius,
                pos.y * this.mhd.earthRadius,
                pos.z * this.mhd.earthRadius
            );
            
            if (!field) break;
            
            const v = field.velocity;
            const vmag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
            
            if (vmag < 1e3) break;  // Flow too slow
            
            line.push({
                x: pos.x,
                y: pos.y,
                z: pos.z,
                vx: v.x,
                vy: v.y,
                vz: v.z,
                speed: vmag
            });
            
            // Use RK2 integration for better accuracy
            const k1_x = v.x / this.mhd.earthRadius;
            const k1_y = v.y / this.mhd.earthRadius;
            const k1_z = v.z / this.mhd.earthRadius;
            
            // Half step
            const mid_pos = {
                x: pos.x + 0.5 * dt * k1_x,
                y: pos.y + 0.5 * dt * k1_y,
                z: pos.z + 0.5 * dt * k1_z
            };
            
            const field_mid = this.mhd.getFieldAt(
                mid_pos.x * this.mhd.earthRadius,
                mid_pos.y * this.mhd.earthRadius,
                mid_pos.z * this.mhd.earthRadius
            );
            
            if (field_mid) {
                const v_mid = field_mid.velocity;
                const k2_x = v_mid.x / this.mhd.earthRadius;
                const k2_y = v_mid.y / this.mhd.earthRadius;
                const k2_z = v_mid.z / this.mhd.earthRadius;
                
                // Full step with midpoint velocity
                pos.x += dt * k2_x;
                pos.y += dt * k2_y;
                pos.z += dt * k2_z;
            } else {
                // Fallback to Euler step
                pos.x += dt * k1_x;
                pos.y += dt * k1_y;
                pos.z += dt * k1_z;
            }
            
            // Check boundaries
            const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
            if (r < 1.1 || r > 30) break;
        }
        
        return line;
    }
    
    createPressureContours() {
        this.pressureGroup = new THREE.Group();
        
        // Create pressure contour in equatorial plane
        const nx = 100;
        const ny = 100;
        const geometry = new THREE.PlaneGeometry(40, 40, nx - 1, ny - 1);
        
        const vertices = geometry.attributes.position.array;
        const colors = new Float32Array(vertices.length);
        
        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) {
                const idx = (i * ny + j) * 3;
                
                const x = (i / (nx - 1) - 0.5) * 40 - 10;  // -30 to 10 Earth radii
                const y = (j / (ny - 1) - 0.5) * 40;       // -20 to 20 Earth radii
                const z = 0;
                
                vertices[idx] = x;
                vertices[idx + 1] = y;
                vertices[idx + 2] = z;
                
                const field = this.mhd.getFieldAt(
                    x * this.mhd.earthRadius,
                    y * this.mhd.earthRadius,
                    z * this.mhd.earthRadius
                );
                
                if (field) {
                    // Normalize pressure
                    const p_norm = field.pressure / (this.mhd.swDensity * this.mhd.k_B * this.mhd.swTemperature);
                    const logP = Math.log10(Math.max(p_norm, 0.1));
                    
                    // Color mapping (blue = low, red = high)
                    const t = Math.max(0, Math.min(1, (logP + 1) / 2));
                    colors[idx] = t;
                    colors[idx + 1] = 0.5 * (1 - t);
                    colors[idx + 2] = 1 - t;
                } else {
                    colors[idx] = 0;
                    colors[idx + 1] = 0;
                    colors[idx + 2] = 0;
                }
            }
        }
        
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        this.pressureGroup.add(mesh);
        
        this.group.add(this.pressureGroup);
    }
    
    createMagnetopause() {
        this.magnetopauseGroup = new THREE.Group();
        
        // Calculate theoretical magnetopause shape
        const r_mp = this.mhd.calculateMagnetopause() / this.mhd.earthRadius;
        
        // Create magnetopause surface
        const geometry = new THREE.SphereGeometry(r_mp, 32, 32, 0, Math.PI);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.2,
            wireframe: true
        });
        
        const magnetopause = new THREE.Mesh(geometry, material);
        this.magnetopauseGroup.add(magnetopause);
        
        this.group.add(this.magnetopauseGroup);
    }
    
    update() {
        // Update visualizations based on current MHD state
        // This could include updating streamlines, field lines, etc.
    }
    
    showFieldLines(visible) {
        this.fieldLineGroup.visible = visible;
    }
    
    showStreamlines(visible) {
        this.streamlineGroup.visible = visible;
    }
    
    showPressure(visible) {
        this.pressureGroup.visible = visible;
    }
    
    showMagnetopause(visible) {
        this.magnetopauseGroup.visible = visible;
    }
}