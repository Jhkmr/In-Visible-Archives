let cols = 18;
let rows = 12;

let cellW = 675 / 10;
let cellH = 600 / 11;

let btnConfirm, btnClear, btnSave, btnRowPlus, btnRowMinus, btnColPlus, btnColMinus;

let colorChangeInterval = 30;
let type1Color, fullFormColor1, fullFormColor2;

function randomFillColor() {
  return [random(100, 256), random(100, 256), random(100, 256)];
}


function setup() {
  createCanvas(windowWidth, windowHeight);

  btnConfirm = createButton("Confirm");
  btnConfirm.mousePressed(() => { captureFullForm(); type1Shapes = []; });

  btnClear = createButton("Clear");
  btnClear.mousePressed(() => { type1Shapes = []; placingLocked = false; fullForm = null; });

  btnSave = createButton("Save");
  btnSave.mousePressed(() => { saveImage(); });

  btnRowPlus  = createButton('+');
  btnRowMinus = createButton('-');
  btnColPlus  = createButton('+');
  btnColMinus = createButton('-');

  btnRowPlus.mousePressed(()  => rows++);
  btnRowMinus.mousePressed(() => { if (rows > 1) rows--; });
  btnColPlus.mousePressed(()  => cols++);
  btnColMinus.mousePressed(() => { if (cols > 1) cols--; });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(255);
  drawGrid();

  if (fullForm) drawFullForm();
  drawType1();

  let gx = cols * cellW;
  let gy = rows * cellH;

  btnConfirm.position(10, gy + 10);
  btnClear.position(75, gy + 10);
  btnSave.position(150, gy + 10);

  btnRowMinus.position(gx - 50, gy + 10);
  btnRowPlus.position( gx - 25, gy + 10);

  btnColPlus.position( gx + 10, gy - 50);
  btnColMinus.position(gx + 10, gy - 25);

  stroke('black');
  noFill();
  rect(mouseX - cellW*2, mouseY -cellH*2, cellW*4, cellH*4);
}

function drawGrid() {
  stroke(200);
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

function mousePressed(event) {
  if (event.target.tagName === 'BUTTON') return;

  if (mouseX < 0 || mouseX > cols * cellW || mouseY < 0 || mouseY > rows * cellH) return;

  let pt = getClosestIntersection(mouseX, mouseY);

  if (pt.x < 2 || pt.x > cols - 2 || pt.y < 2 || pt.y > rows - 2) return;

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
  if (!type1Color || frameCount % colorChangeInterval === 0) {
    type1Color = randomFillColor();
  }
  fill(...type1Color);
  noStroke();

  for (let s of type1Shapes) {
    let x = (s.x - 2) * cellW;
    let y = (s.y - 2) * cellH;

    rect(x , y, 4 * cellW, 4 * cellH);
  }
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

  fill(random(100, 256), random(100, 256), random(100, 256));

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
  if (!fullForm) fullForm = { type1: [], type2: [] };

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

    fullForm.type2.push([
      {x: C.x,  y: C.y},
      {x: D.x,  y: D.y},
      {x: Cf.x, y: Cf.y},
      {x: Df.x, y: Df.y}
    ]);
  }
}

function drawFullForm() {
  noStroke();

  if (!fullFormColor1 || frameCount % colorChangeInterval === 0) {
    fullFormColor1 = randomFillColor();
  }
  fill(...fullFormColor1);


  for (let shape of fullForm.type2) {
    beginShape();
    for (let v of shape) vertex(v.x, v.y);
    endShape(CLOSE);
  }


  if (!fullFormColor2 || frameCount % colorChangeInterval === 0) {
    fullFormColor2 = randomFillColor();
  }
  fill(...fullFormColor2);
  for (let shape of fullForm.type1) {
    beginShape();
    for (let v of shape) vertex(v.x, v.y);
    endShape(CLOSE);
  }

}

function saveImage() {
  if (!fullForm) return;

  let pg = createGraphics(cols * cellW, rows * cellH);
  pg.noStroke();

  pg.fill(...fullFormColor2);
  for (let shape of fullForm.type2) {
    pg.beginShape();
    for (let v of shape) pg.vertex(v.x, v.y);
    pg.endShape(CLOSE);
  }

  pg.fill(...fullFormColor1);
  for (let shape of fullForm.type1) {
    pg.beginShape();
    for (let v of shape) pg.vertex(v.x, v.y);
    pg.endShape(CLOSE);
  }

  saveCanvas(pg, 'blocks', 'png');
  pg.remove();
}