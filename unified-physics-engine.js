/**
 * PhizzySim Unified Reality Engine
 * Revolutionary physics-math-simulation integration system
 * Connects the mathematical foundations with visual simulations
 */

class UnifiedPhysicsEngine {
    constructor() {
        this.equationEngine = new EquationEngine();
        this.analysisEngine = new AnalysisEngine();
        this.insightEngine = new InsightEngine();
        this.bridgeEngine = new CrossSimulatorBridge();
        
        this.activeSimulator = null;
        this.mathematicalContext = {};
        this.liveEquations = [];
        this.insightQueue = [];
        
        this.initializeEngine();
    }
    
    initializeEngine() {
        this.createEquationOverlay();
        this.createAnalysisPanel();
        this.createInsightStream();
        this.createMathematicalDNA();
        this.setupCrossSimulatorBridges();
    }
    
    // Connect to any simulator and extract its mathematical essence
    connectToSimulator(simulator, physicsType) {
        this.activeSimulator = simulator;
        this.mathematicalContext = this.extractMathematicalContext(physicsType);
        
        // Inject live equation display
        this.injectEquationOverlay(simulator);
        
        // Setup real-time mathematical analysis
        this.setupLiveMathAnalysis(simulator);
        
        // Enable cross-simulator bridges
        this.bridgeEngine.activateBridges(simulator, physicsType);
        
        console.log(`🧮 Unified Engine connected to ${physicsType} simulator`);
    }
    
