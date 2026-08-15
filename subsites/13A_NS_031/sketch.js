let img, imgSample;
let cols, rows;
let isPortrait = true;

function setup() {
  let wrap = document.querySelector(".canvas-wrap");
  let { w, h } = fitSize(wrap, isPortrait ? 1 / Math.SQRT2 : Math.SQRT2);
  let cnv = createCanvas(w, h);
  cnv.parent(wrap);
  pixelDensity(2);
  textFont("Archive Grotesk 400");
  noLoop();

  document.getElementById("btnLoad").addEventListener("click", () => {
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.addEventListener("change", () => {
      let file = fileInput.files[0];
      if (!file) return;
      let url = URL.createObjectURL(file);
      document.getElementById("imagePreview").src = url;
      loadImage(url, (loaded) => {
        img = loaded;
        applyCanvasSize();
        updateImgSample();
        redraw();
      });
    });
    fileInput.click();
  });
  document.getElementById("btnClear").addEventListener("click", () => {
    background(0);
    redraw();
  });
  document
    .getElementById("btnSave")
    .addEventListener("click", () => saveCanvas("pixelSort_Grid", "png"));

  let orientationBtnEl = document.getElementById("btnOrientation");
  orientationBtnEl.addEventListener("click", () => {
    isPortrait = !isPortrait;
    orientationBtnEl.textContent =
      "Orientation: " + (isPortrait ? "Portrait" : "Landscape");
    applyCanvasSize();
    updateImgSample();
    redraw();
  });

  const WHEEL_SENSITIVITY = 20;

  document
    .querySelectorAll(".slider-wrap input[type=range]")
    .forEach((slider) => {
      let scrollAccum = 0;
      slider.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          scrollAccum += e.deltaY;
          let step = parseFloat(slider.step) || 1;
          while (Math.abs(scrollAccum) >= WHEEL_SENSITIVITY) {
            let dir = scrollAccum < 0 ? -1 : 1;
            slider.value = constrain(
              parseFloat(slider.value) + dir * step,
              parseFloat(slider.min),
              parseFloat(slider.max),
            );
            scrollAccum -= dir * WHEEL_SENSITIVITY;
          }
          slider.dispatchEvent(new Event("input"));
        },
        { passive: false },
      );
      slider.addEventListener("input", () => redraw());
    });
}

function fitSize(wrap, ratio) {
  let maxW = wrap.offsetWidth;
  let maxH = wrap.offsetHeight;
  let w = maxH * ratio;
  let h = maxH;
  if (w > maxW) {
    w = maxW;
    h = maxW / ratio;
  }
  return { w: Math.floor(w), h: Math.floor(h) };
}

function windowResized() {
  applyCanvasSize();
  updateImgSample();
  redraw();
}

function applyCanvasSize() {
  let wrap = document.querySelector(".canvas-wrap");
  let ratio = isPortrait ? 1 / Math.SQRT2 : Math.SQRT2;
  let { w, h } = fitSize(wrap, ratio);
  resizeCanvas(w, h);
}

function updateImgSample() {
  if (!img) return;
  imgSample = createImage(width, height);
  imgSample.copy(img, 0, 0, img.width, img.height, 0, 0, width, height);
  imgSample.loadPixels();
}

function draw() {
  // background(0);
  if (imgSample) drawOverlay();
}

function drawOverlay() {
  let threshold = sliderVal("sliderA");
  let density = sliderVal("sliderB");
  let densityFactor = 1 + density / 20;
  cols = round(15 * densityFactor);
  rows = round(20 * densityFactor);
  let cellW = width / cols;
  let cellH = height / rows;

  // noStroke();

  for (let gx = 0; gx < cols; gx++) {
    for (let gy = 0; gy < rows; gy++) {
      let startX = floor(gx * cellW);
      let endX = floor((gx + 1) * cellW);
      let startY = floor(gy * cellH);
      let endY = floor((gy + 1) * cellH);

      let brightnessValues = [];

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          let idx = (x + y * imgSample.width) * 4;
          let r = imgSample.pixels[idx + 0];
          let g = imgSample.pixels[idx + 1];
          let b = imgSample.pixels[idx + 2];
          let bn = 0.299 * r + 0.587 * g + 0.114 * b;
          brightnessValues.push(bn);
        }
      }

      brightnessValues.sort((a, b) => a - b);
      let mid = floor(brightnessValues.length / 2);
      let median =
        brightnessValues.length % 2 === 0
          ? (brightnessValues[mid - 1] + brightnessValues[mid]) / 2
          : brightnessValues[mid];

      if (median < threshold) {
        stroke(0);
        fill(255);
        rect(startX, startY, endX - startX, endY - startY);
        textSize(15);
        noStroke();
        fill(0);
        textAlign(LEFT, TOP);
        text("1", startX, startY);
      } else {
        fill(0, 0, 0);
      }
    }
  }
}

function sliderVal(id) {
  return parseInt(document.getElementById(id).value);
}


function save(){
  saveCanvas("pixelSort_Grid", "png")
}