import * as THREE from 'three';

export class MagnetospherePhysics {
    constructor() {
        this.earthRadius = 6.371e6;
        this.earthMagneticMoment = 7.9e22; // A⋅m²
        this.solarWindVelocity = 400e3; // m/s
        this.solarWindDensity = 5e6; // particles/m³
        this.solarWindPressure = 2e-9; // Pa
        this.solarWindTemperature = 100000; // K
        this.solarWindMagneticField = 5e-9; // Tesla (5 nT)
        this.mu0 = 4 * Math.PI * 1e-7; // Permeability of free space
        
        // Magnetopause standoff distance (subsolar point)
        this.magnetopauseDistance = 10 * this.earthRadius;
        
        // Bow shock distance
        this.bowShockDistance = 13.5 * this.earthRadius;
        
        // Van Allen belt parameters
        this.innerBeltRadius = 1.2 * this.earthRadius;
        this.outerBeltRadius = 4.0 * this.earthRadius;
        
        this.particles = [];
        this.maxParticles = 1000;  // Reduced for cleaner visualization
        
        this.initializeParticles();
    }
    
    // Earth's magnetic dipole field
    getDipoleField(position) {
        const r = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
        const rNorm = r / this.earthRadius;
        
        if (rNorm < 1.0) return { x: 0, y: 0, z: 0 }; // Inside Earth
        
        // Dipole field in spherical coordinates
        const theta = Math.acos(position.z / r);
        const phi = Math.atan2(position.y, position.x);
        
        // Magnetic field strength at distance r
        const B0 = (this.mu0 * this.earthMagneticMoment) / (4 * Math.PI * Math.pow(r, 3));
        
        // Field components in Cartesian coordinates
        const Br = 2 * B0 * Math.cos(theta);
        const Btheta = B0 * Math.sin(theta);
        
        // Convert to Cartesian
        const Bx = Br * Math.sin(theta) * Math.cos(phi) + Btheta * Math.cos(theta) * Math.cos(phi);
        const By = Br * Math.sin(theta) * Math.sin(phi) + Btheta * Math.cos(theta) * Math.sin(phi);
        const Bz = Br * Math.cos(theta) - Btheta * Math.sin(theta);
        
        return { x: Bx, y: By, z: Bz };
    }
    
    // Calculate magnetopause boundary
    getMagnetopauseDistance(angle) {
        // Angle from sun-earth line (0 = subsolar, π = antisolar)
        const r0 = this.magnetopauseDistance;
        
        // Approximate shape using empirical formula
        if (angle <= Math.PI / 2) {
            return r0 * Math.pow(2 / (1 + Math.cos(angle)), 0.5);
        } else {
            // Tail region - simplified model
            return r0 * (1 + 0.5 * (angle - Math.PI / 2));
        }
    }
    
    // Calculate bow shock boundary  
    getBowShockDistance(angle) {
        const r0 = this.bowShockDistance;
        return r0 * Math.pow(2 / (1 + Math.cos(angle)), 0.5);
    }
    
    // Check if position is inside magnetosphere
    isInsideMagnetosphere(position) {
        const r = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
        const angle = Math.acos(position.x / r); // Angle from sun direction (+x)
        const boundaryDistance = this.getMagnetopauseDistance(angle);
        
        return r < boundaryDistance;
    }
    
    // Initialize solar wind particles
    initializeParticles() {
        this.particles = [];
        
        for (let i = 0; i < this.maxParticles; i++) {
            // Start particles upstream of bow shock
            const x = (Math.random() - 0.5) * 100 * this.earthRadius + 20 * this.earthRadius;
            const y = (Math.random() - 0.5) * 40 * this.earthRadius;
            const z = (Math.random() - 0.5) * 40 * this.earthRadius;
            
            this.particles.push({
                position: { x, y, z },
                velocity: { 
                    x: -this.solarWindVelocity, 
                    y: 0, 
                    z: 0 
                },
                mass: 1.67e-27, // Proton mass
                charge: 1.6e-19, // Elementary charge
                active: true,
                type: 'proton'
            });
        }
    }
    
