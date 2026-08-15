// State
export const state = {
    cols: 2,
    rows: 3,
    sectionSize: 200,
    selected: 0,
    sections: [
        { corners: 3, rotation: 0, curvature: 0 },
        { corners: 3, rotation: 0, curvature: 0 },
        { corners: 3, rotation: 0, curvature: 0 },
        { corners: 3, rotation: 0, curvature: 0 },
        { corners: 3, rotation: 0, curvature: 0 },
        { corners: 3, rotation: 0, curvature: 0 }
    ]
};

// Rotate section
export function rotateSection(index) {
    state.sections[index].rotation = (state.sections[index].rotation + 90) % 360;
}

// Rotate all sections
export function rotateAllSections() {
    for(let i = 0; i < state.sections.length; i++) {
        state.sections[i].rotation = (state.sections[i].rotation + 90) % 360;
    }
}

// Set corners
export function setCorners(index, corners) {
    const clampedCorners = Math.max(3, Math.min(12, corners));
    state.sections[index].corners = clampedCorners;
}

// Set corners for all sections
export function setAllCorners(corners) {
    const clampedCorners = Math.max(3, Math.min(12, corners));
    for(let i = 0; i < state.sections.length; i++) {
        state.sections[i].corners = clampedCorners;
    }
}

// Get corner count
export function getCorners(index) {
    return state.sections[index].corners;
}

// Set curvature
export function setCurvature(index, curvature) {
    const clampedCurvature = Math.max(-3, Math.min(3, curvature));
    state.sections[index].curvature = clampedCurvature;
}

// Set curvature for all sections
export function setAllCurvature(curvature) {
    const clampedCurvature = Math.max(-3, Math.min(3, curvature));
    for(let i = 0; i < state.sections.length; i++) {
        state.sections[i].curvature = clampedCurvature;
    }
}