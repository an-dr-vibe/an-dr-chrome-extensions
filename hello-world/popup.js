document.getElementById('saveBtn').addEventListener('click', () => {
  const message = `Message saved at ${new Date().toLocaleTimeString()}`;

  chrome.storage.local.set({ helloMessage: message }, () => {
    const messageEl = document.getElementById('message');
    messageEl.textContent = `✓ ${message}`;
    messageEl.classList.add('show');

    setTimeout(() => {
      messageEl.classList.remove('show');
    }, 3000);
  });
});

// Load and display previous message on popup open
window.addEventListener('load', () => {
  chrome.storage.local.get(['helloMessage'], (result) => {
    if (result.helloMessage) {
      const messageEl = document.getElementById('message');
      messageEl.textContent = `Last: ${result.helloMessage}`;
      messageEl.classList.add('show');
    }
  });
});
