import { readFile, access, readdir, lstat } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import assert from 'node:assert/strict';
import { publicFiles, deploymentHTML } from './public-files.mjs';

const root = resolve(import.meta.dirname, '..');
const pages = new Map();
const documentExtension = /\.(docx?|xlsx?|pptx?|pdf|csv|heic|zip)$/i;
for (const [route, source] of publicFiles) {
  assert(!documentExtension.test(route), `Document forbidden in public output: ${route}`);
  assert(!/^(cm|pics|\.work)\//.test(source), `Private source folder forbidden: ${source}`);
  assert(!(await lstat(resolve(root, source))).isSymbolicLink(), `Public source cannot be a symbolic link: ${source}`);
  await access(resolve(root, source));
  if (route.endsWith('.html')) {
    const html = deploymentHTML(route, await readFile(resolve(root, source), 'utf8'));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${route}: duplicate HTML IDs`);
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `${route}: exactly one main heading`);
    for (const image of html.matchAll(/<img\b[^>]*>/g)) {
      assert(/alt="[^"]*"/.test(image[0]), `${route}: image needs alt text`);
      if (/\bsrc="/.test(image[0])) assert(/width="\d+"/.test(image[0]) && /height="\d+"/.test(image[0]), `${route}: image needs dimensions`);
    }
    for (const link of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) assert(/rel="noopener noreferrer"/.test(link[0]), `${route}: unsafe external link`);
    pages.set(route, { html, ids });
  }
}

let references = 0;
for (const [route, { html }] of pages) {
    const urls=[...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map(match=>match[1]);
    for(const [,srcset]of html.matchAll(/\bsrcset="([^"]+)"/g)){
      for(const candidate of srcset.split(',')){
        const match=candidate.trim().match(/^(\S+)\s+(\d+)w$/);
        assert(match,`${route}: invalid responsive image candidate`);
        urls.push(match[1]);
      }
    }
    for (const url of urls) {
    if (/^(https?:|mailto:|tel:)/.test(url)) continue;
    const target = new URL(url, `https://local.test/${route}`);
    let targetRoute = decodeURIComponent(target.pathname.slice(1));
    if (!targetRoute || targetRoute.endsWith('/')) targetRoute += 'index.html';
    assert(publicFiles.has(targetRoute), `${route}: link exposes an unapproved file: ${url}`);
    if (target.hash) assert(pages.get(targetRoute)?.ids.includes(target.hash.slice(1)), `${route}: missing target: ${url}`);
    references++;
  }
}
for (const file of ['styles.css', 'photo-layout.css', 'photo-rotator.css', 'cm.css', 'cm-theme.css', 'cm-visuals.css']) {
  const css = await readFile(resolve(root, file), 'utf8');
  for (const [, url] of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)) {
    if (!url.startsWith('data:')) assert(publicFiles.has(url), `${file}: unapproved asset: ${url}`);
  }
}
const home = pages.get('index.html').html;
for (const required of ['https://praiser.us', 'https://sexsi.us', 'https://www.linkedin.com/in/long-nguyen-fgcu/', 'https://www.youtube.com/@DrLongN', 'https://www.youtube.com/@DrLongUS', 'https://www.fgcu.edu/directory/lnguyen', 'https://jaxkneppers.com/', 'https://ibbsconsulting.com/', 'https://tuanle.com.vn/', 'https://www.chuongduongcorp.vn/en-US/Default.aspx']) assert(home.includes(required), `Required link missing: ${required}`);
assert(!/href="[^"]*(?:resume|\.docx)/i.test(home), 'Resume download must not be published');
assert(home.includes('<strong>Practical</strong> <strong>AI</strong> for <strong>Sustaining</strong> <strong>Education</strong> and <strong>Research</strong>'), 'PRAISER word emphasis missing');
assert(home.includes('<strong>Sustaining</strong> <strong>Excellence</strong> with <strong>Super</strong> <strong>Intelligence</strong>'), 'SExSI word emphasis missing');
assert(home.includes('https://www.conic.vn/en-US/'), 'CONIC company link missing');
const cm = pages.get('cm/index.html').html;
const cmText = cm.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
assert(cmText.includes('The information on this page is provided for informational and reference purposes only. This page is not an official FGCU publication. Program requirements, policies, admissions information, and other official information should be verified through the official FGCU Construction Management website.'), 'Required publication disclaimer missing');
assert(!/(mailto:|tel:|\.docx|\.xlsx|\.pdf|\.csv)/i.test(cm), 'CM page must not link personal contacts or documents');
for(const url of ['https://www.linkedin.com/company/fgcu-cm/','https://www.instagram.com/fgcuconstructionmgt/','https://www.facebook.com/profile.php?id=61568686572836'])assert(cm.includes(`href="${url}"`),'Requested department social link missing');
assert(!cm.includes('stkn=')&&!cm.includes('utm_source='),'Do not publish social sharing/tracking tokens');

