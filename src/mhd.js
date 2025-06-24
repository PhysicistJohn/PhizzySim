// Magnetohydrodynamics (MHD) simulation core
// Combines Maxwell's equations with fluid dynamics for plasma physics

export class MHDSimulation {
    constructor() {
        console.log('MHD: Starting initialization...');
        // Physical constants
        this.mu0 = 4 * Math.PI * 1e-7;  // Permeability of free space (T·m/A)
        this.epsilon0 = 8.854e-12;       // Permittivity of free space (F/m)
        this.c = 3e8;                    // Speed of light (m/s)
        this.k_B = 1.38e-23;             // Boltzmann constant (J/K)
        this.m_p = 1.67e-27;             // Proton mass (kg)
        this.e = 1.6e-19;                // Elementary charge (C)
        
        // Earth parameters
        this.earthRadius = 6.371e6;      // Earth radius (m)
        this.earthDipole = 7.9e22;       // Earth magnetic dipole moment (A·m²)
        
        // Solar wind parameters (typical values)
        this.swDensity = 5e6;            // Solar wind density (particles/m³)
        this.swVelocity = 400e3;         // Solar wind velocity (m/s)
        this.swTemperature = 1e5;        // Solar wind temperature (K)
        this.swBField = 5e-9;            // Interplanetary magnetic field (T)
        
        // Grid parameters - reduced for faster initialization
        this.nx = 32;                    // Grid points in x
        this.ny = 16;                    // Grid points in y
        this.nz = 16;                    // Grid points in z
        
        // Spatial domain (in Earth radii)
        this.xmin = -30 * this.earthRadius;
        this.xmax = 10 * this.earthRadius;
        this.ymin = -20 * this.earthRadius;
        this.ymax = 20 * this.earthRadius;
        this.zmin = -20 * this.earthRadius;
        this.zmax = 20 * this.earthRadius;
        
        this.dx = (this.xmax - this.xmin) / (this.nx - 1);
        this.dy = (this.ymax - this.ymin) / (this.ny - 1);
        this.dz = (this.zmax - this.zmin) / (this.nz - 1);
        
        // Initialize fields
        console.log('MHD: Initializing fields...');
        this.initializeFields();
        console.log('MHD: Initialization complete');
    }
    
    initializeFields() {
        // Allocate 3D arrays for MHD variables
        this.rho = [];      // Density
        this.vx = [];       // Velocity x-component
        this.vy = [];       // Velocity y-component
        this.vz = [];       // Velocity z-component
        this.Bx = [];       // Magnetic field x-component
        this.By = [];       // Magnetic field y-component
        this.Bz = [];       // Magnetic field z-component
        this.p = [];        // Pressure
        this.Ex = [];       // Electric field x-component
        this.Ey = [];       // Electric field y-component
        this.Ez = [];       // Electric field z-component
        
        // Initialize arrays
        for (let i = 0; i < this.nx; i++) {
            this.rho[i] = [];
            this.vx[i] = [];
            this.vy[i] = [];
            this.vz[i] = [];
            this.Bx[i] = [];
            this.By[i] = [];
            this.Bz[i] = [];
            this.p[i] = [];
            this.Ex[i] = [];
            this.Ey[i] = [];
            this.Ez[i] = [];
            
            for (let j = 0; j < this.ny; j++) {
                this.rho[i][j] = new Float32Array(this.nz);
                this.vx[i][j] = new Float32Array(this.nz);
                this.vy[i][j] = new Float32Array(this.nz);
                this.vz[i][j] = new Float32Array(this.nz);
                this.Bx[i][j] = new Float32Array(this.nz);
                this.By[i][j] = new Float32Array(this.nz);
                this.Bz[i][j] = new Float32Array(this.nz);
                this.p[i][j] = new Float32Array(this.nz);
                this.Ex[i][j] = new Float32Array(this.nz);
                this.Ey[i][j] = new Float32Array(this.nz);
                this.Ez[i][j] = new Float32Array(this.nz);
            }
        }
        
        // Set initial conditions
        this.setInitialConditions();
    }
    
