import { initUI } from './ui.js';
import { state, evalPath } from './state.js';
import { makeCurveClass } from './curve.js';
import { loadOscillatorIntoEditor } from './editor.js';

let paused = false;

function togglePaused() {
  paused = !paused;
  const btn = document.getElementById('pauseBtn');
  if (btn) btn.textContent = paused ? 'resume' : 'pause';
}

// Bezier evaluation
function bezierPt(t, x0, y0, cx1, cy1, cx2, cy2, x1, y1) {
  const mt = 1 - t;
  return {
    x: mt*mt*mt*x0 + 3*mt*mt*t*cx1 + 3*mt*t*t*cx2 + t*t*t*x1,
    y: mt*mt*mt*y0 + 3*mt*mt*t*cy1 + 3*mt*t*t*cy2 + t*t*t*y1,
  };
}

// Default paths
const PATHS = [
  t => bezierPt(t, -0.5, -0.3,  -0.5, 0.5,   0.5, 0.5,   0.5, -0.3),

  t => bezierPt(t, -0.5, -0.5,   0.5, -0.5,  -0.5, 0.5,   0.5,  0.5),

  t => bezierPt(t, -0.5,  0.3,  -0.5, -0.5,   0.5, -0.5,  0.5,  0.3),

  t => bezierPt(t, -0.5, -0.5,  -0.3,  0.5,   0.3, -0.5,  0.5,  0.5),

  t => t < 0.5
    ? bezierPt(t * 2,     -0.5,  0,  -0.2, -0.5,  0.2, -0.5,  0,    0)
    : bezierPt(t * 2 - 1,  0,   0,  -0.2,  0.5,  0.2,  0.5,  0.5,  0),

  t => bezierPt(t, -0.5,  0.5,   0.5,  0.5,   0.5,  0.5,   0.5, -0.5),
];

const sketch = (p) => {
  const Curve = makeCurveClass(p);
  let container;

  // Parameters
  const COLS        = 6;
  const ROWS        = 4;
  const CELL        = 150;
  const PATH_DIAM   = 0.8;
  const SPEED       = 0.01;

  let angle = 0;
  let curves;

  function make2DArray(r, c) {
    return Array.from({ length: r }, () => new Array(c));
  }

  function initGrid() {
    curves = make2DArray(ROWS, COLS);
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        curves[j][i] = new Curve();
      }
    }
  }

  // Path function lookup
  function getPathFn(type, index) {
    const store = type === 'col' ? state.colPaths : state.rowPaths;
    const data  = store[index];
    if (data && data.points.length >= 2) {
      return t => evalPath(data.points, data.tension, t);
    }
    return PATHS[index % PATHS.length];
  }

  // Draw path
  function drawPath(cx, cy, d, type, index) {
    const fn = getPathFn(type, index);
    const steps = 60;
    p.beginShape();
    for (let k = 0; k <= steps; k++) {
      const pt = fn(k / steps);
      p.vertex(cx + pt.x * d, cy + pt.y * d);
    }
    p.endShape();
  }

  // Dot position
  function dotPos(cx, cy, d, type, index) {
    const t  = (1 - p.cos(angle)) / 2;
    const pt = getPathFn(type, index)(t);
    return { x: cx + pt.x * d, y: cy + pt.y * d };
  }

  // Selection check
  function isSelected(type, index) {
    return state.selectedOscillator &&
           state.selectedOscillator.type  === type &&
           state.selectedOscillator.index === index;
  }

  p.setup = () => {
    container = document.getElementById('canvas-container');
    const cnv = p.createCanvas(container.clientWidth, container.clientHeight);
    cnv.parent('canvas-container');
    initGrid();
    initUI(p);

    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) pauseBtn.addEventListener('click', togglePaused);
  };

  p.keyPressed = () => {
    if (p.key === ' ') {
      togglePaused();
    }
  };

  p.mouseClicked = () => {
    for (let i = 0; i < COLS; i++) {
      const cx = CELL + i * CELL + CELL / 2;
      const cy = CELL / 2;
      if (p.dist(p.mouseX, p.mouseY, cx, cy) < CELL / 2) {
        state.selectedOscillator = { type: 'col', index: i };
        loadOscillatorIntoEditor();
        return;
      }
    }
    for (let j = 0; j < ROWS; j++) {
      const cx = CELL / 2;
      const cy = CELL + j * CELL + CELL / 2;
      if (p.dist(p.mouseX, p.mouseY, cx, cy) < CELL / 2) {
        state.selectedOscillator = { type: 'row', index: j };
        loadOscillatorIntoEditor();
        return;
      }
    }
  };

  p.draw = () => {
    for (let b = 0; b < 100; b++){
      if (b < 9) {
        p.background(255, 255, 255, 255);
      } else {
        p.background(255, 255, 255);
      }
    }
    
    const d = CELL * PATH_DIAM;

    for (let i = 0; i < COLS; i++) {
      const cx = CELL + i * CELL + CELL / 2;
      const cy = CELL / 2;

      p.strokeWeight(1);
      p.stroke(isSelected('col', i) ? 'black' : 'black');
      p.noFill();
      drawPath(cx, cy, d, 'col', i);

      const dot = dotPos(cx, cy, d, 'col', i);
      p.strokeWeight(8);
      p.stroke('black');
      p.point(dot.x, dot.y);
      p.stroke('black');
      p.strokeWeight(1);
      p.line(dot.x, 0, dot.x, p.height);

      for (let j = 0; j < ROWS; j++) {
        curves[j][i].setX(dot.x);
      }
    }

    for (let j = 0; j < ROWS; j++) {
      const cx = CELL / 2;
      const cy = CELL + j * CELL + CELL / 2;

      p.strokeWeight(1);
      p.stroke(isSelected('row', j) ? 'black' : 'black');
      p.noFill();
      drawPath(cx, cy, d, 'row', j);

      const dot = dotPos(cx, cy, d, 'row', j);
      p.strokeWeight(8);
      p.stroke('black');
      p.point(dot.x, dot.y);
      p.stroke('black');
      p.strokeWeight(1);
      p.line(0, dot.y, p.width, dot.y);

      for (let i = 0; i < COLS; i++) {
        curves[j][i].setY(dot.y);
      }
    }

    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        curves[j][i].addPoint();
        curves[j][i].show();
      }
    }

    if (!paused) {
      angle -= SPEED;
    }

    if (angle < -p.TWO_PI) {
      for (let j = 0; j < ROWS; j++) {
        for (let i = 0; i < COLS; i++) {
          curves[j][i].reset();
        }
      }
      angle = 0;
    }
  };

  p.windowResized = () => {
    p.resizeCanvas(container.clientWidth, container.clientHeight);
    angle = 0;
    initGrid();
  };
};

new p5(sketch);