    // Update particle positions and interactions
    updateParticles(deltaTime) {
        for (let particle of this.particles) {
            if (!particle.active) continue;
            
            const r = Math.sqrt(
                particle.position.x * particle.position.x + 
                particle.position.y * particle.position.y + 
                particle.position.z * particle.position.z
            );
            
            // Remove particles that are too far away or hit Earth
            if (r > 50 * this.earthRadius || r < this.earthRadius) {
                this.resetParticle(particle);
                continue;
            }
            
            // Get magnetic field at particle position
            const B = this.getDipoleField(particle.position);
            const Bmag = Math.sqrt(B.x * B.x + B.y * B.y + B.z * B.z);
            
            if (Bmag > 0 && this.isInsideMagnetosphere(particle.position)) {
                // Apply Lorentz force: F = q(v × B)
                const qByM = particle.charge / particle.mass;
                
                // v × B
                const forceX = qByM * (particle.velocity.y * B.z - particle.velocity.z * B.y);
                const forceY = qByM * (particle.velocity.z * B.x - particle.velocity.x * B.z);
                const forceZ = qByM * (particle.velocity.x * B.y - particle.velocity.y * B.x);
                
                // Update velocity
                particle.velocity.x += forceX * deltaTime;
                particle.velocity.y += forceY * deltaTime;
                particle.velocity.z += forceZ * deltaTime;
            }
            
            // Update position
            particle.position.x += particle.velocity.x * deltaTime;
            particle.position.y += particle.velocity.y * deltaTime;
            particle.position.z += particle.velocity.z * deltaTime;
        }
    }
    
    resetParticle(particle) {
        const x = (Math.random() - 0.5) * 100 * this.earthRadius + 20 * this.earthRadius;
        const y = (Math.random() - 0.5) * 40 * this.earthRadius;
        const z = (Math.random() - 0.5) * 40 * this.earthRadius;
        
        particle.position = { x, y, z };
        particle.velocity = { 
            x: -this.solarWindVelocity, 
            y: 0, 
            z: 0 
        };
        particle.active = true;
    }
    
    // Calculate field line for visualization
    traceFieldLine(startPos, steps = 100, stepSize = 1e5) {
        const line = [{ ...startPos }];
        let currentPos = { ...startPos };
        
        for (let i = 0; i < steps; i++) {
            const B = this.getDipoleField(currentPos);
            const Bmag = Math.sqrt(B.x * B.x + B.y * B.y + B.z * B.z);
            
            if (Bmag === 0) break;
            
            // Normalize field direction
            const Bnorm = {
                x: B.x / Bmag,
                y: B.y / Bmag,
                z: B.z / Bmag
            };
            
            // Step along field line
            currentPos.x += Bnorm.x * stepSize;
            currentPos.y += Bnorm.y * stepSize;
            currentPos.z += Bnorm.z * stepSize;
            
            const r = Math.sqrt(
                currentPos.x * currentPos.x + 
                currentPos.y * currentPos.y + 
                currentPos.z * currentPos.z
            );
            
            // Stop if we hit Earth or go too far
            if (r < this.earthRadius || r > 20 * this.earthRadius) break;
            
            line.push({ ...currentPos });
        }
        
        return line;
    }
}

