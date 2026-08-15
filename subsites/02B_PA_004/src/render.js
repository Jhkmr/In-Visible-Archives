import { state } from './state.js';

// Polygon
function drawPolygon(ctx, corners, radiusX, radiusY, rotation, curvature = 0) {
    ctx.beginPath();
    
    for (let i = 0; i < corners; i++) {
        const angle = (i / corners) * Math.PI * 2 + rotation;
        const nextAngle = ((i + 1) / corners) * Math.PI * 2 + rotation;
        
        const x = Math.cos(angle) * radiusX;
        const y = Math.sin(angle) * radiusY;
        const nextX = Math.cos(nextAngle) * radiusX;
        const nextY = Math.sin(nextAngle) * radiusY;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        }
        
        if (curvature === 0) {
            ctx.lineTo(nextX, nextY);
        } else {
            const midAngle = (angle + nextAngle) / 2;
            const controlRadiusX = radiusX * (1 + curvature * 1.5);
            const controlRadiusY = radiusY * (1 + curvature * 1.5);
            const controlX = Math.cos(midAngle) * controlRadiusX;
            const controlY = Math.sin(midAngle) * controlRadiusY;
            
            ctx.quadraticCurveTo(controlX, controlY, nextX, nextY);
        }
    }
    
    ctx.closePath();
    ctx.fillStyle = "#00000000";
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.stroke();
}

export function render(ctx, hideUI = false) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    const dividerPixelX = canvasWidth * state.dividerX;
    const dividerPixelY = canvasHeight * state.dividerY;

    // Sections
    const sections = [
        { x: 0, y: 0, w: dividerPixelX, h: dividerPixelY, index: 0 },
        { x: dividerPixelX, y: 0, w: canvasWidth - dividerPixelX, h: dividerPixelY, index: 1 },
        { x: 0, y: dividerPixelY, w: dividerPixelX, h: canvasHeight - dividerPixelY, index: 2 },
        { x: dividerPixelX, y: dividerPixelY, w: canvasWidth - dividerPixelX, h: canvasHeight - dividerPixelY, index: 3 }
    ];

    for(let sect of sections) {
        const section = state.sections[sect.index];

        if(!hideUI) {
            ctx.strokeStyle = "#cccccc";
            ctx.lineWidth = 1;
            ctx.strokeRect(sect.x, sect.y, sect.w, sect.h);
        }

        ctx.save();
        const sectionCenterX = sect.x + sect.w / 2;
        const sectionCenterY = sect.y + sect.h / 2;
        ctx.translate(sectionCenterX, sectionCenterY);

        const dx = dividerPixelX - sectionCenterX;
        const dy = dividerPixelY - sectionCenterY;
        const angleToMiddle = Math.atan2(dy, dx);
        const rotationRad = (section.rotation / 360) * Math.PI * 2 + angleToMiddle;

        const radiusX = sect.w / 2;
        const radiusY = sect.h / 2;
        
        drawPolygon(ctx, section.corners, radiusX, radiusY, rotationRad, section.curvature);
        ctx.restore();
    }

    // Divider lines
    if(!hideUI) {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(dividerPixelX, 0);
        ctx.lineTo(dividerPixelX, canvasHeight);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, dividerPixelY);
        ctx.lineTo(canvasWidth, dividerPixelY);
        ctx.stroke();
    }
}