    setInitialConditions() {
        for (let i = 0; i < this.nx; i++) {
            for (let j = 0; j < this.ny; j++) {
                for (let k = 0; k < this.nz; k++) {
                    const x = this.xmin + i * this.dx;
                    const y = this.ymin + j * this.dy;
                    const z = this.zmin + k * this.dz;
                    const r = Math.sqrt(x * x + y * y + z * z);
                    
                    // Initialize with solar wind values
                    this.rho[i][j][k] = this.swDensity * this.m_p;  // Convert to kg/m³
                    this.vx[i][j][k] = -this.swVelocity;  // Flow in -x direction
                    this.vy[i][j][k] = 0;
                    this.vz[i][j][k] = 0;
                    
                    // Initialize pressure from ideal gas law
                    const n = this.swDensity;  // Number density
                    this.p[i][j][k] = n * this.k_B * this.swTemperature;
                    
                    // Initialize magnetic field
                    if (r > 3 * this.earthRadius) {
                        // Interplanetary magnetic field (Parker spiral)
                        this.Bx[i][j][k] = this.swBField;
                        this.By[i][j][k] = this.swBField * 0.1;  // Small y-component
                        this.Bz[i][j][k] = 0;
                    } else {
                        // Earth's dipole field
                        const dipoleField = this.calculateDipoleField(x, y, z);
                        this.Bx[i][j][k] = dipoleField.x;
                        this.By[i][j][k] = dipoleField.y;
                        this.Bz[i][j][k] = dipoleField.z;
                    }
                    
                    // Initialize electric field (v × B)
                    this.Ex[i][j][k] = this.vy[i][j][k] * this.Bz[i][j][k] - this.vz[i][j][k] * this.By[i][j][k];
                    this.Ey[i][j][k] = this.vz[i][j][k] * this.Bx[i][j][k] - this.vx[i][j][k] * this.Bz[i][j][k];
                    this.Ez[i][j][k] = this.vx[i][j][k] * this.By[i][j][k] - this.vy[i][j][k] * this.Bx[i][j][k];
                }
            }
        }
    }
    
    calculateDipoleField(x, y, z) {
        const r = Math.sqrt(x * x + y * y + z * z);
        
        if (r < this.earthRadius) {
            return { x: 0, y: 0, z: 0 };  // No field inside Earth
        }
        
        // Dipole field in spherical coordinates
        const r3 = r * r * r;
        const r5 = r3 * r * r;
        
        // Magnetic moment components (aligned with z-axis)
        const mx = 0;
        const my = 0;
        const mz = this.earthDipole;
        
        // Dipole field formula
        const factor = this.mu0 / (4 * Math.PI);
        const dot_mr = mx * x + my * y + mz * z;
        
        const Bx = factor * (3 * x * dot_mr / r5 - mx / r3);
        const By = factor * (3 * y * dot_mr / r5 - my / r3);
        const Bz = factor * (3 * z * dot_mr / r5 - mz / r3);
        
        return { x: Bx, y: By, z: Bz };
    }
    
    // MHD equations solver using finite difference method
    step(dt) {
        // Optimized step function - only calculate essential physics
        
        // Simple advection for demonstration
        const newVx = this.allocate3DArray();
        const newVy = this.allocate3DArray();
        const newVz = this.allocate3DArray();
        
        // Simplified physics loop
        for (let i = 1; i < this.nx - 1; i++) {
            for (let j = 1; j < this.ny - 1; j++) {
                for (let k = 1; k < this.nz - 1; k++) {
                    const x = this.xmin + i * this.dx;
                    const y = this.ymin + j * this.dy;
                    const z = this.zmin + k * this.dz;
                    const r = Math.sqrt(x * x + y * y + z * z);
                    
                    if (r < this.earthRadius) {
                        // Inside Earth - no flow
                        newVx[i][j][k] = 0;
                        newVy[i][j][k] = 0;
                        newVz[i][j][k] = 0;
                    } else if (r < 3 * this.earthRadius) {
                        // Near Earth - deflected flow
                        const deflection = 1 - this.earthRadius / r;
                        newVx[i][j][k] = this.vx[i][j][k] * deflection;
                        newVy[i][j][k] = this.vy[i][j][k] + y / r * 0.1 * this.swVelocity;
                        newVz[i][j][k] = this.vz[i][j][k] + z / r * 0.1 * this.swVelocity;
                    } else {
                        // Far field - maintain solar wind
                        newVx[i][j][k] = -this.swVelocity;
                        newVy[i][j][k] = 0;
                        newVz[i][j][k] = 0;
                    }
                }
            }
        }
        
        // Update velocity fields
        this.vx = newVx;
        this.vy = newVy;
        this.vz = newVz;
        
        // Apply boundary conditions
        this.applyBoundaryConditions();
    }
    
