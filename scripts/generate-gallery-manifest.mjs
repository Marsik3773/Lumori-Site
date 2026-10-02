import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const galleryDir = process.argv[2] ?? 'assets/gallery';
const imageExtension = /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/i;
const alphabet = new Intl.Collator('ru', { sensitivity: 'base' });

const entries = await readdir(galleryDir, { withFileTypes: true });
const images = entries
  .filter((entry) => entry.isFile() && imageExtension.test(entry.name))
  .map((entry) => entry.name)
  .sort((a, b) => alphabet.compare(a, b) || a.localeCompare(b, 'ru'))
  .map((name) => `assets/gallery/${encodeURIComponent(name)}`);

await writeFile(join(galleryDir, 'index.json'), `${JSON.stringify(images, null, 2)}\n`, 'utf8');
console.log(`Галерея: ${images.length} изображений.`);
