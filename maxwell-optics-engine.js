/**
 * Maxwell Equations-based Optics Engine
 * Professional-grade optical simulation starting from first principles
 * 
 * Maxwell's Equations (in vacuum):
 * ∇·E = ρ/ε₀           (Gauss's law)
 * ∇·B = 0             (No magnetic monopoles)
 * ∇×E = -∂B/∂t        (Faraday's law)
 * ∇×B = μ₀j + μ₀ε₀∂E/∂t (Ampère-Maxwell law)
 * 
 * Wave equation: ∇²E = μ₀ε₀∂²E/∂t²
 */

class MaxwellOpticsEngine {
    constructor() {
        // Fundamental physical constants (SI units)
        this.c = 299792458;           // Speed of light in vacuum (m/s)
        this.h = 6.62607015e-34;      // Planck's constant (J·s)
        this.ε0 = 8.8541878128e-12;   // Permittivity of free space (F/m)
        this.μ0 = 1.25663706212e-6;   // Permeability of free space (H/m)
        
        // Material database with wavelength-dependent properties
        this.materials = {
            vacuum: {
                name: 'Vacuum',
                sellmeierCoeffs: null,
                n: () => 1.0,
                absorption: () => 0
            },
            air: {
                name: 'Air (STP)',
                sellmeierCoeffs: null,
                n: (λ) => 1.000293, // Simplified, could use full dispersion formula
                absorption: () => 0
            },
            BK7: {
                name: 'BK7 Glass',
                // Sellmeier coefficients for BK7 (Schott)
                sellmeierCoeffs: {
                    B1: 1.03961212,
                    B2: 0.231792344,
                    B3: 1.01046945,
                    C1: 0.00600069867,
                    C2: 0.0200179144,
                    C3: 103.560653
                },
                n: function(λ) { return MaxwellOpticsEngine.sellmeier(λ, this.sellmeierCoeffs); },
                absorption: (λ) => 0.001 // Simplified absorption
            },
            fusedSilica: {
                name: 'Fused Silica',
                sellmeierCoeffs: {
                    B1: 0.6961663,
                    B2: 0.4079426,
                    B3: 0.8974794,
                    C1: 0.0046791,
                    C2: 0.0135120,
                    C3: 97.9340
                },
                n: function(λ) { return MaxwellOpticsEngine.sellmeier(λ, this.sellmeierCoeffs); },
                absorption: (λ) => 0.0001
            },
            SF11: {
                name: 'SF11 Dense Flint',
                sellmeierCoeffs: {
                    B1: 1.73759695,
                    B2: 0.313747346,
                    B3: 1.89878101,
                    C1: 0.013188707,
                    C2: 0.0623068142,
                    C3: 155.23629
                },
                n: function(λ) { return MaxwellOpticsEngine.sellmeier(λ, this.sellmeierCoeffs); },
                absorption: (λ) => 0.002
            }
        };
    }
    
    /**
     * Sellmeier equation for refractive index
     * n²(λ) = 1 + Σ(Bi·λ²/(λ² - Ci))
     * @param {number} λ - Wavelength in micrometers
     * @param {Object} coeffs - Sellmeier coefficients
     * @returns {number} Refractive index
     */
    static sellmeier(λ, coeffs) {
        const λ2 = λ * λ;
        const n2 = 1 + 
            (coeffs.B1 * λ2) / (λ2 - coeffs.C1) +
            (coeffs.B2 * λ2) / (λ2 - coeffs.C2) +
            (coeffs.B3 * λ2) / (λ2 - coeffs.C3);
        return Math.sqrt(n2);
    }
    
