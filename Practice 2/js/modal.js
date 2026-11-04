const root = document.querySelector('#modal-root');
const dialog = root.querySelector('.modal');
const title = root.querySelector('#modal-title');
const description = root.querySelector('#modal-description');
const content = root.querySelector('#modal-content');
const closeButton = root.querySelector('#modal-close');
let previousFocus = null;
let cleanupCallback = null;
const selector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function handleKeys(event) {
  if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
  if (event.key !== 'Tab') return;
  const elements = [...dialog.querySelectorAll(selector)].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
  if (!elements.length) { event.preventDefault(); dialog.focus(); return; }
  const first = elements[0], last = elements.at(-1);
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

export function openModal({ heading, description: text = '', render, onClose }) {
  if (!root.hidden) closeModal();
  previousFocus = document.activeElement;
  cleanupCallback = onClose || null;
  title.textContent = heading;
  description.textContent = text;
  content.replaceChildren();
  render(content);
  root.hidden = false;
  document.body.classList.add('modal-open');
  document.addEventListener('keydown', handleKeys);
  requestAnimationFrame(() => (content.querySelector('[autofocus]') || dialog.querySelector(selector) || dialog).focus());
}

export function closeModal() {
  if (root.hidden) return;
  root.hidden = true;
  content.replaceChildren();
  document.body.classList.remove('modal-open');
  document.removeEventListener('keydown', handleKeys);
  cleanupCallback?.();
  cleanupCallback = null;
  if (previousFocus?.isConnected) previousFocus.focus();
  previousFocus = null;
}

closeButton.addEventListener('click', closeModal);
root.addEventListener('mousedown', event => { if (event.target === root) closeModal(); });
