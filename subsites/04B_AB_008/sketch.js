// Oscilloscope XY Mode + Image Distortion

let waveRSel, waveLSel, ratioRSel, ratioLSel, phaseSlider, phaseLabel;
let distortionSlider, playBtn;

const PANEL   = 480;
const W       = PANEL * 3;
const H       = 480;
const SPLIT   = PANEL;
const SPLIT2  = PANEL * 2;
const M       = 36;
const MY      = 16;
const IMG_DIM = PANEL - M * 2;

const INV_SQRT2 = 1 / Math.sqrt(2);

// Image & animation state
let scaledImg = null;
let outputImg = null;
let animT     = 0;
let running   = false;

// Colours
const COL_R   = '#000000';
const COL_L   = '#000000';
const COL_FIG = '#111111';
const COL_AX  = '#cccccc';
const COL_GRD = '#f0f0f0';
const COL_BOX = '#434343';
const COL_LBL = '#bbbbbb';

function setup() {
  let cnv = createCanvas(W, H);
  cnv.parent('canvas-container');
  pixelDensity(1);
  frameRate(30);
  noLoop();

  waveRSel         = select('#waveR');
  waveLSel         = select('#waveL');
  ratioRSel        = select('#ratioR');
  ratioLSel        = select('#ratioL');
  phaseSlider      = select('#phase');
  phaseLabel       = select('#phaseLabel');
  distortionSlider = select('#distortion');

  waveRSel.changed(redraw);
  waveLSel.changed(redraw);
  ratioRSel.changed(redraw);
  ratioLSel.changed(redraw);
  distortionSlider.input(() => { if (!running) redraw(); });
  phaseSlider.input(() => {
    phaseLabel.html(int(phaseSlider.value()) * 15 + '°');
    redraw();
  });

  document.getElementById('imageUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    loadImage(URL.createObjectURL(file), (loaded) => {
      scaledImg = createImage(IMG_DIM, IMG_DIM);
      scaledImg.copy(loaded, 0, 0, loaded.width, loaded.height,
                     0, 0, IMG_DIM, IMG_DIM);
      scaledImg.loadPixels();
      outputImg = createImage(IMG_DIM, IMG_DIM);
      redraw();
    });
  });

  playBtn = select('#playBtn');
  playBtn.mousePressed(() => {
    running = !running;
    playBtn.html(running ? 'Stop' : 'Start');
    if (running) loop(); else noLoop();
  });
}

function draw() {
  background(244, 244, 244);

  const wR      = waveRSel.value();
  const wL      = waveLSel.value();
  const rR      = int(ratioRSel.value());
  const rL      = int(ratioLSel.value());
  const phase   = radians(int(phaseSlider.value()) * 15);
  const maxDisp = int(distortionSlider.value());

  drawTimeDomain(wR, wL, rR, rL, phase);
  drawLissajous(wR, wL, rR, rL, phase);
  drawImagePanel(wR, wL, rR, rL, phase, maxDisp);

  stroke(220);
  strokeWeight(1);
  line(SPLIT,  0, SPLIT,  H);
  line(SPLIT2, 0, SPLIT2, H);

  if (running) animT += 0.02;
}

// Wave functions

function getWave(type, angle) {
  switch (type) {
    case 'sine':
      return sin(angle);
    case 'square':
      return sin(angle) >= 0 ? 1 : -1;
    case 'sawtooth': {
      const a = (((angle + PI) % TWO_PI) + TWO_PI) % TWO_PI;
      return a / PI - 1;
    }
    case 'triangle':
      return (2 / PI) * asin(sin(angle));
    default:
      return 0;
  }
}

// Left panel: Time Domain

function drawTimeDomain(wR, wL, rR, rL, phase) {
  const halfH = H / 2;
  drawChannel(wR, rR, 0, 0,     SPLIT, halfH, 'R', COL_R, 0);
  drawChannel(wL, rL, 0, halfH, SPLIT, halfH, 'L', COL_L, phase);
  stroke(215);
  strokeWeight(1);
  line(0, halfH, SPLIT, halfH);
}

function drawChannel(waveType, ratio, px0, py0, pw0, ph0, label, col, phase) {
  const px   = px0 + M;
  const py   = py0 + MY;
  const pw   = pw0 - M * 2;
  const ph   = ph0 - MY * 2;
  const midY = py0 + ph0 / 2;
  const amp  = (ph / 2) * 0.85;

  stroke(COL_GRD);
  strokeWeight(1);
  line(px, midY - amp, px + pw, midY - amp);
  line(px, midY + amp, px + pw, midY + amp);
  line(px + pw * 0.25, py, px + pw * 0.25, py + ph);
  line(px + pw * 0.50, py, px + pw * 0.50, py + ph);
  line(px + pw * 0.75, py, px + pw * 0.75, py + ph);

  stroke(COL_AX);
  strokeWeight(1);
  line(px, midY, px + pw, midY);
  line(px, py,   px,      py + ph);

  noFill();
  stroke(COL_BOX);
  rect(px, py, pw, ph);

  stroke(col);
  strokeWeight(1.5);
  noFill();
  beginShape();
  for (let i = 0; i <= 2000; i++) {
    const t  = (i / 2000) * TWO_PI;
    const v  = getWave(waveType, ratio * t + phase);
    vertex(px + (i / 2000) * pw, midY - v * amp);
  }
  endShape();

  noStroke();
  textFont('monospace');
  textSize(10);
  textAlign(LEFT, TOP);
  fill(col);
  text(label, px + 6, py + 4);
}

