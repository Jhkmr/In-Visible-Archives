let cols = 15;
let rows = 13;
let isPortrait = true;

let cellW;
let cellH;

let gridX = 10;
let gridY = 10;


function updateGridMetrics() {
  cellW = (width - gridX * 2) / cols;
  cellH = (height - gridY * 2) / rows;
}

let showImage = true;
let canvasBgColor = "#ffffff";

const DOT_FILL_MODES = ["outline", "fill"];
let dotFillMode = "fill"; // 'outline' | 'fill'

const SLANT_MODES = ["regular", "slanted", "backslanted"];
const SLANT_ANGLES = { regular: 0, slanted: -30, backslanted: 30 };
let slantMode = "regular"; // 'regular' | 'slanted' | 'backslanted'

let areaInverse = true; // false = inside contour (default), true = outside contour / inside crop rect

let layoutMode = "progression"; // 'base' | 'progression' | 'notes' | 'combination' | 'headlines'
let progressionRegionIndex = -1;

// Combination modes
const COMBINATION_LAYER_PERMUTATIONS = [
  ["progression", "notes", "headlines"],
  ["progression", "headlines", "notes"],
  ["notes", "progression", "headlines"],
  ["notes", "headlines", "progression"],
  ["headlines", "progression", "notes"],
  ["headlines", "notes", "progression"],
];
const COMBINATION_LAYER_LABELS = { progression: "Progression", notes: "Notes", headlines: "Headlines" };
let combinationLayerOrderIndex = 0;
let combinationShowGrid = true;
const BLEND_MODE_NAMES = [
  "BLEND", "DARKEST", "MULTIPLY", "LIGHTEST", "SCREEN", "OVERLAY",
  "HARD_LIGHT", "SOFT_LIGHT", "DODGE", "BURN", "DIFFERENCE", "EXCLUSION",
  "ADD", "SUBTRACT", "DIVIDE",
];

// Blend modes
const BLEND_MODE_CONSTANTS = {
  BLEND: "source-over",
  DARKEST: "darken",
  MULTIPLY: "multiply",
  LIGHTEST: "lighten",
  SCREEN: "screen",
  OVERLAY: "overlay",
  HARD_LIGHT: "hard-light",
  SOFT_LIGHT: "soft-light",
  DODGE: "color-dodge",
  BURN: "color-burn",
  DIFFERENCE: "difference",
  EXCLUSION: "exclusion",
  ADD: "lighter",
  SUBTRACT: "subtract",
};
let combinationBlendModeIndices = { progression: 0, notes: 0, headlines: 0 };
let combinationProgressionBuffer = null;
let combinationNotesBuffer = null;
let combinationHeadlinesBuffer = null;

// Notes mode
let noteImgSample = null;
let noteGradientMap = null;
let noteColEdges = [];
let noteRowEdges = [];
let noteLastCols = null,
  noteLastRows = null,
  noteLastCanvasW = null,
  noteLastCanvasH = null;

const NOTE_LINE_HIT_RADIUS = 8;
let noteDragTarget = null;

let noteTextSizePx = 12;
let noteLineHeightPx = noteTextSizePx * 0.8;
let noteWordSpacingPx = 0;
let noteTextColor = "#000000";
const NOTE_FONTS = ['"Archive Grotesk 500"', '"Archive Grotesk 500 Italic"', '"GT Canon Mono Medium"'];
const NOTE_FONT_LABELS = ["Default", "Italic", "Mono"];
let noteFontIndex = 0;

let noteRedCells = [];
const NOTE_REPEAT_MODES = ["off", "on", "new-cells"];
let noteRepeatMode = "on";

let noteDetectedRotations = [];
let noteRotationIndex = -1;

function updateRotationBtnLabel() {
  let el = document.getElementById("btnRotationToggle");
  if (!el) return;
  el.textContent =
    "Rotation: " +
    (noteRotationIndex === -1 ? "Off" : noteDetectedRotations[noteRotationIndex] + "°");
}

let noteCellRoll = [];
let noteCellRank = [];

let noteShowCrossPreview = true;
let noteGreyDotBuffer = null;

let noteTexts = [];

const NOTE_FALLBACK_CHARS = new Set(["ı", "◟", "/", "-", "?", "!"]);
const NOTE_FALLBACK_FONT = "sans-serif";

// Titles mode
let headlineTexts = [];
let headlineTextColor = "#000000";
const HEADLINE_FONTS = ['"Archive Grotesk 700"', '"Archive Grotesk 700 Italic"', '"GT Canon Mono Medium"'];
const HEADLINE_FONT_LABELS = ["Default", "Italic", "Mono"];
let headlineFontIndex = 0;
const HEADLINE_LINE_HEIGHT_MULT = 0.8;
const HEADLINE_MIN_FONT_PX = 4;
const HEADLINE_MAX_FONT_PX = 400;
const HEADLINE_SEARCH_ITERATIONS = 20;

let sourceImage = null;
let sourceImageName = "PvA3111";
let detectedRegions = [];
const ELEMENT_GAP = 20;
let ocrRunning = false;

// Contour cache
let lastPad = -1,
  lastPadY = -1,
  lastBlur = -1,
  lastThresh = -1;
let contoursDirty = true;
let contoursDebounceTimer = null;

// Dot-grid cache
let dotGridDirty = true;
let lastSpacing = -1, lastActiveSize = -1;
let cachedOutlineDots = [];
let cachedInverseDots = [];

// Dot render methods 4 shape editor
const DOT_RENDER_METHODS = [
  "push", "pop", "translate", "rotate", "scale", "shearX", "shearY",
  "angleMode", "stroke", "noStroke", "strokeWeight", "fill", "noFill",
  "rectMode", "rect", "ellipse", "circle", "line", "point", "triangle",
  "quad", "beginShape", "vertex", "endShape",
  // Color
  "colorMode", "color", "lerpColor", "red", "green", "blue", "alpha",
  "hue", "saturation", "brightness",
  // Math/utility
  "map", "constrain", "random", "noise", "dist", "lerp", "radians", "degrees",
];
let dotRenderBody = dotTemplates.length > 0 ? dotTemplates[0].code : "";
let dotRenderFn = null;
dotRenderFn = compileDotRenderFn(dotRenderBody);

let activeDotTemplateIndex = dotTemplates.length > 0 ? 0 : -1;

noteTexts.push(makeNoteText(""));

function splitNoteWords(str) {
  let words = [];
  let seps = [];
  let re = /(\s+)|(\S+)/g;
  let match;
  let pendingSep = "";
  while ((match = re.exec(str)) !== null) {
    if (match[1] !== undefined) {
      pendingSep = match[1];
    } else {
      words.push(match[2]);
      seps.push(words.length === 1 ? "" : pendingSep);
      pendingSep = "";
    }
  }
  return { words, seps };
}


function makeNoteText(str) {
  let { words, seps } = splitNoteWords(str);
  return { words, seps, assignedCells: [] };
}


function makeHeadlineText(str) {
  let { words, seps } = splitNoteWords(str);
  let noteCols = isPortrait ? 4 : 8;
  let noteRows = isPortrait ? 8 : 4;
  let span = {
    startRow: 1,
    startCol: 1,
    endRow: Math.max(1, Math.ceil(noteRows / 2)),
    endCol: Math.max(1, Math.ceil(noteCols / 2)),
  };
  return { words, seps, span };
}

function reassignNoteCellPartition() {
  for (let t of noteTexts) t.assignedCells = [];
  if (noteTexts.length === 0 || noteRedCells.length === 0) return;

  noteRedCells.forEach((cell, i) => {
    noteTexts[i % noteTexts.length].assignedCells.push(cell);
  });
}

function renderHeadlineTextList() {
  let listEl = document.getElementById("headlineTextList");
  if (!listEl) return;
  listEl.innerHTML = "";
  let noteCols = isPortrait ? 4 : 8;
  let noteRows = isPortrait ? 8 : 4;

  headlineTexts.forEach((t, i) => {
    let row = document.createElement("div");
    row.className = "headline-text-row";

    let label = document.createElement("span");
    let preview = t.words.join(" ");
    label.textContent = (i + 1) + "_" + (preview.length > 24 ? preview.slice(0, 24) + "…" : preview);
    label.className = "headline-text-label";
    row.appendChild(label);

    row.appendChild(makeHeadlineCounter("Start Row", t.span.startRow, () => {
      t.span.startRow = Math.min(t.span.startRow + 1, t.span.endRow);
      renderHeadlineTextList();
    }, () => {
      t.span.startRow = Math.max(t.span.startRow - 1, 1);
      renderHeadlineTextList();
    }));
    row.appendChild(makeHeadlineCounter("End Row", t.span.endRow, () => {
      t.span.endRow = Math.min(t.span.endRow + 1, noteRows);
      renderHeadlineTextList();
    }, () => {
      t.span.endRow = Math.max(t.span.endRow - 1, t.span.startRow);
      renderHeadlineTextList();
    }));
    row.appendChild(makeHeadlineCounter("Start Col", t.span.startCol, () => {
      t.span.startCol = Math.min(t.span.startCol + 1, t.span.endCol);
      renderHeadlineTextList();
    }, () => {
      t.span.startCol = Math.max(t.span.startCol - 1, 1);
      renderHeadlineTextList();
    }));
    row.appendChild(makeHeadlineCounter("End Col", t.span.endCol, () => {
      t.span.endCol = Math.min(t.span.endCol + 1, noteCols);
      renderHeadlineTextList();
    }, () => {
      t.span.endCol = Math.max(t.span.endCol - 1, t.span.startCol);
      renderHeadlineTextList();
    }));

    let removeBtn = document.createElement("button");
    removeBtn.textContent = "×";
    removeBtn.className = "headline-text-remove";
    removeBtn.addEventListener("click", () => {
      headlineTexts.splice(i, 1);
      renderHeadlineTextList();
    });
    row.appendChild(removeBtn);

    listEl.appendChild(row);
  });
}

