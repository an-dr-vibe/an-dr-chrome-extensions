// Injects "Add to filter" button into open Gmail emails.
// Gmail is a SPA — we watch for DOM mutations to detect when an email opens.

const BUTTON_ID = 'andr-add-filter-btn';

function getSenderEmail(emailHeader) {
  // Extract email from "Display Name <email@domain.com>" or bare "email@domain.com"
  const match = emailHeader.match(/<([^>]+)>/) || emailHeader.match(/([^\s]+@[^\s]+)/);
  return match ? match[1].trim() : emailHeader.trim();
}

function findSenderHeader() {
  // Gmail renders sender info in [email] or [data-hovercard-id] attributes
  const senderEl = document.querySelector('.gD[email], .go[email]');
  if (senderEl) return senderEl.getAttribute('email');

  // Fallback: look for sender span with email attr
  const byAttr = document.querySelector('[email]');
  if (byAttr) return byAttr.getAttribute('email');

  return null;
}

function injectButton(toolbar) {
  if (toolbar.querySelector(`#${BUTTON_ID}`)) return;

  const sender = findSenderHeader();
  if (!sender) return;

  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.className = 'andr-filter-btn';
  btn.title = `Add filter for ${sender}`;
  btn.innerHTML = `<span class="andr-filter-icon">&#9993;</span> Add to filter`;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const url = chrome.runtime.getURL('options.html') + `?from=${encodeURIComponent(sender)}`;
    window.open(url, '_blank');
  });

  // Insert at the start of the toolbar
  toolbar.insertBefore(btn, toolbar.firstChild);
}

function tryInject() {
  // Gmail's email toolbar — contains Reply, Forward, etc.
  const toolbars = document.querySelectorAll('.ade, [data-tooltip="More"], .G-atb');
  // More reliable: look for the reply button container
  const replyBars = document.querySelectorAll('.amn');
  const targets = replyBars.length ? replyBars : toolbars;
  targets.forEach(t => injectButton(t));
}

// Watch for Gmail SPA navigation
const observer = new MutationObserver(() => {
  tryInject();
});

observer.observe(document.body, { childList: true, subtree: true });
tryInject();
