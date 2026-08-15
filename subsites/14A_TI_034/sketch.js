let cols = 15;
let rows = 13;
let isPortrait = true;

let cellW;
let cellH;

let gridX = 30;
let gridY = 40;


function updateGridMetrics() {
  cellW = (width - gridX * 2) / cols;
  cellH = (height - gridY * 2) / rows;
}

let showImage = false;

const DOT_FILL_MODES = ["outline", "fill"];
let dotFillMode = "outline";

const SLANT_MODES = ["regular", "slanted", "backslanted"];
const SLANT_ANGLES = { regular: 0, slanted: 45, backslanted: -45 };
let slantMode = "regular";

let layoutMode = "progression";
let progressionRegionIndex = -1;

let sourceImage = null;
let sourceImageName = "GS0068_03";
let detectedRegions = [];
const ELEMENT_GAP = 20;
let ocrRunning = false;

// Contour cache
let lastPad = -1,
  lastPadY = -1,
  lastBlur = -1,
  lastThresh = -1,
  lastContrast = -1;
let contoursDirty = true;

// Dot-grid cache
let dotGridDirty = true;
let lastSpacing = -1, lastActiveSize = -1;
let cachedOutlineDots = [];

// Dot render snippet
const DOT_RENDER_METHODS = [
  "push", "pop", "translate", "rotate", "scale", "shearX", "shearY",
  "angleMode", "stroke", "noStroke", "strokeWeight", "fill", "noFill",
  "rectMode", "rect", "ellipse", "circle", "line", "point", "triangle",
  "quad", "beginShape", "vertex", "endShape",
  "colorMode", "color", "lerpColor", "red", "green", "blue", "alpha",
  "hue", "saturation", "brightness",
  "map", "constrain", "random", "noise", "dist", "lerp", "radians", "degrees",
];
let dotRenderBody = `angleMode(DEGREES);
stroke(0);
strokeWeight(1);
noFill();
for (let d of dots) {
  push();
  translate(gridX + d.x, gridY + d.y);
  rotate(25);
  line(10, 0, 0, activeSize * 5);
  pop();
}`;
let dotRenderFn = null;
dotRenderFn = compileDotRenderFn(dotRenderBody);

function compileDotRenderFn(body) {
  try {
    let methodParams = DOT_RENDER_METHODS.join(", ");
    let wrappedBody = `
      let { ${methodParams} } = target;
      ${DOT_RENDER_METHODS.map((m) => `${m} = ${m}.bind(target);`).join("\n")}
      ${body}
    `;
    return new Function("target", "dots", "activeSize", "gridX", "gridY", wrappedBody);
  } catch (e) {
    console.error("Dot render snippet failed to compile:", e);
    return null;
  }
}

let ortSession = null;

function sliderVal(id) {
  return parseFloat(document.getElementById(id).value);
}

function preload() {
  document.getElementById("imagePreview").src = "media/GS0068_03.jpg";
  loadImage("media/GS0068_03.jpg", (img) => {
    sourceImage = img;
    window._p5SourceImageReady = true;
    if (window.cvReadyFlag) runDetect();
  });
}

