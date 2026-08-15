const canvas = document.getElementById("gridCanvas");
const ctx = canvas.getContext("2d");
const rotateBtn = document.getElementById("rotateBtn");

const cols = 4;
const rows = 6;

let cellSize;
let offsetX;
let offsetY;

let selected = null;

const cells = Array(cols * rows).fill(0);

function resizeCanvas(){

    const container = canvas.parentElement;
    const style = getComputedStyle(container);

    const paddingX =
        parseFloat(style.paddingLeft) +
        parseFloat(style.paddingRight);

    const paddingY =
        parseFloat(style.paddingTop) +
        parseFloat(style.paddingBottom);

    const w = container.clientWidth - paddingX;
    const h = container.clientHeight - paddingY;

    const sizeFromWidth = Math.floor(w / cols);
    const sizeFromHeight = Math.floor(h / rows);

    cellSize = Math.min(sizeFromWidth, sizeFromHeight);

    canvas.width = cellSize * cols;
    canvas.height = cellSize * rows;

    draw();
}

window.addEventListener("resize", resizeCanvas);

function draw(){

    ctx.clearRect(0,0,canvas.width,canvas.height);

    for(let y=0;y<rows;y++){
        for(let x=0;x<cols;x++){

            const index = y*cols + x;
            const rotation = cells[index];

            const px = x*cellSize;
            const py = y*cellSize;

            ctx.strokeStyle="#ddd";
            ctx.strokeRect(px,py,cellSize,cellSize);

            if(selected === index){
                ctx.lineWidth = 3;
                ctx.strokeStyle="#4a8cff";
                ctx.strokeRect(px+2,py+2,cellSize-4,cellSize-4);
                ctx.lineWidth = 1;
            }

            drawLine(px,py,rotation);
        }
    }
}

function drawLine(x,y,rotation){

    ctx.save();

    ctx.translate(x + cellSize/2, y + cellSize/2);
    ctx.rotate(rotation * Math.PI/180);

    ctx.beginPath();

    ctx.moveTo(0, cellSize/2);
    ctx.lineTo(cellSize/2, cellSize/2);
    ctx.lineTo(cellSize/2, 0);

    ctx.strokeStyle="black";
    ctx.lineWidth=3;
    ctx.stroke();

    ctx.restore();
}

canvas.addEventListener("click",(e)=>{

    const rect = canvas.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    const index = row*cols + col;

    selected = index;

    draw();
});

rotateBtn.addEventListener("click",()=>{

    if(selected === null) return;

    cells[selected] += 90;

    draw();
});

resizeCanvas();