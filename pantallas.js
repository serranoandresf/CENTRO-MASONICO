'use strict';
// Pantallas de la plataforma. Todo permiso real lo decide el servidor; aquí solo se muestran u ocultan controles.

// ================= Acceso =================
function marcoAuth(app, titulo, ...contenido) {
  app.replaceChildren(h('div', { class: 'auth' }, h('div', { class: 'marca' }, h('span', { class: 'mk', 'aria-hidden': 'true' }, icono('triangulo')), h('h1', {}, pref().discreto ? 'Notas' : 'Centro Masónico')), tarjeta(h('h2', {}, titulo), ...contenido)));
}
function campoTxt(id, etiqueta, tipo = 'text', auto = 'off') { return h('div', { class: 'campo' }, h('label', { for: id }, etiqueta), h('input', { id, type: tipo, autocomplete: auto, required: true })); }
function formAuth(campos, textoBtn, alEnviar, pie) {
  const err = h('div', { class: 'err', role: 'alert' }), b = h('button', { class: 'btn', type: 'submit' }, textoBtn);
  const f = h('form', {}, ...campos, err, b, pie || null);
  f.addEventListener('submit', async (e) => { e.preventDefault(); b.disabled = true; try { await alEnviar(); } catch (x) { err.textContent = x.message; b.disabled = false; } });
  return f;
}
V.demoLogin = (app) => {
  const perfiles = typeof DEMO_PERFILES === 'undefined' ? [] : DEMO_PERFILES;
  marcoAuth(app, 'Modo demostración', h('p', {}, 'Elige un perfil para recorrer la plataforma. Los datos son de ejemplo y viven solo en este navegador.'),
    h('p', { class: 'muted' }, 'Prueba entrar como Aprendiz y luego como Venerable: verás que cada grado ve contenidos distintos.'),
    ...perfiles.map(([alias, desc]) => { const i = desc.indexOf(' ('), titulo = i > 0 ? desc.slice(0, i) : desc, resto = i > 0 ? desc.slice(i) : ''; return h('button', { type: 'button', class: 'perfil-btn', onclick: intentar(async () => { await api('POST', '/demo/entrar', { alias }); estado.yo = null; location.hash = '/muro'; render(); }) }, avatar(alias), h('span', {}, h('strong', {}, titulo), h('small', {}, resto))); }),
    btn('Salir de la demostración', () => { salirDemo(); estado.yo = null; estado.configurado = null; render(); }, 'btn sec bloque'));
};
V.servidor = (app, mensaje) => {
  const e = h('div', { class: 'err', role: 'alert' }, mensaje || ''), b = h('button', { class: 'btn', type: 'submit' }, 'Conectar');
  const f = h('form', {}, h('div', { class: 'campo' }, h('label', { for: 'sv_url' }, 'Dirección de tu servidor'), h('input', { id: 'sv_url', type: 'url', placeholder: 'https://logia.tu-dominio.org', autocomplete: 'off', required: true })), e, b);
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault(); b.disabled = true; e.textContent = '';
    try {
      const u = normalizarServidor($('#sv_url').value); let d;
      try { const r = await fetch(u + '/api/estado'); d = await r.json(); } catch { throw new Error('No se pudo conectar. Revisa la dirección, que el servidor esté encendido y que tenga autorizado este sitio (variable ORIGENES_PERMITIDOS).'); }
      if (typeof d.configurado !== 'boolean') throw new Error('Esa dirección no responde como un servidor de Centro Masónico.');
      guardarServidor(u); estado.configurado = null; estado.yo = null; render();
    } catch (x) { e.textContent = x.message; b.disabled = false; }
  });
  marcoAuth(app, 'Conectar con tu servidor', h('p', {}, 'Esta página contiene solo la interfaz. Los datos viven en un servidor que controlas tú.'),
    h('p', { class: 'muted' }, 'Escribe la dirección de tu servidor. Para probar en tu propio computador: inicia el servidor con la variable ORIGENES_PERMITIDOS apuntando a este sitio y escribe http://localhost:3000.'), f,
    h('div', { class: 'demo-caja' }, h('h3', {}, 'Revisar el proyecto sin servidor'), h('p', { class: 'muted' }, 'Abre la plataforma completa en modo demostración: todas las pantallas funcionan con datos de ejemplo guardados solo en este navegador.'),
      btn('Probar la plataforma en modo demostración', () => { activarDemo(); estado.configurado = null; estado.yo = null; render(); }, 'btn bloque')));
};
V.setup = (app) => marcoAuth(app, 'Instalación inicial',
  h('p', { class: 'muted' }, 'Es la primera vez. Crea la obediencia y la cuenta fundadora. El código de instalación aparece en la consola del servidor.'),
  formAuth([campoTxt('s_tok', 'Código de instalación'), campoTxt('s_obe', 'Nombre de la obediencia / Gran Logia'), campoTxt('s_log', 'Nombre de la primera logia'), campoTxt('s_ali', 'Tu alias', 'text', 'username'), campoTxt('s_pw', 'Contraseña (mínimo 10 caracteres)', 'password', 'new-password')], 'Crear', async () => {
    await api('POST', '/setup', { token: $('#s_tok').value, obediencia: $('#s_obe').value, logia: $('#s_log').value, alias: $('#s_ali').value, password: $('#s_pw').value });
    estado.configurado = true; aviso('Instalado. Ahora inicia sesión.'); render();
  }));