    calculateDivergence(fx, fy, fz, i, j, k) {
        const dfx_dx = (fx[i+1][j][k] - fx[i-1][j][k]) / (2 * this.dx);
        const dfy_dy = (fy[i][j+1][k] - fy[i][j-1][k]) / (2 * this.dy);
        const dfz_dz = (fz[i][j][k+1] - fz[i][j][k-1]) / (2 * this.dz);
        
        return dfx_dx + dfy_dy + dfz_dz;
    }
    
    calculateCurl(field, i, j, k) {
        // Calculate ∇ × field
        const dfz_dy = (field.z[i][j+1][k] - field.z[i][j-1][k]) / (2 * this.dy);
        const dfy_dz = (field.y[i][j][k+1] - field.y[i][j][k-1]) / (2 * this.dz);
        const dfx_dz = (field.x[i][j][k+1] - field.x[i][j][k-1]) / (2 * this.dz);
        const dfz_dx = (field.z[i+1][j][k] - field.z[i-1][j][k]) / (2 * this.dx);
        const dfy_dx = (field.y[i+1][j][k] - field.y[i-1][j][k]) / (2 * this.dx);
        const dfx_dy = (field.x[i][j+1][k] - field.x[i][j-1][k]) / (2 * this.dy);
        
        return {
            x: dfz_dy - dfy_dz,
            y: dfx_dz - dfz_dx,
            z: dfy_dx - dfx_dy
        };
    }
    
    calculateCrossProduct(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    }
    
    calculateMomentumDerivative(component, i, j, k, ptotal) {
        const rho = this.rho[i][j][k];
        const vx = this.vx[i][j][k];
        const vy = this.vy[i][j][k];
        const vz = this.vz[i][j][k];
        
        // For now, use simplified momentum equation
        // Full implementation would include all terms
        let dpdt = 0;
        
        if (component === 'x') {
            // Pressure gradient only for now
            const dp_dx = (this.p[i+1][j][k] - this.p[i-1][j][k]) / (2 * this.dx);
            dpdt = -dp_dx / rho;
        } else if (component === 'y') {
            const dp_dy = (this.p[i][j+1][k] - this.p[i][j-1][k]) / (2 * this.dy);
            dpdt = -dp_dy / rho;
        } else if (component === 'z') {
            const dp_dz = (this.p[i][j][k+1] - this.p[i][j][k-1]) / (2 * this.dz);
            dpdt = -dp_dz / rho;
        }
        
        return dpdt;
    }
    
    partialDerivative(field, direction, i, j, k) {
        if (direction === 'x') {
            return (field[i+1][j][k] - field[i-1][j][k]) / (2 * this.dx);
        } else if (direction === 'y') {
            return (field[i][j+1][k] - field[i][j-1][k]) / (2 * this.dy);
        } else if (direction === 'z') {
            return (field[i][j][k+1] - field[i][j][k-1]) / (2 * this.dz);
        }
        return 0;
    }
    
    multiplyFields(field1, field2) {
        const result = this.allocate3DArray();
        for (let i = 0; i < this.nx; i++) {
            for (let j = 0; j < this.ny; j++) {
                for (let k = 0; k < this.nz; k++) {
                    result[i][j][k] = field1[i][j][k] * field2[i][j][k];
                }
            }
        }
        return result;
    }
    
    allocate3DArray() {
        const array = [];
        for (let i = 0; i < this.nx; i++) {
            array[i] = [];
            for (let j = 0; j < this.ny; j++) {
                array[i][j] = new Float32Array(this.nz);
            }
        }
        return array;
    }
    
