// an-dr: Chrome Extension
document.getElementById('btn-gmail-filters').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://mail.google.com/mail/#settings/filters' });
});