V.login = (app) => {
  let pide2fa = false;
  const cod = h('div', { class: 'campo', hidden: true }, h('label', { for: 'l_cod' }, 'Código de verificación (6 dígitos)'), h('input', { id: 'l_cod', inputmode: 'numeric', autocomplete: 'one-time-code' }));
  marcoAuth(app, 'Iniciar sesión', formAuth([campoTxt('l_ali', 'Alias', 'text', 'username'), campoTxt('l_pw', 'Contraseña', 'password', 'current-password'), cod], 'Entrar', async () => {
    const r = await api('POST', '/login', { alias: $('#l_ali').value, password: $('#l_pw').value, codigo: pide2fa ? $('#l_cod').value : undefined });
    if (r.requiere2fa) { pide2fa = true; cod.hidden = false; $('#l_cod').focus(); throw new Error('Escribe el código de tu aplicación de verificación'); }
    estado.yo = null; render();
  }, h('p', { class: 'muted' }, 'El acceso es solo por invitación. Si recibiste un enlace, ábrelo para crear tu cuenta.')));
};
V.registro = async (app, token) => {
  let info; try { info = await api('GET', '/invitacion?token=' + encodeURIComponent(token || '')); } catch (e) { return marcoAuth(app, 'Invitación', h('p', { class: 'err' }, e.message), btn('Ir al inicio', () => { location.hash = ''; render(); }, 'btn')); }
  marcoAuth(app, 'Crear tu cuenta', h('p', {}, 'Te invitan a ', h('strong', {}, info.cuerpo), ' (', info.obediencia, ').'),
    h('p', { class: 'muted' }, 'Elige un alias y una contraseña larga. No uses tu nombre real si no quieres que otros lo vean: el alias es tu identidad en la plataforma.'),
    formAuth([campoTxt('r_ali', 'Alias (3 a 40 caracteres)', 'text', 'username'), campoTxt('r_pw', 'Contraseña (mínimo 10 caracteres)', 'password', 'new-password')], 'Crear cuenta', async () => {
      await api('POST', '/registro', { token, alias: $('#r_ali').value, password: $('#r_pw').value }); estado.yo = null; location.hash = '/muro'; render();
    }));
};

// ================= Estructura =================
// [id, etiqueta, icono, grupo, ¿principal en la barra inferior?]
const SECCIONES = [['muro', 'Inicio', 'inicio', 'Principal', 1], ['camino', 'Mi camino', 'camino', 'Principal', 1], ['chat', 'Chat', 'chat', 'Principal', 1], ['agenda', 'Agenda', 'agenda', 'Principal', 1],
  ['tenidas', 'Tenidas', 'tenidas', 'Trabajo', 0], ['planchas', 'Planchas', 'planchas', 'Trabajo', 0], ['tareas', 'Tareas', 'tareas', 'Trabajo', 0], ['formacion', 'Formación', 'formacion', 'Trabajo', 0],
  ['tesoreria', 'Tesorería', 'tesoreria', 'Recursos', 0], ['biblioteca', 'Biblioteca', 'biblioteca', 'Recursos', 0], ['directorio', 'Directorio', 'directorio', 'Recursos', 0],
  ['logia', 'Mi logia', 'logia', 'Gestión', 0], ['admin', 'Administración', 'admin', 'Gestión', 0], ['perfil', 'Perfil', 'perfil', 'Cuenta', 0]];
