import { createDefaultState, loadState, saveState } from './storage.js';
import { renderWidget } from './widgets.js';
import { openModal, closeModal } from './modal.js';
import { toast } from './toast.js';
import { enableDragDrop } from './dragdrop.js';

let state = loadState();
const statuses = new Map();
const dashboard = document.querySelector('#dashboard');
const empty = document.querySelector('#empty-state');
const count = document.querySelector('#widget-count');
const countLabel = document.querySelector('#widget-count-label');
const themeToggle = document.querySelector('#theme-toggle');
const themeLabel = document.querySelector('#theme-label');
const types = [
  { type: 'note', icon: '✎', label: 'Текстовая заметка', hint: 'Идеи, мысли, заметки' },
  { type: 'counter', icon: '＃', label: 'Счётчик', hint: 'Числа и показатели' },
  { type: 'todo', icon: '☑', label: 'Список задач', hint: 'Планы и чек-листы' },
  { type: 'chart', icon: '▥', label: 'Столбчатый график', hint: 'Визуализация данных' }
];
const byId = id => state.widgets.find(widget => widget.id === id);
function persist() { if (!saveState(state)) toast('Не удалось сохранить данные. Проверьте настройки браузера.', 'error'); }
function plural(n) { return n % 10 === 1 && n % 100 !== 11 ? 'виджет' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'виджета' : 'виджетов'); }
function refresh() {
  dashboard.replaceChildren(...state.widgets.map(widget => renderWidget(widget, statuses)));
  empty.hidden = state.widgets.length !== 0;
  count.textContent = state.widgets.length;
  countLabel.textContent = plural(state.widgets.length);
}
function updateTheme() {
  document.documentElement.dataset.theme = state.theme;
  themeToggle.checked = state.theme === 'dark';
  themeLabel.textContent = state.theme === 'dark' ? 'Тёмная' : 'Светлая';
  document.querySelector('meta[name="theme-color"]').content = state.theme === 'dark' ? '#10131e' : '#f6f8fc';
}
function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function formInput(labelText, type = 'text', value = '', name = 'title') {
  const label = element('label', 'field-label', labelText);
  const input = element('input', 'field-input');
  input.type = type; input.value = value; input.name = name;
  if (name === 'title') { input.required = true; input.maxLength = 80; }
  label.append(input);
  return { label, input };
}
function parseValues(value) {
  const parts = value.split(/[,;\s]+/).filter(Boolean);
  if (!parts.length || parts.length > 12) return null;
  const numbers = parts.map(Number);
  if (numbers.some(n => !Number.isFinite(n) || n < 0 || n > 1000000)) return null;
  return numbers;
}
function showFieldError(form, message) {
  let msg = form.querySelector('.field-error');
  if (!msg) { msg = element('p', 'field-error'); msg.setAttribute('role', 'alert'); form.insertBefore(msg, form.lastElementChild); }
  msg.textContent = message;
}
function footerButtons(form, accept = 'Сохранить', danger = false) {
  const actions = element('div', 'modal-actions');
  const cancel = element('button', 'button button-quiet', 'Отмена'); cancel.type = 'button'; cancel.addEventListener('click', closeModal);
  const submit = element('button', `button ${danger ? 'button-danger' : 'button-primary'}`, accept); submit.type = 'submit';
  actions.append(cancel, submit); form.append(actions);
}
function newWidget(type, title, values) {
  const data = { note: () => ({ text: '' }), counter: () => ({ value: 0, step: 1 }), todo: () => ({ items: [] }), chart: () => ({ values }) }[type]();
  return { id: crypto.randomUUID(), type, title, collapsed: false, data };
}

