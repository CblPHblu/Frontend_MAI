export const STORAGE_KEY = 'pulseboard.dashboard';
export const SCHEMA_VERSION = 1;
const ALLOWED = new Set(['note', 'counter', 'todo', 'chart']);

export function createDefaultState() {
  return { version: SCHEMA_VERSION, theme: 'light', widgets: [] };
}

function validWidget(widget) {
  if (!widget || typeof widget !== 'object' || Array.isArray(widget)) return false;
  if (typeof widget.id !== 'string' || !widget.id || !ALLOWED.has(widget.type)) return false;
  if (typeof widget.title !== 'string' || !widget.title.trim() || typeof widget.collapsed !== 'boolean') return false;
  const d = widget.data;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return false;
  switch (widget.type) {
    case 'note': return typeof d.text === 'string';
    case 'counter': return Number.isSafeInteger(d.value) && Number.isSafeInteger(d.step) && d.step > 0;
    case 'todo': return Array.isArray(d.items) && d.items.every(item => item && typeof item.id === 'string' && typeof item.text === 'string' && typeof item.done === 'boolean');
    case 'chart': return Array.isArray(d.values) && d.values.length >= 1 && d.values.length <= 12 && d.values.every(n => Number.isFinite(n) && n >= 0 && n <= 1e6);
    default: return false;
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    // Не пытаемся угадать формат старой версии: безопасно откатываемся к пустому состоянию.
    if (!parsed || parsed.version !== SCHEMA_VERSION || !['light', 'dark'].includes(parsed.theme) || !Array.isArray(parsed.widgets)) {
      return createDefaultState();
    }
    const ids = parsed.widgets.map(w => w?.id);
    if (new Set(ids).size !== ids.length || !parsed.widgets.every(validWidget)) return createDefaultState();
    return { version: SCHEMA_VERSION, theme: parsed.theme, widgets: parsed.widgets };
  } catch (error) {
    console.warn('Не удалось восстановить дашборд:', error);
    return createDefaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    // Блокированный localStorage / переполненная квота не должны ронять приложение.
    console.warn('Не удалось сохранить дашборд:', error);
    return false;
  }
}
