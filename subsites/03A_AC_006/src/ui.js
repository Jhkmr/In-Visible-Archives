import { images } from './images.js';
import { initEditor } from './editor.js';

export function initUI(p) {
  document.getElementById('saveBtn').addEventListener('click', () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    p.saveCanvas(`print_${timestamp}`, 'png');
  });

  initEditor();

  const container = document.getElementById('info-section');
  const grid = document.createElement('div');
  grid.className = 'images-grid';

  images.forEach((filename) => {
    const item = document.createElement('div');
    item.className = 'image-item';
    const img = document.createElement('img');
    img.src = `./images/${filename}`;
    img.alt = filename;
    item.appendChild(img);
    grid.appendChild(item);
  });

  container.appendChild(grid);
}
