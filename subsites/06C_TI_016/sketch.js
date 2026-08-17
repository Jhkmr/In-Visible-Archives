let cols = 8;
let rows = 13;

let cellW = 675 / 10;
let cellH = 600 / 11;

let gridX = 40;
let gridY = 30;

const EXPORT_SCALE = 3;

let btnLoad, btnClear, btnSave, btnRowPlus, btnRowMinus, btnColPlus, btnColMinus, btnMode;
let sliderOne, sliderTwo, sliderThree, widthSlider, offsetSlider;

let displayMode = 'mask';

let sourceImage = null;
let ocrWords = [];
let ocrRunning = false;

let ortSession = null;

let placingLocked = false;

let cachedContourPaths = [];
let cvDirty = true;
let lastCvBlur = -1, lastCvThresh = -1, lastCvConf = -1, lastCvPad = -1;

let cachedStrips = [];
let stripsDirty = true;


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
    cachedStrips.forEach(s => s.pg.remove());
    cachedStrips = [];
    cvDirty = true;
    stripsDirty = true;
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
  background('#ffffff');
  drawGrid();

  let bv = widthSlider.value(), tv = offsetSlider.value(), cv2 = sliderTwo.value(), pv = sliderOne.value();
  if (bv !== lastCvBlur || tv !== lastCvThresh || cv2 !== lastCvConf || pv !== lastCvPad) {
    lastCvBlur = bv; lastCvThresh = tv; lastCvConf = cv2; lastCvPad = pv;
    cvDirty = true; stripsDirty = true;
  }

  if (sourceImage && ocrWords.length > 0) {
    if (displayMode === 'type') {
      drawTypeMode();
    } else if (displayMode === 'mask') {
      drawMaskMode();
    } else if (displayMode === 'strips') {
      drawMaskMode();
      drawStripsMode();
    } else {
      drawMaskMode();
      drawTypeMode();
    }
    if (displayMode !== 'strips') drawContourMode();
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

    if (w.angle && abs(w.angle) > 1) {
      push();
      translate(x, y);
      rotate(radians(w.angle));
      text(w.text, 0, 0);
      pop();
    } else {
      text(w.text, x, y);
    }
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
  stroke('#ff0000');
  strokeWeight(1);
  for (let { ox, oy, pts } of cachedContourPaths) {
    beginShape();
    for (let p of pts) vertex(ox + p.x, oy + p.y);
    endShape(CLOSE);
  }
}

// Strips mode

// Builds a single rotated, cropped strip buffer for word `w`, sampled from
// sourceImage at full resolution and sized relative to the given gw/gh grid
// dimensions (pass gw/gh * EXPORT_SCALE to build a higher-res strip for export).
function buildStrip(w, gw, gh, padding) {
  let sw = (w.w + padding * w.w * 2) * gw;
  let sh = (w.h + padding * w.h * 2) * gh;

  let cropW = max(2, ceil(sw));
  let cropH = max(2, ceil(sh));

  let imgX = w.x * sourceImage.width;
  let imgY = w.y * sourceImage.height;
  let imgW = w.w * sourceImage.width;
  let imgH = w.h * sourceImage.height;

  let padPxX = padding * imgW;
  let padPxY = padding * imgH;
  imgX -= padPxX; imgY -= padPxY;
  imgW += 2 * padPxX; imgH += 2 * padPxY;

  let diag = ceil(Math.sqrt(cropW * cropW + cropH * cropH));
  let buf = createGraphics(diag, diag);
  buf.pixelDensity(1);
  buf.clear();

  let bx = diag / 2, by = diag / 2;
  buf.push();
  buf.translate(bx, by);
  buf.rotate(radians(-w.angle));
  buf.imageMode(CENTER);
  buf.image(sourceImage,
    0, 0, cropW, cropH,
    imgX, imgY, imgW, imgH);
  buf.pop();

  let strip = createGraphics(cropW, cropH);
  strip.pixelDensity(1);
  strip.clear();
  strip.image(buf, 0, 0, cropW, cropH,
    (diag - cropW) / 2, (diag - cropH) / 2, cropW, cropH);
  buf.remove();

  return { pg: strip, w: cropW, h: cropH, angle: w.angle };
}

