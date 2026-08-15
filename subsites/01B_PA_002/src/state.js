// Grid state
export const state = {
    cols: 4,
    rows: 6,
    cellSize: 100,
    selected: 0,
    shapeIndex: Array(24).fill(0),
    shapeTypes: Array(24).fill('angular')
};

// Shape params
export function getShapeParams(index, isAngular) {
    if(isAngular) {
        const shapeIdx = index % 8;
        const corner = Math.floor(shapeIdx / 2);
        const diagonal = shapeIdx % 2;
        return { corner, diagonal };
    } else {
        const corner = index % 4;
        return { corner, diagonal: 0 };
    }
}

// Rotate cell
export function rotateCell(index) {
    if(state.shapeTypes[index] === 'angular') {
        state.shapeIndex[index] = (state.shapeIndex[index] + 1) % 8;
    } else {
        state.shapeIndex[index] = (state.shapeIndex[index] + 1) % 4;
    }
}

// Toggle shape type
export function toggleShapeType(index) {
    state.shapeTypes[index] = state.shapeTypes[index] === 'angular' ? 'level' : 'angular';
}

// Toggle all shape types
export function toggleAllShapeTypes() {
    for(let i = 0; i < state.shapeTypes.length; i++) {
        toggleShapeType(i);
    }
}

// Invert all shape types
export function invertAllShapeTypes() {
    toggleAllShapeTypes();
}