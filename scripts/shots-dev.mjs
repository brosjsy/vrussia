// Screenshots of the development pages (homes, the 3D city) through a headless browser, for checking by eye. Needs the Vite dev server: npx vite --port 5179
// Run: node scripts/shots-dev.mjs <out-folder> <path> [<path> ...]   e.g. node scripts/shots-dev.mjs docs/screens /dev/home.html?rent=khrush
import { writeFileSync, mkdirSync } from 'node:fs';
import { launch } from './cdp.mjs';
const [out, ...paths] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const b = await launch({ width: 1280, height: 800 });
try {
  for (const p of paths) {
    const [path, name] = p.split('=>');
    await b.navigate('http://127.0.0.1:5179' + path); await b.sleep(Number(process.env.WAIT ?? 4000));
    writeFileSync(`${out}/${name ?? path.replace(/[^a-z0-9]+/gi, '_')}.png`, await b.screenshot()); console.log('saved', name ?? path);
  }
  if (b.errors.length) console.log('errors:', b.errors.slice(0, 10));
} finally { await b.close(); }
