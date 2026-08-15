let img, imgSample;
let cols, rows;
let isPortrait = true;

let textContent = "Placeholder notes that can be replaced with any custom text.";
let words = [];
let wordSeps = [];
setWords(textContent);

// Word splitting
function setWords(str) {
  words = [];
  wordSeps = [];
  let re = /(\s+)|(\S+)/g;
  let match;
  let pendingSep = "";
  while ((match = re.exec(str)) !== null) {
    if (match[1] !== undefined) {
      pendingSep = match[1];
    } else {
      words.push(match[2]);
      wordSeps.push(words.length === 1 ? "" : pendingSep);
      pendingSep = "";
    }
  }
}

let gradientMap = null;
let colEdges = [];
let rowEdges = [];
let lastCols = null,
  lastRows = null,
  lastCanvasW = null,
  lastCanvasH = null;

const LINE_HIT_RADIUS = 8;
let dragTarget = null;

let textSizePx = 70;
let lineHeight = textSizePx * 0.8;
let wordSpacing = 0;

let redCells = [];
let repeatText = true;

// Fallback glyphs
const FALLBACK_CHARS = new Set(["ı", "◟", "/", "-", "?", "!"]);
const FALLBACK_FONT = "sans-serif";

function preload() {
  img = loadImage("media/PvA.3.1.11.png");
}

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

  document.getElementById("btnRandomize").addEventListener("click", () => {
    randomizeCells();
    redraw();
  });

  let repeatBtnEl = document.getElementById("btnRepeatToggle");
  repeatBtnEl.addEventListener("click", () => {
    repeatText = !repeatText;
    repeatBtnEl.textContent = "Repeat: " + (repeatText ? "On" : "Off");
    redraw();
  });

  document.getElementById("btnOverrideText").addEventListener("click", () => {
    let typed = document.getElementById("textInput").value;
    if (typed.trim().length > 0) {
      textContent = typed;
      setWords(textContent);
    }
    redraw();
  });

  document.getElementById("btnAddText").addEventListener("click", () => {
    let input = document.getElementById("textInput");
    let typed = input.value;
    if (typed.trim().length > 0) {
      textContent = textContent.length > 0 ? textContent + " " + typed : typed;
      setWords(textContent);
      input.value = "";
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

  document.getElementById("imagePreview").src = "media/PvA.3.1.11.png";
  applyCanvasSize();
  updateImgSample();
  redraw();
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
  gradientMap = null;
  randomizeCells();
}

// Randomize cells
function randomizeCells() {
  let c = isPortrait ? 4 : 8;
  let r = isPortrait ? 8 : 4;
  let density = sliderVal("sliderB") / 100;

  redCells = [];
  for (let gy = 0; gy < r; gy++) {
    for (let gx = 0; gx < c; gx++) {
      if (random() < density) redCells.push({ gx, gy });
    }
  }
}

function draw() {
  background(0);
  if (imgSample) drawOverlay();
  noLoop();
}

function drawOverlay() {
  cols = isPortrait ? 4 : 8;
  rows = isPortrait ? 8 : 4;

  let gridChanged =
    cols !== lastCols ||
    rows !== lastRows ||
    width !== lastCanvasW ||
    height !== lastCanvasH;
  if (gridChanged || !gradientMap) {
    computeGradientMap();
    computeColumnEdges();
    computeRowEdges();
    lastCols = cols;
    lastRows = rows;
    lastCanvasW = width;
    lastCanvasH = height;
  }

  textSizePx = sliderVal("sliderA");
  lineHeight = textSizePx * sliderVal("sliderD");
  wordSpacing = sliderVal("sliderE");

  noStroke();
  // fill('#ffffff');
  noFill();
  for (let cell of redCells) {
    let x0 = colEdges[cell.gx];
    let x1 = colEdges[cell.gx + 1];
    let y0 = rowEdges[cell.gy];
    let y1 = rowEdges[cell.gy + 1];
    rect(x0, y0, x1 - x0, y1 - y0);
  }

  stroke(255);
  //noStroke();
  let midGx = cols / 2;
  let midGy = rows / 2;
  for (let gx = 1; gx < cols; gx++) {
    strokeWeight(gx === midGx ? 2 : 0.75);
    line(colEdges[gx], 0, colEdges[gx], height);
  }
  for (let gy = 1; gy < rows; gy++) {
    strokeWeight(gy === midGy ? 2 : 0.75);
    line(0, rowEdges[gy], width, rowEdges[gy]);
  }

  fill(255);
  noStroke();
  for (let placed of layoutText()) {
    drawLineWithFallback(placed.words, placed.x, placed.y);
  }
}

// Layout text
function layoutText() {
  if (redCells.length === 0 || words.length === 0) return [];

  let startIdx = constrain(sliderVal("sliderC"), 0, redCells.length - 1);
  let order = repeatText
    ? redCells.slice(startIdx).concat(redCells.slice(0, startIdx))
    : redCells.slice(startIdx);

  textSize(textSizePx);
  let placed = [];
  let wordCursor = 0;

  outer:
  for (let cell of order) {
    let x0 = colEdges[cell.gx] + 4;
    let x1 = colEdges[cell.gx + 1] - 4;
    let y0 = rowEdges[cell.gy] + textSizePx;
    let y1 = rowEdges[cell.gy + 1];
    let boxW = x1 - x0;

    let y = y0;
    while (y <= y1) {
      let lineWords = [];
      let lineText = "";
      let i = wordCursor;
      let usedAny = false;
      while (true) {
        if (!repeatText && i >= words.length) break;
        let word = words[i % words.length];
        let sep = lineWords.length === 0 ? "" : wordSeps[i % wordSeps.length] || " ";
        let candidateText = lineText + sep + word;
        let candidateWidth =
          textWidth(candidateText) + (lineWords.length) * wordSpacing;
        if (candidateWidth <= boxW) {
          lineWords.push({ word, sep });
          lineText = candidateText;
          i++;
          usedAny = true;
        } else {
          break;
        }
      }
      if (!usedAny) break;
      placed.push({ x: x0, y: y, words: lineWords });
      wordCursor = i;
      if (!repeatText && wordCursor >= words.length) break outer;
      y += lineHeight;
    }
  }

  return placed;
}

// Grid-line dragging
function findLineAt(mx, my) {
  for (let gx = 1; gx < cols; gx++) {
    if (abs(mx - colEdges[gx]) <= LINE_HIT_RADIUS) return { axis: "col", index: gx };
  }
  for (let gy = 1; gy < rows; gy++) {
    if (abs(my - rowEdges[gy]) <= LINE_HIT_RADIUS) return { axis: "row", index: gy };
  }
  return null;
}

function mousePressed() {
  if (!imgSample) return;
  let hit = findLineAt(mouseX, mouseY);
  if (hit) dragTarget = hit;
}

function mouseDragged() {
  if (!dragTarget) return;
  if (dragTarget.axis === "col") {
    let minX = colEdges[dragTarget.index - 1] + 1;
    let maxX = colEdges[dragTarget.index + 1] - 1;
    colEdges[dragTarget.index] = constrain(mouseX, minX, maxX);
  } else {
    let minY = rowEdges[dragTarget.index - 1] + 1;
    let maxY = rowEdges[dragTarget.index + 1] - 1;
    rowEdges[dragTarget.index] = constrain(mouseY, minY, maxY);
  }
  redraw();
}

function mouseReleased() {
  dragTarget = null;
}

function mouseMoved() {
  if (!imgSample) return;
  let hit = findLineAt(mouseX, mouseY);
  let cnv = document.querySelector(".canvas-wrap canvas");
  if (cnv) cnv.style.cursor = hit ? (hit.axis === "col" ? "ew-resize" : "ns-resize") : "default";
}

// Draw line with fallback font
function drawLineWithFallback(wordsInLine, x, y) {
  let cursor = x;
  textFont('"Archive Grotesk 800"');
  textSize(textSizePx);
  for (let { word, sep } of wordsInLine) {
    if (sep.length > 0) cursor += textWidth(sep) + wordSpacing;
    for (let ch of word) {
      let cw = textWidth(ch);
      if (FALLBACK_CHARS.has(ch)) {
        textFont(FALLBACK_FONT);
        textStyle(BOLD);
        text(ch, cursor, y);
        textFont('"Archive Grotesk 800"');
        textStyle(NORMAL);
      } else {
        text(ch, cursor, y);
      }
      cursor += cw;
    }
  }
}

// Gradient map
function computeGradientMap() {
  if (!imgSample) return;
  imgSample.loadPixels();
  let w = imgSample.width;
  let h = imgSample.height;
  let pixels = imgSample.pixels;

  let luma = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let idx = (x + y * w) * 4;
      luma[x + y * w] =
        0.299 * pixels[idx + 0] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
    }
  }

  gradientMap = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let here = luma[x + y * w];
      let dx = x + 1 < w ? abs(luma[x + 1 + y * w] - here) : 0;
      let dy = y + 1 < h ? abs(luma[x + (y + 1) * w] - here) : 0;
      gradientMap[x + y * w] = dx + dy;
    }
  }
}

