let cols = 8;
let rows = 8;

let DIN_RATIO = Math.SQRT2;

let xOffset = 0;
let yOffset = 0;
let isRunning = true;

let bitmask = 0;

let formula_id = 5;
let formulas = ["x&y", "x|y", "x^y", "(x&y)*(x&y)", "(x|y)*(x|y)", "(x^y)*(x^y)",
                "(x&y)³", "(x|y)³", "(x^y)³", "(x*x)&(y*y)", "(x*x)|(y*y)", "(x*x)^(y*y)"];
let formula2_id = 0;
let formulas2 = ["&", "|", "^"];
let customFormulaFn = null; 

let accBuf;

let img1;
let dragStartX, dragStartY, dragOffsetX, dragOffsetY;
let isDragging = false;

let CELL = 20;

function dinSize() {
  let wrap = document.querySelector('.canvas-wrap');
  let h = wrap.offsetHeight;
  let w = h / DIN_RATIO;
  if (w > wrap.offsetWidth) { w = wrap.offsetWidth; h = w * DIN_RATIO; }
  return { w: Math.floor(w), h: Math.floor(h) };
}

function patternX() { return CELL; }
function patternY() { return CELL; }
function patternW() { return width  - CELL; }
function patternH() { return height - CELL; }

function sliderVal(id) { return parseInt(document.getElementById(id).value); }

function bitmaskFromSliders() {
  let a = sliderVal('sliderA');
  let r = sliderVal('sliderR');
  let g = sliderVal('sliderG');
  let b = sliderVal('sliderB');
  return (a << 24) | (r << 16) | (g << 8) | b;
}

function setup() {
  let canvasWrap = document.querySelector('.canvas-wrap');
  let { w, h } = dinSize();
  let cnv = createCanvas(w, h);
  cnv.parent(canvasWrap);
  pixelDensity(1);

  img1   = createImage(patternW(), patternH());
  accBuf = createGraphics(patternW(), patternH());
  accBuf.pixelDensity(1);
  accBuf.background(204); 

  bitmask = bitmaskFromSliders();

  let modeBtnEl = document.getElementById('modeBtn');
  modeBtnEl.textContent = 'Formula: ' + formulas[formula_id];
  modeBtnEl.addEventListener('click', () => {
    formula_id = (formula_id + 1) % formulas.length;
    modeBtnEl.textContent = 'Formula: ' + formulas[formula_id];
    customFormulaFn = null;
    document.getElementById('customFormula').value = '';
    document.getElementById('formulaError').textContent = '';
  });

  let imgBtnEl = document.getElementById('imgToggleBtn');
  imgBtnEl.textContent = 'Op: ' + formulas2[formula2_id];
  imgBtnEl.addEventListener('click', () => {
    formula2_id = (formula2_id + 1) % formulas2.length;
    imgBtnEl.textContent = 'Op: ' + formulas2[formula2_id];
  });

  let pauseBtnEl = document.getElementById('btnLoad');
  pauseBtnEl.textContent = 'Pause';
  pauseBtnEl.addEventListener('click', () => {
    isRunning = !isRunning;
    pauseBtnEl.textContent = isRunning ? 'Pause' : 'Resume';
  });

  document.getElementById('btnClear').addEventListener('click', () => {
    accBuf.background(204);
  });
  document.getElementById('btnSave').addEventListener('click', () => save('bitwise.png'));

  document.getElementById('btnRowPlus').addEventListener('click',  () => rows++);
  document.getElementById('btnRowMinus').addEventListener('click', () => { if (rows > 1) rows--; });
  document.getElementById('btnColPlus').addEventListener('click',  () => cols++);
  document.getElementById('btnColMinus').addEventListener('click', () => { if (cols > 1) cols--; });

  document.getElementById('customFormula').addEventListener('input', (e) => {
    let src = e.target.value.trim();
    let errEl = document.getElementById('formulaError');
    if (!src) {
      customFormulaFn = null;
      errEl.textContent = '';
      return;
    }
    try {
      let fn = new Function('x', 'y', '"use strict"; return (' + src + ');');
      fn(1, 1);
      customFormulaFn = fn;
      errEl.textContent = '';
    } catch (err) {
      customFormulaFn = null;
      errEl.textContent = err.message;
    }
  });

  
  ['sliderR', 'sliderG', 'sliderB', 'sliderA'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      isRunning = false;
      document.getElementById('btnLoad').textContent = 'Resume';
      bitmask = bitmaskFromSliders();
    });
  });
}

function windowResized() {
  let { w, h } = dinSize();
  resizeCanvas(w, h);
  img1   = createImage(patternW(), patternH());
  accBuf = createGraphics(patternW(), patternH());
  accBuf.pixelDensity(1);
  accBuf.background(204);
}

function draw() {
  if (isRunning) {
    bitmask--;
    updateSliders();
  }

  drawBitwiseImage();

  //accBuf.noStroke();
  //accBuf.fill(204, 1);
  //accBuf.rect(0, 0, accBuf.width, accBuf.height);
 
  accBuf.image(img1, 0, 0);

  background(204);
  image(accBuf, patternX(), patternY());

  drawTopBits();
  drawLeftBits();
}