    /**
     * Electromagnetic field at a point
     * E(r,t) = E₀ · exp(i(k·r - ωt))
     */
    calculateField(position, time, wave) {
        const k = 2 * Math.PI / wave.wavelength; // Wave number
        const ω = 2 * Math.PI * this.c / wave.wavelength; // Angular frequency
        const phase = k * position - ω * time;
        
        return {
            E: {
                x: wave.E0.x * Math.cos(phase + wave.phase),
                y: wave.E0.y * Math.cos(phase + wave.phase),
                z: wave.E0.z * Math.cos(phase + wave.phase)
            },
            B: {
                // B = (k × E) / ω (for plane wave)
                x: (wave.k.y * wave.E0.z - wave.k.z * wave.E0.y) * Math.cos(phase + wave.phase) / ω,
                y: (wave.k.z * wave.E0.x - wave.k.x * wave.E0.z) * Math.cos(phase + wave.phase) / ω,
                z: (wave.k.x * wave.E0.y - wave.k.y * wave.E0.x) * Math.cos(phase + wave.phase) / ω
            }
        };
    }
    
    /**
     * Fresnel equations for reflection and transmission
     * Handles both s and p polarizations
     */
    fresnelCoefficients(θi, n1, n2, polarization = 'unpolarized') {
        // Snell's law: n1·sin(θi) = n2·sin(θt)
        const sinθt = (n1 / n2) * Math.sin(θi);
        
        // Check for total internal reflection
        if (sinθt > 1) {
            return {
                Rs: 1, Rp: 1, Ts: 0, Tp: 0,
                totalInternalReflection: true
            };
        }
        
        const θt = Math.asin(sinθt);
        const cosθi = Math.cos(θi);
        const cosθt = Math.cos(θt);
        
        // Fresnel coefficients for s-polarization (⊥ to plane of incidence)
        const rs = (n1 * cosθi - n2 * cosθt) / (n1 * cosθi + n2 * cosθt);
        const ts = (2 * n1 * cosθi) / (n1 * cosθi + n2 * cosθt);
        
        // Fresnel coefficients for p-polarization (∥ to plane of incidence)
        const rp = (n2 * cosθi - n1 * cosθt) / (n2 * cosθi + n1 * cosθt);
        const tp = (2 * n1 * cosθi) / (n2 * cosθi + n1 * cosθt);
        
        // Power coefficients (reflectance and transmittance)
        const Rs = rs * rs;
        const Rp = rp * rp;
        const Ts = (n2 * cosθt) / (n1 * cosθi) * ts * ts;
        const Tp = (n2 * cosθt) / (n1 * cosθi) * tp * tp;
        
        if (polarization === 'unpolarized') {
            return {
                R: (Rs + Rp) / 2,
                T: (Ts + Tp) / 2,
                θt: θt,
                totalInternalReflection: false
            };
        }
        
        return { rs, rp, ts, tp, Rs, Rp, Ts, Tp, θt, totalInternalReflection: false };
    }
    
    /**
     * Ray-surface intersection with proper vector math
     */
    rayIntersection(ray, surface) {
        // Ray: r = r0 + t·d
        // Surface defined by position, normal, and shape
        
        switch (surface.type) {
            case 'plane':
                return this.rayPlaneIntersection(ray, surface);
            case 'sphere':
                return this.raySphereIntersection(ray, surface);
            case 'asphere':
                return this.rayAsphereIntersection(ray, surface);
            default:
                return null;
        }
    }
    
    /**
     * Ray-plane intersection
     * Plane equation: (p - p0)·n = 0
     */
    rayPlaneIntersection(ray, plane) {
        const denominator = this.dot(ray.direction, plane.normal);
        
        if (Math.abs(denominator) < 1e-10) {
            return null; // Ray parallel to plane
        }
        
        const t = this.dot(this.subtract(plane.position, ray.origin), plane.normal) / denominator;
        
        if (t < 0) {
            return null; // Intersection behind ray origin
        }
        
        const intersectionPoint = this.add(ray.origin, this.scale(ray.direction, t));
        
        // Check if intersection is within plane bounds (if specified)
        if (plane.bounds) {
            const local = this.worldToLocal(intersectionPoint, plane);
            if (Math.abs(local.x) > plane.bounds.x || Math.abs(local.y) > plane.bounds.y) {
                return null;
            }
        }
        
        return {
            point: intersectionPoint,
            normal: plane.normal,
            distance: t,
            surface: plane
        };
    }
    
