'use strict';
// Pantallas ampliadas: camino masónico (simbólico y filosófico), herramientas por perfil, agenda, planchas, tareas, formación y tesorería.
const TIPO_NOMBRE = { logia: 'Logia simbólica', perfeccion: 'Logia de Perfección', capitulo: 'Capítulo Rosa Cruz', consejo: 'Consejo de Caballeros Kadosh', consistorio: 'Consistorio', supremo: 'Supremo Consejo' };
const mesActual = () => new Date().toISOString().slice(0, 7);
const dinero = (n, m = 'COP') => `${new Intl.NumberFormat('es').format(n)} ${m}`;
const descargarArchivo = (nombre, mime, contenido) => { const a = h('a', { href: URL.createObjectURL(new Blob([contenido], { type: mime })), download: nombre }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); };
const csvCelda = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

function anillo(pct, num, sub) { // anillo de progreso animado (el trazo se anima por CSSOM, permitido por la política de seguridad)
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), pista = document.createElementNS(ns, 'circle'), valor = document.createElementNS(ns, 'circle');
  svg.setAttribute('viewBox', '0 0 120 120'); svg.setAttribute('aria-hidden', 'true');
  for (const [c, cl] of [[pista, 'pista'], [valor, 'valor']]) { c.setAttribute('cx', 60); c.setAttribute('cy', 60); c.setAttribute('r', 52); c.setAttribute('class', cl); svg.append(c); }
  (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : setTimeout)(() => setTimeout(() => { if (valor.style) valor.style.strokeDashoffset = String(327 * (1 - pct / 100)); }, 60));
  return h('div', { class: 'anillo', role: 'img', 'aria-label': `${num} de 33 grados` }, svg, h('div', { class: 'centro' }, h('b', {}, num), h('small', {}, sub)));
}
// ================= Mi camino masónico =================
V.camino = async (cont) => {
  const data = await api('GET', '/camino');
  const rit = data.flatMap((o) => o.ritos), nivelTop = Math.max(0, ...rit.map((r) => r.nivel_actual)), nombreTop = (rit.map((r) => r.grados.find((g) => g.nivel === nivelTop && g.estado === 'actual')).find(Boolean) || {}).nombre;
  cont.append(h('div', { class: 'card hero' }, h('div', { class: 'hero-camino' }, anillo(Math.round((100 * nivelTop) / 33), nivelTop || '–', 'de 33'), h('div', {}, h('h1', {}, 'Mi camino masónico'),
    h('p', { class: 'muted' }, nivelTop ? `Grado ${nivelTop} · ${nombreTop}` : 'Aún no tienes grado'), h('p', { class: 'muted' }, 'Masonería simbólica (1–3) y filosófica (4–33). Tu grado define lo que ves y lo que puedes hacer.')))));
  if (!data.length) return cont.append(vacio('Aún no perteneces a ninguna obediencia.'));
  for (const o of data) {
    cont.append(h('h2', {}, o.nombre));
    for (const r of o.ritos) {
      const hechos = r.grados.filter((g) => g.estado === 'alcanzado' || g.estado === 'actual').length, pct = Math.round((100 * hechos) / r.grados.length), simb = r.codigo === 'simbolico';
      const bloques = o.tipos.filter((t) => r.grados.some((g) => g.tipo === t.codigo)).map((t) => {
        const gs = r.grados.filter((g) => g.tipo === t.codigo), alc = gs.filter((g) => g.estado === 'alcanzado' || g.estado === 'actual').length;
        return h('section', { class: 'bloque-cuerpo' }, h('div', { class: 'fila' }, h('h3', {}, `${t.nombre} · grados ${t.min}${t.max > t.min ? '–' + t.max : ''}`), h('span', { class: 'muted' }, `${alc}/${gs.length}`)),
          h('div', { class: 'grados' }, gs.map((g) => h('div', { class: 'grado ' + g.estado, tabindex: '0', role: 'img', 'aria-label': `Grado ${g.nivel}, ${g.nombre}: ${{ alcanzado: 'alcanzado', actual: 'tu grado actual', siguiente: 'próximo grado', bloqueado: 'aún no disponible' }[g.estado]}${g.fecha ? ', ' + g.fecha : ''}` },
            icono({ alcanzado: 'check', actual: 'estrella', siguiente: 'flecha', bloqueado: 'candado' }[g.estado]), h('b', {}, g.nivel), h('span', {}, g.nombre), g.fecha ? h('small', {}, g.fecha) : null))));
      });
      const sig = r.siguiente;
      cont.append(tarjeta(h('div', { class: 'fila' }, h('h2', {}, simb ? 'Masonería simbólica' : 'Masonería filosófica'), insignia(r.miembro ? `Grado ${r.nivel_actual}` : 'Aún no ingresas', r.miembro ? 'ok' : '')),
        h('div', { class: 'muted' }, r.nombre), h('div', { class: 'progreso', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': 'Avance en ' + r.nombre }, h('div', { class: 'progreso-barra', style: `width:${pct}%` })), h('div', { class: 'muted' }, `${hechos} de ${r.grados.length} grados · ${pct}%`),
        r.cuerpos.length ? h('div', { class: 'cuerpos' }, r.cuerpos.map((c) => h('span', { class: 'chip' }, `${TIPO_NOMBRE[c.tipo] || 'Cuerpo'}: ${c.nombre} · grado ${c.nivel}${c.cargo ? ' · ' + c.cargo : ''}`))) : null,
        ...bloques,
        sig ? h('div', { class: 'proximo' }, h('h3', {}, `Próximo grado: ${sig.nivel} · ${sig.nombre}`), h('div', { class: 'muted' }, `Se confiere en: ${TIPO_NOMBRE[sig.tipo] || 'el cuerpo correspondiente'}.`),
          sig.puede_optar ? h('div', {}, sig.requisitos.length ? h('ul', { class: 'requisitos' }, sig.requisitos.map((q) => h('li', { class: q.cumplido ? 'ok' : '' }, (q.cumplido ? '✔ ' : '○ ') + q.texto))) : h('div', { class: 'muted' }, 'Sin requisitos definidos por tu obediencia.'), h('p', { class: 'muted' }, 'Cuando cumplas los requisitos, un cargo de ese cuerpo solicita tu ascenso o alta; la decisión pasa por doble control.'))
            : h('div', { class: 'muted' }, 'Para optar a este camino se requiere antes el grado 3 (Maestro).')) : h('div', { class: 'muted' }, 'Has alcanzado el último grado de este rito.')));
    }
  }
};

// ================= Herramientas y pendientes del inicio =================
async function panelHerramientas(cont) {
  const gest = esGestor(), adm = esAdmin();
  const tiles = [['camino', '◆', 'Mi camino', 'Grados simbólicos y filosóficos'], ['agenda', '▦', 'Agenda', 'Tenidas y tareas por fecha'], ['chat', '✉', 'Chat', 'Canales y mensajes directos'], ['planchas', '✎', 'Planchas', 'Trabajos de estudio y revisión'], ['tareas', '☑', 'Tareas', 'Misiones y comisiones'],
    ['formacion', '★', 'Formación', 'Requisitos de ascenso'], ['tesoreria', '¤', gest ? 'Tesorería' : 'Mis cuotas', gest ? 'Cuotas, pagos y morosidad' : 'Estado de tus cuotas'], ['biblioteca', '▤', 'Biblioteca', 'Documentos por grado'], ['directorio', '☺', 'Directorio', 'Personas visibles']];
  if (gest) tiles.push(['tenidas', '⚑', 'Tenidas y actas', 'Convocar, asistencia, actas'], ['logia', '⚙', 'Mi logia', 'Miembros, invitaciones, aprobaciones']);
  if (adm) tiles.push(['admin', '⛨', 'Administración', 'Cuerpos y auditoría']);
  cont.append(tarjeta(h('h2', {}, 'Mis herramientas'), h('div', { class: 'tiles' }, tiles.map(([v, ico, t, d]) => h('button', { type: 'button', class: 'tile', onclick: () => ir(v) }, h('span', { class: 'ico', 'aria-hidden': 'true' }, icono(v)), h('strong', {}, t), h('small', {}, d))))));
  const seguro = async (fn) => { try { return await fn(); } catch { return []; } };
  const [sols, pls, tks, cuo] = await Promise.all([gest || adm ? seguro(() => api('GET', '/solicitudes')) : [], seguro(() => api('GET', '/planchas')), seguro(() => api('GET', '/tareas')), seguro(() => api('GET', '/mis-cuotas'))]);
  const items = [];
  const porAprobar = sols.filter((s) => s.estado === 'pendiente' && !s.yo_aprobe && s.solicitante !== estado.yo.alias && s.objetivo !== estado.yo.alias).length; if (porAprobar) items.push(['logia', `${porAprobar} solicitud(es) esperan tu aprobación`]);
  const porRevisar = pls.filter((p) => p.gestor && !p.mia && ['entregada', 'revision'].includes(p.estado)).length; if (porRevisar) items.push(['planchas', `${porRevisar} plancha(s) por revisar`]);
  const mis = tks.filter((t) => t.mia && t.estado !== 'hecha'), venc = mis.filter((t) => t.vence && t.vence < new Date().toISOString().slice(0, 10)).length; if (mis.length) items.push(['tareas', `${mis.length} tarea(s) tuyas pendientes${venc ? ` (${venc} vencida(s))` : ''}`]);
  const deuda = cuo.filter((c) => c.adeudados.length); if (deuda.length) items.push(['tesoreria', `Tienes cuotas pendientes: ${deuda.map((c) => c.adeudados.length + ' en ' + c.cuerpo).join(', ')}`]);
  cont.append(tarjeta(h('h2', {}, 'Pendientes'), items.length ? items.map(([v, t]) => h('button', { type: 'button', class: 'pendiente', onclick: () => ir(v) }, icono('flecha'), t)) : h('p', { class: 'muted' }, 'Estás al día: no tienes pendientes.')));
  cont.append(tarjeta(h('h2', {}, 'Mis cuerpos'), estado.yo.pertenencias.map((p) => h('div', { class: 'fila' }, h('span', {}, h('strong', {}, p.cuerpo), h('span', { class: 'muted' }, ' · ' + (TIPO_NOMBRE[p.tipo] || ''))), h('span', {}, insignia(`Grado ${p.nivel}${p.grado ? ' · ' + p.grado : ''}`), p.cargo ? insignia(p.cargo, 'ok') : null)))));
}

// ================= Agenda =================
let agendaMes = null;
V.agenda = async (cont) => {
  const [tenidas, tareas] = await Promise.all([api('GET', '/tenidas'), api('GET', '/tareas').catch(() => [])]);
  const hoy = new Date(); if (!agendaMes) agendaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const y = agendaMes.getFullYear(), m = agendaMes.getMonth(), nDias = new Date(y, m + 1, 0).getDate(), inicio = (new Date(y, m, 1).getDay() + 6) % 7;
  const evs = {}; const add = (f, e) => { (evs[f] ||= []).push(e); };
  tenidas.forEach((t) => add(String(t.fecha).slice(0, 10), { t: 'tenida', id: t.id, txt: t.titulo, hora: String(t.fecha).slice(11, 16) })); tareas.filter((k) => k.vence && k.estado !== 'hecha').forEach((k) => add(k.vence, { t: 'tarea', id: k.id, txt: k.titulo }));
  const celdas = []; for (let i = 0; i < inicio; i++) celdas.push(h('div', { class: 'dia vacio' }));
  for (let d = 1; d <= nDias; d++) { const f = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, es = evs[f] || [], esHoy = f === hoy.toISOString().slice(0, 10);
    celdas.push(h('div', { class: 'dia' + (esHoy ? ' hoy' : '') }, h('span', { class: 'num-dia' }, d), es.slice(0, 3).map((e) => h('button', { type: 'button', class: 'evt ' + e.t, onclick: () => ir(e.t === 'tenida' ? 'tenidas' : 'tareas', e.t === 'tenida' ? e.id : null) }, (e.hora ? e.hora + ' ' : '') + e.txt)), es.length > 3 ? h('small', { class: 'muted' }, `+${es.length - 3} más`) : null)); }
  const ics = () => { const f = (d) => { const x = String(d).replace(/[-:]/g, ''); const [a, b = ''] = x.split('T'); return a.slice(0, 8) + 'T' + (b + '190000').slice(0, 6); }, esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Centro Masonico//ES', ...tenidas.flatMap((t) => ['BEGIN:VEVENT', `UID:tenida-${t.id}@centro.local`, `DTSTAMP:${f(new Date().toISOString())}Z`, `DTSTART:${f(t.fecha)}`, `SUMMARY:${esc(t.titulo)}`, `LOCATION:${esc(t.lugar || '')}`, 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n') + '\r\n'; };
  cont.append(h('div', { class: 'fila' }, h('h1', {}, 'Agenda'), btn('Descargar calendario (.ics)', () => descargarArchivo('tenidas.ics', 'text/calendar', ics()))),
    tarjeta(h('div', { class: 'fila' }, btn('← Anterior', () => { agendaMes = new Date(y, m - 1, 1); render(); }), h('strong', {}, new Date(y, m, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' })), h('span', {}, btn('Hoy', () => { agendaMes = null; render(); }), btn('Siguiente →', () => { agendaMes = new Date(y, m + 1, 1); render(); }))),
      h('div', { class: 'calendario', role: 'grid' }, ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => h('div', { class: 'cab-dia', role: 'columnheader' }, d)), ...celdas)));
};

// ================= Planchas =================
const ESTADO_PL = { borrador: 'Borrador', entregada: 'Entregada', revision: 'En revisión', aprobada: 'Aprobada' };
V.planchas = async (cont, arg) => {
  if (arg) return detallePlancha(cont, arg);
  const l = await api('GET', '/planchas');
  cont.append(h('div', { class: 'fila' }, h('h1', {}, 'Planchas'), btn('Nueva plancha', () => formulario('Nueva plancha', [{ k: 'c', label: 'Cuerpo', tipo: 'select', opciones: estado.yo.pertenencias.map((p) => [p.cuerpo_id, p.cuerpo]) }, { k: 't', label: 'Título', req: true }, { k: 'g', label: 'Quién podrá leerla cuando se apruebe', tipo: 'select', opciones: opcionesGrado() }, { k: 'x', label: 'Texto', tipo: 'textarea', filas: 8, req: true }],
    async (v) => { const r = await api('POST', '/planchas', { cuerpo_id: Number(v.c), titulo: v.t, grado_min: Number(v.g), texto: v.x }); aviso('Borrador creado'); ir('planchas', r.id); }, 'Crear borrador'), 'btn')),
    vacio('Una plancha es un trabajo de estudio: se redacta, se entrega y un cargo la revisa. Solo tú y los cargos ven los borradores; las aprobadas se comparten según el grado.'));
  const seccion = (titulo, items) => { if (!items.length) return; cont.append(h('h3', {}, titulo)); items.forEach((p) => cont.append(tarjeta(h('button', { type: 'button', class: 'item', onclick: () => ir('planchas', p.id) }, h('strong', {}, p.titulo), h('span', { class: 'muted' }, ` · ${p.autor} · ${p.cuerpo} · v${p.versiones}`), insignia(ESTADO_PL[p.estado], p.estado === 'aprobada' ? 'ok' : ''), p.grado_min > 1 ? insignia(`Grado ${p.grado_min}+`) : null)))); };
  if (!l.length) cont.append(vacio('No hay planchas visibles para ti.'));
  seccion('Mis planchas', l.filter((p) => p.mia)); seccion('Por revisar', l.filter((p) => p.gestor && !p.mia && ['entregada', 'revision'].includes(p.estado))); seccion('Aprobadas por la logia', l.filter((p) => !p.mia && p.estado === 'aprobada'));
};
async function detallePlancha(cont, id) {
  const p = await api('GET', '/planchas/' + id), act = (estado2, texto, cls) => btn(texto, async () => { await api('POST', `/planchas/${id}/estado`, { estado: estado2 }); aviso('Estado actualizado'); render(); }, cls || 'btn');
  cont.append(h('p', {}, btn('← Volver', () => ir('planchas'))), tarjeta(h('h1', {}, p.titulo), h('div', { class: 'muted' }, `${p.autor} · versión ${p.versiones[0].n} de ${p.versiones.length}`), insignia(ESTADO_PL[p.estado], p.estado === 'aprobada' ? 'ok' : ''), h('p', { class: 'texto' }, p.versiones[0].texto),
    p.versiones.length > 1 ? h('details', {}, h('summary', {}, 'Versiones anteriores'), p.versiones.slice(1).map((v) => h('div', {}, h('div', { class: 'muted' }, `v${v.n} · ${fFecha(v.t)}`), h('p', { class: 'texto' }, v.texto)))) : null));
  const acciones = [];
  if (p.mia && p.estado === 'borrador') acciones.push(btn('Nueva versión', () => formulario('Nueva versión', [{ k: 'x', label: 'Texto', tipo: 'textarea', filas: 10, valor: p.versiones[0].texto, req: true }], async (v) => { await api('POST', `/planchas/${id}/version`, { texto: v.x }); render(); })), act('entregada', 'Entregar para revisión'));
  if (p.gestor && !p.mia && p.estado === 'entregada') acciones.push(act('revision', 'Tomar para revisión'));
  if (p.gestor && !p.mia && p.estado === 'revision') acciones.push(act('aprobada', 'Aprobar'), act('borrador', 'Devolver al autor', 'btn sec'));
  if (acciones.length) cont.append(tarjeta(h('h2', {}, 'Acciones'), ...acciones));
  cont.append(tarjeta(h('h2', {}, 'Comentarios'), p.comentarios.length ? p.comentarios.map((c) => h('div', { class: 'ev' }, h('strong', {}, c.alias), h('span', { class: 'muted' }, ' · ' + fFecha(c.t)), h('div', {}, c.texto))) : vacio('Sin comentarios.'),
    p.mia || p.gestor ? btn('Comentar', () => formulario('Comentar', [{ k: 't', label: 'Comentario', tipo: 'textarea', req: true }], async (v) => { await api('POST', `/planchas/${id}/comentar`, { texto: v.t }); render(); })) : null));
}

// ================= Tareas y comisiones =================
V.tareas = async (cont) => {
  const l = await api('GET', '/tareas');
  cont.append(h('div', { class: 'fila' }, h('h1', {}, 'Tareas y comisiones'), esGestor() ? btn('Nueva tarea', () => formulario('Nueva tarea', [{ k: 'c', label: 'Cuerpo', tipo: 'select', opciones: cuerposGestor().map((p) => [p.cuerpo_id, p.cuerpo]) }, { k: 'a', label: 'Asignada a (alias)', req: true }, { k: 't', label: 'Tarea', req: true }, { k: 'm', label: 'Comisión (opcional)' }, { k: 'v', label: 'Vence', tipo: 'date' }],
    async (v) => { await api('POST', '/tareas', { cuerpo_id: Number(v.c), alias: v.a, titulo: v.t, comision: v.m, vence: v.v || undefined }); aviso('Tarea asignada'); render(); }, 'Asignar'), 'btn') : null));
  if (!l.length) cont.append(vacio('No tienes tareas asignadas.'));
  for (const est of ['pendiente', 'en_curso', 'hecha']) { const g = l.filter((t) => t.estado === est); if (!g.length) continue; cont.append(h('h3', {}, { pendiente: 'Pendientes', en_curso: 'En curso', hecha: 'Hechas' }[est]));
    g.forEach((t) => cont.append(tarjeta(h('strong', {}, t.titulo), t.vence && t.estado !== 'hecha' && t.vence < new Date().toISOString().slice(0, 10) ? insignia('vencida', 'warn') : null, h('div', { class: 'muted' }, `${t.asignado}${t.comision ? ' · ' + t.comision : ''}${t.vence ? ' · vence ' + t.vence : ''} · ${t.cuerpo}`),
      h('select', { 'aria-label': 'Estado de ' + t.titulo, onchange: intentar(async (e) => { await api('POST', `/tareas/${t.id}/estado`, { estado: e.target.value }); render(); }) }, ['pendiente', 'en_curso', 'hecha'].map((v) => h('option', { value: v, selected: v === t.estado }, { pendiente: 'Pendiente', en_curso: 'En curso', hecha: 'Hecha' }[v])))))); }
};

// ================= Formación =================
V.formacion = async (cont) => {
  const [camino, reqs, cat] = await Promise.all([api('GET', '/camino'), api('GET', '/requisitos'), api('GET', '/catalogo')]);
  const nombreGrado = (n) => { for (const r of cat.ritos) { const g = r.grados.find((x) => x.nivel === n); if (g) return g.nombre; } return 'Grado ' + n; };
  cont.append(h('h1', {}, 'Formación y requisitos de ascenso'), vacio('Cada obediencia define los requisitos para cada grado. Un cargo registra tu cumplimiento y, mientras falte alguno, no se puede solicitar tu ascenso.'));
  for (const o of camino) for (const r of o.ritos) if (r.siguiente) cont.append(tarjeta(h('h2', {}, `${r.codigo === 'simbolico' ? 'Simbólica' : 'Filosófica'}: hacia el grado ${r.siguiente.nivel} · ${r.siguiente.nombre}`),
    r.siguiente.puede_optar ? (r.siguiente.requisitos.length ? h('ul', { class: 'requisitos' }, r.siguiente.requisitos.map((q) => h('li', { class: q.cumplido ? 'ok' : '' }, (q.cumplido ? '✔ ' : '○ ') + q.texto))) : vacio('Sin requisitos definidos.')) : vacio('Requiere antes el grado 3 (Maestro).')));
  if (esGestor()) cont.append(tarjeta(h('div', { class: 'fila' }, h('h2', {}, 'Registrar cumplimiento'), btn('Registrar', () => formulario('Registrar cumplimiento', [{ k: 'r', label: 'Requisito', tipo: 'select', opciones: reqs.map((q) => [q.id, `Grado ${q.grado_destino}: ${q.texto}`]) }, { k: 'a', label: 'Alias de la persona', req: true }, { k: 'v', label: 'Resultado', tipo: 'select', opciones: [['1', 'Cumplido'], ['0', 'Quitar cumplimiento']] }],
    async (v) => { await api('POST', `/requisitos/${v.r}/cumplimiento`, { alias: v.a, valor: v.v === '1' }); aviso('Registrado'); render(); }, 'Guardar'), 'btn')), vacio('Solo puedes registrar a personas que pertenecen a un cuerpo donde tienes un cargo gestor.')));
  cont.append(tarjeta(h('div', { class: 'fila' }, h('h2', {}, 'Requisitos de la obediencia'), esAdmin() ? btn('Nuevo requisito', () => formulario('Nuevo requisito', [{ k: 'o', label: 'Obediencia', tipo: 'select', opciones: estado.yo.obediencias.filter((x) => x.admin).map((x) => [x.id, x.nombre]) }, { k: 'g', label: 'Para llegar al grado', tipo: 'select', opciones: cat.ritos.flatMap((r) => r.grados.map((g) => [g.nivel, `${g.nivel} · ${g.nombre}`])) }, { k: 't', label: 'Requisito (lo define tu obediencia)', req: true }],
    async (v) => { await api('POST', '/requisitos', { obediencia_id: Number(v.o), grado_destino: Number(v.g), texto: v.t }); aviso('Requisito creado'); render(); }, 'Crear'), 'btn') : null),
    reqs.length ? reqs.map((q) => h('div', { class: 'fila' }, h('span', {}, `Grado ${q.grado_destino} · ${nombreGrado(q.grado_destino)}: ${q.texto}`), q.cumplido ? insignia('cumplido', 'ok') : null)) : vacio('Aún no hay requisitos definidos.')));
};

// ================= Tesorería =================
V.tesoreria = async (cont) => {
  const [mias, yoCuerpos] = [await api('GET', '/mis-cuotas'), cuerposGestor()];
  cont.append(h('h1', {}, esGestor() ? 'Tesorería' : 'Mis cuotas'));
  cont.append(tarjeta(h('h2', {}, 'Mis cuotas'), mias.length ? mias.map((c) => h('div', {}, h('div', { class: 'fila' }, h('strong', {}, c.cuerpo), insignia(c.adeudados.length ? (c.moroso ? 'moroso' : `${c.adeudados.length} pendiente(s)`) : 'al día', c.adeudados.length ? 'warn' : 'ok')),
    h('div', { class: 'muted' }, `Cuota mensual: ${dinero(c.cuota.monto, c.cuota.moneda)}`), c.adeudados.length ? h('div', {}, 'Pendiente: ' + c.adeudados.join(', ')) : null, c.pagos.length ? h('details', {}, h('summary', {}, `Pagos registrados (${c.pagos.length})`), c.pagos.map((p) => h('div', { class: 'muted' }, `${p.periodo} · ${dinero(p.monto, c.cuota.moneda)} · ${p.fecha}`))) : null)) : vacio('Tus cuerpos no tienen cuota configurada.'),
    h('p', { class: 'muted' }, 'Esta plataforma solo registra lo cobrado; no procesa pagos ni guarda datos de tarjetas.')));
  for (const gc of yoCuerpos) {
    const t = await api('GET', '/tesoreria/' + gc.cuerpo_id), mon = t.cuota ? t.cuota.moneda : 'COP', max = Math.max(1, ...t.recaudado.map((r) => r.total));
    cont.append(tarjeta(h('div', { class: 'fila' }, h('h2', {}, 'Gestión: ' + gc.cuerpo), h('span', {}, btn('Configurar cuota', () => formulario('Cuota mensual', [{ k: 'm', label: 'Monto mensual', tipo: 'number', valor: t.cuota ? t.cuota.monto : 0, min: 0 }, { k: 'mo', label: 'Moneda', valor: mon }, { k: 'i', label: 'Cobrar desde (AAAA-MM)', valor: t.cuota ? t.cuota.inicio : mesActual() }, { k: 'mm', label: 'Meses para considerar moroso', tipo: 'number', valor: t.cuota ? t.cuota.meses_moroso : 3, min: 1 }],
      async (v) => { await api('POST', '/tesoreria/config', { cuerpo_id: gc.cuerpo_id, monto: v.m, moneda: v.mo, inicio: v.i, meses_moroso: v.mm }); aviso('Cuota guardada'); render(); }, 'Guardar')),
      btn('Registrar pago', () => formulario('Registrar pago', [{ k: 'a', label: 'Miembro', tipo: 'select', opciones: t.miembros.map((m) => [m.alias, m.alias]) }, { k: 'p', label: 'Periodo (AAAA-MM)', valor: mesActual(), req: true }, { k: 'x', label: 'Monto', tipo: 'number', valor: t.cuota ? t.cuota.monto : '', min: 1, req: true }],
        async (v) => { await api('POST', '/tesoreria/pago', { cuerpo_id: gc.cuerpo_id, alias: v.a, periodo: v.p, monto: v.x }); aviso('Pago registrado'); render(); }, 'Registrar'), 'btn'))),
      t.cuota ? h('div', { class: 'muted' }, `Cuota: ${dinero(t.cuota.monto, mon)} · desde ${t.cuota.inicio} · moroso desde ${t.cuota.meses_moroso} meses`) : h('div', { class: 'muted' }, 'Aún no hay cuota configurada.'),
      h('h3', {}, 'Estado de los miembros'), t.miembros.map((m) => h('div', { class: 'fila' }, h('span', {}, m.alias), h('span', {}, m.adeudados.length ? insignia(`${m.adeudados.length} pendiente(s)`, m.moroso ? 'warn' : '') : insignia('al día', 'ok'), m.moroso ? insignia('moroso', 'warn') : null))),
      t.miembros.length ? btn('Exportar morosidad (CSV)', () => descargarArchivo('morosidad.csv', 'text/csv', [['Alias', 'Periodos adeudados', 'Monto estimado', 'Moroso'], ...t.miembros.map((m) => [m.alias, m.adeudados.join(' '), m.adeudados.length * (t.cuota ? t.cuota.monto : 0), m.moroso ? 'sí' : 'no'])].map((f) => f.map(csvCelda).join(',')).join('\r\n'))) : null,
      t.recaudado.length ? h('div', {}, h('h3', {}, 'Recaudado por periodo'), t.recaudado.map((r) => h('div', { class: 'barra-fila' }, h('span', { class: 'muted' }, r.periodo), h('div', { class: 'barra' }, h('div', { class: 'barra-v', style: `width:${Math.round((100 * r.total) / max)}%` })), h('span', {}, dinero(r.total, mon))))) : null));
  }
};
