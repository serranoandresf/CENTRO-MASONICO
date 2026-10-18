'use strict';
// Muestra errores en pantalla si algo falla al cargar, y arranca la app.
window.addEventListener('error', (e) => { const a = document.getElementById('app'); if (a && !a.children.length) a.textContent = 'Error al iniciar: ' + e.message; });
aplicarTema();
window.addEventListener('hashchange', () => render());
addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k') { e.preventDefault(); paleta(); } });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
if (/^#\/demo\/?$/.test(location.hash)) { try { activarDemo(); } catch (e) { /* demo.js ausente: se muestra el aviso */ } location.hash = '/muro'; }
render();
