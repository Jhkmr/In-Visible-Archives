import { state, rotateSection, setCorners, rotateAllSections, setAllCorners, setCurvature, setAllCurvature } from './state.js';
import { render } from './render.js';

export function setupInput(canvas, rotateBtn, cornerSlider, rotateAllBtn, cornerSliderAll, curveSlider, curveSliderAll, saveBtn, ctx) {
    const cornerValue = document.querySelector("#cornerValue");
    const cornerValueAll = document.querySelector("#cornerValueAll");
    const curveValue = document.querySelector("#curveValue");
    const curveValueAll = document.querySelector("#curveValueAll");

    // Click to select section
    canvas.addEventListener("click", (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const col = Math.floor(x / state.sectionSize);
        const row = Math.floor(y / state.sectionSize);

        if(col >= 0 && col < state.cols && row >= 0 && row < state.rows) {
            state.selected = row * state.cols + col;
            cornerSlider.value = state.sections[state.selected].corners;
            cornerValue.textContent = state.sections[state.selected].corners;
            curveSlider.value = state.sections[state.selected].curvature;
            curveValue.textContent = state.sections[state.selected].curvature.toFixed(1);
            render(ctx);
        }
    });

    // Rotate button (selected section)
    rotateBtn.addEventListener("click", () => {
        if(state.selected === null) return;
        rotateSection(state.selected);
        render(ctx);
    });

    // Corner slider input (selected section)
    cornerSlider.addEventListener("input", (e) => {
        const corners = parseInt(e.target.value);
        setCorners(state.selected, corners);
        cornerValue.textContent = corners;
        render(ctx);
    });

    // Rotate all button
    rotateAllBtn.addEventListener("click", () => {
        rotateAllSections();
        render(ctx);
    });

    // Corner slider input (all sections)
    cornerSliderAll.addEventListener("input", (e) => {
        const corners = parseInt(e.target.value);
        setAllCorners(corners);
        cornerValueAll.textContent = corners;
        render(ctx);
    });

    // Curve slider input (selected section)
    curveSlider.addEventListener("input", (e) => {
        const curvature = parseFloat(e.target.value);
        setCurvature(state.selected, curvature);
        curveValue.textContent = curvature.toFixed(1);
        render(ctx);
    });

    // Curve slider input (all sections)
    curveSliderAll.addEventListener("input", (e) => {
        const curvature = parseFloat(e.target.value);
        setAllCurvature(curvature);
        curveValueAll.textContent = curvature.toFixed(1);
        render(ctx);
    });

    // Save button
    saveBtn.addEventListener("click", () => {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");

        tempCtx.fillStyle = "white";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        const previousSelected = state.selected;
        state.selected = null;
        
        render(tempCtx, true);
        
        state.selected = previousSelected;

        tempCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `print_${new Date().getTime()}.png`;
            link.click();
            URL.revokeObjectURL(url);
        });
    });

    // Keyboard input
    document.addEventListener("keydown", (e) => {
        const key = e.key.toUpperCase();

        if(key === "R") {
            e.preventDefault();
            if(e.shiftKey) {
                rotateAllSections();
            } else {
                rotateSection(state.selected);
            }
            render(ctx);
            return;
        }

        let row = Math.floor(state.selected / state.cols);
        let col = state.selected % state.cols;

        let moved = false;
        switch(key) {
            case "ARROWUP":
            case "W":
                if(row > 0) row--;
                moved = true;
                break;
            case "ARROWDOWN":
            case "S":
                if(row < state.rows - 1) row++;
                moved = true;
                break;
            case "ARROWLEFT":
            case "A":
                if(col > 0) col--;
                moved = true;
                break;
            case "ARROWRIGHT":
            case "D":
                if(col < state.cols - 1) col++;
                moved = true;
                break;
            default:
                return;
        }

        if(moved) {
            e.preventDefault();
            state.selected = row * state.cols + col;
            cornerSlider.value = state.sections[state.selected].corners;
            cornerValue.textContent = state.sections[state.selected].corners;
            curveSlider.value = state.sections[state.selected].curvature;
            curveValue.textContent = state.sections[state.selected].curvature.toFixed(1);
            render(ctx);
        }
    });
}