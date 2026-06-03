import fs from 'fs';
import { PNG } from 'pngjs';

const imagePath = 'public/assets/card_convite.png';
const debugPath = 'public/assets/card_convite_debug_3.png';

fs.createReadStream(imagePath)
  .pipe(new PNG())
  .on('parsed', function() {
    // Nova hipótese: simetria perfeita com espaçamento uniforme de 158px
    const Y_CENTER = 1152;
    const RADIUS = 80; // Diâmetro 160px
    const circles = [
      { x: 303, y: Y_CENTER, r: RADIUS },
      { x: 461, y: Y_CENTER, r: RADIUS },
      { x: 619, y: Y_CENTER, r: RADIUS },
      { x: 777, y: Y_CENTER, r: RADIUS }
    ];
    
    // Desenha com cor verde
    const setGreenPixel = (x, y) => {
      x = Math.round(x);
      y = Math.round(y);
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        const idx = (this.width * y + x) << 2;
        this.data[idx] = 0;     // R
        this.data[idx + 1] = 255; // G
        this.data[idx + 2] = 0;   // B
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
          setGreenPixel(x, y);
        }
      }
    };
    
    for (const c of circles) {
      drawCircle(c.x, c.y, c.r);
      for (let d = -5; d <= 5; d++) {
        setGreenPixel(c.x + d, c.y);
        setGreenPixel(c.x, c.y + d);
      }
    }
    
    this.pack()
      .pipe(fs.createWriteStream(debugPath))
      .on('finish', () => {
        console.log(`Debug image saved at ${debugPath}`);
      });
  });
