const resourceInput = document.querySelector('#resource-search');
const resourceButtons = [...document.querySelectorAll('[data-resource-filter]')];
const resourceCards = [...document.querySelectorAll('.resource-card')];
let resourceCategory = 'all';
function updateResources() {
  const term = resourceInput.value.trim().toLocaleLowerCase();
  let count = 0;
  resourceCards.forEach(card => {
    const categories = card.dataset.resourceCategory.split(' ');
    card.hidden = (resourceCategory !== 'all' && !categories.includes(resourceCategory)) || !card.textContent.toLocaleLowerCase().includes(term);
    if (!card.hidden) count++;
  });
  document.querySelector('#resource-status').textContent = `${count} public resource${count === 1 ? '' : 's'} shown.`;
  document.querySelector('.resource-empty').hidden = count !== 0;
}
resourceInput.addEventListener('input', updateResources);
resourceButtons.forEach(button => button.addEventListener('click', () => {
  resourceCategory = button.dataset.resourceFilter;
  resourceButtons.forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
  updateResources();
}));
const galleryDialog = document.querySelector('.gallery-dialog');
const allGalleryItems = [...document.querySelectorAll('.gallery-item')];
let galleryItems = [];
let galleryOpener;
let galleryIndex = 0;
function showGalleryPhoto(index) {
  galleryIndex = (index + galleryItems.length) % galleryItems.length;
  const button = galleryItems[galleryIndex];
  const original = button.querySelector('img');
  const expanded = galleryDialog.querySelector('img');
  expanded.src = original.src; expanded.alt = original.alt;
  expanded.width = Number(original.getAttribute('width'));
  expanded.height = Number(original.getAttribute('height'));
  document.querySelector('#gallery-caption').textContent = button.dataset.galleryTitle || original.alt;
  document.querySelector('#gallery-description').textContent = button.dataset.galleryDescription || '';
  document.querySelector('#gallery-position').textContent = `${galleryIndex + 1} / ${galleryItems.length}`;
}
allGalleryItems.forEach(button => button.addEventListener('click', () => {
  const original = button.querySelector('img');
  if (typeof galleryDialog.showModal !== 'function') { window.open(original.src, '_blank', 'noopener,noreferrer'); return; }
  const category = button.closest('[data-photo-rotator]');
  galleryItems = category ? [...category.querySelectorAll('.gallery-item')] : allGalleryItems;
  document.querySelector('#gallery-category').textContent = category?.getAttribute('aria-label') || 'Learning in practice';
  showGalleryPhoto(galleryItems.indexOf(button));
  galleryOpener = button;
  galleryDialog.showModal();
  document.dispatchEvent(new CustomEvent('drlong:gallerychange'));
}));
galleryDialog.querySelector('.gallery-previous').addEventListener('click', () => showGalleryPhoto(galleryIndex - 1));
galleryDialog.querySelector('.gallery-next').addEventListener('click', () => showGalleryPhoto(galleryIndex + 1));
galleryDialog.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showGalleryPhoto(galleryIndex + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
galleryDialog.querySelector('.gallery-close').addEventListener('click', () => galleryDialog.close());
galleryDialog.addEventListener('click', event => { if (event.target === galleryDialog) { const rect = galleryDialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) galleryDialog.close(); } });
galleryDialog.addEventListener('close', () => {
  galleryOpener?.focus({ preventScroll: true });
  document.dispatchEvent(new CustomEvent('drlong:gallerychange'));
});