function makeHeadlineCounter(labelText, value, onPlus, onMinus) {
  let counter = document.createElement("div");
  counter.className = "counter headline-counter";

  let label = document.createElement("span");
  label.textContent = labelText;
  counter.appendChild(label);

  let minusBtn = document.createElement("button");
  minusBtn.textContent = "−";
  minusBtn.addEventListener("click", onMinus);
  counter.appendChild(minusBtn);

  let valueEl = document.createElement("span");
  valueEl.textContent = value;
  valueEl.className = "headline-counter-value";
  counter.appendChild(valueEl);

  let plusBtn = document.createElement("button");
  plusBtn.textContent = "+";
  plusBtn.addEventListener("click", onPlus);
  counter.appendChild(plusBtn);

  return counter;
}

function compileDotRenderFn(body) {
  try {
    let methodParams = DOT_RENDER_METHODS.join(", ");
    let wrappedBody = `
      let { ${methodParams} } = target;
      ${DOT_RENDER_METHODS.map((m) => `${m} = ${m}.bind(target);`).join("\n")}
      ${body}
    `;
    return new Function("target", "dots", "inactiveDots", "activeSize", "spacing", "gridX", "gridY", wrappedBody);
  } catch (e) {
    console.error("Dot render snippet failed to compile:", e);
    return null;
  }
}

function renderDotTemplateList() {
  let listEl = document.getElementById("dotTemplateList");
  listEl.innerHTML = "";
  dotTemplates.forEach((tpl, i) => {
    let btn = document.createElement("button");
    btn.textContent = tpl.name;
    btn.classList.toggle("active", i === activeDotTemplateIndex);
    btn.addEventListener("click", () => applyDotTemplate(i));
    listEl.appendChild(btn);
  });
}

function applyDotTemplate(index) {
  let tpl = dotTemplates[index];
  if (!tpl) return;
  let compiled = compileDotRenderFn(tpl.code);
  if (!compiled) {
    alert(`Template "${tpl.name}" has an error — check the console.`);
    return;
  }
  dotRenderFn = compiled;
  dotRenderBody = tpl.code;
  dotGridDirty = true;
  activeDotTemplateIndex = index;
  document.getElementById("dotRenderEditor").value = tpl.code;
  renderDotTemplateList();
}

let ortSession = null;

function sliderVal(id) {
  return parseFloat(document.getElementById(id).value);
}

function preload() {
  document.getElementById("imagePreview").src = "media/PvA3111.jpg";
  loadImage("media/PvA3111.jpg", (img) => {
    sourceImage = img;
    window._p5SourceImageReady = true;
    if (window.cvReadyFlag) runDetect();
  });
}

function setup() {
  let canvasWrap = document.querySelector(".canvas-wrap");
  let { w, h } = fitSize(canvasWrap, isPortrait ? 1 / Math.SQRT2 : Math.SQRT2);
  let cnv = createCanvas(w, h);

  cnv.parent(canvasWrap);
  pixelDensity(2);
  textFont('"GT Canon Mono Medium"');
  updateGridMetrics();

  document.getElementById("btnLoad").addEventListener("click", triggerFileLoad);

  document.getElementById("btnClear").addEventListener("click", () => {
    detectedRegions.forEach((r) => {
      if (r.cropPg) r.cropPg.remove();
      if (r.maskedPg) r.maskedPg.remove();
      if (r.maskedStretchedPg) r.maskedStretchedPg.remove();
    });
    sourceImage = null;
    detectedRegions = [];
    contoursDirty = true;
    noteImgSample = null;
    noteGradientMap = null;
    noteLastCols = null;
    noteDetectedRotations = [];
    noteRotationIndex = -1;
    updateRotationBtnLabel();
  });

  document.getElementById("btnSave").addEventListener("click", saveImage);

  const orientationBtnEl = document.getElementById("btnOrientation");
  orientationBtnEl.addEventListener("click", () => {
    isPortrait = !isPortrait;
    orientationBtnEl.textContent =
      "Orientation: " + (isPortrait ? "Portrait" : "Landscape");
    applyCanvasSize();

    let noteCols = isPortrait ? 4 : 8;
    let noteRows = isPortrait ? 8 : 4;
    for (let t of headlineTexts) {
      t.span.startCol = Math.min(t.span.startCol, noteCols);
      t.span.endCol = Math.min(t.span.endCol, noteCols);
      t.span.startRow = Math.min(t.span.startRow, noteRows);
      t.span.endRow = Math.min(t.span.endRow, noteRows);
    }
    renderHeadlineTextList();
  });

  const dotRenderEditorEl = document.getElementById("dotRenderEditor");
  dotRenderEditorEl.value = dotRenderBody;
  document.getElementById("dotRenderUpdateBtn").addEventListener("click", () => {
    let newBody = dotRenderEditorEl.value;
    let compiled = compileDotRenderFn(newBody);
    if (compiled) {
      dotRenderFn = compiled;
      dotRenderBody = newBody;
      dotGridDirty = true;
      let matchedTemplate = dotTemplates.findIndex((t) => t.code === newBody);
      activeDotTemplateIndex = matchedTemplate;
      renderDotTemplateList();
    } else {
      alert("Dot render snippet has an error — check the console.");
    }
  });

  renderDotTemplateList();

  const tabEls = {
    base: document.getElementById("tabBase"),
    progression: document.getElementById("tabProgression"),
    notes: document.getElementById("tabNotes"),
    combination: document.getElementById("tabCombination"),
    headlines: document.getElementById("tabHeadlines"),
  };
  function setLayoutMode(mode) {
    layoutMode = mode;
    for (let m in tabEls) tabEls[m].classList.toggle("active", m === mode);
    applyModeVisibility();
    contoursDirty = true;
    updateNoteImgSample();
  }
  tabEls.base.addEventListener("click", () => setLayoutMode("base"));
  tabEls.progression.addEventListener("click", () => setLayoutMode("progression"));
  tabEls.notes.addEventListener("click", () => setLayoutMode("notes"));
  tabEls.combination.addEventListener("click", () => setLayoutMode("combination"));
  tabEls.headlines.addEventListener("click", () => setLayoutMode("headlines"));
  setLayoutMode(layoutMode);

  const imgBtnEl = document.getElementById("imgToggleBtn");
  imgBtnEl.addEventListener("click", () => {
    showImage = !showImage;
    imgBtnEl.textContent = "Image: " + (showImage ? "On" : "Off");
  });

  const dotFillBtnEl = document.getElementById("dotFillBtn");
  dotFillBtnEl.addEventListener("click", () => {
    let idx = (DOT_FILL_MODES.indexOf(dotFillMode) + 1) % DOT_FILL_MODES.length;
    dotFillMode = DOT_FILL_MODES[idx];
    dotFillBtnEl.textContent =
      "Dots: " + dotFillMode.charAt(0).toUpperCase() + dotFillMode.slice(1);
    dotGridDirty = true;
  });

  const areaModeBtnEl = document.getElementById("areaModeBtn");
  areaModeBtnEl.addEventListener("click", () => {
    areaInverse = !areaInverse;
    areaModeBtnEl.textContent = "Area: " + (areaInverse ? "Inverse" : "Default");
    contoursDirty = true;
    dotGridDirty = true;
  });

  const slantBtnEl = document.getElementById("slantBtn");
  slantBtnEl.addEventListener("click", () => {
    let idx = (SLANT_MODES.indexOf(slantMode) + 1) % SLANT_MODES.length;
    slantMode = SLANT_MODES[idx];
    slantBtnEl.textContent =
      "Slant: " + slantMode.charAt(0).toUpperCase() + slantMode.slice(1);
    dotGridDirty = true;
  });

  document.getElementById("randomizeWordBtn").addEventListener("click", () => {
    if (detectedRegions.length === 0) return;
    let next;
    do {
      next = Math.floor(Math.random() * detectedRegions.length);
    } while (next === progressionRegionIndex && detectedRegions.length > 1);
    progressionRegionIndex = next;
    contoursDirty = true;
  });

  document.getElementById("btnRandomizeCells").addEventListener("click", () => {
    randomizeNoteCells();
  });

  const repeatBtnEl = document.getElementById("btnRepeatToggle");
  const NOTE_REPEAT_LABELS = { off: "Off", "new-cells": "On", on: "Fill"};
  repeatBtnEl.addEventListener("click", () => {
    let idx = (NOTE_REPEAT_MODES.indexOf(noteRepeatMode) + 1) % NOTE_REPEAT_MODES.length;
    noteRepeatMode = NOTE_REPEAT_MODES[idx];
    repeatBtnEl.textContent = "Repeat: " + NOTE_REPEAT_LABELS[noteRepeatMode];
  });

  const rotationBtnEl = document.getElementById("btnRotationToggle");
  rotationBtnEl.addEventListener("click", () => {
    if (noteDetectedRotations.length === 0) return; 
    noteRotationIndex++;
    if (noteRotationIndex >= noteDetectedRotations.length) noteRotationIndex = -1;
    updateRotationBtnLabel();
  });

  const crossPreviewBtnEls = [
    document.getElementById("btnCrossPreviewProgression"),
    document.getElementById("btnCrossPreviewNotes"),
    document.getElementById("btnCrossPreviewHeadlines"),
  ];
  crossPreviewBtnEls.forEach((btn) => {
    btn.addEventListener("click", () => {
      noteShowCrossPreview = !noteShowCrossPreview;
      let label = "Preview: " + (noteShowCrossPreview ? "On" : "Off");
      crossPreviewBtnEls.forEach((b) => (b.textContent = label));
    });
  });

  const combinationSwapBtnEl = document.getElementById("btnCombinationSwap");
  function updateCombinationSwapLabel() {
    let order = COMBINATION_LAYER_PERMUTATIONS[combinationLayerOrderIndex];
    combinationSwapBtnEl.textContent =
      "Order: " + order.map((name) => COMBINATION_LAYER_LABELS[name]).join(" / ");
  }
  combinationSwapBtnEl.addEventListener("click", () => {
    combinationLayerOrderIndex = (combinationLayerOrderIndex + 1) % COMBINATION_LAYER_PERMUTATIONS.length;
    updateCombinationSwapLabel();
  });

  const BLEND_MODE_LABELS = {
    BLEND: "Normal", DARKEST: "Darken", MULTIPLY: "Multiply", LIGHTEST: "Lighten",
    SCREEN: "Screen", OVERLAY: "Overlay", HARD_LIGHT: "Hard Light", SOFT_LIGHT: "Soft Light",
    DODGE: "Dodge", BURN: "Burn", DIFFERENCE: "Difference", EXCLUSION: "Exclusion",
    ADD: "Add", SUBTRACT: "Subtract", DIVIDE: "Divide",
  };
  const combinationBlendBtnEls = {
    progression: document.getElementById("btnCombinationBlendProgression"),
    notes: document.getElementById("btnCombinationBlendNotes"),
    headlines: document.getElementById("btnCombinationBlendHeadlines"),
  };
  for (let layerName in combinationBlendBtnEls) {
    let btn = combinationBlendBtnEls[layerName];
    let label = COMBINATION_LAYER_LABELS[layerName];
    btn.addEventListener("click", () => {
      combinationBlendModeIndices[layerName] =
        (combinationBlendModeIndices[layerName] + 1) % BLEND_MODE_NAMES.length;
      btn.textContent =
        "Blend " + label + ": " + BLEND_MODE_LABELS[BLEND_MODE_NAMES[combinationBlendModeIndices[layerName]]];
    });
  }

  const combinationGridToggleBtnEl = document.getElementById("btnCombinationGridToggle");
  combinationGridToggleBtnEl.addEventListener("click", () => {
    combinationShowGrid = !combinationShowGrid;
    combinationGridToggleBtnEl.textContent = "Grid: " + (combinationShowGrid ? "On" : "Off");
  });

  const canvasBgColorInputEl = document.getElementById("canvasBgColorInput");
  canvasBgColorInputEl.addEventListener("input", () => {
    let val = canvasBgColorInputEl.value.trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val)) {
      canvasBgColor = val;
    }
  });

  const noteTextColorInputEl = document.getElementById("noteTextColorInput");
  noteTextColorInputEl.addEventListener("input", () => {
    let val = noteTextColorInputEl.value.trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val)) {
      noteTextColor = val;
    }
  });

  const headlineTextColorInputEl = document.getElementById("headlineTextColorInput");
  headlineTextColorInputEl.addEventListener("input", () => {
    let val = headlineTextColorInputEl.value.trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val)) {
      headlineTextColor = val;
    }
  });

  const noteFontBtnEl = document.getElementById("noteFontBtn");
  noteFontBtnEl.addEventListener("click", () => {
    noteFontIndex = (noteFontIndex + 1) % NOTE_FONTS.length;
    noteFontBtnEl.textContent = "Font: " + NOTE_FONT_LABELS[noteFontIndex];
  });

  const headlineFontBtnEl = document.getElementById("headlineFontBtn");
  headlineFontBtnEl.addEventListener("click", () => {
    headlineFontIndex = (headlineFontIndex + 1) % HEADLINE_FONTS.length;
    headlineFontBtnEl.textContent = "Font: " + HEADLINE_FONT_LABELS[headlineFontIndex];
  });

  document.getElementById("btnOverrideText").addEventListener("click", () => {
    let typed = document.getElementById("textInput").value;
    if (typed.trim().length > 0) {
      noteTexts = [makeNoteText(typed)];
      reassignNoteCellPartition();
    }
  });

  document.getElementById("btnAddText").addEventListener("click", () => {
    let textInputEl = document.getElementById("textInput");
    let typed = textInputEl.value;
    if (typed.trim().length > 0) {
      noteTexts.push(makeNoteText(typed));
      reassignNoteCellPartition();
      textInputEl.value = "";
    }
  });

  document.getElementById("btnHeadlineOverrideText").addEventListener("click", () => {
    let typed = document.getElementById("headlineTextInput").value;
    if (typed.trim().length > 0) {
      headlineTexts = [makeHeadlineText(typed)];
      renderHeadlineTextList();
    }
  });

  document.getElementById("btnHeadlineAddText").addEventListener("click", () => {
    let headlineTextInputEl = document.getElementById("headlineTextInput");
    let typed = headlineTextInputEl.value;
    if (typed.trim().length > 0) {
      headlineTexts.push(makeHeadlineText(typed));
      renderHeadlineTextList();
      headlineTextInputEl.value = "";
    }
  });

  renderHeadlineTextList();

}

