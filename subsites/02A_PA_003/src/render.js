import { state } from './state.js';

// Polygon
function drawPolygon(ctx, corners, radius, rotation, curvature = 0) {
    ctx.beginPath();
    
    for (let i = 0; i < corners; i++) {
        const angle = (i / corners) * Math.PI * 2 + rotation;
        const nextAngle = ((i + 1) / corners) * Math.PI * 2 + rotation;
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const nextX = Math.cos(nextAngle) * radius;
        const nextY = Math.sin(nextAngle) * radius;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        }
        
        if (curvature === 0) {
            ctx.lineTo(nextX, nextY);
        } else {
            const midAngle = (angle + nextAngle) / 2;
            const controlRadius = radius * (1 + curvature * 1.5);
            const controlX = Math.cos(midAngle) * controlRadius;
            const controlY = Math.sin(midAngle) * controlRadius;
            
            ctx.quadraticCurveTo(controlX, controlY, nextX, nextY);
        }
    }
    
    ctx.closePath();
    ctx.fillStyle = "#00000091";
    ctx.fill();
    ctx.strokeStyle = "#00000000";
    ctx.lineWidth = 2;
    ctx.stroke();
}

export function render(ctx, hideUI = false) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for(let y = 0; y < state.rows; y++) {
        for(let x = 0; x < state.cols; x++) {
            const index = y * state.cols + x;
            const section = state.sections[index];
            const px = x * state.sectionSize;
            const py = y * state.sectionSize;

            if(!hideUI) {
                ctx.strokeStyle = "#cccccc";
                ctx.lineWidth = 1;
                ctx.strokeRect(px, py, state.sectionSize, state.sectionSize);
            }

            if(!hideUI && state.selected === index) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = "#ff0000";
                ctx.strokeRect(px + 2, py + 2, state.sectionSize - 4, state.sectionSize - 4);
            }

            ctx.save();
            ctx.translate(px + state.sectionSize / 2, py + state.sectionSize / 2);

            const radius = state.sectionSize / Math.sqrt(2);
            const rotationRad = (section.rotation / 360) * Math.PI * 2;
            
            drawPolygon(ctx, section.corners, radius, rotationRad, section.curvature);
            ctx.restore();
        }
    }
}