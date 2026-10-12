(() => {
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const groups = [];
  document.querySelectorAll('[data-photo-rotator]').forEach((element, groupIndex) => {
    const slides = [...element.querySelectorAll('[data-photo-slide]')];
    if (slides.length < 2) return;
    const controls = element.querySelector('.photo-controls');
    const previous = element.querySelector('[data-photo-previous]');
    const next = element.querySelector('[data-photo-next]');
    const toggle = element.querySelector('[data-photo-toggle]');
    const counter = element.querySelector('[data-photo-counter]');
    const status = element.querySelector('[data-photo-status]');
    let index = 0;
    let paused = false;
    let hovering = false;
    let focused = false;
    let visible = !('IntersectionObserver' in window);
    let timer;
    let touchStart;
    let suppressClickUntil = 0;
    const delay = 8000 + groupIndex * 650;
    const globallyStopped = () => reducedMotion.matches || root.dataset.motion === 'paused';
    const canRotate = () => !paused && !hovering && !focused && visible && !document.hidden && !globallyStopped() && !document.querySelector('dialog[open]');
    function warmNext() {
      if (!visible) return;
      const image = slides[(index + 1) % slides.length].querySelector('img');
      if (image) image.loading = 'eager';
    }
    function refresh() {
      clearTimeout(timer);
      timer = undefined;
      const stopped = paused || globallyStopped();
      toggle.textContent = stopped ? 'Play' : 'Pause';
      toggle.setAttribute('aria-label', `${stopped ? 'Start' : 'Pause'} automatic photo rotation: ${element.getAttribute('aria-label')}`);
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.disabled = globallyStopped();
      if (globallyStopped()) toggle.setAttribute('aria-label', 'Automatic rotation is off in your motion settings');
      warmNext();
      if (canRotate()) timer = setTimeout(() => show(index + 1), delay);
    }
    function show(target, manual = false) {
      const activeHadFocus = slides[index] === document.activeElement;
      index = (target + slides.length) % slides.length;
      slides.forEach((slide, position) => {
        slide.hidden = position !== index;
        slide.classList.toggle('photo-enter', position === index);
      });
      const image = slides[index].querySelector('img');
      if (image && (visible || manual)) image.loading = 'eager';
      counter.textContent = `${index + 1} / ${slides.length}`;
      if (manual) {
        paused = true;
        status.textContent = `${element.getAttribute('aria-label')}: photograph ${index + 1} of ${slides.length}. ${image?.alt || ''}`;
        if (activeHadFocus) slides[index].focus({ preventScroll: true });
      }
      refresh();
    }
    previous.addEventListener('click', () => show(index - 1, true));
    next.addEventListener('click', () => show(index + 1, true));
    toggle.addEventListener('click', () => { paused = !paused; refresh(); });
    element.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovering = true; refresh(); } });
    element.addEventListener('pointerleave', () => { hovering = false; refresh(); });
    element.addEventListener('focusin', () => { focused = true; refresh(); });
    element.addEventListener('focusout', event => { focused = element.contains(event.relatedTarget); refresh(); });
    element.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1), true);
    });
    element.addEventListener('touchstart', event => {
      if (event.touches.length !== 1 || event.target.closest('.photo-controls')) { touchStart = undefined; return; }
      const touch = event.touches[0]; touchStart = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });
    element.addEventListener('touchend', event => {
      if (!touchStart || !event.changedTouches.length) return;
      const touch = event.changedTouches[0], dx = touch.clientX - touchStart.x, dy = touch.clientY - touchStart.y;
      touchStart = undefined;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        suppressClickUntil = Date.now() + 450;
        show(index + (dx < 0 ? 1 : -1), true);
      }
    }, { passive: true });
    element.addEventListener('touchcancel', () => { touchStart = undefined; });
    element.addEventListener('click', event => {
      if (Date.now() < suppressClickUntil && !event.target.closest('.photo-controls')) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    controls.hidden = false;
    element.dataset.photoReady = 'true';
    show(0);
    const group = { refresh, setVisible(value) { visible = value; refresh(); } };
    groups.push(group);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => entries.forEach(entry => group.setVisible(entry.isIntersecting)), { threshold: .12 });
      observer.observe(element);
    }
  });
  const refreshAll = () => groups.forEach(group => group.refresh());
  reducedMotion.addEventListener('change', refreshAll);
  document.addEventListener('visibilitychange', refreshAll);
  document.addEventListener('drlong:gallerychange', refreshAll);
  if ('MutationObserver' in window) new MutationObserver(refreshAll).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
})();
