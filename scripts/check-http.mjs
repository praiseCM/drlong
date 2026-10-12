import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { publicFiles, deploymentHTML } from './public-files.mjs';

const root = resolve(import.meta.dirname, '..');
const base = process.argv[2] || 'http://127.0.0.1:4173';
for (const [route, source] of publicFiles) {
  const response = await fetch(`${base}/${route}`);
  assert.equal(response.status, 200, `Approved route unavailable: ${route}`);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const expected = await readFile(resolve(root, source));
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), route.endsWith('.html') ? Buffer.from(deploymentHTML(route, expected.toString('utf8'))) : expected, `Wrong response: ${route}`);
}
for (const route of ['/', '/cm/', '/cm']) {
  const response = await fetch(base + route);
  assert.equal(response.status, 200, `Page route unavailable: ${route}`);
  const html = await response.text();
  assert(!html.includes('public-pages/cm/index.html'), 'Source path leaked into deployed navigation');
}
// Test the server boundary without reading any private source files.
const privateRoutes=[
  '/cm/private.xlsx', '/cm/internships.docx', '/cm/records.csv',
  '/pics/anything.jpg', '/assets/Long-Nguyen-Resume.docx',
  '/assets/community.jpg', '/public-pages/cm/index.html',
  '/.work/local.jpg', '/.git/config', '/.openai/hosting.json',
  '/scripts/build.mjs', '/package.json', '/cm/%70rivate.xlsx',
  '/cm/FGCU%20Tours-22.jpg', '/cm/20251104_143740106_iOS.heic',
  '/cm/FGCU_CM_Industry_Partner_Handout_Social_Media_Fall2026.docx',
  '/cm/FGCU_CM_Prospective_Student_Handout_Social_Media_Fall2026.docx',
  '/cm/CM_2027_Priorities_Moss.xlsx',
  '/cm/Academic_quality_improvement_plan_2026-2031.docx',
  '/pics/VLU-20251230-Seminar3.jpg',
  '/pics/12.jpg',
  '/pics/IMG_0159.jpeg',
  '/pics/IMG_0207.jpeg',
  '/cm/IMG_2194.jpeg', '/cm/IMG_6572.jpeg', '/cm/IMG_6807.jpeg',
  '/pics/_P5A4400.jpg', '/pics/20250417_140752066_iOS.heic',
  '/assets/personal-vlu-workshop.jpg', '/assets/cm-lab-learning.jpg', '/assets/cm-building.jpg',
  '/.work/cm-photo-review/contact-sheet.jpg'
];
for (const route of privateRoutes) {
  const response = await fetch(base + route);
  assert.equal(response.status, 404, `Private or unapproved route exposed: ${route}`);
  assert.equal(await response.text(), 'Not found');
}
const head = await fetch(`${base}/cm/`, { method: 'HEAD' });
assert.equal(head.status, 200);
assert.equal(await head.text(), '');
assert.equal((await fetch(`${base}/cm/`, { method: 'POST' })).status, 405);
console.log(`HTTP checks passed: approved files, homepage and CM routes, HEAD, and ${privateRoutes.length} private/unapproved paths blocked.`);
