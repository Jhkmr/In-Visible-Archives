import { state } from './state.js';

const SVG_NS  = 'http://www.w3.org/2000/svg';
const SIZE    = 200;
const PAD     = 22;
const GRID    = SIZE - 2 * PAD;
const DOT_HIT = 18;

const GRID_DOTS = [];
for (let row = 0; row <= 2; row++) {
  for (let col = 0; col <= 2; col++) {
    GRID_DOTS.push({
      px: PAD + (col / 2) * GRID,
      py: PAD + (row / 2) * GRID,
      nx: col / 2,
      ny: row / 2,
    });
  }
}

// Helpers

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function clearSVG(svg) {
  while (svg.lastChild) svg.removeChild(svg.lastChild);
}

function wpPx(wp) {
  return { x: PAD + wp.x * GRID, y: PAD + wp.y * GRID };
}

// Build path
function buildPathD(wp, tension) {
  if (wp.length < 2) return '';
  const pts = wp.map(wpPx);
  let d = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    if (tension === 0) {
      d += ` L ${p2.x} ${p2.y}`;
    } else {
      const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
      const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
      const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
      const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;
      d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
    }
  }
  return d;
}

function getTension() {
  return parseInt(document.getElementById('tensionSlider').value) / 100;
}

// Click handling

function handleClick(e) {
  if (!state.selectedOscillator) return;
  const svg  = document.getElementById('editor-canvas');
  const rect = svg.getBoundingClientRect();
  const mx   = (e.clientX - rect.left) / rect.width  * SIZE;
  const my   = (e.clientY - rect.top)  / rect.height * SIZE;

  let nearest = null, nearestDist = Infinity;
  for (const dot of GRID_DOTS) {
    const d = Math.hypot(dot.px - mx, dot.py - my);
    if (d < nearestDist) { nearestDist = d; nearest = dot; }
  }
  if (nearest && nearestDist < DOT_HIT) {
    state.editorWaypoints.push({ x: nearest.nx, y: nearest.ny });
    drawEditor();
  }
}

// Public API

export function initEditor() {
  const svg = document.getElementById('editor-canvas');
  svg.addEventListener('click', handleClick);

  document.getElementById('registerBtn').addEventListener('click', () => {
    if (!state.selectedOscillator || state.editorWaypoints.length < 2) return;
    const tension    = getTension();
    const { type, index } = state.selectedOscillator;
    const store      = type === 'col' ? state.colPaths : state.rowPaths;
    store[index]     = { points: [...state.editorWaypoints], tension };
    drawEditor();
  });

  document.getElementById('clearEditorBtn').addEventListener('click', () => {
    state.editorWaypoints = [];
    drawEditor();
  });

  document.getElementById('tensionSlider').addEventListener('input', (e) => {
    document.getElementById('tensionLabel').textContent = e.target.value;
    drawEditor();
  });

  drawEditor();
}

export function loadOscillatorIntoEditor() {
  const label = document.getElementById('selected-label');

  if (!state.selectedOscillator) {
    label.textContent     = 'select an oscillator';
    state.editorWaypoints = [];
    drawEditor();
    return;
  }

  const { type, index } = state.selectedOscillator;
  label.textContent = `${type === 'col' ? 'column' : 'row'} ${index + 1}`;

  const existing        = (type === 'col' ? state.colPaths : state.rowPaths)[index];
  state.editorWaypoints = existing ? [...existing.points] : [];
  if (existing) {
    const val = Math.round(existing.tension * 100);
    document.getElementById('tensionSlider').value    = val;
    document.getElementById('tensionLabel').textContent = val;
  }
  drawEditor();
}

export function drawEditor() {
  const svg = document.getElementById('editor-canvas');
  clearSVG(svg);

  // Background
  svg.appendChild(svgEl('rect', { x: 0, y: 0, width: SIZE, height: SIZE, fill: '#f4f4f4' }));

  // Grid lines
  for (let i = 0; i <= 2; i++) {
    const x = PAD + (i / 2) * GRID;
    const y = PAD + (i / 2) * GRID;
    svg.appendChild(svgEl('line', { x1: x, y1: PAD,      x2: x, y2: PAD + GRID, stroke: '#cccccc', 'stroke-width': '0' }));
    svg.appendChild(svgEl('line', { x1: PAD, y1: y, x2: PAD + GRID, y2: y,      stroke: '#cccccc', 'stroke-width': '0' }));
  }

  const wp = state.editorWaypoints;

  if (wp.length >= 2) {
    const d = buildPathD(wp, getTension());
    svg.appendChild(svgEl('path', { d, fill: 'none', stroke: '#000000', 'stroke-width': '1.5' }));
  }

  const wpSet = new Set(wp.map(p => `${p.x},${p.y}`));
  for (const dot of GRID_DOTS) {
    if (wpSet.has(`${dot.nx},${dot.ny}`)) continue;
    svg.appendChild(svgEl('circle', {
      cx: dot.px, cy: dot.py, r: 1,
      fill: '#000000', stroke: '#888888', 'stroke-width': '0',
    }));
  }


}
