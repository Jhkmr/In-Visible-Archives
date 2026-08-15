let cols = 8;
let rows = 13;

let cellW = 675 / 10;
let cellH = 600 / 11;

let gridX = 40;
let gridY = 30;

let btnLoad, btnClear, btnSave, btnRowPlus, btnRowMinus, btnColPlus, btnColMinus, btnMode;
let sliderOne, sliderTwo, sliderThree, widthSlider, offsetSlider;

let displayMode = 'both';

let sourceImage = null;
let ocrWords = [];
let ocrRunning = false;

let placingLocked = false;


function preload() {
  loadImage('media/GS0013.jpg', (img) => {
    sourceImage = img;
    runOCR('media/GS0013.jpg');
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');

  btnLoad = createButton('Load');
  btnLoad.mousePressed(triggerFileLoad);

  btnClear = createButton('Clear');
  btnClear.mousePressed(() => {
    sourceImage = null;
    ocrWords = [];
  });

  btnSave = createButton('Save');
  btnSave.mousePressed(() => saveImage());

  btnMode = createButton('Mode: Type');
  btnMode.mousePressed(toggleMode);

  btnRowPlus  = createButton('+');
  btnRowMinus = createButton('-');
  btnColPlus  = createButton('+');
  btnColMinus = createButton('-');

  btnRowPlus.mousePressed(()  => rows++);
  btnRowMinus.mousePressed(() => { if (rows > 1) rows--; });
  btnColPlus.mousePressed(()  => cols++);
  btnColMinus.mousePressed(() => { if (cols > 1) cols--; });

  sliderOne   = createSlider(0, 1, 0, 0.01);
  sliderTwo   = createSlider(0, 100, 30, 1);
  sliderThree = createSlider(0, 10, 8.7, 0.1);
  widthSlider   = createSlider(0.5, 10, 1, 0.5);
  offsetSlider  = createSlider(-4 * cellW, 4 * cellW, 0, 1);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background('#e6e6e6');
  drawGrid();

  if (sourceImage && ocrWords.length > 0) {
    if (displayMode === 'type') {
      drawTypeMode();
    } else if (displayMode === 'mask') {
      drawMaskMode();
    } else {
      drawMaskMode();
      drawTypeMode();
    }
  } else if (ocrRunning) {
    fill('#000000');
    noStroke();
    textSize(13);
    textAlign(LEFT, TOP);
    text('Running OCR…', gridX, gridY + 10);
  }

  let gy = gridY + rows * cellH;

  btnLoad.position(gridX + 8, gy + 15);
  btnClear.position(gridX + 8, gy +40);
  btnSave.position(gridX + 8, gy + 65);
  btnMode.position(gridX + 8, gy + 90);

  btnRowMinus.position(48, 8);
  btnRowPlus.position( 75, 8);

  btnColMinus.position(10, gridY + 8);
  btnColPlus.position( 10, gridY + 35);

  sliderOne.position(gridX + 100, gy + 10);
  sliderTwo.position(gridX + 100, gy + 35);
  sliderThree.position(gridX + 100, gy + 60);
  widthSlider.position(gridX + 430, gy + 10);
  offsetSlider.position(gridX + 430, gy + 35);

  fill(0);
  noStroke();
  textSize(11);
  textAlign(LEFT, BASELINE);
  text('Padding: ' + nf(sliderOne.value(), 1, 2),  sliderOne.x   + sliderOne.width   + 4, gy + 15);
  text('Conf: '   + sliderTwo.value(),               sliderTwo.x   + sliderTwo.width   + 4, gy + 41);
  text('Three: '  + sliderThree.value(),            sliderThree.x + sliderThree.width + 4, gy + 66);
  text('Width: '  + widthSlider.value(),            widthSlider.x + widthSlider.width + 4, gy + 15);
  text('Offset: ' + nf(offsetSlider.value(), 1, 1), offsetSlider.x + offsetSlider.width + 4, gy + 41);
}

// Type mode

function drawTypeMode() {
  let gw = cols * cellW;
  let gh = rows * cellH;

  fill('#000000');
  noStroke();
  textAlign(LEFT, TOP);

  let confMin = sliderTwo.value();

  for (let w of ocrWords) {
    if (w.conf < confMin) continue;
    let x  = gridX + w.x * gw;
    let y  = gridY + w.y * gh;
    let wh = w.h * gh;

    let fs = max(6, wh);
    textSize(fs);
    text(w.text, x, y);
  }
}

// Mask mode

function drawMaskMode() {
  let gw = cols * cellW;
  let gh = rows * cellH;
  let padding = sliderOne.value();
  let confMin = sliderTwo.value();

  let visibleWords = ocrWords.filter(w => w.conf >= confMin);

  let rects = visibleWords.map(w => {
    let x  = gridX + w.x * gw;
    let y  = gridY + w.y * gh;
    let ww = w.w * gw;
    let wh = w.h * gh;
    let px = padding * ww;
    let py = padding * wh;
    return { x: x - px, y: y - py, w: ww + 2 * px, h: wh + 2 * py };
  });

  let ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  for (let r of rects) ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  image(sourceImage, gridX, gridY, gw, gh);
  ctx.restore();

  fill('#00000000');
  stroke('#000000');
  strokeWeight(1);
  for (let r of rects) {
    rect(r.x, r.y, r.w, r.h);
  }
}

// Grid

function drawGrid() {
  stroke(200);
  strokeWeight(1);
  noFill();
  for (let x = 0; x <= cols; x++) {
    line(gridX + x * cellW, gridY, gridX + x * cellW, gridY + rows * cellH);
  }
  for (let y = 0; y <= rows; y++) {
    line(gridX, gridY + y * cellH, gridX + cols * cellW, gridY + y * cellH);
  }
}

// Mode toggle

function toggleMode() {
  if (displayMode === 'type')       displayMode = 'mask';
  else if (displayMode === 'mask')  displayMode = 'both';
  else                              displayMode = 'type';
  const labels = { type: 'Type', mask: 'Mask', both: 'Both' };
  btnMode.html('Mode: ' + labels[displayMode]);
}

// File loading and OCR

function triggerFileLoad() {
  let input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    let file = e.target.files[0];
    if (!file) return;

    let url = URL.createObjectURL(file);
    loadImage(url, (img) => {
      sourceImage = img;
      ocrWords = [];
      runOCR(url);
    });
  };
  input.click();
}

function runOCR(url) {
  ocrRunning = true;

  Tesseract.recognize(url, 'eng', {
  }).then(({ data }) => {
    ocrWords = [];

    let iw = sourceImage.width;
    let ih = sourceImage.height;

    for (let word of data.words) {
      if (!word.text.trim()) continue;
      if (word.confidence < 30) continue;
      let b = word.bbox;
      ocrWords.push({
        text: word.text,
        x: b.x0 / iw,
        y: b.y0 / ih,
        w: (b.x1 - b.x0) / iw,
        h: (b.y1 - b.y0) / ih,
        conf: word.confidence,
      });
    }

    ocrRunning = false;
  }).catch((err) => {
    console.error('OCR error:', err);
    ocrRunning = false;
  });
}

// Mouse placement

function mousePressed(event) {
  if (event.target.tagName === 'BUTTON') return;
  if (mouseX < gridX || mouseX > gridX + cols * cellW || mouseY < gridY || mouseY > gridY + rows * cellH) return;

  let pt = getClosestIntersection(mouseX - gridX, mouseY - gridY);
  if (pt.x < 2 || pt.x > cols - 2 || pt.y < 2 || pt.y > rows - 2) return;

  pt.rot = floor(random(4)) * HALF_PI;
  type1Shapes.push(pt);
}

function getClosestIntersection(x, y) {
  return {
    x: Math.round(x / cellW),
    y: Math.round(y / cellH),
  };
}

// Save

function saveImage() {
  let gw = cols * cellW;
  let gh = rows * cellH;
  let pg = createGraphics(gw, gh);

  pg.clear();

  if (sourceImage && ocrWords.length > 0) {
    if (displayMode === 'type' || displayMode === 'both') {
      pg.textFont('monospace');
      pg.fill(0);
      pg.noStroke();
      pg.textAlign(LEFT, TOP);
      let confMin = sliderTwo.value();
      for (let w of ocrWords) {
        if (w.conf < confMin) continue;
        let x  = w.x * gw;
        let y  = w.y * gh;
        let fs = max(6, w.h * gh);
        pg.textSize(fs);
        pg.text(w.text, x, y);
      }
    }
    if (displayMode === 'mask' || displayMode === 'both') {
      let padding = sliderOne.value();
      let confMin = sliderTwo.value();
      let visibleWords = ocrWords.filter(w => w.conf >= confMin);

      let rects = visibleWords.map(w => {
        let x  = w.x * gw;
        let y  = w.y * gh;
        let ww = w.w * gw;
        let wh = w.h * gh;
        let px = padding * ww;
        let py = padding * wh;
        return { x: x - px, y: y - py, w: ww + 2 * px, h: wh + 2 * py };
      });

      let ctx = pg.drawingContext;
      ctx.save();
      ctx.beginPath();
      for (let r of rects) ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
      pg.image(sourceImage, 0, 0, gw, gh);
      ctx.restore();

      pg.noFill();
      pg.stroke(pg.color(0));
      pg.strokeWeight(1);
      for (let r of rects) pg.rect(r.x, r.y, r.w, r.h);
    }
  }

  let canvas = pg.elt;
  canvas.toBlob((blob) => {
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'TypeImage.png';
    a.click();
  }, 'image/png');

  pg.remove();
}
