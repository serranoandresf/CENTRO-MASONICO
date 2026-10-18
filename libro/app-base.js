'use strict';
// Base de la interfaz: ayudas de DOM, bóveda cifrada, bloqueo, formularios y estructura. Los datos nunca salen del dispositivo.
const X = LogiaCrypto, L = Logia;
const K_BOVEDA = 'logia_boveda_v1', K_INT = 'logia_intentos', K_PREF = 'logia_pref';
const S = { est: null, llave: null, vista: 'panel', arg: null, verComo: null, actividad: Date.now() };
const V = {}; // vistas (app-vistas.js)

function h(tag, props, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'checked' || k === 'disabled' || k === 'value') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat(Infinity)) { if (c == null || c === false) continue; el.append(c instanceof Node ? c : document.createTextNode(String(c))); }
  return el;
}
const pref = () => { try { return JSON.parse(localStorage.getItem(K_PREF) || '{}'); } catch { return {}; } };
const setPref = (o) => { try { localStorage.setItem(K_PREF, JSON.stringify({ ...pref(), ...o })); } catch {} };

let tToast;
function toast(msg, error) {
  let t = document.getElementById('toast');
  if (!t) { t = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
  t.textContent = msg; t.className = 'toast' + (error ? ' error' : ''); t.hidden = false;
  clearTimeout(tToast); tToast = setTimeout(() => { t.hidden = true; }, error ? 6000 : 3000);
}

async function guardar() {
  if (!S.est || !S.llave) throw new Error('Bóveda bloqueada');
  localStorage.setItem(K_BOVEDA, JSON.stringify(await X.cifrar(S.llave, S.est)));
}
async function ejec(fn, msg) { await fn(); await guardar(); if (msg) toast(msg); render(); }
const intentar = (fn) => async () => { try { await fn(); } catch (e) { toast(e.message, true); } };

function descargar(nombre, mime, contenido) {
  const a = h('a', { href: URL.createObjectURL(new Blob([contenido], { type: mime })), download: nombre });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
async function copiar(texto) { try { await navigator.clipboard.writeText(texto); toast('Copiado'); } catch { toast('No se pudo copiar', true); } }

function formulario(titulo, campos, alEnviar, ok = 'Guardar') {
  const dlg = h('dialog', { class: 'dlg', 'aria-label': titulo });
  const form = h('form', { method: 'dialog' }), ctl = {};
  campos.forEach(c => {
    const id = 'f_' + c.k; let el;
    if (c.tipo === 'textarea') el = h('textarea', { id, rows: c.filas || 5 });
    else if (c.tipo === 'select') el = h('select', { id }, (c.opciones || []).map(([v, t]) => h('option', { value: v }, t)));
    else if (c.tipo === 'checks') el = h('fieldset', {}, h('legend', {}, c.label), (c.opciones || []).map(([v, t]) => h('label', { class: 'chk' }, h('input', { type: 'checkbox', value: v }), ' ', t)));
    else el = h('input', { id, type: c.tipo || 'text', autocomplete: 'off' });
    if (c.tipo !== 'checks') { if (c.valor != null) el.value = c.valor; if (c.req) el.required = true; if (c.min != null) el.min = c.min; }
    ctl[c.k] = el;
    form.append(c.tipo === 'checks' ? el : h('div', { class: 'campo' }, h('label', { for: id }, c.label), el, c.ayuda ? h('small', { class: 'muted' }, c.ayuda) : null));
  });
  const err = h('div', { class: 'err', role: 'alert' });
  form.append(err, h('div', { class: 'acciones' }, h('button', { type: 'button', class: 'a sec', onclick: () => dlg.close() }, 'Cancelar'), h('button', { type: 'submit', class: 'a' }, ok)));
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); const v = {};
    for (const c of campos) { const el = ctl[c.k]; v[c.k] = c.tipo === 'checks' ? [...el.querySelectorAll('input:checked')].map(i => i.value) : (c.tipo === 'number' ? Number(el.value) : el.value); }
    try { await alEnviar(v); dlg.close(); } catch (ex) { err.textContent = ex.message; }
  });
  dlg.append(h('h2', {}, titulo), form); dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg); dlg.showModal();
}
const confirmar = (msg) => window.confirm(msg);

