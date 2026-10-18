'use strict';
// Núcleo del cliente: DOM seguro (solo textContent), API, formularios modales, avisos y estado. Nunca se usa innerHTML.
const $ = (s) => document.querySelector(s);
const V = {};            // pantallas
const estado = { yo: null, configurado: null, canal: null, noLeidos: {}, stream: null };

function h(tag, props, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style') el.style.cssText = v; // vía CSSOM: permitido por la política de seguridad (el atributo style en línea no)
    else if (k === 'checked' || k === 'disabled' || k === 'value' || k === 'selected') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat(Infinity)) { if (c == null || c === false) continue; el.append(c instanceof Node ? c : document.createTextNode(String(c))); }
  return el;
}
// ---- Conexión: el mismo servidor que sirve la página, o un servidor remoto (la interfaz alojada en GitHub Pages) ----
const cfg = { local: '', base: '', token: '', demo: false };
function cargarCfg() {
  try { cfg.local = new URL('.', location.href).href.replace(/\/$/, ''); } catch { cfg.local = ''; }
  try { cfg.base = localStorage.getItem('centro_servidor') || ''; cfg.token = localStorage.getItem('centro_token') || ''; cfg.demo = localStorage.getItem('centro_demo') === '1'; } catch {}
}
const remoto = () => !!cfg.base || cfg.demo; // la demo también usa token (sin cookies)
const baseApi = () => cfg.base || cfg.local;
function guardarToken(t) { cfg.token = t || ''; try { if (t) localStorage.setItem('centro_token', t); else localStorage.removeItem('centro_token'); } catch {} }
function guardarServidor(u) { cfg.base = u || ''; try { if (u) localStorage.setItem('centro_servidor', u); else localStorage.removeItem('centro_servidor'); } catch {} guardarToken(''); }
function normalizarServidor(u) {
  u = String(u || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\//i.test(u) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(u)) throw new Error('La dirección debe empezar con https:// (o http://localhost para pruebas en tu PC)');
  new URL(u); return u;
}
// ---- Modo demostración: la plataforma completa corre dentro del navegador con datos de ejemplo ----
let demoInst = null;
function demo() {
  if (typeof DEMO_FABRICA === 'undefined') throw new Error('Falta el archivo demo.js: sube todo el contenido del proyecto al repositorio');
  return demoInst || (demoInst = DEMO_FABRICA({ guardar: (E) => { try { localStorage.setItem('centro_demo_datos', JSON.stringify(E)); } catch {} }, cargar: () => { try { return JSON.parse(localStorage.getItem('centro_demo_datos')); } catch { return null; } } }));
}
function activarDemo() { demo(); cfg.demo = true; try { localStorage.setItem('centro_demo', '1'); } catch {} guardarToken(''); }
function reiniciarDemo() { try { localStorage.removeItem('centro_demo_datos'); } catch {} demoInst = null; guardarToken(''); }
function salirDemo() { reiniciarDemo(); cfg.demo = false; try { localStorage.removeItem('centro_demo'); } catch {} }
cargarCfg();

async function api(metodo, ruta, cuerpo) {
  const headers = { 'X-Requested-With': 'fetch' };
  if (cuerpo) headers['Content-Type'] = 'application/json';
  if (remoto()) { headers['X-Token-Mode'] = 'bearer'; if (cfg.token) headers.Authorization = 'Bearer ' + cfg.token; }
  let r;
  if (cfg.demo) { const dd = await demo().handle(metodo, ruta, cuerpo, cfg.token); r = { ok: dd.status < 400, status: dd.status, json: async () => dd.body }; }
  else r = await fetch(baseApi() + '/api' + ruta, { method: metodo, headers, credentials: remoto() ? 'omit' : 'same-origin', body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  let d = null; try { d = await r.json(); } catch {}
  if (!r.ok) {
    if (r.status === 401) { guardarToken(''); if (estado.yo) { estado.yo = null; cerrarStream(); render(); } }
    throw Object.assign(new Error((d && d.error) || 'Error ' + r.status), { status: r.status });
  }
  if (d && d.token && remoto()) guardarToken(d.token);
  if (ruta === '/logout' || ruta === '/panico') guardarToken('');
  return d;
}
let tToast;
function aviso(msg, error) {
  let t = document.getElementById('toast');
  if (!t) { t = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
  t.textContent = msg; t.className = 'toast' + (error ? ' error' : ''); t.hidden = false;
  clearTimeout(tToast); tToast = setTimeout(() => { t.hidden = true; }, error ? 6000 : 3000);
}
const intentar = (fn) => async (ev) => { try { await fn(ev); } catch (e) { aviso(e.message, true); } };
const pref = () => { try { return JSON.parse(localStorage.getItem('centro_pref') || '{}'); } catch { return {}; } };
const setPref = (o) => { try { localStorage.setItem('centro_pref', JSON.stringify({ ...pref(), ...o })); } catch {} };
const fFecha = (s) => { try { return new Date(s).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return s; } };
const fDia = (s) => { try { return new Date(s).toLocaleDateString('es', { dateStyle: 'medium' }); } catch { return s; } };
const copiar = async (t) => { try { await navigator.clipboard.writeText(t); aviso('Copiado'); } catch { aviso('No se pudo copiar', true); } };

function formulario(titulo, campos, alEnviar, ok = 'Guardar') {
  const dlg = h('dialog', { class: 'dlg', 'aria-label': titulo }), form = h('form', { method: 'dialog' }), ctl = {};
  campos.forEach((c) => {
    const id = 'f_' + c.k; let el;
    if (c.tipo === 'textarea') el = h('textarea', { id, rows: c.filas || 5 });
    else if (c.tipo === 'select') el = h('select', { id }, (c.opciones || []).map(([v, t]) => h('option', { value: v }, t)));
    else el = h('input', { id, type: c.tipo || 'text', autocomplete: c.auto || 'off' });
    if (c.valor != null) el.value = c.valor; if (c.req) el.required = true; if (c.min != null) el.min = c.min;
    ctl[c.k] = el; form.append(h('div', { class: 'campo' }, h('label', { for: id }, c.label), el, c.ayuda ? h('small', { class: 'muted' }, c.ayuda) : null));
  });
  const err = h('div', { class: 'err', role: 'alert' });
  form.append(err, h('div', { class: 'acciones' }, h('button', { type: 'button', class: 'btn sec', onclick: () => dlg.close() }, 'Cancelar'), h('button', { type: 'submit', class: 'btn' }, ok)));
  form.addEventListener('submit', async (e) => { e.preventDefault(); const v = {}; for (const c of campos) v[c.k] = c.tipo === 'number' ? Number(ctl[c.k].value) : ctl[c.k].value; try { await alEnviar(v); dlg.close(); } catch (x) { err.textContent = x.message; } });
  dlg.append(h('h2', {}, titulo), form); dlg.addEventListener('close', () => dlg.remove()); document.body.append(dlg); dlg.showModal();
  return dlg;
}
const insignia = (t, cls) => h('span', { class: 'badge ' + (cls || '') }, t);
const tarjeta = (...c) => h('div', { class: 'card' }, ...c);
const vacio = (t) => h('p', { class: 'muted vacio' }, t);
const btn = (t, fn, cls = 'btn sec') => h('button', { type: 'button', class: cls, onclick: intentar(fn) }, t);
const esGestor = () => !!estado.yo && estado.yo.pertenencias.some((p) => p.gestor);
const esAdmin = () => !!estado.yo && estado.yo.obediencias.some((o) => o.admin);
const nivelMax = () => Math.max(0, ...(estado.yo ? estado.yo.pertenencias.map((p) => p.nivel) : [0]));
const cuerposGestor = () => (estado.yo ? estado.yo.pertenencias.filter((p) => p.gestor) : []);
const opcionesGrado = () => { const o = []; for (let i = 1; i <= Math.max(1, nivelMax()); i++) o.push([i, i === 1 ? '1 · Todos los miembros' : `${i} · Grado ${i} o superior`]); return o; };

// ---- Apariencia: tema (automático, claro, oscuro, negro) y color de acento ----
const TEMAS = [['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro'], ['negro', 'Negro']];
const ACENTOS = [['azul', 'Azul'], ['turquesa', 'Turquesa'], ['indigo', 'Índigo'], ['jade', 'Jade'], ['violeta', 'Violeta'], ['oro', 'Oro'], ['grafito', 'Grafito']];
function aplicarTema() {
  const r = document.documentElement; if (!r) return; const p = pref();
  if (p.tema && p.tema !== 'auto') r.setAttribute('data-tema', p.tema); else r.removeAttribute('data-tema');
  if (p.acento && p.acento !== 'azul') r.setAttribute('data-acento', p.acento); else r.removeAttribute('data-acento');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) { const oscuro = p.tema === 'oscuro' || p.tema === 'negro' || ((!p.tema || p.tema === 'auto') && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); meta.setAttribute('content', p.tema === 'negro' ? '#000000' : oscuro ? '#0a0d14' : '#f3f5f9'); }
}
const iniciales = (a) => { const t = String(a || '?').split(/[^\p{L}\p{N}]+/u).filter(Boolean); return ((t[0] || '?')[0] + (t[1] ? t[1][0] : (t[0] || '')[1] || '')).toUpperCase(); };
function avatar(alias, tam) { // las iniciales se pintan por CSS (no son texto): no afectan a lectores ni a búsquedas
  let hue = 0; for (const c of String(alias)) hue = (hue * 31 + c.charCodeAt(0)) % 360;
  const el = h('span', { class: 'avatar' + (tam ? ' ' + tam : ''), 'data-i': iniciales(alias), 'aria-hidden': 'true' }); if (el.style && el.style.setProperty) el.style.setProperty('--h', String(hue)); return el;
}
const esqueleto = () => h('div', { class: 'sk', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