// JPEG metadata and actual dimensions are checked before any build is packaged.
const jpegSizes=new Map();
for(const [route,source]of publicFiles){
  if(!route.endsWith('.jpg'))continue;
  const bytes=await readFile(resolve(root,source));
  assert.equal(bytes.readUInt16BE(0),0xffd8,`${route}: invalid JPEG header`);
  let position=2;
  while(position<bytes.length){
    assert.equal(bytes[position++],0xff,`${route}: malformed JPEG marker`);
    while(bytes[position]===0xff)position++;
    const marker=bytes[position++];
    if(marker===0xda||marker===0xd9)break;
    assert(![0xe1,0xed,0xfe].includes(marker),`${route}: EXIF/XMP, IPTC, or comment metadata forbidden`);
    const length=bytes.readUInt16BE(position);
    assert(length>=2&&position+length<=bytes.length,`${route}: invalid JPEG segment`);
    if([0xc0,0xc1,0xc2].includes(marker))jpegSizes.set(route,{width:bytes.readUInt16BE(position+5),height:bytes.readUInt16BE(position+3)});
    position+=length;
  }
  assert(jpegSizes.has(route),`${route}: JPEG image dimensions unavailable`);
}
for(const [route,{html}]of pages)for(const [,tag]of html.matchAll(/(<img\b[^>]*\bsrc="[^>]+>)/g)){
  const url=tag.match(/\bsrc="([^"]+)"/)?.[1];
  const photoRoute=new URL(url,`https://local.test/${route}`).pathname.slice(1);
  const size=jpegSizes.get(photoRoute);if(!size)continue;
  assert.equal(Number(tag.match(/\bwidth="(\d+)"/)[1]),size.width,`${route}: image width does not match the approved file`);
  assert.equal(Number(tag.match(/\bheight="(\d+)"/)[1]),size.height,`${route}: image height does not match the approved file`);
  for(const candidate of (tag.match(/\bsrcset="([^"]+)"/)?.[1]||'').split(',').filter(Boolean)){
    const [url,width]=candidate.trim().split(/\s+/);
    const candidateSize=jpegSizes.get(new URL(url,`https://local.test/${route}`).pathname.slice(1));
    assert(candidateSize,'Responsive photograph is not an approved JPEG');
    assert.equal(candidateSize.width,Number(width.slice(0,-1)),'Responsive width descriptor does not match the photograph');
    assert(Math.abs(candidateSize.width/candidateSize.height-size.width/size.height)<.004,'Responsive photograph has a different aspect ratio');
  }
}

async function inspectOutput(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    assert(!entry.isSymbolicLink(), 'Output must not contain symbolic links');
    if (entry.isDirectory()) await inspectOutput(file);
    else assert(publicFiles.has(relative(resolve(root, 'dist'), file).split(sep).join('/')), `Unapproved build file: ${file}`);
  }
}
await inspectOutput(resolve(root, 'dist'));
for (const [route, source] of publicFiles) {
  const built = await readFile(resolve(root, 'dist', route));
  const expected = await readFile(resolve(root, source));
  assert.deepEqual(built, route.endsWith('.html') ? Buffer.from(deploymentHTML(route, expected.toString('utf8'))) : expected, `Stale or incorrect output: ${route}`);
}
console.log(`Passed: ${pages.size} pages, ${references} local references, disclaimer, requested links, and ${publicFiles.size} approved build files. No source documents included.`);