function openAddWidget() {
  openModal({ heading: 'Новый виджет', description: 'Выберите тип карточки и задайте название.', render(content) {
    const form = element('form', 'widget-form');
    const grid = element('div', 'type-grid');
    types.forEach(({ type, icon, label, hint }, index) => {
      const option = element('label', 'type-option');
      const radio = element('input'); radio.type = 'radio'; radio.name = 'type'; radio.value = type; radio.checked = index === 0;
      const graphic = element('span', 'type-option-icon', icon);
      const text = element('span', 'type-option-copy'); text.append(element('strong', '', label), element('small', '', hint));
      option.append(radio, graphic, text); grid.append(option);
    });
    const title = formInput('Название виджета'); title.input.placeholder = 'Например, Мои планы';
    title.input.autofocus = true;
    const chartField = formInput('Значения графика (через запятую)', 'text', '12, 24, 18, 35, 28', 'values');
    chartField.label.classList.add('conditional-field'); chartField.label.hidden = true;
    chartField.input.placeholder = '10, 20, 30';
    grid.addEventListener('change', () => { chartField.label.hidden = form.elements.type.value !== 'chart'; });
    form.append(grid, title.label, chartField.label);
    footerButtons(form, '＋ Добавить виджет');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const type = form.elements.type.value;
      const titleText = title.input.value.trim();
      if (!titleText) { showFieldError(form, 'Введите непустой заголовок.'); title.input.focus(); return; }
      let values = [];
      if (type === 'chart') {
        values = parseValues(chartField.input.value);
        if (!values) { showFieldError(form, 'Укажите от 1 до 12 неотрицательных чисел (не более 1 000 000).'); chartField.input.focus(); return; }
      }
      const widget = newWidget(type, titleText, values);
      state.widgets.push(widget);
      if (type === 'chart') statuses.set(widget.id, 'loading');
      persist(); refresh(); closeModal(); toast('Виджет добавлен');
      if (type === 'chart') loadChart(widget.id);
    });
    content.append(form);
  } });
}

function openReset() {
  openModal({ heading: 'Сбросить дашборд?', description: 'Все виджеты и их содержимое будут удалены. Отменить действие не получится. Тема оформления сохранится.', render(content) {
    const form = element('form', 'widget-form');
    footerButtons(form, 'Удалить все виджеты', true);
    form.addEventListener('submit', e => {
      e.preventDefault();
      state.widgets = []; statuses.clear(); persist(); refresh(); closeModal(); toast('Сброс выполнен');
    });
    content.append(form);
  } });
}

function editChart(widget) {
  openModal({ heading: 'Данные графика', description: 'Введите от 1 до 12 чисел через запятую, пробел или точку с запятой.', render(content) {
    const form = element('form', 'widget-form');
    const field = formInput('Значения столбцов', 'text', widget.data.values.join(', '), 'values'); field.input.autofocus = true;
    form.append(field.label); footerButtons(form);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const values = parseValues(field.input.value);
      if (!values) { showFieldError(form, 'Нужны 1–12 чисел от 0 до 1 000 000.'); return; }
      const current = byId(widget.id);
      if (current) { current.data.values = values; statuses.set(widget.id, 'ready'); persist(); refresh(); toast('График обновлён'); }
      closeModal();
    }); content.append(form);
  } });
}

function loadChart(id) {
  if (!byId(id)) return;
  statuses.set(id, 'loading'); refresh();
  // Имитация асинхронного API. Ошибка возникает примерно в 15% запросов.
  new Promise((resolve, reject) => setTimeout(() => Math.random() < 0.15 ? reject(new Error('Network error')) : resolve(), 500 + Math.floor(Math.random() * 501)))
    .then(() => { if (!byId(id)) return; statuses.set(id, 'ready'); refresh(); })
    .catch(() => { if (!byId(id)) return; statuses.set(id, 'error'); refresh(); toast('Ошибка загрузки графика', 'error'); });
}

function inlineEdit(article, widget, field) {
  if (article.querySelector('.inline-editor')) return;
  const isTitle = field === 'title';
  const target = article.querySelector(isTitle ? '[data-role="title"]' : '[data-role="note-text"]');
  if (!target) return;
  const editor = document.createElement(isTitle ? 'input' : 'textarea');
  editor.className = `inline-editor ${isTitle ? 'inline-title' : 'inline-note'}`;
  editor.value = isTitle ? widget.title : widget.data.text;
  editor.maxLength = isTitle ? 80 : 10000;
  if (!isTitle) editor.rows = 6;
  editor.setAttribute('aria-label', isTitle ? 'Новое название виджета' : 'Текст заметки');
  target.replaceWith(editor); editor.focus(); editor.select();
  let finished = false;
  function finish(commit) {
    if (finished) return;
    finished = true;
    const value = editor.value.trim();
    if (commit && (!isTitle || value)) {
      if (isTitle) widget.title = value; else widget.data.text = editor.value;
      persist();
    } else if (commit && isTitle) toast('Заголовок не может быть пустым', 'error');
    refresh();
  }
  editor.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    if (isTitle && e.key === 'Enter' || !isTitle && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); finish(true); }
  });
  editor.addEventListener('blur', () => finish(true));
}

