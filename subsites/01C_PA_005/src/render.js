import { state, getShapeParams } from './state.js';

// Angular shape
function drawAngularShape(ctx, corner, diagonal, cellSize) {
    const size = cellSize / 2;

    const corners = {
        TL: { x: -size, y: -size },
        TR: { x: size, y: -size },
        BR: { x: size, y: size },
        BL: { x: -size, y: size }
    };

    const angularShapes = {
        0: [
            { diag: [corners.TL, corners.BR], line: [corners.BL, corners.TL] },
            { diag: [corners.TL, corners.BR], line: [corners.TR, corners.TL] }
        ],
        1: [
            { diag: [corners.TR, corners.BL], line: [corners.TL, corners.TR] },
            { diag: [corners.TR, corners.BL], line: [corners.BR, corners.TR] }
        ],
        2: [
            { diag: [corners.BR, corners.TL], line: [corners.TR, corners.BR] },
            { diag: [corners.BR, corners.TL], line: [corners.BL, corners.BR] }
        ],
        3: [
            { diag: [corners.BL, corners.TR], line: [corners.BR, corners.BL] },
            { diag: [corners.BL, corners.TR], line: [corners.TL, corners.BL] }
        ]
    };
    
    const shape = angularShapes[corner][diagonal];
    
    ctx.beginPath();
    ctx.moveTo(shape.diag[0].x, shape.diag[0].y);
    ctx.lineTo(shape.diag[1].x, shape.diag[1].y);
    ctx.moveTo(shape.line[0].x, shape.line[0].y);
    ctx.lineTo(shape.line[1].x, shape.line[1].y);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Level shape
function drawLevelShape(ctx, corner, cellSize) {
    const size = cellSize / 2;

    const corners = {
        TL: { x: -size, y: -size },
        TR: { x: size, y: -size },
        BR: { x: size, y: size },
        BL: { x: -size, y: size }
    };

    const levelShapes = {
        0: [
            [corners.BL, corners.TL],
            [corners.TL, corners.TR]
        ],
        1: [
            [corners.TL, corners.TR],
            [corners.TR, corners.BR]
        ],
        2: [
            [corners.TR, corners.BR],
            [corners.BR, corners.BL]
        ],
        3: [
            [corners.BR, corners.BL],
            [corners.BL, corners.TL]
        ]
    };
    
    const shape = levelShapes[corner];
    
    ctx.beginPath();
    ctx.moveTo(shape[0][0].x, shape[0][0].y);
    ctx.lineTo(shape[0][1].x, shape[0][1].y);
    ctx.moveTo(shape[1][0].x, shape[1][0].y);
    ctx.lineTo(shape[1][1].x, shape[1][1].y);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Styled line
function drawStyledLine(ctx, x1, y1, x2, y2, style) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    if(len < 0.5) return;
    const ux = dx / len;
    const uy = dy / len;

    ctx.beginPath();
    if(style === 'straight') {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    } else if(style === 'dotted') {
        const gap = 5;
        let d = 0;
        while(d < len) {
            const px = x1 + ux * d;
            const py = y1 + uy * d;
            ctx.beginPath();
            ctx.arc(px, py, 0.8, 0, Math.PI * 2);
            ctx.fill();
            d += gap;
        }
    } else if(style === 'dashed') {
        const dashLen = 8, gapLen = 5;
        let d = 0;
        while(d < len) {
            const start = d;
            const end = Math.min(d + dashLen, len);
            ctx.beginPath();
            ctx.moveTo(x1 + ux * start, y1 + uy * start);
            ctx.lineTo(x1 + ux * end, y1 + uy * end);
            ctx.stroke();
            d += dashLen + gapLen;
        }
    } else if(style === 'wavy') {
        const amplitude = 2.5, wavelength = 80;
        const nx = -uy, ny = ux;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        const steps = Math.ceil(len / 2);
        for(let i = 1; i <= steps; i++) {
            const t = (i / steps) * len;
            const wave = amplitude * Math.sin((t / wavelength) * Math.PI * 2);
            ctx.lineTo(x1 + ux * t + nx * wave, y1 + uy * t + ny * wave);
        }
        ctx.stroke();
    } else if(style === 'zigzag') {
        const amplitude = 25, wavelength = 8;
        const nx = -uy, ny = ux;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        const steps = Math.ceil(len / (wavelength / 2));
        for(let i = 1; i <= steps; i++) {
            const t = Math.min((i / steps) * len, len);
            const sign = (i % 2 === 0) ? 1 : -1;
            ctx.lineTo(x1 + ux * t + nx * amplitude * sign, y1 + uy * t + ny * amplitude * sign);
        }
        ctx.stroke();
    }
}

// Hatch in triangle
function drawHatchInTriangle(ctx, apex, endA, endB, ux, uy, gap, lineStyle, cellSize) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(endA.x, endA.y);
    ctx.lineTo(endB.x, endB.y);
    ctx.closePath();
    ctx.clip();

    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.lineWidth = 1;

    const nx = -uy, ny = ux;

    const projs = [
        apex.x * nx + apex.y * ny,
        endA.x * nx + endA.y * ny,
        endB.x * nx + endB.y * ny,
    ];
    const minP = Math.min(...projs);
    const maxP = Math.max(...projs);

    const first = Math.ceil(minP / gap) * gap;
    for(let p = first; p <= maxP; p += gap) {
        const ox = p * nx, oy = p * ny;
        const ext = cellSize * 2;
        const lx1 = ox + ux * -ext, ly1 = oy + uy * -ext;
        const lx2 = ox + ux *  ext, ly2 = oy + uy *  ext;
        drawStyledLine(ctx, lx1, ly1, lx2, ly2, lineStyle);
    }

    ctx.restore();
}

