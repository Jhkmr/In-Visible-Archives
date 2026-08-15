// State
export const state = {
    dividerX: 0.5,
    dividerY: 0.5,
    sections: [
        { corners: 3, rotation: 0, curvature: 0 },
        { corners: 3, rotation: 0, curvature: 0 },
        { corners: 3, rotation: 0, curvature: 0 },
        { corners: 3, rotation: 0, curvature: 0 }
    ]
};

// Set divider
export function setDivider(x, y) {
    state.dividerX = Math.max(0.1, Math.min(0.9, x));
    state.dividerY = Math.max(0.1, Math.min(0.9, y));
}

// Rotate all sections
export function rotateAllSections() {
    for(let i = 0; i < state.sections.length; i++) {
        state.sections[i].rotation = (state.sections[i].rotation + 90) % 360;
    }
}

// Set corners
export function setAllCorners(corners) {
    const clampedCorners = Math.max(3, Math.min(12, corners));
    for(let i = 0; i < state.sections.length; i++) {
        state.sections[i].corners = clampedCorners;
    }
}

// Set curvature
export function setAllCurvature(curvature) {
    const clampedCurvature = Math.max(-3, Math.min(3, curvature));
    for(let i = 0; i < state.sections.length; i++) {
        state.sections[i].curvature = clampedCurvature;
    }
}