function setup() {
  let canvasWrap = document.querySelector(".canvas-wrap");
  let { w, h } = fitSize(canvasWrap, isPortrait ? 1 / Math.SQRT2 : Math.SQRT2);
  let cnv = createCanvas(w, h);

  cnv.parent(canvasWrap);
  pixelDensity(2);
  textFont("Archive Grotesk 400");
  updateGridMetrics();

  document.getElementById("btnLoad").addEventListener("click", triggerFileLoad);

  document.getElementById("btnClear").addEventListener("click", () => {
    detectedRegions.forEach((r) => {
      if (r.cropPg) r.cropPg.remove();
      if (r.maskedPg) r.maskedPg.remove();
      if (r.maskedStretchedPg) r.maskedStretchedPg.remove();
    });
    sourceImage = null;
    detectedRegions = [];
    contoursDirty = true;
  });

  document.getElementById("btnSave").addEventListener("click", saveImage);

  const orientationBtnEl = document.getElementById("btnOrientation");
  orientationBtnEl.addEventListener("click", () => {
    isPortrait = !isPortrait;
    orientationBtnEl.textContent =
      "Orientation: " + (isPortrait ? "Portrait" : "Landscape");
    applyCanvasSize();
  });

  document.getElementById("btnRowPlus").addEventListener("click", () => {
    rows++;
    applyCanvasSize();
  });
  document.getElementById("btnRowMinus").addEventListener("click", () => {
    if (rows > 1) rows--;
    applyCanvasSize();
  });
  document.getElementById("btnColPlus").addEventListener("click", () => {
    cols++;
    applyCanvasSize();
  });
  document.getElementById("btnColMinus").addEventListener("click", () => {
    if (cols > 1) cols--;
    applyCanvasSize();
  });

  const dotRenderEditorEl = document.getElementById("dotRenderEditor");
  dotRenderEditorEl.value = dotRenderBody;
  document.getElementById("dotRenderUpdateBtn").addEventListener("click", () => {
    let newBody = dotRenderEditorEl.value;
    let compiled = compileDotRenderFn(newBody);
    if (compiled) {
      dotRenderFn = compiled;
      dotRenderBody = newBody;
      dotGridDirty = true;
    } else {
      alert("Dot render snippet has an error — check the console.");
    }
  });

  const modeBtnEl = document.getElementById("modeBtn");
  modeBtnEl.addEventListener("click", () => {
    layoutMode = layoutMode === "base" ? "progression" : "base";
    modeBtnEl.textContent =
      "Mode: " + (layoutMode === "base" ? "Base" : "Progression");
    progressionRegionIndex = -1;
    contoursDirty = true;
  });

  const imgBtnEl = document.getElementById("imgToggleBtn");
  imgBtnEl.addEventListener("click", () => {
    showImage = !showImage;
    imgBtnEl.textContent = "Image: " + (showImage ? "On" : "Off");
  });

  const dotFillBtnEl = document.getElementById("dotFillBtn");
  dotFillBtnEl.addEventListener("click", () => {
    let idx = (DOT_FILL_MODES.indexOf(dotFillMode) + 1) % DOT_FILL_MODES.length;
    dotFillMode = DOT_FILL_MODES[idx];
    dotFillBtnEl.textContent =
      "Dots: " + dotFillMode.charAt(0).toUpperCase() + dotFillMode.slice(1);
    dotGridDirty = true;
  });

  const slantBtnEl = document.getElementById("slantBtn");
  slantBtnEl.addEventListener("click", () => {
    let idx = (SLANT_MODES.indexOf(slantMode) + 1) % SLANT_MODES.length;
    slantMode = SLANT_MODES[idx];
    slantBtnEl.textContent =
      "Slant: " + slantMode.charAt(0).toUpperCase() + slantMode.slice(1);
    dotGridDirty = true;
  });

}

let resizeDebounceTimer = null;

