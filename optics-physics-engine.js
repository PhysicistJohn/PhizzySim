/**
 * Physically Accurate Optics Engine
 * Implements real physics laws for optical ray tracing
 */

class OpticsPhysicsEngine {
    constructor() {
        // Physical constants
        this.c = 299792458; // Speed of light in vacuum (m/s)
        this.n_air = 1.000293; // Refractive index of air
        this.n_glass = 1.52; // Typical glass refractive index
        this.n_water = 1.333; // Water refractive index
        
        // Material properties
        this.materials = {
            air: { n: 1.000293, absorption: 0 },
            glass: { n: 1.52, absorption: 0.01 },
            water: { n: 1.333, absorption: 0.02 },
            diamond: { n: 2.42, absorption: 0.001 }
        };
    }
    
    /**
     * Calculate reflection and refraction at interface using Fresnel equations
     * @param {Object} ray - Incident ray with direction vector
     * @param {Object} normal - Surface normal at intersection
     * @param {number} n1 - Refractive index of medium 1
     * @param {number} n2 - Refractive index of medium 2
     * @returns {Object} Reflected and refracted rays with intensities
     */
    calculateFresnelReflection(ray, normal, n1, n2) {
        // Normalize vectors
        const incident = this.normalize(ray);
        const norm = this.normalize(normal);
        
        // Calculate angle of incidence
        const cosTheta_i = -this.dot(incident, norm);
        
        // Check for total internal reflection
        const n_ratio = n1 / n2;
        const sin2Theta_t = n_ratio * n_ratio * (1 - cosTheta_i * cosTheta_i);
        
        if (sin2Theta_t > 1) {
            // Total internal reflection
            return {
                reflected: this.reflect(incident, norm),
                refracted: null,
                reflectance: 1.0,
                transmittance: 0.0
            };
        }
        
        // Calculate angle of refraction
        const cosTheta_t = Math.sqrt(1 - sin2Theta_t);
        
        // Fresnel equations for unpolarized light
        const r_perpendicular = (n1 * cosTheta_i - n2 * cosTheta_t) / 
                               (n1 * cosTheta_i + n2 * cosTheta_t);
        const r_parallel = (n2 * cosTheta_i - n1 * cosTheta_t) / 
                          (n2 * cosTheta_i + n1 * cosTheta_t);
        
        // Average reflectance for unpolarized light
        const reflectance = 0.5 * (r_perpendicular * r_perpendicular + 
                                  r_parallel * r_parallel);
        const transmittance = 1 - reflectance;
        
        // Calculate reflected ray
        const reflected = this.reflect(incident, norm);
        
        // Calculate refracted ray using Snell's law
        const refracted = {
            x: n_ratio * incident.x + (n_ratio * cosTheta_i - cosTheta_t) * norm.x,
            y: n_ratio * incident.y + (n_ratio * cosTheta_i - cosTheta_t) * norm.y
        };
        
        return {
            reflected: this.normalize(reflected),
            refracted: this.normalize(refracted),
            reflectance: reflectance,
            transmittance: transmittance
        };
    }
    
    /**
     * Calculate ray behavior at a lens using the thin lens equation
     * @param {Object} ray - Incident ray
     * @param {Object} lens - Lens properties (focal length, position, etc.)
     * @param {Object} intersection - Point where ray hits lens
     * @returns {Object} Refracted ray after passing through lens
     */
    calculateLensRefraction(ray, lens, intersection) {
        // For thin lens approximation
        const focalLength = lens.focalLength || 100; // pixels
        
        // Vector from lens center to intersection point
        const h = intersection.y - lens.y; // Height from optical axis
        
        // For a converging lens (positive focal length)
        // Ray parallel to axis passes through focal point
        // Ray through center passes undeviated
        
        // Calculate the angle the ray makes with the optical axis
        const incomingAngle = Math.atan2(ray.y, ray.x);
        
        // Apply lens equation for ray bending
        // This is simplified but physically motivated
        const deviation = -h / focalLength;
        const outgoingAngle = incomingAngle + deviation;
        
        return {
            x: Math.cos(outgoingAngle),
            y: Math.sin(outgoingAngle)
        };
    }
    