    extractMathematicalContext(physicsType) {
        const contexts = {
            electromagnetic: {
                fundamentalEquations: [
                    { name: "Coulomb's Law", formula: "F = k(q₁q₂)/r²", variables: ['F', 'q1', 'q2', 'r'] },
                    { name: "Electric Field", formula: "E = F/q = kQ/r²", variables: ['E', 'F', 'q', 'Q', 'r'] },
                    { name: "Electric Potential", formula: "V = kQ/r", variables: ['V', 'Q', 'r'] },
                    { name: "Field Energy", formula: "U = ½ε₀E²", variables: ['U', 'E'] }
                ],
                derivedQuantities: ['force', 'field_strength', 'potential', 'energy'],
                physicalConstants: { k: 8.99e9, ε0: 8.85e-12 }
            },
            
            wave: {
                fundamentalEquations: [
                    { name: "Wave Equation", formula: "∂²ψ/∂t² = c²∇²ψ", variables: ['ψ', 't', 'c'] },
                    { name: "Sinusoidal Wave", formula: "y = A sin(kx - ωt + φ)", variables: ['A', 'k', 'ω', 't', 'φ'] },
                    { name: "Wave Speed", formula: "c = fλ = ω/k", variables: ['c', 'f', 'λ', 'ω', 'k'] },
                    { name: "Interference", formula: "I = I₁ + I₂ + 2√(I₁I₂)cos(δ)", variables: ['I', 'I1', 'I2', 'δ'] }
                ],
                derivedQuantities: ['amplitude', 'frequency', 'wavelength', 'phase', 'interference_pattern'],
                physicalConstants: { c: 3e8 }
            },
            
            projectile: {
                fundamentalEquations: [
                    { name: "Position X", formula: "x = v₀cos(θ)t", variables: ['x', 'v0', 'θ', 't'] },
                    { name: "Position Y", formula: "y = v₀sin(θ)t - ½gt²", variables: ['y', 'v0', 'θ', 't', 'g'] },
                    { name: "Velocity X", formula: "vₓ = v₀cos(θ)", variables: ['vx', 'v0', 'θ'] },
                    { name: "Velocity Y", formula: "vᵧ = v₀sin(θ) - gt", variables: ['vy', 'v0', 'θ', 't', 'g'] },
                    { name: "Range", formula: "R = v₀²sin(2θ)/g", variables: ['R', 'v0', 'θ', 'g'] },
                    { name: "Max Height", formula: "H = v₀²sin²(θ)/(2g)", variables: ['H', 'v0', 'θ', 'g'] }
                ],
                derivedQuantities: ['trajectory', 'range', 'max_height', 'flight_time'],
                physicalConstants: { g: 9.81 }
            },
            
            circuit: {
                fundamentalEquations: [
                    { name: "Ohm's Law", formula: "V = IR", variables: ['V', 'I', 'R'] },
                    { name: "Power", formula: "P = VI = I²R = V²/R", variables: ['P', 'V', 'I', 'R'] },
                    { name: "Kirchhoff Current", formula: "ΣI = 0", variables: ['I'] },
                    { name: "Kirchhoff Voltage", formula: "ΣV = 0", variables: ['V'] },
                    { name: "RC Circuit", formula: "V = V₀e^(-t/RC)", variables: ['V', 'V0', 't', 'R', 'C'] }
                ],
                derivedQuantities: ['current', 'voltage', 'resistance', 'power', 'energy'],
                physicalConstants: {}
            },
            
            pendulum: {
                fundamentalEquations: [
                    { name: "Simple Pendulum", formula: "T = 2π√(L/g)", variables: ['T', 'L', 'g'] },
                    { name: "Angular Frequency", formula: "ω = √(g/L)", variables: ['ω', 'g', 'L'] },
                    { name: "Position", formula: "θ = θ₀cos(ωt + φ)", variables: ['θ', 'θ0', 'ω', 't', 'φ'] },
                    { name: "Angular Velocity", formula: "dθ/dt = -θ₀ω sin(ωt + φ)", variables: ['θ', 't', 'ω', 'φ'] },
                    { name: "Energy", formula: "E = ½mL²(dθ/dt)² + mgL(1-cos(θ))", variables: ['E', 'm', 'L', 'θ', 'g'] }
                ],
                derivedQuantities: ['period', 'frequency', 'angular_velocity', 'energy', 'amplitude'],
                physicalConstants: { g: 9.81 }
            },
            
            optics: {
                fundamentalEquations: [
                    { name: "Snell's Law", formula: "n₁sin(θ₁) = n₂sin(θ₂)", variables: ['n1', 'n2', 'θ1', 'θ2'] },
                    { name: "Reflection", formula: "θᵢ = θᵣ", variables: ['θi', 'θr'] },
                    { name: "Lens Equation", formula: "1/f = 1/dₒ + 1/dᵢ", variables: ['f', 'do', 'di'] },
                    { name: "Magnification", formula: "M = -dᵢ/dₒ = hᵢ/hₒ", variables: ['M', 'di', 'do', 'hi', 'ho'] },
                    { name: "Wave-Color", formula: "E = hf = hc/λ", variables: ['E', 'h', 'f', 'c', 'λ'] }
                ],
                derivedQuantities: ['refraction_angle', 'focal_length', 'magnification', 'photon_energy'],
                physicalConstants: { c: 3e8, h: 6.626e-34 }
            }
        };
        
        return contexts[physicsType] || {};
    }
}

class EquationEngine {
    constructor() {
        this.activeEquations = new Map();
        this.equationOverlay = null;
        this.variableLinks = new Map();
    }
    
    createFloatingEquation(equation, position, simulator) {
        const equationElement = document.createElement('div');
        equationElement.className = 'floating-equation';
        equationElement.innerHTML = `
            <div class="equation-header">
                <span class="equation-name">${equation.name}</span>
                <span class="equation-toggle">📌</span>
            </div>
            <div class="equation-formula" data-equation="${equation.formula}">
                ${this.formatMathematicalFormula(equation.formula)}
            </div>
            <div class="equation-variables">
                ${equation.variables.map(v => `
                    <span class="variable" data-var="${v}" draggable="true">
                        ${v}: <span class="variable-value" id="var-${v}">--</span>
                    </span>
                `).join('')}
            </div>
        `;
        
        // Position the equation overlay
        equationElement.style.position = 'absolute';
        equationElement.style.left = position.x + 'px';
        equationElement.style.top = position.y + 'px';
        
        // Make it interactive
        this.makeEquationInteractive(equationElement, equation, simulator);
        
        return equationElement;
    }
    
