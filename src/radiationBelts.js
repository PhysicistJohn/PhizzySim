import * as THREE from 'three';

export class VanAllenBelts {
    constructor() {
        this.earthRadius = 6.371e6;
        
        // Inner belt parameters (mainly protons)
        this.innerBelt = {
            minRadius: 1.2 * this.earthRadius,
            maxRadius: 2.5 * this.earthRadius,
            intensity: 1.0,
            particleType: 'proton'
        };
        
        // Outer belt parameters (mainly electrons)
        this.outerBelt = {
            minRadius: 3.0 * this.earthRadius,
            maxRadius: 7.0 * this.earthRadius,
            intensity: 0.8,
            particleType: 'electron'
        };
        
        // Slot region between belts (low particle density)
        this.slotRegion = {
            minRadius: this.innerBelt.maxRadius,
            maxRadius: this.outerBelt.minRadius,
            intensity: 0.1
        };
        
        this.particleDensity = this.calculateParticleDensity.bind(this);
    }
    
    // Calculate particle density at given position
    calculateParticleDensity(position) {
        const r = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
        const rNorm = r / this.earthRadius;
        
        // Calculate L-shell parameter (simplified)
        const L = rNorm;
        
        let density = 0;
        let beltType = 'none';
        
        // Inner belt
        if (L >= this.innerBelt.minRadius / this.earthRadius && L <= this.innerBelt.maxRadius / this.earthRadius) {
            const center = (this.innerBelt.minRadius + this.innerBelt.maxRadius) / (2 * this.earthRadius);
            const width = (this.innerBelt.maxRadius - this.innerBelt.minRadius) / (2 * this.earthRadius);
            density = this.innerBelt.intensity * Math.exp(-Math.pow((L - center) / width, 2));
            beltType = 'inner';
        }
        
        // Outer belt
        if (L >= this.outerBelt.minRadius / this.earthRadius && L <= this.outerBelt.maxRadius / this.earthRadius) {
            const center = (this.outerBelt.minRadius + this.outerBelt.maxRadius) / (2 * this.earthRadius);
            const width = (this.outerBelt.maxRadius - this.outerBelt.minRadius) / (2 * this.earthRadius);
            const outerDensity = this.outerBelt.intensity * Math.exp(-Math.pow((L - center) / width, 2));
            
            if (outerDensity > density) {
                density = outerDensity;
                beltType = 'outer';
            }
        }
        
        // Slot region
        if (L >= this.slotRegion.minRadius / this.earthRadius && L <= this.slotRegion.maxRadius / this.earthRadius) {
            if (density < this.slotRegion.intensity) {
                density = this.slotRegion.intensity;
                beltType = 'slot';
            }
        }
        
        return { density, beltType, L };
    }
    
    // Get radiation belt particle flux
    getParticleFlux(position, particleType = 'electron') {
        const { density, beltType } = this.calculateParticleDensity(position);
        
        // Different particle types have different distributions
        let flux = density;
        
        if (particleType === 'proton' && beltType === 'inner') {
            flux *= 2.0; // Higher proton flux in inner belt
        } else if (particleType === 'electron' && beltType === 'outer') {
            flux *= 3.0; // Higher electron flux in outer belt
        } else if (beltType === 'slot') {
            flux *= 0.1; // Much lower flux in slot region
        }
        
        return flux;
    }
    
    // Calculate drift motion of particles
    getDriftVelocity(position, particleType = 'electron') {
        const r = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
        
        if (r < this.earthRadius) return { x: 0, y: 0, z: 0 };
        
        // Simplified drift velocity calculation
        const { density } = this.calculateParticleDensity(position);
        
        if (density < 0.1) return { x: 0, y: 0, z: 0 };
        
        // Electrons drift eastward, protons drift westward
        const driftSpeed = particleType === 'electron' ? 1e4 : -1e4; // m/s
        
        // Calculate azimuthal drift direction
        const rho = Math.sqrt(position.x * position.x + position.y * position.y);
        if (rho === 0) return { x: 0, y: 0, z: 0 };
        
        return {
            x: -position.y * driftSpeed / rho,
            y: position.x * driftSpeed / rho,
            z: 0
        };
    }
}

