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
let formulas2 = ["&", "|", "^", "~"];
let customFormulaFn = null; 

let viewMode = 1;
let tileSize = 64;

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
  cnv.elt.style.cursor = 'default';
  pixelDensity(1);
  textFont('Unica77 Mono');

  img1   = createImage(patternW(), patternH());
  accBuf = createGraphics(patternW(), patternH());
  accBuf.pixelDensity(1);
  accBuf.background(245); 

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

  let viewLabels = ['View: Pattern', 'View: Text', 'View: Both'];
  let toggleBtnEl = document.getElementById('btnToggleView');
  toggleBtnEl.textContent = viewLabels[viewMode];
  toggleBtnEl.addEventListener('click', () => {
    viewMode = (viewMode + 1) % 3;
    toggleBtnEl.textContent = viewLabels[viewMode];
  });

  document.getElementById('btnClear').addEventListener('click', () => {
    accBuf.background(245);
  });
  document.getElementById('btnSave').addEventListener('click', () => saveHighRes());

  document.getElementById('btnRowPlus').addEventListener('click',  () => rows++);
  document.getElementById('btnRowMinus').addEventListener('click', () => { if (rows > 1) rows--; });
  document.getElementById('btnColPlus').addEventListener('click',  () => cols++);
  document.getElementById('btnColMinus').addEventListener('click', () => { if (cols > 1) cols--; });
  document.getElementById('btnScalePlus').addEventListener('click',  () => { tileSize = Math.min(tileSize * 2, 512); });
  document.getElementById('btnScaleMinus').addEventListener('click', () => { tileSize = Math.max(tileSize / 2, 16); });

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
  accBuf.background(245);
}