// Hatch fill
function drawHatchFill(ctx, corner, diagonal, shapeType, cellSize, lineStyle, levelHatchDir) {
    const s = cellSize / 2;
    const c = {
        TL: { x: -s, y: -s },
        TR: { x:  s, y: -s },
        BR: { x:  s, y:  s },
        BL: { x: -s, y:  s }
    };

    const gap = 7;

    if(shapeType === 'angular') {
        const wedges = {
            0: [ [c.TL, c.BR, c.BL], [c.TL, c.BR, c.TR] ],
            1: [ [c.TR, c.BL, c.TL], [c.TR, c.BL, c.BR] ],
            2: [ [c.BR, c.TL, c.TR], [c.BR, c.TL, c.BL] ],
            3: [ [c.BL, c.TR, c.BR], [c.BL, c.TR, c.TL] ]
        };
        const [apex, endA, endB] = wedges[corner][diagonal];

        const inv = Math.SQRT1_2;
        const ux = (corner === 0 || corner === 2) ?  inv : -inv;
        const uy = inv;

        drawHatchInTriangle(ctx, apex, endA, endB, ux, uy, gap, lineStyle, cellSize);

    } else {
        const wedges = {
            0: [c.TL, c.BL, c.TR],
            1: [c.TR, c.TL, c.BR],
            2: [c.BR, c.TR, c.BL],
            3: [c.BL, c.BR, c.TL]
        };
        const [apex, endA, endB] = wedges[corner];

        const ux = levelHatchDir === 'horizontal' ? 1 : 0;
        const uy = levelHatchDir === 'horizontal' ? 0 : 1;

        drawHatchInTriangle(ctx, apex, endA, endB, ux, uy, gap, lineStyle, cellSize);
    }
}

export function render(ctx, hideUI = false) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for(let y=0; y<state.rows; y++){
        for(let x=0; x<state.cols; x++){
            const index = y*state.cols + x;
            const shapeType = state.shapeTypes[index];
            const px = x*state.cellSize;
            const py = y*state.cellSize;

            const params = getShapeParams(state.shapeIndex[index], shapeType === 'angular');
            const { corner, diagonal } = params;

            if(!hideUI) {
                ctx.strokeStyle="#ffffff";
                ctx.lineWidth =1;
                ctx.strokeRect(px, py, state.cellSize, state.cellSize);
            }

            if(!hideUI && state.selected === index){
                ctx.lineWidth=1;
                ctx.strokeStyle="#ff0000";
                ctx.strokeRect(px+1, py+1, state.cellSize-1, state.cellSize-1);
                ctx.lineWidth=1;
            }

            const shouldDraw = shapeType !== 'blank' &&
                !(state.hideUnedited && !state.interacted.has(index));
            if(shouldDraw) {
                ctx.save();
                ctx.translate(px+state.cellSize/2, py+state.cellSize/2);
                if(state.viewMode === 'lines') {
                    const lineStyle = ['straight','wavy','zigzag','dotted','dashed'][state.lineStyleIndex];
                    drawHatchFill(ctx, corner, diagonal, shapeType, state.cellSize, lineStyle, state.levelHatchDirs[index]);
                }
                if(shapeType === 'level') {
                    drawLevelShape(ctx, corner, state.cellSize);
                } else {
                    drawAngularShape(ctx, corner, diagonal, state.cellSize);
                }
                ctx.restore();
            }
        }
    }
}