export function createRadiationBeltVisualization(belts) {
    const group = new THREE.Group();
    
    // Create inner belt visualization
    const innerBeltGeometry = new THREE.RingGeometry(
        belts.innerBelt.minRadius,
        belts.innerBelt.maxRadius,
        32, 16
    );
    
    const innerBeltMaterial = new THREE.MeshBasicMaterial({
        color: 0xff8888,  // Softer red
        transparent: true,
        opacity: 0.05,  // Extremely transparent
        side: THREE.DoubleSide
    });
    
    const innerBelt = new THREE.Mesh(innerBeltGeometry, innerBeltMaterial);
    innerBelt.rotation.x = Math.PI / 2;
    group.add(innerBelt);
    
    // Create outer belt visualization
    const outerBeltGeometry = new THREE.RingGeometry(
        belts.outerBelt.minRadius,
        belts.outerBelt.maxRadius,
        32, 16
    );
    
    const outerBeltMaterial = new THREE.MeshBasicMaterial({
        color: 0x8888ff,  // Softer blue
        transparent: true,
        opacity: 0.05,  // Extremely transparent
        side: THREE.DoubleSide
    });
    
    const outerBelt = new THREE.Mesh(outerBeltGeometry, outerBeltMaterial);
    outerBelt.rotation.x = Math.PI / 2;
    group.add(outerBelt);
    
    // Create 3D torus representations
    const innerTorusGeometry = new THREE.TorusGeometry(
        (belts.innerBelt.minRadius + belts.innerBelt.maxRadius) / 2,
        (belts.innerBelt.maxRadius - belts.innerBelt.minRadius) / 4,
        16, 32
    );
    
    const innerTorusMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6666,
        transparent: true,
        opacity: 0.2,
        wireframe: true
    });
    
    const innerTorus = new THREE.Mesh(innerTorusGeometry, innerTorusMaterial);
    group.add(innerTorus);
    
    const outerTorusGeometry = new THREE.TorusGeometry(
        (belts.outerBelt.minRadius + belts.outerBelt.maxRadius) / 2,
        (belts.outerBelt.maxRadius - belts.outerBelt.minRadius) / 4,
        16, 32
    );
    
    const outerTorusMaterial = new THREE.MeshBasicMaterial({
        color: 0x6666ff,
        transparent: true,
        opacity: 0.2,
        wireframe: true
    });
    
    const outerTorus = new THREE.Mesh(outerTorusGeometry, outerTorusMaterial);
    group.add(outerTorus);
    
    // Create particle density visualization
    const densityParticles = [];
    const densityGeometry = new THREE.BufferGeometry();
    const densityPositions = [];
    const densityColors = [];
    
    // Sample points in 3D space around Earth
    for (let i = 0; i < 500; i++) {  // Much fewer particles
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = belts.earthRadius * (1.5 + Math.random() * 6); // 1.5 to 7.5 Earth radii
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        
        const position = { x, y, z };
        const { density, beltType } = belts.calculateParticleDensity(position);
        
        if (density > 0.1) { // Only show significant density
            densityPositions.push(x, y, z);
            
            // Color based on belt type
            let color = new THREE.Color();
            if (beltType === 'inner') {
                color.setRGB(1, 0.2, 0.2); // Red for inner belt
            } else if (beltType === 'outer') {
                color.setRGB(0.2, 0.2, 1); // Blue for outer belt
            } else {
                color.setRGB(0.5, 0.5, 0.5); // Gray for slot region
            }
            
            // Adjust opacity based on density
            const intensity = Math.min(density, 1.0);
            densityColors.push(color.r * intensity, color.g * intensity, color.b * intensity);
        }
    }
    
    densityGeometry.setAttribute('position', new THREE.Float32BufferAttribute(densityPositions, 3));
    densityGeometry.setAttribute('color', new THREE.Float32BufferAttribute(densityColors, 3));
    
    const densityMaterial = new THREE.PointsMaterial({
        size: 5e2,  // Tiny particle size
        vertexColors: true,
        transparent: true,
        opacity: 0.1,  // Very low opacity
        blending: THREE.AdditiveBlending,
        sizeAttenuation: false  // Particles stay same size regardless of distance
    });
    
    const densityPoints = new THREE.Points(densityGeometry, densityMaterial);
    group.add(densityPoints);
    
    return group;
}

// Aurora visualization based on radiation belt particles
export function createAuroraVisualization(belts) {
    const group = new THREE.Group();
    
    // Create aurora zones at magnetic poles
    const auroraGeometry = new THREE.RingGeometry(
        belts.earthRadius * 1.05,
        belts.earthRadius * 1.15,
        32, 8
    );
    
    // Northern aurora
    const northernAuroraMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    
    const northernAurora = new THREE.Mesh(auroraGeometry, northernAuroraMaterial);
    northernAurora.position.z = belts.earthRadius * 0.9;
    northernAurora.rotation.x = Math.PI / 2;
    group.add(northernAurora);
    
    // Southern aurora
    const southernAuroraMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0088,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    
    const southernAurora = new THREE.Mesh(auroraGeometry, southernAuroraMaterial);
    southernAurora.position.z = -belts.earthRadius * 0.9;
    southernAurora.rotation.x = Math.PI / 2;
    group.add(southernAurora);
    
    // Animate aurora
    group.userData = {
        animate: function(time) {
            const intensity = 0.3 + 0.2 * Math.sin(time * 2);
            northernAuroraMaterial.opacity = intensity;
            southernAuroraMaterial.opacity = intensity;
            
            // Slight rotation to simulate aurora movement
            northernAurora.rotation.z = Math.sin(time * 0.5) * 0.1;
            southernAurora.rotation.z = Math.sin(time * 0.5 + Math.PI) * 0.1;
        }
    };
    
    return group;
}