const permitida = (v) => (v === 'logia' ? esGestor() || esAdmin() : v === 'admin' ? esAdmin() : true);
const ruta = () => { const p = String(location.hash || '').replace(/^#?\/?/, '').split('/'); return { v: p[0] || 'muro', arg: p[1] }; };
function ir(v, arg) { location.hash = '/' + v + (arg ? '/' + arg : ''); render(); }
let gen = 0, vistaAnterior = null;

async function cerrarSesion() { try { await api('POST', '/logout'); } catch {} estado.yo = null; cerrarStream(); location.hash = ''; render(); }
function gradoMax() { const p = [...estado.yo.pertenencias].sort((a, b) => b.nivel - a.nivel)[0]; return p ? `${p.grado || 'Grado ' + p.nivel} (${p.nivel})` : ''; }
function cabecera(vista) {
  const et = SECCIONES.find(([v]) => v === vista)?.[1] || '';
  return h('header', { class: 'cab' }, h('div', { class: 'marca-mini' }, h('span', { class: 'mk', 'aria-hidden': 'true' }, icono('triangulo')), h('span', { class: 'titulo-vista' }, et)),
    h('div', { class: 'usuario' }, h('button', { type: 'button', class: 'ib', 'aria-label': 'Buscar y navegar (Ctrl+K)', onclick: () => paleta() }, icono('buscar')),
      h('button', { type: 'button', class: 'yo-chip', 'aria-label': 'Mi perfil', onclick: () => ir('perfil') }, avatar(estado.yo.alias, 'sm'), h('span', { class: 't' }, estado.yo.alias, gradoMax() ? h('span', { class: 'grado-cab' }, ' · ' + gradoMax()) : null))));
}
function abrirMas() {
  const dlg = h('dialog', { class: 'dlg', 'aria-label': 'Más secciones' });
  dlg.append(h('h2', {}, 'Más'), ...SECCIONES.filter(([v, , , , prim]) => !prim && permitida(v)).map(([v, n, ic]) => h('button', { type: 'button', class: 'item', onclick: () => { dlg.close(); ir(v); } }, icono(ic), n)));
  dlg.addEventListener('close', () => dlg.remove()); document.body.append(dlg); dlg.showModal();
}
function menu(actual) {
  const vis = SECCIONES.filter(([v]) => permitida(v)), org = estado.yo.obediencias[0]?.nombre, secundaria = vis.some(([v, , , , prim]) => v === actual && !prim), hijos = [];
  hijos.push(h('div', { class: 'menu-marca' }, h('span', { class: 'mk', 'aria-hidden': 'true' }, icono('triangulo')), h('span', {}, pref().discreto ? 'Notas' : 'Centro Masónico', pref().discreto || !org ? null : h('small', {}, org))));
  let g = null;
  for (const [v, n, ic, grupo, prim] of vis) {
    if (grupo !== g) { g = grupo; hijos.push(h('span', { class: 'menu-grupo' }, grupo)); }
    hijos.push(h('button', { type: 'button', class: prim ? null : 'sec-nav', 'aria-current': v === actual ? 'page' : null, onclick: () => ir(v) }, icono(ic), h('span', {}, n), v === 'chat' ? h('span', { id: 'ins-chat', class: 'ins', hidden: true }) : null));
  }
  hijos.push(h('button', { type: 'button', class: 'mas-nav', 'aria-haspopup': 'dialog', 'aria-current': secundaria ? 'page' : null, onclick: abrirMas }, icono('mas'), h('span', {}, 'Más')));
  return h('nav', { class: 'menu', 'aria-label': 'Secciones' }, ...hijos);
}
function paleta() { // Ctrl/⌘ + K: ir a cualquier sección o ejecutar una acción sin tocar el menú
  if (!estado.yo || document.getElementById('paleta')) return;
  const ciclo = ['auto', 'claro', 'oscuro', 'negro'];
  const cmds = [...SECCIONES.filter(([v]) => permitida(v)).map(([v, n, ic]) => ({ t: 'Ir a ' + n, ic, f: () => ir(v) })),
    { t: 'Cambiar tema (automático, claro, oscuro, negro)', ic: 'luna', f: () => { const sig = ciclo[(ciclo.indexOf(pref().tema || 'auto') + 1) % 4]; setPref({ tema: sig }); aplicarTema(); aviso('Tema: ' + sig); } }, { t: 'Cerrar sesión', ic: 'salir', f: cerrarSesion }];
  const dlg = h('dialog', { class: 'dlg paleta', id: 'paleta', 'aria-label': 'Buscar y navegar' }), lista = h('div', {}), entrada = h('input', { type: 'search', placeholder: 'Ir a… (escribe para filtrar)', 'aria-label': 'Buscar acción', autocomplete: 'off' });
  let visibles = cmds;
  const pintar = () => { const q = entrada.value.trim().toLowerCase(); visibles = cmds.filter((c) => c.t.toLowerCase().includes(q)); lista.replaceChildren(...(visibles.length ? visibles.map((c) => h('button', { type: 'button', class: 'item', onclick: () => { dlg.close(); c.f(); } }, icono(c.ic), c.t)) : [vacio('Sin resultados')])); };
  entrada.addEventListener('input', pintar); entrada.addEventListener('keydown', (e) => { if (e.key === 'Enter' && visibles[0]) { dlg.close(); visibles[0].f(); } });
  dlg.append(entrada, lista); dlg.addEventListener('close', () => dlg.remove()); pintar(); document.body.append(dlg); dlg.showModal(); entrada.focus();
}
function pintarInsignias() {
  const e = document.getElementById('ins-chat'); if (!e) return;
  const n = Object.values(estado.noLeidos).reduce((a, b) => a + b, 0); e.textContent = String(n); e.hidden = n === 0;
}
async function render() {
  const mi = ++gen, app = $('#app'), r = ruta();
  document.title = pref().discreto ? 'Notas' : 'Centro Masónico';
  if (r.v === 'unirse') return V.registro(app, r.arg);
  if (estado.configurado === null) {
    try { const e = await api('GET', '/estado'); if (!e || typeof e.configurado !== 'boolean') throw new Error('x'); estado.configurado = e.configurado; }
    catch {
      if (mi !== gen) return;
      if (!remoto()) return V.servidor(app);
      return app.replaceChildren(h('div', { class: 'auth' }, tarjeta(h('p', { class: 'err' }, 'No se puede conectar con el servidor ' + cfg.base), btn('Reintentar', () => render(), 'btn'), btn('Cambiar de servidor', () => { guardarServidor(''); estado.configurado = null; render(); }, 'btn sec'))));
    }
  }
  if (mi !== gen) return;
  if (!estado.configurado) return V.setup(app);
  if (!estado.yo) { try { estado.yo = await api('GET', '/yo'); } catch { if (mi === gen) { if (cfg.demo) V.demoLogin(app); else V.login(app); } return; } }
  if (mi !== gen) return;
  iniciarStream();
  const vista = SECCIONES.some(([v]) => v === r.v) && permitida(r.v) ? r.v : 'muro', clave = vista + '/' + (r.arg || ''), cambio = vistaAnterior !== clave;
  const cont = h('main', { id: 'main', class: 'contenido', tabindex: '-1' });
  app.replaceChildren(h('div', { class: 'shell' }, cabecera(vista), menu(vista), cont)); pintarInsignias();
  if (cambio) { vistaAnterior = clave; if (typeof window.scrollTo === 'function') window.scrollTo(0, 0); }
  const sk = cambio ? esqueleto() : null; if (sk) cont.append(sk);
  if (cfg.demo) cont.append(h('div', { class: 'banner-demo', role: 'note' }, h('strong', {}, 'Modo demostración'), ' · datos de ejemplo solo en este navegador. ',
    btn('Cambiar de perfil', () => { guardarToken(''); estado.yo = null; cerrarStream(); render(); }, 'btn sec peq2'), btn('Reiniciar datos', () => { reiniciarDemo(); estado.yo = null; estado.configurado = null; cerrarStream(); render(); }, 'btn sec peq2'),
    btn('Salir de la demostración', () => { salirDemo(); estado.yo = null; estado.configurado = null; cerrarStream(); render(); }, 'btn sec peq2')));
  try { await V[vista](cont, r.arg); } catch (e) { if (mi === gen) cont.append(tarjeta(h('div', { class: 'err' }, 'Error: ' + e.message))); }
  if (sk) sk.remove(); if (mi === gen && cambio) cont.setAttribute('class', 'contenido enter');
}


// ---- Tiempo real (SSE) ----
function alMensajeEnVivo(m) {
  if (m.tipo !== 'mensaje') return;
  if (ruta().v === 'chat' && String(estado.canal) === String(m.canal_id)) { if (estado.recargarChat) estado.recargarChat(); }
  else if (m.autor !== estado.yo?.alias) { estado.noLeidos[m.canal_id] = (estado.noLeidos[m.canal_id] || 0) + 1; pintarInsignias(); }
}
function iniciarStream() {
  if (estado.stream) return;
  if (cfg.demo) { estado.stream = { close: demo().alEvento(alMensajeEnVivo) }; return; }
  if (remoto()) return streamRemoto();
  if (typeof EventSource === 'undefined') return;
  const es = new EventSource(baseApi() + '/api/stream'); estado.stream = es;
  es.onmessage = (ev) => { try { alMensajeEnVivo(JSON.parse(ev.data)); } catch {} };
}
async function streamRemoto() { // EventSource no admite cabecera Authorization: se lee el flujo con fetch
  const ac = new AbortController(); estado.stream = { close: () => ac.abort() };
  try {
    const r = await fetch(baseApi() + '/api/stream', { headers: { Authorization: 'Bearer ' + cfg.token }, signal: ac.signal, credentials: 'omit' });
    if (!r.ok) throw new Error('stream');
    const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { value, done } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true }); let i;
      while ((i = buf.indexOf('\n\n')) >= 0) { const bloque = buf.slice(0, i); buf = buf.slice(i + 2); const m = bloque.match(/^data: (.*)$/m); if (m) { try { alMensajeEnVivo(JSON.parse(m[1])); } catch {} } }
    }
  } catch {}
  if (estado.stream && estado.stream.close) { estado.stream = null; if (estado.yo) setTimeout(() => { if (estado.yo && !estado.stream) iniciarStream(); }, 5000); }
}
function cerrarStream() { if (estado.stream) { const s = estado.stream; estado.stream = null; s.close(); } }

