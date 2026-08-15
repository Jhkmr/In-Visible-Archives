let img, imgSample;
let cols, rows;
let isPortrait = true;

let textContent = "Subverting Hierarchies";
let words = textContent.split(/\s+/);

let mask = [];
let medianGrid = [];
let layoutLines = [];

let cellW, cellH;
let lastCols = null,
  lastRows = null,
  lastCanvasW = null,
  lastCanvasH = null;

let textSizePx = 70;
let lineHeight = textSizePx * 0.8;

// Fallback font glyphs
const FALLBACK_CHARS = new Set(["ı", "◟", "/", "-"]);
const FALLBACK_FONT = "sans-serif";

function setup() {
  let wrap = document.querySelector(".canvas-wrap");
  let { w, h } = fitSize(wrap, isPortrait ? 1 / Math.SQRT2 : Math.SQRT2);
  let cnv = createCanvas(w, h);
  cnv.parent(wrap);
  pixelDensity(2);

  textFont('"Archive Grotesk 800"');
  noLoop();

  document.getElementById("btnLoad").addEventListener("click", () => {
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.addEventListener("change", () => {
      let file = fileInput.files[0];
      if (!file) return;
      let url = URL.createObjectURL(file);
      document.getElementById("imagePreview").src = url;
      loadImage(url, (loaded) => {
        img = loaded;
        applyCanvasSize();
        updateImgSample();
        medianGrid = [];
        redraw();
      });
    });
    fileInput.click();
  });
  document.getElementById("btnClear").addEventListener("click", () => {
    background(0);
    redraw();
  });
  document
    .getElementById("btnSave")
    .addEventListener("click", () => saveCanvas("pixelSort_Grid", "png"));

  let orientationBtnEl = document.getElementById("btnOrientation");
  orientationBtnEl.addEventListener("click", () => {
    isPortrait = !isPortrait;
    orientationBtnEl.textContent =
      "Orientation: " + (isPortrait ? "Portrait" : "Landscape");
    applyCanvasSize();
    updateImgSample();
    redraw();
  });

  document.getElementById("btnConfirmText").addEventListener("click", () => {
    let typed = document.getElementById("textInput").value.trim();
    if (typed.length > 0) {
      textContent = typed;
      words = textContent.split(/\s+/);
    }
    redraw();
  });

  const WHEEL_SENSITIVITY = 20;

  document
    .querySelectorAll(".slider-wrap input[type=range]")
    .forEach((slider) => {
      let scrollAccum = 0;
      slider.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          scrollAccum += e.deltaY;
          let step = parseFloat(slider.step) || 1;
          while (Math.abs(scrollAccum) >= WHEEL_SENSITIVITY) {
            let dir = scrollAccum < 0 ? -1 : 1;
            slider.value = constrain(
              parseFloat(slider.value) + dir * step,
              parseFloat(slider.min),
              parseFloat(slider.max),
            );
            scrollAccum -= dir * WHEEL_SENSITIVITY;
          }
          slider.dispatchEvent(new Event("input"));
        },
        { passive: false },
      );
      slider.addEventListener("input", () => redraw());
    });
}

function fitSize(wrap, ratio) {
  let maxW = wrap.offsetWidth;
  let maxH = wrap.offsetHeight;
  let w = maxH * ratio;
  let h = maxH;
  if (w > maxW) {
    w = maxW;
    h = maxW / ratio;
  }
  return { w: Math.floor(w), h: Math.floor(h) };
}

function windowResized() {
  applyCanvasSize();
  updateImgSample();
  redraw();
}

function applyCanvasSize() {
  let wrap = document.querySelector(".canvas-wrap");
  let ratio = isPortrait ? 1 / Math.SQRT2 : Math.SQRT2;
  let { w, h } = fitSize(wrap, ratio);
  resizeCanvas(w, h);
}

