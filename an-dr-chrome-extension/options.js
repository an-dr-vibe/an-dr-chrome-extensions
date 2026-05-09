document.querySelectorAll('.tab-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('tab-' + item.dataset.tab).classList.add('active');
  });
});