// ================= Inicio (muro) =================
V.muro = async (cont) => {
  const [muro, tenidas] = await Promise.all([api('GET', '/muro'), api('GET', '/tenidas')]);
  const puede = esGestor() || esAdmin();
  try { await panelHerramientas(cont); } catch (e) { cont.append(vacio('No se pudieron cargar las herramientas: ' + e.message)); }
  cont.append(h('div', { class: 'fila' }, h('h1', {}, 'Publicaciones'), puede ? btn('Nueva publicación', () => nuevaPublicacion(), 'btn') : null));
  const prox = tenidas.filter((t) => t.estado === 'convocada' && t.fecha >= new Date().toISOString().slice(0, 16)).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 3);
  if (prox.length) cont.append(tarjeta(h('h2', {}, 'Próximas tenidas'), prox.map((t) => h('button', { type: 'button', class: 'item', onclick: () => ir('tenidas', t.id) }, h('strong', {}, t.titulo), h('span', { class: 'muted' }, ` · ${fFecha(t.fecha)} · ${t.cuerpo}`), t.mi_estado ? insignia(t.mi_estado === 'asistire' ? 'asistirás' : t.mi_estado, 'ok') : null))));
  if (!muro.length) cont.append(vacio('Todavía no hay publicaciones para ti.'));
  muro.forEach((p) => cont.append(tarjeta(h('h2', {}, p.titulo), h('div', { class: 'meta muted' }, `${p.autor} · ${p.cuerpo || 'Toda la obediencia'} · ${fFecha(p.creada)}`, p.grado_min > 1 ? insignia(`Grado ${p.grado_min}+`) : null), h('p', { class: 'texto' }, p.texto))));
};
function nuevaPublicacion() {
  const dest = [...cuerposGestor().map((p) => ['c' + p.cuerpo_id, p.cuerpo]), ...estado.yo.obediencias.filter((o) => o.admin).map((o) => ['o' + o.id, 'Toda la obediencia: ' + o.nombre])];
  formulario('Nueva publicación', [{ k: 'd', label: 'Destinatarios', tipo: 'select', opciones: dest }, { k: 'titulo', label: 'Título', req: true }, { k: 'texto', label: 'Texto', tipo: 'textarea', req: true, filas: 6 }, { k: 'g', label: 'Quién puede verla', tipo: 'select', opciones: opcionesGrado() }],
    async (v) => { const b = { titulo: v.titulo, texto: v.texto, grado_min: Number(v.g) }; if (v.d[0] === 'c') b.cuerpo_id = Number(v.d.slice(1)); else b.obediencia_id = Number(v.d.slice(1)); await api('POST', '/muro', b); aviso('Publicado'); render(); }, 'Publicar');
}