// Middle panel: Goniometer / XY Mode

function drawLissajous(wR, wL, rR, rL, phase) {
  const px  = SPLIT + M;
  const py  = M;
  const pw  = SPLIT - M * 2;
  const ph  = H - M * 2;
  const cx  = SPLIT + pw / 2 + M;
  const cy  = py + ph / 2;
  const hs  = min(pw, ph) / 2;

  stroke(COL_GRD);
  strokeWeight(1);
  line(px, cy, px + pw, cy);
  line(cx, py, cx, py + ph);

  stroke(COL_AX);
  strokeWeight(1);
  line(px,      py,      px + pw, py + ph);
  line(px + pw, py,      px,      py + ph);

  noFill();
  stroke(COL_BOX);
  rect(px, py, pw, ph);

  const tMax  = TWO_PI / gcd(rR, rL);
  const scale = hs * 0.88 * INV_SQRT2;

  stroke(COL_FIG);
  strokeWeight(1.5);
  noFill();
  beginShape();
  for (let i = 0; i <= 2000; i++) {
    const t  = (i / 2000) * tMax;
    const xv = getWave(wR, rR * t);
    const yv = getWave(wL, rL * t + phase);
    vertex(cx + (xv - yv) * INV_SQRT2 * scale,
           cy - (xv + yv) * INV_SQRT2 * scale);
  }
  endShape();

  noStroke();
  textFont('monospace');
  textSize(9);

  textAlign(LEFT, TOP);
  fill(COL_L);
  text('L', px + 6, py + 6);

  textAlign(RIGHT, TOP);
  fill(COL_R);
  text('R', px + pw - 6, py + 6);

  fill(COL_LBL);
  textAlign(LEFT, BOTTOM);
  text('XY MODE', px, H - M + 14);
}

// Right panel: Image distortion

function drawImagePanel(wR, wL, rR, rL, phase, maxDisp) {
  const px = SPLIT2 + M;
  const py = M;
  const pw = IMG_DIM;
  const ph = IMG_DIM;

  if (!scaledImg) {
    noFill();
    stroke(COL_BOX);
    rect(px, py, pw, ph);
    noStroke();
    fill('#f4f4f4');
    textFont('monospace');
    textSize(9);
    textAlign(CENTER, CENTER);
    text('Upload an image', px + pw / 2, py + ph / 2);
    fill(COL_LBL);
    textAlign(LEFT, BOTTOM);
    text('IMAGE', px, H - M + 14);
    return;
  }

  // Per-pixel tiling with wave-driven distortion
  outputImg.loadPixels();

  const diagScale = TWO_PI / (IMG_DIM * 2);
  const drift     = animT * 200;
  const warpAmt   = maxDisp * 3;

  for (let y = 0; y < IMG_DIM; y++) {
    for (let x = 0; x < IMG_DIM; x++) {
      const t_local = animT + (x + y) * diagScale;

      const xv = getWave(wR, rR * t_local);
      const yv = getWave(wL, rL * t_local + phase);
      const gx = (xv - yv) * INV_SQRT2;
      const gy = (xv + yv) * INV_SQRT2;

      const sx = ((x - drift + gx * warpAmt) % IMG_DIM + IMG_DIM) % IMG_DIM | 0;
      const sy = ((y + drift + gy * warpAmt) % IMG_DIM + IMG_DIM) % IMG_DIM | 0;

      const si = (sy * IMG_DIM + sx) << 2;
      const di = (y  * IMG_DIM + x)  << 2;

      outputImg.pixels[di]     = scaledImg.pixels[si];
      outputImg.pixels[di + 1] = scaledImg.pixels[si + 1];
      outputImg.pixels[di + 2] = scaledImg.pixels[si + 2];
      outputImg.pixels[di + 3] = 255;
    }
  }

  outputImg.updatePixels();
  image(outputImg, px, py);

  noFill();
  stroke(COL_BOX);
  rect(px, py, pw, ph);

  noStroke();
  fill(COL_LBL);
  textFont('monospace');
  textSize(9);
  textAlign(LEFT, BOTTOM);
  text('IMAGE', px, H - M + 14);
}

// Utility

function gcd(a, b) {
  while (b > 0) { const t = b; b = a % b; a = t; }
  return a;
}
