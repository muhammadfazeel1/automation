const { ipcRenderer } = require('electron');

document.getElementById('start').addEventListener('click', () => {
  const url = document.getElementById('url').value;
  document.getElementById('status').innerText = 'Starting automation...';
  ipcRenderer.send('start-automation', url);
});

ipcRenderer.on('automation-complete', (event, message) => {
  document.getElementById('status').innerText = message;
});

ipcRenderer.on('automation-error', (event, message) => {
  document.getElementById('status').innerText = 'Error: ' + message;
});
