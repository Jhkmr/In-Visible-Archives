import { state } from './state.js';
import { createCanvas } from './canvas.js';
import { render } from './render.js';
import { setupInput } from './input.js';
import { images } from './images.js';

const canvasContainer = document.querySelector(".canvas-container");
const rotateAllBtn = document.querySelector("#rotateAllBtn");
const cornerSliderAll = document.querySelector("#cornerSliderAll");
const curveSliderAll = document.querySelector("#curveSliderAll");
const saveBtn = document.querySelector("#saveBtn");

const { canvas, ctx } = createCanvas(canvasContainer);

setupInput(canvas, rotateAllBtn, cornerSliderAll, curveSliderAll, saveBtn, ctx);

const imagesContainer = document.getElementById("imagesContainer");
images.forEach((filename) => {
    const imageItem = document.createElement("div");
    imageItem.className = "image-item";
    
    const img = document.createElement("img");
    img.src = `./images/${filename}`;
    img.alt = filename;
    
    imageItem.appendChild(img);
    imagesContainer.appendChild(imageItem);
});

render(ctx);