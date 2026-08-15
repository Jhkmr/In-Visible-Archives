// Oscilloscope XY Mode

let waveRSel, waveLSel, ratioRSel, ratioLSel, phaseSlider, phaseLabel;

const W      = 960;
const H      = 480;
const SPLIT  = W / 2;
const M      = 36;

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
  noLoop();

  waveRSel    = select('#waveR');
  waveLSel    = select('#waveL');
  ratioRSel   = select('#ratioR');
  ratioLSel   = select('#ratioL');
  phaseSlider = select('#phase');
  phaseLabel  = select('#phaseLabel');

  waveRSel.changed(redraw);
  waveLSel.changed(redraw);
  ratioRSel.changed(redraw);
  ratioLSel.changed(redraw);
  phaseSlider.input(() => {
    phaseLabel.html(int(phaseSlider.value()) * 15 + '°');
    redraw();
  });
}

function draw() {
  background(244, 244, 244, 1);

  const wR       = waveRSel.value();
  const wL       = waveLSel.value();
  const rR       = int(ratioRSel.value());
  const rL       = int(ratioLSel.value());
  const phaseRad = radians(int(phaseSlider.value()) * 15);

  drawTimeDomain(wR, wL, rR, rL, phaseRad);
  drawLissajous(wR, wL, rR, rL, phaseRad);

  // Panel divider
  stroke(220);
  strokeWeight(1);
  line(SPLIT, 0, SPLIT, H);
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

const MY = 16;

function drawTimeDomain(wR, wL, rR, rL, phase) {
  const halfH = H / 2;

  drawChannel(wR, rR, 0,     0,     SPLIT, halfH, 'R', COL_R, 0);
  drawChannel(wL, rL, 0,     halfH, SPLIT, halfH, 'L', COL_L, phase);

  stroke(215);
  strokeWeight(1);
  line(0, halfH, SPLIT, halfH);
}

// Single channel waveform
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

  noStroke();
  textFont('monospace');
  textSize(10);
  textAlign(LEFT, TOP);
  fill(col);
  text(label, px + 6, py + 4);
}

// Right panel: Lissajous / XY Mode

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

  const g       = gcd(rR, rL);
  const tMax    = TWO_PI / g;
  const SAMPLES = 2000;
  const scale   = hs * 0.88 / sqrt(2);

  stroke(COL_FIG);
  strokeWeight(1.5);
  // noFill();
  fill('#6569d368');
  beginShape();
  for (let i = 0; i <= SAMPLES; i++) {
    const t  = (i / SAMPLES) * tMax;
    const xv = getWave(wR, rR * t);
    const yv = getWave(wL, rL * t + phase);
    const gx = (xv - yv) / sqrt(2);
    const gy = (xv + yv) / sqrt(2);
    vertex(cx + gx * scale, cy - gy * scale);
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

// Utility

function gcd(a, b) {
  while (b > 0) { const t = b; b = a % b; a = t; }
  return a;
}
