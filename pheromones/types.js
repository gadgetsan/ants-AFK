// pheromones/types.js
import {
    PheromoneType
} from './PheromoneType.js';

export const PHEROMONE_TYPES = [
    Object.assign(new PheromoneType({
        key: 'food',
        label: 'Food',
        colorFn: (intensity, maxIntensity = 100) => {
            const ratio = maxIntensity > 0 ? intensity / maxIntensity : 0;
            const green = Math.min(255, Math.round(ratio * 255));
            return `rgba(0,255,0,${ratio * 0.7})`;
        }
    }), {
        maxIntensity: 0
    }),
    Object.assign(new PheromoneType({
        key: 'nest',
        label: 'Nest',
        colorFn: (intensity, maxIntensity = 100) => {
            const ratio = maxIntensity > 0 ? intensity / maxIntensity : 0;
            const blue = Math.min(255, Math.round(ratio * 255));
            return `rgba(0,0,255,${ratio * 0.7})`;
        }
    }), {
        maxIntensity: 0
    }),
    Object.assign(new PheromoneType({
        key: 'home',
        label: 'Home',
        colorFn: (intensity, maxIntensity = 100) => {
            const ratio = maxIntensity > 0 ? intensity / maxIntensity : 0;
            const red = Math.min(255, Math.round(ratio * 255));
            return `rgba(255,0,0,${ratio * 0.7})`;
        }
    }), {
        maxIntensity: 0
    })
    // Add more types here as needed
];