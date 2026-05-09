import { listFilters, createFilter, deleteFilter, listLabels } from './api.js';

const root = document.getElementById('gmail-filters-root');

// ── State ────────────────────────────────────────────────────────────────────

let labels = [];
let filters = [];

// ── Render ───────────────────────────────────────────────────────────────────

function criteriaText(c) {
  const parts = [];
  if (c.from)        parts.push(`From: ${c.from}`);
  if (c.to)          parts.push(`To: ${c.to}`);
  if (c.subject)     parts.push(`Subject: ${c.subject}`);
  if (c.query)       parts.push(`Has: ${c.query}`);
  if (c.hasAttachment) parts.push('Has attachment');
  if (c.excludeChats)  parts.push('Exclude chats');
  return parts.join(' · ') || '(any)';
}

function actionText(a) {
  const parts = [];
  if (a.addLabelIds?.length)    parts.push(`Label: ${a.addLabelIds.map(id => labelName(id)).join(', ')}`);
  if (a.removeLabelIds?.includes('INBOX')) parts.push('Skip inbox');
  if (a.removeLabelIds?.includes('UNREAD')) parts.push('Mark read');
  if (a.removeLabelIds?.includes('SPAM'))   parts.push('Never spam');
  return parts.join(' · ') || '(no action)';
}

function labelName(id) {
  const l = labels.find(l => l.id === id);
  return l ? l.name : id;
}

function renderFilters() {
  const listEl = root.querySelector('#gf-list');
  if (!filters.length) {
    listEl.innerHTML = '<p class="gf-empty">No filters found.</p>';
    return;
  }
  listEl.innerHTML = filters.map(f => `
    <div class="gf-card" data-id="${f.id}">
      <div class="gf-card-body">
        <div class="gf-row"><span class="gf-badge">If</span> ${criteriaText(f.criteria || {})}</div>
        <div class="gf-row"><span class="gf-badge gf-badge-action">Then</span> ${actionText(f.action || {})}</div>
      </div>
      <button class="gf-delete-btn" data-id="${f.id}" title="Delete filter">&#10005;</button>
    </div>
  `).join('');

  listEl.querySelectorAll('.gf-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = '...';
      try {
        await deleteFilter(btn.dataset.id);
        filters = filters.filter(f => f.id !== btn.dataset.id);
        renderFilters();
      } catch (e) {
        showError(e.message);
        btn.disabled = false;
        btn.innerHTML = '&#10005;';
      }
    });
  });
}

function renderLabelOptions() {
  const sel = root.querySelector('#gf-add-label');
  const userLabels = labels.filter(l => l.type === 'user');
  sel.innerHTML = '<option value="">— none —</option>' +
    userLabels.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
}

function showError(msg) {
  const el = root.querySelector('#gf-error');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}

function showStatus(msg) {
  const el = root.querySelector('#gf-status');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}

// ── Init ─────────────────────────────────────────────────────────────────────

function buildShell() {
  root.innerHTML = `
    <div class="gf-header">
      <h2>Gmail Filters</h2>
      <button id="gf-refresh" class="gf-btn-secondary">Refresh</button>
    </div>

    <div id="gf-error" class="gf-error" style="display:none"></div>
    <div id="gf-status" class="gf-status" style="display:none"></div>

    <div id="gf-list" class="gf-list"><p class="gf-loading">Loading...</p></div>

    <details class="gf-create-box" id="gf-create-details">
      <summary>+ New filter</summary>
      <form id="gf-create-form" class="gf-form">
        <div class="gf-form-grid">
          <label>From <input name="from" placeholder="e.g. news@example.com"></label>
          <label>To <input name="to" placeholder="e.g. me@gmail.com"></label>
          <label>Subject <input name="subject" placeholder="keywords"></label>
          <label>Has words <input name="query" placeholder="keywords"></label>
        </div>
        <div class="gf-form-section">Actions</div>
        <div class="gf-form-checks">
          <label><input type="checkbox" name="skipInbox"> Skip inbox (archive)</label>
          <label><input type="checkbox" name="markRead"> Mark as read</label>
          <label><input type="checkbox" name="neverSpam"> Never send to spam</label>
        </div>
        <div class="gf-form-row">
          <label>Apply label
            <select name="addLabel" id="gf-add-label"><option value="">— none —</option></select>
          </label>
        </div>
        <div class="gf-form-actions">
          <button type="submit" class="gf-btn-primary">Create filter</button>
        </div>
      </form>
    </details>
  `;

  root.querySelector('#gf-refresh').addEventListener('click', loadData);

  root.querySelector('#gf-create-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const criteria = {};
    if (fd.get('from'))    criteria.from    = fd.get('from');
    if (fd.get('to'))      criteria.to      = fd.get('to');
    if (fd.get('subject')) criteria.subject = fd.get('subject');
    if (fd.get('query'))   criteria.query   = fd.get('query');

    if (!Object.keys(criteria).length) {
      showError('Add at least one filter criterion.');
      return;
    }

    const removeLabelIds = [];
    if (fd.get('skipInbox')) removeLabelIds.push('INBOX');
    if (fd.get('markRead'))  removeLabelIds.push('UNREAD');
    if (fd.get('neverSpam')) removeLabelIds.push('SPAM');

    const action = {};
    if (removeLabelIds.length) action.removeLabelIds = removeLabelIds;
    if (fd.get('addLabel'))    action.addLabelIds = [fd.get('addLabel')];

    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    try {
      const created = await createFilter(criteria, action);
      filters.push(created);
      renderFilters();
      e.target.reset();
      root.querySelector('#gf-create-details').removeAttribute('open');
      showStatus('Filter created.');
    } catch (err) {
      showError(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create filter';
    }
  });
}

async function loadData() {
  root.querySelector('#gf-list').innerHTML = '<p class="gf-loading">Loading...</p>';
  try {
    [filters, labels] = await Promise.all([listFilters(), listLabels()]);
    renderFilters();
    renderLabelOptions();
  } catch (e) {
    showError(e.message);
    root.querySelector('#gf-list').innerHTML = '';
  }
}

buildShell();
loadData();

// ── External hook: pre-fill from content script ───────────────────────────────
// options page opens with ?from=sender — auto-expand create form and fill it
const params = new URLSearchParams(location.search);
if (params.get('from')) {
  const details = root.querySelector('#gf-create-details');
  if (details) {
    details.open = true;
    const input = details.querySelector('input[name=from]');
    if (input) input.value = params.get('from');
  }
}
