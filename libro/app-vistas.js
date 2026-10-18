'use strict';
// Pantallas de cada módulo. Toda regla de negocio vive en core/logia.js (probado en Node); aquí solo se muestra y se llama.
const est = () => S.est;
const alias = (id) => L.miembro(est(), id)?.alias || '—';
const fFecha = (s) => { try { return new Date(s.length > 10 ? s : s + 'T12:00:00').toLocaleString('es', { dateStyle: 'medium', timeStyle: s.length > 10 ? 'short' : undefined }); } catch { return s; } };
const verM = () => (S.verComo ? L.miembro(est(), S.verComo) : null);
const visible = (r) => !S.verComo || L.puedeVer(verM(), r);
const opMiembros = (f) => est().miembros.filter(f || (() => true)).map(m => [m.id, `${m.alias} — ${L.nombreGrado(est(), m)}`]);
const gestores = () => est().miembros.filter(m => L.esGestor(est(), m));
const gradosTodos = () => est().config.ritos.flatMap(r => r.grados.map(g => [g.nivel, `${g.nivel} · ${g.nombre} (${r.nombre})`]));
const card = (...c) => h('div', { class: 'card' }, ...c);
const vacio = (t) => h('p', { class: 'muted' }, t);
const titulo = (t, ...acc) => h('div', { class: 'fila' }, h('h2', {}, t), h('div', {}, ...acc));
const btn = (t, fn, cls = 'a sec') => h('button', { type: 'button', class: cls, onclick: intentar(fn) }, t);
const badge = (t, cls) => h('span', { class: 'badge ' + (cls || '') }, t);