function windowResized() {
  applyCanvasSize({ rebuildContours: false });
  clearTimeout(resizeDebounceTimer);
  resizeDebounceTimer = setTimeout(() => {
    contoursDirty = true;
  }, 150);
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

function applyCanvasSize({ rebuildContours = true } = {}) {
  let canvasWrap = document.querySelector(".canvas-wrap");
  let { w, h } = fitSize(canvasWrap, isPortrait ? 1 / Math.SQRT2 : Math.SQRT2);
  resizeCanvas(w, h);
  updateGridMetrics();
  dotGridDirty = true;
  if (rebuildContours) contoursDirty = true;
}

function draw() {
  background("#ffffff");
  drawGrid();

  let pv = sliderVal("padSliderX"),
    pvY = sliderVal("padSliderY"),
    bv = sliderVal("blurSlider"),
    tv = sliderVal("threshSlider"),
    cv = sliderVal("contrastSlider");
  if (
    pv !== lastPad ||
    pvY !== lastPadY ||
    bv !== lastBlur ||
    tv !== lastThresh ||
    cv !== lastContrast
  ) {
    lastPad = pv;
    lastPadY = pvY;
    lastBlur = bv;
    lastThresh = tv;
    lastContrast = cv;
    contoursDirty = true;
    dotGridDirty = true;
  }

  let sv = sliderVal("dotSpacingSlider"), av = sliderVal("activeDotSizeSlider");
  if (sv !== lastSpacing || av !== lastActiveSize) {
    lastSpacing = sv;
    lastActiveSize = av;
    dotGridDirty = true;
  }

  if (ocrRunning) {
    fill(0);
    noStroke();
    textSize(13);
    textAlign(LEFT, TOP);
    text("Running detection…", gridX, gridY + 10);
    return;
  }

  if (sourceImage) {
    let gw = cols * cellW;
    let gh = rows * cellH;
    let padX = sliderVal("padSliderX");
    let padY = sliderVal("padSliderY");
    let blurRaw = sliderVal("blurSlider");
    let blurK = blurRaw % 2 === 0 ? blurRaw + 1 : blurRaw;
    let thresh = sliderVal("threshSlider");

    if (contoursDirty && window.cvReadyFlag) {
      contoursDirty = false;
      dotGridDirty = true;
      for (let r of detectedRegions) {
        if (r.cropPg) r.cropPg.remove();
        if (r.maskedPg) r.maskedPg.remove();
        r.cropPg = buildCrop(
          r,
          padX,
          padY,
          gw * CONTOUR_SCALE,
          gh * CONTOUR_SCALE,
        );
        let contrastPg = applyContrast(r.cropPg, sliderVal("contrastSlider"));
        r.contours = extractContours(contrastPg, blurK, thresh);
        contrastPg.remove();
        r.maskedPg = buildMasked(r.cropPg, r.contours);
      }
      if (layoutMode === "base") {
        layoutRegions(gh);
      } else {
        pickProgressionRegion();
      }

      for (let r of detectedRegions) {
        if (r.maskedStretchedPg) {
          r.maskedStretchedPg.remove();
          r.maskedStretchedPg = null;
        }
      }
      let pr = detectedRegions[progressionRegionIndex];
      if (pr && pr.cropPg) {
        pr.maskedStretchedPg = buildMaskedStretched(
          pr.cropPg,
          pr.contours,
          gw,
          gh,
        );
      }
    }

    if (layoutMode === "base") {
      // Base mode
      for (let r of detectedRegions) {
        if (!r.pos) continue;
        let cx = r.pos.x,
            cy = r.pos.y;
        let stackScale = r.pos.scale || 1;

        push();
        translate(cx, cy);
        scale(stackScale);

        if (showImage && r.maskedPg) {
          imageMode(CENTER);
          image(r.maskedPg, 0, 0);
        }

        fill('red');
        stroke(0, 0, 0);
        strokeWeight(0);
        rectMode(CENTER);
        rect(0, 0, r.cropPg ? r.cropPg.width : 1, r.cropPg ? r.cropPg.height : 1);

        if (r.contours && r.contours.length > 0) {
          stroke(0, 0, 0);
          strokeWeight(1);
          noFill();
          for (let pts of r.contours) {
            beginShape();
            for (let p of pts) vertex(p.x, p.y);
            endShape(CLOSE);
          }
        }

        noStroke();
        fill(0, 0, 0);
        textSize(9 / stackScale);
        textAlign(LEFT, BOTTOM);
        let ubw = r.cropPg ? r.cropPg.width : 1;
        let ubh = r.cropPg ? r.cropPg.height : 1;
        text(nf(r.angle, 1, 1) + "°", ubw / 2 + 2, ubh / 2 - 2);
        if (r.text) text(r.text, ubw / 2 + 2, ubh / 2 - 12);

        pop();
      }
    } else {
      // Progression mode
      if (progressionRegionIndex < 0 && detectedRegions.length > 0)
        pickProgressionRegion();
      let r = detectedRegions[progressionRegionIndex];
      if (r && r.cropPg) {
        let scaleX = gw / r.cropPg.width;
        let scaleY = gh / r.cropPg.height;

        if (showImage && r.maskedStretchedPg) {
          imageMode(CORNER);
          image(r.maskedStretchedPg, gridX, gridY);
        }

        if (r.contours && r.contours.length > 0) {
          stroke(0);
          strokeWeight(0);
          noFill();
          for (let pts of r.contours) {
            beginShape();
            for (let p of pts)
              vertex(
                gridX + gw / 2 + p.x * scaleX,
                gridY + gh / 2 + p.y * scaleY,
              );
            endShape(CLOSE);
          }
        }
      }
      let contours = r && r.contours ? r.contours : [];
      let cropW = r && r.cropPg ? r.cropPg.width : gw;
      let cropH = r && r.cropPg ? r.cropPg.height : gh;
      drawDotGrid(gw, gh, contours, cropW, cropH);
    }
  }
}

// Grid

function drawGrid() {
  stroke(200);
  strokeWeight(0.5);
  noFill();
  for (let x = 0; x <= cols; x++) {
    line(gridX + x * cellW, gridY, gridX + x * cellW, gridY + rows * cellH);
  }
  for (let y = 0; y <= rows; y++) {
    line(gridX, gridY + y * cellH, gridX + cols * cellW, gridY + y * cellH);
  }
}


// Render outline dots
function renderOutlineDots(target, dots, activeSize) {
  if (!dotRenderFn) return;
  try {
    dotRenderFn(target, dots, activeSize, gridX, gridY);
  } catch (e) {
    console.error("Dot render snippet threw at runtime:", e);
  }
}

function drawDotGrid(gw, gh, contours, cropW, cropH) {
  if (dotGridDirty) {
    dotGridDirty = false;
    cachedOutlineDots = computeOutlineDots(gw, gh, contours, cropW, cropH);
  }

  let activeSize = sliderVal("activeDotSizeSlider");
  renderOutlineDots(window, cachedOutlineDots, activeSize);
}

function computeOutlineDots(gw, gh, contours, cropW, cropH) {
  let spacing = sliderVal("dotSpacingSlider");
  let scaleX = gw / cropW;
  let scaleY = gh / cropH;

  let mask = createGraphics(gw, gh);
  mask.pixelDensity(1);
  mask.background(0);
  mask.fill(255);
  mask.noStroke();
  for (let pts of contours) {
    if (pts.length < 2) continue;
    mask.beginShape();
    for (let p of pts)
      mask.vertex(gw / 2 + p.x * scaleX, gh / 2 + p.y * scaleY);
    mask.endShape(CLOSE);
  }
  mask.loadPixels();

  let half = spacing / 2;
  let xs = [],
    ys = [];
  for (let x = half; x < gw; x += spacing) xs.push(x);
  for (let y = half; y < gh; y += spacing) ys.push(y);
  let nc = xs.length,
    nr = ys.length;

  let shearPerRow =
    spacing * Math.tan((SLANT_ANGLES[slantMode] || 0) * (Math.PI / 180));

  // Active cell cache
  let activeCache = new Uint8Array(nc * nr);
  for (let yi = 0; yi < nr; yi++) {
    let sampleY = ys[yi] - half;
    for (let xi = 0; xi < nc; xi++) {
      let sampleX = xs[xi] - half + yi * shearPerRow;
      activeCache[yi * nc + xi] = maskHitsRect(mask, sampleX, sampleY, spacing, spacing) ? 1 : 0;
    }
  }

  function isActive(xi, yi) {
    if (xi < 0 || xi >= nc || yi < 0 || yi >= nr) return false;
    return activeCache[yi * nc + xi] === 1;
  }
  function isOutline(xi, yi) {
    if (!isActive(xi, yi)) return false;
    return (
      !isActive(xi - 1, yi) ||
      !isActive(xi + 1, yi) ||
      !isActive(xi, yi - 1) ||
      !isActive(xi, yi + 1)
    );
  }

  let includeDot = dotFillMode === "fill" ? isActive : isOutline;
  let outlineDots = [];
  for (let yi = 0; yi < nr; yi++)
    for (let xi = 0; xi < nc; xi++)
      if (includeDot(xi, yi)) outlineDots.push({ x: xs[xi], y: ys[yi] });

  mask.remove();
  return outlineDots;
}

// Mask rect hit test
function maskHitsRect(mask, rx, ry, rw, rh) {
  let steps = 3;
  for (let i = 0; i <= steps; i++) {
    let px = Math.floor(rx + (rw * i) / steps);
    for (let j = 0; j <= steps; j++) {
      let py = Math.floor(ry + (rh * j) / steps);
      px = constrain(px, 0, mask.width - 1);
      py = constrain(py, 0, mask.height - 1);
      let idx = (py * mask.width + px) * 4;
      if (mask.pixels[idx] > 128) return true;
    }
  }
  return false;
}

// Layout

function layoutRegions(gh) {
  let sorted = [...detectedRegions].sort((a, b) => a.cy - b.cy);
  let totalH =
    sorted.reduce((s, r) => s + (r.cropPg ? r.cropPg.height : 0), 0) +
    ELEMENT_GAP * (sorted.length - 1);
  let scale = totalH > gh && totalH > 0 ? gh / totalH : 1;
  let midX = gridX + (cols * cellW) / 2;
  let startY = gridY + (gh - totalH * scale) / 2;
  let cursor = startY;
  for (let r of sorted) {
    let bh = (r.cropPg ? r.cropPg.height : 0) * scale;
    r.pos = { x: midX, y: cursor + bh / 2, scale };
    cursor += bh + ELEMENT_GAP * scale;
  }
}

// Pick progression region
function pickProgressionRegion() {
  if (detectedRegions.length === 0) {
    progressionRegionIndex = -1;
    return;
  }
  if (
    progressionRegionIndex < 0 ||
    progressionRegionIndex >= detectedRegions.length
  ) {
    progressionRegionIndex = Math.floor(Math.random() * detectedRegions.length);
  }
}

// File loading

function triggerFileLoad() {
  let input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = (e) => {
    let file = e.target.files[0];
    if (!file) return;
    sourceImageName = file.name.replace(/\.[^.]+$/, "");
    let url = URL.createObjectURL(file);
    document.getElementById("imagePreview").src = url;
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

  detectedRegions.forEach((r) => {
    if (r.cropPg) r.cropPg.remove();
  });
  detectedRegions = await runPaddleDetect(sourceImage).catch((e) => {
    console.error("PaddleOCR error:", e);
    return [];
  });
  contoursDirty = true;

  const TARGET_H = 80;
  const TESS_PAD = 0.4;

  for (let r of detectedRegions) {
    r.text = "";

    let scale = TARGET_H / (r.rh * rows * cellH);
    let tessGW = cols * cellW * scale;
    let tessGH = rows * cellH * scale;

    let strip = buildCrop(r, TESS_PAD, TESS_PAD, tessGW, tessGH);
    let dataUrl = strip.elt.toDataURL("image/png");
    strip.remove();

    try {
      let result = await Tesseract.recognize(dataUrl, "eng");
      r.text = result.data.text.trim().replace(/\n/g, " ");
    } catch (e) {
      console.warn("Tesseract failed for region:", e);
    }
  }

  ocrRunning = false;
}

// Crop helpers

function buildCrop(r, padX, padY, gw, gh) {
  let padW = r.rw * (1 + 2 * padX);
  let padH = r.rh * (1 + 2 * padY);
  let cropW = Math.max(1, Math.ceil(padW * gw));
  let cropH = Math.max(1, Math.ceil(padH * gh));
  let diag = Math.ceil(Math.sqrt(cropW * cropW + cropH * cropH)) + 4;

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
  pg.image(
    buf,
    0,
    0,
    cropW,
    cropH,
    (diag - cropW) / 2,
    (diag - cropH) / 2,
    cropW,
    cropH,
  );
  buf.remove();
  return pg;
}

function buildMasked(cropPg, contours) {
  let W = cropPg.width,
    H = cropPg.height;
  let pg = createGraphics(W, H);
  pg.pixelDensity(1);
  pg.clear();

  pg.imageMode(CENTER);
  pg.image(cropPg, W / 2, H / 2);

  let ctx = pg.drawingContext;
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = "white";
  ctx.beginPath();
  for (let pts of contours) {
    if (pts.length < 2) continue;
    ctx.moveTo(pts[0].x + W / 2, pts[0].y + H / 2);
    for (let k = 1; k < pts.length; k++)
      ctx.lineTo(pts[k].x + W / 2, pts[k].y + H / 2);
    ctx.closePath();
  }
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  return pg;
}

// Apply contrast
function applyContrast(pg, pct) {
  let W = pg.width,
    H = pg.height;
  let out = createGraphics(W, H);
  out.pixelDensity(1);
  out.background(255);
  let ctx = out.drawingContext;
  ctx.filter = "contrast(" + pct + "%)";
  ctx.drawImage(pg.elt, 0, 0);
  ctx.filter = "none";
  return out;
}

// Masked stretched crop
function buildMaskedStretched(cropPg, contours, gw, gh) {
  let pg = createGraphics(gw, gh);
  pg.pixelDensity(1);
  pg.clear();

  pg.imageMode(CORNER);
  pg.image(cropPg, 0, 0, gw, gh);

  let scaleX = gw / cropPg.width;
  let scaleY = gh / cropPg.height;
  let ctx = pg.drawingContext;
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = "white";
  ctx.beginPath();
  for (let pts of contours) {
    if (pts.length < 2) continue;
    ctx.moveTo(gw / 2 + pts[0].x * scaleX, gh / 2 + pts[0].y * scaleY);
    for (let k = 1; k < pts.length; k++)
      ctx.lineTo(gw / 2 + pts[k].x * scaleX, gh / 2 + pts[k].y * scaleY);
    ctx.closePath();
  }
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  return pg;
}

// Extract contours
function extractContours(pg, blurK, thresh) {
  pg.loadPixels();
  if (!pg.pixels || pg.pixels.length === 0) return [];
  let W = pg.width,
    H = pg.height;

  let mat = new cv.Mat(H, W, cv.CV_8UC4);
  let gray = new cv.Mat();
  let blurM = new cv.Mat();
  let binM = new cv.Mat();
  let ctrs = new cv.MatVector();
  let hier = new cv.Mat();

  mat.data.set(pg.pixels);
  cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
  cv.blur(gray, blurM, new cv.Size(blurK, blurK));
  cv.threshold(blurM, binM, thresh, 255, cv.THRESH_BINARY_INV);
  cv.findContours(binM, ctrs, hier, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

  let result = [];
  let offX = -W / 2,
    offY = -H / 2;
  for (let i = 0; i < ctrs.size(); i++) {
    let c = ctrs.get(i);
    let pts = [];
    for (let j = 0; j < c.data32S.length; j += 2) {
      pts.push({ x: c.data32S[j] + offX, y: c.data32S[j + 1] + offY });
    }
    if (pts.length > 1) result.push(pts);
    c.delete();
  }

  mat.delete();
  gray.delete();
  blurM.delete();
  binM.delete();
  ctrs.delete();
  hier.delete();
  return result;
}

// PaddleOCR detection

const PADDLE_SIZE = 2048;
const CONTOUR_SCALE = 4;
const PADDLE_MEAN = [0.485, 0.456, 0.406];
const PADDLE_STD = [0.229, 0.224, 0.225];
const DB_THRESH = 0.3;
const DB_BOX_THRESH = 0.5;
const DB_UNCLIP = 1.5;

async function runPaddleDetect(img) {
  if (!window.cvReadyFlag) {
    console.warn("OpenCV not ready yet");
    return [];
  }

  let iw = img.width,
    ih = img.height;
  let scale = Math.min(PADDLE_SIZE / iw, PADDLE_SIZE / ih);
  let fitW = Math.max(32, Math.round(Math.round(iw * scale) / 32) * 32);
  let fitH = Math.max(32, Math.round(Math.round(ih * scale) / 32) * 32);

  let pg = createGraphics(fitW, fitH);
  pg.pixelDensity(1);
  pg.background(128);
  pg.image(img, 0, 0, fitW, fitH);
  pg.loadPixels();
  let pixels = pg.pixels;
  pg.remove();

  // Tensor normalisation
  let numPx = fitW * fitH;
  let data = new Float32Array(3 * numPx);
  for (let i = 0; i < numPx; i++) {
    let ri = i * 4;
    data[i] = (pixels[ri] / 255 - PADDLE_MEAN[0]) / PADDLE_STD[0];
    data[numPx + i] = (pixels[ri + 1] / 255 - PADDLE_MEAN[1]) / PADDLE_STD[1];
    data[2 * numPx + i] =
      (pixels[ri + 2] / 255 - PADDLE_MEAN[2]) / PADDLE_STD[2];
  }

  // ONNX inference
  if (!ortSession) {
    try {
      ortSession = await ort.InferenceSession.create(
        "../../models/ch_PP-OCRv4_det_infer.onnx",
      );
      console.log("PaddleOCR ONNX session loaded");
    } catch (e) {
      console.error("Failed to load ONNX model:", e);
      return [];
    }
  }

  let tensor = new ort.Tensor("float32", data, [1, 3, fitH, fitW]);
  let feeds = {};
  feeds[ortSession.inputNames[0]] = tensor;
  let results;
  try {
    results = await ortSession.run(feeds);
  } catch (e) {
    console.error("ONNX inference error:", e);
    return [];
  }

  // Probability map
  let probMap = results[ortSession.outputNames[0]].data;

  // DB post-processing
  let regions = [];
  let probMat = new cv.Mat(fitH, fitW, cv.CV_32F);
  let binF = new cv.Mat(fitH, fitW, cv.CV_32F);
  let bin8 = new cv.Mat(fitH, fitW, cv.CV_8U);

  probMat.data32F.set(probMap);
  cv.threshold(probMat, binF, DB_THRESH, 255, cv.THRESH_BINARY);
  binF.convertTo(bin8, cv.CV_8U);
  binF.delete();

  let contours = new cv.MatVector();
  let hier = new cv.Mat();
  cv.findContours(
    bin8,
    contours,
    hier,
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_SIMPLE,
  );

  for (let i = 0; i < contours.size(); i++) {
    let cnt = contours.get(i);
    if (cv.contourArea(cnt) < 16) {
      cnt.delete();
      continue;
    }

    let rect = cv.minAreaRect(cnt);
    let cx = rect.center.x;
    let cy = rect.center.y;
    let rw = rect.size.width;
    let rh = rect.size.height;
    let angle = rect.angle;

    if (rw < rh) {
      let t = rw;
      rw = rh;
      rh = t;
      angle += 90;
    }

    // Box score
    let pts4 = cv.RotatedRect.points(rect);
    let boxMask = cv.Mat.zeros(fitH, fitW, cv.CV_8U);
    let hull = new cv.MatVector();
    let hullMat = new cv.Mat(4, 1, cv.CV_32SC2);
    for (let k = 0; k < 4; k++) {
      hullMat.intPtr(k, 0)[0] = Math.round(pts4[k].x);
      hullMat.intPtr(k, 0)[1] = Math.round(pts4[k].y);
    }
    hull.push_back(hullMat);
    cv.fillPoly(boxMask, hull, new cv.Scalar(1));
    let meanVal = cv.mean(probMat, boxMask);
    boxMask.delete();
    hull.delete();
    hullMat.delete();

    if (meanVal[0] < DB_BOX_THRESH) {
      cnt.delete();
      continue;
    }

    let area = cv.contourArea(cnt);
    let perim = cv.arcLength(cnt, true);
    let expand = perim > 0 ? (area * DB_UNCLIP) / perim : 0;

    let poly = [];
    for (let k = 0; k < 4; k++) {
      let dx = pts4[k].x - cx,
        dy = pts4[k].y - cy;
      let d = Math.sqrt(dx * dx + dy * dy);
      let nx = d > 0 ? dx / d : 0,
        ny = d > 0 ? dy / d : 0;
      poly.push([
        (pts4[k].x + nx * expand) / fitW,
        (pts4[k].y + ny * expand) / fitH,
      ]);
    }

    let xs = poly.map((p) => p[0]),
      ys = poly.map((p) => p[1]);
    let bx = Math.min(...xs),
      by = Math.min(...ys);
    let bw = Math.max(...xs) - bx,
      bh = Math.max(...ys) - by;

    regions.push({
      poly,
      angle,
      cx: cx / fitW,
      cy: cy / fitH,
      x: bx,
      y: by,
      w: bw,
      h: bh,
      rw: rw / fitW,
      rh: rh / fitH,
    });
    cnt.delete();
  }

  probMat.delete();
  bin8.delete();
  contours.delete();
  hier.delete();

  console.log(`PaddleOCR: ${regions.length} regions detected`);
  return regions;
}

// Save

function saveStamp() {
  let d = new Date();
  let mm = String(d.getMonth() + 1).padStart(2, "0");
  let dd = String(d.getDate()).padStart(2, "0");
  let hh = String(d.getHours()).padStart(2, "0");
  let min = String(d.getMinutes()).padStart(2, "0");
  let ss = String(d.getSeconds()).padStart(2, "0");
  return sourceImageName + "_" + mm + dd + "_" + hh + min + ss;
}

function saveImage() {
  if (!sourceImage || detectedRegions.length === 0) return;

  let stamp = saveStamp();
  const SAVE_DENSITY = 2;
  let gw = cols * cellW;
  let gh = rows * cellH;

  let activeSize = sliderVal("activeDotSizeSlider");
  let overflow = Math.ceil(activeSize * 5);

  let saveW = gw + overflow;
  let saveH = gh + overflow;

  let pgUI = createGraphics(saveW, saveH);
  pgUI.pixelDensity(SAVE_DENSITY);
  pgUI.clear();
  pgUI.stroke(200);
  pgUI.strokeWeight(1);
  pgUI.noFill();
  for (let x = 0; x <= cols; x++) pgUI.line(x * cellW, 0, x * cellW, gh);
  for (let y = 0; y <= rows; y++) pgUI.line(0, y * cellH, gw, y * cellH);

  const settings = [
    "Mode: " + layoutMode,
    "Pad X: " + nf(sliderVal("padSliderX"), 1, 2),
    "Pad Y: " + nf(sliderVal("padSliderY"), 1, 2),
    "Blur: " + sliderVal("blurSlider"),
    "Threshold: " + sliderVal("threshSlider"),
    "Contrast: " + sliderVal("contrastSlider") + "%",
    "Dot spacing: " + sliderVal("dotSpacingSlider") + "px",
    "Active dot: " + sliderVal("activeDotSizeSlider") + "px",
    "Image: " + (showImage ? "On" : "Off"),
  ];
  pgUI.textFont("Unica77 Mono");
  pgUI.textSize(9);
  pgUI.noStroke();
  pgUI.fill(0);
  pgUI.textAlign(LEFT, BOTTOM);
  let lineH = 11;
  let startY = gh - 4;
  for (let i = settings.length - 1; i >= 0; i--) {
    pgUI.text(settings[i], 4, startY - (settings.length - 1 - i) * lineH);
  }

  let pg = createGraphics(saveW, saveH);
  pg.pixelDensity(SAVE_DENSITY);
  pg.clear();
  pg.textFont("Unica77 Mono");

  if (layoutMode === "base") {
    for (let r of detectedRegions) {
      if (!r.pos || !r.cropPg) continue;

      let cx = r.pos.x - gridX;
      let cy = r.pos.y - gridY;
      let stackScale = r.pos.scale || 1;
      let bw = r.cropPg.width;
      let bh = r.cropPg.height;

      pg.push();
      pg.translate(cx, cy);
      pg.scale(stackScale);

      if (showImage && r.maskedPg) {
        pg.imageMode(CENTER);
        pg.image(r.maskedPg, 0, 0);
      }

      if (r.contours && r.contours.length > 0) {
        pg.stroke(0, 0, 0);
        pg.strokeWeight(1);
        pg.noFill();
        for (let pts of r.contours) {
          pg.beginShape();
          for (let p of pts) pg.vertex(p.x, p.y);
          pg.endShape(CLOSE);
        }
      }

      pg.noStroke();
      pg.fill(0, 0, 0);
      pg.textSize(9 / stackScale);
      pg.textAlign(LEFT, BOTTOM);
      pg.text(nf(r.angle, 1, 1) + "°", bw / 2 + 2, bh / 2 - 2);
      if (r.text) pg.text(r.text, bw / 2 + 2, bh / 2 - 12);

      pg.pop();
    }
  } else {
    let r = detectedRegions[progressionRegionIndex];
    if (r && r.cropPg) {
      let scaleX = gw / r.cropPg.width;
      let scaleY = gh / r.cropPg.height;

      if (showImage) {
        let masked = buildMaskedStretched(r.cropPg, r.contours, gw, gh);
        pg.imageMode(CORNER);
        pg.image(masked, 0, 0);
        masked.remove();
      }

      if (r.contours && r.contours.length > 0) {
        pg.stroke(0);
        pg.strokeWeight(0);
        pg.noFill();
        for (let pts of r.contours) {
          pg.beginShape();
          for (let p of pts)
            pg.vertex(gw / 2 + p.x * scaleX, gh / 2 + p.y * scaleY);
          pg.endShape(CLOSE);
        }
      }

      // Dot grid
      let activeSize = sliderVal("activeDotSizeSlider");
      let exportDots = computeOutlineDots(
        gw,
        gh,
        r.contours || [],
        r.cropPg.width,
        r.cropPg.height,
      );
      renderOutlineDots(pg, exportDots, activeSize);
    }
  }

  pg.elt.toBlob((contentBlob) => {
    pgUI.elt.toBlob((uiBlob) => {
      triggerDownload(uiBlob, stamp + "_ui.png");
      pgUI.remove();
      setTimeout(() => {
        triggerDownload(contentBlob, stamp + "_content.png");
        pg.remove();
      }, 200);
    }, "image/png");
  }, "image/png");
}

function triggerDownload(blob, filename) {
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