// ================= Chat =================
V.chat = async (cont, arg) => {
  const canales = await api('GET', '/canales');
  const actual = canales.find((c) => String(c.id) === String(arg)) || canales[0];
  estado.canal = actual ? actual.id : null;
  const lista = h('div', { class: 'lista-canales' });
  const grupo = (titulo, items) => items.length ? [h('h3', {}, titulo), items.map((c) => h('button', { type: 'button', class: 'item' + (actual && c.id === actual.id ? ' act' : ''), onclick: () => { delete estado.noLeidos[c.id]; ir('chat', c.id); } }, (c.tipo === 'dm' ? '@ ' : '# ') + c.nombre, estado.noLeidos[c.id] ? h('span', { class: 'ins' }, estado.noLeidos[c.id]) : null))] : [];
  lista.append(...grupo('Canales', canales.filter((c) => c.tipo === 'canal')), ...grupo('Mensajes directos', canales.filter((c) => c.tipo === 'dm')),
    btn('Nuevo mensaje directo', () => formulario('Mensaje directo', [{ k: 'a', label: 'Alias de la persona', req: true, ayuda: 'Solo puedes escribir a quien comparte logia contigo o ha elegido ser visible en el directorio.' }], async (v) => { const r = await api('POST', '/dm', { alias: v.a }); ir('chat', r.id); }, 'Abrir'), 'btn sec bloque'),
    esGestor() ? btn('Nuevo canal', () => formulario('Nuevo canal', [{ k: 'c', label: 'Logia', tipo: 'select', opciones: cuerposGestor().map((p) => [p.cuerpo_id, p.cuerpo]) }, { k: 'n', label: 'Nombre', req: true }, { k: 'g', label: 'Quién puede entrar', tipo: 'select', opciones: opcionesGrado() }],
      async (v) => { const r = await api('POST', '/canales', { cuerpo_id: Number(v.c), nombre: v.n, grado_min: Number(v.g) }); ir('chat', r.id); }, 'Crear'), 'btn sec bloque') : []);
  const panel = h('section', { class: 'panel-chat' });
  cont.append(h('h1', {}, 'Chat'), h('div', { class: 'chat' }, lista, panel));
  if (!actual) return panel.append(vacio('No tienes canales todavía. Pide a un cargo de tu logia que cree uno, o abre un mensaje directo.'));
  delete estado.noLeidos[actual.id]; pintarInsignias();
  const caja = h('div', { class: 'mensajes', 'aria-live': 'polite' });
  const cargar = async () => {
    const ms = await api('GET', `/canales/${actual.id}/mensajes`); caja.replaceChildren(...ms.map((m) => { const mio = m.autor === estado.yo.alias; return h('div', { class: 'fila-msg' + (mio ? ' mio' : '') }, mio ? null : avatar(m.autor, 'sm'), h('div', { class: 'msg' }, h('div', { class: 'meta' }, mio ? 'Tú' : m.autor, h('span', { class: 'muted' }, ' · ' + fFecha(m.creado))), h('div', { class: 'texto' }, m.texto))); }));
    if (!ms.length) caja.append(vacio('Aún no hay mensajes.')); caja.scrollTop = caja.scrollHeight;
  };
  estado.recargarChat = () => cargar().catch(() => {});
  const entrada = h('input', { id: 'msg', autocomplete: 'off', maxlength: 4000, 'aria-label': 'Escribe un mensaje', placeholder: 'Escribe un mensaje…' });
  const form = h('form', { class: 'enviar' }, entrada, h('button', { class: 'btn', type: 'submit', 'aria-label': 'Enviar mensaje' }, icono('enviar')));
  form.addEventListener('submit', intentar(async (e) => { e.preventDefault(); const t = entrada.value.trim(); if (!t) return; entrada.value = ''; try { await api('POST', `/canales/${actual.id}/mensajes`, { texto: t }); } catch (x) { entrada.value = t; throw x; } await cargar(); entrada.focus(); }));
  panel.append(h('div', { class: 'cab-canal' }, h('strong', {}, (actual.tipo === 'dm' ? '@ ' : '# ') + actual.nombre), actual.cuerpo ? h('span', { class: 'muted' }, ' · ' + actual.cuerpo) : null, actual.grado_min > 1 ? insignia(`Grado ${actual.grado_min}+`) : null), caja, form);
  await cargar();
};

// ================= Tenidas y actas =================
V.tenidas = async (cont, arg) => {
  if (arg) return detalleTenida(cont, arg);
  const ts = await api('GET', '/tenidas');
  cont.append(h('div', { class: 'fila' }, h('h1', {}, 'Tenidas'), esGestor() ? btn('Convocar tenida', () => formulario('Convocar tenida', [{ k: 'c', label: 'Logia', tipo: 'select', opciones: cuerposGestor().map((p) => [p.cuerpo_id, p.cuerpo]) }, { k: 'titulo', label: 'Título', req: true }, { k: 'fecha', label: 'Fecha y hora', tipo: 'datetime-local', req: true }, { k: 'lugar', label: 'Lugar' },
    { k: 'g', label: 'Quién puede verla y asistir', tipo: 'select', opciones: opcionesGrado() }, { k: 'orden', label: 'Orden del día', tipo: 'textarea' }], async (v) => { await api('POST', '/tenidas', { cuerpo_id: Number(v.c), titulo: v.titulo, fecha: v.fecha, lugar: v.lugar, grado_min: Number(v.g), orden_dia: v.orden }); aviso('Tenida convocada'); render(); }, 'Convocar'), 'btn') : null));
  if (!ts.length) cont.append(vacio('No hay tenidas visibles para ti.'));
  [...ts].sort((a, b) => (a.estado === 'convocada' ? 0 : 1) - (b.estado === 'convocada' ? 0 : 1) || (a.estado === 'convocada' ? a.fecha.localeCompare(b.fecha) : b.fecha.localeCompare(a.fecha))).forEach((t) => cont.append(tarjeta(
    h('button', { type: 'button', class: 'item', onclick: () => ir('tenidas', t.id) }, h('strong', {}, t.titulo), h('span', { class: 'muted' }, ` · ${fFecha(t.fecha)} · ${t.cuerpo}`), insignia(t.estado, t.estado === 'realizada' ? 'ok' : ''), t.grado_min > 1 ? insignia(`Grado ${t.grado_min}+`) : null),
    t.estado === 'convocada' ? h('div', {}, btn('Asistiré', async () => { await api('POST', `/tenidas/${t.id}/asistencia`, { estado: 'asistire' }); render(); }, t.mi_estado === 'asistire' ? 'btn' : 'btn sec'), btn('No podré', async () => { await api('POST', `/tenidas/${t.id}/asistencia`, { estado: 'excusa' }); render(); }, t.mi_estado === 'excusa' ? 'btn' : 'btn sec')) : null)));
};
async function detalleTenida(cont, id) {
  const t = await api('GET', '/tenidas/' + id);
  cont.append(h('p', {}, btn('← Volver', () => ir('tenidas'))), tarjeta(h('h1', {}, t.titulo), h('div', { class: 'muted' }, `${fFecha(t.fecha)}${t.lugar ? ' · ' + t.lugar : ''} · ${t.estado}`), t.orden_dia ? h('p', { class: 'texto' }, t.orden_dia) : null));
  if (t.gestor) {
    const estados = [['', '—'], ['asistire', 'Confirmó'], ['asistio', 'Asistió'], ['excusa', 'Excusa'], ['ausente', 'Ausente']];
    cont.append(tarjeta(h('h2', {}, 'Asistencia'), t.asistencias.map((a) => h('div', { class: 'fila' }, h('span', {}, a.alias), h('select', { 'aria-label': 'Asistencia de ' + a.alias, onchange: intentar(async (e) => { if (!e.target.value) return; await api('POST', `/tenidas/${t.id}/asistencia`, { usuario_id: a.usuario_id, estado: e.target.value }); aviso('Guardado'); }) }, estados.map(([v, n]) => h('option', { value: v, selected: (a.estado || '') === v }, n))))),
      t.estado === 'convocada' ? btn('Marcar tenida como realizada', async () => { await api('POST', `/tenidas/${t.id}/realizada`); render(); }, 'btn') : null));
  }
  const acta = h('div', {}); cont.append(tarjeta(h('h2', {}, 'Acta'), acta));
  if (t.acta) return pintarActa(acta, t.acta.id, t.gestor);
  if (t.gestor && t.estado === 'realizada') acta.append(btn('Redactar acta', () => formulario('Redactar acta', [{ k: 'x', label: 'Texto del acta', tipo: 'textarea', filas: 10, req: true }], async (v) => { await api('POST', `/tenidas/${t.id}/acta`, { texto: v.x }); render(); }, 'Guardar borrador'), 'btn'));
  else acta.append(vacio(t.estado === 'realizada' ? 'Aún no se redacta el acta.' : 'El acta se redacta después de la tenida.'));
}
async function pintarActa(el, id, gestor) {
  const a = await api('GET', '/actas/' + id);
  el.replaceChildren(...[h('div', {}, insignia(a.estado, a.estado === 'cerrada' ? 'ok' : '')), h('p', { class: 'texto' }, a.texto), h('div', { class: 'muted' }, 'Firmas: ' + (a.firmas.map((f) => f.alias).join(', ') || 'ninguna')),
    a.hash_cierre ? h('div', { class: 'muted mono' }, 'Sello de cierre: ' + a.hash_cierre) : null,
    a.estado === 'cerrada' ? null : h('div', {}, gestor && a.estado === 'borrador' ? btn('Editar', () => formulario('Editar acta', [{ k: 'x', label: 'Texto', tipo: 'textarea', filas: 10, valor: a.texto, req: true }], async (v) => { await api('POST', `/actas/${id}/editar`, { texto: v.x }); pintarActa(el, id, gestor); })) : null,
      btn('Firmar', async () => { await api('POST', `/actas/${id}/firmar`); aviso('Firmada'); pintarActa(el, id, gestor); }, 'btn'), gestor && a.estado === 'firmada' ? btn('Cerrar y sellar', async () => { await api('POST', `/actas/${id}/cerrar`); aviso('Acta sellada'); pintarActa(el, id, gestor); }, 'btn') : null)].filter(Boolean));
}