// Tab visibility
function applyModeVisibility() {
  let sliderRowN = 0;
  document.querySelectorAll("[data-mode]").forEach((el) => {
    let modes = el.dataset.mode.split(" ");
    let active = modes.includes(layoutMode);
    let shownDisplay = el.classList.contains("slider-row")
      ? "grid"
      : el.classList.contains("group--editable")
      ? "grid"
      : el.classList.contains("group")
      ? "flex"
      : "inline";
    if (el.id === "shapeEditorGroup") {
      el.style.display = shownDisplay;
      el.style.visibility = active ? "visible" : "hidden";
    } else {
      el.style.display = active ? shownDisplay : "none";
    }
    if (el.classList.contains("slider-row") && active) {
      sliderRowN += 1;
      el.style.gridRow = sliderRowN;
    }
  });
}

// Notes mode

function updateNoteImgSample() {
  if (!sourceImage) {
    noteImgSample = null;
    return;
  }
  noteImgSample = createImage(width, height);
  noteImgSample.copy(sourceImage, 0, 0, sourceImage.width, sourceImage.height, 0, 0, width, height);
  noteImgSample.loadPixels();
  noteGradientMap = null;
  if (noteCellRoll.length === 0) randomizeNoteCells();
  recomputeNoteRedCells();
}


function randomizeNoteCells() {
  let maxCols = 8, maxRows = 8;
  noteCellRoll = [];
  noteCellRank = [];
  for (let gy = 0; gy < maxRows; gy++) {
    let rollRow = [], rankRow = [];
    for (let gx = 0; gx < maxCols; gx++) {
      rollRow.push(random());
      rankRow.push(random());
    }
    noteCellRoll.push(rollRow);
    noteCellRank.push(rankRow);
  }
  recomputeNoteRedCells();
}

function recomputeNoteRedCells() {
  let c = isPortrait ? 4 : 8;
  let r = isPortrait ? 8 : 4;
  let density = sliderVal("noteDensity") / 100;

  let candidates = [];
  for (let gy = 0; gy < r; gy++) {
    for (let gx = 0; gx < c; gx++) {
      if (noteCellRoll[gy][gx] < density) {
        candidates.push({ gx, gy, rank: noteCellRank[gy][gx] });
      }
    }
  }
  candidates.sort((a, b) => a.rank - b.rank);
  noteRedCells = candidates.map(({ gx, gy }) => ({ gx, gy }));
  reassignNoteCellPartition();
}

function ensureNoteGridEdges() {
  let noteCols = isPortrait ? 4 : 8;
  let noteRows = isPortrait ? 8 : 4;

  let gridChanged =
    noteCols !== noteLastCols ||
    noteRows !== noteLastRows ||
    width !== noteLastCanvasW ||
    height !== noteLastCanvasH;
  if (gridChanged || !noteColEdges.length || !noteRowEdges.length) {
    if (noteImgSample) computeNoteGradientMap();
    computeNoteColumnEdges(noteCols);
    computeNoteRowEdges(noteRows);
    noteLastCols = noteCols;
    noteLastRows = noteRows;
    noteLastCanvasW = width;
    noteLastCanvasH = height;
  }

  if (noteCellRoll.length > 0) recomputeNoteRedCells();
}

function drawNoteGridLight() {
  ensureNoteGridEdges();

  let noteCols = isPortrait ? 4 : 8;
  let noteRows = isPortrait ? 8 : 4;

  stroke(200);
  strokeWeight(0.5);
  noFill();
  for (let gx = 0; gx <= noteCols; gx++) {
    line(noteColEdges[gx], 0, noteColEdges[gx], height);
  }
  for (let gy = 0; gy <= noteRows; gy++) {
    line(0, noteRowEdges[gy], width, noteRowEdges[gy]);
  }
}

function drawNotesTextContent(grey) {
  if (!noteImgSample) return;
  ensureNoteGridEdges();

  let noteCols = isPortrait ? 4 : 8;
  let noteRows = isPortrait ? 8 : 4;

  noteTextSizePx = sliderVal("noteTextSize");
  noteLineHeightPx = noteTextSizePx * sliderVal("noteLineHeight");
  noteWordSpacingPx = sliderVal("noteWordSpacing");

  if (grey) {
    fill(0, 0, 0, 100);
  } else {
    fill(noteTextColor);
  }
  noStroke();
  let activeRotation = noteRotationIndex === -1 ? 0 : noteDetectedRotations[noteRotationIndex];
  for (let placed of layoutNoteText(noteCols, noteRows)) {
    if (activeRotation !== 0) {
      push();
      angleMode(RADIANS);
      translate(placed.cx, placed.cy);
      rotate(radians(activeRotation));
      translate(-placed.cx, -placed.cy);
      drawNoteLineWithFallback(window, placed.words, placed.x, placed.y, undefined, NOTE_FONTS[noteFontIndex]);
      pop();
    } else {
      drawNoteLineWithFallback(window, placed.words, placed.x, placed.y, undefined, NOTE_FONTS[noteFontIndex]);
    }
  }
}