export function createMagnetosphereVisualization(magnetosphere) {
    const group = new THREE.Group();
    
    // Create magnetopause boundary
    const magnetopauseGeometry = new THREE.BufferGeometry();
    const magnetopauseVertices = [];
    
    for (let theta = 0; theta <= Math.PI; theta += 0.2) {  // Less dense
        for (let phi = 0; phi <= 2 * Math.PI; phi += 0.2) {  // Less dense
            const r = magnetosphere.getMagnetopauseDistance(theta);
            const x = r * Math.sin(theta) * Math.cos(phi);
            const y = r * Math.sin(theta) * Math.sin(phi);
            const z = r * Math.cos(theta);
            
            magnetopauseVertices.push(x, y, z);
        }
    }
    
    magnetopauseGeometry.setAttribute('position', new THREE.Float32BufferAttribute(magnetopauseVertices, 3));
    const magnetopauseMaterial = new THREE.PointsMaterial({
        color: 0x44ff44,  // Softer green
        size: 1e3,  // Much smaller particles
        transparent: true,
        opacity: 0.1,  // Very transparent
        sizeAttenuation: false
    });
    
    const magnetopause = new THREE.Points(magnetopauseGeometry, magnetopauseMaterial);
    group.add(magnetopause);
    
    // Create bow shock
    const bowShockGeometry = new THREE.BufferGeometry();
    const bowShockVertices = [];
    
    for (let theta = 0; theta <= Math.PI; theta += 0.3) {  // Much less dense
        for (let phi = 0; phi <= 2 * Math.PI; phi += 0.3) {  // Much less dense
            const r = magnetosphere.getBowShockDistance(theta);
            const x = r * Math.sin(theta) * Math.cos(phi);
            const y = r * Math.sin(theta) * Math.sin(phi);
            const z = r * Math.cos(theta);
            
            bowShockVertices.push(x, y, z);
        }
    }
    
    bowShockGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bowShockVertices, 3));
    const bowShockMaterial = new THREE.PointsMaterial({
        color: 0xffaaaa,  // Softer red
        size: 1e3,  // Much smaller particles
        transparent: true,
        opacity: 0.1,  // Very transparent
        sizeAttenuation: false
    });
    
    const bowShock = new THREE.Points(bowShockGeometry, bowShockMaterial);
    group.add(bowShock);
    
    // Create particle system for solar wind
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(magnetosphere.maxParticles * 3);
    const particleColors = new Float32Array(magnetosphere.maxParticles * 3);
    
    for (let i = 0; i < magnetosphere.maxParticles; i++) {
        const particle = magnetosphere.particles[i];
        particlePositions[i * 3] = particle.position.x;
        particlePositions[i * 3 + 1] = particle.position.y;
        particlePositions[i * 3 + 2] = particle.position.z;
        
        // Color based on whether inside magnetosphere
        const inside = magnetosphere.isInsideMagnetosphere(particle.position);
        // Softer colors: light yellow outside, light blue inside
        particleColors[i * 3] = inside ? 0.3 : 1.0;     
        particleColors[i * 3 + 1] = inside ? 0.3 : 0.9;
        particleColors[i * 3 + 2] = inside ? 0.8 : 0.3;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 1e3,  // Much smaller particle size
        vertexColors: true,
        transparent: true,
        opacity: 0.2,  // Low opacity
        sizeAttenuation: false,  // Particles stay same size regardless of distance
        blending: THREE.AdditiveBlending  // Better blending
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    group.add(particles);
    
    // Create enhanced magnetic field lines for Earth
    const fieldLineGroup = createEarthFieldLines(magnetosphere);
    fieldLineGroup.userData.isFieldLine = true;
    group.add(fieldLineGroup);
    
    group.userData = {
        updateParticles: function(magnetosphere) {
            const positions = particles.geometry.attributes.position.array;
            const colors = particles.geometry.attributes.color.array;
            
            for (let i = 0; i < magnetosphere.particles.length; i++) {
                const particle = magnetosphere.particles[i];
                positions[i * 3] = particle.position.x;
                positions[i * 3 + 1] = particle.position.y;
                positions[i * 3 + 2] = particle.position.z;
                
                const inside = magnetosphere.isInsideMagnetosphere(particle.position);
                colors[i * 3] = inside ? 0 : 1;
                colors[i * 3 + 1] = inside ? 0 : 0;
                colors[i * 3 + 2] = inside ? 1 : 0;
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            particles.geometry.attributes.color.needsUpdate = true;
        }
    };
    
    return group;
}

// Create enhanced Earth magnetic field lines
export function createEarthFieldLines(magnetosphere) {
    const group = new THREE.Group();
    
    // Create multiple field lines at different latitudes and longitudes
    const fieldLineStarts = [];
    
    // Dipole field lines from various starting points
    for (let lat = -80; lat <= 80; lat += 20) {
        for (let lon = 0; lon < 360; lon += 45) {
            const latRad = lat * Math.PI / 180;
            const lonRad = lon * Math.PI / 180;
            
            // Multiple altitudes for each position
            for (let alt = 1.5; alt <= 6; alt += 1.5) {
                const r = magnetosphere.earthRadius * alt;
                const x = r * Math.cos(latRad) * Math.cos(lonRad);
                const y = r * Math.cos(latRad) * Math.sin(lonRad);
                const z = r * Math.sin(latRad);
                
                fieldLineStarts.push({ x, y, z, lat, lon });
            }
        }
    }
    
    fieldLineStarts.forEach((start, index) => {
        // Trace field line in both directions
        const fieldLineForward = magnetosphere.traceFieldLine(start, 200, 5e4);
        const fieldLineBackward = magnetosphere.traceFieldLine(start, 200, -5e4);
        
        // Combine both directions
        const fullFieldLine = [...fieldLineBackward.reverse(), ...fieldLineForward.slice(1)];
        
        if (fullFieldLine.length > 5) {
            const lineGeometry = new THREE.BufferGeometry();
            const lineVertices = [];
            const lineColors = [];
            
            fullFieldLine.forEach((point, i) => {
                lineVertices.push(point.x, point.y, point.z);
                
                // Color gradient based on distance from Earth
                const r = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
                const intensity = Math.max(0.3, 1.0 - (r - magnetosphere.earthRadius) / (10 * magnetosphere.earthRadius));
                
                // Different colors for different latitudes
                if (Math.abs(start.lat) > 60) {
                    // Polar field lines - blue to cyan
                    lineColors.push(0.3 * intensity, 0.8 * intensity, 1.0 * intensity);
                } else if (Math.abs(start.lat) < 30) {
                    // Equatorial field lines - red to yellow
                    lineColors.push(1.0 * intensity, 0.7 * intensity, 0.2 * intensity);
                } else {
                    // Mid-latitude field lines - white to blue
                    lineColors.push(0.8 * intensity, 0.8 * intensity, 1.0 * intensity);
                }
            });
            
            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
            lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
            
            const lineMaterial = new THREE.LineBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 0.6,
                linewidth: 2
            });
            
            const line = new THREE.Line(lineGeometry, lineMaterial);
            group.add(line);
        }
    });
    
    // Add inner magnetosphere field lines (closer to Earth)
    for (let theta = 0; theta < Math.PI; theta += Math.PI / 12) {
        for (let phi = 0; phi < 2 * Math.PI; phi += Math.PI / 8) {
            const r = magnetosphere.earthRadius * 1.2;
            const x = r * Math.sin(theta) * Math.cos(phi);
            const y = r * Math.sin(theta) * Math.sin(phi);
            const z = r * Math.cos(theta);
            
            const fieldLine = magnetosphere.traceFieldLine({ x, y, z }, 100, 2e4);
            
            if (fieldLine.length > 3) {
                const lineGeometry = new THREE.BufferGeometry();
                const lineVertices = [];
                
                fieldLine.forEach(point => {
                    lineVertices.push(point.x, point.y, point.z);
                });
                
                lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: 0x88ffff,
                    transparent: true,
                    opacity: 0.4,
                    linewidth: 1
                });
                
                const line = new THREE.Line(lineGeometry, lineMaterial);
                group.add(line);
            }
        }
    }
    
    return group;
}