    /**
     * Ray-sphere intersection
     * Sphere equation: |p - c|² = r²
     */
    raySphereIntersection(ray, sphere) {
        const oc = this.subtract(ray.origin, sphere.center);
        const a = this.dot(ray.direction, ray.direction);
        const b = 2 * this.dot(oc, ray.direction);
        const c = this.dot(oc, oc) - sphere.radius * sphere.radius;
        
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) {
            return null; // No intersection
        }
        
        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
        
        const t = t1 > 0 ? t1 : t2;
        
        if (t < 0) {
            return null; // Both intersections behind ray
        }
        
        const intersectionPoint = this.add(ray.origin, this.scale(ray.direction, t));
        const normal = this.normalize(this.subtract(intersectionPoint, sphere.center));
        
        return {
            point: intersectionPoint,
            normal: normal,
            distance: t,
            surface: sphere
        };
    }
    
    /**
     * Ray-asphere intersection (more complex, used in high-end optics)
     * Asphere equation: z = cr²/(1 + √(1-(1+k)c²r²)) + Σ(Aᵢr^(2i))
     */
    rayAsphereIntersection(ray, asphere) {
        // Simplified for now - would need iterative solver
        // For production, use Newton-Raphson or similar
        return this.raySphereIntersection(ray, asphere); // Fallback to sphere
    }
    
    /**
     * Propagate ray through optical system
     */
    propagateRay(ray, surfaces, maxBounces = 100) {
        const path = [{
            point: ray.origin,
            direction: ray.direction,
            intensity: ray.intensity,
            wavelength: ray.wavelength,
            polarization: ray.polarization
        }];
        
        let currentRay = { ...ray };
        let bounces = 0;
        
        while (bounces < maxBounces) {
            // Find nearest intersection
            let nearestIntersection = null;
            let minDistance = Infinity;
            
            for (const surface of surfaces) {
                const intersection = this.rayIntersection(currentRay, surface);
                if (intersection && intersection.distance < minDistance) {
                    minDistance = intersection.distance;
                    nearestIntersection = intersection;
                }
            }
            
            if (!nearestIntersection) {
                break; // No more intersections
            }
            
            // Get material properties
            const n1 = nearestIntersection.surface.materialBefore.n(ray.wavelength / 1000); // Convert nm to μm
            const n2 = nearestIntersection.surface.materialAfter.n(ray.wavelength / 1000);
            
            // Calculate incident angle
            const cosθi = -this.dot(currentRay.direction, nearestIntersection.normal);
            const θi = Math.acos(Math.abs(cosθi));
            
            // Get Fresnel coefficients
            const fresnel = this.fresnelCoefficients(θi, n1, n2, currentRay.polarization);
            
            // Add intersection to path
            path.push({
                point: nearestIntersection.point,
                surface: nearestIntersection.surface,
                incidentAngle: θi,
                fresnel: fresnel
            });
            
            if (fresnel.totalInternalReflection || Math.random() < fresnel.R) {
                // Reflection
                currentRay.origin = nearestIntersection.point;
                currentRay.direction = this.reflect(currentRay.direction, nearestIntersection.normal);
                currentRay.intensity *= fresnel.R || 1;
            } else {
                // Refraction
                currentRay.origin = nearestIntersection.point;
                currentRay.direction = this.refract(currentRay.direction, nearestIntersection.normal, n1, n2);
                currentRay.intensity *= fresnel.T || 0;
            }
            
            // Move ray slightly forward to avoid self-intersection
            currentRay.origin = this.add(currentRay.origin, this.scale(currentRay.direction, 1e-6));
            
            bounces++;
        }
        
        return path;
    }
    
    /**
     * Refract ray using Snell's law in vector form
     */
    refract(incident, normal, n1, n2) {
        const n = n1 / n2;
        const cosI = -this.dot(normal, incident);
        const sinT2 = n * n * (1.0 - cosI * cosI);
        
        if (sinT2 > 1.0) {
            return this.reflect(incident, normal); // Total internal reflection
        }
        
        const cosT = Math.sqrt(1.0 - sinT2);
        return this.add(
            this.scale(incident, n),
            this.scale(normal, n * cosI - cosT)
        );
    }
    
    /**
     * Reflect ray
     */
    reflect(incident, normal) {
        return this.subtract(incident, this.scale(normal, 2 * this.dot(incident, normal)));
    }
    
    /**
     * Gaussian beam propagation (for laser sources)
     */
    gaussianBeam(z, w0, λ, P0 = 1) {
        const zR = Math.PI * w0 * w0 / λ; // Rayleigh range
        const w = w0 * Math.sqrt(1 + (z / zR) ** 2); // Beam radius
        const R = z * (1 + (zR / z) ** 2); // Radius of curvature
        const ψ = Math.atan(z / zR); // Gouy phase
        
        return {
            waist: w,
            curvature: R,
            gouyPhase: ψ,
            intensity: (r) => (2 * P0 / (Math.PI * w * w)) * Math.exp(-2 * r * r / (w * w))
        };
    }
    
    /**
     * Diffraction calculations using Huygens-Fresnel principle
     */
    fraunhoferDiffraction(aperture, λ, distance, observationPoint) {
        // Far-field diffraction pattern
        // U(P) = (1/iλz) ∬ U(x',y') exp(ik[(x-x')² + (y-y')²]/2z) dx'dy'
        
        // Simplified for common apertures
        switch (aperture.type) {
            case 'circular':
                return this.circularApertureDiffraction(aperture.radius, λ, distance, observationPoint);
            case 'slit':
                return this.slitDiffraction(aperture.width, λ, distance, observationPoint);
            case 'grating':
                return this.gratingDiffraction(aperture.period, aperture.slits, λ, distance, observationPoint);
            default:
                return 1; // No diffraction
        }
    }
    
    /**
     * Circular aperture diffraction (Airy pattern)
     */
    circularApertureDiffraction(radius, λ, distance, point) {
        const k = 2 * Math.PI / λ;
        const θ = Math.atan(point.r / distance);
        const x = k * radius * Math.sin(θ);
        
        if (x === 0) return 1;
        
        // Airy function: 2J₁(x)/x
        const J1 = this.besselJ1(x);
        return (2 * J1 / x) ** 2;
    }
    
    /**
     * Bessel function of the first kind (J₁)
     * Series expansion for small x, asymptotic for large x
     */
    besselJ1(x) {
        if (Math.abs(x) < 3) {
            // Series expansion
            let sum = 0;
            let term = x / 2;
            let n = 0;
            
            while (Math.abs(term) > 1e-10 && n < 20) {
                sum += term;
                n++;
                term *= -(x * x) / (4 * n * (n + 1));
            }
            
            return sum;
        } else {
            // Asymptotic expansion
            return Math.sqrt(2 / (Math.PI * x)) * Math.cos(x - 3 * Math.PI / 4);
        }
    }
    
    // Vector operations
    add(v1, v2) {
        return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
    }
    
    subtract(v1, v2) {
        return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
    }
    
    scale(v, s) {
        return { x: v.x * s, y: v.y * s, z: v.z * s };
    }
    
    dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }
    
    cross(v1, v2) {
        return {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
        };
    }
    
    normalize(v) {
        const mag = Math.sqrt(this.dot(v, v));
        return this.scale(v, 1 / mag);
    }
    
    magnitude(v) {
        return Math.sqrt(this.dot(v, v));
    }
    
    worldToLocal(point, surface) {
        // Transform world coordinates to surface-local coordinates
        // Simplified - would need full transformation matrix
        return {
            x: this.dot(this.subtract(point, surface.position), surface.tangentX || { x: 1, y: 0, z: 0 }),
            y: this.dot(this.subtract(point, surface.position), surface.tangentY || { x: 0, y: 1, z: 0 })
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MaxwellOpticsEngine;
}