function updateImgSample() {
  if (!img) return;
  imgSample = createImage(width, height);
  imgSample.copy(img, 0, 0, img.width, img.height, 0, 0, width, height);
  imgSample.loadPixels();
}

function draw() {
  // background(0);
  if (imgSample) drawOverlay();
}

function drawOverlay() {
  let threshold = sliderVal("sliderA");
  let density = sliderVal("sliderB");
  let densityFactor = 1 + density;
  cols = round(15 * densityFactor);
  rows = round(20 * densityFactor);
  cellW = width / cols;
  cellH = height / rows;

  let gridChanged =
    cols !== lastCols ||
    rows !== lastRows ||
    width !== lastCanvasW ||
    height !== lastCanvasH;
  if (gridChanged || medianGrid.length === 0) {
    computeMedianGrid();
    lastCols = cols;
    lastRows = rows;
    lastCanvasW = width;
    lastCanvasH = height;
  }

  let offsetX = sliderVal("sliderC");
  let offsetY = sliderVal("sliderD");
  relayout(threshold, offsetX, offsetY);

  noStroke();
  fill(255);
  for (let gx = 0; gx < cols; gx++) {
    for (let gy = 0; gy < rows; gy++) {
      if (mask[gx][gy]) rect(gx * cellW, gy * cellH, cellW, cellH);
    }
  }

  fill(0);
  textAlign(LEFT, TOP);
  textSize(textSizePx);
  for (let l of layoutLines) drawLineWithFallback(l.text, l.x, l.y);
}

// Draw line with fallback font
function drawLineWithFallback(line, x, y) {
  let cursor = x;
  textFont('"Archive Grotesk 800"');
  textSize(textSizePx);
  for (let ch of line) {
    let w = textWidth(ch);
    if (FALLBACK_CHARS.has(ch)) {
      textFont(FALLBACK_FONT);
      textStyle(BOLD);
      text(ch, cursor, y);
      textFont('"Archive Grotesk 800"');
      textStyle(NORMAL);
    } else {
      text(ch, cursor, y);
    }
    cursor += w;
  }
}

// Median brightness per cell
function computeMedianGrid() {
  if (!imgSample) return;
  imgSample.loadPixels();
  medianGrid = [];
  for (let gx = 0; gx < cols; gx++) {
    medianGrid[gx] = [];
    for (let gy = 0; gy < rows; gy++) {
      let startX = floor(gx * cellW);
      let endX = floor((gx + 1) * cellW);
      let startY = floor(gy * cellH);
      let endY = floor((gy + 1) * cellH);
      let vals = [];
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          let idx = (x + y * imgSample.width) * 4;
          let r = imgSample.pixels[idx + 0];
          let g = imgSample.pixels[idx + 1];
          let b = imgSample.pixels[idx + 2];
          vals.push(0.299 * r + 0.587 * g + 0.114 * b);
        }
      }
      vals.sort((a, b) => a - b);
      let mid = floor(vals.length / 2);
      medianGrid[gx][gy] =
        vals.length % 2 === 0
          ? (vals[mid - 1] + vals[mid]) / 2
          : vals[mid];
    }
  }
}

// Rebuild mask, regions, text layout
function relayout(threshold, offsetX, offsetY) {
  mask = [];
  for (let gx = 0; gx < cols; gx++) {
    mask[gx] = [];
    for (let gy = 0; gy < rows; gy++) {
      mask[gx][gy] =
        medianGrid[gx] && medianGrid[gx][gy] !== undefined
          ? medianGrid[gx][gy] > threshold
          : false;
    }
  }

  let components = findComponents();
  // reading order: top-most / left-most region first
  components.sort((a, b) => {
    let ay = min(a.map((c) => c.gy)),
      by = min(b.map((c) => c.gy));
    if (ay !== by) return ay - by;
    let ax = min(a.map((c) => c.gx)),
      bx = min(b.map((c) => c.gx));
    return ax - bx;
  });

  layoutLines = [];
  textSize(textSizePx);

  let wordCursor = 0;
  let stall = 0;

  for (let comp of components) {
    let slots = buildSlots(comp, offsetX, offsetY);
    for (let slot of slots) {
      let { line, cursorAfter } = fillSlot(slot, wordCursor);
      if (cursorAfter === wordCursor) {
        stall++;
        if (stall > cols * rows + words.length) {
          wordCursor = (wordCursor + 1) % words.length;
          stall = 0;
        }
      } else {
        stall = 0;
      }
      wordCursor = cursorAfter;
      if (line.length > 0) {
        layoutLines.push({ x: slot.x, y: slot.y, w: slot.w, text: line });
      }
    }
  }
}

