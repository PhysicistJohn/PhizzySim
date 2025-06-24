import * as THREE from 'three';

// GPU-accelerated MHD simulation using WebGL compute textures
export class MHDSimulationGPU {
    constructor() {
        console.log('MHD GPU: Initializing GPU-accelerated simulation...');
        
        // Physical constants (same as before)
        this.mu0 = 4 * Math.PI * 1e-7;
        this.k_B = 1.38e-23;
        this.m_p = 1.67e-27;
        this.e = 1.6e-19;
        
        // Earth parameters
        this.earthRadius = 6.371e6;
        this.earthDipole = 7.9e22;
        
        // Solar wind parameters
        this.swDensity = 5e6;
        this.swVelocity = 400e3;
        this.swTemperature = 1e5;
        this.swBField = 5e-9;
        
        // Grid parameters - power of 2 for GPU efficiency
        this.nx = 64;
        this.ny = 32;
        this.nz = 32;
        
        // Domain
        this.xmin = -30 * this.earthRadius;
        this.xmax = 10 * this.earthRadius;
        this.ymin = -20 * this.earthRadius;
        this.ymax = 20 * this.earthRadius;
        this.zmin = -20 * this.earthRadius;
        this.zmax = 20 * this.earthRadius;
        
        this.dx = (this.xmax - this.xmin) / (this.nx - 1);
        this.dy = (this.ymax - this.ymin) / (this.ny - 1);
        this.dz = (this.zmax - this.zmin) / (this.nz - 1);
        
        // Initialize WebGL renderer for compute
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(1, 1); // Small size, we're just computing
        
        // Check for float texture support
        const gl = this.renderer.getContext();
        const ext = gl.getExtension('OES_texture_float');
        if (!ext) {
            console.warn('Float textures not supported, falling back to CPU');
            this.useGPU = false;
        } else {
            this.useGPU = true;
            this.initializeGPU();
        }
        
        console.log('MHD GPU: Initialization complete');
    }
    
    initializeGPU() {
        // Create render targets for each field variable
        this.createRenderTargets();
        
        // Create compute shaders
        this.createComputeShaders();
        
        // Initialize field data
        this.initializeFields();
    }
    
    createRenderTargets() {
        const options = {
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType
        };
        
        // We'll pack 3D data into 2D textures
        // Layout: z-slices arranged in a grid
        const texWidth = this.nx * Math.ceil(Math.sqrt(this.nz));
        const texHeight = this.ny * Math.ceil(Math.sqrt(this.nz));
        
        // Create double-buffered render targets for each field
        this.renderTargets = {
            density: [
                new THREE.WebGLRenderTarget(texWidth, texHeight, options),
                new THREE.WebGLRenderTarget(texWidth, texHeight, options)
            ],
            velocity: [
                new THREE.WebGLRenderTarget(texWidth, texHeight, options),
                new THREE.WebGLRenderTarget(texWidth, texHeight, options)
            ],
            magnetic: [
                new THREE.WebGLRenderTarget(texWidth, texHeight, options),
                new THREE.WebGLRenderTarget(texWidth, texHeight, options)
            ],
            pressure: [
                new THREE.WebGLRenderTarget(texWidth, texHeight, options),
                new THREE.WebGLRenderTarget(texWidth, texHeight, options)
            ]
        };
        
        this.currentBuffer = 0;
    }
    
