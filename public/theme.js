(function() {
  var dark = localStorage.getItem('ue5d_theme') !== 'light';
  if (!dark) document.documentElement.classList.add('light-theme');
})();

function applyThemeGlobal() {
  var dark = localStorage.getItem('ue5d_theme') !== 'light';
  document.body.classList.toggle('light', !dark);
  var icon = document.getElementById('theme_icon');
  var lbl  = document.getElementById('theme_lbl');
  if (icon) icon.textContent = dark ? '☀' : '☾';
  if (lbl)  lbl.textContent  = dark ? 'Светлая' : 'Тёмная';
}

function toggleThemeGlobal() {
  var dark = localStorage.getItem('ue5d_theme') !== 'light';
  localStorage.setItem('ue5d_theme', dark ? 'light' : 'dark');
  applyThemeGlobal();
}

document.addEventListener('DOMContentLoaded', applyThemeGlobal);