// Create Sun magnetic field lines
export function createSunFieldLines() {
    const group = new THREE.Group();
    const sunRadius = 6.96e8;
    
    // Solar magnetic field lines (simplified dipole + complex structure)
    const fieldLineStarts = [];
    
    // Main dipole field lines
    for (let lat = -75; lat <= 75; lat += 15) {
        for (let lon = 0; lon < 360; lon += 30) {
            const latRad = lat * Math.PI / 180;
            const lonRad = lon * Math.PI / 180;
            
            // Multiple layers
            for (let alt = 1.1; alt <= 3; alt += 0.3) {
                const r = sunRadius * alt;
                const x = r * Math.cos(latRad) * Math.cos(lonRad);
                const y = r * Math.cos(latRad) * Math.sin(lonRad);
                const z = r * Math.sin(latRad);
                
                fieldLineStarts.push({ x, y, z, lat });
            }
        }
    }
    
    fieldLineStarts.forEach(start => {
        // Create field lines extending from Sun
        const fieldLine = [];
        let currentPos = { ...start };
        
        // Simplified solar field - radial with some twisting
        for (let i = 0; i < 50; i++) {
            fieldLine.push({ ...currentPos });
            
            const r = Math.sqrt(currentPos.x * currentPos.x + currentPos.y * currentPos.y + currentPos.z * currentPos.z);
            
            // Radial component with Parker spiral
            const rNorm = r / sunRadius;
            const spiralAngle = 0.1 * rNorm; // Parker spiral approximation
            
            // Direction vector (radial + spiral)
            const rVec = Math.sqrt(currentPos.x * currentPos.x + currentPos.y * currentPos.y + currentPos.z * currentPos.z);
            const direction = {
                x: currentPos.x / rVec + Math.sin(spiralAngle) * 0.1,
                y: currentPos.y / rVec + Math.cos(spiralAngle) * 0.1,
                z: currentPos.z / rVec
            };
            
            // Step size increases with distance
            const stepSize = sunRadius * 0.1 * (1 + rNorm * 0.5);
            
            currentPos.x += direction.x * stepSize;
            currentPos.y += direction.y * stepSize;
            currentPos.z += direction.z * stepSize;
            
            // Stop if too far from Sun
            const newR = Math.sqrt(currentPos.x * currentPos.x + currentPos.y * currentPos.y + currentPos.z * currentPos.z);
            if (newR > sunRadius * 20) break;
        }
        
        if (fieldLine.length > 5) {
            const lineGeometry = new THREE.BufferGeometry();
            const lineVertices = [];
            const lineColors = [];
            
            fieldLine.forEach((point, i) => {
                lineVertices.push(point.x, point.y, point.z);
                
                // Color based on solar latitude and intensity
                const intensity = Math.max(0.2, 1.0 - i / fieldLine.length);
                
                if (Math.abs(start.lat) > 45) {
                    // Polar field lines - bright yellow/white
                    lineColors.push(1.0 * intensity, 1.0 * intensity, 0.8 * intensity);
                } else {
                    // Equatorial field lines - orange/red
                    lineColors.push(1.0 * intensity, 0.6 * intensity, 0.2 * intensity);
                }
            });
            
            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
            lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
            
            const lineMaterial = new THREE.LineBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 0.7,
                linewidth: 2
            });
            
            const line = new THREE.Line(lineGeometry, lineMaterial);
            group.add(line);
        }
    });
    
    // Add coronal loops (closed field lines)
    for (let i = 0; i < 20; i++) {
        const lat = (Math.random() - 0.5) * 60 * Math.PI / 180;
        const lon = Math.random() * 2 * Math.PI;
        const height = sunRadius * (0.2 + Math.random() * 0.5);
        
        const loopGeometry = new THREE.BufferGeometry();
        const loopVertices = [];
        const loopColors = [];
        
        // Create arc-shaped field lines
        for (let t = 0; t <= Math.PI; t += 0.1) {
            const r = sunRadius * 1.05;
            const x = r * Math.cos(lat) * Math.cos(lon + t * 0.1) + height * Math.sin(t) * Math.cos(lon);
            const y = r * Math.cos(lat) * Math.sin(lon + t * 0.1) + height * Math.sin(t) * Math.sin(lon);
            const z = r * Math.sin(lat) + height * Math.sin(t) * 0.3;
            
            loopVertices.push(x, y, z);
            
            const intensity = Math.sin(t) * 0.8 + 0.2;
            loopColors.push(1.0 * intensity, 0.8 * intensity, 0.3 * intensity);
        }
        
        loopGeometry.setAttribute('position', new THREE.Float32BufferAttribute(loopVertices, 3));
        loopGeometry.setAttribute('color', new THREE.Float32BufferAttribute(loopColors, 3));
        
        const loopMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.6
        });
        
        const loop = new THREE.Line(loopGeometry, loopMaterial);
        group.add(loop);
    }
    
    return group;
}

