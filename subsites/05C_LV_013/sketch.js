let cols = 18;
let rows = 12;

let cellW = 675 / 10;
let cellH = 600 / 11;

let btnConfirm, btnClear, btnSave, btnRowPlus, btnRowMinus, btnColPlus, btnColMinus, btnOverlap, btnInvert, btnMerge;
let a1Slider, b1Slider, tSlider, swSlider, offsetSlider;
let overlapFill = false;
let invertColors = false;
let mergedMask = true;


function setup() {
  createCanvas(windowWidth, windowHeight);

  btnConfirm = createButton("Confirm");
  btnConfirm.mousePressed(() => { captureFullForm(); type1Shapes = []; });

  btnClear = createButton("Clear");
  btnClear.mousePressed(() => { type1Shapes = []; placingLocked = false; fullForm = null; });

  btnSave = createButton("Save");
  btnSave.mousePressed(() => { saveImage(); });

  btnOverlap = createButton("Overlap: off");
  btnOverlap.mousePressed(() => {
    overlapFill = !overlapFill;
    btnOverlap.html('Overlap: ' + (overlapFill ? 'on' : 'off'));
  });

  btnInvert = createButton("Invert: off");
  btnInvert.mousePressed(() => {
    invertColors = !invertColors;
    btnInvert.html('Invert: ' + (invertColors ? 'on' : 'off'));
  });

  btnMerge = createButton("Merge: on");
  btnMerge.mousePressed(() => {
    mergedMask = !mergedMask;
    btnMerge.html('Merge: ' + (mergedMask ? 'on' : 'off'));
  });

  btnRowPlus  = createButton('+');
  btnRowMinus = createButton('-');
  btnColPlus  = createButton('+');
  btnColMinus = createButton('-');

  btnRowPlus.mousePressed(()  => rows++);
  btnRowMinus.mousePressed(() => { if (rows > 1) rows--; });
  btnColPlus.mousePressed(()  => cols++);
  btnColMinus.mousePressed(() => { if (cols > 1) cols--; });

  // a1Slider = createSlider(0, 10, 2.5,   0.5);
  // b1Slider = createSlider(0, 10, 5, 0.5);
  // tSlider  = createSlider(0, 10, 5, 0.1);
  a1Slider = createSlider(0, 10, 5,   0.5);
  b1Slider = createSlider(0, 10, 6.5, 0.5);
  tSlider  = createSlider(0, 10, 8.7, 0.1);
  swSlider     = createSlider(0.5, 10, 1, 0.5);
  offsetSlider = createSlider(-4 * cellW, 4 * cellW, 0, 1);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background('#ffffff');
  drawGrid();

  if (fullForm) drawFullForm();
  drawType1();
  drawLissajous1();

  let gx = cols * cellW;
  let gy = rows * cellH;

  btnConfirm.position(10, gy + 10);
  btnClear.position(10, gy + 35);
  btnSave.position(10, gy + 60);
  btnOverlap.position(305, gy + 10);
  btnInvert.position(305, gy + 35);
  btnMerge.position(305, gy + 60);

  btnRowMinus.position(gx - 50, gy + 10);
  btnRowPlus.position( gx - 25, gy + 10);

  btnColPlus.position( gx + 10, gy - 50);
  btnColMinus.position(gx + 10, gy - 25);

  a1Slider.position(100, gy + 10);
  b1Slider.position(100, gy + 35);
  tSlider.position( 100, gy + 60);
  swSlider.position(430, gy + 10);
  offsetSlider.position(430, gy + 35);

  fill(0);
  noStroke();
  textSize(11);
  text('a: '  + a1Slider.value(), a1Slider.x + a1Slider.width + 4, gy + 15);
  text('b: '  + b1Slider.value(), b1Slider.x + b1Slider.width + 4, gy + 41);
  text('t: '  + tSlider.value(),  tSlider.x  + tSlider.width  + 4, gy + 66);
  text('sw: '     + swSlider.value(),                          swSlider.x     + swSlider.width     + 4, gy + 15);
  text('off: '    + nf(offsetSlider.value(), 1, 1),            offsetSlider.x + offsetSlider.width + 4, gy + 41);

  stroke('black');
  strokeWeight(0);
  noFill();
  rect(mouseX - cellW*2, mouseY -cellH*2, cellW*4, cellH*4);
}

