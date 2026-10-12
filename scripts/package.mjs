import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';
import { publicFiles } from './public-files.mjs';

// Fail closed unless the current build passes all public-file checks.
await import('./check.mjs');
const root = resolve(import.meta.dirname, '..');
const localParts = [];
const directoryParts = [];
let offset = 0;
const now = new Date();
const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
const dosDate = ((Math.max(1980, Math.min(2107, now.getFullYear())) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
for (const route of publicFiles.keys()) {
  const name = Buffer.from(route, 'utf8');
  const body = await readFile(resolve(root, 'dist', route));
  const compressed = deflateRawSync(body);
  const checksum = crc32(body);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x800, 6);
  local.writeUInt16LE(8, 8);
  local.writeUInt16LE(dosTime, 10);
  local.writeUInt16LE(dosDate, 12);
  local.writeUInt32LE(checksum, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(body.length, 22);
  local.writeUInt16LE(name.length, 26);
  localParts.push(local, name, compressed);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x800, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(dosTime, 12);
  central.writeUInt16LE(dosDate, 14);
  central.writeUInt32LE(checksum, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(body.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(offset, 42);
  directoryParts.push(central, name);
  offset += local.length + name.length + compressed.length;
}
const directory = Buffer.concat(directoryParts);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(publicFiles.size, 8);
end.writeUInt16LE(publicFiles.size, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);
await writeFile(resolve(root, 'drlong-website.zip'), Buffer.concat([...localParts, directory, end]));
console.log(`Created drlong-website.zip with ${publicFiles.size} approved public files and portable paths.`);