// Create interplanetary magnetic field
export function createInterplanetaryField() {
    const group = new THREE.Group();
    const earthOrbitRadius = 1.496e11;
    
    // Parker spiral field lines
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 6) {
        const fieldLine = [];
        
        // Start from Sun's edge
        let r = 6.96e8 * 2;
        let currentAngle = angle;
        
        while (r < earthOrbitRadius * 2) {
            const x = r * Math.cos(currentAngle);
            const y = r * Math.sin(currentAngle);
            const z = 0;
            
            fieldLine.push({ x, y, z });
            
            // Parker spiral: dφ/dr = -Ω/(v_sw * r)
            const omega = 2.7e-6; // Solar rotation rate (rad/s)
            const vSw = 400e3; // Solar wind speed
            const dAngle = -omega / vSw;
            
            r += earthOrbitRadius * 0.05;
            currentAngle += dAngle * earthOrbitRadius * 0.05;
        }
        
        if (fieldLine.length > 5) {
            const lineGeometry = new THREE.BufferGeometry();
            const lineVertices = [];
            const lineColors = [];
            
            fieldLine.forEach((point, i) => {
                lineVertices.push(point.x, point.y, point.z);
                
                const intensity = Math.max(0.2, 1.0 - i / fieldLine.length);
                lineColors.push(0.8 * intensity, 0.8 * intensity, 0.3 * intensity);
            });
            
            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
            lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
            
            const lineMaterial = new THREE.LineBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 0.3,
                linewidth: 1
            });
            
            const line = new THREE.Line(lineGeometry, lineMaterial);
            group.add(line);
        }
    }
    
    return group;
}