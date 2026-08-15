import { state, LINE_STYLES, serializeState, deserializeState, toggleLevelHatchDir } from './state.js';
import { createCanvas } from './canvas.js';
import { render } from './render.js';
import { setupInput } from './input.js';
import { images } from './images.js';

const canvasContainer = document.querySelector(".canvas-container");
const rotateBtn = document.querySelector("#rotateBtn");
const toggleTypeBtn = document.querySelector("#toggleTypeBtn");
const clearBtn = document.querySelector("#clearBtn");
const toggleAllBtn = document.querySelector("#toggleAllBtn");
const invertBtn = document.querySelector("#invertBtn");
const hideUneditedBtn = document.querySelector("#hideUneditedBtn");
const saveBtn = document.querySelector("#saveBtn");
const viewModeSelect = document.querySelector("#viewModeSelect");
const lineStyleSlider = document.querySelector("#lineStyleSlider");
const lineStyleLabel = document.querySelector("#lineStyleLabel");
const lineStyleRow = document.querySelector("#lineStyleRow");
const levelHatchDirBtn = document.querySelector("#levelHatchDirBtn");
const saveConfigBtn = document.querySelector("#saveConfigBtn");
const loadConfigBtn = document.querySelector("#loadConfigBtn");
const loadConfigInput = document.querySelector("#loadConfigInput");

const { canvas, ctx } = createCanvas(canvasContainer);

function updateLinesUI() {
    const show = state.viewMode === 'lines';
    lineStyleRow.style.display = show ? 'flex' : 'none';
    levelHatchDirBtn.style.display = show ? 'block' : 'none';
}

viewModeSelect.addEventListener("change", () => {
    state.viewMode = viewModeSelect.value;
    updateLinesUI();
    render(ctx);
});

levelHatchDirBtn.addEventListener("click", () => {
    if(state.selected === null) return;
    toggleLevelHatchDir(state.selected);
    render(ctx);
});

lineStyleSlider.addEventListener("input", () => {
    state.lineStyleIndex = parseInt(lineStyleSlider.value);
    lineStyleLabel.textContent = LINE_STYLES[state.lineStyleIndex];
    render(ctx);
});

saveConfigBtn.addEventListener("click", () => {
    const json = serializeState();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `config_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
});

loadConfigBtn.addEventListener("click", () => loadConfigInput.click());
loadConfigInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            deserializeState(data);
            viewModeSelect.value = state.viewMode;
            lineStyleSlider.value = state.lineStyleIndex;
            lineStyleLabel.textContent = LINE_STYLES[state.lineStyleIndex];
            updateLinesUI();
            hideUneditedBtn.classList.toggle("active", state.hideUnedited);
            render(ctx);
        } catch(err) {
            console.error("Failed to load config:", err);
        }
    };
    reader.readAsText(file);
    loadConfigInput.value = '';
});

setupInput(canvas, rotateBtn, toggleTypeBtn, clearBtn, toggleAllBtn, invertBtn, hideUneditedBtn, saveBtn, ctx);

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