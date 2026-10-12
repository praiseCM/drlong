import { mkdir, readFile, writeFile, copyFile, readdir, rm } from 'node:fs/promises';
import { resolve, dirname, relative, sep } from 'node:path';
import { publicFiles, deploymentHTML } from './public-files.mjs';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');
await mkdir(output, { recursive: true });

// Remove stale generated files individually; source folders are never touched.
async function removeStaleFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (!file.startsWith(output + sep)) throw new Error('Cleanup outside build directory');
    if (entry.isSymbolicLink()) throw new Error('Build directory must not contain symbolic links');
    if (entry.isDirectory()) await removeStaleFiles(file);
    else if (!publicFiles.has(relative(output, file).split(sep).join('/'))) await rm(file);
  }
}
await removeStaleFiles(output);
for (const [route, source] of publicFiles) {
  const destination = resolve(output, route);
  await mkdir(dirname(destination), { recursive: true });
  if (route.endsWith('.html')) {
    await writeFile(destination, deploymentHTML(route, await readFile(resolve(root, source), 'utf8')));
  } else await copyFile(resolve(root, source), destination);
}
console.log(`Built ${publicFiles.size} approved public files in dist/. No source documents are included.`);
