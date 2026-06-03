import fs from 'fs';
import { PNG } from 'pngjs';

const imagePath = 'public/assets/card_convite.png';

fs.createReadStream(imagePath)
  .pipe(new PNG())
  .on('parsed', function() {
    // Vamos analisar a luminância em Y = 1155 (que é uma linha que passa bem no meio dos círculos)
    const targetY = 1155;
    const luminanceData = [];
    
    for (let x = 100; x < 980; x++) {
      const idx = (this.width * targetY + x) << 2;
      const r = this.data[idx];
      const g = this.data[idx + 1];
      const b = this.data[idx + 2];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      luminanceData.push({ x, l, r, g, b });
    }
    
    // Vamos imprimir onde a luminância cai muito (borda escura) e onde ela sobe (interior claro)
    // O fundo geral da folha é bege claro (luminância em torno de 220-225)
    // A borda do círculo é dourada/escura (luminância cai para menos de 190, às vezes menos de 150)
    // O interior do círculo tem fundo creme muito claro (luminância sobe para mais de 235)
    // Vamos analisar os trechos e imprimir os intervalos onde a luminância é menor que 200 (potenciais bordas)
    // ou simplesmente imprimir os blocos.
    
    console.log("Analyzing luminance along Y = " + targetY);
    let inDarkEdge = false;
    let darkStart = 0;
    
    for (let i = 0; i < luminanceData.length; i++) {
      const pt = luminanceData[i];
      // Se a luminância cair abaixo de 205, e a cor não for azul/rosa dos desenhos
      // (Para evitar o vestido azul que tem luminância mais baixa, mas vamos ver)
      const isDark = pt.l < 205;
      
      if (isDark && !inDarkEdge) {
        inDarkEdge = true;
        darkStart = pt.x;
      } else if (!isDark && inDarkEdge) {
        inDarkEdge = false;
        const darkEnd = pt.x;
        const width = darkEnd - darkStart;
        if (width >= 2) {
          console.log(`Dark region at X: ${darkStart} to ${darkEnd} (width: ${width}px), avg color: R=${pt.r} G=${pt.g} B=${pt.b}`);
        }
      }
    }
    
    // Imprimir também os picos de alta luminosidade (interior do círculo)
    console.log("\nBright regions (inside circles):");
    let inBright = false;
    let brightStart = 0;
    for (let i = 0; i < luminanceData.length; i++) {
      const pt = luminanceData[i];
      const isBright = pt.l > 228; // Muito claro
      if (isBright && !inBright) {
        inBright = true;
        brightStart = pt.x;
      } else if (!isBright && inBright) {
        inBright = false;
        const brightEnd = pt.x;
        const width = brightEnd - brightStart;
        if (width > 20) {
          console.log(`Bright region at X: ${brightStart} to ${brightEnd} (width: ${width}px)`);
        }
      }
    }
  });
