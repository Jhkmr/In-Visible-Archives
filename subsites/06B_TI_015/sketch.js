let cols = 8;
let rows = 13;

let cellW = 675 / 10;
let cellH = 600 / 11;

let gridX = 40;
let gridY = 30;

let btnLoad, btnClear, btnSave, btnRowPlus, btnRowMinus, btnColPlus, btnColMinus, btnMode;
let sliderOne, sliderTwo, sliderThree, widthSlider, offsetSlider;

let displayMode = 'mask';

let sourceImage = null;
let ocrWords = [];
let ocrRunning = false;

let placingLocked = false;

let cachedContourPaths = [];
let cvDirty = true;
let lastCvBlur = -1, lastCvThresh = -1, lastCvConf = -1, lastCvPad = -1;


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
    cachedContourPaths = [];
    cvDirty = true;
  });

  btnSave = createButton('Save');
  btnSave.mousePressed(() => saveImage());

  btnMode = createButton('Mode: Type');
  btnMode.mousePressed(toggleMode);

  btnRowPlus  = createButton('+');
  btnRowMinus = createButton('-');
  btnColPlus  = createButton('+');
  btnColMinus = createButton('-');

  btnRowPlus.mousePressed(()  => { rows++; cvDirty = true; });
  btnRowMinus.mousePressed(() => { if (rows > 1) { rows--; cvDirty = true; } });
  btnColPlus.mousePressed(()  => { cols++; cvDirty = true; });
  btnColMinus.mousePressed(() => { if (cols > 1) { cols--; cvDirty = true; } });

  sliderOne   = createSlider(0, 1,1, 0.01);
  sliderTwo   = createSlider(0, 100, 30, 1);
  sliderThree = createSlider(0, 10, 8.7, 0.1);
  widthSlider   = createSlider(0.5, 10, 1, 0.5);
  offsetSlider  = createSlider(0, 255, 127, 1);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background('#fff');
  drawGrid();

  let bv = widthSlider.value(), tv = offsetSlider.value(), cv2 = sliderTwo.value(), pv = sliderOne.value();
  if (bv !== lastCvBlur || tv !== lastCvThresh || cv2 !== lastCvConf || pv !== lastCvPad) {
    lastCvBlur = bv; lastCvThresh = tv; lastCvConf = cv2; lastCvPad = pv; cvDirty = true;
  }

  if (sourceImage && ocrWords.length > 0) {
    if (displayMode === 'type') {
      drawTypeMode();
    } else if (displayMode === 'mask') {
      drawMaskMode();
    } else {
      drawMaskMode();
      drawTypeMode();
    }
    drawContourMode();
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
  text('Blur: '      + widthSlider.value(),   widthSlider.x  + widthSlider.width  + 4, gy + 15);
  text('Threshold: ' + offsetSlider.value(), offsetSlider.x + offsetSlider.width + 4, gy + 41);
}

// Type mode

function drawTypeMode() {
  let gw = cols * cellW;
  let gh = rows * cellH;

  fill('#00000000');
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

  if (window.cvReadyFlag && cachedContourPaths.length > 0) {
    let ctx = drawingContext;
    ctx.save();
    ctx.beginPath();
    for (let { ox, oy, pts } of cachedContourPaths) {
      if (pts.length === 0) continue;
      ctx.moveTo(ox + pts[0].x, oy + pts[0].y);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(ox + pts[k].x, oy + pts[k].y);
      ctx.closePath();
    }
    ctx.clip('evenodd');
    image(sourceImage, gridX, gridY, gw, gh);
    ctx.restore();
  } else {
    let padding = sliderOne.value();
    let confMin = sliderTwo.value();
    let visibleWords = ocrWords.filter(w => w.conf >= confMin);
    let rects = visibleWords.map(w => {
      let ww = w.w * gw, wh = w.h * gh;
      let px = padding * ww, py = padding * wh;
      return { x: gridX + w.x * gw - px, y: gridY + w.y * gh - py, w: ww + 2 * px, h: wh + 2 * py };
    });
    let ctx = drawingContext;
    ctx.save();
    ctx.beginPath();
    for (let r of rects) ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    image(sourceImage, gridX, gridY, gw, gh);
    ctx.restore();
  }
}

// OpenCV contour mode

