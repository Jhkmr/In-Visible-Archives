// Oscilloscope XY Mode — Lissajous Viewer

let waveRSel, waveLSel, ratioRSel, ratioLSel;
let phaseRSlider, phaseRLabel, phaseLSlider, phaseLLabel;
let clearRight = false;

const LEFT_W    = 480;
const M         = 36;
const MY        = 14;
const INV_SQRT2 = 1 / Math.sqrt(2);
const SQRT3_2   = Math.sqrt(3) / 2;

// Polygon vertex tables
const HEX_COS = [1, 0.5, -0.5, -1, -0.5, 0.5];
const HEX_SIN = [0, SQRT3_2, SQRT3_2, 0, -SQRT3_2, -SQRT3_2];
const OCT_COS = [1, INV_SQRT2, 0, -INV_SQRT2, -1, -INV_SQRT2, 0, INV_SQRT2];
const OCT_SIN = [0, INV_SQRT2, 1, INV_SQRT2, 0, -INV_SQRT2, -1, -INV_SQRT2];

let noiseSeed = 0;

// Colours
const COL_R   = '#000000';
const COL_L   = '#000000';
const COL_AX  = '#cccccc';
const COL_GRD = '#f0f0f0';
const COL_BOX = '#434343';
const COL_LBL = '#bbbbbb';

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent('canvas-container');
  noLoop();

  waveRSel     = select('#waveR');
  waveLSel     = select('#waveL');
  ratioRSel    = select('#ratioR');
  ratioLSel    = select('#ratioL');
  phaseRSlider = select('#phaseR');
  phaseRLabel  = select('#phaseRLabel');
  phaseLSlider = select('#phaseL');
  phaseLLabel  = select('#phaseLLabel');

  waveRSel.changed(redraw);
  waveLSel.changed(redraw);
  ratioRSel.changed(redraw);
  ratioLSel.changed(redraw);

  phaseRSlider.input(() => {
    phaseRLabel.html(int(phaseRSlider.value()) * 15 + '°');
    redraw();
  });
  phaseLSlider.input(() => {
    phaseLLabel.html(int(phaseLSlider.value()) * 15 + '°');
    redraw();
  });

  select('#clearBtn').mousePressed(() => {
    clearRight = true;
    redraw();
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  redraw();
}
 

function draw() {

  // clear();
  background('#f4f4f413')

  // Left column background
  noStroke();
  fill(244, 244, 244);
  rect(0, 0, LEFT_W, height);

  // Clear right panel if requested
  if (clearRight) {
    fill(244, 244, 244);
    rect(LEFT_W, 0, width - LEFT_W, height);
    clearRight = false;
  }

  const wR     = waveRSel.value();
  const wL     = waveLSel.value();
  const rR     = int(ratioRSel.value());
  const rL     = int(ratioLSel.value());
  const phaseR = radians(int(phaseRSlider.value()) * 15);
  const phaseL = radians(int(phaseLSlider.value()) * 15);
  noiseSeed++;

  // Left column rows
  const rowH = height / 5;

  drawChannel(wR, rR, 0, 0,        LEFT_W, rowH, 'R', COL_R, phaseR);
  drawChannel(wL, rL, 0, rowH,     LEFT_W, rowH, 'L', COL_L, phaseL);
  drawLissajous(0, rowH * 2, LEFT_W, rowH*2.45, wR, wL, rR, rL, phaseR, phaseL, true);

  // Row dividers
  stroke(215);
  strokeWeight(1);
  line(0, rowH,     LEFT_W, rowH);
  line(0, rowH * 2, LEFT_W, rowH * 2);

  // Column divider
  stroke(220);
  strokeWeight(1);
  line(LEFT_W, 0, LEFT_W, height);

  // Right panel
  drawLissajousRight(LEFT_W, 0, width - LEFT_W, height, wR, wL, rR, rL, phaseR, phaseL);
  drawLissajousRightStrokes(LEFT_W, 0, width - LEFT_W, height, wR, wL, rR, rL, phaseR, phaseL);

}

// Wave functions

function getWave(type, angle) {
  switch (type) {
    case 'sine':     return sin(angle);
    case 'square':   return sin(angle) >= 0 ? 1 : -1;
    case 'sawtooth': {
      const a = (((angle + PI) % TWO_PI) + TWO_PI) % TWO_PI;
      return a / PI - 1;
    }
    case 'triangle':    return (2 / PI) * asin(sin(angle));

    case 'trapezoid': {
      const a = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
      const p = a / TWO_PI;
      if (p < 0.25) return -1 + p * 8;
      if (p < 0.50) return 1;
      if (p < 0.75) return 1 - (p - 0.5) * 8;
      return -1;
    }

    case 'hexagon':    return polyWave(HEX_COS, angle);
    case 'hexagonNeg': return polyWave(HEX_SIN, angle);
    case 'octagon':    return polyWave(OCT_COS, angle);
    case 'octagonNeg': return polyWave(OCT_SIN, angle);

    case 'arc': {
      const a = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
      const halfP = a < PI ? a / PI : (a - PI) / PI;
      const x = 2 * halfP - 1;
      const sign = a < PI ? 1 : -1;
      return sign * Math.sqrt(Math.max(0, 1 - x * x));
    }

    case 'arcNeg': {
      const s = sin(angle);
      return s * s * s;
    }

    case 'sinePulse': {
      const s = sin(angle/2);
      return s > 0 ? s : 0;
    }

    // Noise
    case 'white':
      return random() * 2 - 1;

    case 'brown':
      return noise(angle * 0.08 + noiseSeed * 0.01) * 2 - 1;

    case 'pink':
      return noise(angle * 0.5 + noiseSeed * 0.03) * 2 - 1;

    case 'grey':
      return noise(angle * 2.0 + noiseSeed * 0.06) * 2 - 1;

    default: return 0;
  }
}

// Polygon wave
function polyWave(table, angle) {
  const n   = table.length;
  const a   = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  const pos = (a / TWO_PI) * n;
  const i   = Math.floor(pos) % n;
  const t   = pos - Math.floor(pos);
  return table[i] + (table[(i + 1) % n] - table[i]) * t;
}

// Channel panel

function drawChannel(waveType, ratio, px0, py0, pw0, ph0, label, col, phase) {
  const px   = px0 + M;
  const py   = py0 + MY;
  const pw   = pw0 - M * 2;
  const ph   = ph0 - MY * 2;
  const midY = py0 + ph0 / 2;
  const amp  = (ph / 2) * 0.85;

  // Grid
  stroke(COL_GRD);
  strokeWeight(1);
  line(px, midY - amp, px + pw, midY - amp);
  line(px, midY + amp, px + pw, midY + amp);
  line(px + pw * 0.25, py, px + pw * 0.25, py + ph);
  line(px + pw * 0.50, py, px + pw * 0.50, py + ph);
  line(px + pw * 0.75, py, px + pw * 0.75, py + ph);

  // Axes
  stroke(COL_AX);
  strokeWeight(1);
  line(px, midY, px + pw, midY);
  line(px, py,   px,      py + ph);

  // Box
  noFill();
  stroke(COL_BOX);
  rect(px, py, pw, ph);

  // Waveform
  const SAMPLES = 2000;
  stroke(col);
  strokeWeight(1.5);
  noFill();
  beginShape();
  for (let i = 0; i <= SAMPLES; i++) {
    const t  = (i / SAMPLES) * TWO_PI;
    const v  = getWave(waveType, ratio * t + phase);
    const sx = px + (i / SAMPLES) * pw;
    const sy = midY - v * amp;
    vertex(sx, sy);
  }
  endShape();

  // Label
  noStroke();
  textFont('monospace');
  textSize(10);
  textAlign(LEFT, TOP);
  fill(col);
  text(label, px + 6, py + 4);
}

// Lissajous panel

function drawLissajous(x0, y0, w0, h0, wR, wL, rR, rL, phaseR, phaseL, showAxes) {
  const px = x0 + M;
  const py = y0 + M;
  const pw = w0 - M * 2;
  const ph = h0 - M * 2;
  const cx = x0 + w0 / 2;
  const cy = y0 + h0 / 2;
  const hs = min(pw, ph) / 2;

  if (showAxes) {
    // Faint centre cross
    stroke(COL_GRD);
    strokeWeight(1);
    line(px, cy, px + pw, cy);
    line(cx, py, cx, py + ph);

    // Diagonal axes
    stroke(COL_AX);
    strokeWeight(1);
    line(px,      py,      px + pw, py + ph);
    line(px + pw, py,      px,      py + ph);

    // Box
    noFill();
    stroke(COL_BOX);
    rect(px, py, pw, ph);

    // Axis labels
    noStroke();
    textFont('monospace');
    textSize(9);
    textAlign(LEFT, TOP);
    fill(COL_L);
    text('L', px + 6, py + 6);
    textAlign(RIGHT, TOP);
    fill(COL_R);
    text('R', px + pw - 6, py + 6);
  }

  // Figure
  const g       = gcd(rR, rL);
  const tMax    = TWO_PI / g;
  const SAMPLES = 2000;
  const scale   = hs * 0.88 * INV_SQRT2;

  stroke(0);
  strokeWeight(1.5);
  noFill();
  beginShape();
  for (let i = 0; i <= SAMPLES; i++) {
    const t  = (i / SAMPLES) * tMax;
    const xv = getWave(wR, rR * t + phaseR);
    const yv = getWave(wL, rL * t + phaseL);
    const gx = (xv - yv) * INV_SQRT2;
    const gy = (xv + yv) * INV_SQRT2;
    vertex(cx + gx * scale, cy - gy * scale);
  }
  endShape();
}

// function keyPressed() {
//   if (key === 'c') {
//     clear();
//   }

// }

// Right panel gradient Lissajous

function drawLissajousRight(x0, y0, w0, h0, wR, wL, rR, rL, phaseR, phaseL) {
  // clear();
  const cx = x0 + w0 / 2;
  const cy = y0 + h0 / 2;
  const hs = min(w0 - M * 2, h0 - M * 2) / 2;

  const g       = gcd(rR, rL);
  const tMax    = TWO_PI / g;
  const SAMPLES = 2000;
  const scale   = hs * 0.2 * INV_SQRT2; // *2;

  push();
  translate(cx, cy);
  rotate(-QUARTER_PI);
  // noFill()
  // fill('#f4f4f4');
  repeat(100, (n) => {
    gradientStroke(n*5, 1);
    beginShape();
    for (let i = 0; i <= SAMPLES; i++) {
      const t  = (i / SAMPLES) * tMax;
      const xv = getWave(wR, rR * t + phaseR);
      const yv = getWave(wL, rL * t + phaseL);
      const gx = (xv - yv) * INV_SQRT2;
      const gy = (xv + yv) * INV_SQRT2;
      vertex(gx * scale, -gy * scale);
    }
    endShape();
  });
  pop();
}

function drawLissajousRightStrokes(x0, y0, w0, h0, wR, wL, rR, rL, phaseR, phaseL) {
  const cx = x0 + w0 / 2;
  const cy = y0 + h0 / 2;
  const hs = min(w0 - M * 2, h0 - M * 2) / 2;

  const g       = gcd(rR, rL);
  const tMax    = TWO_PI / g;
  const SAMPLES = 2000;
  const scale   = hs * 0.2 * INV_SQRT2 *2;

  push();
  translate(cx, cy);
  rotate(-QUARTER_PI);
  fill('#f4f4f439');
  stroke('#f4f4f439');
  strokeWeight(50);
  strokeCap(SQUARE);

  beginShape();
    for (let i = 0; i <= SAMPLES; i++) {
      const t  = (i / SAMPLES) * tMax;
      const xv = getWave(wR, rR * t + phaseR);
      const yv = getWave(wL, rL * t + phaseL);
      const gx = (xv - yv) * INV_SQRT2;
      const gy = (xv + yv) * INV_SQRT2;
      vertex(gx * scale, -gy * scale);
    }
    endShape();
  pop();
}

// Utilities

function gradientStroke(n, thickness) {
  const n2 = lerp(1-thickness, 1, n/2);
  strokeWeight(lerp(500, 1, n2));
  let colorA = color('#0000003f');
  let colorB = color('#ffffff5e');
  stroke(lerpColor(colorA, colorB, n));
  strokeCap(SQUARE);
}

function repeat(quantity, pattern) {
  for (let i = 0; i < quantity; i++) {
    let n = (i / (quantity - 1));
    if (isNaN(n)) n = 1;
    pattern(n, quantity);
  }
}

function gcd(a, b) {
  while (b > 0) { const t = b; b = a % b; a = t; }
  return a;
}
