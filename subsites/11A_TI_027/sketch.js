let cols = 15;
let rows = 13;

let gridX = 0;
let gridY = 0;

let layoutMode = 'progression';

let DIN_RATIO = Math.SQRT2;
let MARGIN = 0;

let pattern = ['u ', 'b '];
let weights  = [700, 100];

let CHAR_W = 7;
let CHAR_H = 14;

function sliderVal(id) { return parseFloat(document.getElementById(id).value); }

function dinSize() {
  let wrap = document.querySelector('.canvas-wrap');
  let h = wrap.offsetHeight;
  let w = h / DIN_RATIO;
 
  if (w > wrap.offsetWidth) {
    w = wrap.offsetWidth;
    h = w * DIN_RATIO;
  }
  return { w: Math.floor(w), h: Math.floor(h) };
}


function setup() {
  let canvasWrap = document.querySelector('.canvas-wrap');
  let { w, h } = dinSize();
  let cnv = createCanvas(w, h);
  cnv.parent(canvasWrap);
  pixelDensity(2);
  textAlign(CENTER, CENTER);
  noStroke();

  document.getElementById('btnLoad').addEventListener('click', () => {});
  document.getElementById('btnClear').addEventListener('click', () => {});
  document.getElementById('btnSave').addEventListener('click', saveImage);

  document.getElementById('btnRowPlus').addEventListener('click',  () => rows++);
  document.getElementById('btnRowMinus').addEventListener('click', () => { if (rows > 1) rows--; });
  document.getElementById('btnColPlus').addEventListener('click',  () => cols++);
  document.getElementById('btnColMinus').addEventListener('click', () => { if (cols > 1) cols--; });

  let modeBtnEl = document.getElementById('modeBtn');
  modeBtnEl.addEventListener('click', () => {
    layoutMode = layoutMode === 'base' ? 'progression' : 'base';
    modeBtnEl.textContent = 'Mode: ' + (layoutMode === 'base' ? 'Base' : 'Progression');
  });

  document.getElementById('imgToggleBtn').addEventListener('click', () => {});
}

function windowResized() {
  let { w, h } = dinSize();
  resizeCanvas(w, h);
}

function draw() {
  background(255);
  drawGrid();

  let charCols = floor(width  / CHAR_W);
  let charRows = floor(height / CHAR_H);
  let t = sliderVal('waveSlider') * 100;

  for (let row = 0; row < charRows; row++) {
    for (let col = 0; col < charCols; col++) {
      let blockCol = floor(col / charCols * cols);
      let blockRow = floor(row  / charRows * rows);

      let cx = col - charCols / 2;
      let cy = row  - charRows / 2;

      let o   = sin(cx * cy * 0.0017 + cy * 0.0033 + t) * 100;
      let i   = floor(abs(cx + cy + o));
      let c   = (blockCol + blockRow) % 2;

      let pat = pattern[c];
      let ch  = pat[i % pat.length];

      drawingContext.font = `${weights[c]} ${CHAR_W * 1.7}px monospace`;
      fill('black');
      text(ch, col * CHAR_W + CHAR_W / 2, row * CHAR_H + CHAR_H / 2);
    }
  }
}

function cellW() { return width  / cols; }
function cellH() { return height / rows; }

function drawGrid() {
  let cw = cellW(), ch = cellH();
  stroke(200);
  strokeWeight(1);
  noFill();
  for (let x = 0; x <= cols; x++) {
    line(gridX + x * cw, gridY, gridX + x * cw, gridY + rows * ch);
  }
  for (let y = 0; y <= rows; y++) {
    line(gridX, gridY + y * ch, gridX + cols * cw, gridY + y * ch);
  }
}

function saveImage() {
  let charCols = floor(width  / CHAR_W);
  let charRows = floor(height / CHAR_H);
  let t = sliderVal('waveSlider') * 100;

  let pg = createGraphics(width, height);
  pg.pixelDensity(2);
  pg.clear();
  pg.textAlign(CENTER, CENTER);
  pg.noStroke();

  for (let row = 0; row < charRows; row++) {
    for (let col = 0; col < charCols; col++) {
      let blockCol = floor(col / charCols * cols);
      let blockRow = floor(row  / charRows * rows);

      let cx = col - charCols / 2;
      let cy = row  - charRows / 2;

      let o   = sin(cx * cy * 0.0017 + cy * 0.0033 + t) * 100;
      let i   = floor(abs(cx + cy + o));
      let c   = (blockCol + blockRow) % 2;

      let pat = pattern[c];
      let ch  = pat[i % pat.length];

      pg.drawingContext.font = `${weights[c]} ${CHAR_W * 1.7}px monospace`;
      pg.fill('black');
      pg.text(ch, col * CHAR_W + CHAR_W / 2, row * CHAR_H + CHAR_H / 2);
    }
  }

  pg.elt.toBlob((blob) => {
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'type_' + cols + 'x' + rows + '.png';
    a.click();
    pg.remove();
  }, 'image/png');
}
