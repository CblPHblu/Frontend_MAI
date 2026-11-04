// Native Drag Events for desktop + Touch Events for mobile devices.
export function enableDragDrop(container, onReorder) {
  let active = null;
  let placeholder = null;
  let isTouch = false;

  function makePlaceholder(article) {
    active = article;
    placeholder = document.createElement('div');
    placeholder.className = 'drop-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.style.minHeight = `${Math.max(65, Math.min(article.getBoundingClientRect().height, 180))}px`;
    active.after(placeholder);
    active.classList.add('is-dragging');
  }
  function position(clientX, clientY) {
    if (!active) return;
    const at = document.elementFromPoint(clientX, clientY)?.closest('.widget');
    if (!at || at === active || !container.contains(at)) return;
    const rect = at.getBoundingClientRect();
    const before = clientY < rect.top + rect.height / 2 || (Math.abs(clientY - (rect.top + rect.height / 2)) < 24 && clientX < rect.left + rect.width / 2);
    if (before) at.before(placeholder); else at.after(placeholder);
  }
  function finish(commit) {
    if (!active) return;
    if (commit && placeholder?.isConnected) placeholder.replaceWith(active);
    else placeholder?.remove();
    active.classList.remove('is-dragging');
    active = null; placeholder = null; isTouch = false;
    if (commit) onReorder([...container.querySelectorAll('.widget')].map(el => el.dataset.id));
  }

  container.addEventListener('dragstart', e => {
    const article = e.target.closest('.widget');
    if (!article || e.target.closest('button, input, textarea, label') && !e.target.closest('.drag-handle')) { e.preventDefault(); return; }
    if (active) finish(false);
    makePlaceholder(article);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', article.dataset.id);
  });
  container.addEventListener('dragover', e => {
    if (!active || isTouch) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    position(e.clientX, e.clientY);
  });
  container.addEventListener('drop', e => {
    if (!active || isTouch) return;
    e.preventDefault(); finish(true);
  });
  container.addEventListener('dragend', () => { if (!isTouch) finish(false); });

  container.addEventListener('touchstart', e => {
    const handle = e.target.closest('.drag-handle');
    if (!handle || active || e.touches.length !== 1) return;
    const article = handle.closest('.widget');
    if (!article) return;
    isTouch = true;
    makePlaceholder(article);
  }, { passive: true });
  container.addEventListener('touchmove', e => {
    if (!isTouch || !active) return;
    e.preventDefault();
    const t = e.touches[0];
    position(t.clientX, t.clientY);
  }, { passive: false });
  container.addEventListener('touchend', () => { if (isTouch) finish(true); });
  container.addEventListener('touchcancel', () => { if (isTouch) finish(false); });
}