function drawGrid() {
  stroke(200);
  strokeWeight(1);
  noFill();
  for (let x = 0; x <= cols; x++) {
    line(x * cellW, 0, x * cellW, rows * cellH);
  }
  for (let y = 0; y <= rows; y++) {
    line(0, y * cellH, cols * cellW, y * cellH);
  }
}

let type1Shapes = [];
let placingLocked = false;
let fullForm = null;
let lissT = 0;

function mousePressed(event) {
  if (event.target.tagName === 'BUTTON') return;

  if (mouseX < 0 || mouseX > cols * cellW || mouseY < 0 || mouseY > rows * cellH) return;

  let pt = getClosestIntersection(mouseX, mouseY);

  if (pt.x < 2 || pt.x > cols - 2 || pt.y < 2 || pt.y > rows - 2) return;

  pt.rot = (floor(random(12)) * PI / 2);
  type1Shapes.push(pt);
}

function getClosestIntersection(x, y) {
  let gx = Math.round(x / cellW);
  let gy = Math.round(y / cellH);

  return {
    x: gx,
    y: gy
  };
}

function drawType1() {
  noStroke();
  // fill('#000000');

  for (let s of type1Shapes) {
    let x = (s.x - 2) * cellW;
    let y = (s.y - 2) * cellH;
    let w = 4 * cellW;
    let h = 4 * cellH;
  

    let grad = drawingContext.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgb(0, 0, 0)');
    drawingContext.fillStyle = grad;
    drawingContext.fillRect(x, y, w, h);
  }
}



function drawLissajous1() {
  let a    = a1Slider.value();
  let b    = b1Slider.value();
  let tVal = tSlider.value();
  let size = 6 * cellW;

  noFill();
  stroke(invertColors ? '#000000' : '#ffffff');
  strokeWeight(swSlider.value());

  for (let s of type1Shapes) {
    let cx = s.x * cellW;
    let cy = s.y * cellH;
    let bx = (s.x - 2) * cellW;
    let by = (s.y - 2) * cellH;
    let bw = 4 * cellW;
    let bh = 4 * cellH;

    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(bx, by, bw, bh);
    drawingContext.clip();

    push();
    translate(cx, cy);
    rotate(s.rot);
    translate(offsetSlider.value(), 0);
    let t = lissT;
    beginShape();
    for (let i = 0; i < 60; i++) {
      let x = size * sin(a * t + PI / 2);
      let y = size * sin(b * t);
      curveVertex(x, y);
      t += tVal;
    }
    endShape();
    pop();

    drawingContext.restore();
  }

  lissT += tVal;
}


// Shape logic type 2

function findClosestPairs() {
  let pairs = [];

  for (let i = 0; i < type1Shapes.length; i++) {
    let a = type1Shapes[i];
    let best = null;
    let bestDist = Infinity;

    for (let j = i + 1; j < type1Shapes.length; j++) {
      let b = type1Shapes[j];

      let dx = abs(a.x - b.x);
      let dy = abs(a.y - b.y);
      let dist = sqrt(dx*dx + dy*dy);

      if (dist < bestDist) {
        bestDist = dist;
        best = b;
      }
    }

    if (best) {
      pairs.push([a, best]);
    }
  }

  return pairs;
}

function intersectionToPixel(pt) {
  return createVector(pt.x * cellW, pt.y * cellH);
}

