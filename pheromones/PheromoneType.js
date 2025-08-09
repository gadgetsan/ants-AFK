// pheromones/PheromoneType.js
export class PheromoneType {
    constructor({
        key,
        label,
        colorFn
    }) {
        this.key = key; // unique string identifier
        this.label = label; // display name
        this.colorFn = colorFn; // function (intensity) => rgba string
    }
    getColor(intensity) {
        return this.colorFn(intensity);
    }
}