import { render } from './render.js';

export function createCanvas(container) {
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
        const style = getComputedStyle(container);
        const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

        const w = container.clientWidth - paddingX;
        const h = container.clientHeight - paddingY;

        const sizeFromWidth = Math.floor(w / 2);
        const sizeFromHeight = Math.floor(h / 3);
        const size = Math.min(sizeFromWidth, sizeFromHeight);

        canvas.width = size * 2;
        canvas.height = size * 3;

        render(ctx);
    }

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    return { canvas, ctx };
}