function drawNotesTextContentToTarget(target, fillColor) {
  if (!noteImgSample) return;
  ensureNoteGridEdges();

  let noteCols = isPortrait ? 4 : 8;
  let noteRows = isPortrait ? 8 : 4;

  noteTextSizePx = sliderVal("noteTextSize");
  noteLineHeightPx = noteTextSizePx * sliderVal("noteLineHeight");
  noteWordSpacingPx = sliderVal("noteWordSpacing");

  target.fill(fillColor);
  target.noStroke();
  let activeRotation = noteRotationIndex === -1 ? 0 : noteDetectedRotations[noteRotationIndex];
  for (let placed of layoutNoteText(noteCols, noteRows)) {
    if (activeRotation !== 0) {
      target.push();
      target.angleMode(RADIANS);
      target.translate(placed.cx, placed.cy);
      target.rotate(radians(activeRotation));
      target.translate(-placed.cx, -placed.cy);
      drawNoteLineWithFallback(target, placed.words, placed.x, placed.y, undefined, NOTE_FONTS[noteFontIndex]);
      target.pop();
    } else {
      drawNoteLineWithFallback(target, placed.words, placed.x, placed.y, undefined, NOTE_FONTS[noteFontIndex]);
    }
  }
}

function drawNotesOverlay(gw, gh) {
  background(canvasBgColor);
  if (noteShowCrossPreview && sourceImage) drawProgressionContent(gw, gh, true);
  if (noteShowCrossPreview) drawHeadlinesTextContent(true);
  if (!noteImgSample) return;
  ensureNoteGridEdges();

  let noteCols = isPortrait ? 4 : 8;
  let noteRows = isPortrait ? 8 : 4;

  noStroke();
  noFill();
  for (let cell of noteRedCells) {
    let x0 = noteColEdges[cell.gx];
    let x1 = noteColEdges[cell.gx + 1];
    let y0 = noteRowEdges[cell.gy];
    let y1 = noteRowEdges[cell.gy + 1];
    rect(x0, y0, x1 - x0, y1 - y0);
  }

  stroke(noteTextColor);
  let midGx = noteCols / 2;
  let midGy = noteRows / 2;
  for (let gx = 1; gx < noteCols; gx++) {
    strokeWeight(gx === midGx ? 2 : 0.75);
    line(noteColEdges[gx], 0, noteColEdges[gx], height);
  }
  for (let gy = 1; gy < noteRows; gy++) {
    strokeWeight(gy === midGy ? 2 : 0.75);
    line(0, noteRowEdges[gy], width, noteRowEdges[gy]);
  }

  drawNotesTextContent(false);
}

function layoutNoteText() {
  if (noteRedCells.length === 0 || noteTexts.length === 0) return [];

  textFont(NOTE_FONTS[noteFontIndex]);
  textSize(noteTextSizePx);
  let placed = [];

  for (let t of noteTexts) {
    if (t.words.length === 0 || t.assignedCells.length === 0) continue;
    placed.push(...layoutSingleNoteText(t));
  }

  return placed;
}

function layoutSingleNoteText(t) {
  let order = t.assignedCells;

  let placed = [];
  let wordCursor = 0;

  outer:
  for (let cell of order) {
    let x0 = noteColEdges[cell.gx] + 4;
    let x1 = noteColEdges[cell.gx + 1] - 4;
    let y0 = noteRowEdges[cell.gy] + noteTextSizePx;
    let y1 = noteRowEdges[cell.gy + 1];
    let boxW = x1 - x0;
    let cx = (noteColEdges[cell.gx] + noteColEdges[cell.gx + 1]) / 2;
    let cy = (noteRowEdges[cell.gy] + noteRowEdges[cell.gy + 1]) / 2;

    if (noteRepeatMode === "new-cells" && wordCursor >= t.words.length) {
      wordCursor = 0;
    }

    let y = y0;
    while (y <= y1) {
      let lineWords = []; // [{ word, sep }], sep = whitespace run before this word ("" for line-initial)
      let lineText = "";
      let i = wordCursor;
      let usedAny = false;
      while (true) {
        if (noteRepeatMode !== "on" && i >= t.words.length) break;
        let word = t.words[i % t.words.length];
        let sep = lineWords.length === 0 ? "" : t.seps[i % t.seps.length] || " ";
        let candidateText = lineText + sep + word;
        let candidateWidth =
          textWidth(candidateText) + lineWords.length * noteWordSpacingPx;
        if (candidateWidth <= boxW) {
          lineWords.push({ word, sep });
          lineText = candidateText;
          i++;
          usedAny = true;
        } else {
          break;
        }
      }
      if (!usedAny) break;
      placed.push({ x: x0, y: y, words: lineWords, cx, cy });
      wordCursor = i;
      if (noteRepeatMode === "off" && wordCursor >= t.words.length) break outer;
      if (noteRepeatMode === "new-cells" && wordCursor >= t.words.length) break;
      y += noteLineHeightPx;
    }
  }

  return placed;
}

// Headlines mode

function wrapHeadlineWords(t, size, boxW) {
  textSize(size);
  let lines = [];
  let i = 0;
  while (i < t.words.length) {
    let lineWords = [];
    let lineText = "";
    let usedAny = false;
    while (i < t.words.length) {
      let word = t.words[i];
      let sep = lineWords.length === 0 ? "" : (t.seps[i] || " ");
      let candidateText = lineText + sep + word;
      let candidateWidth = textWidth(candidateText);
      if (candidateWidth <= boxW || !usedAny) {
        lineWords.push({ word, sep });
        lineText = candidateText;
        i++;
        usedAny = true;
      } else {
        break;
      }
    }
    lines.push(lineWords);
  }
  return lines;
}


function fitHeadlineTextToBox(t, boxW, boxH) {
  let lo = HEADLINE_MIN_FONT_PX;
  let hi = HEADLINE_MAX_FONT_PX;
  let bestSize = lo;
  let bestLines = wrapHeadlineWords(t, lo, boxW);

  for (let i = 0; i < HEADLINE_SEARCH_ITERATIONS; i++) {
    let mid = (lo + hi) / 2;
    let lines = wrapHeadlineWords(t, mid, boxW);
    let lineHeight = mid * HEADLINE_LINE_HEIGHT_MULT;
    let blockH = lines.length * lineHeight;
    let fits = lines.length > 0 && blockH <= boxH;
    if (fits) {
      bestSize = mid;
      bestLines = lines;
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi - lo < 0.5) break;
  }

  return { fontSize: bestSize, lines: bestLines };
}

function layoutHeadlineText() {
  if (headlineTexts.length === 0) return [];
  textFont(HEADLINE_FONTS[headlineFontIndex]);
  let placed = [];
  for (let t of headlineTexts) {
    if (t.words.length === 0) continue;
    placed.push(...layoutSingleHeadlineText(t));
  }
  return placed;
}

function measureHeadlineInkBounds(lines, baselineYs) {
  let ctx = drawingContext;
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (let i = 0; i < lines.length; i++) {
    let lineText = lines[i].map((lw) => lw.sep + lw.word).join("");
    if (lineText.length === 0) continue;
    let m = ctx.measureText(lineText);
    let baseY = baselineYs[i];
    left = Math.min(left, -m.actualBoundingBoxLeft);
    right = Math.max(right, m.actualBoundingBoxRight);
    top = Math.min(top, baseY - m.actualBoundingBoxAscent);
    bottom = Math.max(bottom, baseY + m.actualBoundingBoxDescent);
  }
  if (!isFinite(left)) return { left: 0, right: 0, top: 0, bottom: 0, w: 0, h: 0 };
  return { left, right, top, bottom, w: right - left, h: bottom - top };
}

function layoutSingleHeadlineText(t) {
  let { startRow, startCol, endRow, endCol } = t.span;
  let x0 = noteColEdges[startCol - 1] + 4;
  let x1 = noteColEdges[endCol] - 4;
  let y0 = noteRowEdges[startRow - 1];
  let y1 = noteRowEdges[endRow];
  let boxW = x1 - x0;
  let boxH = y1 - y0;
  if (boxW <= 0 || boxH <= 0) return [];

  let sig = t.words.join(" ") + "|" + startRow + "," + startCol + "," + endRow + "," + endCol + "|" + boxW + "," + boxH;
  let fontSize, lines;
  if (t._headlineFitCache && t._headlineFitCache.sig === sig) {
    ({ fontSize, lines } = t._headlineFitCache);
  } else {
    ({ fontSize, lines } = fitHeadlineTextToBox(t, boxW, boxH));
    t._headlineFitCache = { sig, fontSize, lines };
  }
  let lineHeight = fontSize * HEADLINE_LINE_HEIGHT_MULT;

  textSize(fontSize);
  textFont(HEADLINE_FONTS[headlineFontIndex]);
  textAlign(LEFT, BASELINE);
  let baselineYs = lines.map((_, i) => fontSize + i * lineHeight);
  let ink = measureHeadlineInkBounds(lines, baselineYs);

  let scaleX = ink.w > 0 ? boxW / ink.w : 1;
  let scaleY = ink.h > 0 ? boxH / ink.h : 1;

  let placed = [];
  for (let i = 0; i < lines.length; i++) {
    let x = (x0 - ink.left * scaleX) / scaleX;
    let y = (y0 + (baselineYs[i] - ink.top) * scaleY) / scaleY;
    placed.push({ x, y, words: lines[i], fontSize, scaleX, scaleY });
  }
  return placed;
}

function drawHeadlinesTextContent(grey) {
  ensureNoteGridEdges();
  if (grey) {
    fill(0, 0, 0, 100);
  } else {
    fill(headlineTextColor);
  }
  noStroke();
  for (let placed of layoutHeadlineText()) {
    push();
    scale(placed.scaleX, placed.scaleY);
    drawNoteLineWithFallback(window, placed.words, placed.x, placed.y, placed.fontSize, HEADLINE_FONTS[headlineFontIndex]);
    pop();
  }
}