// ---------- Bóveda: crear, desbloquear, bloquear, importar, pánico ----------
const hayBoveda = () => !!localStorage.getItem(K_BOVEDA);
const intentos = () => { try { return JSON.parse(localStorage.getItem(K_INT) || '{"n":0,"hasta":0}'); } catch { return { n: 0, hasta: 0 }; } };

function bloquear() { S.est = null; S.llave = null; S.verComo = null; S.vista = 'panel'; S.arg = null; document.querySelectorAll('dialog').forEach(d => d.close()); render(); }

async function crearBoveda({ nombre, pass, pass2, entiendo }) {
  if (pass !== pass2) throw new Error('Las claves no coinciden');
  if (!entiendo) throw new Error('Confirma que entiendes que sin la clave no hay recuperación');
  const llave = await X.nuevaLlave(pass);
  S.est = L.estadoInicial((nombre || '').trim() || 'Mi logia (ficticia)'); S.llave = llave;
  await guardar(); localStorage.removeItem(K_INT); S.actividad = Date.now(); render();
}
async function desbloquear(pass) {
  const i = intentos();
  if (Date.now() < i.hasta) throw new Error(`Espera ${Math.ceil((i.hasta - Date.now()) / 1000)} s antes de reintentar`);
  try {
    const { llave, obj } = await X.abrir(pass, JSON.parse(localStorage.getItem(K_BOVEDA)));
    S.est = obj; S.llave = llave; localStorage.removeItem(K_INT); S.actividad = Date.now(); render();
  } catch (e) {
    const n = i.n + 1; localStorage.setItem(K_INT, JSON.stringify({ n, hasta: n >= 3 ? Date.now() + Math.min(300000, 2 ** (n - 2) * 1000) : 0 }));
    throw new Error('Clave incorrecta');
  }
}
function importarCopia() {
  const inp = h('input', { type: 'file', accept: '.logia,application/json' });
  inp.addEventListener('change', async () => {
    try {
      const paquete = JSON.parse(await inp.files[0].text());
      formulario('Abrir copia cifrada', [{ k: 'pass', label: 'Clave de esa copia', tipo: 'password', req: true }], async ({ pass }) => {
        const { llave, obj } = await X.abrir(pass, paquete);
        if (hayBoveda() && !confirmar('Esto REEMPLAZA los datos de este dispositivo. ¿Continuar?')) return;
        S.est = obj; S.llave = llave; await guardar(); S.actividad = Date.now(); toast('Copia importada'); render();
      }, 'Importar');
    } catch { toast('Archivo no válido', true); }
  });
  inp.click();
}
async function panico() {
  try { localStorage.clear(); sessionStorage.clear(); } catch {}
  try { for (const k of await caches.keys()) await caches.delete(k); } catch {}
  try { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch {}
  try { for (const d of await indexedDB.databases()) indexedDB.deleteDatabase(d.name); } catch {}
  location.replace(location.pathname);
}

function pantallaBloqueo(main) {
  const aviso = h('p', { class: 'muted' });
  if (!hayBoveda()) {
    const f = h('form', { class: 'card' },
      h('h2', {}, 'Crear tu libro cifrado'),
      h('p', { class: 'muted' }, 'Todo se guarda cifrado (AES-256-GCM) solo en este dispositivo. Sin la clave NADIE puede recuperarlo, ni siquiera quien programó la app. Usa datos ficticios hasta que una auditoría externa lo apruebe.'),
      h('div', { class: 'campo' }, h('label', { for: 'n' }, 'Nombre del libro (opcional)'), h('input', { id: 'n', autocomplete: 'off' })),
      h('div', { class: 'campo' }, h('label', { for: 'p1' }, 'Clave (mínimo 10 caracteres; mejor una frase)'), h('input', { id: 'p1', type: 'password', autocomplete: 'new-password', required: true, minlength: 10 })),
      h('div', { class: 'campo' }, h('label', { for: 'p2' }, 'Repite la clave'), h('input', { id: 'p2', type: 'password', autocomplete: 'new-password', required: true })),
      h('label', { class: 'chk' }, h('input', { id: 'ok', type: 'checkbox' }), ' Entiendo que sin la clave no hay recuperación'),
      h('div', { class: 'err', role: 'alert', id: 'e' }),
      h('button', { class: 'a', type: 'submit' }, 'Crear libro'), h('button', { class: 'a sec', type: 'button', onclick: importarCopia }, 'Tengo una copia cifrada'));
    f.addEventListener('submit', async (e) => { e.preventDefault(); f.querySelector('button').disabled = true;
      try { await crearBoveda({ nombre: $('#n').value, pass: $('#p1').value, pass2: $('#p2').value, entiendo: $('#ok').checked }); } catch (x) { $('#e').textContent = x.message; f.querySelector('button').disabled = false; } });
    main.append(f); return;
  }
  const f = h('form', { class: 'card' }, h('h2', {}, 'Desbloquear'),
    h('div', { class: 'campo' }, h('label', { for: 'p' }, 'Clave'), h('input', { id: 'p', type: 'password', autocomplete: 'current-password', required: true })),
    h('div', { class: 'err', role: 'alert', id: 'e' }), aviso,
    h('button', { class: 'a', type: 'submit' }, 'Entrar'), h('button', { class: 'a sec', type: 'button', onclick: importarCopia }, 'Abrir otra copia'),
    h('button', { class: 'a pel', type: 'button', onclick: () => { if (confirmar('Se borrará TODO en este dispositivo. ¿Seguro?')) panico(); } }, 'Borrar todo'));
  f.addEventListener('submit', async (e) => { e.preventDefault(); const b = f.querySelector('button'); b.disabled = true; b.textContent = 'Verificando…';
    try { await desbloquear($('#p').value); } catch (x) { $('#e').textContent = x.message; b.disabled = false; b.textContent = 'Entrar'; } });
  main.append(f); setTimeout(() => $('#p')?.focus(), 50);
}
const $ = (s) => document.querySelector(s);

// ---------- Estructura general ----------
const SECCIONES = [['panel', 'Panel'], ['miembros', 'Miembros'], ['tenidas', 'Tenidas'], ['actas', 'Actas'], ['tesoreria', 'Tesorería'], ['formacion', 'Formación'],
  ['planchas', 'Planchas'], ['tareas', 'Tareas'], ['biblioteca', 'Biblioteca'], ['avisos', 'Avisos'], ['buscar', 'Buscar'], ['ajustes', 'Ajustes']];
function ir(vista, arg) { S.vista = vista; S.arg = arg || null; render(); const m = $('#main'); if (m) { m.focus(); window.scrollTo(0, 0); } }

async function render() {
  const discreto = !!pref().discreto;
  document.title = discreto ? 'Notas' : (S.est ? S.est.meta.nombre : 'Libro de la logia');
  $('#titulo').textContent = discreto ? 'Notas' : 'Libro de la logia';
  $('#quien').replaceChildren(S.est && !discreto ? S.est.meta.nombre : '', S.est ? h('button', { class: 'a sec peq', type: 'button', onclick: bloquear }, 'Bloquear') : '');
  const nav = $('#nav'); nav.replaceChildren();
  const main = $('#main'); main.replaceChildren();
  if (!S.est) { pantallaBloqueo(main); window.__libroListo = true; return; }
  SECCIONES.forEach(([id, n]) => nav.append(h('button', { type: 'button', 'aria-current': id === S.vista ? 'page' : null, onclick: () => ir(id) }, n)));
  if (S.vista !== 'ajustes') {
    main.append(h('div', { class: 'vercomo' }, h('label', { for: 'vc' }, 'Ver como: '),
      h('select', { id: 'vc', onchange: (e) => { S.verComo = e.target.value || null; render(); } },
        h('option', { value: '' }, 'Administración (todo)'), S.est.miembros.filter(m => m.estado === 'activo').map(m => h('option', { value: m.id, selected: S.verComo === m.id ? '' : null }, `${m.alias} — ${L.nombreGrado(S.est, m)}`))),
      S.verComo ? h('span', { class: 'muted' }, ' Vista previa: cada miembro ve solo su grado o inferior.') : null));
    const vc = $('#vc'); if (vc && S.verComo) vc.value = S.verComo;
  }
  try { await (V[S.vista] || V.panel)(main); } catch (e) { main.append(h('div', { class: 'card err' }, 'Error en la vista: ' + e.message)); }
  window.__libroListo = true;
}

function iniciar() {
  const activo = () => { S.actividad = Date.now(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, activo, { passive: true }));
  setInterval(() => { if (S.est && Date.now() - S.actividad > (S.est.config.bloqueoMin || 5) * 60000) bloquear(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.est && S.est.config.bloquearAlOcultar) bloquear(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  render();
}