// ================= Biblioteca y directorio =================
V.biblioteca = async (cont, arg) => {
  if (arg) { const d = await api('GET', '/docs/' + arg); return cont.append(h('p', {}, btn('← Volver', () => ir('biblioteca'))), tarjeta(h('h1', {}, d.titulo), h('div', { class: 'muted' }, `Versión ${d.version} · ${fDia(d.creado)}`, d.grado_min > 1 ? insignia(`Grado ${d.grado_min}+`) : null), h('p', { class: 'texto' }, d.texto))); }
  const docs = await api('GET', '/docs');
  cont.append(h('div', { class: 'fila' }, h('h1', {}, 'Biblioteca'), esGestor() || esAdmin() ? btn('Nuevo documento', () => {
    const dest = [...cuerposGestor().map((p) => ['c' + p.cuerpo_id, p.cuerpo]), ...estado.yo.obediencias.filter((o) => o.admin).map((o) => ['o' + o.id, 'Toda la obediencia: ' + o.nombre])];
    formulario('Nuevo documento', [{ k: 'd', label: 'Dónde', tipo: 'select', opciones: dest }, { k: 'titulo', label: 'Título', req: true }, { k: 'texto', label: 'Contenido', tipo: 'textarea', filas: 10, req: true }, { k: 'g', label: 'Quién puede verlo', tipo: 'select', opciones: opcionesGrado() }],
      async (v) => { const b = { titulo: v.titulo, texto: v.texto, grado_min: Number(v.g) }; if (v.d[0] === 'c') b.cuerpo_id = Number(v.d.slice(1)); else b.obediencia_id = Number(v.d.slice(1)); await api('POST', '/docs', b); aviso('Documento creado'); render(); }, 'Crear');
  }, 'btn') : null), vacio('Cada obediencia carga su propio contenido. Esta plataforma no incluye contenido ritual.'));
  if (!docs.length) cont.append(vacio('No hay documentos visibles para ti.'));
  docs.forEach((d) => cont.append(tarjeta(h('button', { type: 'button', class: 'item', onclick: () => ir('biblioteca', d.id) }, h('strong', {}, d.titulo), h('span', { class: 'muted' }, ` · ${d.cuerpo || 'Toda la obediencia'}`), d.grado_min > 1 ? insignia(`Grado ${d.grado_min}+`) : null))));
};
V.directorio = async (cont) => {
  const lista = await api('GET', '/directorio');
  cont.append(h('h1', {}, 'Directorio'), tarjeta(h('p', {}, 'El directorio está ', h('strong', {}, 'oculto por defecto'), '. Solo aparecen quienes lo eligen, y solo ven la lista los miembros de tu obediencia. No se muestra el grado.'),
    h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: estado.yo.directorio_visible, onchange: intentar(async (e) => { await api('POST', '/yo/preferencias', { directorio_visible: e.target.checked }); estado.yo.directorio_visible = e.target.checked; render(); }) }), ' Aparecer en el directorio')));
  if (!lista.length) cont.append(vacio('Nadie es visible todavía.'));
  lista.forEach((m) => cont.append(tarjeta(h('div', { class: 'fila' }, h('span', { class: 'fila-av' }, avatar(m.alias), h('strong', {}, m.alias)), h('span', { class: 'muted' }, m.cuerpo), btn('Escribir', async () => { const r = await api('POST', '/dm', { alias: m.alias }); ir('chat', r.id); })))));
};

