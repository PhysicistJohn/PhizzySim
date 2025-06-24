export class EarthPhysics {
    constructor() {
        this.G = 6.67430e-11;
        this.earthMass = 5.972e24;
        this.earthRadius = 6.371e6;
        this.moonMass = 7.342e22;
        this.moonDistance = 3.844e8;
        this.sunMass = 1.989e30;
        this.earthOrbitRadius = 1.496e11;
        
        this.rotationPeriod = 24 * 3600;
        this.orbitalPeriod = 365.25 * 24 * 3600;
        
        this.axialTilt = 23.44 * Math.PI / 180;
        
        this.time = 0;
        this.dayOfYear = 0;
    }

    updateTime(deltaTime, timeMultiplier = 1) {
        this.time += deltaTime * timeMultiplier;
        this.dayOfYear = (this.time / this.rotationPeriod) % 365.25;
    }

    getEarthRotation() {
        return (this.time / this.rotationPeriod) * 2 * Math.PI;
    }

    getEarthOrbitAngle() {
        return (this.time / this.orbitalPeriod) * 2 * Math.PI;
    }

    getEarthPosition() {
        const angle = this.getEarthOrbitAngle();
        return {
            x: Math.cos(angle) * this.earthOrbitRadius,
            y: 0,
            z: Math.sin(angle) * this.earthOrbitRadius
        };
    }

    getMoonPosition(earthPos) {
        const moonOrbitPeriod = 27.3 * 24 * 3600;
        const moonAngle = (this.time / moonOrbitPeriod) * 2 * Math.PI;
        
        return {
            x: earthPos.x + Math.cos(moonAngle) * this.moonDistance,
            y: Math.sin(moonAngle) * this.moonDistance * 0.1,
            z: earthPos.z + Math.sin(moonAngle) * this.moonDistance
        };
    }

    getSeason() {
        const angle = this.getEarthOrbitAngle();
        const seasonAngle = angle % (2 * Math.PI);
        
        if (seasonAngle < Math.PI / 2) return "Spring";
        else if (seasonAngle < Math.PI) return "Summer";
        else if (seasonAngle < 3 * Math.PI / 2) return "Autumn";
        else return "Winter";
    }

    getSurfaceGravity() {
        return this.G * this.earthMass / (this.earthRadius * this.earthRadius);
    }

    getOrbitalVelocity(radius) {
        return Math.sqrt(this.G * this.sunMass / radius);
    }

    getTidalForce(position) {
        const moonDist = this.moonDistance;
        const moonForce = 2 * this.G * this.moonMass * this.earthRadius / Math.pow(moonDist, 3);
        
        const sunDist = this.earthOrbitRadius;
        const sunForce = 2 * this.G * this.sunMass * this.earthRadius / Math.pow(sunDist, 3);
        
        return {
            moon: moonForce,
            sun: sunForce,
            total: moonForce + sunForce
        };
    }

    getAtmosphericPressure(altitude) {
        const seaLevelPressure = 101325;
        const scaleHeight = 8500;
        return seaLevelPressure * Math.exp(-altitude / scaleHeight);
    }

    getDayNightPosition(latitude, longitude) {
        const earthRotation = this.getEarthRotation();
        const localTime = (longitude / 360 + earthRotation / (2 * Math.PI)) * 24;
        const hourAngle = (localTime - 12) * 15 * Math.PI / 180;
        
        const sunDeclination = this.axialTilt * Math.sin(this.getEarthOrbitAngle());
        
        const sunAltitude = Math.asin(
            Math.sin(latitude) * Math.sin(sunDeclination) +
            Math.cos(latitude) * Math.cos(sunDeclination) * Math.cos(hourAngle)
        );
        
        return {
            isDay: sunAltitude > 0,
            sunAltitude: sunAltitude * 180 / Math.PI,
            localTime: localTime % 24
        };
    }
}