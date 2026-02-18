import './style.css';
import { Application } from 'pixi.js';

async function init() {
  const app = new Application();

  await app.init({
    background: 0x0a0a0a,
    resizeTo: window,
    resolution: window.devicePixelRatio,
    antialias: true,
    hello: import.meta.env.PROD ? false : true,
  });

  const container = document.getElementById('app');
  if (container) {
    container.appendChild(app.canvas);
  }
}

init();
