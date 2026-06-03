import fs from 'fs';
import { PNG } from 'pngjs';

const imagePath = 'public/assets/card_convite.png';
const debugPath = 'public/assets/card_convite_debug.png';

fs.createReadStream(imagePath)
  .pipe(new PNG())
  .on('parsed', function() {
    // Coordenadas calculadas
    const circles = [
      { x: 266, y: 1163, r: 86 },
      { x: 420, y: 1163, r: 86 },
      { x: 661, y: 1163, r: 86 },
      { x: 815, y: 1163, r: 86 }
    ];
    
    // Função para desenhar um pixel vermelho
    const setRedPixel = (x, y) => {
      x = Math.round(x);
      y = Math.round(y);
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        const idx = (this.width * y + x) << 2;
        this.data[idx] = 255;   // R
        this.data[idx + 1] = 0; // G
        this.data[idx + 2] = 0; // B
        // Não altera o Alpha
      }
    };
    
    // Função para desenhar a borda de um círculo
    const drawCircle = (cx, cy, r) => {
      // Desenha com espessura de 3 pixels
      for (let dr = -1; dr <= 1; dr++) {
        const currentR = r + dr;
        const steps = 360 * 2;
        for (let i = 0; i < steps; i++) {
          const angle = (i * Math.PI) / 360;
          const x = cx + currentR * Math.cos(angle);
          const y = cy + currentR * Math.sin(angle);
          setRedPixel(x, y);
        }
      }
    };
    
    // Desenha os 4 círculos
    for (const c of circles) {
      drawCircle(c.x, c.y, c.r);
      // Desenha o centro com uma pequena cruz
      for (let d = -5; d <= 5; d++) {
        setRedPixel(c.x + d, c.y);
        setRedPixel(c.x, c.y + d);
      }
    }
    
    // Salva a imagem debug
    this.pack()
      .pipe(fs.createWriteStream(debugPath))
      .on('finish', () => {
        console.log(`Debug image saved at ${debugPath}`);
      });
  });
