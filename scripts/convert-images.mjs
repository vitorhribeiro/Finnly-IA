import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const sourceDir = path.join(process.cwd(), 'public', 'images', 'png');
const targetDir = path.join(process.cwd(), 'public', 'images', 'webp');

function convertImagesToWebp() {
  if (!fs.existsSync(sourceDir)) {
    console.log(`Source directory not found: ${sourceDir}`);
    return;
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.readdirSync(sourceDir).forEach(file => {
    const fullPath = path.join(sourceDir, file);
    if (!fs.statSync(fullPath).isDirectory()) {
      const ext = path.extname(file).toLowerCase();
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        const webpFilename = file.replace(new RegExp(`${ext}$`), '.webp');
        const webpPath = path.join(targetDir, webpFilename);
        
        // Skip if webp already exists
        if (!fs.existsSync(webpPath)) {
          console.log(`Converting: ${file} -> ${webpFilename}`);
          sharp(fullPath)
            .webp({ quality: 80 }) // 80 is a good balance between quality and size
            .toFile(webpPath)
            .then(() => {
              console.log(`Successfully converted ${file}`);
            })
            .catch(err => {
              console.error(`Error converting ${file}:`, err);
            });
        }
      }
    }
  });
}

console.log('Starting image conversion to WebP...');
convertImagesToWebp();
console.log('Finished queuing images.');