    formatMathematicalFormula(formula) {
        // Convert mathematical notation to beautiful HTML
        return formula
            .replace(/\^(-?\d+)/g, '<sup>$1</sup>')
            .replace(/₀/g, '<sub>0</sub>')
            .replace(/₁/g, '<sub>1</sub>')
            .replace(/₂/g, '<sub>2</sub>')
            .replace(/∂/g, '<span class="math-symbol">∂</span>')
            .replace(/∇/g, '<span class="math-symbol">∇</span>')
            .replace(/∫/g, '<span class="math-symbol">∫</span>')
            .replace(/π/g, '<span class="math-symbol">π</span>')
            .replace(/ω/g, '<span class="math-symbol">ω</span>')
            .replace(/λ/g, '<span class="math-symbol">λ</span>')
            .replace(/θ/g, '<span class="math-symbol">θ</span>')
            .replace(/ψ/g, '<span class="math-symbol">ψ</span>')
            .replace(/ε/g, '<span class="math-symbol">ε</span>');
    }
    
    makeEquationInteractive(element, equation, simulator) {
        // Make variables draggable to control simulation
        const variables = element.querySelectorAll('.variable');
        variables.forEach(varElement => {
            varElement.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', varElement.dataset.var);
                e.dataTransfer.setData('equation', equation.name);
            });
            
            // Click to edit variable directly
            varElement.addEventListener('click', (e) => {
                this.createVariableEditor(varElement, equation, simulator);
            });
        });
        
        // Make equation draggable
        element.addEventListener('mousedown', (e) => {
            if (e.target.className === 'equation-toggle') {
                element.classList.toggle('pinned');
            }
        });
    }
    
    createVariableEditor(varElement, equation, simulator) {
        const variable = varElement.dataset.var;
        const currentValue = varElement.querySelector('.variable-value').textContent;
        
        const editor = document.createElement('div');
        editor.className = 'variable-editor';
        editor.innerHTML = `
            <input type="number" value="${currentValue}" step="0.1" />
            <div class="slider-container">
                <input type="range" min="0.1" max="10" step="0.1" value="${currentValue}" />
            </div>
            <button class="apply-btn">Apply</button>
        `;
        
        varElement.appendChild(editor);
        
        // Handle real-time updates
        const slider = editor.querySelector('input[type="range"]');
        const numberInput = editor.querySelector('input[type="number"]');
        
        slider.oninput = numberInput.oninput = (e) => {
            const value = parseFloat(e.target.value);
            slider.value = numberInput.value = value;
            
            // Update simulation in real-time
            this.updateSimulatorVariable(simulator, variable, value);
            varElement.querySelector('.variable-value').textContent = value.toFixed(2);
        };
        
        editor.querySelector('.apply-btn').onclick = () => {
            editor.remove();
        };
    }
    
    updateSimulatorVariable(simulator, variable, value) {
        // Map mathematical variables to simulator properties
        const variableMap = {
            'g': () => simulator.gravity = value,
            'v0': () => simulator.velocity = value,
            'L': () => simulator.length = value,
            'f': () => simulator.frequency = value,
            'λ': () => simulator.wavelength = value * 1e-9, // Convert to meters
            'A': () => simulator.amplitude = value,
            'R': () => simulator.resistance = value,
            'V': () => simulator.voltage = value,
            'I': () => simulator.current = value
        };
        
        if (variableMap[variable]) {
            variableMap[variable]();
            if (simulator.calculateRays) simulator.calculateRays();
            if (simulator.updateFieldLines) simulator.updateFieldLines();
        }
    }
}

class AnalysisEngine {
    constructor() {
        this.analysisPanel = null;
        this.liveGraphs = new Map();
        this.dataBuffer = new Map();
    }
    
