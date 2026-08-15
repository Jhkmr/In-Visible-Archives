// State
export const state = {
  selectedOscillator: null,
  editorWaypoints:    [],
  colPaths:           {},
  rowPaths:           {},
};

// Evaluate path
export function evalPath(points, tension, t) {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { x: points[0].x - 0.5, y: points[0].y - 0.5 };

  const n   = points.length - 1;
  const seg = Math.min(Math.floor(t * n), n - 1);
  const lt  = t * n - seg;

  const p1 = points[seg];
  const p2 = points[seg + 1];

  if (tension === 0 || points.length < 3) {
    return {
      x: p1.x + (p2.x - p1.x) * lt - 0.5,
      y: p1.y + (p2.y - p1.y) * lt - 0.5,
    };
  }

  const p0    = points[Math.max(0, seg - 1)];
  const p3    = points[Math.min(n, seg + 2)];
  const cp1x  = p1.x + (p2.x - p0.x) / 6 * tension;
  const cp1y  = p1.y + (p2.y - p0.y) / 6 * tension;
  const cp2x  = p2.x - (p3.x - p1.x) / 6 * tension;
  const cp2y  = p2.y - (p3.y - p1.y) / 6 * tension;
  const mt    = 1 - lt;
  return {
    x: mt*mt*mt*p1.x + 3*mt*mt*lt*cp1x + 3*mt*lt*lt*cp2x + lt*lt*lt*p2.x - 0.5,
    y: mt*mt*mt*p1.y + 3*mt*mt*lt*cp1y + 3*mt*lt*lt*cp2y + lt*lt*lt*p2.y - 0.5,
  };
}