function moveByKeyboard(id, direction) {
  const index = state.widgets.findIndex(w => w.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= state.widgets.length) return;
  [state.widgets[index], state.widgets[next]] = [state.widgets[next], state.widgets[index]];
  persist(); refresh();
  dashboard.querySelector(`[data-id="${id}"] .${direction < 0 ? 'keyboard-move' : 'keyboard-move'}:nth-of-type(${direction < 0 ? 2 : 3})`)?.focus();
  toast('Порядок виджетов изменён');
}

function handleAction(e) {
  const button = e.target.closest('button[data-action]');
  if (!button) return;
  const article = button.closest('.widget');
  const widget = article && byId(article.dataset.id);
  if (!widget) return;
  switch (button.dataset.action) {
    case 'delete-widget': state.widgets = state.widgets.filter(w => w.id !== widget.id); statuses.delete(widget.id); persist(); refresh(); toast('Виджет удалён'); break;
    case 'collapse': widget.collapsed = !widget.collapsed; persist(); refresh(); break;
    case 'edit-title': inlineEdit(article, widget, 'title'); break;
    case 'edit-note': inlineEdit(article, widget, 'note'); break;
    case 'increment': widget.data.value += widget.data.step; persist(); refresh(); break;
    case 'decrement': widget.data.value -= widget.data.step; persist(); refresh(); break;
    case 'delete-task': widget.data.items = widget.data.items.filter(item => item.id !== button.closest('[data-task-id]').dataset.taskId); persist(); refresh(); break;
    case 'edit-chart': editChart(widget); break;
    case 'retry-chart': loadChart(widget.id); break;
    case 'move-backward': moveByKeyboard(widget.id, -1); break;
    case 'move-forward': moveByKeyboard(widget.id, 1); break;
  }
}

dashboard.addEventListener('click', handleAction);
dashboard.addEventListener('dblclick', e => {
  const article = e.target.closest('.widget');
  if (!article) return;
  const widget = byId(article.dataset.id);
  if (e.target.closest('[data-role="title"]')) inlineEdit(article, widget, 'title');
  else if (e.target.closest('[data-role="note-text"]')) inlineEdit(article, widget, 'note');
});
dashboard.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-role="title"], [data-role="note-text"]')) {
    e.preventDefault();
    inlineEdit(e.target.closest('.widget'), byId(e.target.closest('.widget').dataset.id), e.target.dataset.role === 'title' ? 'title' : 'note');
  }
});
dashboard.addEventListener('change', e => {
  const widget = byId(e.target.closest('.widget')?.dataset.id);
  if (!widget) return;
  if (e.target.matches('[data-role="step"]')) {
    const step = Number(e.target.value);
    if (!Number.isSafeInteger(step) || step < 1 || step > 1000000) { e.target.value = widget.data.step; toast('Шаг должен быть целым числом от 1 до 1 000 000', 'error'); return; }
    widget.data.step = step; persist();
  } else if (e.target.matches('[data-role="task-toggle"]')) {
    const item = widget.data.items.find(x => x.id === e.target.closest('[data-task-id]').dataset.taskId);
    if (item) { item.done = e.target.checked; persist(); refresh(); }
  }
});
dashboard.addEventListener('submit', e => {
  if (!e.target.matches('[data-role="task-form"]')) return;
  e.preventDefault();
  const widget = byId(e.target.closest('.widget').dataset.id);
  const text = e.target.querySelector('input').value.trim();
  if (!widget || !text) { toast('Введите текст задачи', 'error'); return; }
  widget.data.items.push({ id: crypto.randomUUID(), text, done: false });
  persist(); refresh();
  dashboard.querySelector(`[data-id="${widget.id}"] .task-form input`)?.focus();
});

enableDragDrop(dashboard, ids => {
  const order = new Map(ids.map((id, i) => [id, i]));
  state.widgets.sort((a, b) => order.get(a.id) - order.get(b.id));
  persist(); refresh(); toast('Порядок виджетов сохранён');
});
document.querySelector('#add-widget').addEventListener('click', openAddWidget);
document.querySelector('#empty-add').addEventListener('click', openAddWidget);
document.querySelector('#reset-dashboard').addEventListener('click', openReset);
themeToggle.addEventListener('change', () => { state.theme = themeToggle.checked ? 'dark' : 'light'; updateTheme(); persist(); });
updateTheme(); refresh();