    createAnalysisPanel() {
        const panel = document.createElement('div');
        panel.className = 'analysis-panel';
        panel.innerHTML = `
            <div class="analysis-header">
                <h3>🧮 Live Mathematical Analysis</h3>
                <button class="minimize-btn">─</button>
            </div>
            <div class="analysis-content">
                <div class="graph-container" id="phase-space"></div>
                <div class="graph-container" id="fourier-analysis"></div>
                <div class="graph-container" id="energy-analysis"></div>
                <div class="derivative-visualizer"></div>
            </div>
        `;
        
        return panel;
    }
    
    createPhaseSpaceGraph(simulator, variables) {
        // Create interactive 3D phase space visualization
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 200;
        
        const ctx = canvas.getContext('2d');
        
        // Real-time phase space plotting
        this.plotPhaseSpace(ctx, simulator, variables);
        
        return canvas;
    }
    
    createFourierAnalysis(simulator, signal) {
        // Live Fourier transform of any periodic signal
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate and display frequency components
        this.analyzeFourierComponents(ctx, signal);
        
        return canvas;
    }
    
    createEnergyLandscape(simulator) {
        // 3D energy landscape visualization
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        this.visualizeEnergyLandscape(ctx, simulator);
        
        return canvas;
    }
}

class InsightEngine {
    constructor() {
        this.insights = [];
        this.patternRecognizer = new PatternRecognizer();
        this.insightDisplay = null;
    }
    
    generateInsight(simulator, context) {
        const insights = {
            electromagnetic: [
                "⚡ Notice how field lines never cross - this represents the uniqueness of electric field direction at each point",
                "🔬 The field strength decreases as 1/r² - this inverse square law appears throughout physics",
                "🌀 When you move charges closer, the potential energy increases exponentially"
            ],
            wave: [
                "🌊 Constructive interference occurs when waves are in phase (phase difference = 0, 2π, 4π...)",
                "📐 The wavelength λ = c/f relationship shows why higher frequency means shorter wavelength",
                "🎯 Interference patterns reveal the wave nature of light - this was key to understanding quantum mechanics"
            ],
            projectile: [
                "🚀 The optimal launch angle for maximum range is 45° (in vacuum)",
                "⏰ Flight time depends only on vertical component: t = 2v₀sin(θ)/g",
                "📈 The trajectory is always a parabola - this comes from the quadratic term in y = x²"
            ]
        };
        
        return insights[context.type] || [];
    }
    
    createInsightStream() {
        const stream = document.createElement('div');
        stream.className = 'insight-stream';
        stream.innerHTML = `
            <div class="insight-header">💡 Live Physics Insights</div>
            <div class="insight-content"></div>
        `;
        
        return stream;
    }
}

class CrossSimulatorBridge {
    constructor() {
        this.bridges = new Map();
        this.activeConnections = [];
    }
    
    createBridge(fromSimulator, toSimulator) {
        // Allow objects to transfer between simulators
        // E.g., pendulum bob becomes projectile, charge becomes wave source
        
        const bridge = {
            from: fromSimulator,
            to: toSimulator,
            transferFunction: this.createTransferFunction(fromSimulator, toSimulator)
        };
        
        this.bridges.set(`${fromSimulator.type}-${toSimulator.type}`, bridge);
    }
    
    createTransferFunction(from, to) {
        return (object) => {
            // Transform object properties based on physics domains
            if (from.type === 'pendulum' && to.type === 'projectile') {
                return {
                    x: object.x,
                    y: object.y,
                    vx: object.angularVelocity * object.length,
                    vy: 0,
                    mass: object.mass
                };
            }
            
            if (from.type === 'electromagnetic' && to.type === 'wave') {
                return {
                    x: object.x,
                    y: object.y,
                    frequency: Math.abs(object.charge) * 1e6, // Charge magnitude affects frequency
                    amplitude: Math.abs(object.charge) * 50
                };
            }
        };
    }
}

// Export the unified engine
window.UnifiedPhysicsEngine = UnifiedPhysicsEngine;