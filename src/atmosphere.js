import * as THREE from 'three';

export function createAtmosphere() {
    const vertexShader = `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    const fragmentShader = `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            vec3 atmosphere = vec3(0.3, 0.6, 1.0) * intensity;
            
            float height = length(vPosition) - 6.371e6;
            float density = exp(-height / 8500.0);
            
            gl_FragColor = vec4(atmosphere, density * intensity);
        }
    `;
    
    const geometry = new THREE.SphereGeometry(6.371e6 * 1.1, 64, 64);
    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true
    });
    
    return new THREE.Mesh(geometry, material);
}