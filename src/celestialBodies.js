import * as THREE from 'three';

export function createEarth() {
    const geometry = new THREE.SphereGeometry(6.371e6, 128, 128);
    const material = new THREE.MeshPhongMaterial({
        color: 0x2233ff,
        emissive: 0x112244,
        shininess: 10,
        map: createEarthTexture(),
        bumpMap: createEarthBumpMap(),
        bumpScale: 100000,
        specularMap: createSpecularMap(),
        specular: new THREE.Color('grey')
    });
    
    const earth = new THREE.Mesh(geometry, material);
    earth.castShadow = true;
    earth.receiveShadow = true;
    
    return earth;
}

export function createMoon() {
    const geometry = new THREE.SphereGeometry(1.737e6, 64, 64);
    const material = new THREE.MeshPhongMaterial({
        color: 0xaaaaaa,
        emissive: 0x222222,
        shininess: 5,
        map: createMoonTexture()
    });
    
    const moon = new THREE.Mesh(geometry, material);
    moon.castShadow = true;
    moon.receiveShadow = true;
    
    return moon;
}

export function createSun() {
    const geometry = new THREE.SphereGeometry(6.96e8, 64, 64);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 1
    });
    
    const sun = new THREE.Mesh(geometry, material);
    
    const glowGeometry = new THREE.SphereGeometry(6.96e8 * 1.3, 64, 64);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    sun.add(glow);
    
    return sun;
}

export function createStars() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    
    for (let i = 0; i < 10000; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = 1e12;
        
        vertices.push(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
        
        const color = new THREE.Color();
        color.setHSL(0.6 * Math.random(), 0.7, 0.9);
        colors.push(color.r, color.g, color.b);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 1e9,  // Star size for distant viewing
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        sizeAttenuation: false  // Stars stay same size regardless of distance
    });
    
    return new THREE.Points(geometry, material);
}

function createEarthTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.1, '#aaddff');
    gradient.addColorStop(0.3, '#0066cc');
    gradient.addColorStop(0.5, '#004499');
    gradient.addColorStop(0.7, '#0066cc');
    gradient.addColorStop(0.9, '#aaddff');
    gradient.addColorStop(1, '#ffffff');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < 7; i++) {
        const x = Math.random() * canvas.width;
        const y = canvas.height * (0.3 + Math.random() * 0.4);
        const width = Math.random() * 400 + 200;
        const height = Math.random() * 200 + 100;
        
        ctx.fillStyle = `hsl(${Math.random() * 60 + 60}, 50%, 40%)`;
        ctx.beginPath();
        ctx.ellipse(x, y, width, height, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    
    return new THREE.CanvasTexture(canvas);
}

function createEarthBumpMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < 5; i++) {
        const x = Math.random() * canvas.width;
        const y = canvas.height * (0.3 + Math.random() * 0.4);
        const width = Math.random() * 200 + 100;
        const height = Math.random() * 100 + 50;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(width, height));
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#000000');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x, y, width, height, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    
    return new THREE.CanvasTexture(canvas);
}

function createSpecularMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.3, '#ffffff');
    gradient.addColorStop(0.5, '#ffffff');
    gradient.addColorStop(0.7, '#ffffff');
    gradient.addColorStop(1, '#000000');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < 7; i++) {
        const x = Math.random() * canvas.width;
        const y = canvas.height * (0.3 + Math.random() * 0.4);
        const width = Math.random() * 400 + 200;
        const height = Math.random() * 200 + 100;
        
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(x, y, width, height, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    
    return new THREE.CanvasTexture(canvas);
}

function createMoonTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 20 + 5;
        const brightness = Math.random() * 100 + 100;
        
        ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    return new THREE.CanvasTexture(canvas);
}