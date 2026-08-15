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

            ctx.save();
            ctx.translate(px+state.cellSize/2, py+state.cellSize/2);
            if(shapeType === 'level') {
                drawLevelShape(ctx, corner, state.cellSize);
            } else {
                drawAngularShape(ctx, corner, diagonal, state.cellSize);
            }
            ctx.restore();
        }
    }
}