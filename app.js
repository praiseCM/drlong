const root = document.documentElement;
const themeButton = document.querySelector('.theme-toggle');
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
let selectedTheme;
try { selectedTheme = localStorage.getItem('drlong-theme'); } catch {}
if (!['light', 'dark'].includes(selectedTheme)) selectedTheme = null;
function setTheme(theme, persist = false) {
  root.dataset.theme = theme;
  themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? (root.dataset.themeColorDark || '#171619') : (root.dataset.themeColorLight || '#f8f8f9');
  if (persist) { selectedTheme = theme; try { localStorage.setItem('drlong-theme', theme); } catch {} }
}
setTheme(root.dataset.theme || 'light');
themeButton.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true));
systemTheme.addEventListener('change', event => { if (!selectedTheme) setTheme(event.matches ? 'dark' : 'light'); });

const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
function closeMenu() { mobileMenu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open navigation'); }
menuButton.addEventListener('click', () => {
  const opening = menuButton.getAttribute('aria-expanded') !== 'true';
  mobileMenu.hidden = !opening;
  menuButton.setAttribute('aria-expanded', String(opening));
  menuButton.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation');
});
mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileMenu.hidden) { closeMenu(); menuButton.focus(); } });
document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
matchMedia('(min-width: 721px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

const filters = [...document.querySelectorAll('[data-filter]')];
const publications = [...document.querySelectorAll('.publication-row')];
function filterPublications(category) {
  filters.forEach(button => { const active = button.dataset.filter === category; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  let count = 0;
  publications.forEach(row => { row.hidden = category !== 'all' && row.dataset.category !== category; if (!row.hidden) count++; });
  document.querySelector('#filter-status').textContent = `${count} publication${count === 1 ? '' : 's'} shown.`;
}
filters.forEach(button => button.addEventListener('click', () => filterPublications(button.dataset.filter)));
document.querySelectorAll('[data-focus]').forEach(link => link.addEventListener('click', () => filterPublications(link.dataset.focus)));

const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = document.querySelector('.motion-toggle');
let motionPaused = false;
try { motionPaused = localStorage.getItem('drlong-motion') === 'paused'; } catch {}
function setMotion(paused) {
  motionPaused = paused;
  root.dataset.motion = paused ? 'paused' : 'enabled';
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.textContent = paused ? 'Resume motion' : 'Pause motion';
}
function syncMotionPreference() {
  motionButton.hidden = motionPreference.matches;
  setMotion(motionPaused);
}
syncMotionPreference();
motionPreference.addEventListener('change', syncMotionPreference);
motionButton.addEventListener('click', () => { setMotion(!motionPaused); try { localStorage.setItem('drlong-motion', motionPaused ? 'paused' : 'enabled'); } catch {} });
if ('IntersectionObserver' in window && !motionPreference.matches) {
  root.classList.add('reveal-ready');
  const revealObserver = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); } }); }, { threshold: 0.07, rootMargin: '0px 0px 25px 0px' });
  document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
  motionPreference.addEventListener('change', event => { if (event.matches) root.classList.remove('reveal-ready'); });
}
if ('IntersectionObserver' in window) {
  const navLinks = [...document.querySelectorAll('.desktop-links a')];
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) navLinks.forEach(link => { const active = link.hash === `#${entry.target.id}`; link.classList.toggle('is-current', active); if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); }); });
  }, { rootMargin: '-15% 0px -60% 0px', threshold: 0 });
  document.querySelectorAll('main section[id]').forEach(section => sectionObserver.observe(section));
}

let toastTimer;
function showToast(message) {
  const toast = document.querySelector('.toast');
  toast.textContent = message; toast.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}
document.querySelector('.copy-email')?.addEventListener('click', async () => {
  const email = 'lnguyen@fgcu.edu';
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(email);
    else {
      const input = document.createElement('textarea'); input.value = email; input.style.position = 'fixed'; input.style.opacity = '0'; document.body.append(input); input.select();
      let copied; try { copied = document.execCommand('copy'); } finally { input.remove(); document.querySelector('.copy-email').focus({ preventScroll: true }); }
      if (!copied) throw new Error('Clipboard unavailable');
    }
    showToast('Email address copied.');
  } catch { showToast('Email: lnguyen@fgcu.edu'); }
});
document.querySelector('#year').textContent = new Date().getFullYear();