// Equal-mass cuts
function equalMassCuts(weights, length, count) {
  let total = 0;
  for (let i = 0; i < length; i++) total += weights[i];

  let edges = [0];
  if (total <= 0) {
    for (let i = 1; i < count; i++) edges.push(round((length * i) / count));
    edges.push(length);
    return edges;
  }

  let target = total / count;
  let cumulative = 0;
  let nextTarget = target;
  for (let i = 0; i < length && edges.length < count; i++) {
    cumulative += weights[i];
    if (cumulative >= nextTarget) {
      edges.push(i + 1);
      nextTarget += target;
    }
  }
  while (edges.length < count) edges.push(length);
  edges.push(length);
  return edges;
}

// Column edges
function computeColumnEdges() {
  if (!gradientMap || !imgSample) {
    colEdges = [];
    for (let i = 0; i <= cols; i++) colEdges.push(round((width * i) / cols));
    return;
  }
  let w = imgSample.width;
  let h = imgSample.height;
  let colWeight = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = 0; y < h; y++) sum += gradientMap[x + y * w];
    colWeight[x] = sum;
  }
  let edgesInImgSpace = equalMassCuts(colWeight, w, cols);
  colEdges = edgesInImgSpace.map((x) => (x / w) * width);
}

// Row edges
function computeRowEdges() {
  if (!gradientMap || !imgSample) {
    rowEdges = [];
    for (let i = 0; i <= rows; i++) rowEdges.push(round((height * i) / rows));
    return;
  }
  let w = imgSample.width;
  let h = imgSample.height;
  let rowWeight = new Float32Array(h);
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = 0; x < w; x++) sum += gradientMap[x + y * w];
    rowWeight[y] = sum;
  }
  let edgesInImgSpace = equalMassCuts(rowWeight, h, rows);
  rowEdges = edgesInImgSpace.map((y) => (y / h) * height);
}

function sliderVal(id) {
  return parseFloat(document.getElementById(id).value);
}


function save(){
  saveCanvas("pixelSort_Grid", "png")
}