(function () {
  'use strict';

  // ── Utilities ──────────────────────────────────────────────────────────────

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function parseOrList(str) {
    if (!str) return [];
    return str.split(/\s+OR\s+/i).map(s => s.trim()).filter(Boolean);
  }

  function orList(arr) {
    return arr.join(' OR ');
  }

  // ── Tag (chip) input ──────────────────────────────────────────────────────

  function chipInputHTML(name, values, placeholder) {
    const chips = values.map(v =>
      `<span class="andr-chip" data-value="${esc(v)}">${esc(v)}<button class="andr-chip-rm" type="button" tabindex="-1">×</button></span>`
    ).join('');
    return `<div class="andr-chip-input" data-name="${name}">
      ${chips}<input class="andr-chip-text" type="text" placeholder="${values.length ? '' : esc(placeholder)}">
    </div>`;
  }

  function wireChipInputs(root) {
    root.querySelectorAll('.andr-chip-input').forEach(box => {
      const textInput = box.querySelector('.andr-chip-text');

      box.addEventListener('click', e => {
        if (!e.target.classList.contains('andr-chip-rm')) textInput.focus();
      });

      box.addEventListener('click', e => {
        if (e.target.classList.contains('andr-chip-rm')) {
          e.target.closest('.andr-chip').remove();
          textInput.focus();
        }
      });

      textInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
          e.preventDefault();
          const val = textInput.value.replace(/,/g, '').trim();
          if (val) { addChip(box, textInput, val); }
        } else if (e.key === 'Backspace' && !textInput.value) {
          const chips = box.querySelectorAll('.andr-chip');
          if (chips.length) chips[chips.length - 1].remove();
        }
      });

      textInput.addEventListener('blur', () => {
        const val = textInput.value.replace(/,/g, '').trim();
        if (val) addChip(box, textInput, val);
      });
    });
  }

  function addChip(box, textInput, val) {
    const chip = document.createElement('span');
    chip.className = 'andr-chip';
    chip.dataset.value = val;
    chip.innerHTML = `${esc(val)}<button class="andr-chip-rm" type="button" tabindex="-1">×</button>`;
    box.insertBefore(chip, textInput);
    textInput.value = '';
    textInput.placeholder = '';
  }

  function readChipInput(root, name) {
    const box = root.querySelector(`.andr-chip-input[data-name="${name}"]`);
    if (!box) return '';
    const chips = Array.from(box.querySelectorAll('.andr-chip')).map(c => c.dataset.value);
    const pending = box.querySelector('.andr-chip-text')?.value?.trim();
    if (pending) chips.push(pending);
    return orList(chips);
  }

  function waitFor(check, cb, timeout = 8000, interval = 400) {
    const deadline = Date.now() + timeout;
    (function tick() {
      const v = check();
      if (v) { cb(v); return; }
      if (Date.now() < deadline) setTimeout(tick, interval);
    })();
  }

  function elByText(root, tags, text) {
    for (const el of root.querySelectorAll(tags)) {
      if (el.textContent.trim() === text) return el;
    }
    return null;
  }

  // ── Navigation detection ───────────────────────────────────────────────────

  let lastView = null;

  function currentView() {
    const h = location.hash;
    if (h.startsWith('#settings/filters')) return 'filters';
    if (h.match(/#[^/]+\/[a-zA-Z0-9]+$/) && !h.startsWith('#settings')) return 'email';
    return 'other';
  }

  function onNavigate() {
    const view = currentView();
    if (view !== lastView) {
      lastView = view;
      if (view === 'filters') {
        schedulePanel();
      } else {
        teardownPanel();
      }
    }
    if (view === 'email') injectEmailButton();
  }

  // Intercept SPA navigation
  const _push = history.pushState.bind(history);
  history.pushState = function (...a) { _push(...a); onNavigate(); };
  window.addEventListener('popstate', onNavigate);
  window.addEventListener('hashchange', onNavigate);

  // ── Filter settings page ───────────────────────────────────────────────────

  const PANEL_ID = 'andr-gf-panel';
  let hiddenSection = null;

  function schedulePanel() {
    if (document.getElementById(PANEL_ID)) return;
    waitFor(findFilterSection, injectPanel);
  }

  function teardownPanel() {
    const p = document.getElementById(PANEL_ID);
    if (p) p.remove();
    if (hiddenSection) { hiddenSection.style.display = ''; hiddenSection = null; }
  }

  function findFilterSection() {
    // Gmail renders each filter as a <tr> containing "Matches:" text
    const rows = Array.from(document.querySelectorAll('tr'))
      .filter(tr => tr.textContent.includes('Matches:'));
    if (!rows.length) {
      // Gmail might show an empty filters section — look for the container heading
      const container = Array.from(document.querySelectorAll('h2, .Im'))
        .find(el => /filter/i.test(el.textContent));
      return container ? { rows: [], container: container.closest('div, section') || container.parentElement } : null;
    }
    const container = rows[0].closest('table, tbody')?.parentElement || rows[0].parentElement;
    return { rows, container };
  }

  function parseRows(rows) {
    return rows.map((row, i) => {
      const text = row.textContent;

      const matchM = text.match(/Matches:\s*(.+?)(?:\s*Do this:|$)/s);
      const criteriaRaw = (matchM?.[1] || '').trim();

      const doM = text.match(/Do this:\s*(.+?)(?:\s*edit\s*delete|$)/si);
      const actionsRaw = (doM?.[1] || '').trim();

      // Parse criteria string into fields
      const criteria = {};
      const fromM = criteriaRaw.match(/from:\(([^)]+)\)/) || criteriaRaw.match(/from:(\S+)/);
      if (fromM) criteria.from = fromM[1];
      const toM   = criteriaRaw.match(/to:\(([^)]+)\)/)   || criteriaRaw.match(/to:(\S+)/);
      if (toM)   criteria.to   = toM[1];
      const subjM = criteriaRaw.match(/subject:\(([^)]+)\)/) || criteriaRaw.match(/subject:(\S+)/);
      if (subjM) criteria.subject = subjM[1];
      if (!Object.keys(criteria).length && criteriaRaw) criteria.query = criteriaRaw;

      // Parse action string
      const bareLabelName = (actionsRaw.match(/apply the label[:\s]+"?([^",\n]+)"?/i) ||
                             actionsRaw.match(/label[:\s]+"([^"]+)"/i))?.[1]?.trim() || '';
      const actions = {
        skipInbox: /skip the inbox|archive/i.test(actionsRaw),
        markRead:  /mark as read/i.test(actionsRaw),
        neverSpam: /never.*spam/i.test(actionsRaw),
        star:      /star it/i.test(actionsRaw),
        label:     enrichLabelName(bareLabelName, getLabelsFromDOM()),
      };

      const deleteEl = elByText(row, 'span, a, div[role="button"]', 'delete')
                    || elByText(row, 'span, a, div[role="button"]', 'Delete');
      const editEl   = elByText(row, 'span, a, div[role="button"]', 'edit')
                    || elByText(row, 'span, a, div[role="button"]', 'Edit');

      return { i, criteriaRaw, actionsRaw, criteria, actions, deleteEl, editEl, row };
    });
  }

  // ── Label helpers ─────────────────────────────────────────────────────────

  function getLabelsFromDOM() {
    const seen = new Set();
    const labels = [];

    document.querySelectorAll('a[href]').forEach(a => {
      if (!(a.getAttribute('href') || '').includes('#label/')) return;

      const href = a.getAttribute('href') || '';
      const hrefM = href.match(/#label\/(.+)/);
      if (!hrefM) return;

      const hrefPath   = decodeURIComponent(hrefM[1]).replace(/\+/g, ' ').trim();
      const hrefLeaf   = hrefPath.split('/').pop();
      const hrefParent = hrefPath.slice(0, hrefPath.length - hrefLeaf.length);

      // aria-label: "Job 💼, 9 conversations, expanded has menu" → "Job 💼"
      let display = (a.getAttribute('aria-label') || '')
        .replace(/,\s*\d.*$/, '')
        .trim();

      if (!display) {
        for (const el of a.querySelectorAll('*')) {
          if (el.children.length) continue;
          const t = el.textContent.trim();
          if (t && !/^\d+$/.test(t)) { display = t; break; }
        }
      }

      // If display is the leaf + emoji ("Docs 📄"), prepend parent path ("Stored/")
      const fullName = (display && display.toLowerCase().startsWith(hrefLeaf.toLowerCase()))
        ? hrefParent + display
        : (display || hrefPath);

      if (fullName && !seen.has(fullName)) { seen.add(fullName); labels.push(fullName); }
    });

    return labels;
  }

  // Match a bare label name against the full sidebar list (which may include emoji)
  function enrichLabelName(bare, allLabels) {
    if (!bare) return bare;
    const lower = bare.toLowerCase();
    // Exact match first
    const exact = allLabels.find(l => l.toLowerCase() === lower);
    if (exact) return exact;
    return allLabels.find(l => l.toLowerCase().startsWith(lower + ' ')) || bare;
  }

  function labelInputHTML(value) {
    return `<div class="andr-label-wrap">
      <input class="andr-label-input" name="label" value="${esc(value)}" placeholder="label name…" autocomplete="off">
      <ul class="andr-label-dropdown" style="display:none"></ul>
    </div>`;
  }

  function wireLabelInputs(root) {
    const allLabels = getLabelsFromDOM();
    root.querySelectorAll('.andr-label-wrap').forEach(wrap => {
      const input    = wrap.querySelector('.andr-label-input');
      const dropdown = wrap.querySelector('.andr-label-dropdown');
      let activeIdx  = -1;

      function showDropdown(matches) {
        if (!matches.length) { dropdown.style.display = 'none'; return; }
        dropdown.innerHTML = matches.map((l, i) =>
          `<li class="andr-label-opt" data-value="${esc(l)}">${esc(l)}</li>`
        ).join('');
        dropdown.style.display = 'block';
        activeIdx = -1;
      }

      function selectItem(li) {
        input.value = li.dataset.value;
        dropdown.style.display = 'none';
      }

      input.addEventListener('input', () => {
        const q = input.value.toLowerCase();
        showDropdown(q ? allLabels.filter(l => l.toLowerCase().includes(q)) : allLabels);
      });

      input.addEventListener('focus', () => {
        showDropdown(allLabels);
      });

      input.addEventListener('keydown', e => {
        const items = dropdown.querySelectorAll('.andr-label-opt');
        if (!items.length) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          activeIdx = Math.min(activeIdx + 1, items.length - 1);
          items.forEach((el, i) => el.classList.toggle('andr-label-opt-active', i === activeIdx));
          items[activeIdx]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          activeIdx = Math.max(activeIdx - 1, 0);
          items.forEach((el, i) => el.classList.toggle('andr-label-opt-active', i === activeIdx));
          items[activeIdx]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter' && activeIdx >= 0) {
          e.preventDefault();
          selectItem(items[activeIdx]);
        } else if (e.key === 'Escape') {
          dropdown.style.display = 'none';
        }
      });

      dropdown.addEventListener('mousedown', e => {
        const opt = e.target.closest('.andr-label-opt');
        if (opt) { e.preventDefault(); selectItem(opt); }
      });

      input.addEventListener('blur', () => {
        setTimeout(() => { dropdown.style.display = 'none'; }, 150);
      });
    });
  }

  function buildSearchQuery(d) {
    const parts = [];
    if (d.from)    parts.push(`from:(${d.from})`);
    if (d.to)      parts.push(`to:(${d.to})`);
    if (d.subject) parts.push(`subject:(${d.subject})`);
    if (d.query)   parts.push(d.query);
    return parts.join(' ');
  }

  function renderCardActions(a) {
    const parts = [];
    if (a.skipInbox) parts.push('Skip inbox');
    if (a.markRead)  parts.push('Mark as read');
    if (a.neverSpam) parts.push('Never spam');
    if (a.star)      parts.push('Star it');
    if (a.label)     parts.push(`Label: ${a.label}`);
    return parts.join(' · ') || '(no action)';
  }

  function filterForm(id, c, a) {
    const fromVals = parseOrList(c.from || '');
    const toVals   = parseOrList(c.to   || '');
    return `
      <div class="andr-form-grid andr-form-grid-tall">
        <label>From ${chipInputHTML('from', fromVals, 'sender@example.com')}</label>
        <label>To   ${chipInputHTML('to',   toVals,   'recipient@example.com')}</label>
        <label>Subject  <input name="subject"  value="${esc(c.subject || '')}"></label>
        <label>Has words <input name="query"   value="${esc(c.query   || '')}"></label>
      </div>
      <div class="andr-form-section">Actions</div>
      <div class="andr-form-checks">
        <label><input type="checkbox" name="skipInbox" ${a.skipInbox ? 'checked' : ''}> Skip inbox (archive)</label>
        <label><input type="checkbox" name="markRead"  ${a.markRead  ? 'checked' : ''}> Mark as read</label>
        <label><input type="checkbox" name="neverSpam" ${a.neverSpam ? 'checked' : ''}> Never send to spam</label>
        <label><input type="checkbox" name="star"      ${a.star      ? 'checked' : ''}> Star it</label>
      </div>
      <div class="andr-form-grid">
        <label>Apply label ${labelInputHTML(a.label || '')}</label>
      </div>`;
  }

  function injectPanel({ rows, container }) {
    if (document.getElementById(PANEL_ID)) return;

    const filters = parseRows(rows);

    // Hide Gmail's native section
    hiddenSection = container;
    container.style.display = 'none';

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'andr-gf-panel';

    panel.innerHTML = `
      <div class="andr-gf-header">
        <h2>Filters <span class="andr-gf-count">${filters.length}</span></h2>
        <div class="andr-gf-header-btns">
          <button class="andr-btn-ghost" id="andr-gf-show-native">Gmail view</button>
          <button class="andr-btn-primary" id="andr-gf-new">+ New filter</button>
        </div>
      </div>

      <div id="andr-gf-new-form" class="andr-gf-new-form" style="display:none">
        <div class="andr-gf-new-title">New filter</div>
        ${filterForm('new', {}, {})}
        <div class="andr-form-actions">
          <button class="andr-btn-primary"  id="andr-gf-new-submit">Create via Gmail</button>
          <button class="andr-btn-ghost"    id="andr-gf-new-cancel">Cancel</button>
        </div>
      </div>

      <div class="andr-gf-list">
        ${filters.length
          ? filters.map(f => `
            <div class="andr-gf-card" id="andr-card-${f.i}">
              <div class="andr-gf-card-top">
                <div class="andr-gf-card-meta">
                  <div class="andr-row">
                    <span class="andr-badge">If</span>
                    <span>${esc(f.criteriaRaw || '(any)')}</span>
                  </div>
                  <div class="andr-row">
                    <span class="andr-badge andr-badge-then">Then</span>
                    <span>${esc(renderCardActions(f.actions))}</span>
                  </div>
                </div>
                <div class="andr-gf-card-btns">
                  <button class="andr-btn-edit andr-btn-ghost" data-i="${f.i}">Edit</button>
                  <button class="andr-btn-del  andr-btn-danger" data-i="${f.i}">Delete</button>
                </div>
              </div>
              <div class="andr-gf-edit-panel" id="andr-edit-${f.i}" style="display:none">
                ${filterForm(f.i, f.criteria, f.actions)}
                <div class="andr-form-actions">
                  <button class="andr-btn-primary andr-btn-save" data-i="${f.i}">Save</button>
                  <button class="andr-btn-ghost   andr-btn-cancel" data-i="${f.i}">Cancel</button>
                </div>
                <p class="andr-save-hint">Save = delete this filter + create a new one through Gmail's wizard</p>
              </div>
            </div>`).join('')
          : '<p class="andr-gf-empty">No filters yet.</p>'
        }
      </div>`;

    container.insertAdjacentElement('beforebegin', panel);
    wireChipInputs(panel);
    wireLabelInputs(panel);
    wirePanel(panel, filters);
  }

  function readForm(container) {
    const v = name => container.querySelector(`[name="${name}"]`)?.value?.trim() || '';
    const c = name => container.querySelector(`[name="${name}"]`)?.checked || false;
    return {
      from:      readChipInput(container, 'from'),
      to:        readChipInput(container, 'to'),
      subject:   v('subject'),
      query:     v('query'),
      skipInbox: c('skipInbox'), markRead: c('markRead'),
      neverSpam: c('neverSpam'), star: c('star'), label: v('label'),
    };
  }

  function wirePanel(panel, filters) {
    // Show Gmail's native view
    panel.querySelector('#andr-gf-show-native').onclick = () => {
      panel.style.display = 'none';
      if (hiddenSection) hiddenSection.style.display = '';
    };

    // Toggle new-filter form
    panel.querySelector('#andr-gf-new').onclick = () => {
      const f = panel.querySelector('#andr-gf-new-form');
      f.style.display = f.style.display === 'none' ? 'block' : 'none';
    };
    panel.querySelector('#andr-gf-new-cancel').onclick = () => {
      panel.querySelector('#andr-gf-new-form').style.display = 'none';
    };
    panel.querySelector('#andr-gf-new-submit').onclick = () => {
      const data = readForm(panel.querySelector('#andr-gf-new-form'));
      driveGmailCreate(data);
    };

    // Per-card buttons
    filters.forEach(f => {
      const editBtn   = panel.querySelector(`.andr-btn-edit[data-i="${f.i}"]`);
      const delBtn    = panel.querySelector(`.andr-btn-del[data-i="${f.i}"]`);
      const saveBtn   = panel.querySelector(`.andr-btn-save[data-i="${f.i}"]`);
      const cancelBtn = panel.querySelector(`.andr-btn-cancel[data-i="${f.i}"]`);
      const editPanel = panel.querySelector(`#andr-edit-${f.i}`);

      editBtn.onclick = () => {
        const open = editPanel.style.display !== 'none';
        editPanel.style.display = open ? 'none' : 'block';
        editBtn.textContent = open ? 'Edit' : 'Close';
      };

      cancelBtn.onclick = () => {
        editPanel.style.display = 'none';
        editBtn.textContent = 'Edit';
      };

      delBtn.onclick = () => {
        if (!confirm('Delete this filter?')) return;
        if (f.deleteEl) {
          f.deleteEl.click();
          setTimeout(() => {
            const card = document.getElementById(`andr-card-${f.i}`);
            if (card) { card.style.opacity = '0.35'; card.style.pointerEvents = 'none'; }
          }, 300);
        } else {
          alert('Could not find Gmail\'s delete button. Use "Gmail view" to delete manually.');
        }
      };

      saveBtn.onclick = () => {
        if (!confirm('This will delete the old filter and open Gmail\'s wizard to create the updated one. Continue?')) return;
        const data = readForm(editPanel);
        if (f.deleteEl) f.deleteEl.click();
        setTimeout(() => driveGmailCreate(data), 400);
      };
    });
  }

  function driveGmailCreate(data) {
    const query = buildSearchQuery(data);
    if (!query) { alert('Add at least one criteria field.'); return; }

    // Try to find Gmail's filter search input and "Create a new filter" button
    const searchInput = document.querySelector('input[name="q"], input[aria-label*="filter" i], .J-J5-Ji input');
    const createLink  = elByText(document, 'a, span, div[role="link"]', 'Create a new filter')
                     || elByText(document, 'a, span, div[role="link"]', 'Create a new filter with this search');

    if (searchInput && createLink) {
      // Fill Gmail's own search box and click through the wizard
      searchInput.focus();
      searchInput.value = query;
      searchInput.dispatchEvent(new Event('input',  { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      setTimeout(() => {
        createLink.click();
        const actionHint = [
          data.skipInbox ? 'Skip Inbox' : '',
          data.markRead  ? 'Mark as read' : '',
          data.neverSpam ? 'Never spam' : '',
          data.star      ? 'Star it' : '',
          data.label     ? `Apply label: ${data.label}` : '',
        ].filter(Boolean).join(', ');
        if (actionHint) {
          setTimeout(() => alert(
            `Gmail's filter wizard is now open.\n\nPlease tick:\n${actionHint}\n\nThen click "Create filter".`
          ), 600);
        }
      }, 150);
    } else {
      // Fallback: pass the query in the URL and let the user proceed
      location.hash = `#create-filter/from=${encodeURIComponent(data.from)}`;
      alert(`Navigate to Gmail's "Create filter" and paste this search:\n\n${query}`);
    }
  }

  // ── Email view: "Add to filter" button ────────────────────────────────────

  function injectEmailButton() {
    const sender = document.querySelector('.gD[email], .go[email], [email]')?.getAttribute('email');
    if (!sender) return;

    const toolbars = document.querySelectorAll('.amn, .ade');
    toolbars.forEach(toolbar => {
      if (toolbar.querySelector('#andr-add-filter-btn')) return;
      const btn = document.createElement('button');
      btn.id = 'andr-add-filter-btn';
      btn.className = 'andr-filter-btn';
      btn.title = `Add filter for ${sender}`;
      btn.innerHTML = '&#9993; Add to filter';
      btn.onclick = e => {
        e.stopPropagation();
        location.hash = '#settings/filters';
        setTimeout(() => {
          const panel = document.getElementById(PANEL_ID);
          if (panel) {
            const newForm = panel.querySelector('#andr-gf-new-form');
            const fromInput = newForm?.querySelector('[name="from"]');
            if (newForm) {
              newForm.style.display = 'block';
              const fromBox = newForm.querySelector('.andr-chip-input[data-name="from"]');
              const fromText = fromBox?.querySelector('.andr-chip-text');
              if (fromBox && fromText) addChip(fromBox, fromText, sender);
              newForm.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }, 1200);
      };
      toolbar.insertBefore(btn, toolbar.firstChild);
    });
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  const navObserver = new MutationObserver(onNavigate);
  navObserver.observe(document.body, { childList: true, subtree: false });
  onNavigate();
})();