// Flood fill mask grid
function findComponents() {
  let visited = [];
  for (let gx = 0; gx < cols; gx++) visited[gx] = new Array(rows).fill(false);

  let components = [];
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (mask[gx][gy] && !visited[gx][gy]) {
        let cells = [];
        let stack = [[gx, gy]];
        visited[gx][gy] = true;
        while (stack.length) {
          let [cx, cy] = stack.pop();
          cells.push({ gx: cx, gy: cy });
          let neighbors = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1],
            [cx + 1, cy + 1],
            [cx + 1, cy - 1],
            [cx - 1, cy + 1],
            [cx - 1, cy - 1],
          ];
          for (let [nx, ny] of neighbors) {
            if (
              nx >= 0 &&
              nx < cols &&
              ny >= 0 &&
              ny < rows &&
              mask[nx][ny] &&
              !visited[nx][ny]
            ) {
              visited[nx][ny] = true;
              stack.push([nx, ny]);
            }
          }
        }
        components.push(cells);
      }
    }
  }
  return components;
}

// Text-line slots within region
function buildSlots(cells, offsetX, offsetY) {
  let byRow = {};
  for (let c of cells) {
    if (!byRow[c.gy]) byRow[c.gy] = [];
    byRow[c.gy].push(c.gx);
  }

  let rowRuns = {};
  let gyValues = Object.keys(byRow).map(Number);
  for (let gy of gyValues) {
    let gxs = byRow[gy].sort((a, b) => a - b);
    let runs = [];
    let run = [gxs[0]];
    for (let i = 1; i < gxs.length; i++) {
      if (gxs[i] === gxs[i - 1] + 1) {
        run.push(gxs[i]);
      } else {
        runs.push(run);
        run = [gxs[i]];
      }
    }
    runs.push(run);
    rowRuns[gy] = runs.map((r) => ({ startGx: r[0], count: r.length }));
  }

  let minGy = min(gyValues);
  let maxGy = max(gyValues);
  let bottomLimit = (maxGy + 1) * cellH;

  let slots = [];
  let y = minGy * cellH + offsetY;

  while (y < bottomLimit) {
    let gy = floor(y / cellH);
    let runs = rowRuns[gy];
    if (runs) {
      for (let r of runs) {
        let rawWidth = r.count * cellW;
        let startX = r.startGx * cellW + offsetX;
        let w = max(10, rawWidth - offsetX);
        slots.push({ x: startX, y: y, w: w });
      }
    }
    y += lineHeight;
  }

  return slots;
}

// Pack words into line-slot
function fillSlot(slot, cursor) {
  textSize(textSizePx);
  let line = "";
  let i = cursor;
  let iterations = 0;
  const maxIterations = 2000;

  while (iterations < maxIterations) {
    let word = words[i % words.length];
    let candidate = line.length === 0 ? word : line + " " + word;
    if (textWidth(candidate) <= slot.w - 6) {
      line = candidate;
      i++;
      iterations++;
    } else {
      break;
    }
  }

  if (line.length === 0) {
    return { line: "", cursorAfter: cursor };
  }
  return { line, cursorAfter: i % words.length };
}

function sliderVal(id) {
  return parseInt(document.getElementById(id).value);
}


function save(){
  saveCanvas("pixelSort_Grid", "png")
}