function barras(datos) {
  const ns = 'http://www.w3.org/2000/svg', w = 320, hh = 110, bw = Math.min(30, (w - 10) / Math.max(datos.length, 1) - 6);
  const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${w} ${hh}`); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Asistencia por tenida: ' + datos.map(d => `${d.et} ${d.v}%`).join(', '));
  datos.forEach((d, i) => {
    const x = 8 + i * (bw + 6), alto = Math.round(d.v * 0.8);
    const r = document.createElementNS(ns, 'rect'); r.setAttribute('x', x); r.setAttribute('y', 90 - alto); r.setAttribute('width', bw); r.setAttribute('height', alto); r.setAttribute('rx', 3); r.setAttribute('fill', 'var(--acc)');
    const t = document.createElementNS(ns, 'text'); t.setAttribute('x', x + bw / 2); t.setAttribute('y', 104); t.setAttribute('font-size', 9); t.setAttribute('text-anchor', 'middle'); t.setAttribute('fill', 'var(--fg)'); t.textContent = d.et;
    const p = document.createElementNS(ns, 'text'); p.setAttribute('x', x + bw / 2); p.setAttribute('y', 86 - alto); p.setAttribute('font-size', 9); p.setAttribute('text-anchor', 'middle'); p.setAttribute('fill', 'var(--fg)'); p.textContent = d.v + '%';
    svg.append(r, t, p);
  });
  return svg;
}

// ================= PANEL =================
V.panel = async (m) => {
  const e = est(), act = e.miembros.filter(x => x.estado === 'activo'), hoy = L.reloj().slice(0, 10);
  const prox = e.tenidas.filter(t => t.estado === 'convocada' && t.fecha.slice(0, 10) >= hoy && visible(t)).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const morosos = act.filter(x => L.esMoroso(e, x.id)), vencidas = e.tareas.filter(L.tareaVencida);
  const pend = e.actas.filter(a => a.estado !== 'cerrada');
  const dias = e.meta.ultimaCopia ? (Date.now() - Date.parse(e.meta.ultimaCopia)) / 864e5 : Infinity;
  m.append(h('h2', {}, 'Panel'));
  if (dias > 30) m.append(card(h('strong', {}, 'Haz una copia cifrada. '), 'No hay servidor: si pierdes el dispositivo o borras el navegador, los datos se pierden. ', btn('Ir a Ajustes', () => ir('ajustes'), 'a')));
  m.append(h('div', { class: 'grid' },
    card(h('h3', {}, 'Próxima tenida'), prox ? [h('div', {}, prox.titulo), h('div', { class: 'muted' }, fFecha(prox.fecha)), btn('Ver', () => ir('tenidas', prox.id))] : vacio('No hay tenidas convocadas.')),
    card(h('h3', {}, 'Miembros activos'), h('div', { class: 'num' }, act.length), h('div', { class: 'muted' }, e.miembros.length - act.length + ' no activos')),
    card(h('h3', {}, 'Morosos'), h('div', { class: 'num' }, morosos.length), h('div', { class: 'muted' }, e.config.cuotaMensual ? `Umbral: ${e.config.mesesMoroso} meses` : 'Configura la cuota en Tesorería')),
    card(h('h3', {}, 'Tareas vencidas'), h('div', { class: 'num' }, vencidas.length)),
    card(h('h3', {}, 'Actas sin cerrar'), h('div', { class: 'num' }, pend.length))));
  const real = e.tenidas.filter(t => t.estado === 'realizada').sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-8);
  if (real.length) m.append(card(h('h3', {}, 'Asistencia por tenida'), barras(real.map(t => {
    const el = act.filter(x => x.nivel >= t.gradoMin); const n = el.filter(x => t.asistencia[x.id] === 'asistio').length;
    return { et: t.fecha.slice(5, 10), v: el.length ? Math.round(100 * n / el.length) : 0 };
  }))));
  m.append(card(h('h3', {}, 'Integridad'), h('p', { class: 'muted' }, 'Comprueba que el historial de membresía, la auditoría y las actas cerradas no fueron alterados.'),
    btn('Verificar ahora', async () => {
      const a = await L.verificarCadena(e.eventos), b = await L.verificarCadena(e.auditoria); let actas = 0;
      for (const x of e.actas.filter(z => z.estado === 'cerrada')) if (!await L.verificarActa(e, x)) actas++;
      toast(a.ok && b.ok && !actas ? 'Todo íntegro' : `ALTERADO: historial ${a.ok ? 'ok' : 'roto en #' + a.indice}, auditoría ${b.ok ? 'ok' : 'rota en #' + b.indice}, actas alteradas: ${actas}`, !(a.ok && b.ok && !actas));
    })));
};

// ================= MIEMBROS =================
V.miembros = async (m) => {
  if (S.arg) return detalleMiembro(m, S.arg);
  const e = est(); let q = '', fe = 'activo';
  const lista = h('div', {});
  const pintar = () => {
    lista.replaceChildren();
    const r = e.miembros.filter(x => (fe === 'todos' || x.estado === fe) && x.alias.toLowerCase().includes(q) && (!S.verComo || x.visibleDir || x.id === S.verComo));
    if (!r.length) lista.append(vacio(S.verComo ? 'Nadie es visible para este miembro: el directorio está oculto por defecto.' : 'Sin resultados.'));
    r.forEach(x => lista.append(h('button', { type: 'button', class: 'card fila lista-item', onclick: () => ir('miembros', x.id) },
      h('div', {}, h('strong', {}, x.alias), h('div', { class: 'muted' }, L.nombreGrado(e, x) + (x.cargoId ? ' · ' + e.config.cargos.find(c => c.id === x.cargoId)?.nombre : ''))),
      h('div', {}, badge(x.estado, x.estado === 'activo' ? 'ok' : 'warn'), L.esMoroso(e, x.id) ? badge('moroso', 'warn') : null, badge(L.asistenciaPct(e, x.id) + '%')))));
  };
  m.append(titulo('Miembros', S.verComo ? null : btn('Nuevo miembro', () => formulario('Nuevo miembro', [
    { k: 'alias', label: 'Alias (no uses nombres reales mientras sea una prueba)', req: true },
    { k: 'ritoId', label: 'Rito', tipo: 'select', opciones: e.config.ritos.map(r => [r.id, r.nombre]) },
    { k: 'nivel', label: 'Grado (número)', tipo: 'select', opciones: gradosTodos() },
    { k: 'cargoId', label: 'Cargo', tipo: 'select', opciones: [['', 'Sin cargo'], ...e.config.cargos.map(c => [c.id, c.nombre])] },
    { k: 'desde', label: 'Miembro desde', tipo: 'date', valor: L.reloj().slice(0, 10) }
  ], (v) => ejec(() => L.altaMiembro(e, v), 'Miembro agregado')), 'a')));
  m.append(h('div', { class: 'fila' }, h('div', { class: 'campo' }, h('label', { for: 'bq' }, 'Buscar'), h('input', { id: 'bq', oninput: (ev) => { q = ev.target.value.toLowerCase(); pintar(); } })),
    h('div', { class: 'campo' }, h('label', { for: 'be' }, 'Estado'), h('select', { id: 'be', onchange: (ev) => { fe = ev.target.value; pintar(); } }, ['activo', 'suspendido', 'baja', 'expulsado', 'todos'].map(s => h('option', { value: s }, s))))));
  m.append(lista); pintar();
};

function detalleMiembro(m, id) {
  const e = est(), x = L.miembro(e, id); if (!x) return ir('miembros');
  m.append(h('p', {}, btn('← Volver', () => ir('miembros'))));
  m.append(card(h('h2', {}, x.alias), h('div', {}, `${L.nombreGrado(e, x)} · ${x.estado}`), h('div', { class: 'muted' }, `Desde ${x.desde} · asistencia ${L.asistenciaPct(e, x.id)}%` + (L.esMoroso(e, x.id) ? ' · MOROSO' : '')),
    h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: x.visibleDir, onchange: (ev) => intentar(() => ejec(async () => { x.visibleDir = ev.target.checked; }))() }), ' Visible en el directorio (decide el propio miembro)')));
  if (!S.verComo) {
    const sig = L.siguientesNiveles(e, x), g = gestores();
    m.append(card(h('h3', {}, 'Acciones'),
      btn('Ascender', () => {
        if (!sig.length) throw new Error('No hay un grado siguiente configurado');
        formulario('Ascender a ' + x.alias, [
          { k: 'nivel', label: 'Grado destino', tipo: 'select', opciones: gradosTodos().filter(([n]) => sig.includes(n)) },
          { k: 'ap', label: `Aprobadores (${e.config.aprobadoresAscenso} distintos, cargos gestores)`, tipo: 'checks', opciones: g.filter(y => y.id !== x.id).map(y => [y.id, `${y.alias} — ${L.nombreGrado(e, y)}`]) },
          { k: 'motivo', label: 'Motivo', req: true }], (v) => ejec(() => L.ascender(e, x.id, v.nivel, v.ap, v.motivo), 'Ascenso registrado'), 'Ascender');
      }, 'a'),
      btn('Cambiar cargo', () => formulario('Cambiar cargo', [
        { k: 'cargo', label: 'Nuevo cargo', tipo: 'select', opciones: [['', 'Sin cargo'], ...e.config.cargos.map(c => [c.id, c.nombre])] },
        { k: 'ap', label: 'Aprueba (cargo gestor distinto)', tipo: 'select', opciones: g.filter(y => y.id !== x.id).map(y => [y.id, y.alias]) },
        { k: 'motivo', label: 'Motivo', req: true }], (v) => ejec(() => L.cambiarCargo(e, x.id, v.cargo, v.ap, v.motivo), 'Cargo actualizado'))),
      btn('Cambiar estado', () => formulario('Cambiar estado', [
        { k: 'estado', label: 'Estado', tipo: 'select', opciones: ['activo', 'suspendido', 'baja', 'expulsado'].map(s => [s, s]) },
        { k: 'motivo', label: 'Motivo', req: true }], (v) => ejec(() => L.cambiarEstado(e, x.id, v.estado, v.motivo), 'Estado actualizado')))));
    const faltan = sig.map(n => ({ n, r: L.requisitosAscenso(e, x.id, n) }));
    m.append(card(h('h3', {}, 'Ascenso'), faltan.length ? faltan.map(f => h('div', {}, h('strong', {}, `Hacia grado ${f.n}: `), f.r.ok ? badge('cumple todo', 'ok') : f.r.faltan.map(t => h('div', { class: 'muted' }, '• ' + t)))) : vacio('Sin grado siguiente.')));
    m.append(card(h('h3', {}, 'Cuotas pendientes'), (() => { const a = L.periodosAdeudados(e, x.id); return a.length ? h('div', {}, a.join(', ')) : vacio('Al día (o sin cuota configurada).'); })()));
  }
  m.append(card(h('h3', {}, 'Historial (encadenado, inalterable sin detección)'),
    ...e.eventos.filter(v => v.datos.miembroId === id).reverse().map(v => h('div', { class: 'ev' }, h('strong', {}, v.datos.tipo), ` · grado ${v.datos.nivel} · ${v.t.slice(0, 10)}`, h('div', { class: 'muted' }, v.datos.motivo + (v.datos.aprobadores?.length ? ' · aprobó: ' + v.datos.aprobadores.map(alias).join(', ') : ''))))));
}

// ================= TENIDAS =================
V.tenidas = async (m) => {
  const e = est();
  if (S.arg) return detalleTenida(m, S.arg);
  m.append(titulo('Tenidas', S.verComo ? null : [btn('Calendario (.ics)', () => descargar('tenidas.ics', 'text/calendar', L.ics(e.tenidas.filter(visible), e.meta.nombre))),
    btn('Nueva tenida', () => formulario('Nueva tenida', [
      { k: 'titulo', label: 'Título', req: true }, { k: 'fecha', label: 'Fecha y hora', tipo: 'datetime-local', req: true }, { k: 'lugar', label: 'Lugar' },
      { k: 'gradoMin', label: 'Grado mínimo para ver y asistir', tipo: 'select', opciones: gradosTodos() }, { k: 'ordenDia', label: 'Orden del día', tipo: 'textarea' }],
      (v) => ejec(() => L.crearTenida(e, v), 'Tenida creada')), 'a')]));
  const l = e.tenidas.filter(visible).sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (!l.length) m.append(vacio('No hay tenidas visibles.'));
  l.forEach(t => m.append(h('button', { type: 'button', class: 'card fila lista-item', onclick: () => ir('tenidas', t.id) },
    h('div', {}, h('strong', {}, t.titulo), h('div', { class: 'muted' }, fFecha(t.fecha) + (t.lugar ? ' · ' + t.lugar : ''))), badge(t.estado, t.estado === 'realizada' ? 'ok' : ''))));
};
function detalleTenida(m, id) {
  const e = est(), t = e.tenidas.find(x => x.id === id); if (!t || !visible(t)) return ir('tenidas');
  const acta = e.actas.find(a => a.tenidaId === id), el = e.miembros.filter(x => x.estado === 'activo' && x.nivel >= t.gradoMin);
  m.append(h('p', {}, btn('← Volver', () => ir('tenidas'))));
  m.append(card(h('h2', {}, t.titulo), h('div', {}, fFecha(t.fecha) + (t.lugar ? ' · ' + t.lugar : '')), h('div', { class: 'muted' }, `Grado mínimo: ${t.gradoMin} · ${t.estado}`),
    t.ordenDia ? h('pre', { class: 'texto' }, t.ordenDia) : null,
    h('div', {}, btn('Copiar convocatoria', () => copiar(`CONVOCATORIA\n${t.titulo}\n${fFecha(t.fecha)}${t.lugar ? '\nLugar: ' + t.lugar : ''}${t.ordenDia ? '\n\nOrden del día:\n' + t.ordenDia : ''}`)),
      btn('Calendario (.ics)', () => descargar('tenida.ics', 'text/calendar', L.ics([t], e.meta.nombre))))));
  if (S.verComo) return;
  m.append(card(h('h3', {}, 'Asistencia'), !el.length ? vacio('No hay miembros elegibles.') : el.map(x => h('div', { class: 'fila' }, h('span', {}, x.alias),
    h('select', { 'aria-label': 'Asistencia de ' + x.alias, disabled: t.estado === 'realizada' ? '' : null, onchange: (ev) => intentar(() => ejec(() => L.marcarAsistencia(e, t.id, x.id, ev.target.value)))() },
      [['', '—'], ['asistio', 'Asistió'], ['excusa', 'Excusa'], ['ausente', 'Ausente']].map(([v, n]) => h('option', { value: v, selected: (t.asistencia[x.id] || '') === v ? '' : null }, n))))),
    t.estado === 'convocada' ? btn('Marcar tenida como realizada', () => ejec(() => L.cerrarTenida(e, t.id), 'Tenida realizada'), 'a') : null));
  if (t.estado === 'realizada') m.append(card(h('h3', {}, 'Acta'), acta ? btn('Abrir acta', () => ir('actas', acta.id), 'a') :
    btn('Redactar acta', () => formulario('Redactar acta', [{ k: 'aut', label: 'Redacta (cargo gestor)', tipo: 'select', opciones: gestores().map(g => [g.id, g.alias]) }, { k: 'texto', label: 'Texto del acta', tipo: 'textarea', filas: 10, req: true }],
      (v) => ejec(async () => { const a = await L.crearActa(e, t.id, v.texto, v.aut); S.arg = a.id; S.vista = 'actas'; }, 'Acta creada')), 'a')));
}

// ================= ACTAS =================
V.actas = async (m) => {
  const e = est();
  if (S.arg) {
    const a = e.actas.find(x => x.id === S.arg), t = a && e.tenidas.find(x => x.id === a.tenidaId); if (!a || !visible(t)) return ir('actas');
    const v = a.versiones[a.versiones.length - 1], sellado = a.estado === 'cerrada' ? await L.verificarActa(e, a) : null;
    m.append(h('p', {}, btn('← Volver', () => ir('actas'))));
    m.append(card(h('h2', {}, 'Acta · ' + t.titulo), h('div', {}, badge(a.estado, a.estado === 'cerrada' ? 'ok' : ''), sellado === true ? badge('sello verificado', 'ok') : null, sellado === false ? badge('ALTERADA', 'warn') : null),
      h('div', { class: 'muted' }, `Versión ${v.n} de ${a.versiones.length} · redactó ${alias(a.autorId)}`), h('pre', { class: 'texto' }, v.texto),
      h('div', { class: 'muted' }, 'Firmas: ' + (a.firmas.map(f => alias(f.miembroId)).join(', ') || 'ninguna')), a.hashCierre ? h('div', { class: 'muted mono' }, 'Sello: ' + a.hashCierre) : null,
      h('div', {}, btn('Descargar .txt', () => descargar('acta.txt', 'text/plain', `${t.titulo}\n${t.fecha}\n\n${v.texto}\n\nFirmas: ${a.firmas.map(f => alias(f.miembroId)).join(', ')}\nSello: ${a.hashCierre || '(sin cerrar)'}\n`)))));
    if (S.verComo || a.estado === 'cerrada') return;
    const asist = e.miembros.filter(x => t.asistencia[x.id] === 'asistio' && !a.firmas.some(f => f.miembroId === x.id));
    m.append(card(h('h3', {}, 'Acciones'),
      a.estado === 'borrador' ? btn('Editar (nueva versión)', () => formulario('Editar acta', [{ k: 'texto', label: 'Texto', tipo: 'textarea', filas: 10, valor: v.texto, req: true }], (r) => ejec(() => L.editarActa(e, a.id, r.texto), 'Versión guardada'))) : h('p', { class: 'muted' }, 'Con firmas, el contenido queda congelado.'),
      btn('Firmar', () => formulario('Firmar acta', [{ k: 'm', label: 'Firma quien asistió', tipo: 'select', opciones: asist.map(x => [x.id, x.alias]) }], (r) => ejec(() => L.firmarActa(e, a.id, r.m), 'Firma registrada'))),
      a.estado === 'firmada' ? btn('Cerrar y sellar', () => formulario('Cerrar acta', [{ k: 'g', label: `Cierra (cargo gestor; mínimo ${e.config.firmasMinimasActa} firmas)`, tipo: 'select', opciones: gestores().map(x => [x.id, x.alias]) }], (r) => ejec(() => L.cerrarActa(e, a.id, r.g), 'Acta sellada')), 'a') : null));
    return;
  }
  m.append(h('h2', {}, 'Actas'));
  const l = e.actas.filter(a => visible(e.tenidas.find(t => t.id === a.tenidaId)));
  if (!l.length) m.append(vacio('Aún no hay actas. Se redactan desde una tenida realizada.'));
  l.forEach(a => { const t = e.tenidas.find(x => x.id === a.tenidaId); m.append(h('button', { type: 'button', class: 'card fila lista-item', onclick: () => ir('actas', a.id) }, h('div', {}, h('strong', {}, t.titulo), h('div', { class: 'muted' }, fFecha(t.fecha))), badge(a.estado, a.estado === 'cerrada' ? 'ok' : ''))); });
};

// ================= TESORERIA =================
V.tesoreria = async (m) => {
  const e = est(), c = e.config, mesAct = L.reloj().slice(0, 7);
  m.append(titulo('Tesorería', S.verComo ? null : [btn('Configurar cuota', () => formulario('Cuota y morosidad', [
    { k: 'cuotaMensual', label: 'Cuota mensual (0 = sin cuotas)', tipo: 'number', valor: c.cuotaMensual, min: 0 }, { k: 'moneda', label: 'Moneda', valor: c.moneda },
    { k: 'inicioCuotas', label: 'Cobrar desde (AAAA-MM, opcional)', valor: c.inicioCuotas || '' }, { k: 'mesesMoroso', label: 'Meses para considerar moroso', tipo: 'number', valor: c.mesesMoroso, min: 1 }],
    (v) => ejec(async () => { if (v.inicioCuotas && !/^\d{4}-\d{2}$/.test(v.inicioCuotas)) throw new Error('Formato AAAA-MM'); Object.assign(c, { cuotaMensual: v.cuotaMensual, moneda: String(v.moneda).slice(0, 5), inicioCuotas: v.inicioCuotas || null, mesesMoroso: v.mesesMoroso }); }, 'Guardado'))),
  btn('Registrar pago', () => formulario('Registrar pago', [
    { k: 'm', label: 'Miembro', tipo: 'select', opciones: opMiembros(x => x.estado === 'activo') }, { k: 'p', label: 'Periodo (AAAA-MM)', valor: mesAct, req: true }, { k: 'monto', label: 'Monto', tipo: 'number', valor: c.cuotaMensual || '', min: 1, req: true },
    { k: 'g', label: 'Registra (cargo gestor)', tipo: 'select', opciones: gestores().map(x => [x.id, x.alias]) }], (v) => ejec(() => L.registrarPago(e, v.m, v.p, v.monto, v.g), 'Pago registrado')), 'a')]));
  if (S.verComo) return m.append(vacio('La tesorería es visible solo para la administración. Cada miembro ve únicamente lo suyo en la versión con servidor.'));
  const fm = new Intl.NumberFormat('es'), act = e.miembros.filter(x => x.estado === 'activo');
  const filas = act.map(x => ({ x, ad: L.periodosAdeudados(e, x.id) }));
  m.append(card(h('h3', {}, 'Estado de cuotas'), c.cuotaMensual ? filas.map(({ x, ad }) => h('div', { class: 'fila' }, h('span', {}, x.alias), h('span', {}, ad.length ? badge(`${ad.length} adeudado(s)`, L.esMoroso(e, x.id) ? 'warn' : '') : badge('al día', 'ok')))) : vacio('Configura la cuota mensual para calcular morosidad.'),
    btn('Exportar morosidad (CSV)', () => descargar('morosidad.csv', 'text/csv', L.csv([['Alias', 'Grado', 'Periodos adeudados', 'Monto estimado', 'Moroso'], ...filas.map(({ x, ad }) => [x.alias, L.nombreGrado(e, x), ad.join(' '), ad.length * c.cuotaMensual, L.esMoroso(e, x.id) ? 'sí' : 'no'])])))));
  const porMes = {}; e.pagos.forEach(p => { porMes[p.periodo] = (porMes[p.periodo] || 0) + p.monto; });
  m.append(card(h('h3', {}, 'Recaudado por periodo'), Object.keys(porMes).sort().reverse().map(k => h('div', { class: 'fila' }, h('span', {}, k), h('strong', {}, `${fm.format(porMes[k])} ${c.moneda}`))) , !e.pagos.length ? vacio('Sin pagos.') : null,
    h('p', { class: 'muted' }, 'Este libro no procesa pagos ni guarda datos de tarjeta; solo registra lo cobrado por fuera.')));
  if (e.pagos.length) m.append(btn('Exportar pagos (CSV)', () => descargar('pagos.csv', 'text/csv', L.csv([['Periodo', 'Alias', 'Monto', 'Fecha'], ...e.pagos.map(p => [p.periodo, alias(p.miembroId), p.monto, p.fecha])]))));
};

// ================= FORMACION =================
V.formacion = async (m) => {
  const e = est(); m.append(h('h2', {}, 'Formación y requisitos de ascenso'));
  m.append(vacio('Cada obediencia define sus requisitos (Ajustes → Requisitos). Aquí marcas cuáles cumplió cada miembro; el ascenso se bloquea si falta alguno.'));
  const act = e.miembros.filter(x => x.estado === 'activo' && (!S.verComo || x.id === S.verComo));
  if (!act.length) return m.append(vacio('Sin miembros activos.'));
  act.forEach(x => {
    const niveles = L.siguientesNiveles(e, x);
    m.append(card(h('h3', {}, `${x.alias} · ${L.nombreGrado(e, x)}`), niveles.length ? niveles.map(n => {
      const rq = e.config.requisitos[String(n)] || [], r = L.requisitosAscenso(e, x.id, n);
      return h('div', {}, h('strong', {}, `Hacia grado ${n}`), ' ', r.ok ? badge('listo para ascender', 'ok') : badge('faltan ' + r.faltan.length),
        !rq.length ? h('div', { class: 'muted' }, 'Sin requisitos definidos.') : rq.map(q => h('label', { class: 'chk' }, h('input', { type: 'checkbox', disabled: S.verComo ? '' : null, checked: (e.cumplidos[x.id] || []).includes(q.id), onchange: (ev) => intentar(() => ejec(() => L.marcarRequisito(e, x.id, q.id, ev.target.checked)))() }), ' ' + q.texto)));
    }) : vacio('Sin grado siguiente.')));
  });
};

// ================= PLANCHAS =================
V.planchas = async (m) => {
  const e = est();
  if (S.arg) {
    const p = e.planchas.find(x => x.id === S.arg); if (!p || !visible(p)) return ir('planchas');
    const v = p.versiones.at(-1), g = gestores();
    m.append(h('p', {}, btn('← Volver', () => ir('planchas'))));
    m.append(card(h('h2', {}, p.titulo), badge(p.estado, p.estado === 'aprobada' ? 'ok' : ''), h('div', { class: 'muted' }, `Autor: ${alias(p.autorId)} · versión ${v.n} de ${p.versiones.length}`), h('pre', { class: 'texto' }, v.texto),
      p.versiones.length > 1 ? h('details', {}, h('summary', {}, 'Versiones anteriores'), p.versiones.slice(0, -1).reverse().map(o => h('div', {}, h('div', { class: 'muted' }, `v${o.n} · ${o.t.slice(0, 10)}`), h('pre', { class: 'texto' }, o.texto)))) : null));
    m.append(card(h('h3', {}, 'Comentarios'), p.comentarios.map(c => h('div', { class: 'ev' }, h('strong', {}, alias(c.miembroId)), ' · ' + c.t.slice(0, 10), h('div', {}, c.texto))), !p.comentarios.length ? vacio('Sin comentarios.') : null,
      S.verComo ? null : btn('Comentar', () => formulario('Comentar', [{ k: 'm', label: 'Quien comenta', tipo: 'select', opciones: opMiembros(x => x.estado === 'activo') }, { k: 't', label: 'Comentario', tipo: 'textarea', req: true }], (r) => ejec(() => L.comentarPlancha(e, p.id, r.m, r.t), 'Comentario agregado')))));
    if (S.verComo) return;
    const sig = { borrador: [['entregada', 'Entregar']], entregada: [['revision', 'Pasar a revisión']], revision: [['aprobada', 'Aprobar'], ['borrador', 'Devolver a borrador']], aprobada: [] }[p.estado] || [];
    m.append(card(h('h3', {}, 'Acciones'), ['borrador'].includes(p.estado) || p.estado === 'revision' ? btn('Nueva versión', () => formulario('Nueva versión', [{ k: 't', label: 'Texto', tipo: 'textarea', filas: 12, valor: v.texto, req: true }], (r) => ejec(() => L.versionPlancha(e, p.id, r.t), 'Versión guardada'))) : null,
      sig.map(([est2, n]) => btn(n, () => formulario(n, [{ k: 'r', label: 'Revisor (cargo gestor, distinto del autor)', tipo: 'select', opciones: g.map(x => [x.id, x.alias]) }], (r) => ejec(() => L.estadoPlancha(e, p.id, est2, r.r), 'Estado actualizado')), 'a'))));
    return;
  }
  m.append(titulo('Planchas', S.verComo ? null : btn('Nueva plancha', () => formulario('Nueva plancha', [{ k: 'titulo', label: 'Título', req: true }, { k: 'autorId', label: 'Autor', tipo: 'select', opciones: opMiembros(x => x.estado === 'activo') },
    { k: 'gradoMin', label: 'Grado mínimo para leerla', tipo: 'select', opciones: gradosTodos() }, { k: 'texto', label: 'Texto', tipo: 'textarea', filas: 10, req: true }], (v) => ejec(() => L.crearPlancha(e, v), 'Plancha creada')), 'a')));
  const l = e.planchas.filter(visible); if (!l.length) m.append(vacio('Sin planchas visibles.'));
  l.forEach(p => m.append(h('button', { type: 'button', class: 'card fila lista-item', onclick: () => ir('planchas', p.id) }, h('div', {}, h('strong', {}, p.titulo), h('div', { class: 'muted' }, alias(p.autorId))), badge(p.estado, p.estado === 'aprobada' ? 'ok' : ''))));
};

// ================= TAREAS =================
V.tareas = async (m) => {
  const e = est();
  m.append(titulo('Misiones, tareas y comisiones', S.verComo ? null : btn('Nueva tarea', () => formulario('Nueva tarea', [{ k: 'titulo', label: 'Título', req: true }, { k: 'asignadoId', label: 'Asignada a', tipo: 'select', opciones: opMiembros(x => x.estado === 'activo') },
    { k: 'comision', label: 'Comisión (opcional)' }, { k: 'vence', label: 'Vence', tipo: 'date' }], (v) => ejec(() => L.crearTarea(e, v), 'Tarea creada')), 'a')));
  const l = e.tareas.filter(k => !S.verComo || k.asignadoId === S.verComo);
  if (!l.length) m.append(vacio('Sin tareas.'));
  ['pendiente', 'en_curso', 'hecha'].forEach(est2 => { const g = l.filter(k => k.estado === est2); if (!g.length) return; m.append(h('h3', {}, { pendiente: 'Pendientes', en_curso: 'En curso', hecha: 'Hechas' }[est2]));
    g.forEach(k => m.append(card(h('strong', {}, k.titulo), L.tareaVencida(k) ? badge('vencida', 'warn') : null, h('div', { class: 'muted' }, `${alias(k.asignadoId)}${k.comision ? ' · ' + k.comision : ''}${k.vence ? ' · vence ' + k.vence : ''}`),
      S.verComo ? null : h('select', { 'aria-label': 'Estado de ' + k.titulo, onchange: (ev) => intentar(() => ejec(() => L.estadoTarea(e, k.id, ev.target.value)))() }, ['pendiente', 'en_curso', 'hecha'].map(v => h('option', { value: v, selected: v === k.estado ? '' : null }, v)))))); });
};

// ================= BIBLIOTECA =================
V.biblioteca = async (m) => {
  const e = est();
  if (S.arg) {
    const d = e.docs.find(x => x.id === S.arg); if (!d || !visible(d)) return ir('biblioteca'); const v = d.versiones.at(-1);
    m.append(h('p', {}, btn('← Volver', () => ir('biblioteca'))));
    return m.append(card(h('h2', {}, d.titulo), h('div', { class: 'muted' }, `Grado mínimo ${d.gradoMin} · versión ${v.n} de ${d.versiones.length}`), h('pre', { class: 'texto' }, v.texto),
      S.verComo ? null : h('div', {}, btn('Nueva versión', () => formulario('Nueva versión', [{ k: 't', label: 'Contenido', tipo: 'textarea', filas: 12, valor: v.texto, req: true }], (r) => ejec(() => L.versionDoc(e, d.id, r.t), 'Versión guardada'))),
        btn('Borrar', () => { if (confirmar('¿Borrar este documento y todas sus versiones?')) return ejec(async () => { await L.borrarDoc(e, d.id); S.arg = null; }, 'Documento borrado'); }, 'a pel'))));
  }
  m.append(titulo('Biblioteca', S.verComo ? null : btn('Nuevo documento', () => formulario('Nuevo documento', [{ k: 'titulo', label: 'Título', req: true }, { k: 'gradoMin', label: 'Grado mínimo para verlo', tipo: 'select', opciones: gradosTodos() },
    { k: 'texto', label: 'Contenido (texto)', tipo: 'textarea', filas: 12, req: true }], (v) => ejec(() => L.crearDoc(e, v), 'Documento creado')), 'a')));
  m.append(vacio('Cada obediencia carga su propio contenido; esta app no incluye contenido ritual. Solo texto en esta versión local.'));
  const l = e.docs.filter(visible); if (!l.length) m.append(vacio('Sin documentos visibles.'));
  l.forEach(d => m.append(h('button', { type: 'button', class: 'card fila lista-item', onclick: () => ir('biblioteca', d.id) }, h('div', {}, h('strong', {}, d.titulo), h('div', { class: 'muted' }, 'Grado mínimo ' + d.gradoMin)), badge('v' + d.versiones.length))));
};

// ================= AVISOS =================
V.avisos = async (m) => {
  const e = est();
  m.append(titulo('Avisos', S.verComo ? null : btn('Nuevo aviso', () => formulario('Nuevo aviso', [{ k: 'titulo', label: 'Título', req: true }, { k: 'texto', label: 'Texto', tipo: 'textarea', req: true }, { k: 'gradoMin', label: 'Grado mínimo', tipo: 'select', opciones: gradosTodos() }], (v) => ejec(() => L.crearAviso(e, v), 'Aviso publicado')), 'a')));
  const l = e.avisos.filter(visible); if (!l.length) m.append(vacio('Sin avisos visibles.'));
  l.forEach(a => m.append(card(h('h3', {}, a.titulo), h('div', { class: 'muted' }, a.fecha + ' · grado mínimo ' + a.gradoMin), h('div', {}, a.texto), h('div', {}, btn('Copiar', () => copiar(`${a.titulo}\n\n${a.texto}`))))));
};

// ================= BUSCAR =================
V.buscar = async (m) => {
  const e = est(); m.append(h('h2', {}, 'Buscar'));
  const res = h('div', {});
  m.append(h('div', { class: 'campo' }, h('label', { for: 'bq2' }, 'Miembros, tenidas, planchas, biblioteca, tareas y avisos'), h('input', { id: 'bq2', type: 'search', oninput: (ev) => {
    res.replaceChildren(); const r = L.buscar(e, ev.target.value).filter(x => !S.verComo || x.tipo === 'miembros' ? true : visible(e[{ tenidas: 'tenidas', planchas: 'planchas', biblioteca: 'docs', tareas: 'tareas', avisos: 'avisos' }[x.tipo]].find(y => y.id === x.id) || {}));
    r.forEach(x => res.append(h('button', { type: 'button', class: 'card fila lista-item', onclick: () => ir(x.tipo, x.id) }, h('span', {}, x.texto), badge(x.tipo)))); if (!r.length && ev.target.value.length > 1) res.append(vacio('Sin resultados.')); } })), res);
  setTimeout(() => $('#bq2')?.focus(), 30);
};

// ================= AJUSTES =================
V.ajustes = async (m) => {
  const e = est(), c = e.config; m.append(h('h2', {}, 'Ajustes'));
  m.append(card(h('h3', {}, 'Seguridad'),
    btn('Cambiar clave', () => formulario('Cambiar clave', [{ k: 'a', label: 'Clave actual', tipo: 'password', req: true }, { k: 'n', label: 'Nueva clave (≥10)', tipo: 'password', req: true }, { k: 'n2', label: 'Repite la nueva', tipo: 'password', req: true }], async (v) => {
      if (v.n !== v.n2) throw new Error('Las claves nuevas no coinciden'); await X.abrir(v.a, JSON.parse(localStorage.getItem(K_BOVEDA))); S.llave = await X.nuevaLlave(v.n); await guardar(); toast('Clave cambiada'); })),
    btn('Bloqueo automático', () => formulario('Bloqueo automático', [{ k: 'min', label: 'Minutos de inactividad', tipo: 'number', valor: c.bloqueoMin, min: 1 }, { k: 'oc', label: 'Bloquear al salir de la app', tipo: 'select', opciones: [['0', 'No'], ['1', 'Sí']], valor: c.bloquearAlOcultar ? '1' : '0' }],
      (v) => ejec(async () => { c.bloqueoMin = Math.max(1, Math.min(120, v.min)); c.bloquearAlOcultar = v.oc === '1'; }, 'Guardado'))),
    h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !!pref().discreto, onchange: (ev) => { setPref({ discreto: ev.target.checked }); render(); } }), ' Modo discreto: título "Notas", sin nombre de la logia en pantalla'),
    h('p', {}, btn('Botón de pánico: borrar todo en este dispositivo', () => { if (confirmar('Se borrarán los datos, la caché y la instalación. Sin copia, no hay recuperación. ¿Continuar?')) return panico(); }, 'a pel'))));
  m.append(card(h('h3', {}, 'Copia de seguridad cifrada'), h('p', { class: 'muted' }, 'Es el único respaldo y la forma de llevar el libro a otro dispositivo: guarda el archivo y ábrelo allí con tu clave. Envíalo por un canal que ya uses con confianza.'),
    btn('Exportar copia (.logia)', () => ejec(async () => { e.meta.ultimaCopia = L.reloj(); await guardar(); descargar(`libro-${L.reloj().slice(0, 10)}.logia`, 'application/json', localStorage.getItem(K_BOVEDA)); }, 'Copia exportada'), 'a'), btn('Importar copia', importarCopia)));
  m.append(card(h('h3', {}, 'Libro'), btn('Nombre del libro', () => formulario('Nombre', [{ k: 'n', label: 'Nombre', valor: e.meta.nombre, req: true }], (v) => ejec(async () => { e.meta.nombre = String(v.n).trim().slice(0, 80) || e.meta.nombre; }, 'Guardado')))));
  m.append(card(h('h3', {}, 'Reglas de la obediencia (datos, no código)'),
    btn('Reglas generales', () => formulario('Reglas', [{ k: 'ap', label: 'Aprobadores por ascenso', tipo: 'select', opciones: [['1', '1'], ['2', '2'], ['3', '3']], valor: String(c.aprobadoresAscenso) }, { k: 'fm', label: 'Firmas mínimas para cerrar un acta', tipo: 'number', valor: c.firmasMinimasActa, min: 1 },
      { k: 'as', label: 'Asistencia mínima para ascender (%)', tipo: 'number', valor: c.asistenciaMinima, min: 0 }],
      (v) => ejec(async () => { c.aprobadoresAscenso = Number(v.ap); c.firmasMinimasActa = Math.max(1, v.fm); c.asistenciaMinima = Math.min(100, Math.max(0, v.as)); }, 'Guardado'))),
    btn('Requisitos de ascenso', () => formulario('Agregar requisito', [{ k: 'n', label: 'Para llegar al grado', tipo: 'select', opciones: gradosTodos() }, { k: 't', label: 'Requisito (tú lo defines)', req: true }, { k: 'mm', label: 'Meses mínimos en el grado ANTERIOR (opcional)', tipo: 'number', min: 0, valor: '' }],
      (v) => ejec(async () => { const k = String(v.n); (c.requisitos[k] = c.requisitos[k] || []).push({ id: X.uid(), texto: String(v.t).trim().slice(0, 200) }); if (v.mm) c.mesesMinimos[String(v.n - 1)] = v.mm; }, 'Requisito agregado'))),
    btn('Saltos de grado', () => formulario('Salto autorizado', [{ k: 'r', label: 'Rito de origen', tipo: 'select', opciones: c.ritos.map(r => [r.id, r.nombre]) }, { k: 'd', label: 'Desde el grado', tipo: 'select', opciones: gradosTodos() }, { k: 'a', label: 'Hasta el grado', tipo: 'select', opciones: gradosTodos() }],
      (v) => ejec(async () => { if (Number(v.a) <= Number(v.d)) throw new Error('El destino debe ser mayor'); c.saltos.push({ ritoId: v.r, desde: Number(v.d), hasta: Number(v.a) }); }, 'Salto agregado'))),
    btn('Cargos', () => formulario('Nuevo cargo', [{ k: 'n', label: 'Nombre', req: true }, { k: 'g', label: 'Puede gestionar (aprobar, firmar, registrar pagos)', tipo: 'select', opciones: [['0', 'No'], ['1', 'Sí']] }],
      (v) => ejec(async () => { c.cargos.push({ id: X.uid(), nombre: String(v.n).trim().slice(0, 60), gestor: v.g === '1' }); }, 'Cargo agregado'))),
    btn('Agregar rito', () => formulario('Nuevo rito', [{ k: 'n', label: 'Nombre del rito', req: true }, { k: 'g', label: 'Grados, una línea por grado: número|nombre', tipo: 'textarea', filas: 6, req: true, ayuda: 'Ejemplo:\n1|Primero\n2|Segundo' }],
      (v) => ejec(async () => { const gr = v.g.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [n, ...r] = l.split('|'); const nivel = Number(n); if (!Number.isInteger(nivel) || nivel < 1 || nivel > 99 || !r.join('|').trim()) throw new Error('Línea no válida: ' + l); return { nivel, nombre: r.join('|').trim().slice(0, 80) }; });
        c.ritos.push({ id: X.uid(), nombre: String(v.n).trim().slice(0, 80), grados: gr.sort((a, b) => a.nivel - b.nivel) }); }, 'Rito agregado'))),
    h('p', { class: 'muted' }, `Cargos: ${c.cargos.map(x => x.nombre + (x.gestor ? '*' : '')).join(', ')} (*gestor). Requisitos definidos: ${Object.values(c.requisitos).flat().length}. Saltos: ${c.saltos.length}.`)));
  m.append(card(h('h3', {}, 'Acerca de y límites'), h('p', { class: 'muted' }, 'Todo vive cifrado en este dispositivo; no hay servidor, cuentas compartidas ni chat entre personas. El "doble control" aquí es un registro de quién aprobó, no una barrera técnica entre usuarios distintos: eso exige la versión con servidor. La clave no se puede recuperar. Usa solo datos ficticios hasta una auditoría externa.')));
};