function draw() {
  if (isRunning) {
    bitmask--;
    updateSliders();
  }

  clear();
  noStroke();
  fill('#f5f5f5');
  rect(patternX(), patternY(), patternW(), patternH());

  if (viewMode === 1) {
    drawTypography();
  } else {
    drawBitwiseImage();
    accBuf.image(img1, 0, 0);
    image(accBuf, patternX(), patternY());
    drawTopBits();
    drawLeftBits();
    if (viewMode === 2) drawTypography();
  }
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
    else if (formula2_id === 2) result = r1 ^ bitmask;
    else                        result = ~r1 & bitmask;

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

function drawTypography() {
  let textNumber = document.getElementById('textNumber').value || '030';
  let textPhrase = document.getElementById('textPhrase').value || 'Short phrase';
  let textLong   = document.getElementById('textLong').value   || 'Longer sentence or description';
  let texts = [textNumber, textPhrase, textLong];

  let period = tileSize;
  let ox = ((xOffset % period) + period) % period;
  let oy = ((yOffset % period) + period) % period;
  let tilesX = Math.ceil((patternW() + ox) / period) + 1;
  let tilesY = Math.ceil((patternH() + oy) / period) + 1;

  noStroke();
  textAlign(LEFT, TOP);

  for (let tx = 0; tx < tilesX; tx++) {
    for (let ty = 0; ty < tilesY; ty++) {
      let cx = patternX() + tx * period - ox;
      let cy = patternY() + ty * period - oy;

      if (cx + period < patternX() || cx > width) continue;
      if (cy + period < patternY() || cy > height) continue;

      let px = (tx * period - ox) + xOffset;
      let py = (ty * period - oy) + yOffset;
      let v = applyFormula(px, py) + bitmask;

      let r, g, b;
      if ((v >> 8) === 0) {
        r = g = b = v & 255;
      } else {
        r = (v >> 16) & 255;
        g = (v >> 8)  & 255;
        b =  v        & 255;
      }
      let L = 0.299 * r + 0.587 * g + 0.114 * b;

      let type = L < 20 ? 0 : L < 80 ? 1 : 2;
      let content = texts[type];
      let fontSize = Math.max(6, period * 0.14);

      textSize(fontSize);
      fill(type === 2 ? 60 : 0);

      if (type === 2) {
        text(content, cx, cy, period * 0.9);
      } else {
        text(content, cx, cy);
      }
    }
  }
}

function saveHighRes() {
  let scale = 4;
  let pw = patternW(), ph = patternH();
  let ew = pw * scale, eh = ph * scale;

  let g = createGraphics(ew, eh);
  g.pixelDensity(1);
  g.textFont('Unica77 Mono');
  g.clear();

  // Pixel pattern
  if (viewMode !== 1) {
    let img = g.createImage(ew, eh);
    img.loadPixels();
    for (let i = 0; i < img.pixels.length; i += 4) {
      let ex = (i >> 2) % ew;
      let ey = (i >> 2) / ew | 0;
      let x = (ex / scale | 0) + xOffset;
      let y = (ey / scale | 0) + yOffset;
      let r1 = applyFormula(x, y);
      let result;
      if      (formula2_id === 0) result = r1 & bitmask;
      else if (formula2_id === 1) result = r1 | bitmask;
      else if (formula2_id === 2) result = r1 ^ bitmask;
      else                        result = ~r1 & bitmask;
      if ((result >> 8) === 0) {
        let v = result & 255;
        img.pixels[i] = v; img.pixels[i+1] = v; img.pixels[i+2] = v; img.pixels[i+3] = 255;
      } else {
        img.pixels[i]   = (result >> 16) & 255;
        img.pixels[i+1] = (result >> 8)  & 255;
        img.pixels[i+2] =  result        & 255;
        img.pixels[i+3] = (result >>> 24) & 255;
      }
    }
    img.updatePixels();
    g.image(img, 0, 0);
  }

  // Typography
  if (viewMode !== 0) {
    let textNumber = document.getElementById('textNumber').value || '030';
    let textPhrase = document.getElementById('textPhrase').value || 'Short phrase';
    let textLong   = document.getElementById('textLong').value   || 'Longer sentence or description';
    let texts = [textNumber, textPhrase, textLong];

    let period = tileSize * scale;
    let ox = ((xOffset % (tileSize)) * scale + period) % period;
    let oy = ((yOffset % (tileSize)) * scale + period) % period;
    let tilesX = Math.ceil((ew + ox) / period) + 1;
    let tilesY = Math.ceil((eh + oy) / period) + 1;

    g.noStroke();
    g.textAlign(LEFT, TOP);

    for (let tx = 0; tx < tilesX; tx++) {
      for (let ty = 0; ty < tilesY; ty++) {
        let cx = tx * period - ox;
        let cy = ty * period - oy;

        let px2 = (tx * tileSize - (xOffset % tileSize + tileSize) % tileSize) + xOffset;
        let py2 = (ty * tileSize - (yOffset % tileSize + tileSize) % tileSize) + yOffset;
        let v = applyFormula(px2, py2) + bitmask;

        let r, gg2, b;
        if ((v >> 8) === 0) { r = gg2 = b = v & 255; }
        else { r = (v >> 16) & 255; gg2 = (v >> 8) & 255; b = v & 255; }
        let L = 0.299 * r + 0.587 * gg2 + 0.114 * b;

        let type = L < 20 ? 0 : L < 80 ? 1 : 2;
        let content = texts[type];
        let fontSize = Math.max(6 * scale, period * 0.14);

        g.textSize(fontSize);
        g.fill(type === 2 ? 60 : 0);
        if (type === 2) g.text(content, cx, cy, period * 0.9);
        else            g.text(content, cx, cy);
      }
    }
  }

  g.elt.toBlob(blob => {
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bitwise.png';
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
  g.remove();
}

function keyPressed() {
  if (key === ' ')             { isRunning = !isRunning; document.getElementById('btnLoad').textContent = isRunning ? 'Pause' : 'Resume'; }
  if (keyCode === RIGHT_ARROW) xOffset++;
  if (keyCode === LEFT_ARROW)  xOffset--;
  if (keyCode === UP_ARROW)    yOffset--;
  if (keyCode === DOWN_ARROW)  yOffset++;
}