// ================= Mi logia (gestión) =================
V.logia = async (cont) => {
  const cat = await api('GET', '/catalogo'), nombresGrado = (nivel) => { for (const r of cat.ritos) { const g = r.grados.find((x) => x.nivel === nivel); if (g) return g.nombre; } return 'Grado ' + nivel; };
  const cuerpos = new Map(cuerposGestor().map((p) => [p.cuerpo_id, { nombre: p.cuerpo, tipo: p.tipo }]));
  let aviso2 = null;
  for (const o of estado.yo.obediencias.filter((x) => x.admin)) { try { (await api('GET', `/admin/${o.id}/estructura`)).cuerpos.forEach((c) => cuerpos.set(c.id, { nombre: c.nombre, tipo: c.tipo })); } catch (e) { aviso2 = e.message; } }
  cont.append(h('h1', {}, 'Mi logia')); if (aviso2) cont.append(tarjeta(h('p', { class: 'muted' }, aviso2), btn('Ir a Perfil', () => ir('perfil'))));
  for (const [id, { nombre, tipo }] of cuerpos) {
    let ms = []; try { ms = await api('GET', `/cuerpos/${id}/miembros`); } catch {}
    cont.append(tarjeta(h('div', { class: 'fila' }, h('h2', {}, nombre, h('span', { class: 'muted' }, ' · ' + (TIPO_NOMBRE[tipo] || ''))), tipo !== 'logia' ? h('span', { class: 'muted' }, 'El ingreso es por solicitud de alta') : btn('Invitar a una persona', async () => {
      const r = await api('POST', '/invitaciones', { cuerpo_id: id }), enlace = `${location.origin}/#/unirse/${r.token}`;
      const dlg = formulario('Invitación creada', [{ k: 'e', label: `Enlace de un solo uso (vale ${r.expira_dias} días). Entrégalo en mano o por un canal de confianza.`, valor: enlace }], async () => { await copiar(enlace); }, 'Copiar enlace'); void dlg;
    }, 'btn')), h('div', { class: 'tabla' }, ms.map((m) => h('div', { class: 'fila' }, h('span', {}, m.alias, m.cargo ? h('span', { class: 'muted' }, ' · ' + m.cargo) : null), h('span', {}, insignia(m.grado || 'Grado ' + m.nivel), m.estado !== 'activa' ? insignia(m.estado, 'warn') : null))))));
  }
  const sols = await api('GET', '/solicitudes');
  cont.append(h('div', { class: 'fila' }, h('h2', {}, 'Solicitudes (doble control)'), btn('Nueva solicitud', () => {
    const ritoGrados = cat.ritos.flatMap((r) => r.grados.map((g) => [g.nivel, `${g.nivel} · ${g.nombre}`])), cargos = [['', 'Sin cargo'], ...cat.cargos.map((c) => [c.id, c.nombre])];
    formulario('Nueva solicitud', [{ k: 'c', label: 'Cuerpo', tipo: 'select', opciones: [...cuerpos].map(([i, c]) => [i, c.nombre]) }, { k: 't', label: 'Tipo', tipo: 'select', opciones: [['ascenso', 'Ascenso'], ['alta', 'Alta / afiliación'], ['cambio_cargo', 'Cambio de cargo'], ['suspension', 'Suspensión'], ['baja', 'Baja'], ['expulsion', 'Expulsión']] },
      { k: 'a', label: 'Alias de la persona', req: true }, { k: 'g', label: 'Grado destino (ascenso o alta)', tipo: 'select', opciones: ritoGrados }, { k: 'cg', label: 'Cargo (cambio de cargo)', tipo: 'select', opciones: cargos }, { k: 'm', label: 'Motivo', tipo: 'textarea', req: true, filas: 3 }],
      async (v) => { await api('POST', '/solicitudes', { cuerpo_id: Number(v.c), tipo: v.t, alias: v.a, grado_destino: Number(v.g), cargo_id: v.cg ? Number(v.cg) : null, motivo: v.m }); aviso('Solicitud creada'); render(); }, 'Enviar');
  }, 'btn')), vacio('Quien solicita no puede aprobar. Los ascensos exigen varios aprobadores con grado igual o mayor al grado destino.'));
  if (!sols.length) cont.append(vacio('No hay solicitudes.'));
  sols.forEach((s) => cont.append(tarjeta(h('div', { class: 'fila' }, h('strong', {}, `${s.tipo} · ${s.objetivo}`), insignia(s.estado, s.estado === 'aprobada' ? 'ok' : s.estado === 'rechazada' ? 'warn' : '')),
    h('div', { class: 'muted' }, `${s.cuerpo} · pidió ${s.solicitante} · ${s.grado_destino ? 'hacia ' + nombresGrado(s.grado_destino) + ' · ' : ''}aprobaciones ${s.aprobaciones}/${s.requeridas}`), h('p', {}, s.motivo),
    s.estado === 'pendiente' ? h('div', {}, btn('Aprobar', async () => { const r = await api('POST', `/solicitudes/${s.id}/resolver`, { aprobar: true }); aviso(r.estado === 'aprobada' ? 'Aprobada y aplicada' : 'Tu aprobación quedó registrada'); render(); }, 'btn'), btn('Rechazar', async () => { await api('POST', `/solicitudes/${s.id}/resolver`, { aprobar: false }); render(); })) : null)));
};