    applyBoundaryConditions() {
        // Inflow boundary (x = xmin): Solar wind
        for (let j = 0; j < this.ny; j++) {
            for (let k = 0; k < this.nz; k++) {
                this.rho[0][j][k] = this.swDensity * this.m_p;
                this.vx[0][j][k] = -this.swVelocity;
                this.vy[0][j][k] = 0;
                this.vz[0][j][k] = 0;
                this.Bx[0][j][k] = this.swBField;
                this.By[0][j][k] = this.swBField * 0.1;
                this.Bz[0][j][k] = 0;
                this.p[0][j][k] = this.swDensity * this.k_B * this.swTemperature;
            }
        }
        
        // Outflow boundaries: Zero gradient
        for (let j = 0; j < this.ny; j++) {
            for (let k = 0; k < this.nz; k++) {
                // x = xmax
                this.copyBoundary(this.nx - 1, j, k, this.nx - 2, j, k);
                
                // y boundaries
                if (j === 0) {
                    this.copyBoundary(0, 0, k, 0, 1, k);
                }
                if (j === this.ny - 1) {
                    this.copyBoundary(0, this.ny - 1, k, 0, this.ny - 2, k);
                }
                
                // z boundaries
                if (k === 0) {
                    this.copyBoundary(0, j, 0, 0, j, 1);
                }
                if (k === this.nz - 1) {
                    this.copyBoundary(0, j, this.nz - 1, 0, j, this.nz - 2);
                }
            }
        }
        
        // Inner boundary (Earth surface): Perfectly conducting
        for (let i = 0; i < this.nx; i++) {
            for (let j = 0; j < this.ny; j++) {
                for (let k = 0; k < this.nz; k++) {
                    const x = this.xmin + i * this.dx;
                    const y = this.ymin + j * this.dy;
                    const z = this.zmin + k * this.dz;
                    const r = Math.sqrt(x * x + y * y + z * z);
                    
                    if (r < this.earthRadius) {
                        // No flow inside Earth
                        this.vx[i][j][k] = 0;
                        this.vy[i][j][k] = 0;
                        this.vz[i][j][k] = 0;
                        
                        // Dipole field inside
                        const dipole = this.calculateDipoleField(x, y, z);
                        this.Bx[i][j][k] = dipole.x;
                        this.By[i][j][k] = dipole.y;
                        this.Bz[i][j][k] = dipole.z;
                    }
                }
            }
        }
    }
    
    copyBoundary(i1, j1, k1, i2, j2, k2) {
        this.rho[i1][j1][k1] = this.rho[i2][j2][k2];
        this.vx[i1][j1][k1] = this.vx[i2][j2][k2];
        this.vy[i1][j1][k1] = this.vy[i2][j2][k2];
        this.vz[i1][j1][k1] = this.vz[i2][j2][k2];
        this.Bx[i1][j1][k1] = this.Bx[i2][j2][k2];
        this.By[i1][j1][k1] = this.By[i2][j2][k2];
        this.Bz[i1][j1][k1] = this.Bz[i2][j2][k2];
        this.p[i1][j1][k1] = this.p[i2][j2][k2];
    }
    
    // Calculate magnetopause standoff distance
    calculateMagnetopause() {
        // Chapman-Ferraro formula
        const B_E = this.mu0 * this.earthDipole / (4 * Math.PI * Math.pow(this.earthRadius, 3));
        const p_sw = this.swDensity * this.m_p * this.swVelocity * this.swVelocity;
        const r_mp = Math.pow(B_E * B_E / (2 * this.mu0 * p_sw), 1/6) * this.earthRadius;
        
        return r_mp;
    }
    
    // Get field values at a specific point
    getFieldAt(x, y, z) {
        // Find nearest grid point
        const i = Math.round((x - this.xmin) / this.dx);
        const j = Math.round((y - this.ymin) / this.dy);
        const k = Math.round((z - this.zmin) / this.dz);
        
        if (i < 0 || i >= this.nx || j < 0 || j >= this.ny || k < 0 || k >= this.nz) {
            return null;
        }
        
        return {
            density: this.rho[i][j][k],
            velocity: {
                x: this.vx[i][j][k],
                y: this.vy[i][j][k],
                z: this.vz[i][j][k]
            },
            magneticField: {
                x: this.Bx[i][j][k],
                y: this.By[i][j][k],
                z: this.Bz[i][j][k]
            },
            electricField: {
                x: this.Ex[i][j][k],
                y: this.Ey[i][j][k],
                z: this.Ez[i][j][k]
            },
            pressure: this.p[i][j][k]
        };
    }
}