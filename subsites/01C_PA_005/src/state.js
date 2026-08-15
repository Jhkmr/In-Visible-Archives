export const LINE_STYLES = ['straight', 'wavy', 'zigzag', 'dotted', 'dashed'];

// Grid state
export const state = {
    cols: 4,
    rows: 6,
    cellSize: 100,
    selected: 0,
    shapeIndex: Array(24).fill(0),
    shapeTypes: Array(24).fill('angular'),
    interacted: new Set(),
    hideUnedited: false,
    viewMode: 'skeleton',
    lineStyleIndex: 0,
    levelHatchDirs: Array(24).fill('horizontal')
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
    state.interacted.add(index);
    if(state.shapeTypes[index] === 'blank') {
        state.shapeTypes[index] = 'angular';
        state.shapeIndex[index] = 0;
    } else if(state.shapeTypes[index] === 'angular') {
        state.shapeIndex[index] = (state.shapeIndex[index] + 1) % 8;
    } else {
        state.shapeIndex[index] = (state.shapeIndex[index] + 1) % 4;
    }
}

// Toggle shape type
export function toggleShapeType(index) {
    state.interacted.add(index);
    const t = state.shapeTypes[index];
    if(t === 'angular') {
        const corner = Math.floor((state.shapeIndex[index] % 8) / 2);
        state.shapeTypes[index] = 'level';
        state.shapeIndex[index] = corner;
    } else {
        const corner = state.shapeIndex[index] % 4;
        state.shapeTypes[index] = 'angular';
        state.shapeIndex[index] = corner * 2;
    }
}

// Toggle level hatch direction
export function toggleLevelHatchDir(index) {
    state.levelHatchDirs[index] = state.levelHatchDirs[index] === 'horizontal' ? 'vertical' : 'horizontal';
}

// Clear cell
export function clearCell(index) {
    state.interacted.add(index);
    state.shapeTypes[index] = 'blank';
}

// Cell visibility
function isCellVisible(i) {
    return !(state.hideUnedited && !state.interacted.has(i));
}

// Toggle all shape types
export function toggleAllShapeTypes() {
    for(let i = 0; i < state.shapeTypes.length; i++) {
        if(state.shapeTypes[i] === 'blank') continue;
        if(!isCellVisible(i)) continue;
        if(state.shapeTypes[i] === 'angular') {
            const corner = Math.floor((state.shapeIndex[i] % 8) / 2);
            state.shapeTypes[i] = 'level';
            state.shapeIndex[i] = corner;
        } else {
            const corner = state.shapeIndex[i] % 4;
            state.shapeTypes[i] = 'angular';
            state.shapeIndex[i] = corner * 2;
        }
    }
}

// Invert all shape types
export function invertAllShapeTypes() {
    toggleAllShapeTypes();
}

// Serialize state
export function serializeState() {
    return JSON.stringify({
        shapeIndex: state.shapeIndex,
        shapeTypes: state.shapeTypes,
        interacted: [...state.interacted],
        hideUnedited: state.hideUnedited,
        viewMode: state.viewMode,
        lineStyleIndex: state.lineStyleIndex,
        levelHatchDirs: state.levelHatchDirs
    }, null, 2);
}

// Deserialize state
export function deserializeState(data) {
    state.shapeIndex = data.shapeIndex;
    state.shapeTypes = data.shapeTypes;
    state.interacted = new Set(data.interacted);
    state.hideUnedited = data.hideUnedited ?? false;
    state.viewMode = data.viewMode ?? 'skeleton';
    state.lineStyleIndex = data.lineStyleIndex ?? 0;
    state.levelHatchDirs = data.levelHatchDirs ?? Array(24).fill('horizontal');
}