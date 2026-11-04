const region = document.querySelector('#toast-region');

export function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  region.append(el);
  const remove = () => {
    el.classList.add('toast-exit');
    setTimeout(() => el.remove(), 200);
  };
  setTimeout(remove, 3000);
}
