import { state, rotateCell, toggleShapeType, clearCell, toggleLevelHatchDir, toggleAllShapeTypes, invertAllShapeTypes } from './state.js';
import { render } from './render.js';

export function setupInput(canvas, rotateBtn, toggleTypeBtn, clearBtn, toggleAllBtn, invertBtn, hideUneditedBtn, saveBtn, ctx) {

    canvas.addEventListener("click", (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const col = Math.floor(x / state.cellSize);
        const row = Math.floor(y / state.cellSize);

        state.selected = row*state.cols + col;
        render(ctx);
    });

    rotateBtn.addEventListener("click", () => {
        if(state.selected === null) return;
        rotateCell(state.selected);
        render(ctx);
    });

    toggleTypeBtn.addEventListener("click", () => {
        if(state.selected === null) return;
        toggleShapeType(state.selected);
        render(ctx);
    });

    clearBtn.addEventListener("click", () => {
        if(state.selected === null) return;
        clearCell(state.selected);
        render(ctx);
    });

    toggleAllBtn.addEventListener("click", () => {
        toggleAllShapeTypes();
        render(ctx);
    });

    invertBtn.addEventListener("click", () => {
        invertAllShapeTypes();
        render(ctx);
    });

    hideUneditedBtn.addEventListener("click", () => {
        state.hideUnedited = !state.hideUnedited;
        hideUneditedBtn.classList.toggle("active", state.hideUnedited);
        render(ctx);
    });

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

    document.addEventListener("keydown", (e) => {
        if(state.selected === null) return;

        const key = e.key.toUpperCase();

        if(key === "R") {
            e.preventDefault();
            rotateCell(state.selected);
            render(ctx);
            return;
        }

        if(key === "E") {
            e.preventDefault();
            toggleShapeType(state.selected);
            render(ctx);
            return;
        }

        if(key === "T") {
            e.preventDefault();
            toggleLevelHatchDir(state.selected);
            render(ctx);
            return;
        }

        if(key === "X") {
            e.preventDefault();
            clearCell(state.selected);
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
            render(ctx);
        }
    });
}