'use strict';
// Reglas de negocio del libro de la logia. Sin DOM: se prueba en Node. Solo estructura (nombres y jerarquia); sin contenido ritual.
(function (root) {
  const X = root.LogiaCrypto || require('./crypto.js');
  const L = { reloj: () => new Date().toISOString() };

  const NOMBRES_REAA = ['Maestro Secreto','Maestro Perfecto','Secretario Íntimo','Preboste y Juez','Intendente de los Edificios','Maestro Elegido de los Nueve',
    'Ilustre Elegido de los Quince','Sublime Caballero Elegido','Gran Maestro Arquitecto','Real Arco','Gran Elegido Perfecto y Sublime Masón',
    'Caballero de Oriente o de la Espada','Príncipe de Jerusalén','Caballero de Oriente y Occidente','Soberano Príncipe Rosa Cruz','Gran Pontífice',
    'Venerable Gran Maestro','Noaquita o Caballero Prusiano','Caballero del Real Hacha','Jefe del Tabernáculo','Príncipe del Tabernáculo',
    'Caballero de la Serpiente de Bronce','Príncipe de la Merced','Soberano Comendador del Templo','Caballero del Sol','Gran Escocés de San Andrés',
    'Caballero Kadosh','Gran Inspector Inquisidor Comendador','Sublime Príncipe del Real Secreto','Soberano Gran Inspector General'];

  L.estadoInicial = (nombre) => ({
    v: 1,
    meta: { nombre: nombre || 'Mi logia (ficticia)', creado: L.reloj() },
    config: {
      ritos: [
        { id: 'simbolico', nombre: 'Simbólico', grados: [{ nivel: 1, nombre: 'Aprendiz' }, { nivel: 2, nombre: 'Compañero' }, { nivel: 3, nombre: 'Maestro' }] },
        { id: 'reaa', nombre: 'Escocés Antiguo y Aceptado (4-33)', grados: NOMBRES_REAA.map((n, i) => ({ nivel: i + 4, nombre: n })) }
      ],
      cargos: [{ id: 'venerable', nombre: 'Venerable Maestro', gestor: true }, { id: 'secretario', nombre: 'Secretario', gestor: true },
        { id: 'vigilante1', nombre: 'Primer Vigilante', gestor: false }, { id: 'vigilante2', nombre: 'Segundo Vigilante', gestor: false },
        { id: 'tesorero', nombre: 'Tesorero', gestor: true }, { id: 'orador', nombre: 'Orador', gestor: false }],
      saltos: [],              // [{ritoId, desde, hasta}] excepciones al "grado siguiente"
      requisitos: {},          // { "2": [{id, texto}] } requisitos para llegar a ese nivel (los define cada obediencia)
      mesesMinimos: {},        // { "1": 6 } meses minimos en el grado antes de ascender (los define cada obediencia)
      asistenciaMinima: 0,     // % minimo de asistencia para ascender
      aprobadoresAscenso: 2,   // cuantos aprobadores distintos con grado suficiente se registran
      cuotaMensual: 0, moneda: 'COP', inicioCuotas: null, mesesMoroso: 3,
      firmasMinimasActa: 2, bloqueoMin: 5
    },
    miembros: [], eventos: [], tenidas: [], actas: [], pagos: [], planchas: [], tareas: [], docs: [], avisos: [], cumplidos: {}, auditoria: []
  });

  // ---- Historial encadenado por hash (inmutable en la practica: cualquier cambio se detecta) ----
  async function encadenar(lista, datos) {
    const prev = lista.length ? lista[lista.length - 1].hash : '';
    const t = L.reloj();
    const hash = await X.sha256hex(JSON.stringify({ datos, t, prev }));
    const e = { datos, t, prev, hash };
    lista.push(e);
    return e;
  }
  L.verificarCadena = async (lista) => {
    let prev = '';
    for (let i = 0; i < lista.length; i++) {
      const e = lista[i];
      if (e.prev !== prev) return { ok: false, indice: i };
      if (e.hash !== await X.sha256hex(JSON.stringify({ datos: e.datos, t: e.t, prev: e.prev }))) return { ok: false, indice: i };
      prev = e.hash;
    }
    return { ok: true, indice: -1 };
  };
  const audit = (est, accion, detalle) => encadenar(est.auditoria, { accion, detalle: detalle || '' });

  // ---- Utilidades ----
  const req = (c, m) => { if (!c) throw new Error(m); };
  const txt = (v, nombre, max = 200, min = 1) => { v = String(v ?? '').trim(); req(v.length >= min && v.length <= max, `${nombre}: entre ${min} y ${max} caracteres`); return v; };
  const mes = (iso) => String(iso).slice(0, 7);
  const idxMes = (m) => { const [a, b] = m.split('-').map(Number); return a * 12 + (b - 1); };
  const mesDeIdx = (i) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
  const hoy = () => L.reloj().slice(0, 10);

  L.miembro = (est, id) => est.miembros.find(m => m.id === id);
  L.grado = (est, ritoId, nivel) => (est.config.ritos.find(r => r.id === ritoId)?.grados || []).find(g => g.nivel === nivel);
  L.nombreGrado = (est, m) => L.grado(est, m.ritoId, m.nivel)?.nombre || `Grado ${m.nivel}`;
  const esGestor = (est, m) => !!m && m.estado === 'activo' && !!est.config.cargos.find(c => c.id === m.cargoId)?.gestor;
  L.esGestor = esGestor;

  // ---- Miembros ----
  L.altaMiembro = async (est, { alias, ritoId, nivel, cargoId, desde }) => {
    alias = txt(alias, 'Alias', 80, 2);
    const g = L.grado(est, ritoId, Number(nivel));
    req(g, 'Grado inexistente en ese rito');
    req(!est.miembros.some(m => m.alias.toLowerCase() === alias.toLowerCase()), 'Ya existe un miembro con ese alias');
    const m = { id: X.uid(), alias, ritoId, nivel: g.nivel, cargoId: cargoId || null, estado: 'activo', desde: desde || hoy(), visibleDir: false };
    est.miembros.push(m);
    await encadenar(est.eventos, { miembroId: m.id, tipo: 'iniciacion', nivel: m.nivel, motivo: 'Alta en el libro', aprobadores: [] });
    await audit(est, 'miembro.alta', m.id);
    return m;
  };
  L.cambiarEstado = async (est, miembroId, estado, motivo) => {
    const m = L.miembro(est, miembroId); req(m, 'Miembro inexistente');
    req(['activo', 'suspendido', 'baja', 'expulsado'].includes(estado), 'Estado no válido');
    motivo = txt(motivo, 'Motivo', 500, 3);
    req(!(m.estado === 'expulsado' && estado === 'activo'), 'Un miembro expulsado no se reactiva desde aquí');
    m.estado = estado; if (estado !== 'activo') m.cargoId = null;
    await encadenar(est.eventos, { miembroId, tipo: estado === 'activo' ? 'reactivacion' : estado, nivel: m.nivel, motivo, aprobadores: [] });
    await audit(est, 'miembro.estado', `${miembroId}:${estado}`);
  };
  L.cambiarCargo = async (est, miembroId, cargoId, aprobadorId, motivo) => {
    const m = L.miembro(est, miembroId); req(m && m.estado === 'activo', 'Miembro no activo');
    req(!cargoId || est.config.cargos.some(c => c.id === cargoId), 'Cargo inexistente');
    const ap = L.miembro(est, aprobadorId); req(esGestor(est, ap) && ap.id !== m.id, 'Lo aprueba un cargo gestor distinto del afectado');
    m.cargoId = cargoId || null;
    await encadenar(est.eventos, { miembroId, tipo: 'cambio_cargo', nivel: m.nivel, motivo: txt(motivo, 'Motivo', 500, 3), aprobadores: [aprobadorId], cargoId: cargoId || null });
    await audit(est, 'miembro.cargo', miembroId);
  };

  // ---- Asistencia ----
  L.asistenciaPct = (est, miembroId) => {
    const m = L.miembro(est, miembroId); if (!m) return 0;
    const t = est.tenidas.filter(x => x.estado === 'realizada' && x.gradoMin <= m.nivel && x.fecha.slice(0, 10) >= m.desde);
    if (!t.length) return 100;
    return Math.round(100 * t.filter(x => x.asistencia[miembroId] === 'asistio').length / t.length);
  };

  // ---- Ascensos ----
  const fechaUltimoGrado = (est, miembroId) => {
    const ev = est.eventos.filter(e => e.datos.miembroId === miembroId && ['iniciacion', 'ascenso'].includes(e.datos.tipo));
    return ev.length ? ev[ev.length - 1].t.slice(0, 10) : null;
  };
  const siguienteNivel = (est, m) => {
    const salto = est.config.saltos.filter(s => s.ritoId === m.ritoId && s.desde === m.nivel).map(s => s.hasta);
    const rito = est.config.ritos.find(r => r.id === m.ritoId);
    const sig = rito.grados.find(g => g.nivel === m.nivel + 1);
    return [...(sig ? [sig.nivel] : []), ...salto];
  };
  L.siguientesNiveles = siguienteNivel;
  L.requisitosAscenso = (est, miembroId, nivelDestino) => {
    const m = L.miembro(est, miembroId); const faltan = [];
    if (!m || m.estado !== 'activo') return { ok: false, faltan: ['El miembro no está activo'] };
    if (!siguienteNivel(est, m).includes(Number(nivelDestino))) faltan.push('Salto de grado no autorizado (solo el siguiente o los saltos configurados)');
    for (const r of est.config.requisitos[String(nivelDestino)] || []) if (!(est.cumplidos[miembroId] || []).includes(r.id)) faltan.push(`Requisito: ${r.texto}`);
    const min = Number(est.config.mesesMinimos[String(m.nivel)] || 0), desde = fechaUltimoGrado(est, miembroId);
    if (min && desde && idxMes(mes(hoy())) - idxMes(mes(desde)) < min) faltan.push(`Tiempo mínimo en el grado: ${min} meses`);
    if (est.config.asistenciaMinima && L.asistenciaPct(est, miembroId) < est.config.asistenciaMinima) faltan.push(`Asistencia mínima: ${est.config.asistenciaMinima}%`);
    return { ok: faltan.length === 0, faltan };
  };
  L.ascender = async (est, miembroId, nivelDestino, aprobadorIds, motivo) => {
    const m = L.miembro(est, miembroId); req(m, 'Miembro inexistente');
    nivelDestino = Number(nivelDestino);
    const r = L.requisitosAscenso(est, miembroId, nivelDestino); req(r.ok, r.faltan.join(' · '));
    const ids = [...new Set(aprobadorIds)];
    req(ids.length >= est.config.aprobadoresAscenso, `Se requieren ${est.config.aprobadoresAscenso} aprobadores distintos`);
    for (const id of ids) {
      const ap = L.miembro(est, id);
      req(esGestor(est, ap), 'Cada aprobador debe ser un cargo gestor activo');
      req(ap.id !== m.id, 'El afectado no puede aprobar su propio ascenso');
      req(ap.ritoId === m.ritoId ? ap.nivel >= nivelDestino : true, 'Cada aprobador debe tener grado igual o mayor al grado destino');
    }
    m.nivel = nivelDestino;
    await encadenar(est.eventos, { miembroId, tipo: 'ascenso', nivel: nivelDestino, motivo: txt(motivo, 'Motivo', 500, 3), aprobadores: ids });
    await audit(est, 'miembro.ascenso', `${miembroId}:${nivelDestino}`);
  };

  // ---- Tenidas y actas ----
  L.crearTenida = async (est, { titulo, fecha, gradoMin, ordenDia, lugar }) => {
    titulo = txt(titulo, 'Título', 120, 3); req(/^\d{4}-\d{2}-\d{2}/.test(fecha || ''), 'Fecha no válida');
    const t = { id: X.uid(), titulo, fecha, gradoMin: Number(gradoMin) || 1, ordenDia: String(ordenDia || '').slice(0, 4000), lugar: String(lugar || '').slice(0, 200), estado: 'convocada', asistencia: {} };
    est.tenidas.push(t); await audit(est, 'tenida.crear', t.id); return t;
  };
  L.marcarAsistencia = async (est, tenidaId, miembroId, valor) => {
    const t = est.tenidas.find(x => x.id === tenidaId), m = L.miembro(est, miembroId); req(t && m, 'Datos inexistentes');
    req(m.estado === 'activo' && m.nivel >= t.gradoMin, 'Solo miembros activos con grado suficiente');
    req(['asistio', 'excusa', 'ausente'].includes(valor), 'Valor no válido');
    t.asistencia[miembroId] = valor;
  };
  L.cerrarTenida = async (est, tenidaId) => { const t = est.tenidas.find(x => x.id === tenidaId); req(t && t.estado === 'convocada', 'Tenida no disponible'); t.estado = 'realizada'; await audit(est, 'tenida.realizada', tenidaId); };
  L.crearActa = async (est, tenidaId, texto, autorId) => {
    const t = est.tenidas.find(x => x.id === tenidaId); req(t && t.estado === 'realizada', 'La tenida debe estar realizada');
    req(!est.actas.some(a => a.tenidaId === tenidaId), 'Ya existe acta para esta tenida');
    req(esGestor(est, L.miembro(est, autorId)), 'Solo un cargo gestor redacta el acta');
    const a = { id: X.uid(), tenidaId, autorId, versiones: [{ n: 1, texto: txt(texto, 'Texto', 50000), t: L.reloj() }], estado: 'borrador', firmas: [], hashCierre: null };
    est.actas.push(a); await audit(est, 'acta.crear', a.id); return a;
  };
  L.editarActa = async (est, actaId, texto) => {
    const a = est.actas.find(x => x.id === actaId); req(a && a.estado === 'borrador', 'El acta firmada o cerrada no se edita');
    a.versiones.push({ n: a.versiones.length + 1, texto: txt(texto, 'Texto', 50000), t: L.reloj() }); await audit(est, 'acta.editar', actaId);
  };
  const textoActa = a => a.versiones[a.versiones.length - 1].texto;
  L.firmarActa = async (est, actaId, miembroId) => {
    const a = est.actas.find(x => x.id === actaId); req(a && a.estado !== 'cerrada', 'Acta no disponible');
    const t = est.tenidas.find(x => x.id === a.tenidaId), m = L.miembro(est, miembroId);
    req(m && m.estado === 'activo' && t.asistencia[miembroId] === 'asistio', 'Solo firma quien asistió');
    req(!a.firmas.some(f => f.miembroId === miembroId), 'Ya firmó');
    a.firmas.push({ miembroId, t: L.reloj(), hash: await X.sha256hex(textoActa(a)) });
    a.estado = 'firmada'; await audit(est, 'acta.firma', actaId);
  };
  L.cerrarActa = async (est, actaId, gestorId) => {
    const a = est.actas.find(x => x.id === actaId); req(a && a.estado === 'firmada', 'El acta debe estar firmada');
    req(esGestor(est, L.miembro(est, gestorId)), 'Solo un cargo gestor cierra el acta');
    req(a.firmas.length >= est.config.firmasMinimasActa, `Se requieren ${est.config.firmasMinimasActa} firmas`);
    const ts = L.reloj();
    a.hashCierre = await X.sha256hex(JSON.stringify({ tenida: a.tenidaId, texto: textoActa(a), firmas: a.firmas.map(f => [f.miembroId, f.hash]).sort(), ts }));
    a.cerradaEn = ts; a.estado = 'cerrada'; await audit(est, 'acta.cerrar', actaId);
  };
  L.verificarActa = async (est, a) => {
    if (a.estado !== 'cerrada') return false;
    const h = await X.sha256hex(JSON.stringify({ tenida: a.tenidaId, texto: textoActa(a), firmas: a.firmas.map(f => [f.miembroId, f.hash]).sort(), ts: a.cerradaEn }));
    return h === a.hashCierre;
  };

  // ---- Tesoreria ----
  L.registrarPago = async (est, miembroId, periodo, monto, gestorId) => {
    req(esGestor(est, L.miembro(est, gestorId)), 'Solo un cargo gestor registra pagos');
    req(L.miembro(est, miembroId), 'Miembro inexistente'); req(/^\d{4}-\d{2}$/.test(periodo), 'Periodo AAAA-MM');
    monto = Number(monto); req(Number.isFinite(monto) && monto > 0 && monto < 1e12, 'Monto no válido');
    req(!est.pagos.some(p => p.miembroId === miembroId && p.periodo === periodo), 'Ese periodo ya está pagado');
    est.pagos.push({ id: X.uid(), miembroId, periodo, monto, fecha: hoy() }); await audit(est, 'pago.registrar', `${miembroId}:${periodo}`);
  };
  L.periodosAdeudados = (est, miembroId, hastaMes) => {
    const m = L.miembro(est, miembroId); if (!m || m.estado !== 'activo' || !est.config.cuotaMensual) return [];
    const ini = est.config.inicioCuotas && est.config.inicioCuotas > mes(m.desde) ? est.config.inicioCuotas : mes(m.desde);
    const pagados = new Set(est.pagos.filter(p => p.miembroId === miembroId).map(p => p.periodo)), out = [];
    for (let i = idxMes(ini); i <= idxMes(hastaMes || mes(hoy())); i++) if (!pagados.has(mesDeIdx(i))) out.push(mesDeIdx(i));
    return out;
  };
  L.esMoroso = (est, miembroId) => L.periodosAdeudados(est, miembroId).length >= est.config.mesesMoroso;

  // ---- Visibilidad por grado (misma regla que la RLS del backend) ----
  L.puedeVer = (m, recurso) => !!m && m.estado === 'activo' && (recurso.gradoMin || 1) <= m.nivel;
  L.tenidasVisibles = (est, miembroId) => est.tenidas.filter(t => L.puedeVer(L.miembro(est, miembroId), t));

  // ---- Exportaciones seguras ----
  L.csvCelda = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  L.csv = (filas) => filas.map(f => f.map(L.csvCelda).join(',')).join('\r\n');
  const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  L.ics = (tenidas, nombre) => {
    const f = d => { const x = String(d).replace(/[-:]/g, ''); const [a, b = ''] = x.split('T'); return a.slice(0, 8) + 'T' + (b + '000000').slice(0, 6); };
    const ev = tenidas.map(t => ['BEGIN:VEVENT', `UID:${t.id}@logia.local`, `DTSTAMP:${f(L.reloj())}Z`, `DTSTART:${f(t.fecha.length > 10 ? t.fecha : t.fecha + 'T19:00:00')}`,
      `SUMMARY:${icsEsc(t.titulo)}`, `LOCATION:${icsEsc(t.lugar || '')}`, 'END:VEVENT'].join('\r\n'));
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${icsEsc(nombre || 'Logia')}//ES`, ...ev, 'END:VCALENDAR'].join('\r\n') + '\r\n';
  };

  // ---- Planchas (versionadas), tareas/comisiones, biblioteca, avisos, formacion ----
  L.crearPlancha = async (est, { titulo, autorId, texto, gradoMin }) => {
    req(L.miembro(est, autorId), 'Autor inexistente');
    const p = { id: X.uid(), titulo: txt(titulo, 'Título', 160, 3), autorId, gradoMin: Number(gradoMin) || 1, estado: 'borrador', comentarios: [],
      versiones: [{ n: 1, texto: txt(texto, 'Texto', 50000), t: L.reloj() }] };
    est.planchas.push(p); await audit(est, 'plancha.crear', p.id); return p;
  };
  L.versionPlancha = async (est, id, texto) => {
    const p = est.planchas.find(x => x.id === id); req(p && ['borrador', 'revision'].includes(p.estado) && p.estado !== 'entregada', 'La plancha no admite cambios en este estado');
    p.versiones.push({ n: p.versiones.length + 1, texto: txt(texto, 'Texto', 50000), t: L.reloj() }); await audit(est, 'plancha.version', id);
  };
  const FLUJO_PLANCHA = { borrador: ['entregada'], entregada: ['revision'], revision: ['aprobada', 'borrador'], aprobada: [] };
  L.estadoPlancha = async (est, id, estado, revisorId) => {
    const p = est.planchas.find(x => x.id === id); req(p, 'Plancha inexistente');
    req((FLUJO_PLANCHA[p.estado] || []).includes(estado), `Transición no permitida: ${p.estado} → ${estado}`);
    if (['aprobada', 'revision'].includes(estado)) req(esGestor(est, L.miembro(est, revisorId)) && revisorId !== p.autorId, 'Revisa un cargo gestor distinto del autor');
    p.estado = estado; await audit(est, 'plancha.estado', `${id}:${estado}`);
  };
  L.comentarPlancha = async (est, id, miembroId, texto) => {
    const p = est.planchas.find(x => x.id === id); req(p && L.miembro(est, miembroId), 'Datos inexistentes');
    p.comentarios.push({ miembroId, texto: txt(texto, 'Comentario', 2000), t: L.reloj() });
  };
  L.crearTarea = async (est, { titulo, asignadoId, comision, vence }) => {
    req(L.miembro(est, asignadoId), 'Asignado inexistente');
    const k = { id: X.uid(), titulo: txt(titulo, 'Título', 160, 3), asignadoId, comision: String(comision || '').slice(0, 80), vence: vence || null, estado: 'pendiente' };
    est.tareas.push(k); await audit(est, 'tarea.crear', k.id); return k;
  };
  L.estadoTarea = async (est, id, estado) => {
    const k = est.tareas.find(x => x.id === id); req(k && ['pendiente', 'en_curso', 'hecha'].includes(estado), 'Datos no válidos');
    k.estado = estado; await audit(est, 'tarea.estado', `${id}:${estado}`);
  };
  L.tareaVencida = (k) => k.estado !== 'hecha' && !!k.vence && k.vence < hoy();
  L.crearDoc = async (est, { titulo, texto, gradoMin }) => {
    const d = { id: X.uid(), titulo: txt(titulo, 'Título', 160, 3), gradoMin: Number(gradoMin) || 1, versiones: [{ n: 1, texto: txt(texto, 'Contenido', 100000), t: L.reloj() }] };
    est.docs.push(d); await audit(est, 'doc.crear', d.id); return d;
  };
  L.versionDoc = async (est, id, texto) => { const d = est.docs.find(x => x.id === id); req(d, 'Documento inexistente'); d.versiones.push({ n: d.versiones.length + 1, texto: txt(texto, 'Contenido', 100000), t: L.reloj() }); await audit(est, 'doc.version', id); };
  L.borrarDoc = async (est, id) => { const i = est.docs.findIndex(x => x.id === id); req(i >= 0, 'Documento inexistente'); est.docs.splice(i, 1); await audit(est, 'doc.borrar', id); };
  L.crearAviso = async (est, { titulo, texto, gradoMin }) => {
    const a = { id: X.uid(), titulo: txt(titulo, 'Título', 160, 3), texto: txt(texto, 'Texto', 5000), gradoMin: Number(gradoMin) || 1, fecha: hoy() };
    est.avisos.unshift(a); await audit(est, 'aviso.crear', a.id); return a;
  };
  L.marcarRequisito = async (est, miembroId, reqId, valor) => {
    req(L.miembro(est, miembroId), 'Miembro inexistente');
    const set = new Set(est.cumplidos[miembroId] || []); valor ? set.add(reqId) : set.delete(reqId);
    est.cumplidos[miembroId] = [...set]; await audit(est, 'formacion.requisito', `${miembroId}:${reqId}:${valor ? 1 : 0}`);
  };
  L.buscar = (est, q) => {
    q = String(q || '').trim().toLowerCase(); if (q.length < 2) return [];
    const ok = s => String(s).toLowerCase().includes(q), out = [];
    est.miembros.forEach(m => ok(m.alias) && out.push({ tipo: 'miembros', id: m.id, texto: m.alias }));
    est.tenidas.forEach(t => ok(t.titulo) && out.push({ tipo: 'tenidas', id: t.id, texto: t.titulo }));
    est.planchas.forEach(p => (ok(p.titulo) || ok(p.versiones.at(-1).texto)) && out.push({ tipo: 'planchas', id: p.id, texto: p.titulo }));
    est.docs.forEach(d => (ok(d.titulo) || ok(d.versiones.at(-1).texto)) && out.push({ tipo: 'biblioteca', id: d.id, texto: d.titulo }));
    est.tareas.forEach(k => ok(k.titulo) && out.push({ tipo: 'tareas', id: k.id, texto: k.titulo }));
    est.avisos.forEach(a => ok(a.titulo) && out.push({ tipo: 'avisos', id: a.id, texto: a.titulo }));
    return out.slice(0, 50);
  };

  root.Logia = L;
  if (typeof module !== 'undefined') module.exports = L;
})(globalThis);
