import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'dist');
const assets = {};
const store = await readFile(path.join(root, 'public', 'store.html'));
assets['/'] = { body: store.toString('base64'), type: 'text/html; charset=utf-8' };
assets['/store.html'] = assets['/'];
const imageDir = path.join(root, 'public', 'assets', 'products');
for (const name of await readdir(imageDir)) {
  const bytes = await readFile(path.join(imageDir, name));
  const mime = name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  assets[`/assets/products/${name}`] = { body: bytes.toString('base64'), type: mime };
}
await mkdir(path.join(out, 'server'), { recursive: true });
await mkdir(path.join(out, '.openai'), { recursive: true });
await writeFile(path.join(out, 'server', 'index.js'),
  (await readFile(path.join(root, 'worker', 'index.js'), 'utf8'))
    .replace('/*__SITE_ASSETS__*/null', JSON.stringify(assets)));
await cp(path.join(root, '.openai', 'hosting.json'), path.join(out, '.openai', 'hosting.json'));
await cp(path.join(root, 'drizzle'), path.join(out, '.openai', 'drizzle'), { recursive: true });
console.log(`Built Worker with ${Object.keys(assets).length} embedded storefront assets.`);
