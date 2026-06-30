import { cpSync, existsSync, mkdirSync } from 'node:fs';

const src = 'src/knowledge';
const dest = 'dist/knowledge';

if (existsSync(src)) {
  mkdirSync('dist', { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`Copied ${src} -> ${dest}`);
} else {
  console.warn(`No ${src} directory found to copy.`);
}