function drawContourMode() {
  if (!window.cvReadyFlag) return;
  if (!sourceImage || ocrWords.length === 0) return;

  let gw = cols * cellW;
  let gh = rows * cellH;
  let confMin  = sliderTwo.value();
  let blurSize = max(1, round(widthSlider.value())) * 2 - 1;
  let threshVal = offsetSlider.value();

  if (cvDirty) {
    cachedContourPaths = [];
    cvDirty = false;

    let padding = sliderOne.value();
    let visibleWords = ocrWords.filter(w => w.conf >= confMin);

    for (let w of visibleWords) {
      let baseW = w.w * gw, baseH = w.h * gh;
      let px = padding * baseW, py = padding * baseH;
      let rx = w.x * gw - px,  ry = w.y * gh - py;
      let rw = baseW + 2 * px, rh = baseH + 2 * py;

      let x = gridX + rx, y = gridY + ry;
      let W = ceil(rw), H = ceil(rh);
      if (W < 1 || H < 1) continue;

      let pg = createGraphics(W, H);
      pg.pixelDensity(1);
      pg.image(sourceImage,
        0, 0, W, H,
        rx / gw * sourceImage.width, ry / gh * sourceImage.height,
        rw / gw * sourceImage.width, rh / gh * sourceImage.height);
      pg.loadPixels();
      if (!pg.pixels || pg.pixels.length === 0) { pg.remove(); continue; }

      let mat     = new cv.Mat(H, W, cv.CV_8UC4);
      let grayM   = new cv.Mat(H, W, cv.CV_8UC1);
      let blurM   = new cv.Mat(H, W, cv.CV_8UC1);
      let threshM = new cv.Mat(H, W, cv.CV_8UC1);
      let ctrs    = new cv.MatVector();
      let hier    = new cv.Mat();

      mat.data.set(pg.pixels);
      pg.remove();

      cv.cvtColor(mat, grayM, cv.COLOR_RGBA2GRAY);
      cv.blur(grayM, blurM, new cv.Size(blurSize, blurSize));
      cv.threshold(blurM, threshM, threshVal, 255, cv.THRESH_BINARY_INV);
      cv.findContours(threshM, ctrs, hier, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

      for (let i = 0; i < ctrs.size(); i++) {
        let contour = ctrs.get(i);
        let pts = [];
        for (let j = 0; j < contour.data32S.length; j += 2) {
          pts.push({ x: contour.data32S[j], y: contour.data32S[j + 1] });
        }
        if (pts.length > 1) cachedContourPaths.push({ ox: x, oy: y, pts });
        contour.delete();
      }

      mat.delete(); grayM.delete(); blurM.delete(); threshM.delete();
      ctrs.delete(); hier.delete();
    }
  }

  noFill();
  stroke(0);
  strokeWeight(1);
  for (let { ox, oy, pts } of cachedContourPaths) {
    beginShape();
    for (let p of pts) vertex(ox + p.x, oy + p.y);
    endShape(CLOSE);
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
      cachedContourPaths = [];
      cvDirty = true;
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
    cvDirty = true;
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
  pg.pixelDensity(1);
  pg.clear();

  if (sourceImage && ocrWords.length > 0) {
    let confMin = sliderTwo.value();

    if (displayMode === 'mask' || displayMode === 'both') {
      let ctx = pg.drawingContext;
      ctx.save();
      ctx.beginPath();

      if (cachedContourPaths.length > 0) {
        for (let { ox, oy, pts } of cachedContourPaths) {
          if (pts.length === 0) continue;
          ctx.moveTo(ox - gridX + pts[0].x, oy - gridY + pts[0].y);
          for (let k = 1; k < pts.length; k++) ctx.lineTo(ox - gridX + pts[k].x, oy - gridY + pts[k].y);
          ctx.closePath();
        }
        ctx.clip('evenodd');
      } else {
        let padding = sliderOne.value();
        let visibleWords = ocrWords.filter(w => w.conf >= confMin);
        for (let w of visibleWords) {
          let ww = w.w * gw, wh = w.h * gh;
          let px = padding * ww, py = padding * wh;
          ctx.rect(w.x * gw - px, w.y * gh - py, ww + 2 * px, wh + 2 * py);
        }
        ctx.clip();
      }

      pg.image(sourceImage, 0, 0, gw, gh);
      ctx.restore();
    }

    if (displayMode === 'type' || displayMode === 'both') {
      pg.textFont('monospace');
      pg.fill(0);
      pg.noStroke();
      pg.textAlign(LEFT, TOP);
      for (let w of ocrWords) {
        if (w.conf < confMin) continue;
        let fs = max(6, w.h * gh);
        pg.textSize(fs);
        pg.text(w.text, w.x * gw, w.y * gh);
      }
    }

    if (cachedContourPaths.length > 0) {
      pg.noFill();
      pg.stroke(0);
      pg.strokeWeight(0.5);
      for (let { ox, oy, pts } of cachedContourPaths) {
        pg.beginShape();
        for (let p of pts) pg.vertex(ox - gridX + p.x, oy - gridY + p.y);
        pg.endShape(CLOSE);
      }
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
