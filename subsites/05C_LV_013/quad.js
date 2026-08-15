function findPointC(A, B, D) {
  let vAD = p5.Vector.sub(D, A);
  let vPerp = createVector(-vAD.y, vAD.x).normalize();
  let vDB = p5.Vector.sub(B, D);
  let distDC = vDB.dot(vPerp);

  return p5.Vector.add(D, p5.Vector.mult(vPerp, distDC));
}