function drawType2() {
  let pairs = findClosestPairs();

  fill('#000000');
  noStroke();

  for (let [s1, s2] of pairs) {
    let left  = s1.x <= s2.x ? s1 : s2;
    let right = s1.x <= s2.x ? s2 : s1;

    if (left.x === right.x && left.y === right.y) continue;

    let leftPx  = intersectionToPixel(left);
    let rightPx = intersectionToPixel(right);

    let leftIsLower = left.y >= right.y;
    let vertProx       = 4 - abs(left.y - right.y);
    let horizThreshold = vertProx  < 0 ? 4 : 3 - vertProx;

    let horizProx      = 4 - abs(left.x - right.x);
    let vertThreshold  = horizProx < 0 ? 4 : 3 - horizProx;

    let overlap = abs(left.x - right.x) < horizThreshold
               && abs(left.y - right.y) > vertThreshold;

    let leftBottom  = (left.y  + 2) * cellH;
    let rightBottom = (right.y + 2) * cellH;
    let leftTop     = (left.y  - 2) * cellH;
    let rightTop    = (right.y - 2) * cellH;

    let A, B, targetY_D, targetY_Df, xSign;

    if (!overlap && leftIsLower) {
      A = leftPx;  B = rightPx; targetY_D = leftBottom;  targetY_Df = rightTop; xSign = 1;
    } else if (!overlap && !leftIsLower) {
      A = rightPx; B = leftPx;  targetY_D = rightBottom; targetY_Df = leftTop;  xSign = -1;
    } else if (overlap && leftIsLower) {
      A = rightPx; B = leftPx;  targetY_D = rightBottom; targetY_Df = leftTop;  xSign = 1;
    } else {
      A = leftPx;  B = rightPx; targetY_D = leftBottom;  targetY_Df = rightTop; xSign = -1;
    }

    let x_d = A.x + xSign * (targetY_D - A.y);
    let D = createVector(x_d, targetY_D);
    let C = findPointC(A, B, D);

    let Af = B, Bf = A;
    let x_df = Af.x + xSign * (targetY_Df - Af.y);
    let Df = createVector(x_df, targetY_Df);
    let Cf = findPointC(Af, Bf, Df);

    beginShape();
    vertex(C.x, C.y);
    vertex(D.x, D.y);
    vertex(Cf.x, Cf.y);
    vertex(Df.x, Df.y);

    endShape(CLOSE);
  }
}

function captureFullForm() {
  if (!fullForm) fullForm = { type1: [], type2: [], lissajous: [] };

  for (let s of type1Shapes) {
    fullForm.lissajous.push({
      cx:  s.x * cellW,
      cy:  s.y * cellH,
      rot: s.rot,
      bx:  (s.x - 2) * cellW,
      by:  (s.y - 2) * cellH,
      bw:  4 * cellW,
      bh:  4 * cellH
    });
  }

  for (let s of type1Shapes) {
    let x = (s.x - 2) * cellW;
    let y = (s.y - 2) * cellH;
    fullForm.type1.push([
      {x: x,              y: y},
      {x: x + 4 * cellW, y: y},
      {x: x + 4 * cellW, y: y + 4 * cellH},
      {x: x,              y: y + 4 * cellH}
    ]);
  }

  let pairs = findClosestPairs();

  for (let [s1, s2] of pairs) {
    let i1 = type1Shapes.indexOf(s1);
    let i2 = type1Shapes.indexOf(s2);
    let left  = s1.x <= s2.x ? s1 : s2;
    let right = s1.x <= s2.x ? s2 : s1;
    if (left.x === right.x && left.y === right.y) continue;

    let leftPx  = intersectionToPixel(left);
    let rightPx = intersectionToPixel(right);

    let leftIsLower = left.y >= right.y;
    let vertProx       = 4 - abs(left.y - right.y);
    let horizThreshold = vertProx  < 0 ? 4 : 3 - vertProx;
    let horizProx      = 2 - abs(left.x - right.x);
    let vertThreshold  = horizProx < 0 ? 4 : 3 - horizProx;
    let overlap = abs(left.x - right.x) < horizThreshold
               && abs(left.y - right.y) > vertThreshold;

    let leftBottom  = (left.y  + 2) * cellH;
    let rightBottom = (right.y + 2) * cellH;
    let leftTop     = (left.y  - 2) * cellH;
    let rightTop    = (right.y - 2) * cellH;

    let A, B, targetY_D, targetY_Df, xSign;

    if (!overlap && leftIsLower) {
      A = leftPx;  B = rightPx; targetY_D = leftBottom;  targetY_Df = rightTop; xSign = 1;
    } else if (!overlap && !leftIsLower) {
      A = rightPx; B = leftPx;  targetY_D = rightBottom; targetY_Df = leftTop;  xSign = -1;
    } else if (overlap && leftIsLower) {
      A = rightPx; B = leftPx;  targetY_D = rightBottom; targetY_Df = leftTop;  xSign = 1;
    } else {
      A = leftPx;  B = rightPx; targetY_D = leftBottom;  targetY_Df = rightTop; xSign = -1;
    }

    let x_d = A.x + xSign * (targetY_D - A.y);
    let D = createVector(x_d, targetY_D);
    let C = findPointC(A, B, D);

    let Af = B, Bf = A;
    let x_df = Af.x + xSign * (targetY_Df - Af.y);
    let Df = createVector(x_df, targetY_Df);
    let Cf = findPointC(Af, Bf, Df);

    fullForm.type2.push({
      verts: [
        {x: C.x,  y: C.y},
        {x: D.x,  y: D.y},
        {x: Cf.x, y: Cf.y},
        {x: Df.x, y: Df.y}
      ],
      lissIndices: [i1, i2]
    });
  }
}

