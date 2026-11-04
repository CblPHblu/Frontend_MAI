const typeLabels = { note: 'ЗАМЕТКА', counter: 'СЧЁТЧИК', todo: 'СПИСОК ЗАДАЧ', chart: 'ГРАФИК' };
const typeIcons = { note: '✎', counter: '＃', todo: '☑', chart: '▥' };

function node(tag, className = '', text = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== '') el.textContent = text;
  return el;
}
function button(text, action, label = text, cls = 'icon-button') {
  const el = node('button', cls, text);
  el.type = 'button';
  el.dataset.action = action;
  el.setAttribute('aria-label', label);
  return el;
}

function renderNote(widget, body) {
  const text = node('p', 'note-text', widget.data.text || 'Дважды нажмите, чтобы добавить текст…');
  text.dataset.role = 'note-text';
  text.title = 'Двойной клик для редактирования';
  text.tabIndex = 0;
  body.append(text, button('✎ Редактировать', 'edit-note', 'Редактировать заметку', 'text-button'));
}

function renderCounter(widget, body) {
  const outer = node('div', 'counter-body');
  const value = node('output', 'counter-value', String(widget.data.value));
  value.setAttribute('aria-label', `Значение счётчика: ${widget.data.value}`);
  const controls = node('div', 'counter-actions');
  controls.append(button('−', 'decrement', 'Уменьшить счётчик', 'round-button'), button('+', 'increment', 'Увеличить счётчик', 'round-button'));
  outer.append(value, controls);
  const settings = node('label', 'step-label', 'Шаг изменения');
  const input = document.createElement('input');
  input.type = 'number'; input.min = '1'; input.max = '1000000'; input.step = '1'; input.value = widget.data.step;
  input.dataset.role = 'step'; input.setAttribute('aria-label', 'Шаг счётчика');
  settings.append(input);
  body.append(outer, settings);
}

function renderTodo(widget, body) {
  const total = widget.data.items.length;
  const done = widget.data.items.filter(item => item.done).length;
  const progress = node('div', 'task-progress', `${done} из ${total} выполнено`);
  const track = node('div', 'progress-track');
  const fill = node('div', 'progress-fill'); fill.style.width = `${total ? done / total * 100 : 0}%`;
  track.append(fill); body.append(progress, track);
  const list = node('ul', 'task-list');
  for (const item of widget.data.items) {
    const li = node('li', `task-item ${item.done ? 'task-done' : ''}`);
    li.dataset.taskId = item.id;
    const label = node('label', 'task-label');
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = item.done; check.dataset.role = 'task-toggle';
    const text = node('span', '', item.text);
    label.append(check, text);
    li.append(label, button('×', 'delete-task', `Удалить задачу «${item.text}»`));
    list.append(li);
  }
  body.append(list);
  const form = node('form', 'task-form'); form.dataset.role = 'task-form';
  const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'Новая задача…'; input.maxLength = 160; input.required = true;
  input.setAttribute('aria-label', 'Название новой задачи');
  const add = node('button', 'task-add', '＋'); add.type = 'submit'; add.setAttribute('aria-label', 'Добавить задачу');
  form.append(input, add); body.append(form);
}

function renderChart(widget, body, chartStatus) {
  const status = chartStatus?.get(widget.id) ?? 'ready';
  if (status === 'loading') {
    const loading = node('div', 'chart-loading'); loading.setAttribute('role', 'status');
    const spinner = node('span', 'spinner'); spinner.setAttribute('aria-hidden', 'true');
    loading.append(spinner, node('span', '', 'Загружаем данные графика…'));
    body.append(loading); return;
  }
  if (status === 'error') {
    const error = node('div', 'chart-error'); error.setAttribute('role', 'alert');
    error.append(node('p', '', 'Не удалось загрузить данные.'), button('↻ Повторить', 'retry-chart', 'Повторить загрузку графика', 'text-button'));
    body.append(error); return;
  }
  const values = widget.data.values;
  const max = Math.max(1, ...values);
  const chart = node('div', 'bar-chart'); chart.setAttribute('role', 'img');
  chart.setAttribute('aria-label', `Столбчатый график. Значения: ${values.join(', ')}`);
  values.forEach((value, index) => {
    const group = node('div', 'bar-group');
    const val = node('span', 'bar-value', String(value));
    const bar = node('div', 'bar'); bar.style.height = `${Math.max(2, value / max * 100)}%`; bar.title = `Столбец ${index + 1}: ${value}`;
    const label = node('span', 'bar-label', String(index + 1).padStart(2, '0'));
    group.append(val, bar, label); chart.append(group);
  });
  const actions = node('div', 'chart-actions');
  actions.append(node('span', 'chart-legend', `${values.length} значений`), button('✎ Изменить данные', 'edit-chart', 'Изменить значения графика', 'text-button'));
  body.append(chart, actions);
}

export function renderWidget(widget, chartStatus) {
  const article = node('article', `widget widget-${widget.type}${widget.collapsed ? ' is-collapsed' : ''}`);
  article.dataset.id = widget.id;
  article.draggable = true;
  article.setAttribute('aria-label', `${typeLabels[widget.type]}: ${widget.title}`);

  const header = node('header', 'widget-header');
  const identity = node('div', 'widget-identity');
  const type = node('div', 'widget-type');
  type.append(node('span', 'type-icon', typeIcons[widget.type]), node('span', '', typeLabels[widget.type]));
  const headingRow = node('div', 'widget-heading-row');
  const heading = node('h2', 'widget-title', widget.title); heading.dataset.role = 'title'; heading.title = 'Двойной клик для изменения названия';
  heading.tabIndex = 0;
  headingRow.append(heading, button('✎', 'edit-title', `Переименовать виджет ${widget.title}`, 'title-edit'));
  identity.append(type, headingRow);
  const tools = node('div', 'widget-tools');
  const handle = button('⠿', 'drag-handle', 'Перетащить виджет. Для клавиатуры используйте кнопки перемещения.', 'icon-button drag-handle');
  handle.title = 'Перетащить';
  const left = button('←', 'move-backward', 'Переместить виджет назад', 'icon-button keyboard-move');
  const right = button('→', 'move-forward', 'Переместить виджет вперёд', 'icon-button keyboard-move');
  const collapse = button(widget.collapsed ? '▢' : '−', 'collapse', widget.collapsed ? 'Развернуть виджет' : 'Свернуть виджет');
  collapse.setAttribute('aria-expanded', String(!widget.collapsed));
  const remove = button('×', 'delete-widget', `Удалить виджет ${widget.title}`);
  tools.append(handle, left, right, collapse, remove);
  header.append(identity, tools); article.append(header);
  if (!widget.collapsed) {
    const body = node('div', 'widget-body');
    switch (widget.type) {
      case 'note': renderNote(widget, body); break;
      case 'counter': renderCounter(widget, body); break;
      case 'todo': renderTodo(widget, body); break;
      case 'chart': renderChart(widget, body, chartStatus); break;
    }
    article.append(body);
  }
  return article;
}
