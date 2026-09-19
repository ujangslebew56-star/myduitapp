import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generate() {
  const publicDir = path.resolve('public');
  
  const files = [
    { svg: 'logo-mark.svg', png: 'logo-mark.png', width: 1024, height: 1024 },
    { svg: 'logo-white.svg', png: 'logo-white.png', width: 1024, height: 1024 },
    { svg: 'logo-app.svg', png: 'logo.png', width: 1024, height: 1024 },
    { svg: 'logo-app.svg', png: 'logo-transparent.png', width: 1024, height: 1024 },
    { svg: 'logo-full.svg', png: 'logo-full.png', width: 1200, height: 400 },
  ];

  for (const item of files) {
    const svgPath = path.join(publicDir, item.svg);
    const pngPath = path.join(publicDir, item.png);
    if (!fs.existsSync(svgPath)) {
      console.warn('SVG file not found:', svgPath);
      continue;
    }

    const svgBuffer = fs.readFileSync(svgPath);
    await sharp(svgBuffer)
      .resize(item.width, item.height)
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(pngPath);
    
    console.log(`Generated: ${item.png} (${item.width}x${item.height})`);
  }
}

generate().catch(console.error);