// Winds vertices clockwise
function cwVertices(verts) {
  let area = 0;
  for (let i = 0; i < verts.length; i++) {
    let j = (i + 1) % verts.length;
    area += (verts[i].x * verts[j].y - verts[j].x * verts[i].y);
  }
  return area < 0 ? [...verts].reverse() : verts;
}

function addShapeToPath(verts) {
  let v = cwVertices(verts);
  drawingContext.moveTo(v[0].x, v[0].y);
  for (let i = 1; i < v.length; i++) drawingContext.lineTo(v[i].x, v[i].y);
  drawingContext.closePath();
}

function drawOneLissajous(ls, a, b, tVal, size) {
  push();
  translate(ls.cx, ls.cy);
  rotate(ls.rot);
  translate(offsetSlider.value(), 0);
  let t = lissT;
  beginShape();
  for (let i = 0; i < 60; i++) {
    let x = size * sin(a * t + PI / 2);
    let y = size * sin(b * t);
    curveVertex(x, y);
    t += tVal;
  }
  endShape();
  pop();
}

function applyClipAndDraw(clipFn, lissajousList, a, b, tVal, size) {
  drawingContext.save();
  drawingContext.beginPath();
  clipFn();
  drawingContext.clip(overlapFill ? 'nonzero' : 'evenodd');
  if (invertColors) {
    drawingContext.fillStyle = '#000000';
    drawingContext.fillRect(0, 0, width, height);
  }
  noFill();
  stroke(invertColors ? '#ffffff' : '#000000');
  strokeWeight(swSlider.value());
  for (let ls of lissajousList) drawOneLissajous(ls, a, b, tVal, size);
  drawingContext.restore();
}

function drawFullForm() {
  let a    = a1Slider.value();
  let b    = b1Slider.value();
  let tVal = tSlider.value();
  let size = 12 * cellW;

  if (mergedMask) {
    applyClipAndDraw(
      () => {
        for (let shape of fullForm.type1) addShapeToPath(shape);
        for (let shape of fullForm.type2) addShapeToPath(shape.verts);
      },
      fullForm.lissajous,
      a, b, tVal, size
    );
  } else {
    for (let i = 0; i < fullForm.type1.length; i++) {
      applyClipAndDraw(
        () => addShapeToPath(fullForm.type1[i]),
        [fullForm.lissajous[i]],
        a, b, tVal, size
      );
    }
    for (let shape of fullForm.type2) {
      applyClipAndDraw(
        () => addShapeToPath(shape.verts),
        shape.lissIndices.map(i => fullForm.lissajous[i]),
        a, b, tVal, size
      );
    }
  }
}

function saveImage() {
  if (!fullForm) return;

  let pg = createGraphics(cols * cellW, rows * cellH);
  pg.noStroke();

  pg.fill('#000000');
  for (let shape of fullForm.type2) {
    pg.beginShape();
    for (let v of shape.verts) pg.vertex(v.x, v.y);
    pg.endShape(CLOSE);
  }

  pg.fill('#000000');
  for (let shape of fullForm.type1) {
    pg.beginShape();
    for (let v of shape) pg.vertex(v.x, v.y);
    pg.endShape(CLOSE);
  }

  saveCanvas(pg, 'blocks', 'png');
  pg.remove();
}