function drawStripsMode() {
  if (!sourceImage || ocrWords.length === 0) return;

  let confMin = sliderTwo.value();
  let padding = sliderOne.value();
  let gw = cols * cellW;
  let gh = rows * cellH;

  if (stripsDirty) {
    cachedStrips.forEach(s => s.pg.remove());
    cachedStrips = [];
    stripsDirty = false;

    let visibleWords = ocrWords.filter(w => w.conf >= confMin);

    for (let w of visibleWords) {
      cachedStrips.push(buildStrip(w, gw, gh, padding));
    }
  }

  if (cachedStrips.length === 0) return;

  let startX = gridX;
  let curY   = gridY;
  let gap    = 0.1;

  for (let s of cachedStrips) {
    image(s.pg, startX, curY, s.w, s.h);
    curY += s.h + gap;
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
  if (displayMode === 'type')        displayMode = 'mask';
  else if (displayMode === 'mask')   displayMode = 'strips';
  else if (displayMode === 'strips') displayMode = 'both';
  else                               displayMode = 'type';
  const labels = { type: 'Type', mask: 'Mask', strips: 'Strips', both: 'Both' };
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

async function runOCR(url) {
  ocrRunning = true;

  let [paddleRegions, tessResult] = await Promise.all([
    runPaddleDetect(sourceImage).catch(e => { console.error('PaddleOCR error:', e); return []; }),
    Tesseract.recognize(url, 'eng', {}).catch(e => { console.error('Tesseract error:', e); return { data: { words: [] } }; }),
  ]);

  ocrWords = [];
  let iw = sourceImage.width;
  let ih = sourceImage.height;

  for (let word of tessResult.data.words) {
    if (!word.text.trim()) continue;
    if (word.confidence < 30) continue;
    let b = word.bbox;

    let tx = b.x0 / iw, ty = b.y0 / ih;
    let tw = (b.x1 - b.x0) / iw, th = (b.y1 - b.y0) / ih;
    let tcx = tx + tw / 2, tcy = ty + th / 2;

    let best = null, bestScore = Infinity;
    for (let r of paddleRegions) {
      let dist = Math.hypot(r.cx - tcx, r.cy - tcy);
      let ox = Math.max(0, Math.min(tx + tw, r.x + r.w) - Math.max(tx, r.x));
      let oy = Math.max(0, Math.min(ty + th, r.y + r.h) - Math.max(ty, r.y));
      let overlap = (ox * oy) / (tw * th);
      if (overlap > 0.3 && dist < bestScore) { bestScore = dist; best = r; }
    }

    let entry = {
      text: word.text,
      conf: word.confidence,
      angle: 0,
      poly: null,
    };

    if (best) {
      entry.x    = best.x;
      entry.y    = best.y;
      entry.w    = best.w;
      entry.h    = best.h;
      entry.angle = best.angle;
      entry.poly  = best.poly;
    } else {
      entry.x = tx; entry.y = ty; entry.w = tw; entry.h = th;
    }

    ocrWords.push(entry);
  }

  ocrRunning = false;
  cvDirty = true;
  stripsDirty = true;
}

// PaddleOCR detection (ONNX)

const PADDLE_SIZE = 960;
const PADDLE_MEAN = [0.485, 0.456, 0.406];
const PADDLE_STD  = [0.229, 0.224, 0.225];
const DB_THRESH   = 0.3;
const DB_BOX_THRESH = 0.5;
const DB_UNCLIP   = 1.5;

async function runPaddleDetect(img) {
  if (!window.cvReadyFlag) return [];

  let iw = img.width, ih = img.height;
  let scale = Math.min(PADDLE_SIZE / iw, PADDLE_SIZE / ih);
  let fitW  = Math.round(iw * scale);
  let fitH  = Math.round(ih * scale);

  fitW = Math.max(32, Math.round(fitW / 32) * 32);
  fitH = Math.max(32, Math.round(fitH / 32) * 32);

  let pg = createGraphics(fitW, fitH);
  pg.pixelDensity(1);
  pg.background(128);
  pg.image(img, 0, 0, fitW, fitH);
  pg.loadPixels();
  let pixels = pg.pixels;
  pg.remove();

  let numPx = fitW * fitH;
  let data   = new Float32Array(3 * numPx);
  for (let i = 0; i < numPx; i++) {
    let ri = i * 4;
    data[i]             = (pixels[ri]     / 255 - PADDLE_MEAN[0]) / PADDLE_STD[0];
    data[numPx + i]     = (pixels[ri + 1] / 255 - PADDLE_MEAN[1]) / PADDLE_STD[1];
    data[2 * numPx + i] = (pixels[ri + 2] / 255 - PADDLE_MEAN[2]) / PADDLE_STD[2];
  }

  if (!ortSession) {
    try {
      ortSession = await ort.InferenceSession.create('../../models/ch_PP-OCRv4_det_infer.onnx');
      console.log('PaddleOCR ONNX session loaded');
    } catch (e) {
      console.error('Failed to load ONNX model:', e);
      return [];
    }
  }

  let tensor = new ort.Tensor('float32', data, [1, 3, fitH, fitW]);
  let feeds  = {};
  feeds[ortSession.inputNames[0]] = tensor;
  let results;
  try {
    results = await ortSession.run(feeds);
  } catch (e) {
    console.error('ONNX inference error:', e);
    return [];
  }

  let probMap = results[ortSession.outputNames[0]].data;

  let regions = [];
  let probMat  = new cv.Mat(fitH, fitW, cv.CV_32F);
  let binF     = new cv.Mat(fitH, fitW, cv.CV_32F);
  let bin8     = new cv.Mat(fitH, fitW, cv.CV_8U);

  probMat.data32F.set(probMap);
  cv.threshold(probMat, binF, DB_THRESH, 255, cv.THRESH_BINARY);
  binF.convertTo(bin8, cv.CV_8U);
  binF.delete();

  let contours = new cv.MatVector();
  let hier     = new cv.Mat();
  cv.findContours(bin8, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  for (let i = 0; i < contours.size(); i++) {
    let cnt = contours.get(i);

    if (cv.contourArea(cnt) < 16) { cnt.delete(); continue; }

    let rect  = cv.minAreaRect(cnt);
    let cx    = rect.center.x;
    let cy    = rect.center.y;
    let rw    = rect.size.width;
    let rh    = rect.size.height;
    let angle = rect.angle;

    if (rw < rh) { let t = rw; rw = rh; rh = t; angle += 90; }

    let boxMask = cv.Mat.zeros(fitH, fitW, cv.CV_8U);
    let pts4    = cv.RotatedRect.points(rect);
    let hull    = new cv.MatVector();
    let hullMat = new cv.Mat(4, 1, cv.CV_32SC2);
    for (let k = 0; k < 4; k++) {
      hullMat.intPtr(k, 0)[0] = Math.round(pts4[k].x);
      hullMat.intPtr(k, 0)[1] = Math.round(pts4[k].y);
    }
    hull.push_back(hullMat);
    cv.fillPoly(boxMask, hull, new cv.Scalar(1));

    let mean = cv.mean(probMat, boxMask);
    boxMask.delete(); hull.delete(); hullMat.delete();

    if (mean[0] < DB_BOX_THRESH) { cnt.delete(); continue; }

    let area   = cv.contourArea(cnt);
    let perim  = cv.arcLength(cnt, true);
    let expand = (area * DB_UNCLIP) / perim;

    let poly = [];
    for (let k = 0; k < 4; k++) {
      let dx = pts4[k].x - cx, dy = pts4[k].y - cy;
      let d  = Math.sqrt(dx * dx + dy * dy);
      let nx = d > 0 ? dx / d : 0, ny = d > 0 ? dy / d : 0;
      poly.push([
        (pts4[k].x + nx * expand) / fitW,
        (pts4[k].y + ny * expand) / fitH,
      ]);
    }

    let xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
    let bx = Math.min(...xs), by = Math.min(...ys);
    let bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;

    regions.push({
      poly,
      angle,
      cx: cx / fitW,
      cy: cy / fitH,
      x: bx, y: by, w: bw, h: bh,
    });

    cnt.delete();
  }

  probMat.delete(); bin8.delete();
  contours.delete(); hier.delete();

  console.log(`PaddleOCR found ${regions.length} text regions`);
  return regions;
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
  let sgw = gw * EXPORT_SCALE;
  let sgh = gh * EXPORT_SCALE;
  let pg = createGraphics(windowWidth * EXPORT_SCALE, windowHeight * EXPORT_SCALE);
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
          ctx.moveTo((ox - gridX + pts[0].x) * EXPORT_SCALE, (oy - gridY + pts[0].y) * EXPORT_SCALE);
          for (let k = 1; k < pts.length; k++) ctx.lineTo((ox - gridX + pts[k].x) * EXPORT_SCALE, (oy - gridY + pts[k].y) * EXPORT_SCALE);
          ctx.closePath();
        }
        ctx.clip('evenodd');
      } else {
        let padding = sliderOne.value();
        let visibleWords = ocrWords.filter(w => w.conf >= confMin);
        for (let w of visibleWords) {
          let ww = w.w * sgw, wh = w.h * sgh;
          let px = padding * ww, py = padding * wh;
          ctx.rect(w.x * sgw - px, w.y * sgh - py, ww + 2 * px, wh + 2 * py);
        }
        ctx.clip();
      }

      pg.image(sourceImage, 0, 0, sgw, sgh);
      ctx.restore();
    }

    if (displayMode === 'type' || displayMode === 'both') {
      pg.textFont('monospace');
      pg.fill(0);
      pg.noStroke();
      pg.textAlign(LEFT, TOP);
      for (let w of ocrWords) {
        if (w.conf < confMin) continue;
        let fs = max(6, w.h * sgh);
        pg.textSize(fs);
        pg.text(w.text, w.x * sgw, w.y * sgh);
      }
    }

    if (displayMode !== 'strips' && cachedContourPaths.length > 0) {
      pg.noFill();
      pg.stroke(0);
      pg.strokeWeight(0.5 * EXPORT_SCALE);
      for (let { ox, oy, pts } of cachedContourPaths) {
        pg.beginShape();
        for (let p of pts) pg.vertex((ox - gridX + p.x) * EXPORT_SCALE, (oy - gridY + p.y) * EXPORT_SCALE);
        pg.endShape(CLOSE);
      }
    }

    if (displayMode === 'strips' && ocrWords.length > 0) {
      let padding = sliderOne.value();
      let visibleWords = ocrWords.filter(w => w.conf >= confMin);
      let exportStrips = visibleWords.map(w => buildStrip(w, sgw, sgh, padding));

      if (exportStrips.length > 0) {
        pg.remove();
        let stripGap = 6 * EXPORT_SCALE;
        let totalH = exportStrips.reduce((s, c) => s + c.h + stripGap, 0);
        let maxW   = exportStrips.reduce((m, c) => max(m, c.w), 0);
        pg = createGraphics(maxW, totalH);
        pg.pixelDensity(1);
        pg.clear();
        let curY = 0;
        for (let s of exportStrips) {
          pg.image(s.pg, 0, curY, s.w, s.h);
          curY += s.h + stripGap;
          s.pg.remove();
        }
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
