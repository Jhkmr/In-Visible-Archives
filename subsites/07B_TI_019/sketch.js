let cols = 8;
let rows = 13;

let cellW = 675 / 10;
let cellH = 600 / 11;

let gridX = 40;
let gridY = 30;

let btnLoad, btnClear, btnSave;
let btnRowPlus, btnRowMinus, btnColPlus, btnColMinus;
let padSliderX, padSliderY, blurSlider, threshSlider, contrastSlider;
let modeBtn, numBandsSlider, imgToggleBtn;
let showImage = false;

let layoutMode = 'base';
let progressionRegionIndex = -1;
let progressionBands = [];
let lastNumBands = -1;


let sourceImage = null;
let sourceImageName = 'GS0013';
let detectedRegions = [];
const ELEMENT_GAP = 2;
let ocrRunning = false;

let lastPad = -1, lastPadY = -1, lastBlur = -1, lastThresh = -1, lastContrast = -1;
let contoursDirty = true;

let ortSession = null;


function preload() {
  loadImage('media/GS0013.jpg', (img) => {
    sourceImage = img;
    runDetect();
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(2);
  textFont('monospace');

  btnLoad = createButton('Load');
  btnLoad.mousePressed(triggerFileLoad);

  btnClear = createButton('Clear');
  btnClear.mousePressed(() => {
    detectedRegions.forEach(r => {
      if (r.cropPg)   r.cropPg.remove();
      if (r.maskedPg) r.maskedPg.remove();
    });
    sourceImage = null;
    detectedRegions = [];
    contoursDirty = true;
  });

  btnSave = createButton('Save');
  btnSave.mousePressed(saveImage);

  btnRowPlus  = createButton('+');
  btnRowMinus = createButton('-');
  btnColPlus  = createButton('+');
  btnColMinus = createButton('-');

  btnRowPlus.mousePressed(()  => rows++);
  btnRowMinus.mousePressed(() => { if (rows > 1) rows--; });
  btnColPlus.mousePressed(()  => cols++);
  btnColMinus.mousePressed(() => { if (cols > 1) cols--; });

  padSliderX   = createSlider(0, 1, 0.17, 0.01);
  padSliderY   = createSlider(0, 1, 0.51, 0.01);
  blurSlider      = createSlider(1, 21, 9, 2);
  threshSlider    = createSlider(0, 255, 162, 1);
  contrastSlider  = createSlider(0, 400, 100, 1);

  numBandsSlider = createSlider(2, 7, 3, 1);

  modeBtn = createButton('Mode: Base');
  modeBtn.mousePressed(() => {
    layoutMode = layoutMode === 'base' ? 'progression' : 'base';
    modeBtn.html('Mode: ' + (layoutMode === 'base' ? 'Base' : 'Progression'));
    progressionRegionIndex = -1;
    contoursDirty = true;
  });

  imgToggleBtn = createButton('Image: Off');
  imgToggleBtn.mousePressed(() => {
    showImage = !showImage;
    imgToggleBtn.html('Image: ' + (showImage ? 'On' : 'Off'));
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  contoursDirty = true;
}

function draw() {
  background('#e6e6e6');
  drawGrid();

  let gy = gridY + rows * cellH;
  btnLoad.position(gridX + 8,      gy + 15);
  btnClear.position(gridX + 8,     gy + 40);
  btnSave.position(gridX + 8,      gy + 65);

  btnRowMinus.position(48, 8);
  btnRowPlus.position( 75, 8);
  btnColMinus.position(10, gridY + 8);
  btnColPlus.position( 10, gridY + 35);

  padSliderX.position(gridX + 100,   gy + 10);
  padSliderY.position(gridX + 100,   gy + 35);
  blurSlider.position(gridX + 100,   gy + 60);
  threshSlider.position(gridX + 100,   gy + 85);
  contrastSlider.position(gridX + 100, gy + 110);
  numBandsSlider.position(gridX + 100, gy + 135);
  modeBtn.position(gridX + 8, gy + 130);
  imgToggleBtn.position(gridX + 8, gy + 155);
  fill(0); noStroke(); textSize(11); textAlign(LEFT, BASELINE);
  text('Pad X: '     + nf(padSliderX.value(), 1, 2), gridX + 100 + padSliderX.width + 4,   gy + 16);
  text('Pad Y: '     + nf(padSliderY.value(), 1, 2), gridX + 100 + padSliderY.width + 4,   gy + 41);
  text('Blur: '      + blurSlider.value(),            gridX + 100 + blurSlider.width + 4,   gy + 66);
  text('Threshold: ' + threshSlider.value(),           gridX + 100 + threshSlider.width + 4,   gy + 91);
  text('Contrast: '  + contrastSlider.value() + '%',  gridX + 100 + contrastSlider.width + 4, gy + 116);
  text('Bands: '     + numBandsSlider.value(),         gridX + 100 + numBandsSlider.width + 4, gy + 141);

  let pv = padSliderX.value(), pvY = padSliderY.value(), bv = blurSlider.value(), tv = threshSlider.value(), cv = contrastSlider.value();
  if (pv !== lastPad || pvY !== lastPadY || bv !== lastBlur || tv !== lastThresh || cv !== lastContrast) {
    lastPad = pv; lastPadY = pvY; lastBlur = bv; lastThresh = tv; lastContrast = cv;
    contoursDirty = true;
  }

  let nbv = numBandsSlider.value();
  if (nbv !== lastNumBands) {
    lastNumBands = nbv;
    if (layoutMode === 'progression' && detectedRegions.length > 0) {
      let gw2 = cols * cellW, gh2 = rows * cellH;
      layoutProgression(gw2, gh2);
    }
  }

  if (ocrRunning) {
    fill(0); noStroke(); textSize(13); textAlign(LEFT, TOP);
    text('Running detection…', gridX, gridY + 10);
    return;
  }

  if (sourceImage) {
    let gw = cols * cellW;
    let gh = rows * cellH;
    let padX = padSliderX.value();
    let padY = padSliderY.value();
    let blurK  = blurSlider.value() % 2 === 0 ? blurSlider.value() + 1 : blurSlider.value();
    let thresh = threshSlider.value();

    if (contoursDirty && window.cvReadyFlag) {
      contoursDirty = false;
      for (let r of detectedRegions) {
        if (r.cropPg)    r.cropPg.remove();
        if (r.maskedPg)  r.maskedPg.remove();
        r.cropPg   = buildCrop(r, padX, padY, gw * CONTOUR_SCALE, gh * CONTOUR_SCALE);
        let contrastPg = applyContrast(r.cropPg, contrastSlider.value());
        r.contours = extractContours(contrastPg, blurK, thresh);
        contrastPg.remove();
        r.maskedPg = buildMasked(r.cropPg, r.contours);
      }
      if (layoutMode === 'base') {
        layoutRegions(gh);
      } else {
        layoutProgression(gw, gh);
      }
    }

    if (layoutMode === 'base') {
      for (let r of detectedRegions) {
        if (!r.pos) continue;
        let cx = r.pos.x, cy = r.pos.y;
        let bw = r.cropPg ? r.cropPg.width  : 1;
        let bh = r.cropPg ? r.cropPg.height : 1;

        push();
        translate(cx, cy);

        if (showImage && r.maskedPg) {
          imageMode(CENTER);
          image(r.maskedPg, 0, 0);
        }

        noFill(); stroke(0, 0, 0); strokeWeight(0);
        rectMode(CENTER); rect(0, 0, bw, bh);

        if (r.contours && r.contours.length > 0) {
          stroke(0, 0, 0); strokeWeight(1); noFill();
          for (let pts of r.contours) {
            beginShape();
            for (let p of pts) vertex(p.x, p.y);
            endShape(CLOSE);
          }
        }

        noStroke(); fill(0, 0, 0); textSize(9); textAlign(LEFT, BOTTOM);
        text(nf(r.angle, 1, 1) + '°', bw / 2 + 2, bh / 2 - 2);
        if (r.text) text(r.text, bw / 2 + 2, bh / 2 - 12);

        pop();
      }
    } else {
      if (progressionBands.length === 0 && detectedRegions.length > 0) {
        layoutProgression(gw, gh);
      }
      let numBands = numBandsSlider.value();
      let bandH = gh / numBands;
      let r = detectedRegions[progressionRegionIndex];
      if (r && r.cropPg) {
        let scaleX = gw / r.cropPg.width;
        let scaleY = gh / r.cropPg.height;
        for (let band of progressionBands) {
          let bandTop = gridY + band.bandIndex * bandH;
          push();
          drawingContext.save();
          drawingContext.beginPath();
          drawingContext.rect(gridX, bandTop, gw, bandH);
          drawingContext.clip();

          if (showImage) {
            let masked = buildMaskedStretched(r.cropPg, band.contours, gw, gh);
            imageMode(CORNER);
            image(masked, gridX, gridY);
            masked.remove();
          }

          if (band.contours && band.contours.length > 0) {
            stroke(0); strokeWeight(1); noFill(); //stroke(0); strokeWeight(1); noFill();
            for (let pts of band.contours) {
              beginShape();
              for (let p of pts)
                vertex(gridX + gw / 2 + p.x * scaleX, gridY + gh / 2 + p.y * scaleY);
              endShape(CLOSE);
            }
          }

          drawingContext.restore();
          pop();
        }
      }
    }
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

// Layout

function layoutRegions(gh) {
  let sorted = [...detectedRegions].sort((a, b) => a.cy - b.cy);
  let totalH = sorted.reduce((s, r) => s + (r.cropPg ? r.cropPg.height : 0), 0)
               + ELEMENT_GAP * (sorted.length - 1);
  let midX   = gridX + (cols * cellW) / 2;
  let startY = gridY + (gh - totalH) / 2;
  let cursor = startY;
  for (let r of sorted) {
    let bh = r.cropPg ? r.cropPg.height : 0;
    r.pos = { x: midX, y: cursor + bh / 2 };
    cursor += bh + ELEMENT_GAP;
  }
}

// Progression band layout
function layoutProgression(gw, gh) {
  if (detectedRegions.length === 0) { progressionBands = []; return; }
  if (progressionRegionIndex < 0 || progressionRegionIndex >= detectedRegions.length) {
    progressionRegionIndex = Math.floor(Math.random() * detectedRegions.length);
  }
  let r = detectedRegions[progressionRegionIndex];
  let numBands = numBandsSlider.value();
  let baseBlur = blurSlider.value();
  let contrastPg = r.cropPg ? applyContrast(r.cropPg, contrastSlider.value()) : null;
  progressionBands = [];
  for (let i = 0; i < numBands; i++) {
    let blurK = baseBlur + i * 4;
    if (blurK % 2 === 0) blurK += 1;
    let contours = contrastPg ? extractContours(contrastPg, blurK, threshSlider.value()) : [];
    progressionBands.push({
      regionIndex: progressionRegionIndex,
      bandIndex: i,
      contours,
    });
  }
  if (contrastPg) contrastPg.remove();
}

// File loading

function triggerFileLoad() {
  let input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    let file = e.target.files[0];
    if (!file) return;
    sourceImageName = file.name.replace(/\.[^.]+$/, '');
    let url = URL.createObjectURL(file);
    loadImage(url, (img) => {
      sourceImage = img;
      detectedRegions = [];
      runDetect();
    });
  };
  input.click();
}

// Detection trigger

async function runDetect() {
  if (!sourceImage) return;
  ocrRunning = true;

  detectedRegions.forEach(r => { if (r.cropPg) r.cropPg.remove(); });
  detectedRegions = await runPaddleDetect(sourceImage)
    .catch(e => { console.error('PaddleOCR error:', e); return []; });
  contoursDirty = true;

  const TARGET_H = 80;
  const TESS_PAD = 0.4;

  for (let r of detectedRegions) {
    r.text = '';

    let scale  = TARGET_H / (r.rh * rows * cellH);
    let tessGW = cols * cellW * scale;
    let tessGH = rows * cellH * scale;

    let strip = buildCrop(r, TESS_PAD, TESS_PAD, tessGW, tessGH);
    let dataUrl = strip.elt.toDataURL('image/png');
    strip.remove();

    try {
      let result = await Tesseract.recognize(dataUrl, 'eng');
      r.text = result.data.text.trim().replace(/\n/g, ' ');
    } catch (e) {
      console.warn('Tesseract failed for region:', e);
    }
  }

  ocrRunning = false;
}

// Crop helpers

function buildCrop(r, padX, padY, gw, gh) {
  let padW  = r.rw * (1 + 2 * padX);
  let padH  = r.rh * (1 + 2 * padY);
  let cropW = Math.max(1, Math.ceil(padW * gw));
  let cropH = Math.max(1, Math.ceil(padH * gh));
  let diag  = Math.ceil(Math.sqrt(cropW * cropW + cropH * cropH)) + 4;

  let buf = createGraphics(diag, diag);
  buf.pixelDensity(1);
  buf.background(255);
  buf.push();
  buf.translate(diag / 2, diag / 2);
  buf.rotate(radians(-r.angle));
  buf.translate(-r.cx * gw, -r.cy * gh);
  buf.image(sourceImage, 0, 0, gw, gh);
  buf.pop();

  let pg = createGraphics(cropW, cropH);
  pg.pixelDensity(1);
  pg.background(255);
  pg.image(buf, 0, 0, cropW, cropH,
    (diag - cropW) / 2, (diag - cropH) / 2, cropW, cropH);
  buf.remove();
  return pg;
}

function buildMasked(cropPg, contours) {
  let W = cropPg.width, H = cropPg.height;
  let pg = createGraphics(W, H);
  pg.pixelDensity(1);
  pg.clear();

  pg.imageMode(CENTER);
  pg.image(cropPg, W / 2, H / 2);

  let ctx = pg.drawingContext;
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = 'white';
  ctx.beginPath();
  for (let pts of contours) {
    if (pts.length < 2) continue;
    ctx.moveTo(pts[0].x + W / 2, pts[0].y + H / 2);
    for (let k = 1; k < pts.length; k++)
      ctx.lineTo(pts[k].x + W / 2, pts[k].y + H / 2);
    ctx.closePath();
  }
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  return pg;
}

// Contrast filter
function applyContrast(pg, pct) {
  let W = pg.width, H = pg.height;
  let out = createGraphics(W, H);
  out.pixelDensity(1);
  out.background(255);
  let ctx = out.drawingContext;
  ctx.filter = 'contrast(' + pct + '%)';
  ctx.drawImage(pg.elt, 0, 0);
  ctx.filter = 'none';
  return out;
}

// Stretched masked crop
function buildMaskedStretched(cropPg, contours, gw, gh) {
  let pg = createGraphics(gw, gh);
  pg.pixelDensity(1);
  pg.clear();

  pg.imageMode(CORNER);
  pg.image(cropPg, 0, 0, gw, gh);

  let scaleX = gw / cropPg.width;
  let scaleY = gh / cropPg.height;
  let ctx = pg.drawingContext;
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = 'white';
  ctx.beginPath();
  for (let pts of contours) {
    if (pts.length < 2) continue;
    ctx.moveTo(gw / 2 + pts[0].x * scaleX, gh / 2 + pts[0].y * scaleY);
    for (let k = 1; k < pts.length; k++)
      ctx.lineTo(gw / 2 + pts[k].x * scaleX, gh / 2 + pts[k].y * scaleY);
    ctx.closePath();
  }
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  return pg;
}

function extractContours(pg, blurK, thresh) {
  pg.loadPixels();
  if (!pg.pixels || pg.pixels.length === 0) return [];
  let W = pg.width, H = pg.height;

  let mat   = new cv.Mat(H, W, cv.CV_8UC4);
  let gray  = new cv.Mat();
  let blurM = new cv.Mat();
  let binM  = new cv.Mat();
  let ctrs  = new cv.MatVector();
  let hier  = new cv.Mat();

  mat.data.set(pg.pixels);
  cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
  cv.blur(gray, blurM, new cv.Size(blurK, blurK));
  cv.threshold(blurM, binM, thresh, 255, cv.THRESH_BINARY_INV);
  cv.findContours(binM, ctrs, hier, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

  let result = [];
  let offX = -W / 2, offY = -H / 2;
  for (let i = 0; i < ctrs.size(); i++) {
    let c = ctrs.get(i);
    let pts = [];
    for (let j = 0; j < c.data32S.length; j += 2) {
      pts.push({ x: c.data32S[j] + offX, y: c.data32S[j + 1] + offY });
    }
    if (pts.length > 1) result.push(pts);
    c.delete();
  }

  mat.delete(); gray.delete(); blurM.delete(); binM.delete();
  ctrs.delete(); hier.delete();
  return result;
}

// PaddleOCR detection (ONNX + OpenCV DB post-processing)

const PADDLE_SIZE    = 2048;
const CONTOUR_SCALE  = 4;
const PADDLE_MEAN  = [0.485, 0.456, 0.406];
const PADDLE_STD   = [0.229, 0.224, 0.225];
const DB_THRESH    = 0.3;
const DB_BOX_THRESH = 0.5;
const DB_UNCLIP    = 1.5;

async function runPaddleDetect(img) {
  if (!window.cvReadyFlag) {
    console.warn('OpenCV not ready yet');
    return [];
  }

  let iw = img.width, ih = img.height;
  let scale = Math.min(PADDLE_SIZE / iw, PADDLE_SIZE / ih);
  let fitW  = Math.max(32, Math.round(Math.round(iw * scale) / 32) * 32);
  let fitH  = Math.max(32, Math.round(Math.round(ih * scale) / 32) * 32);

  let pg = createGraphics(fitW, fitH);
  pg.pixelDensity(1);
  pg.background(128);
  pg.image(img, 0, 0, fitW, fitH);
  pg.loadPixels();
  let pixels = pg.pixels;
  pg.remove();

  let numPx = fitW * fitH;
  let data  = new Float32Array(3 * numPx);
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
  let probMat = new cv.Mat(fitH, fitW, cv.CV_32F);
  let binF    = new cv.Mat(fitH, fitW, cv.CV_32F);
  let bin8    = new cv.Mat(fitH, fitW, cv.CV_8U);

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

    let pts4    = cv.RotatedRect.points(rect);
    let boxMask = cv.Mat.zeros(fitH, fitW, cv.CV_8U);
    let hull    = new cv.MatVector();
    let hullMat = new cv.Mat(4, 1, cv.CV_32SC2);
    for (let k = 0; k < 4; k++) {
      hullMat.intPtr(k, 0)[0] = Math.round(pts4[k].x);
      hullMat.intPtr(k, 0)[1] = Math.round(pts4[k].y);
    }
    hull.push_back(hullMat);
    cv.fillPoly(boxMask, hull, new cv.Scalar(1));
    let meanVal = cv.mean(probMat, boxMask);
    boxMask.delete(); hull.delete(); hullMat.delete();

    if (meanVal[0] < DB_BOX_THRESH) { cnt.delete(); continue; }

    let area   = cv.contourArea(cnt);
    let perim  = cv.arcLength(cnt, true);
    let expand = perim > 0 ? (area * DB_UNCLIP) / perim : 0;

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

    regions.push({ poly, angle, cx: cx / fitW, cy: cy / fitH, x: bx, y: by, w: bw, h: bh,
                   rw: rw / fitW, rh: rh / fitH });
    cnt.delete();
  }

  probMat.delete(); bin8.delete();
  contours.delete(); hier.delete();

  console.log(`PaddleOCR: ${regions.length} regions detected`);
  return regions;
}

// Save

function saveStamp() {
  let d = new Date();
  let mm = String(d.getMonth() + 1).padStart(2, '0');
  let dd = String(d.getDate()).padStart(2, '0');
  let hh = String(d.getHours()).padStart(2, '0');
  let min = String(d.getMinutes()).padStart(2, '0');
  let ss = String(d.getSeconds()).padStart(2, '0');
  return sourceImageName + '_' + mm + dd + '_' + hh + min + ss;
}

function saveImage() {
  if (!sourceImage || detectedRegions.length === 0) return;

  let stamp = saveStamp();
  const SAVE_DENSITY = 2;
  let gw = cols * cellW;
  let gh = rows * cellH;

  let pgUI = createGraphics(gw, gh);
  pgUI.pixelDensity(SAVE_DENSITY);
  pgUI.clear();
  pgUI.stroke(200); pgUI.strokeWeight(1); pgUI.noFill();
  for (let x = 0; x <= cols; x++)
    pgUI.line(x * cellW, 0, x * cellW, gh);
  for (let y = 0; y <= rows; y++)
    pgUI.line(0, y * cellH, gw, y * cellH);
  pgUI.elt.toBlob((blob) => {
    triggerDownload(blob, stamp + '_ui.png');
    pgUI.remove();
  }, 'image/png');

  let pg = createGraphics(gw, gh);
  pg.pixelDensity(SAVE_DENSITY);
  pg.clear();
  pg.textFont('monospace');

  if (layoutMode === 'base') {
    for (let r of detectedRegions) {
      if (!r.pos || !r.cropPg) continue;

      let cx = r.pos.x - gridX;
      let cy = r.pos.y - gridY;
      let bw = r.cropPg.width;
      let bh = r.cropPg.height;

      pg.push();
      pg.translate(cx, cy);

      if (showImage && r.maskedPg) {
        pg.imageMode(CENTER);
        pg.image(r.maskedPg, 0, 0);
      }

      pg.noStroke(); pg.strokeWeight(1); pg.noFill();
      pg.rectMode(CENTER); pg.rect(0, 0, bw, bh);

      if (r.contours && r.contours.length > 0) {
        pg.stroke(0, 0, 0); pg.strokeWeight(1); pg.noFill(0);
        for (let pts of r.contours) {
          pg.beginShape();
          for (let p of pts) pg.vertex(p.x, p.y);
          pg.endShape(CLOSE);
        }
      }

      pg.noStroke(); pg.fill(0, 0, 0); pg.textSize(9); pg.textAlign(LEFT, BOTTOM);
      pg.text(nf(r.angle, 1, 1) + '°', bw / 2 + 2, bh / 2 - 2);
      if (r.text) pg.text(r.text, bw / 2 + 2, bh / 2 - 12);

      pg.pop();
    }
  } else {
    let numBands = numBandsSlider.value();
    let bandH = gh / numBands;
    let r = detectedRegions[progressionRegionIndex];
    if (r && r.cropPg) {
      let scaleX = gw / r.cropPg.width;
      let scaleY = gh / r.cropPg.height;
      for (let band of progressionBands) {
        let bandTop = band.bandIndex * bandH;
        pg.push();
        let ctx2 = pg.drawingContext;
        ctx2.save();
        ctx2.beginPath();
        ctx2.rect(0, bandTop, gw, bandH);
        ctx2.clip();

        if (showImage) {
          let masked = buildMaskedStretched(r.cropPg, band.contours, gw, gh);
          pg.imageMode(CORNER);
          pg.image(masked, 0, 0);
          masked.remove();
        }

        if (band.contours && band.contours.length > 0) {
          pg.stroke(0); pg.strokeWeight(1); pg.noFill(); //fill(0)
          for (let pts of band.contours) {
            pg.beginShape();
            for (let p of pts)
              pg.vertex(gw / 2 + p.x * scaleX, gh / 2 + p.y * scaleY);
            pg.endShape(CLOSE);
          }
        }

        ctx2.restore();
        pg.pop();
      }
    }
  }

  pg.elt.toBlob((blob) => {
    triggerDownload(blob, stamp + '_content.png');
    pg.remove();
  }, 'image/png');
}

function triggerDownload(blob, filename) {
  let a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
