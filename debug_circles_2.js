import fs from 'fs';
import { PNG } from 'pngjs';

const imagePath = 'public/assets/card_convite.png';
const debugPath = 'public/assets/card_convite_debug_2.png';

fs.createReadStream(imagePath)
  .pipe(new PNG())
  .on('parsed', function() {
    // Novas coordenadas estimadas com simetria e espaçamento uniforme
    const Y_CENTER = 1145;
    const RADIUS = 75; // Diâmetro 150px
    const circles = [
      { x: 294, y: Y_CENTER, r: RADIUS },
      { x: 458, y: Y_CENTER, r: RADIUS },
      { x: 622, y: Y_CENTER, r: RADIUS },
      { x: 786, y: Y_CENTER, r: RADIUS }
    ];
    
    // Função para desenhar um pixel azul (destacar do anterior que era vermelho)
    const setBluePixel = (x, y) => {
      x = Math.round(x);
      y = Math.round(y);
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        const idx = (this.width * y + x) << 2;
        this.data[idx] = 0;     // R
        this.data[idx + 1] = 0;   // G
        this.data[idx + 2] = 255; // B
      }
    };
    
    const drawCircle = (cx, cy, r) => {
      for (let dr = -1; dr <= 1; dr++) {
        const currentR = r + dr;
        const steps = 360 * 2;
        for (let i = 0; i < steps; i++) {
          const angle = (i * Math.PI) / 360;
          const x = cx + currentR * Math.cos(angle);
          const y = cy + currentR * Math.sin(angle);
          setBluePixel(x, y);
        }
      }
    };
    
    for (const c of circles) {
      drawCircle(c.x, c.y, c.r);
      for (let d = -5; d <= 5; d++) {
        setBluePixel(c.x + d, c.y);
        setBluePixel(c.x, c.y + d);
      }
    }
    
    this.pack()
      .pipe(fs.createWriteStream(debugPath))
      .on('finish', () => {
        console.log(`Debug image saved at ${debugPath}`);
      });
  });