function drawHeadlinesTextContentToTarget(target, fillColor) {
  ensureNoteGridEdges();
  target.fill(fillColor);
  target.noStroke();
  for (let placed of layoutHeadlineText()) {
    target.push();
    target.scale(placed.scaleX, placed.scaleY);
    drawNoteLineWithFallback(target, placed.words, placed.x, placed.y, placed.fontSize, HEADLINE_FONTS[headlineFontIndex]);
    target.pop();
  }
}

function drawHeadlinesOverlay(gw, gh) {
  background(canvasBgColor);
  if (combinationShowGrid) drawNoteGridLight();
  if (noteShowCrossPreview && sourceImage) {
    drawProgressionContent(gw, gh, true);
    drawNotesTextContent(true);
  }
  drawHeadlinesTextContent(false);
}

function findNoteLineAt(mx, my) {
  let noteCols = isPortrait ? 4 : 8;
  let noteRows = isPortrait ? 8 : 4;
  for (let gx = 1; gx < noteCols; gx++) {
    if (abs(mx - noteColEdges[gx]) <= NOTE_LINE_HIT_RADIUS) return { axis: "col", index: gx };
  }
  for (let gy = 1; gy < noteRows; gy++) {
    if (abs(my - noteRowEdges[gy]) <= NOTE_LINE_HIT_RADIUS) return { axis: "row", index: gy };
  }
  return null;
}

function drawNoteLineWithFallback(target, wordsInLine, x, y, fontSizeOverride, fontFamily = NOTE_FONTS[0]) {
  let cursor = x;
  target.textFont(fontFamily);
  target.textSize(fontSizeOverride !== undefined ? fontSizeOverride : noteTextSizePx);
  target.textAlign(LEFT, BASELINE);
  for (let { word, sep } of wordsInLine) {
    if (sep.length > 0) cursor += target.textWidth(sep) + noteWordSpacingPx;
    for (let ch of word) {
      let cw = target.textWidth(ch);
      if (NOTE_FALLBACK_CHARS.has(ch)) {
        target.textFont(NOTE_FALLBACK_FONT);
        target.textStyle(BOLD);
        target.text(ch, cursor, y);
        target.textFont(fontFamily);
        target.textStyle(NORMAL);
      } else {
        target.text(ch, cursor, y);
      }
      cursor += cw;
    }
  }
}

function computeNoteGradientMap() {
  if (!noteImgSample) return;
  noteImgSample.loadPixels();
  let w = noteImgSample.width;
  let h = noteImgSample.height;
  let pixels = noteImgSample.pixels;

  let luma = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let idx = (x + y * w) * 4;
      luma[x + y * w] =
        0.299 * pixels[idx + 0] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
    }
  }

  noteGradientMap = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let here = luma[x + y * w];
      let dx = x + 1 < w ? abs(luma[x + 1 + y * w] - here) : 0;
      let dy = y + 1 < h ? abs(luma[x + (y + 1) * w] - here) : 0;
      noteGradientMap[x + y * w] = dx + dy;
    }
  }
}

function noteEqualMassCuts(weights, length, count) {
  let total = 0;
  for (let i = 0; i < length; i++) total += weights[i];

  let edges = [0];
  if (total <= 0) {
    for (let i = 1; i < count; i++) edges.push(round((length * i) / count));
    edges.push(length);
    return edges;
  }

  let target = total / count;
  let cumulative = 0;
  let nextTarget = target;
  for (let i = 0; i < length && edges.length < count; i++) {
    cumulative += weights[i];
    if (cumulative >= nextTarget) {
      edges.push(i + 1);
      nextTarget += target;
    }
  }
  while (edges.length < count) edges.push(length);
  edges.push(length);
  return edges;
}

function computeNoteColumnEdges(noteCols) {
  if (!noteGradientMap || !noteImgSample) {
    noteColEdges = [];
    for (let i = 0; i <= noteCols; i++) noteColEdges.push(round((width * i) / noteCols));
    return;
  }
  let w = noteImgSample.width;
  let h = noteImgSample.height;
  let colWeight = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = 0; y < h; y++) sum += noteGradientMap[x + y * w];
    colWeight[x] = sum;
  }
  let edgesInImgSpace = noteEqualMassCuts(colWeight, w, noteCols);
  noteColEdges = edgesInImgSpace.map((x) => (x / w) * width);
}

function computeNoteRowEdges(noteRows) {
  if (!noteGradientMap || !noteImgSample) {
    noteRowEdges = [];
    for (let i = 0; i <= noteRows; i++) noteRowEdges.push(round((height * i) / noteRows));
    return;
  }
  let w = noteImgSample.width;
  let h = noteImgSample.height;
  let rowWeight = new Float32Array(h);
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = 0; x < w; x++) sum += noteGradientMap[x + y * w];
    rowWeight[y] = sum;
  }
  let edgesInImgSpace = noteEqualMassCuts(rowWeight, h, noteRows);
  noteRowEdges = edgesInImgSpace.map((y) => (y / h) * height);
}

function noteGridDraggable() {
  return layoutMode === "notes" ? !!noteImgSample : layoutMode === "headlines";
}

function mousePressed() {
  if (!noteGridDraggable()) return;
  let hit = findNoteLineAt(mouseX, mouseY);
  if (hit) noteDragTarget = hit;
}

function mouseDragged() {
  if (!noteGridDraggable() || !noteDragTarget) return;
  if (noteDragTarget.axis === "col") {
    let minX = noteColEdges[noteDragTarget.index - 1] + 1;
    let maxX = noteColEdges[noteDragTarget.index + 1] - 1;
    noteColEdges[noteDragTarget.index] = constrain(mouseX, minX, maxX);
  } else {
    let minY = noteRowEdges[noteDragTarget.index - 1] + 1;
    let maxY = noteRowEdges[noteDragTarget.index + 1] - 1;
    noteRowEdges[noteDragTarget.index] = constrain(mouseY, minY, maxY);
  }
}

function mouseReleased() {
  noteDragTarget = null;
}

function mouseMoved() {
  let cnv = document.querySelector(".canvas-wrap canvas");
  if (!noteGridDraggable()) {
    if (cnv) cnv.style.cursor = "default";
    return;
  }
  let hit = findNoteLineAt(mouseX, mouseY);
  if (cnv) cnv.style.cursor = hit ? (hit.axis === "col" ? "ew-resize" : "ns-resize") : "default";
}

let resizeDebounceTimer = null;