    /**
     * Calculate dispersion in a prism
     * @param {Object} ray - Incident ray
     * @param {Object} prism - Prism properties
     * @param {number} wavelength - Light wavelength in nm
     * @param {Object} intersection - Intersection point
     * @param {Object} normal - Surface normal
     * @returns {Object} Refracted ray with wavelength-dependent deviation
     */
    calculatePrismDispersion(ray, prism, wavelength, intersection, normal) {
        // Cauchy's equation for wavelength-dependent refractive index
        // n(λ) = A + B/λ² + C/λ⁴
        // For crown glass:
        const A = 1.5130;
        const B = 0.00355;
        const C = 0.00000420;
        const lambda_microns = wavelength / 1000; // Convert nm to microns
        
        const n_prism = A + B / (lambda_microns * lambda_microns) + 
                       C / Math.pow(lambda_microns, 4);
        
        // Use Snell's law with wavelength-dependent refractive index
        return this.calculateFresnelReflection(ray, normal, this.n_air, n_prism);
    }
    
    /**
     * Perfect specular reflection
     * @param {Object} incident - Incident ray direction
     * @param {Object} normal - Surface normal
     * @returns {Object} Reflected ray direction
     */
    reflect(incident, normal) {
        const dot = 2 * this.dot(incident, normal);
        return {
            x: incident.x - dot * normal.x,
            y: incident.y - dot * normal.y
        };
    }
    
    /**
     * Calculate diffraction through a slit
     * @param {Object} ray - Incident ray
     * @param {Object} slit - Slit properties (width, position)
     * @param {number} wavelength - Light wavelength in nm
     * @returns {Array} Array of diffracted rays with intensities
     */
    calculateSlitDiffraction(ray, slit, wavelength) {
        const slitWidth = slit.width || 20; // pixels
        const lambda = wavelength * 1e-9; // Convert to meters
        const a = slitWidth * 1e-3; // Convert pixels to approximate meters
        
        // Single slit diffraction pattern
        // Intensity I(θ) = I₀ * (sin(β)/β)² where β = (π*a*sin(θ))/λ
        
        const diffractionRays = [];
        const numRays = 5; // Number of diffraction orders to calculate
        
        for (let m = -numRays; m <= numRays; m++) {
            // Diffraction angle for minima: a*sin(θ) = m*λ
            const sinTheta = (m * lambda) / a;
            
            if (Math.abs(sinTheta) <= 1) {
                const theta = Math.asin(sinTheta);
                const beta = (Math.PI * a * sinTheta) / lambda;
                const intensity = m === 0 ? 1 : Math.pow(Math.sin(beta) / beta, 2);
                
                diffractionRays.push({
                    direction: {
                        x: Math.cos(theta),
                        y: Math.sin(theta)
                    },
                    intensity: intensity
                });
            }
        }
        
        return diffractionRays;
    }
    
    /**
     * Calculate interference pattern for double slit
     * @param {Object} ray - Incident ray
     * @param {Object} doubleSlit - Double slit properties
     * @param {number} wavelength - Light wavelength
     * @returns {Function} Intensity distribution function
     */
    calculateDoubleSlitInterference(ray, doubleSlit, wavelength) {
        const d = doubleSlit.separation || 100; // Slit separation in pixels
        const a = doubleSlit.slitWidth || 20; // Individual slit width
        const lambda = wavelength * 1e-9;
        
        return (angle) => {
            const sinTheta = Math.sin(angle);
            
            // Double slit interference: cos²(πd*sin(θ)/λ)
            const delta = (Math.PI * d * sinTheta) / lambda;
            const interference = Math.cos(delta) * Math.cos(delta);
            
            // Single slit diffraction envelope: (sin(β)/β)²
            const beta = (Math.PI * a * sinTheta) / lambda;
            const diffraction = beta === 0 ? 1 : Math.pow(Math.sin(beta) / beta, 2);
            
            return interference * diffraction;
        };
    }
    
    // Utility functions
    normalize(vector) {
        const mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        return {
            x: vector.x / mag,
            y: vector.y / mag
        };
    }
    
    dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    }
    
    /**
     * Get wavelength-dependent properties
     * @param {number} wavelength - Wavelength in nm
     * @returns {Object} Optical properties
     */
    getOpticalProperties(wavelength) {
        // Photon energy E = hc/λ
        const h = 6.626e-34; // Planck's constant
        const energy = (h * this.c) / (wavelength * 1e-9);
        
        return {
            energy: energy,
            frequency: this.c / (wavelength * 1e-9),
            color: this.wavelengthToRGB(wavelength)
        };
    }
    
    /**
     * Convert wavelength to RGB color (physically accurate)
     * Based on CIE 1931 color matching functions
     */
    wavelengthToRGB(wavelength) {
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
}

// Export for use in optics bench
window.OpticsPhysicsEngine = OpticsPhysicsEngine;