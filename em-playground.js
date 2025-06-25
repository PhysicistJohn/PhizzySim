class EMFieldPlayground {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.charges = [];
        this.testParticles = [];
        this.fieldLines = [];
        
        this.mode = 'positive'; // positive, negative, particle, drag
        this.showField = true;
        this.showParticles = true;
        this.paused = false;
        
        this.draggedCharge = null;
        this.mousePos = { x: 0, y: 0 };
        
        this.k = 8.99e9; // Coulomb's constant (scaled for visualization)
        this.scale = 1e-6; // Scale factor for forces
        
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
    }
    
    setupControls() {
        document.getElementById('addPositive').onclick = () => this.setMode('positive');
        document.getElementById('addNegative').onclick = () => this.setMode('negative');
        document.getElementById('addParticle').onclick = () => this.setMode('particle');
        document.getElementById('dragMode').onclick = () => this.setMode('drag');
        
        document.getElementById('toggleField').onclick = () => this.toggleField();
        document.getElementById('toggleParticles').onclick = () => this.toggleParticles();
        document.getElementById('clearAll').onclick = () => this.clearAll();
        
        document.getElementById('pausePlay').onclick = () => this.togglePause();
        document.getElementById('resetSim').onclick = () => this.reset();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    setMode(newMode) {
        this.mode = newMode;
        
        // Update button styles
        document.querySelectorAll('.charge-controls button').forEach(btn => btn.classList.remove('active'));
        
        const buttonMap = {
            'positive': 'addPositive',
            'negative': 'addNegative',
            'particle': 'addParticle',
            'drag': 'dragMode'
        };
        
        document.getElementById(buttonMap[newMode]).classList.add('active');
        
        // Update cursor
        this.canvas.style.cursor = newMode === 'drag' ? 'grab' : 'crosshair';
    }
    
    handleClick(e) {
        if (this.mode === 'drag') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.addElement(x, y);
    }
    
    handleMouseDown(e) {
        if (this.mode !== 'drag') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Find nearest charge within grab distance
        let nearestCharge = null;
        let minDistance = 30; // pixels
        
        this.charges.forEach(charge => {
            const distance = Math.sqrt((x - charge.x) ** 2 + (y - charge.y) ** 2);
            if (distance < minDistance) {
                nearestCharge = charge;
                minDistance = distance;
            }
        });
        
        if (nearestCharge) {
            this.draggedCharge = nearestCharge;
            this.canvas.style.cursor = 'grabbing';
        }
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos.x = e.clientX - rect.left;
        this.mousePos.y = e.clientY - rect.top;
        
        if (this.draggedCharge) {
            this.draggedCharge.x = this.mousePos.x;
            this.draggedCharge.y = this.mousePos.y;
            this.updateFieldLines();
        }
    }
    
    handleMouseUp(e) {
        if (this.draggedCharge) {
            this.draggedCharge = null;
            this.canvas.style.cursor = this.mode === 'drag' ? 'grab' : 'crosshair';
        }
    }
    
    addElement(x, y) {
        switch (this.mode) {
            case 'positive':
                this.charges.push({
                    x, y,
                    charge: 1,
                    color: '#ff4757',
                    radius: 15
                });
                break;
                
            case 'negative':
                this.charges.push({
                    x, y,
                    charge: -1,
                    color: '#3742fa',
                    radius: 15
                });
                break;
                
            case 'particle':
                this.testParticles.push({
                    x, y,
                    vx: 0,
                    vy: 0,
                    charge: 0.1,
                    mass: 1,
                    color: '#2ed573',
                    radius: 8,
                    trail: []
                });
                break;
        }
        
        this.updateFieldLines();
    }
    
    updateFieldLines() {
        this.fieldLines = [];
        
        if (!this.showField || this.charges.length === 0) return;
        
        // Create field lines starting from positive charges
        this.charges.forEach(charge => {
            if (charge.charge > 0) {
                // Create 8 field lines radiating from each positive charge
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * 2 * Math.PI;
                    const fieldLine = this.traceFieldLine(
                        charge.x + Math.cos(angle) * 20,
                        charge.y + Math.sin(angle) * 20
                    );
                    if (fieldLine.length > 1) {
                        this.fieldLines.push(fieldLine);
                    }
                }
            }
        });
    }
    
    traceFieldLine(startX, startY) {
        const line = [];
        let x = startX;
        let y = startY;
        const stepSize = 5;
        const maxSteps = 200;
        
        for (let step = 0; step < maxSteps; step++) {
            const field = this.getElectricField(x, y);
            const magnitude = Math.sqrt(field.Ex ** 2 + field.Ey ** 2);
            
            if (magnitude < 1e-10) break; // Too weak
            
            // Normalize and step
            const Ex = field.Ex / magnitude;
            const Ey = field.Ey / magnitude;
            
            line.push({ x, y });
            
            x += Ex * stepSize;
            y += Ey * stepSize;
            
            // Check if we're out of bounds or hit a charge
            if (x < 0 || x > this.canvas.width || y < 0 || y > this.canvas.height) break;
            
            // Check if we hit a negative charge
            let hitCharge = false;
            this.charges.forEach(charge => {
                if (charge.charge < 0) {
                    const distance = Math.sqrt((x - charge.x) ** 2 + (y - charge.y) ** 2);
                    if (distance < charge.radius) {
                        hitCharge = true;
                    }
                }
            });
            
            if (hitCharge) break;
        }
        
        return line;
    }
    
    getElectricField(x, y) {
        let Ex = 0;
        let Ey = 0;
        
        this.charges.forEach(charge => {
            const dx = x - charge.x;
            const dy = y - charge.y;
            const distance = Math.sqrt(dx ** 2 + dy ** 2);
            
            if (distance > 0.1) { // Avoid division by zero
                const field = (this.k * charge.charge) / (distance ** 2);
                Ex += field * (dx / distance);
                Ey += field * (dy / distance);
            }
        });
        
        return { Ex: Ex * this.scale, Ey: Ey * this.scale };
    }
    
    updateParticles(dt) {
        if (this.paused) return;
        
        this.testParticles.forEach(particle => {
            const field = this.getElectricField(particle.x, particle.y);
            
            // F = qE, a = F/m
            const ax = (field.Ex * particle.charge) / particle.mass;
            const ay = (field.Ey * particle.charge) / particle.mass;
            
            // Update velocity and position
            particle.vx += ax * dt;
            particle.vy += ay * dt;
            
            // Damping to prevent runaway velocities
            particle.vx *= 0.99;
            particle.vy *= 0.99;
            
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            
            // Add to trail
            particle.trail.push({ x: particle.x, y: particle.y });
            if (particle.trail.length > 50) {
                particle.trail.shift();
            }
            
            // Boundary conditions (bounce)
            if (particle.x < 0 || particle.x > this.canvas.width) {
                particle.vx *= -0.8;
                particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
            }
            if (particle.y < 0 || particle.y > this.canvas.height) {
                particle.vy *= -0.8;
                particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
            }
        });
    }
    
    render() {
        // Clear canvas with fade effect
        this.ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw field lines
        if (this.showField) {
            this.ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
            this.ctx.lineWidth = 1;
            
            this.fieldLines.forEach(line => {
                if (line.length < 2) return;
                
                this.ctx.beginPath();
                this.ctx.moveTo(line[0].x, line[0].y);
                for (let i = 1; i < line.length; i++) {
                    this.ctx.lineTo(line[i].x, line[i].y);
                }
                this.ctx.stroke();
                
                // Draw arrows
                for (let i = 10; i < line.length; i += 20) {
                    const p1 = line[i - 1];
                    const p2 = line[i];
                    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                    
                    this.ctx.save();
                    this.ctx.translate(p2.x, p2.y);
                    this.ctx.rotate(angle);
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, 0);
                    this.ctx.lineTo(-8, -3);
                    this.ctx.lineTo(-8, 3);
                    this.ctx.closePath();
                    this.ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
                    this.ctx.fill();
                    this.ctx.restore();
                }
            });
        }
        
        // Draw charges
        this.charges.forEach(charge => {
            // Glow effect
            this.ctx.save();
            this.ctx.shadowColor = charge.color;
            this.ctx.shadowBlur = 20;
            
            this.ctx.beginPath();
            this.ctx.arc(charge.x, charge.y, charge.radius, 0, 2 * Math.PI);
            this.ctx.fillStyle = charge.color;
            this.ctx.fill();
            
            this.ctx.restore();
            
            // Charge symbol
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(charge.charge > 0 ? '+' : '−', charge.x, charge.y);
        });
        
        // Draw test particles
        if (this.showParticles) {
            this.testParticles.forEach(particle => {
                // Draw trail
                if (particle.trail.length > 1) {
                    this.ctx.strokeStyle = 'rgba(46, 213, 115, 0.3)';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
                    for (let i = 1; i < particle.trail.length; i++) {
                        this.ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
                    }
                    this.ctx.stroke();
                }
                
                // Draw particle
                this.ctx.save();
                this.ctx.shadowColor = particle.color;
                this.ctx.shadowBlur = 15;
                
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.radius, 0, 2 * Math.PI);
                this.ctx.fillStyle = particle.color;
                this.ctx.fill();
                
                this.ctx.restore();
            });
        }
    }
    
    toggleField() {
        this.showField = !this.showField;
        document.getElementById('toggleField').textContent = `Field Lines: ${this.showField ? 'ON' : 'OFF'}`;
        this.updateFieldLines();
    }
    
    toggleParticles() {
        this.showParticles = !this.showParticles;
        document.getElementById('toggleParticles').textContent = `Particles: ${this.showParticles ? 'ON' : 'OFF'}`;
    }
    
    togglePause() {
        this.paused = !this.paused;
        document.getElementById('pausePlay').textContent = this.paused ? 'Play' : 'Pause';
    }
    
    clearAll() {
        this.charges = [];
        this.testParticles = [];
        this.fieldLines = [];
        this.updateFieldLines();
    }
    
    reset() {
        this.clearAll();
        this.paused = false;
        document.getElementById('pausePlay').textContent = 'Pause';
    }
    
    animate() {
        const dt = 0.016; // ~60fps
        
        this.updateParticles(dt);
        this.render();
        
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize the playground
const playground = new EMFieldPlayground();