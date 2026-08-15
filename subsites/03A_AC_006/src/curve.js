// Curve class
export function makeCurveClass(p) {
  return class Curve {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.points = [];
    }

    setX(x) { this.x = x; }
    setY(y) { this.y = y; }

    addPoint() {
      this.points.push(p.createVector(this.x, this.y));
    }

    show() {
      // p.fill('red');
      // p.stroke('red');
      p.strokeWeight(0);
      p.beginShape();
      for (let v of this.points) {
        p.vertex(v.x, v.y);
      }
      p.endShape();
    }

    reset() {
      this.points = [];
    }
  };
}