// ================= Administración =================
V.admin = async (cont) => {
  cont.append(h('h1', {}, 'Administración'));
  for (const o of estado.yo.obediencias.filter((x) => x.admin)) {
    let est, aud;
    try { est = await api('GET', `/admin/${o.id}/estructura`); aud = await api('GET', `/admin/${o.id}/auditoria`); } catch (e) { cont.append(tarjeta(h('h2', {}, o.nombre), h('p', { class: 'err' }, e.message), btn('Activar verificación en dos pasos', () => ir('perfil'), 'btn'))); continue; }
    cont.append(tarjeta(h('div', { class: 'fila' }, h('h2', {}, o.nombre), btn('Crear logia / cuerpo', () => formulario('Nuevo cuerpo', [{ k: 't', label: 'Tipo de cuerpo', tipo: 'select', opciones: est.tipos.map((t) => [t.codigo, `${t.nombre} (grados ${t.min}${t.max > t.min ? '–' + t.max : ''})`]) }, { k: 'n', label: 'Nombre', req: true }],
      async (v) => { await api('POST', '/admin/cuerpos', { obediencia_id: o.id, tipo: v.t, nombre: v.n }); aviso('Creado'); render(); }, 'Crear'), 'btn')),
      h('div', { class: 'muted' }, 'Cuerpos: ' + est.cuerpos.map((c) => c.nombre).join(', ')), h('div', { class: 'muted' }, 'Cargos: ' + est.cargos.map((c) => c.nombre + (c.gestor ? '*' : '')).join(', ') + ' (*gestor)')));
    const ok = aud.integridad.auditoria.ok && aud.integridad.membresia.ok;
    cont.append(tarjeta(h('div', { class: 'fila' }, h('h2', {}, 'Auditoría'), insignia(ok ? 'cadena íntegra' : 'ALTERADA', ok ? 'ok' : 'warn')),
      aud.auditoria.slice(0, 40).map((a) => h('div', { class: 'ev muted' }, `${fFecha(a.t)} · ${a.accion} · ${a.detalle || ''}`))));
  }
};

// ================= Perfil y seguridad =================
V.perfil = async (cont) => {
  const sesiones = await api('GET', '/sesiones');
  cont.append(h('h1', {}, 'Perfil y seguridad'), tarjeta(h('h2', {}, estado.yo.alias), estado.yo.pertenencias.map((p) => h('div', { class: 'fila' }, h('span', {}, p.cuerpo, h('span', { class: 'muted' }, ' · ' + (TIPO_NOMBRE[p.tipo] || ''))), h('span', {}, insignia(p.grado || 'Grado ' + p.nivel), p.cargo ? insignia(p.cargo) : null)))));
  const dos = h('div', {});
  if (estado.yo.totp_activo) dos.append(h('p', {}, insignia('Activada', 'ok'), ' Tu cuenta pide un código además de la contraseña.'));
  else dos.append(h('p', { class: 'muted' }, esAdmin() ? 'Obligatoria para usar la administración.' : 'Recomendada.'), btn('Activar verificación en dos pasos', async () => {
    const r = await api('POST', '/2fa/iniciar');
    formulario('Verificación en dos pasos', [{ k: 's', label: 'Clave secreta: agrégala en tu aplicación de verificación (Aegis, FreeOTP, Google Authenticator, etc.)', valor: r.secreto }, { k: 'c', label: 'Código de 6 dígitos que muestra la aplicación', req: true }],
      async (v) => { await api('POST', '/2fa/confirmar', { codigo: v.c }); estado.yo.totp_activo = true; aviso('Verificación activada'); render(); }, 'Confirmar');
  }, 'btn'));
  cont.append(tarjeta(h('h2', {}, 'Verificación en dos pasos'), dos));
  if (cfg.demo) cont.append(tarjeta(h('h2', {}, 'Modo demostración'), h('p', { class: 'muted' }, 'Estás usando datos de ejemplo guardados solo en este navegador. La seguridad real (contraseñas, cifrado, copias) la da el servidor propio.')));
  else if (remoto()) cont.append(tarjeta(h('h2', {}, 'Servidor'), h('p', { class: 'muted mono' }, cfg.base), btn('Cambiar de servidor', async () => { try { await api('POST', '/logout'); } catch {} guardarServidor(''); estado.yo = null; estado.configurado = null; cerrarStream(); location.hash = ''; render(); })));
  cont.append(tarjeta(h('h2', {}, 'Apariencia'), h('div', { class: 'seg', role: 'group', 'aria-label': 'Tema' }, TEMAS.map(([v, n]) => h('button', { type: 'button', 'aria-pressed': (pref().tema || 'auto') === v ? 'true' : 'false', onclick: () => { setPref({ tema: v }); aplicarTema(); render(); } }, n))),
    h('p', { class: 'muted' }, 'Color de acento'), h('div', { class: 'muestras', role: 'group', 'aria-label': 'Color de acento' }, ACENTOS.map(([v, n]) => h('button', { type: 'button', class: 'muestra m-' + v, 'aria-label': n, title: n, 'aria-pressed': (pref().acento || 'azul') === v ? 'true' : 'false', onclick: () => { setPref({ acento: v }); aplicarTema(); render(); } })))));
  cont.append(tarjeta(h('h2', {}, 'Privacidad'), h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !!pref().discreto, onchange: (e) => { setPref({ discreto: e.target.checked }); render(); } }), ' Modo discreto: el título pasa a "Notas" y se oculta el nombre de tu obediencia en pantalla')));
  cont.append(tarjeta(h('h2', {}, 'Dispositivos con sesión abierta'), sesiones.map((s) => h('div', { class: 'fila' }, h('span', { class: 'muted' }, `${(s.dispositivo || 'Dispositivo').slice(0, 50)} · ${fFecha(s.ultima)}`), s.actual ? insignia('este', 'ok') : btn('Cerrar', async () => { await api('POST', '/sesiones/revocar', { id: s.id }); render(); }))),
    h('p', {}, btn('Cerrar sesión en este dispositivo', cerrarSesion, 'btn sec')), h('p', {}, btn('Botón de pánico: cerrar todas las sesiones', async () => { if (!confirm('Se cerrarán todas tus sesiones, también esta. ¿Continuar?')) return; await api('POST', '/panico'); estado.yo = null; cerrarStream(); location.hash = ''; render(); }, 'btn peligro'))));
};
