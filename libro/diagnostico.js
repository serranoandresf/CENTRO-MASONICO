'use strict';
// Muestra en pantalla cualquier fallo de carga o de ejecución (útil cuando no hay consola a mano).
(function () {
  function mostrar(msg) {
    var d = document.getElementById('diag');
    if (!d) { d = document.createElement('pre'); d.id = 'diag'; d.setAttribute('role', 'alert');
      d.style.cssText = 'white-space:pre-wrap;background:#fde8e8;color:#7a1010;border:2px solid #c0392b;margin:12px;padding:12px;border-radius:10px;font:13px/1.4 ui-monospace,monospace';
      (document.body || document.documentElement).insertBefore(d, (document.body || document.documentElement).firstChild); }
    d.textContent += msg + '\n';
  }
  window.addEventListener('error', function (e) {
    if (e.target && e.target.tagName === 'SCRIPT') mostrar('No se pudo cargar el archivo: ' + e.target.src + '\nSube también esa carpeta/archivo al repositorio.');
    else mostrar('Error: ' + e.message + ' (' + String(e.filename || '').split('/').pop() + ':' + e.lineno + ')');
  }, true);
  window.addEventListener('unhandledrejection', function (e) { mostrar('Error: ' + (e.reason && e.reason.message ? e.reason.message : e.reason)); });
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (!window.__libroListo) mostrar('La aplicación no arrancó.\nNavegador: ' + navigator.userAgent + '\nContexto seguro (HTTPS): ' + window.isSecureContext + '\nCifrado disponible: ' + !!(window.crypto && window.crypto.subtle));
    }, 1500);
  });
})();