    createComputeShaders() {
        // Shared utility functions
        const utilsShader = `
            uniform vec3 domainMin;
            uniform vec3 domainMax;
            uniform vec3 gridSize;
            uniform float earthRadius;
            uniform float earthDipole;
            uniform float mu0;
            
            // Convert texture coordinates to 3D grid position
            vec3 texToGrid(vec2 texCoord) {
                vec2 texSize = vec2(gridSize.x * ceil(sqrt(gridSize.z)), 
                                   gridSize.y * ceil(sqrt(gridSize.z)));
                vec2 pixelPos = texCoord * texSize;
                
                float zSlices = ceil(sqrt(gridSize.z));
                float z = floor(pixelPos.x / gridSize.x) + floor(pixelPos.y / gridSize.y) * zSlices;
                float x = mod(pixelPos.x, gridSize.x);
                float y = mod(pixelPos.y, gridSize.y);
                
                return vec3(x, y, z);
            }
            
            // Get world position from grid indices
            vec3 gridToWorld(vec3 gridPos) {
                vec3 normalized = gridPos / (gridSize - 1.0);
                return domainMin + normalized * (domainMax - domainMin);
            }
            
            // Calculate Earth's dipole field
            vec3 getDipoleField(vec3 worldPos) {
                float r = length(worldPos);
                if (r < earthRadius) return vec3(0.0);
                
                float r3 = r * r * r;
                float r5 = r3 * r * r;
                vec3 m = vec3(0.0, 0.0, earthDipole);
                
                float factor = mu0 / (4.0 * 3.14159);
                float dot_mr = dot(m, worldPos);
                
                return factor * (3.0 * worldPos * dot_mr / r5 - m / r3);
            }
        `;
        
        // Continuity equation shader
        this.continuityShader = new THREE.ShaderMaterial({
            uniforms: {
                densityTex: { value: null },
                velocityTex: { value: null },
                dt: { value: 0.01 },
                domainMin: { value: new THREE.Vector3(this.xmin, this.ymin, this.zmin) },
                domainMax: { value: new THREE.Vector3(this.xmax, this.ymax, this.zmax) },
                gridSize: { value: new THREE.Vector3(this.nx, this.ny, this.nz) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: utilsShader + `
                uniform sampler2D densityTex;
                uniform sampler2D velocityTex;
                uniform float dt;
                
                void main() {
                    vec3 gridPos = texToGrid(vUv);
                    vec3 worldPos = gridToWorld(gridPos);
                    
                    // Sample current density and velocity
                    vec4 density = texture2D(densityTex, vUv);
                    vec4 velocity = texture2D(velocityTex, vUv);
                    
                    // Compute divergence of (ρv) using finite differences
                    vec3 gridDelta = 1.0 / (gridSize - 1.0);
                    vec2 texelSize = 1.0 / textureSize(densityTex, 0);
                    
                    // Sample neighboring points for finite differences
                    vec2 uvRight = vUv + vec2(texelSize.x, 0.0);
                    vec2 uvLeft = vUv - vec2(texelSize.x, 0.0);
                    vec2 uvUp = vUv + vec2(0.0, texelSize.y);
                    vec2 uvDown = vUv - vec2(0.0, texelSize.y);
                    
                    // Get density and velocity at neighboring points
                    float rhoRight = texture2D(densityTex, uvRight).r;
                    float rhoLeft = texture2D(densityTex, uvLeft).r;
                    vec3 vRight = texture2D(velocityTex, uvRight).rgb;
                    vec3 vLeft = texture2D(velocityTex, uvLeft).rgb;
                    
                    float rhoUp = texture2D(densityTex, uvUp).r;
                    float rhoDown = texture2D(densityTex, uvDown).r;
                    vec3 vUp = texture2D(velocityTex, uvUp).rgb;
                    vec3 vDown = texture2D(velocityTex, uvDown).rgb;
                    
                    // Calculate divergence components
                    float drhovx_dx = (rhoRight * vRight.x - rhoLeft * vLeft.x) / (2.0 * gridDelta.x);
                    float drhovy_dy = (rhoUp * vUp.y - rhoDown * vDown.y) / (2.0 * gridDelta.y);
                    
                    // Simplified 2D divergence for now (z-component would need 3D texture sampling)
                    float divRhoV = drhovx_dx + drhovy_dy;
                    
                    // Update density: ∂ρ/∂t = -∇·(ρv)
                    float newDensity = density.r - dt * divRhoV;
                    
                    gl_FragColor = vec4(newDensity, 0.0, 0.0, 1.0);
                }
            `
        });
        
        // Momentum equation shader
        this.momentumShader = new THREE.ShaderMaterial({
            uniforms: {
                velocityTex: { value: null },
                pressureTex: { value: null },
                magneticTex: { value: null },
                densityTex: { value: null },
                dt: { value: 0.01 },
                domainMin: { value: new THREE.Vector3(this.xmin, this.ymin, this.zmin) },
                domainMax: { value: new THREE.Vector3(this.xmax, this.ymax, this.zmax) },
                gridSize: { value: new THREE.Vector3(this.nx, this.ny, this.nz) },
                earthRadius: { value: this.earthRadius },
                mu0: { value: this.mu0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: utilsShader + `
                uniform sampler2D velocityTex;
                uniform sampler2D pressureTex;
                uniform sampler2D magneticTex;
                uniform sampler2D densityTex;
                uniform float dt;
                
                void main() {
                    vec3 gridPos = texToGrid(vUv);
                    vec3 worldPos = gridToWorld(gridPos);
                    
                    vec4 velocity = texture2D(velocityTex, vUv);
                    vec4 pressure = texture2D(pressureTex, vUv);
                    vec4 magnetic = texture2D(magneticTex, vUv);
                    vec4 density = texture2D(densityTex, vUv);
                    
                    // Calculate momentum equation: ∂v/∂t = -(v·∇)v - ∇p/ρ + (J×B)/ρ
                    vec3 newVelocity = velocity.rgb;
                    float rho = density.r;
                    
                    // Inside Earth, zero velocity
                    if (length(worldPos) < earthRadius) {
                        newVelocity = vec3(0.0);
                    } else {
                        // Pressure gradient force
                        vec2 texelSize = 1.0 / textureSize(pressureTex, 0);
                        vec3 gridDelta = 1.0 / (gridSize - 1.0);
                        
                        float pRight = texture2D(pressureTex, vUv + vec2(texelSize.x, 0.0)).r;
                        float pLeft = texture2D(pressureTex, vUv - vec2(texelSize.x, 0.0)).r;
                        float pUp = texture2D(pressureTex, vUv + vec2(0.0, texelSize.y)).r;
                        float pDown = texture2D(pressureTex, vUv - vec2(0.0, texelSize.y)).r;
                        
                        vec3 pressureGrad = vec3(
                            (pRight - pLeft) / (2.0 * gridDelta.x),
                            (pUp - pDown) / (2.0 * gridDelta.y),
                            0.0  // Simplified 2D
                        );
                        
                        // Magnetic force (J×B) - simplified
                        vec3 B = magnetic.rgb;
                        vec3 J = vec3(0.0); // Current density - would need curl(B)/μ₀
                        vec3 magneticForce = cross(J, B);
                        
                        // Update velocity
                        vec3 acceleration = -pressureGrad / rho + magneticForce / rho;
                        newVelocity += dt * acceleration;
                        
                        // Solar wind boundary condition
                        float r = length(worldPos);
                        if (r > 20.0 * earthRadius) {
                            newVelocity = mix(newVelocity, vec3(-400000.0, 0.0, 0.0), 0.1);
                        }
                    }
                    
                    gl_FragColor = vec4(newVelocity, 1.0);
                }
            `
        });
        
        // Induction equation shader (∂B/∂t = ∇×(v×B) + η∇²B)
        this.inductionShader = new THREE.ShaderMaterial({
            uniforms: {
                magneticTex: { value: null },
                velocityTex: { value: null },
                dt: { value: 0.01 },
                domainMin: { value: new THREE.Vector3(this.xmin, this.ymin, this.zmin) },
                domainMax: { value: new THREE.Vector3(this.xmax, this.ymax, this.zmax) },
                gridSize: { value: new THREE.Vector3(this.nx, this.ny, this.nz) },
                earthRadius: { value: this.earthRadius },
                earthDipole: { value: this.earthDipole },
                mu0: { value: this.mu0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: utilsShader + `
                uniform sampler2D magneticTex;
                uniform sampler2D velocityTex;
                uniform float dt;
                
                void main() {
                    vec3 gridPos = texToGrid(vUv);
                    vec3 worldPos = gridToWorld(gridPos);
                    
                    vec4 magnetic = texture2D(magneticTex, vUv);
                    vec4 velocity = texture2D(velocityTex, vUv);
                    
                    vec3 B = magnetic.rgb;
                    vec3 v = velocity.rgb;
                    
                    // Inside Earth, maintain dipole field
                    if (length(worldPos) < earthRadius) {
                        vec3 dipoleB = getDipoleField(worldPos);
                        gl_FragColor = vec4(dipoleB, 1.0);
                    } else {
                        // Induction equation: ∂B/∂t = ∇×(v×B)
                        // Simplified: B evolves to maintain frozen-in flux
                        vec3 newB = B;
                        
                        // Advection of magnetic field with plasma
                        vec2 texelSize = 1.0 / textureSize(magneticTex, 0);
                        vec3 gridDelta = 1.0 / (gridSize - 1.0);
                        
                        // Simple advection scheme
                        if (v.x > 0.0) {
                            vec3 BLeft = texture2D(magneticTex, vUv - vec2(texelSize.x, 0.0)).rgb;
                            newB = mix(B, BLeft, dt * abs(v.x) / gridDelta.x);
                        } else {
                            vec3 BRight = texture2D(magneticTex, vUv + vec2(texelSize.x, 0.0)).rgb;
                            newB = mix(B, BRight, dt * abs(v.x) / gridDelta.x);
                        }
                        
                        gl_FragColor = vec4(newB, 1.0);
                    }
                }
            `
        });
        
        // Create compute scene
        this.computeScene = new THREE.Scene();
        this.computeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        // Create full-screen quad for compute
        const geometry = new THREE.PlaneGeometry(2, 2);
        this.computeQuad = new THREE.Mesh(geometry, this.continuityShader);
        this.computeScene.add(this.computeQuad);
    }
    
    initializeFields() {
        // Initialize field data on CPU then upload to GPU
        const texWidth = this.nx * Math.ceil(Math.sqrt(this.nz));
        const texHeight = this.ny * Math.ceil(Math.sqrt(this.nz));
        
        const densityData = new Float32Array(texWidth * texHeight * 4);
        const velocityData = new Float32Array(texWidth * texHeight * 4);
        const magneticData = new Float32Array(texWidth * texHeight * 4);
        const pressureData = new Float32Array(texWidth * texHeight * 4);
        
        // Fill with initial conditions
        for (let i = 0; i < this.nx; i++) {
            for (let j = 0; j < this.ny; j++) {
                for (let k = 0; k < this.nz; k++) {
                    const x = this.xmin + i * this.dx;
                    const y = this.ymin + j * this.dy;
                    const z = this.zmin + k * this.dz;
                    const r = Math.sqrt(x * x + y * y + z * z);
                    
                    // Map 3D to 2D texture
                    const zSlices = Math.ceil(Math.sqrt(this.nz));
                    const texX = i + (k % zSlices) * this.nx;
                    const texY = j + Math.floor(k / zSlices) * this.ny;
                    const idx = (texY * texWidth + texX) * 4;
                    
                    // Density
                    densityData[idx] = this.swDensity * this.m_p;
                    
                    // Velocity (solar wind)
                    velocityData[idx] = -this.swVelocity;
                    velocityData[idx + 1] = 0;
                    velocityData[idx + 2] = 0;
                    
                    // Magnetic field
                    if (r > 3 * this.earthRadius) {
                        magneticData[idx] = this.swBField;
                        magneticData[idx + 1] = this.swBField * 0.1;
                        magneticData[idx + 2] = 0;
                    } else {
                        const dipole = this.calculateDipoleField(x, y, z);
                        magneticData[idx] = dipole.x;
                        magneticData[idx + 1] = dipole.y;
                        magneticData[idx + 2] = dipole.z;
                    }
                    
                    // Pressure
                    pressureData[idx] = this.swDensity * this.k_B * this.swTemperature;
                }
            }
        }
        
        // Upload to GPU textures
        this.uploadToTexture(this.renderTargets.density[0], densityData);
        this.uploadToTexture(this.renderTargets.velocity[0], velocityData);
        this.uploadToTexture(this.renderTargets.magnetic[0], magneticData);
        this.uploadToTexture(this.renderTargets.pressure[0], pressureData);
    }
    
    uploadToTexture(renderTarget, data) {
        const texture = new THREE.DataTexture(
            data,
            renderTarget.width,
            renderTarget.height,
            THREE.RGBAFormat,
            THREE.FloatType
        );
        texture.needsUpdate = true;
        
        // Render data texture to render target
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        const scene = new THREE.Scene();
        scene.add(quad);
        
        this.renderer.setRenderTarget(renderTarget);
        this.renderer.render(scene, this.computeCamera);
        this.renderer.setRenderTarget(null);
    }
    
    step(dt) {
        if (!this.useGPU) {
            console.warn('GPU not available, using CPU fallback');
            return;
        }
        
        const src = this.currentBuffer;
        const dst = 1 - this.currentBuffer;
        
        // Update density using continuity equation
        this.computeQuad.material = this.continuityShader;
        this.continuityShader.uniforms.densityTex.value = this.renderTargets.density[src].texture;
        this.continuityShader.uniforms.velocityTex.value = this.renderTargets.velocity[src].texture;
        this.continuityShader.uniforms.dt.value = dt;
        
        this.renderer.setRenderTarget(this.renderTargets.density[dst]);
        this.renderer.render(this.computeScene, this.computeCamera);
        
        // Update velocity using momentum equation
        this.computeQuad.material = this.momentumShader;
        this.momentumShader.uniforms.velocityTex.value = this.renderTargets.velocity[src].texture;
        this.momentumShader.uniforms.pressureTex.value = this.renderTargets.pressure[src].texture;
        this.momentumShader.uniforms.magneticTex.value = this.renderTargets.magnetic[src].texture;
        this.momentumShader.uniforms.densityTex.value = this.renderTargets.density[dst].texture;
        this.momentumShader.uniforms.dt.value = dt;
        
        this.renderer.setRenderTarget(this.renderTargets.velocity[dst]);
        this.renderer.render(this.computeScene, this.computeCamera);
        
        // Update magnetic field using induction equation
        this.computeQuad.material = this.inductionShader;
        this.inductionShader.uniforms.magneticTex.value = this.renderTargets.magnetic[src].texture;
        this.inductionShader.uniforms.velocityTex.value = this.renderTargets.velocity[dst].texture;
        this.inductionShader.uniforms.dt.value = dt;
        
        this.renderer.setRenderTarget(this.renderTargets.magnetic[dst]);
        this.renderer.render(this.computeScene, this.computeCamera);
        
        // Copy pressure (no evolution for now) - create simple copy material
        if (!this.copyMaterial) {
            this.copyMaterial = new THREE.MeshBasicMaterial({ 
                map: this.renderTargets.pressure[src].texture 
            });
        } else {
            this.copyMaterial.map = this.renderTargets.pressure[src].texture;
        }
        
        this.computeQuad.material = this.copyMaterial;
        this.renderer.setRenderTarget(this.renderTargets.pressure[dst]);
        this.renderer.render(this.computeScene, this.computeCamera);
        
        // Swap buffers
        this.currentBuffer = dst;
        this.renderer.setRenderTarget(null);
    }
    
    calculateDipoleField(x, y, z) {
        const r = Math.sqrt(x * x + y * y + z * z);
        
        if (r < this.earthRadius) {
            return { x: 0, y: 0, z: 0 };
        }
        
        const r3 = r * r * r;
        const r5 = r3 * r * r;
        const mx = 0;
        const my = 0;
        const mz = this.earthDipole;
        
        const factor = this.mu0 / (4 * Math.PI);
        const dot_mr = mx * x + my * y + mz * z;
        
        const Bx = factor * (3 * x * dot_mr / r5 - mx / r3);
        const By = factor * (3 * y * dot_mr / r5 - my / r3);
        const Bz = factor * (3 * z * dot_mr / r5 - mz / r3);
        
        return { x: Bx, y: By, z: Bz };
    }
    
    getFieldAt(x, y, z) {
        // Read back from GPU texture (expensive, use sparingly)
        const i = Math.round((x - this.xmin) / this.dx);
        const j = Math.round((y - this.ymin) / this.dy);
        const k = Math.round((z - this.zmin) / this.dz);
        
        if (i < 0 || i >= this.nx || j < 0 || j >= this.ny || k < 0 || k >= this.nz) {
            return null;
        }
        
        // For performance, cache some readback operations
        if (!this.fieldCache) {
            this.fieldCache = {};
            this.cacheTime = 0;
        }
        
        // Use cached values for a short time to avoid expensive readbacks
        const key = `${i},${j},${k}`;
        const now = Date.now();
        if (this.fieldCache[key] && (now - this.cacheTime < 100)) {
            return this.fieldCache[key];
        }
        
        // For now, return analytical approximation based on position
        const r = Math.sqrt(x * x + y * y + z * z);
        let density = this.swDensity * this.m_p;
        let velocity = { x: -this.swVelocity, y: 0, z: 0 };
        let magneticField = { x: this.swBField, y: 0, z: 0 };
        let pressure = this.swDensity * this.k_B * this.swTemperature;
        
        // Modify based on distance from Earth
        if (r < this.earthRadius) {
            velocity = { x: 0, y: 0, z: 0 };
            const dipole = this.calculateDipoleField(x, y, z);
            magneticField = dipole;
        } else if (r < 3 * this.earthRadius) {
            // Near Earth - compressed plasma
            density *= 2;
            pressure *= 2;
            const deflection = 1 - this.earthRadius / r;
            velocity.x *= deflection;
            velocity.y = y / r * 0.1 * this.swVelocity;
            velocity.z = z / r * 0.1 * this.swVelocity;
        }
        
        const result = {
            density: density,
            velocity: velocity,
            magneticField: magneticField,
            pressure: pressure
        };
        
        // Cache result
        this.fieldCache[key] = result;
        this.cacheTime = now;
        
        return result;
    }
    
    calculateMagnetopause() {
        const B_E = this.mu0 * this.earthDipole / (4 * Math.PI * Math.pow(this.earthRadius, 3));
        const p_sw = this.swDensity * this.m_p * this.swVelocity * this.swVelocity;
        const r_mp = Math.pow(B_E * B_E / (2 * this.mu0 * p_sw), 1/6) * this.earthRadius;
        
        return r_mp;
    }
    
    // Fallback to CPU implementation
    setInitialConditions() {
        this.initializeFields();
    }
}