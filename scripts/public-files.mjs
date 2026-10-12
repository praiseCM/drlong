// Only these reviewed files may be built or served. Never enumerate cm/ or pics/.
export const publicFiles = new Map([
  ['index.html', 'index.html'],
  ['cm/index.html', 'public-pages/cm/index.html'],
  ...['styles.css', 'photo-layout.css', 'photo-rotator.css', 'photo-rotator.js', 'app.js', 'cm.css', 'cm-theme.css', 'cm-visuals.css', 'cm.js', 'robots.txt', 'sitemap.xml', '_headers'].map(file => [file, file]),
  ...[
    'portrait.jpg', 'speaking.jpg', 'engagement-industry.jpg', 'engagement-global.jpg',
    'engagement-next-generation.jpg', 'favicon.svg', 'manrope-latin.woff2',
    'manrope-OFL.txt', 'praiser-emblem.png', 'sexsi-emblem.png'
  ].map(file => [`assets/${file}`, `assets/${file}`]),
  ...['cm-site-tour','cm-materials-demo','cm-site-walk','cm-project-tour','cm-industry-classroom']
    .flatMap(base => ['', '-480', '-960'].map(size => [`assets/${base}${size}.jpg`, `assets/${base}${size}.jpg`])),
  ...['engagement-vlu','engagement-aba','personal-campus-connections','personal-field-learning',
      'cm-road-site-tour','cm-trowel-demonstration','cm-materials-site-tour','cm-tiltup-site-tour',
      'cm-workshop-discussion','cm-interior-site-tour','cm-framing-demonstration']
    .flatMap(base => ['','-480','-960'].map(size => [`assets/${base}${size}.jpg`, `assets/${base}${size}.jpg`]))
]);

export function deploymentHTML(route, content) {
  if (route === 'index.html') return content.replaceAll('public-pages/cm/index.html', 'cm/');
  if (route === 'cm/index.html') return content.replaceAll('../../', '../');
  return content;
}
