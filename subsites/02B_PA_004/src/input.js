import { state, rotateAllSections, setAllCorners, setAllCurvature, setDivider } from './state.js';
import { render } from './render.js';

export function setupInput(canvas, rotateAllBtn, cornerSliderAll, curveSliderAll, saveBtn, ctx) {
    const cornerValueAll = document.querySelector("#cornerValueAll");
    const curveValueAll = document.querySelector("#curveValueAll");

    let isDraggingDivider = false;

    canvas.addEventListener("mousedown", (e) => {
        isDraggingDivider = true;
    });

    canvas.addEventListener("mousemove", (e) => {
        if(!isDraggingDivider) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const normalizedX = x / canvas.width;
        const normalizedY = y / canvas.height;

        setDivider(normalizedX, normalizedY);
        render(ctx);
    });

    document.addEventListener("mouseup", () => {
        isDraggingDivider = false;
    });

    rotateAllBtn.addEventListener("click", () => {
        rotateAllSections();
        render(ctx);
    });

    cornerSliderAll.addEventListener("input", (e) => {
        const corners = parseInt(e.target.value);
        setAllCorners(corners);
        cornerValueAll.textContent = corners;
        render(ctx);
    });

    curveSliderAll.addEventListener("input", (e) => {
        const curvature = parseFloat(e.target.value);
        setAllCurvature(curvature);
        curveValueAll.textContent = curvature.toFixed(1);
        render(ctx);
    });

    saveBtn.addEventListener("click", () => {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");

        tempCtx.fillStyle = "white";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        render(tempCtx, true);

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

        if(key === "R" && e.shiftKey) {
            e.preventDefault();
            rotateAllSections();
            render(ctx);
            return;
        }
    });
}