function updateSliders() {
  let b = bitmask & 0xFF;
  let g = (bitmask >> 8)  & 0xFF;
  let r = (bitmask >> 16) & 0xFF;
  let a = (bitmask >>> 24) & 0xFF;
  document.getElementById('sliderB').value = b;
  document.getElementById('sliderG').value = g;
  document.getElementById('sliderR').value = r;
  document.getElementById('sliderA').value = a;
  ['sliderB', 'sliderG', 'sliderR', 'sliderA'].forEach(id => {
    let thumb = document.getElementById(id + '-thumb');
    if (thumb) thumb.textContent = '[ ' + document.getElementById(id).value + ' ]';
  });
}

function applyFormula(x, y) {
  if (customFormulaFn) return customFormulaFn(x, y);
  let r1;
  if      (formula_id === 0)  r1 = x & y;
  else if (formula_id === 1)  r1 = x | y;
  else if (formula_id === 2)  r1 = x ^ y;
  else if (formula_id === 3)  r1 = (x & y) * (x & y);
  else if (formula_id === 4)  r1 = (x | y) * (x | y);
  else if (formula_id === 5)  r1 = (x ^ y) * (x ^ y);
  else if (formula_id === 6)  r1 = (x & y) * (x & y) * (x & y);
  else if (formula_id === 7)  r1 = (x | y) * (x | y) * (x | y);
  else if (formula_id === 8)  r1 = (x ^ y) * (x ^ y) * (x ^ y);
  else if (formula_id === 9)  r1 = (x * x) & (y * y);
  else if (formula_id === 10) r1 = (x * x) | (y * y);
  else                        r1 = (x * x) ^ (y * y);
  return r1;
}

function drawBitwiseImage() {
  if (img1.width !== patternW() || img1.height !== patternH()) {
    img1 = createImage(patternW(), patternH());
  }
  img1.loadPixels();
  let w = img1.width, h = img1.height;
  for (let i = 0; i < img1.pixels.length; i += 4) {
    let px = (i >> 2) % w;
    let py = (i >> 2) / w | 0;
    let x = px + xOffset;
    let y = py + yOffset;
    let r1 = applyFormula(x, y);

    let result;
    if      (formula2_id === 0) result = r1 & bitmask;
    else if (formula2_id === 1) result = r1 | bitmask;
    else                        result = r1 ^ bitmask;

    if ((result >> 8) === 0) {
      let v = result & 255;
      img1.pixels[i]   = v;
      img1.pixels[i+1] = v;
      img1.pixels[i+2] = v;
      img1.pixels[i+3] = 255;
    } else {
      img1.pixels[i]   = (result >> 16) & 255;
      img1.pixels[i+1] = (result >> 8)  & 255;
      img1.pixels[i+2] =  result        & 255;
      img1.pixels[i+3] = (result >>> 24) & 255;
    }
  }
  img1.updatePixels();
}

function drawTopBits() {
  let cellW = patternW() / cols;
  textAlign(CENTER, CENTER);
  textSize(CELL * 0.55);
  noStroke();
  for (let i = 0; i < cols; i++) {
    let bitIndex = cols - 1 - i;
    let bit = (xOffset >> bitIndex) & 1;
    fill(bit === 1 ? 0 : 230);
    rect(patternX() + i * cellW, 0, cellW, CELL);
    fill(bit === 1 ? 255 : 0);
    text(bit, patternX() + i * cellW + cellW / 2, CELL / 2);
  }
}

function drawLeftBits() {
  let cellH = patternH() / rows;
  textAlign(CENTER, CENTER);
  textSize(CELL * 0.55);
  noStroke();
  for (let i = 0; i < rows; i++) {
    let bitIndex = rows - 1 - i;
    let bit = (yOffset >> bitIndex) & 1;
    fill(bit === 1 ? 0 : 230);
    rect(0, patternY() + i * cellH, CELL, cellH);
    fill(bit === 1 ? 255 : 0);
    text(bit, CELL / 2, patternY() + i * cellH + cellH / 2);
  }
}

function mousePressed() {
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;

  let cellW = patternW() / cols;
  if (mouseY >= 0 && mouseY < CELL && mouseX >= patternX()) {
    let i = floor((mouseX - patternX()) / cellW);
    if (i >= 0 && i < cols) {
      xOffset = xOffset ^ (1 << (cols - 1 - i));
      return false;
    }
  }
  let cellH = patternH() / rows;
  if (mouseX >= 0 && mouseX < CELL && mouseY >= patternY()) {
    let i = floor((mouseY - patternY()) / cellH);
    if (i >= 0 && i < rows) {
      yOffset = yOffset ^ (1 << (rows - 1 - i));
      return false;
    }
  }
  if (mouseX >= patternX() && mouseX <= width &&
      mouseY >= patternY() && mouseY <= height) {
    isDragging = true;
    dragStartX  = mouseX;
    dragStartY  = mouseY;
    dragOffsetX = xOffset;
    dragOffsetY = yOffset;
  }
}

function mouseDragged() {
  if (!isDragging) return;
  xOffset = (dragOffsetX - (mouseX - dragStartX)) | 0;
  yOffset = (dragOffsetY - (mouseY - dragStartY)) | 0;
  return false;
}

function mouseReleased() {
  isDragging = false;
}

function keyPressed() {
  if (key === ' ')             { isRunning = !isRunning; document.getElementById('btnLoad').textContent = isRunning ? 'Pause' : 'Resume'; }
  if (keyCode === RIGHT_ARROW) xOffset++;
  if (keyCode === LEFT_ARROW)  xOffset--;
  if (keyCode === UP_ARROW)    yOffset--;
  if (keyCode === DOWN_ARROW)  yOffset++;
}
