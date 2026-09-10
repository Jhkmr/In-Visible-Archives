const dotTemplates = [
  {
    name: "Default",
    code: `stroke(0);
strokeWeight(1);
fill(0);
for (let d of dots) {
  circle(gridX + d.x, gridY + d.y, activeSize);
}`,
  },
  {
    name: "Background Grid",
    code: `stroke(0);
strokeWeight(1);
fill(0);
for (let d of dots) {
  circle(gridX + d.x, gridY + d.y, activeSize);
}
for (let d of inactiveDots) {
  ellipse(gridX + d.x, gridY + d.y, 2, 2);
}`,
  },
  {
    name: "Variable Sizes",
    code: `stroke(150, 0, 0);
strokeWeight(1);
fill(0);
for (let d of dots) {
   ellipse(gridX + d.x, gridY + d.y,  activeSize*d.x*0.0005*spacing, activeSize*d.y*0.0005*spacing);
}`,
  },
  {
    name: "Sine Patterns",
    code: `angleMode(RADIANS);
strokeWeight(0.5);
for (let d of dots) {
  stroke(255);
  fill(0, 0, 0, d.y % 200);
  push();
  translate(gridX + d.x, gridY + d.y);
  rect(0, 0, cellW * sin(d.y), rows * cellH - (gridY + d.y)); 
  pop();
}`,
  },
  {
    name: "Hatching",
    code: `angleMode(DEGREES);
stroke(0);
strokeWeight(0.5);
noFill();
for (let d of dots) {
  push();
  translate(gridX + d.x, gridY + d.y);
  rotate(35);
  line(10, 0, 0, activeSize * 5);
  rotate(90);
  line(1000, 0, cellW *d.y*activeSize, activeSize * 5);
  pop();
}`,
  },  
  
  // {
  //   name: "",
  //   code: ``,
  // },
  // {
  //   name: "",
  //   code: ``,
  // }
];