function windowResized() {
  applyCanvasSize({ rebuildContours: false });
  clearTimeout(resizeDebounceTimer);
  resizeDebounceTimer = setTimeout(() => {
    contoursDirty = true;
  }, 150);
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

function applyCanvasSize({ rebuildContours = true } = {}) {
  let canvasWrap = document.querySelector(".canvas-wrap");
  let { w, h } = fitSize(canvasWrap, isPortrait ? 1 / Math.SQRT2 : Math.SQRT2);
  resizeCanvas(w, h);
  updateGridMetrics();
  dotGridDirty = true;
  if (rebuildContours) contoursDirty = true;
  updateNoteImgSample();
}

function ensureRegionsUpToDate(gw, gh) {
  if (!(contoursDirty && window.cvReadyFlag)) return;
  contoursDirty = false;
  dotGridDirty = true;

  let padX = sliderVal("padSliderX");
  let padY = sliderVal("padSliderY");
  let blurRaw = sliderVal("blurSlider");
  let blurK = blurRaw % 2 === 0 ? blurRaw + 1 : blurRaw;
  let thresh = sliderVal("threshSlider");

  for (let r of detectedRegions) {
    if (r.cropPg) r.cropPg.remove();
    if (r.maskedPg) r.maskedPg.remove();
    r.cropPg = buildCrop(r, padX, padY, gw * CONTOUR_SCALE, gh * CONTOUR_SCALE);
    r.contours = extractContours(r.cropPg, blurK, thresh);
    r.maskedPg = buildMasked(r.cropPg, r.contours);
  }
  layoutRegions(gh);
  pickProgressionRegion();

  for (let r of detectedRegions) {
    if (r.maskedStretchedPg) {
      r.maskedStretchedPg.remove();
      r.maskedStretchedPg = null;
    }
  }
  let pr = detectedRegions[progressionRegionIndex];
  if (pr && pr.cropPg) {
    pr.maskedStretchedPg = buildMaskedStretched(pr.cropPg, pr.contours, gw, gh);
  }
}

function draw() {
  let gw = cols * cellW;
  let gh = rows * cellH;

  if (layoutMode === "notes") {
    if (sourceImage) ensureRegionsUpToDate(gw, gh);
    drawNotesOverlay(gw, gh);
    return;
  }

  if (layoutMode === "combination") {
    if (sourceImage) ensureRegionsUpToDate(gw, gh);
    drawCombinationContent(gw, gh);
    return;
  }

  if (layoutMode === "headlines") {
    drawHeadlinesOverlay(gw, gh);
    return;
  }

  background(canvasBgColor);
  if (combinationShowGrid) drawNoteGridLight();

  let pv = sliderVal("padSliderX"),
    pvY = sliderVal("padSliderY"),
    bv = sliderVal("blurSlider"),
    tv = sliderVal("threshSlider");
  if (
    pv !== lastPad ||
    pvY !== lastPadY ||
    bv !== lastBlur ||
    tv !== lastThresh
  ) {
    lastPad = pv;
    lastPadY = pvY;
    lastBlur = bv;
    lastThresh = tv;
    clearTimeout(contoursDebounceTimer);
    contoursDebounceTimer = setTimeout(() => {
      contoursDirty = true;
    }, 150);
  }

  if (layoutMode === "progression") {
    let sv = sliderVal("dotSpacingSlider"), av = sliderVal("activeDotSizeSlider");
    if (sv !== lastSpacing || av !== lastActiveSize) {
      lastSpacing = sv;
      lastActiveSize = av;
      dotGridDirty = true;
    }
  }

  if (ocrRunning) {
    fill(0);
    noStroke();
    textSize(13);
    textAlign(LEFT, TOP);
    text("Running detection…", 0, gridY);
    return;
  }

  if (sourceImage) {
    ensureRegionsUpToDate(gw, gh);

    if (layoutMode === "progression" && noteShowCrossPreview) {
      drawNotesTextContent(true);
      drawHeadlinesTextContent(true);
    }
    if (layoutMode === "base") {
      drawBaseContent();
    } else {
      drawProgressionContent(gw, gh, false);
    }
  }
}

// Draws Base mode's stacked-region visual
function drawBaseContent() {
  for (let r of detectedRegions) {
    if (!r.pos) continue;
    let cx = r.pos.x,
        cy = r.pos.y;
    let stackScale = r.pos.scale || 1;

    push();
    translate(cx, cy);
    scale(stackScale);

    if (showImage && r.maskedPg) {
      imageMode(CENTER);
      image(r.maskedPg, 0, 0);
    }

    noFill();
    stroke(0);
    strokeWeight(1);
    rectMode(CENTER);
    rect(0, 0, r.cropPg ? r.cropPg.width : 1, r.cropPg ? r.cropPg.height : 1);

    if (r.contours && r.contours.length > 0) {
      stroke(0);
      strokeWeight(1);
      noFill();
      for (let pts of r.contours) {
        beginShape();
        for (let p of pts) vertex(p.x, p.y);
        endShape(CLOSE);
      }
    }

    noStroke();
    fill(0, 0, 0);
    textSize(9 / stackScale);
    textAlign(LEFT, BOTTOM);
    let ubw = r.cropPg ? r.cropPg.width : 1;
    let ubh = r.cropPg ? r.cropPg.height : 1;
    text(nf(r.angle, 1, 1) + "°", ubw / 2 + 2, ubh / 2 - 2);

    pop();
  }
}

function drawProgressionContent(gw, gh, grey, target = window) {
  if (progressionRegionIndex < 0 && detectedRegions.length > 0)
    pickProgressionRegion();
  let r = detectedRegions[progressionRegionIndex];
  if (r && r.cropPg) {
    let scaleX = gw / r.cropPg.width;
    let scaleY = gh / r.cropPg.height;

    if (!grey && showImage && r.maskedStretchedPg) {
      target.imageMode(CORNER);
      target.image(r.maskedStretchedPg, gridX, gridY);
    }

    if (r.contours && r.contours.length > 0) {
      target.stroke(grey ? 180 : 0);
      target.strokeWeight(grey ? 1 : 0);
      target.noFill();
      for (let pts of r.contours) {
        target.beginShape();
        for (let p of pts)
          target.vertex(
            gridX + gw / 2 + p.x * scaleX,
            gridY + gh / 2 + p.y * scaleY,
          );
        target.endShape(CLOSE);
      }
    }
  }
  let contours = r && r.contours ? r.contours : [];
  let cropW = r && r.cropPg ? r.cropPg.width : gw;
  let cropH = r && r.cropPg ? r.cropPg.height : gh;
  drawDotGrid(gw, gh, contours, cropW, cropH, grey, target);
}

function drawCombinationContent(gw, gh) {
  background(canvasBgColor);
  ensureNoteGridEdges();
  if (combinationShowGrid) drawNoteGridLight();
  if (!sourceImage) return;

  ensureCombinationBuffers();

  combinationProgressionBuffer.clear();
  drawProgressionContent(gw, gh, false, combinationProgressionBuffer);

  combinationNotesBuffer.clear();
  drawNotesTextContentToTarget(combinationNotesBuffer, noteTextColor);

  combinationHeadlinesBuffer.clear();
  drawHeadlinesTextContentToTarget(combinationHeadlinesBuffer, headlineTextColor);

  let buffersByName = {
    progression: combinationProgressionBuffer,
    notes: combinationNotesBuffer,
    headlines: combinationHeadlinesBuffer,
  };
  let order = COMBINATION_LAYER_PERMUTATIONS[combinationLayerOrderIndex];

  imageMode(CORNER);
  for (let layerName of order) {
    let buffer = buffersByName[layerName];
    let modeName = BLEND_MODE_NAMES[combinationBlendModeIndices[layerName]];
    if (modeName === "DIVIDE") {
      compositeDivide(buffer);
    } else {
      push();
      blendMode(BLEND_MODE_CONSTANTS[modeName]);
      image(buffer, 0, 0);
      pop();
    }
  }
}

// Divide blending mode
function compositeDivide(frontBuffer) {
  loadPixels();
  frontBuffer.loadPixels();
  let dst = pixels;
  let src = frontBuffer.pixels;
  for (let i = 0; i < dst.length; i += 4) {
    let srcA = src[i + 3];
    if (srcA === 0) continue;
    let alpha = srcA / 255;
    for (let c = 0; c < 3; c++) {
      let bottom = dst[i + c];
      let top = src[i + c];
      let divided = top === 0 ? 255 : Math.min(255, (bottom / top) * 255);
      dst[i + c] = bottom + (divided - bottom) * alpha;
    }
  }
  updatePixels();
}

function ensureCombinationBuffers() {
  if (!combinationProgressionBuffer || combinationProgressionBuffer.width !== width || combinationProgressionBuffer.height !== height) {
    if (combinationProgressionBuffer) combinationProgressionBuffer.remove();
    combinationProgressionBuffer = createGraphics(width, height);
  }
  if (!combinationNotesBuffer || combinationNotesBuffer.width !== width || combinationNotesBuffer.height !== height) {
    if (combinationNotesBuffer) combinationNotesBuffer.remove();
    combinationNotesBuffer = createGraphics(width, height);
  }
  if (!combinationHeadlinesBuffer || combinationHeadlinesBuffer.width !== width || combinationHeadlinesBuffer.height !== height) {
    if (combinationHeadlinesBuffer) combinationHeadlinesBuffer.remove();
    combinationHeadlinesBuffer = createGraphics(width, height);
  }
}

function renderOutlineDots(target, dots, inactiveDots, activeSize, spacing) {
  if (!dotRenderFn) return;
  try {
    dotRenderFn(target, dots, inactiveDots, activeSize, spacing, gridX, gridY);
  } catch (e) {
    console.error("Dot render snippet threw at runtime:", e);
  }
}

// Dot grid
function drawDotGrid(gw, gh, contours, cropW, cropH, grey, target = window) {
  if (dotGridDirty) {
    dotGridDirty = false;
    let { activeDots, inverseDots } = computeOutlineDots(gw, gh, contours, cropW, cropH);
    cachedOutlineDots = activeDots;
    cachedInverseDots = inverseDots;
  }

  let activeSize = sliderVal("activeDotSizeSlider");
  let spacing = sliderVal("dotSpacingSlider");

  if (!grey) {
    renderOutlineDots(target, cachedOutlineDots, cachedInverseDots, activeSize, spacing);
    return;
  }

  if (!noteGreyDotBuffer || noteGreyDotBuffer.width !== width || noteGreyDotBuffer.height !== height) {
    if (noteGreyDotBuffer) noteGreyDotBuffer.remove();
    noteGreyDotBuffer = createGraphics(width, height);
  }
  noteGreyDotBuffer.clear();
  renderOutlineDots(noteGreyDotBuffer, cachedOutlineDots, cachedInverseDots, activeSize, spacing);

  push();
  imageMode(CORNER);
  image(noteGreyDotBuffer, 0, 0);
  noStroke();
  fill(canvasBgColor + "aa");
  rect(0, 0, width, height);
  pop();
}

function computeOutlineDots(gw, gh, contours, cropW, cropH) {
  let spacing = sliderVal("dotSpacingSlider");
  let scaleX = gw / cropW;
  let scaleY = gh / cropH;

  let mask = createGraphics(gw, gh);
  mask.pixelDensity(1);
  mask.background(0);
  let maskCtx = mask.drawingContext;
  maskCtx.fillStyle = "white";
  fillContourArea(maskCtx, contours, gw / 2, gh / 2, scaleX, scaleY, areaInverse, gw, gh);
  mask.loadPixels();

  let half = spacing / 2;
  let xs = [],
    ys = [];
  for (let x = half; x < gw; x += spacing) xs.push(x);
  for (let y = half; y < gh; y += spacing) ys.push(y);
  let nc = xs.length,
    nr = ys.length;

  let shearPerRow =
    spacing * Math.tan((SLANT_ANGLES[slantMode] || 0) * (Math.PI / 180));
  let midRow = (nr - 1) / 2;

  let activeCache = new Uint8Array(nc * nr);
  for (let yi = 0; yi < nr; yi++) {
    let sampleY = ys[yi] - half;
    for (let xi = 0; xi < nc; xi++) {
      let sampleX = xs[xi] - half;
      activeCache[yi * nc + xi] = maskHitsRect(mask, sampleX, sampleY, spacing, spacing) ? 1 : 0;
    }
  }

  function isActive(xi, yi) {
    if (xi < 0 || xi >= nc || yi < 0 || yi >= nr) return false;
    return activeCache[yi * nc + xi] === 1;
  }
  function isOutline(xi, yi) {
    if (!isActive(xi, yi)) return false;
    return (
      !isActive(xi - 1, yi) ||
      !isActive(xi + 1, yi) ||
      !isActive(xi, yi - 1) ||
      !isActive(xi, yi + 1)
    );
  }

  let isActiveDot = dotFillMode === "fill" ? isActive : isOutline;
  let outlineDots = [];
  let inverseDots = [];
  for (let yi = 0; yi < nr; yi++)
    for (let xi = 0; xi < nc; xi++) {
      let dot = { x: xs[xi] + (yi - midRow) * shearPerRow, y: ys[yi] };
      (isActiveDot(xi, yi) ? outlineDots : inverseDots).push(dot);
    }

  mask.remove();
  return { activeDots: outlineDots, inverseDots };
}

function maskHitsRect(mask, rx, ry, rw, rh) {
  let steps = 3;
  for (let i = 0; i <= steps; i++) {
    let px = Math.floor(rx + (rw * i) / steps);
    for (let j = 0; j <= steps; j++) {
      let py = Math.floor(ry + (rh * j) / steps);
      px = constrain(px, 0, mask.width - 1);
      py = constrain(py, 0, mask.height - 1);
      let idx = (py * mask.width + px) * 4;
      if (mask.pixels[idx] > 128) return true;
    }
  }
  return false;
}

// Layout

function layoutRegions(gh) {
  let sorted = [...detectedRegions].sort((a, b) => a.cy - b.cy);
  let totalH =
    sorted.reduce((s, r) => s + (r.cropPg ? r.cropPg.height : 0), 0) +
    ELEMENT_GAP * (sorted.length - 1);
  let scale = totalH > gh && totalH > 0 ? gh / totalH : 1;
  let midX = gridX + (cols * cellW) / 2;
  let startY = gridY + (gh - totalH * scale) / 2;
  let cursor = startY;
  for (let r of sorted) {
    let bh = (r.cropPg ? r.cropPg.height : 0) * scale;
    r.pos = { x: midX, y: cursor + bh / 2, scale };
    cursor += bh + ELEMENT_GAP * scale;
  }
}

function pickProgressionRegion() {
  if (detectedRegions.length === 0) {
    progressionRegionIndex = -1;
    return;
  }
  if (
    progressionRegionIndex < 0 ||
    progressionRegionIndex >= detectedRegions.length
  ) {
    progressionRegionIndex = Math.floor(Math.random() * detectedRegions.length);
  }
}

function triggerFileLoad() {
  let fileInputEl = document.createElement("input");
  fileInputEl.type = "file";
  fileInputEl.accept = "image/*";
  fileInputEl.onchange = (e) => {
    let file = e.target.files[0];
    if (!file) return;
    sourceImageName = file.name.replace(/\.[^.]+$/, "");
    let url = URL.createObjectURL(file);
    document.getElementById("imagePreview").src = url;
    loadImage(url, (img) => {
      sourceImage = img;
      detectedRegions = [];
      noteLastCols = null;
      runDetect();
      updateNoteImgSample();
    });
  };
  fileInputEl.click();
}

// Detection trigger

function computeNoteDetectedRotations() {
  let rounded = detectedRegions
    .map((r) => Math.round(r.angle))
    .filter((a) => a !== 0);

  rounded.sort((a, b) => a - b);

  let deduped = [];
  for (let v of rounded) {
    if (deduped.length === 0 || Math.abs(v - deduped[deduped.length - 1]) > 5) {
      deduped.push(v);
    }
  }
  return deduped;
}

async function runDetect() {
  if (!sourceImage) return;
  ocrRunning = true;

  detectedRegions.forEach((r) => {
    if (r.cropPg) r.cropPg.remove();
  });
  detectedRegions = await runPaddleDetect(sourceImage).catch((e) => {
    console.error("PaddleOCR error:", e);
    return [];
  });
  contoursDirty = true;

  const TARGET_H = 80;
  const TESS_PAD = 0.4;

  for (let r of detectedRegions) {
    r.text = "";

    let scale = TARGET_H / (r.rh * rows * cellH);
    let tessGW = cols * cellW * scale;
    let tessGH = rows * cellH * scale;

    let strip = buildCrop(r, TESS_PAD, TESS_PAD, tessGW, tessGH);
    let dataUrl = strip.elt.toDataURL("image/png");
    strip.remove();

    try {
      let result = await Tesseract.recognize(dataUrl, "eng");
      r.text = result.data.text.trim().replace(/\n/g, " ");
    } catch (e) {
      console.warn("Tesseract failed for region:", e);
    }
  }

  noteDetectedRotations = computeNoteDetectedRotations();
  noteRotationIndex = -1; 
  updateRotationBtnLabel();

  ocrRunning = false;
}


function buildCrop(r, padX, padY, gw, gh) {
  let padW = r.rw * (1 + 2 * padX);
  let padH = r.rh * (1 + 2 * padY);
  let cropW = Math.max(1, Math.ceil(padW * gw));
  let cropH = Math.max(1, Math.ceil(padH * gh));
  let diag = Math.ceil(Math.sqrt(cropW * cropW + cropH * cropH)) + 4;

  let buf = createGraphics(diag, diag);
  buf.pixelDensity(1);
  buf.background(255);
  buf.push();
  buf.translate(diag / 2, diag / 2);
  buf.rotate(radians(-r.angle));
  buf.translate(-r.cx * gw, -r.cy * gh);
  buf.image(sourceImage, 0, 0, gw, gh);
  buf.pop();

  let pg = createGraphics(cropW, cropH);
  pg.pixelDensity(1);
  pg.background(255);
  pg.image(
    buf,
    0,
    0,
    cropW,
    cropH,
    (diag - cropW) / 2,
    (diag - cropH) / 2,
    cropW,
    cropH,
  );
  buf.remove();
  return pg;
}


function fillContourArea(ctx, contours, offX, offY, scaleX, scaleY, inverse, boundsW, boundsH) {
  ctx.beginPath();
  if (!inverse) {
    ctx.rect(0, 0, boundsW, boundsH);
  }
  for (let pts of contours) {
    if (pts.length < 2) continue;
    ctx.moveTo(offX + pts[0].x * scaleX, offY + pts[0].y * scaleY);
    for (let k = 1; k < pts.length; k++)
      ctx.lineTo(offX + pts[k].x * scaleX, offY + pts[k].y * scaleY);
    ctx.closePath();
  }
  ctx.fill(inverse ? "nonzero" : "evenodd");
}

function buildMasked(cropPg, contours) {
  let W = cropPg.width,
    H = cropPg.height;
  let pg = createGraphics(W, H);
  pg.pixelDensity(1);
  pg.clear();

  pg.imageMode(CENTER);
  pg.image(cropPg, W / 2, H / 2);

  let ctx = pg.drawingContext;
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = "white";
  fillContourArea(ctx, contours, W / 2, H / 2, 1, 1, areaInverse, W, H);
  ctx.globalCompositeOperation = "source-over";
  return pg;
}

function buildMaskedStretched(cropPg, contours, gw, gh) {
  let pg = createGraphics(gw, gh);
  pg.pixelDensity(1);
  pg.clear();

  pg.imageMode(CORNER);
  pg.image(cropPg, 0, 0, gw, gh);

  let scaleX = gw / cropPg.width;
  let scaleY = gh / cropPg.height;
  let ctx = pg.drawingContext;
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = "white";
  fillContourArea(ctx, contours, gw / 2, gh / 2, scaleX, scaleY, areaInverse, gw, gh);
  ctx.globalCompositeOperation = "source-over";
  return pg;
}

// Runs OpenCV threshold+contour on a graphics buffer
function extractContours(pg, blurK, thresh) {
  pg.loadPixels();
  if (!pg.pixels || pg.pixels.length === 0) return [];
  let W = pg.width,
    H = pg.height;

  let mat = new cv.Mat(H, W, cv.CV_8UC4);
  let gray = new cv.Mat();
  let blurM = new cv.Mat();
  let binM = new cv.Mat();
  let ctrs = new cv.MatVector();
  let hier = new cv.Mat();

  mat.data.set(pg.pixels);
  cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
  cv.blur(gray, blurM, new cv.Size(blurK, blurK));
  cv.threshold(blurM, binM, thresh, 255, cv.THRESH_BINARY_INV);
  cv.findContours(binM, ctrs, hier, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

  let result = [];
  let offX = -W / 2,
    offY = -H / 2;
  for (let i = 0; i < ctrs.size(); i++) {
    let c = ctrs.get(i);
    let pts = [];
    for (let j = 0; j < c.data32S.length; j += 2) {
      pts.push({ x: c.data32S[j] + offX, y: c.data32S[j + 1] + offY });
    }
    if (pts.length > 1) result.push(pts);
    c.delete();
  }

  mat.delete();
  gray.delete();
  blurM.delete();
  binM.delete();
  ctrs.delete();
  hier.delete();
  return result;
}

// PaddleOCR detection

const PADDLE_SIZE = 2048;
const CONTOUR_SCALE = 4;
const PADDLE_MEAN = [0.485, 0.456, 0.406];
const PADDLE_STD = [0.229, 0.224, 0.225];
const DB_THRESH = 0.3;
const DB_BOX_THRESH = 0.5;
const DB_UNCLIP = 1.5;

async function runPaddleDetect(img) {
  if (!window.cvReadyFlag) {
    console.warn("OpenCV not ready yet");
    return [];
  }

  let iw = img.width,
    ih = img.height;
  let scale = Math.min(PADDLE_SIZE / iw, PADDLE_SIZE / ih);
  let fitW = Math.max(32, Math.round(Math.round(iw * scale) / 32) * 32);
  let fitH = Math.max(32, Math.round(Math.round(ih * scale) / 32) * 32);

  let pg = createGraphics(fitW, fitH);
  pg.pixelDensity(1);
  pg.background(128);
  pg.image(img, 0, 0, fitW, fitH);
  pg.loadPixels();
  let pixels = pg.pixels;
  pg.remove();

  let numPx = fitW * fitH;
  let data = new Float32Array(3 * numPx);
  for (let i = 0; i < numPx; i++) {
    let ri = i * 4;
    data[i] = (pixels[ri] / 255 - PADDLE_MEAN[0]) / PADDLE_STD[0];
    data[numPx + i] = (pixels[ri + 1] / 255 - PADDLE_MEAN[1]) / PADDLE_STD[1];
    data[2 * numPx + i] =
      (pixels[ri + 2] / 255 - PADDLE_MEAN[2]) / PADDLE_STD[2];
  }

  if (!ortSession) {
    try {
      ortSession = await ort.InferenceSession.create(
        "../../models/ch_PP-OCRv4_det_infer.onnx",
      );
      console.log("PaddleOCR ONNX session loaded");
    } catch (e) {
      console.error("Failed to load ONNX model:", e);
      return [];
    }
  }

  let tensor = new ort.Tensor("float32", data, [1, 3, fitH, fitW]);
  let feeds = {};
  feeds[ortSession.inputNames[0]] = tensor;
  let results;
  try {
    results = await ortSession.run(feeds);
  } catch (e) {
    console.error("ONNX inference error:", e);
    return [];
  }

  let probMap = results[ortSession.outputNames[0]].data;

  let regions = [];
  let probMat = new cv.Mat(fitH, fitW, cv.CV_32F);
  let binF = new cv.Mat(fitH, fitW, cv.CV_32F);
  let bin8 = new cv.Mat(fitH, fitW, cv.CV_8U);

  probMat.data32F.set(probMap);
  cv.threshold(probMat, binF, DB_THRESH, 255, cv.THRESH_BINARY);
  binF.convertTo(bin8, cv.CV_8U);
  binF.delete();

  let contours = new cv.MatVector();
  let hier = new cv.Mat();
  cv.findContours(
    bin8,
    contours,
    hier,
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_SIMPLE,
  );

  for (let i = 0; i < contours.size(); i++) {
    let cnt = contours.get(i);
    if (cv.contourArea(cnt) < 16) {
      cnt.delete();
      continue;
    }

    let rect = cv.minAreaRect(cnt);
    let cx = rect.center.x;
    let cy = rect.center.y;
    let rw = rect.size.width;
    let rh = rect.size.height;
    let angle = rect.angle;

    if (rw < rh) {
      let t = rw;
      rw = rh;
      rh = t;
      angle += 90;
    }

    let pts4 = cv.RotatedRect.points(rect);
    let boxMask = cv.Mat.zeros(fitH, fitW, cv.CV_8U);
    let hull = new cv.MatVector();
    let hullMat = new cv.Mat(4, 1, cv.CV_32SC2);
    for (let k = 0; k < 4; k++) {
      hullMat.intPtr(k, 0)[0] = Math.round(pts4[k].x);
      hullMat.intPtr(k, 0)[1] = Math.round(pts4[k].y);
    }
    hull.push_back(hullMat);
    cv.fillPoly(boxMask, hull, new cv.Scalar(1));
    let meanVal = cv.mean(probMat, boxMask);
    boxMask.delete();
    hull.delete();
    hullMat.delete();

    if (meanVal[0] < DB_BOX_THRESH) {
      cnt.delete();
      continue;
    }

    let area = cv.contourArea(cnt);
    let perim = cv.arcLength(cnt, true);
    let expand = perim > 0 ? (area * DB_UNCLIP) / perim : 0;

    let poly = [];
    for (let k = 0; k < 4; k++) {
      let dx = pts4[k].x - cx,
        dy = pts4[k].y - cy;
      let d = Math.sqrt(dx * dx + dy * dy);
      let nx = d > 0 ? dx / d : 0,
        ny = d > 0 ? dy / d : 0;
      poly.push([
        (pts4[k].x + nx * expand) / fitW,
        (pts4[k].y + ny * expand) / fitH,
      ]);
    }

    let xs = poly.map((p) => p[0]),
      ys = poly.map((p) => p[1]);
    let bx = Math.min(...xs),
      by = Math.min(...ys);
    let bw = Math.max(...xs) - bx,
      bh = Math.max(...ys) - by;

    regions.push({
      poly,
      angle,
      cx: cx / fitW,
      cy: cy / fitH,
      x: bx,
      y: by,
      w: bw,
      h: bh,
      rw: rw / fitW,
      rh: rh / fitH,
    });
    cnt.delete();
  }

  probMat.delete();
  bin8.delete();
  contours.delete();
  hier.delete();

  console.log(`PaddleOCR: ${regions.length} regions detected`);
  return regions;
}

// Save img
function saveStamp() {
  let d = new Date();
  let mm = String(d.getMonth() + 1).padStart(2, "0");
  let dd = String(d.getDate()).padStart(2, "0");
  let hh = String(d.getHours()).padStart(2, "0");
  let min = String(d.getMinutes()).padStart(2, "0");
  let ss = String(d.getSeconds()).padStart(2, "0");
  return sourceImageName + "_" + mm + dd + "_" + hh + min + ss;
}

function saveImage() {
  if (layoutMode === "notes") {
    saveNotesImage();
    return;
  }

  if (layoutMode === "combination") {
    saveCombinationImage();
    return;
  }

  if (layoutMode === "headlines") {
    saveHeadlinesImage();
    return;
  }

  if (!sourceImage || detectedRegions.length === 0) return;

  let stamp = saveStamp();
  const SAVE_DENSITY = 2;
  let gw = cols * cellW;
  let gh = rows * cellH;

  let activeSize = sliderVal("activeDotSizeSlider");
  let overflow = Math.ceil(activeSize * 5);

  let saveW = gw + overflow;
  let saveH = gh + overflow;

  let pgUI = createGraphics(saveW, saveH);
  pgUI.pixelDensity(SAVE_DENSITY);
  pgUI.clear();
  pgUI.stroke(200);
  pgUI.strokeWeight(1);
  pgUI.noFill();
  for (let x = 0; x <= cols; x++) pgUI.line(x * cellW, 0, x * cellW, gh);
  for (let y = 0; y <= rows; y++) pgUI.line(0, y * cellH, gw, y * cellH);

  const settings = [
    "Mode: " + layoutMode,
    "Pad X: " + nf(sliderVal("padSliderX"), 1, 2),
    "Pad Y: " + nf(sliderVal("padSliderY"), 1, 2),
    "Blur: " + sliderVal("blurSlider"),
    "Threshold: " + sliderVal("threshSlider"),
    "Dot spacing: " + sliderVal("dotSpacingSlider") + "px",
    "Active dot: " + sliderVal("activeDotSizeSlider") + "px",
    "Image: " + (showImage ? "On" : "Off"),
  ];
  pgUI.textFont('"GT Canon Mono Medium"');
  pgUI.textSize(9);
  pgUI.noStroke();
  pgUI.fill(0);
  pgUI.textAlign(LEFT, BOTTOM);
  let lineH = 11;
  let startY = gh - 4;
  for (let i = settings.length - 1; i >= 0; i--) {
    pgUI.text(settings[i], 4, startY - (settings.length - 1 - i) * lineH);
  }

  let pg = createGraphics(saveW, saveH);
  pg.pixelDensity(SAVE_DENSITY);
  pg.clear();
  pg.textFont('"GT Canon Mono Medium"');

  if (layoutMode === "base") {
    for (let r of detectedRegions) {
      if (!r.pos || !r.cropPg) continue;

      let cx = r.pos.x - gridX;
      let cy = r.pos.y - gridY;
      let stackScale = r.pos.scale || 1;
      let bw = r.cropPg.width;
      let bh = r.cropPg.height;

      pg.push();
      pg.translate(cx, cy);
      pg.scale(stackScale);

      if (showImage && r.maskedPg) {
        pg.imageMode(CENTER);
        pg.image(r.maskedPg, 0, 0);
      }

      if (r.contours && r.contours.length > 0) {
        pg.stroke(0, 0, 0);
        pg.strokeWeight(1);
        pg.noFill();
        for (let pts of r.contours) {
          pg.beginShape();
          for (let p of pts) pg.vertex(p.x, p.y);
          pg.endShape(CLOSE);
        }
      }

      pg.noStroke();
      pg.fill(0, 0, 0);
      pg.textSize(9 / stackScale);
      pg.textAlign(LEFT, BOTTOM);
      pg.text(nf(r.angle, 1, 1) + "°", bw / 2 + 2, bh / 2 - 2);

      pg.pop();
    }
  } else {
    let r = detectedRegions[progressionRegionIndex];
    if (r && r.cropPg) {
      let scaleX = gw / r.cropPg.width;
      let scaleY = gh / r.cropPg.height;

      if (showImage) {
        let masked = buildMaskedStretched(r.cropPg, r.contours, gw, gh);
        pg.imageMode(CORNER);
        pg.image(masked, 0, 0);
        masked.remove();
      }

      if (r.contours && r.contours.length > 0) {
        pg.stroke(0);
        pg.strokeWeight(0);
        pg.noFill();
        for (let pts of r.contours) {
          pg.beginShape();
          for (let p of pts)
            pg.vertex(gw / 2 + p.x * scaleX, gh / 2 + p.y * scaleY);
          pg.endShape(CLOSE);
        }
      }

      let activeSize = sliderVal("activeDotSizeSlider");
      let spacing = sliderVal("dotSpacingSlider");
      let { activeDots: exportDots, inverseDots: exportInverseDots } = computeOutlineDots(
        gw,
        gh,
        r.contours || [],
        r.cropPg.width,
        r.cropPg.height,
      );
      renderOutlineDots(pg, exportDots, exportInverseDots, activeSize, spacing);
    }
  }

  pg.elt.toBlob((contentBlob) => {
    pgUI.elt.toBlob((uiBlob) => {
      /*triggerDownload(uiBlob, stamp + "_ui.png");*/
      pgUI.remove();
      setTimeout(() => {
        triggerDownload(contentBlob, stamp + "_content.png");
        pg.remove();
      }, 200);
    }, "image/png");
  }, "image/png");
}

function saveNotesImage() {
  let stamp = saveStamp();
  document.querySelector(".canvas-wrap canvas").toBlob((blob) => {
    triggerDownload(blob, stamp + "_notes.png");
  }, "image/png");
}

function saveCombinationImage() {
  let stamp = saveStamp();
  document.querySelector(".canvas-wrap canvas").toBlob((blob) => {
    triggerDownload(blob, stamp + "_combination.png");
  }, "image/png");
}

function saveHeadlinesImage() {
  let stamp = saveStamp();
  document.querySelector(".canvas-wrap canvas").toBlob((blob) => {
    triggerDownload(blob, stamp + "_titles.png");
  }, "image/png");
}

function triggerDownload(blob, filename) {
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
