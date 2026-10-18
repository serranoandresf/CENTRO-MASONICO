'use strict';
// SERVIDOR DE DEMOSTRACIÓN que corre DENTRO del navegador: mismas rutas, mismas reglas de permisos y los mismos mensajes que el servidor real,
// con datos de ejemplo guardados solo en este navegador. Sirve para revisar TODA la plataforma sin montar un servidor.
// No es seguridad real: no hay contraseñas ni cifrado. El servidor real (carpeta server/) es el que protege datos de verdad.
(function (root) {
  class Err extends Error { constructor(status, msg) { super(msg); this.status = status; } }
  const req = (c, s, m) => { if (!c) throw new Err(s, m); };
  const txt = (v, n, max, min = 1) => { v = String(v ?? '').trim(); req(v.length >= min && v.length <= max, 400, `${n}: entre ${min} y ${max} caracteres`); return v; };
  const ent = (v, n) => { const x = Number(v); req(Number.isInteger(x) && x > 0, 400, `${n} no válido`); return x; };
  const sha = async (t) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))), (b) => b.toString(16).padStart(2, '0')).join('');
  const aleatorio = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
  const NOMBRES_REAA = ['Maestro Secreto','Maestro Perfecto','Secretario Íntimo','Preboste y Juez','Intendente de los Edificios','Maestro Elegido de los Nueve','Ilustre Elegido de los Quince','Sublime Caballero Elegido','Gran Maestro Arquitecto','Real Arco','Gran Elegido Perfecto y Sublime Masón','Caballero de Oriente o de la Espada','Príncipe de Jerusalén','Caballero de Oriente y Occidente','Soberano Príncipe Rosa Cruz','Gran Pontífice','Venerable Gran Maestro','Noaquita o Caballero Prusiano','Caballero del Real Hacha','Jefe del Tabernáculo','Príncipe del Tabernáculo','Caballero de la Serpiente de Bronce','Príncipe de la Merced','Soberano Comendador del Templo','Caballero del Sol','Gran Escocés de San Andrés','Caballero Kadosh','Gran Inspector Inquisidor Comendador','Sublime Príncipe del Real Secreto','Soberano Gran Inspector General'];
  const TIPOS = { logia: { nombre: 'Logia simbólica', rito: 'simbolico', min: 1, max: 3 }, perfeccion: { nombre: 'Logia de Perfección', rito: 'reaa', min: 4, max: 14 }, capitulo: { nombre: 'Capítulo Rosa Cruz', rito: 'reaa', min: 15, max: 18 }, consejo: { nombre: 'Consejo de Caballeros Kadosh', rito: 'reaa', min: 19, max: 30 }, consistorio: { nombre: 'Consistorio', rito: 'reaa', min: 31, max: 32 }, supremo: { nombre: 'Supremo Consejo', rito: 'reaa', min: 33, max: 33 } };
  const TIPOS_LISTA = Object.entries(TIPOS).map(([codigo, t]) => ({ codigo, nombre: t.nombre, min: t.min, max: t.max }));
  const PERFILES = [['venerable_demo', 'Venerable Maestro (gestor + administrador)'], ['secretario_demo', 'Secretario (gestor; Maestro y grado 12)'], ['tesorero_demo', 'Tesorero (gestor, Maestro)'], ['maestro_demo', 'Maestro (grado 3, sin cargo)'], ['companero_demo', 'Compañero (grado 2)'], ['aprendiz_demo', 'Aprendiz (grado 1)'],
    ['perfecto_demo', 'Maestro Perfecto · grado 14 (Logia de Perfección)'], ['rosacruz_demo', 'Caballero Rosa Cruz · grado 18'], ['kadosh_demo', 'Caballero Kadosh · grado 30'], ['soberano_demo', 'Soberano Gran Inspector General · grado 33 (administrador)'], ['externo_demo', 'Miembro de OTRA Gran Logia (aislamiento)']];

  function crearDemo(opc = {}) {
    const ahoraD = opc.reloj || (() => new Date()), iso = () => ahoraD().toISOString();
    let E = null, viendo = null, listo = null; const oyentes = new Set();
    const guardar = () => { if (opc.guardar) opc.guardar(E); };
    const nid = () => ++E.n;
    const U = (id) => E.usuarios.find((u) => u.id === id), porAlias = (a) => E.usuarios.find((u) => u.alias.toLowerCase() === String(a ?? '').trim().toLowerCase());
    const cuerpoDe = (id) => { const c = E.cuerpos.find((x) => x.id === ent(id, 'Cuerpo')); req(c, 404, 'No encontrado'); return c; };

    async function encadenar(lista, obe, datos, tFijo) { const prev = [...lista].reverse().find((r) => r.obe === obe)?.hash || '', t = tFijo || iso(), d = JSON.stringify(datos); lista.push({ obe, datos: d, t, prev, hash: await sha(JSON.stringify({ datos: d, t, prev })) }); }
    async function verificar(lista, obe) { let prev = ''; for (const r of lista.filter((x) => x.obe === obe)) { if (r.prev !== prev || r.hash !== await sha(JSON.stringify({ datos: r.datos, t: r.t, prev: r.prev }))) return { ok: false }; prev = r.hash; } return { ok: true }; }
    const audit = (obe, accion, actor, detalle) => encadenar(E.auditoria, obe, { accion, actor, detalle: detalle || '' });

    // ---------- Datos de ejemplo ----------
    async function sembrar() {
      E = { v: 2, n: 0, usuarios: [], admins: [], ritos: [], cargos: [], cuerpos: [], pert: [], obediencias: [], invitaciones: [], eventos: [], auditoria: [], solicitudes: [], aprobaciones: [], publicaciones: [], canales: [], canalMiembros: [], mensajes: [], tenidas: [], asistencias: [], actas: [], firmas: [], docs: [], requisitos: [], cumplimientos: [], cuotas: [], pagos: [], planchas: [], tareas: [] };
      const dia = (d, h = 19) => { const x = new Date(ahoraD().getTime() + d * 864e5); x.setHours(h, 0, 0, 0); return x.toISOString().slice(0, 16); };
      const mkObe = (nombre, logia) => {
        const o = { id: nid(), nombre, aprobadores: 2 }; E.obediencias.push(o);
        const rS = { id: nid(), obediencia_id: o.id, codigo: 'simbolico', nombre: 'Simbólico', grados: [{ nivel: 1, nombre: 'Aprendiz' }, { nivel: 2, nombre: 'Compañero' }, { nivel: 3, nombre: 'Maestro' }] };
        const rE = { id: nid(), obediencia_id: o.id, codigo: 'reaa', nombre: 'Escocés Antiguo y Aceptado (4-33)', grados: NOMBRES_REAA.map((n, i) => ({ nivel: i + 4, nombre: n })) }; E.ritos.push(rS, rE);
        const cg = {}; [['venerable', 'Venerable Maestro', 1], ['secretario', 'Secretario', 1], ['tesorero', 'Tesorero', 1], ['vigilante1', 'Primer Vigilante', 0], ['orador', 'Orador', 0]].forEach(([c, n, g]) => { cg[c] = { id: nid(), obediencia_id: o.id, nombre: n, gestor: g }; E.cargos.push(cg[c]); });
        const cu = { id: nid(), obediencia_id: o.id, rito_id: rS.id, nombre: logia, tipo: 'logia', grado_min: 1, grado_max: 3 }; E.cuerpos.push(cu); return { o, cu, cg, rE };
      };
      const A = mkObe('Gran Logia de Demostración', 'Logia Esperanza Nº 1'), B = mkObe('Otra Gran Logia (ajena)', 'Logia Aurora Nº 7');
      const mkU = (alias, nivel, cargo, obe, cu, extra = {}) => { const u = { id: nid(), alias, directorio_visible: !!extra.dir, totp_activo: !!extra.totp, activo: true }; E.usuarios.push(u); E.pert.push({ id: nid(), obediencia_id: obe.o.id, usuario_id: u.id, cuerpo_id: cu.id, grado_nivel: nivel, cargo_id: cargo ? cargo.id : null, estado: 'activa', desde: '2024-03-01' }); return u; };
      const ven = mkU('venerable_demo', 3, A.cg.venerable, A, A.cu, { totp: true, dir: true }); E.admins.push({ usuario_id: ven.id, obediencia_id: A.o.id });
      const sec = mkU('secretario_demo', 3, A.cg.secretario, A, A.cu, { dir: true }), tes = mkU('tesorero_demo', 3, A.cg.tesorero, A, A.cu), mae = mkU('maestro_demo', 3, null, A, A.cu, { dir: true });
      const com = mkU('companero_demo', 2, null, A, A.cu), apr = mkU('aprendiz_demo', 1, null, A, A.cu), ext = mkU('externo_demo', 3, B.cg.venerable, B, B.cu, { dir: true });
      const post = (obe, cu, autor, titulo, texto, g, d) => E.publicaciones.push({ id: nid(), obediencia_id: obe.o.id, cuerpo_id: cu.id, autor_id: autor.id, titulo, texto, grado_min: g, creada: new Date(ahoraD().getTime() - d * 864e5).toISOString() });
      post(A, A.cu, ven, 'Bienvenida a la plataforma de demostración', 'Estás viendo datos de ejemplo. Cambia de perfil (arriba) para comprobar qué ve cada grado: el Aprendiz no ve lo reservado a Compañeros ni a Maestros.', 1, 1);
      post(A, A.cu, sec, 'Circular para Compañeros y Maestros', 'Texto de ejemplo visible desde el grado 2.', 2, 3);
      post(A, A.cu, ven, 'Asunto reservado a Maestros', 'Texto de ejemplo visible solo desde el grado 3.', 3, 5);
      post(B, B.cu, ext, 'Publicación de la OTRA Gran Logia', 'Nadie de la Gran Logia de Demostración puede ver esto.', 1, 2);
      const doc = (obe, cu, autor, titulo, texto, g) => E.docs.push({ id: nid(), obediencia_id: obe.o.id, cuerpo_id: cu.id, titulo, texto, grado_min: g, creado_por: autor.id, version: 1, creado: iso() });
      doc(A, A.cu, ven, 'Reglamento interno (ejemplo)', 'Contenido ficticio de ejemplo. Cada obediencia carga su propio contenido; esta plataforma no incluye contenido ritual.', 1);
      doc(A, A.cu, sec, 'Guía de estudio II (ejemplo)', 'Documento ficticio visible desde el grado 2.', 2); doc(A, A.cu, ven, 'Documento III (ejemplo)', 'Documento ficticio visible solo para Maestros.', 3);
      doc(B, B.cu, ext, 'Documento de la otra obediencia', 'No visible desde la Gran Logia de Demostración.', 1);
      const canal = (nombre, g, msgs) => { const c = { id: nid(), obediencia_id: A.o.id, cuerpo_id: A.cu.id, tipo: 'canal', nombre, grado_min: g, creado: iso() }; E.canales.push(c); msgs.forEach(([a, t], i) => E.mensajes.push({ id: nid(), canal_id: c.id, autor_id: a.id, texto: t, creado: new Date(ahoraD().getTime() - (msgs.length - i) * 3600e3).toISOString() })); return c; };
      canal('General', 1, [[ven, 'Bienvenidos a la plataforma. Aquí se coordina la logia.'], [sec, 'Recuerden confirmar asistencia a la próxima tenida.'], [apr, 'Gracias, ya confirmé.']]);
      canal('Estudio', 2, [[sec, 'Canal para Compañeros y Maestros: material de estudio.']]); canal('Maestros', 3, [[ven, 'Canal reservado a Maestros.'], [mae, 'Recibido.']]);
      const ten = (titulo, fecha, g, estado, lugar) => { const t = { id: nid(), obediencia_id: A.o.id, cuerpo_id: A.cu.id, titulo, fecha, lugar, grado_min: g, orden_dia: 'Apertura\nLectura del acta anterior\nAsuntos varios\nCierre', estado, creada_por: ven.id }; E.tenidas.push(t); return t; };
      const pasada = ten('Tenida ordinaria de septiembre', dia(-30), 1, 'realizada', 'Templo de la Logia'); [ven, sec, tes, mae, com, apr].forEach((u) => E.asistencias.push({ tenida_id: pasada.id, usuario_id: u.id, estado: 'asistio' }));
      const acta = { id: nid(), tenida_id: pasada.id, obediencia_id: A.o.id, texto: 'Acta ficticia de ejemplo de la tenida ordinaria de septiembre.', estado: 'cerrada', redactada_por: sec.id, hash_cierre: await sha('acta-demo'), cerrada: iso() }; E.actas.push(acta);
      [ven, sec].forEach((u) => E.firmas.push({ acta_id: acta.id, usuario_id: u.id, t: iso() }));
      ten('Tenida ordinaria de noviembre', dia(7), 1, 'convocada', 'Templo de la Logia'); ten('Tenida de estudio', dia(10), 2, 'convocada', 'Sala de estudio'); ten('Tenida de Maestros', dia(14), 3, 'convocada', 'Templo de la Logia');
      const sol = (tipo, objetivo, solicitante, gd, motivo) => E.solicitudes.push({ id: nid(), obediencia_id: A.o.id, cuerpo_id: A.cu.id, tipo, objetivo_id: objetivo.id, solicitante_id: solicitante.id, grado_destino: gd, cargo_destino: null, motivo, estado: 'pendiente', creada: iso() });
      sol('ascenso', apr, ven, 2, 'Cumple los requisitos de ejemplo'); sol('ascenso', com, ven, 3, 'Solicitud de ejemplo para probar el doble control');
      // --- Masonería filosófica (REAA 4-33): cuerpos, miembros con varios grados y contenido propio de cada cuerpo ---
      const addP = (u, cu, nivel, cargo) => E.pert.push({ id: nid(), obediencia_id: A.o.id, usuario_id: u.id, cuerpo_id: cu.id, grado_nivel: nivel, cargo_id: cargo ? cargo.id : null, estado: 'activa', desde: '2023-06-01' });
      const cuF = (tipo, nombre) => { const T = TIPOS[tipo], c = { id: nid(), obediencia_id: A.o.id, rito_id: A.rE.id, nombre, tipo, grado_min: T.min, grado_max: T.max }; E.cuerpos.push(c); return c; };
      const perf = cuF('perfeccion', 'Logia de Perfección «Hiram» Nº 3'), cap = cuF('capitulo', 'Capítulo Rosa Cruz «Aurora»'), cons = cuF('consejo', 'Consejo Kadosh «Libertad»'), cist = cuF('consistorio', 'Consistorio «Concordia»'), supr = cuF('supremo', 'Supremo Consejo');
      const per = mkU('perfecto_demo', 3, null, A, A.cu, { dir: true }); addP(per, perf, 14, A.cg.venerable);
      const ros = mkU('rosacruz_demo', 3, null, A, A.cu); addP(ros, perf, 14); addP(ros, cap, 18, A.cg.venerable);
      const kad = mkU('kadosh_demo', 3, null, A, A.cu); addP(kad, perf, 14); addP(kad, cap, 18); addP(kad, cons, 30, A.cg.venerable);
      const sob = mkU('soberano_demo', 3, null, A, A.cu, { totp: true, dir: true }); addP(sob, perf, 14); addP(sob, cap, 18); addP(sob, cons, 30); addP(sob, cist, 32); addP(sob, supr, 33, A.cg.venerable); E.admins.push({ usuario_id: sob.id, obediencia_id: A.o.id });
      addP(sec, perf, 12, A.cg.secretario);
      [[perf, per, 'Logia de Perfección'], [cap, ros, 'Capítulo'], [cons, kad, 'Consejo Kadosh'], [cist, sob, 'Consistorio'], [supr, sob, 'Supremo Consejo']].forEach(([cu, autor, nom]) => {
        const g = cu.grado_min; post(A, cu, autor, `Aviso del ${nom} (ejemplo)`, 'Publicación de ejemplo visible solo para los miembros de este cuerpo.', g, 2); doc(A, cu, autor, `Guía de estudio del ${nom} (ejemplo)`, 'Documento ficticio. Cada obediencia carga su propio contenido; esta plataforma no incluye contenido ritual.', g);
        const c = { id: nid(), obediencia_id: A.o.id, cuerpo_id: cu.id, tipo: 'canal', nombre: nom, grado_min: g, creado: iso() }; E.canales.push(c); E.mensajes.push({ id: nid(), canal_id: c.id, autor_id: autor.id, texto: `Bienvenidos al canal del ${nom}.`, creado: iso() });
        E.tenidas.push({ id: nid(), obediencia_id: A.o.id, cuerpo_id: cu.id, titulo: `Tenida del ${nom}`, fecha: dia(9 + (cu.grado_min % 5)), lugar: 'Sala del cuerpo', grado_min: g, orden_dia: 'Apertura\nTrabajos de estudio\nCierre', estado: 'convocada', creada_por: autor.id });
      });
      // --- Formación: requisitos de ascenso ---
      const rq = (g, texto) => { const r = { id: nid(), obediencia_id: A.o.id, grado_destino: g, texto }; E.requisitos.push(r); return r; };
      const r2 = rq(2, 'Instrucción de Aprendiz completada (ejemplo)'), r3 = rq(3, 'Plancha de Compañero entregada (ejemplo)'); rq(4, 'Plancha de ingreso a la Logia de Perfección (ejemplo)'); rq(15, 'Memoria de estudio del grado 14 (ejemplo)');
      E.cumplimientos.push({ requisito_id: r2.id, usuario_id: apr.id, fecha: iso(), registrado_por: sec.id }, { requisito_id: r3.id, usuario_id: com.id, fecha: iso(), registrado_por: sec.id });
      // --- Tesorería ---
      const mes = (d) => { const x = new Date(ahoraD().getTime()); x.setDate(1); x.setMonth(x.getMonth() + d); return x.toISOString().slice(0, 7); };
      E.cuotas.push({ cuerpo_id: A.cu.id, monto: 50000, moneda: 'COP', inicio: mes(-5), meses_moroso: 3 });
      for (const u of [ven, sec, tes, mae, com, apr, per, ros, kad, sob]) for (let i = -5; i <= 0; i++) { if (u === apr && i > -4) continue; if (u === com && i === 0) continue; E.pagos.push({ id: nid(), obediencia_id: A.o.id, cuerpo_id: A.cu.id, usuario_id: u.id, periodo: mes(i), monto: 50000, fecha: iso().slice(0, 10), registrado_por: tes.id }); }
      // --- Planchas y tareas ---
      const pl = (cu, autor, titulo, estado, g, textos, coment) => E.planchas.push({ id: nid(), obediencia_id: A.o.id, cuerpo_id: cu.id, autor_id: autor.id, titulo, grado_min: g, estado, creada: iso(), versiones: textos.map((t, i) => ({ n: i + 1, texto: t, t: iso() })), comentarios: (coment || []).map(([u, t]) => ({ usuario_id: u.id, texto: t, t: iso() })) });
      pl(A.cu, apr, 'Plancha de estudio del Aprendiz (ejemplo)', 'entregada', 1, ['Primer borrador de ejemplo.']); pl(A.cu, com, 'Plancha sobre el simbolismo (ejemplo)', 'aprobada', 1, ['Borrador de ejemplo.', 'Versión final de ejemplo.'], [[sec, 'Bien estructurada; aprobada para circular.']]); pl(perf, per, 'Plancha del Maestro Perfecto (ejemplo)', 'borrador', 4, ['Borrador de ejemplo.']);
      const tk = (u, titulo, comision, vence, estado) => E.tareas.push({ id: nid(), obediencia_id: A.o.id, cuerpo_id: A.cu.id, titulo, asignado_id: u.id, comision, vence, estado, creada_por: ven.id, creada: iso() });
      tk(apr, 'Preparar la sala para la tenida', 'Logística', dia(3).slice(0, 10), 'pendiente'); tk(mae, 'Organizar el ágape de noviembre', 'Logística', dia(8).slice(0, 10), 'en_curso'); tk(com, 'Revisar el inventario de la biblioteca', 'Biblioteca', dia(-2).slice(0, 10), 'pendiente'); tk(tes, 'Presentar el informe de tesorería', 'Tesorería', dia(5).slice(0, 10), 'pendiente');
      // --- Historial de grados (fechas de ejemplo para el camino masónico) ---
      const cuDe = (n) => (n <= 3 ? A.cu : n <= 14 ? perf : n <= 18 ? cap : n <= 30 ? cons : n <= 32 ? cist : supr);
      for (const [u, max] of [[ven, 3], [sec, 12], [tes, 3], [mae, 3], [com, 2], [apr, 1], [per, 14], [ros, 18], [kad, 30], [sob, 33]]) for (let n = 1; n <= max; n++) await encadenar(E.eventos, A.o.id, { usuario_id: u.id, cuerpo_id: cuDe(n).id, tipo: n === 1 ? 'iniciacion' : 'ascenso', nivel: n }, new Date(Date.UTC(2019, 0, 1) + n * 70 * 864e5).toISOString());
      await audit(A.o.id, 'sistema.demo', ven.id, 'datos de ejemplo'); await encadenar(E.eventos, A.o.id, { usuario_id: ven.id, tipo: 'fundacion', nivel: 3 });
      E.dm = { bot: true };
    }

    // ---------- Permisos (misma lógica que server/dominio.js) ----------
    const ctxDe = (uid) => {
      const user = U(uid); if (!user || !user.activo) return null;
      const pert = E.pert.filter((p) => p.usuario_id === uid && p.estado === 'activa').map((p) => { const c = E.cuerpos.find((x) => x.id === p.cuerpo_id), cg = E.cargos.find((x) => x.id === p.cargo_id); return { ...p, cuerpo: c.nombre, tipo_cuerpo: c.tipo, rito_id: c.rito_id, gestor: cg && cg.gestor ? 1 : 0, cargo: cg ? cg.nombre : null }; });
      return { user, pert, admin: new Set(E.admins.filter((a) => a.usuario_id === uid).map((a) => a.obediencia_id)) };
    };
    const nivelMax = (c, o) => Math.max(0, ...c.pert.filter((p) => p.obediencia_id === o).map((p) => p.grado_nivel));
    const esAdmin = (c, o) => c.admin.has(o), miembroDe = (c, cu) => c.pert.some((p) => p.cuerpo_id === cu), esGestor = (c, cu) => c.pert.some((p) => p.cuerpo_id === cu && p.gestor === 1);
    const puedeVer = (c, r) => { if (!c.pert.some((p) => p.obediencia_id === r.obediencia_id)) return false; if (r.cuerpo_id && !miembroDe(c, r.cuerpo_id)) return false; return nivelMax(c, r.obediencia_id) >= (r.grado_min || 1); };
    const requiereAdmin = (c, o) => { req(esAdmin(c, o), 403, 'Sin permiso'); req(c.user.totp_activo, 403, 'Activa la verificación en dos pasos para usar la administración'); };
    const mias = (c) => [...new Set(c.pert.map((p) => p.obediencia_id))];
    const primerNivel = (ritoId) => Math.min(...E.ritos.find((r) => r.id === ritoId).grados.map((g) => g.nivel));
    const gradoNombre = (ritoId, n) => E.ritos.find((r) => r.id === ritoId)?.grados.find((g) => g.nivel === n)?.nombre;
    function permisoPublicar(c, { cuerpo_id, obediencia_id, grado_min }) {
      const g = Math.max(1, Number(grado_min) || 1);
      if (cuerpo_id) { const cu = cuerpoDe(cuerpo_id); req(esGestor(c, cu.id), 403, 'Solo un cargo gestor publica en su logia'); return { obe: cu.obediencia_id, cuerpo: cu.id, g }; }
      const o = ent(obediencia_id, 'Obediencia'); requiereAdmin(c, o); req(g <= Math.max(1, nivelMax(c, o)), 403, 'El administrador no puede publicar para grados superiores al suyo'); return { obe: o, cuerpo: null, g };
    }
    const canalVisible = (c, k) => (k.tipo === 'dm' ? c.pert.some((p) => p.obediencia_id === k.obediencia_id) && E.canalMiembros.some((m) => m.canal_id === k.id && m.usuario_id === c.user.id) : puedeVer(c, k));
    const accesoCanal = (c, id) => { const k = E.canales.find((x) => x.id === ent(id, 'Canal')); req(k && canalVisible(c, k), 404, 'No encontrado'); return k; };
    const tenidaVisible = (c, id) => { const t = E.tenidas.find((x) => x.id === ent(id, 'Tenida')); req(t && puedeVer(c, t), 404, 'No encontrado'); return t; };
    const actaVisible = (c, id) => { const a = E.actas.find((x) => x.id === ent(id, 'Acta')); req(a, 404, 'No encontrado'); return { a, t: tenidaVisible(c, a.tenida_id) }; };
    const siguiente = (cu, nivel) => { const g = E.ritos.find((r) => r.id === cu.rito_id).grados.map((x) => x.nivel).filter((n) => n > nivel).sort((a, b) => a - b)[0]; return g ? [g] : []; };
    const emitir = (m) => { if (!viendo) return; const c = ctxDe(viendo), k = E.canales.find((x) => x.id === m.canal_id); if (c && k && canalVisible(c, k)) oyentes.forEach((f) => f(m)); };

    // ---------- Rutas ----------
    const R = []; const ruta = (m, p, fn, auth = true) => R.push({ m, re: new RegExp('^' + p.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn, auth });
    ruta('GET', '/estado', () => ({ configurado: true }), false);
    ruta('POST', '/demo/entrar', ({ body }) => { const u = porAlias(body.alias); req(u && PERFILES.some(([a]) => a === u.alias) || u, 404, 'Perfil no encontrado'); return { ok: true, token: 'demo:' + u.id }; }, false);
    ruta('POST', '/demo/reiniciar', async () => { await sembrar(); return { ok: true }; }, false);
    ruta('GET', '/invitacion', ({ query }) => { const i = E.invitaciones.find((x) => x.token === query.get('token') && !x.usada && x.expira > iso()); req(i, 404, 'Invitación no válida o vencida'); return { cuerpo: cuerpoDe(i.cuerpo_id).nombre, obediencia: E.obediencias.find((o) => o.id === i.obediencia_id).nombre }; }, false);
    ruta('POST', '/registro', async ({ body }) => {
      const i = E.invitaciones.find((x) => x.token === body.token && !x.usada && x.expira > iso()); req(i, 404, 'Invitación no válida o vencida');
      const alias = String(body.alias ?? '').trim(); req(/^[\p{L}\p{N}_.-]{3,40}$/u.test(alias), 400, 'Alias: 3 a 40 letras, números, punto, guion o guion bajo'); req(String(body.password ?? '').length >= 10, 400, 'La contraseña debe tener entre 10 y 200 caracteres'); req(!porAlias(alias), 409, 'Ese alias no está disponible');
      const u = { id: nid(), alias, directorio_visible: false, totp_activo: false, activo: true }; E.usuarios.push(u); const cu = cuerpoDe(i.cuerpo_id);
      E.pert.push({ id: nid(), obediencia_id: i.obediencia_id, usuario_id: u.id, cuerpo_id: i.cuerpo_id, grado_nivel: i.grado_nivel, cargo_id: null, estado: 'activa', desde: iso().slice(0, 10) }); i.usada = true;
      await encadenar(E.eventos, i.obediencia_id, { usuario_id: u.id, cuerpo_id: cu.id, tipo: 'iniciacion', nivel: i.grado_nivel, aprobadores: [i.creada_por] }); await audit(i.obediencia_id, 'invitacion.usar', u.id, ''); return { ok: true, token: 'demo:' + u.id };
    }, false);
    ruta('POST', '/logout', () => ({ ok: true })); ruta('POST', '/panico', () => ({ ok: true }));
    ruta('GET', '/yo', ({ ctx: c }) => ({ alias: c.user.alias, directorio_visible: !!c.user.directorio_visible, totp_activo: !!c.user.totp_activo,
      pertenencias: c.pert.map((p) => ({ cuerpo_id: p.cuerpo_id, cuerpo: p.cuerpo, tipo: p.tipo_cuerpo, obediencia_id: p.obediencia_id, nivel: p.grado_nivel, cargo: p.cargo, gestor: p.gestor === 1, grado: gradoNombre(p.rito_id, p.grado_nivel) })),
      obediencias: [...new Set([...mias(c), ...c.admin])].map((id) => ({ id, nombre: E.obediencias.find((o) => o.id === id).nombre, admin: c.admin.has(id) })) }));
    ruta('POST', '/yo/preferencias', ({ ctx: c, body }) => { c.user.directorio_visible = !!body.directorio_visible; return { ok: true }; });
    ruta('POST', '/2fa/iniciar', ({ ctx: c }) => { req(!c.user.totp_activo, 409, 'Ya está activada'); return { secreto: 'DEMOSECRETO234567', uri: 'otpauth://totp/Centro:' + c.user.alias + '?secret=DEMOSECRETO234567&issuer=Centro' }; });
    ruta('POST', '/2fa/confirmar', ({ ctx: c, body }) => { req(/^\d{6}$/.test(String(body.codigo ?? '')), 400, 'Código incorrecto'); c.user.totp_activo = true; return { ok: true }; });
    ruta('GET', '/sesiones', () => [{ id: 1, dispositivo: 'Este navegador (demostración)', creada: iso(), ultima: iso(), actual: 1 }]); ruta('POST', '/sesiones/revocar', () => ({ ok: true }));
    const listar = (c, lista) => lista.filter((r) => mias(c).includes(r.obediencia_id) && puedeVer(c, r));
    ruta('GET', '/muro', ({ ctx: c }) => listar(c, [...E.publicaciones].sort((a, b) => b.id - a.id)).slice(0, 100).map((p) => ({ ...p, autor: U(p.autor_id).alias, cuerpo: p.cuerpo_id ? cuerpoDe(p.cuerpo_id).nombre : null })));
    ruta('POST', '/muro', ({ ctx: c, body }) => { const p = permisoPublicar(c, body); const id = nid(); E.publicaciones.push({ id, obediencia_id: p.obe, cuerpo_id: p.cuerpo, autor_id: c.user.id, titulo: txt(body.titulo, 'Título', 160, 3), texto: txt(body.texto, 'Texto', 8000), grado_min: p.g, creada: iso() }); return { id }; });
    ruta('GET', '/docs', ({ ctx: c }) => listar(c, [...E.docs].sort((a, b) => b.id - a.id)).map(({ texto, ...d }) => ({ ...d, cuerpo: d.cuerpo_id ? cuerpoDe(d.cuerpo_id).nombre : null })));
    ruta('GET', '/docs/:id', ({ ctx: c, params }) => { const d = E.docs.find((x) => x.id === ent(params.id, 'Documento')); req(d && puedeVer(c, d), 404, 'No encontrado'); return d; });
    ruta('POST', '/docs', async ({ ctx: c, body }) => { const p = permisoPublicar(c, body); const id = nid(); E.docs.push({ id, obediencia_id: p.obe, cuerpo_id: p.cuerpo, titulo: txt(body.titulo, 'Título', 160, 3), texto: txt(body.texto, 'Contenido', 100000), grado_min: p.g, creado_por: c.user.id, version: 1, creado: iso() }); await audit(p.obe, 'doc.crear', c.user.id, 'doc:' + id); return { id }; });
    ruta('GET', '/canales', ({ ctx: c }) => E.canales.filter((k) => mias(c).includes(k.obediencia_id) && canalVisible(c, k)).map((k) => ({ ...k, cuerpo: k.cuerpo_id ? cuerpoDe(k.cuerpo_id).nombre : null, nombre: k.tipo === 'dm' ? U(E.canalMiembros.find((m) => m.canal_id === k.id && m.usuario_id !== c.user.id)?.usuario_id)?.alias || 'Conversación' : k.nombre })));
    ruta('POST', '/canales', ({ ctx: c, body }) => { const cu = cuerpoDe(body.cuerpo_id); req(esGestor(c, cu.id), 403, 'Solo un cargo gestor crea canales'); const id = nid(); E.canales.push({ id, obediencia_id: cu.obediencia_id, cuerpo_id: cu.id, tipo: 'canal', nombre: txt(body.nombre, 'Nombre', 60, 2), grado_min: Math.max(1, Number(body.grado_min) || 1), creado: iso() }); return { id }; });
    ruta('POST', '/dm', ({ ctx: c, body }) => {
      const t = porAlias(body.alias), no = () => new Err(404, 'Usuario no encontrado'); if (!t || !t.activo || t.id === c.user.id) throw no();
      const tp = E.pert.filter((p) => p.usuario_id === t.id && p.estado === 'activa'); if (!(tp.some((x) => miembroDe(c, x.cuerpo_id)) || (t.directorio_visible && tp.some((x) => mias(c).includes(x.obediencia_id))))) throw no();
      const ex = E.canales.find((k) => k.tipo === 'dm' && E.canalMiembros.some((m) => m.canal_id === k.id && m.usuario_id === c.user.id) && E.canalMiembros.some((m) => m.canal_id === k.id && m.usuario_id === t.id)); if (ex) return { id: ex.id };
      const id = nid(); E.canales.push({ id, obediencia_id: tp.find((x) => mias(c).includes(x.obediencia_id)).obediencia_id, cuerpo_id: null, tipo: 'dm', nombre: 'dm', grado_min: 1, creado: iso() }); E.canalMiembros.push({ canal_id: id, usuario_id: c.user.id }, { canal_id: id, usuario_id: t.id }); return { id };
    });
    ruta('GET', '/canales/:id/mensajes', ({ ctx: c, params, query }) => { const k = accesoCanal(c, params.id), antes = Number(query.get('antes')) || 9e15; return E.mensajes.filter((m) => m.canal_id === k.id && m.id < antes).slice(-50).map((m) => ({ id: m.id, texto: m.texto, creado: m.creado, autor: U(m.autor_id).alias })); });
    ruta('POST', '/canales/:id/mensajes', ({ ctx: c, params, body }) => {
      const k = accesoCanal(c, params.id), texto = txt(body.texto, 'Mensaje', 4000), id = nid(); E.mensajes.push({ id, canal_id: k.id, autor_id: c.user.id, texto, creado: iso() });
      if (opc.respuestasAuto !== false) setTimeout(() => { // un compañero de demostración responde para mostrar el tiempo real
        const quien = k.tipo === 'dm' ? E.canalMiembros.find((m) => m.canal_id === k.id && m.usuario_id !== c.user.id)?.usuario_id : (porAlias('secretario_demo').id !== c.user.id && puedeVer(ctxDe(porAlias('secretario_demo').id), k) ? porAlias('secretario_demo').id : porAlias('venerable_demo').id);
        if (!quien || quien === c.user.id) return; const m = { id: nid(), canal_id: k.id, autor_id: quien, texto: ['Recibido, hermano.', 'Gracias por el aviso.', 'Anotado. Lo vemos en la próxima tenida.'][id % 3], creado: iso() }; E.mensajes.push(m); guardar(); emitir({ tipo: 'mensaje', id: m.id, canal_id: k.id, texto: m.texto, autor: U(quien).alias, creado: m.creado });
      }, 1300);
      return { id };
    });
    ruta('GET', '/tenidas', ({ ctx: c }) => listar(c, [...E.tenidas].sort((a, b) => b.fecha.localeCompare(a.fecha))).map((t) => ({ ...t, cuerpo: cuerpoDe(t.cuerpo_id).nombre, mi_estado: E.asistencias.find((a) => a.tenida_id === t.id && a.usuario_id === c.user.id)?.estado || null, gestor: esGestor(c, t.cuerpo_id) })));
    ruta('POST', '/tenidas', async ({ ctx: c, body }) => { const cu = cuerpoDe(body.cuerpo_id); req(esGestor(c, cu.id), 403, 'Solo un cargo gestor convoca tenidas'); req(!Number.isNaN(Date.parse(body.fecha)), 400, 'Fecha no válida'); const id = nid(); E.tenidas.push({ id, obediencia_id: cu.obediencia_id, cuerpo_id: cu.id, titulo: txt(body.titulo, 'Título', 120, 3), fecha: String(body.fecha), lugar: String(body.lugar ?? '').slice(0, 200), grado_min: Math.max(1, Number(body.grado_min) || 1), orden_dia: String(body.orden_dia ?? '').slice(0, 4000), estado: 'convocada', creada_por: c.user.id }); await audit(cu.obediencia_id, 'tenida.crear', c.user.id, 'tenida:' + id); return { id }; });
    ruta('GET', '/tenidas/:id', ({ ctx: c, params }) => { const t = tenidaVisible(c, params.id), g = esGestor(c, t.cuerpo_id), acta = E.actas.find((a) => a.tenida_id === t.id);
      const asist = g ? E.pert.filter((p) => p.cuerpo_id === t.cuerpo_id && p.estado === 'activa').map((p) => ({ usuario_id: p.usuario_id, alias: U(p.usuario_id).alias, estado: E.asistencias.find((a) => a.tenida_id === t.id && a.usuario_id === p.usuario_id)?.estado || null })).sort((a, b) => a.alias.localeCompare(b.alias)) : E.asistencias.filter((a) => a.tenida_id === t.id && a.usuario_id === c.user.id).map((a) => ({ estado: a.estado }));
      return { ...t, gestor: g, asistencias: asist, acta: acta ? { id: acta.id, estado: acta.estado } : null }; });
    const marcar = (tid, uid, estado) => { const a = E.asistencias.find((x) => x.tenida_id === tid && x.usuario_id === uid); if (a) a.estado = estado; else E.asistencias.push({ tenida_id: tid, usuario_id: uid, estado }); };
    ruta('POST', '/tenidas/:id/asistencia', ({ ctx: c, params, body }) => {
      const t = tenidaVisible(c, params.id);
      if (body.usuario_id === undefined || body.usuario_id === null) { req(['asistire', 'excusa'].includes(body.estado) && t.estado === 'convocada', 400, 'Estado no permitido'); marcar(t.id, c.user.id, body.estado); return { ok: true }; }
      req(esGestor(c, t.cuerpo_id), 403, 'Solo un cargo gestor registra la asistencia de otros'); req(['asistio', 'ausente', 'excusa', 'asistire'].includes(body.estado), 400, 'Estado no válido');
      const uid = ent(body.usuario_id, 'Usuario'); const ok = E.pert.some((p) => p.usuario_id === uid && p.cuerpo_id === t.cuerpo_id && p.estado === 'activa') && Math.max(...E.pert.filter((p) => p.usuario_id === uid && p.obediencia_id === t.obediencia_id && p.estado === 'activa').map((p) => p.grado_nivel)) >= t.grado_min;
      req(ok, 400, 'Solo miembros activos con grado suficiente'); marcar(t.id, uid, body.estado); return { ok: true };
    });
    ruta('POST', '/tenidas/:id/realizada', async ({ ctx: c, params }) => { const t = tenidaVisible(c, params.id); req(esGestor(c, t.cuerpo_id), 403, 'Sin permiso'); req(t.estado === 'convocada', 409, 'Tenida no disponible'); t.estado = 'realizada'; await audit(t.obediencia_id, 'tenida.realizada', c.user.id, 'tenida:' + t.id); return { ok: true }; });
    ruta('POST', '/tenidas/:id/acta', async ({ ctx: c, params, body }) => { const t = tenidaVisible(c, params.id); req(esGestor(c, t.cuerpo_id), 403, 'Solo un cargo gestor redacta el acta'); req(t.estado === 'realizada', 409, 'La tenida debe estar realizada'); req(!E.actas.some((a) => a.tenida_id === t.id), 409, 'Ya existe acta');
      const id = nid(); E.actas.push({ id, tenida_id: t.id, obediencia_id: t.obediencia_id, texto: txt(body.texto, 'Texto', 50000), estado: 'borrador', redactada_por: c.user.id, hash_cierre: null, cerrada: null }); await audit(t.obediencia_id, 'acta.crear', c.user.id, 'acta:' + id); return { id }; });
    ruta('GET', '/actas/:id', ({ ctx: c, params }) => { const { a, t } = actaVisible(c, params.id); return { ...a, titulo: t.titulo, firmas: E.firmas.filter((f) => f.acta_id === a.id).map((f) => ({ alias: U(f.usuario_id).alias, t: f.t })) }; });
    ruta('POST', '/actas/:id/editar', ({ ctx: c, params, body }) => { const { a, t } = actaVisible(c, params.id); req(esGestor(c, t.cuerpo_id), 403, 'Sin permiso'); req(a.estado === 'borrador', 409, 'El acta firmada o cerrada no se edita'); a.texto = txt(body.texto, 'Texto', 50000); return { ok: true }; });
    ruta('POST', '/actas/:id/firmar', async ({ ctx: c, params }) => { const { a, t } = actaVisible(c, params.id); req(a.estado !== 'cerrada', 409, 'Acta no disponible'); req(E.asistencias.some((x) => x.tenida_id === t.id && x.usuario_id === c.user.id && x.estado === 'asistio'), 403, 'Solo firma quien asistió'); req(!E.firmas.some((f) => f.acta_id === a.id && f.usuario_id === c.user.id), 409, 'Ya firmaste');
      E.firmas.push({ acta_id: a.id, usuario_id: c.user.id, t: iso() }); if (a.estado === 'borrador') a.estado = 'firmada'; await audit(a.obediencia_id, 'acta.firma', c.user.id, 'acta:' + a.id); return { ok: true }; });
    ruta('POST', '/actas/:id/cerrar', async ({ ctx: c, params }) => { const { a, t } = actaVisible(c, params.id); req(esGestor(c, t.cuerpo_id), 403, 'Sin permiso'); req(a.estado === 'firmada', 409, 'El acta debe estar firmada'); req(E.firmas.filter((f) => f.acta_id === a.id).length >= 2, 409, 'Se requieren al menos 2 firmas');
      a.cerrada = iso(); a.hash_cierre = await sha(JSON.stringify({ t: t.id, texto: a.texto, firmas: E.firmas.filter((f) => f.acta_id === a.id).map((f) => f.usuario_id), ts: a.cerrada })); a.estado = 'cerrada'; await audit(a.obediencia_id, 'acta.cerrar', c.user.id, 'acta:' + a.id); return { ok: true }; });
    ruta('GET', '/directorio', ({ ctx: c }) => { const seen = new Set(), out = []; for (const p of E.pert.filter((x) => mias(c).includes(x.obediencia_id) && x.estado === 'activa')) { const u = U(p.usuario_id), cu = cuerpoDe(p.cuerpo_id); if (cu.tipo === 'logia' && u.directorio_visible && u.activo && !seen.has(u.alias + cu.id)) { seen.add(u.alias + cu.id); out.push({ alias: u.alias, cuerpo: cu.nombre }); } } return out.sort((a, b) => a.alias.localeCompare(b.alias)); });
    ruta('GET', '/cuerpos/:id/miembros', ({ ctx: c, params }) => { const cu = cuerpoDe(params.id); req(esGestor(c, cu.id) || esAdmin(c, cu.obediencia_id), 404, 'No encontrado'); return E.pert.filter((p) => p.cuerpo_id === cu.id).map((p) => ({ usuario_id: p.usuario_id, alias: U(p.usuario_id).alias, nivel: p.grado_nivel, grado: gradoNombre(cu.rito_id, p.grado_nivel), cargo: E.cargos.find((x) => x.id === p.cargo_id)?.nombre || null, estado: p.estado, desde: p.desde })); });
    ruta('GET', '/catalogo', ({ ctx: c }) => ({ ritos: E.ritos.filter((r) => mias(c).includes(r.obediencia_id)).map((r) => ({ id: r.id, obediencia_id: r.obediencia_id, nombre: r.nombre, grados: r.grados })), cargos: E.cargos.filter((x) => mias(c).includes(x.obediencia_id)) }));
    ruta('GET', '/invitaciones', ({ ctx: c }) => E.invitaciones.filter((i) => i.creada_por === c.user.id).map((i) => ({ id: i.id, cuerpo: cuerpoDe(i.cuerpo_id).nombre, creada: i.creada, expira: i.expira, usada: i.usada ? 1 : 0 })));
    ruta('POST', '/invitaciones', async ({ ctx: c, body }) => { const cu = cuerpoDe(body.cuerpo_id); req(esAdmin(c, cu.obediencia_id) || esGestor(c, cu.id), 404, 'No encontrado'); if (esAdmin(c, cu.obediencia_id) && !esGestor(c, cu.id)) requiereAdmin(c, cu.obediencia_id); req(cu.tipo === 'logia', 400, 'Las invitaciones son solo para logias simbólicas; el ingreso a cuerpos filosóficos es por solicitud de alta');
      const dd = Math.min(30, Math.max(1, Number(body.dias) || 7)), token = aleatorio(); E.invitaciones.push({ id: nid(), token, obediencia_id: cu.obediencia_id, cuerpo_id: cu.id, grado_nivel: primerNivel(cu.rito_id), creada_por: c.user.id, creada: iso(), expira: new Date(ahoraD().getTime() + dd * 864e5).toISOString(), usada: false }); await audit(cu.obediencia_id, 'invitacion.crear', c.user.id, 'cuerpo:' + cu.id); return { token, expira_dias: dd, cuerpo: cu.nombre }; });
    const requeridas = (s) => (s.tipo === 'ascenso' ? E.obediencias.find((o) => o.id === s.obediencia_id).aprobadores : 1);
    ruta('GET', '/solicitudes', ({ ctx: c }) => [...E.solicitudes].sort((a, b) => b.id - a.id).filter((s) => (mias(c).includes(s.obediencia_id) || c.admin.has(s.obediencia_id)) && (s.solicitante_id === c.user.id || esAdmin(c, s.obediencia_id) || esGestor(c, s.cuerpo_id))).map((s) => ({ ...s, objetivo: U(s.objetivo_id).alias, solicitante: U(s.solicitante_id).alias, cuerpo: cuerpoDe(s.cuerpo_id).nombre, aprobaciones: E.aprobaciones.filter((a) => a.solicitud_id === s.id).length, yo_aprobe: E.aprobaciones.some((a) => a.solicitud_id === s.id && a.aprobador_id === c.user.id) ? 1 : 0, requeridas: requeridas(s) })));
    ruta('POST', '/solicitudes', async ({ ctx: c, body }) => {
      const cu = cuerpoDe(body.cuerpo_id), obe = cu.obediencia_id; req(esAdmin(c, obe) || esGestor(c, cu.id), 404, 'No encontrado'); if (!esGestor(c, cu.id)) requiereAdmin(c, obe);
      const tipo = String(body.tipo); req(['alta', 'ascenso', 'suspension', 'expulsion', 'baja', 'cambio_cargo'].includes(tipo), 400, 'Tipo no válido'); const t = porAlias(body.alias); req(t && t.activo, 404, 'Usuario no encontrado');
      const p = E.pert.find((x) => x.usuario_id === t.id && x.cuerpo_id === cu.id); let gd = null, cd = null;
      if (tipo === 'alta') { req(!p, 409, 'Ya tiene pertenencia en este cuerpo'); gd = ent(body.grado_destino, 'Grado'); req(gradoNombre(cu.rito_id, gd), 400, 'Grado inexistente en este rito'); req(gd >= cu.grado_min && gd <= cu.grado_max, 400, `El grado ${gd} no se confiere en este cuerpo (${cu.nombre}: grados ${cu.grado_min} a ${cu.grado_max})`); if (gd > 1) req(nivelDe(t.id, obe) >= gd - 1, 409, `La persona debe tener al menos el grado ${gd - 1} para recibir el grado ${gd}`); } else req(p && p.estado === 'activa', 409, 'La persona no es miembro activo de este cuerpo');
      if (tipo === 'ascenso') { gd = ent(body.grado_destino, 'Grado'); if (!siguiente(cu, p.grado_nivel).includes(gd)) throw p.grado_nivel >= cu.grado_max ? new Err(409, 'Es el grado máximo de este cuerpo: el siguiente se confiere por una alta en el cuerpo correspondiente') : new Err(400, 'Solo se asciende al grado siguiente del rito'); req(gd <= cu.grado_max, 409, `El grado ${gd} se confiere en otro cuerpo: solicita una alta en el cuerpo correspondiente (este cuerpo llega hasta el grado ${cu.grado_max})`); }
      if (gd) { const f = faltantes(obe, t.id, gd); req(!f.length, 409, 'Faltan requisitos: ' + f.map((x) => x.texto).join('; ')); }
      if (tipo === 'cambio_cargo') { cd = body.cargo_id ? ent(body.cargo_id, 'Cargo') : null; req(!cd || E.cargos.some((x) => x.id === cd && x.obediencia_id === obe), 400, 'Cargo inexistente'); }
      const id = nid(); E.solicitudes.push({ id, obediencia_id: obe, cuerpo_id: cu.id, tipo, objetivo_id: t.id, solicitante_id: c.user.id, grado_destino: gd, cargo_destino: cd, motivo: txt(body.motivo, 'Motivo', 1000, 3), estado: 'pendiente', creada: iso() }); await audit(obe, 'solicitud.crear', c.user.id, `sol:${id}:${tipo}`); return { id };
    });
    ruta('POST', '/solicitudes/:id/resolver', async ({ ctx: c, params, body }) => {
      const s = E.solicitudes.find((x) => x.id === ent(params.id, 'Solicitud')); req(s, 404, 'No encontrado'); req(esAdmin(c, s.obediencia_id) || esGestor(c, s.cuerpo_id), 404, 'No encontrado'); req(s.estado === 'pendiente', 409, 'Solicitud no disponible'); if (!esGestor(c, s.cuerpo_id)) requiereAdmin(c, s.obediencia_id);
      const gestores = E.pert.filter((p) => p.cuerpo_id === s.cuerpo_id && p.estado === 'activa' && E.cargos.find((x) => x.id === p.cargo_id)?.gestor).length;
      const arranque = s.tipo === 'cambio_cargo' && s.solicitante_id === c.user.id && c.user.id !== s.objetivo_id && esGestor(c, s.cuerpo_id) && gestores <= 1;
      if (arranque) await audit(s.obediencia_id, 'solicitud.excepcion_arranque', c.user.id, 'sol:' + s.id); else req(c.user.id !== s.solicitante_id && c.user.id !== s.objetivo_id, 403, 'Doble control: el aprobador debe ser distinto del solicitante y de la persona afectada');
      const cu = cuerpoDe(s.cuerpo_id);
      if (body.aprobar !== true) { s.estado = 'rechazada'; await audit(s.obediencia_id, 'solicitud.rechazar', c.user.id, 'sol:' + s.id); return { estado: 'rechazada' }; }
      if (s.grado_destino && s.grado_destino > primerNivel(cu.rito_id)) req(nivelMax(c, s.obediencia_id) >= s.grado_destino, 403, 'El aprobador debe tener grado igual o mayor al grado destino');
      req(!E.aprobaciones.some((a) => a.solicitud_id === s.id && a.aprobador_id === c.user.id), 409, 'Ya aprobaste esta solicitud'); E.aprobaciones.push({ solicitud_id: s.id, aprobador_id: c.user.id });
      const aprob = E.aprobaciones.filter((a) => a.solicitud_id === s.id).map((a) => a.aprobador_id);
      if (aprob.length < requeridas(s)) { await audit(s.obediencia_id, 'solicitud.aprobacion_parcial', c.user.id, 'sol:' + s.id); return { estado: 'pendiente' }; }
      if (s.grado_destino) { const f = faltantes(s.obediencia_id, s.objetivo_id, s.grado_destino); req(!f.length, 409, 'Faltan requisitos: ' + f.map((x) => x.texto).join('; ')); }
      let p = E.pert.find((x) => x.usuario_id === s.objetivo_id && x.cuerpo_id === s.cuerpo_id), nivel;
      if (s.tipo === 'alta') { E.pert.push({ id: nid(), obediencia_id: s.obediencia_id, usuario_id: s.objetivo_id, cuerpo_id: s.cuerpo_id, grado_nivel: s.grado_destino, cargo_id: null, estado: 'activa', desde: iso().slice(0, 10) }); nivel = s.grado_destino; }
      else if (s.tipo === 'ascenso') { req(p && p.estado === 'activa', 409, 'La pertenencia ya no está activa'); p.grado_nivel = s.grado_destino; nivel = s.grado_destino; }
      else if (s.tipo === 'cambio_cargo') { p.cargo_id = s.cargo_destino; nivel = p.grado_nivel; } else { p.estado = { suspension: 'suspendida', expulsion: 'expulsada', baja: 'baja' }[s.tipo]; p.cargo_id = null; nivel = p.grado_nivel; }
      await encadenar(E.eventos, s.obediencia_id, { usuario_id: s.objetivo_id, cuerpo_id: s.cuerpo_id, tipo: s.tipo, nivel, motivo: s.motivo, aprobadores: aprob }); s.estado = 'aprobada'; await audit(s.obediencia_id, 'solicitud.aprobar', c.user.id, `sol:${s.id}:${s.tipo}`); return { estado: 'aprobada' };
    });
    ruta('GET', '/admin/:obe/estructura', ({ ctx: c, params }) => { const o = ent(params.obe, 'Obediencia'); requiereAdmin(c, o); return { tipos: TIPOS_LISTA, ritos: E.ritos.filter((r) => r.obediencia_id === o).map((r) => ({ id: r.id, nombre: r.nombre })), cargos: E.cargos.filter((x) => x.obediencia_id === o), cuerpos: E.cuerpos.filter((x) => x.obediencia_id === o) }; });
    ruta('POST', '/admin/cuerpos', async ({ ctx: c, body }) => { const o = ent(body.obediencia_id, 'Obediencia'); requiereAdmin(c, o); const T = TIPOS[body.tipo || 'logia']; req(T, 400, 'Tipo de cuerpo no válido'); const rito = E.ritos.find((r) => r.obediencia_id === o && r.codigo === T.rito); req(rito, 400, 'Rito inexistente'); const id = nid(); E.cuerpos.push({ id, obediencia_id: o, rito_id: rito.id, nombre: txt(body.nombre, 'Nombre', 120, 2), tipo: body.tipo || 'logia', grado_min: T.min, grado_max: T.max }); await audit(o, 'cuerpo.crear', c.user.id, `cuerpo:${id}:${body.tipo || 'logia'}`); return { id }; });
    ruta('GET', '/admin/:obe/auditoria', async ({ ctx: c, params }) => { const o = ent(params.obe, 'Obediencia'); requiereAdmin(c, o); return { auditoria: E.auditoria.filter((r) => r.obe === o).slice(-200).reverse().map((r, i) => ({ id: i, t: r.t, ...JSON.parse(r.datos) })), integridad: { auditoria: await verificar(E.auditoria, o), membresia: await verificar(E.eventos, o) } }; });

    // ---------- Camino masónico, formación, tesorería, planchas y tareas ----------
    const nivelDe = (uid, obe) => Math.max(0, ...E.pert.filter((p) => p.usuario_id === uid && p.obediencia_id === obe && p.estado === 'activa').map((p) => p.grado_nivel));
    const faltantes = (obe, uid, g) => E.requisitos.filter((r) => r.obediencia_id === obe && r.grado_destino === g && !E.cumplimientos.some((x) => x.requisito_id === r.id && x.usuario_id === uid));
    ruta('GET', '/camino', ({ ctx: c }) => mias(c).map((o) => {
      const ob = E.obediencias.find((x) => x.id === o), evs = E.eventos.filter((r) => r.obe === o).map((r) => ({ ...JSON.parse(r.datos), t: r.t })).filter((e) => e.usuario_id === c.user.id), maxObe = nivelMax(c, o);
      const tipoDe = (n) => Object.entries(TIPOS).find(([, t]) => n >= t.min && n <= t.max)?.[0] || null;
      const ritos = E.ritos.filter((r) => r.obediencia_id === o).map((r) => {
        const mis = c.pert.filter((p) => p.obediencia_id === o && p.rito_id === r.id), grados = r.grados, max = Math.max(0, ...mis.map((p) => p.grado_nivel)), primero = grados[0].nivel, puedeOptar = max > 0 || maxObe >= primero - 1;
        const sigN = max ? grados.find((g) => g.nivel > max)?.nivel : primero;
        const gs = grados.map((g) => ({ nivel: g.nivel, nombre: g.nombre, tipo: tipoDe(g.nivel), fecha: evs.find((e) => e.nivel === g.nivel)?.t.slice(0, 10) || null, estado: g.nivel <= max ? (g.nivel === max ? 'actual' : 'alcanzado') : g.nivel === sigN && puedeOptar ? 'siguiente' : 'bloqueado' }));
        const sg = grados.find((g) => g.nivel === sigN);
        return { id: r.id, nombre: r.nombre, codigo: r.codigo, nivel_actual: max, miembro: max > 0, grados: gs, cuerpos: mis.map((p) => ({ id: p.cuerpo_id, nombre: p.cuerpo, tipo: p.tipo_cuerpo, nivel: p.grado_nivel, cargo: p.cargo })),
          siguiente: sg ? { nivel: sg.nivel, nombre: sg.nombre, tipo: tipoDe(sg.nivel), puede_optar: puedeOptar, requisitos: E.requisitos.filter((x) => x.obediencia_id === o && x.grado_destino === sg.nivel).map((x) => ({ id: x.id, texto: x.texto, cumplido: E.cumplimientos.some((y) => y.requisito_id === x.id && y.usuario_id === c.user.id) })) } : null };
      });
      return { id: ob.id, nombre: ob.nombre, ritos, tipos: TIPOS_LISTA };
    }));
    ruta('GET', '/requisitos', ({ ctx: c }) => E.requisitos.filter((r) => mias(c).includes(r.obediencia_id)).sort((a, b) => a.grado_destino - b.grado_destino || a.id - b.id).map((r) => ({ ...r, cumplido: E.cumplimientos.some((x) => x.requisito_id === r.id && x.usuario_id === c.user.id) })));
    ruta('POST', '/requisitos', async ({ ctx: c, body }) => { const o = ent(body.obediencia_id, 'Obediencia'); requiereAdmin(c, o); const g = ent(body.grado_destino, 'Grado'); req(E.ritos.some((r) => r.obediencia_id === o && r.grados.some((x) => x.nivel === g)), 400, 'Grado inexistente'); const id = nid(); E.requisitos.push({ id, obediencia_id: o, grado_destino: g, texto: txt(body.texto, 'Requisito', 300, 3) }); await audit(o, 'requisito.crear', c.user.id, 'req:' + id); return { id }; });
    ruta('POST', '/requisitos/:id/cumplimiento', async ({ ctx: c, params, body }) => {
      const r = E.requisitos.find((x) => x.id === ent(params.id, 'Requisito')); req(r, 404, 'No encontrado'); const t = porAlias(body.alias); req(t && t.activo, 404, 'Usuario no encontrado');
      req(E.pert.some((p) => p.usuario_id === t.id && p.obediencia_id === r.obediencia_id && p.estado === 'activa' && esGestor(c, p.cuerpo_id)), 404, 'No encontrado');
      const i = E.cumplimientos.findIndex((x) => x.requisito_id === r.id && x.usuario_id === t.id); if (body.valor === false) { if (i >= 0) E.cumplimientos.splice(i, 1); } else if (i < 0) E.cumplimientos.push({ requisito_id: r.id, usuario_id: t.id, fecha: iso(), registrado_por: c.user.id });
      await audit(r.obediencia_id, 'requisito.cumplimiento', c.user.id, `req:${r.id}:${t.id}:${body.valor === false ? 0 : 1}`); return { ok: true };
    });
    const idxM = (m) => { const [a, b] = m.split('-').map(Number); return a * 12 + b - 1; }, mesDe = (i) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
    const adeud = (cuota, desde, pagados) => { if (!cuota || !cuota.monto) return []; const ini = cuota.inicio > desde.slice(0, 7) ? cuota.inicio : desde.slice(0, 7), out = []; for (let i = idxM(ini); i <= idxM(iso().slice(0, 7)); i++) if (!pagados.has(mesDe(i))) out.push(mesDe(i)); return out; };
    ruta('POST', '/tesoreria/config', async ({ ctx: c, body }) => { const cu = cuerpoDe(body.cuerpo_id); req(esGestor(c, cu.id), 403, 'Solo un cargo gestor configura las cuotas'); const monto = Number(body.monto), inicio = String(body.inicio || iso().slice(0, 7)); req(Number.isInteger(monto) && monto >= 0 && monto < 1e12, 400, 'Monto no válido'); req(/^\d{4}-(0[1-9]|1[0-2])$/.test(inicio), 400, 'Inicio: AAAA-MM');
      const nuevo = { cuerpo_id: cu.id, monto, moneda: String(body.moneda || 'COP').slice(0, 5), inicio, meses_moroso: Math.min(12, Math.max(1, Number(body.meses_moroso) || 3)) }; const i = E.cuotas.findIndex((x) => x.cuerpo_id === cu.id); if (i >= 0) E.cuotas[i] = nuevo; else E.cuotas.push(nuevo); await audit(cu.obediencia_id, 'tesoreria.config', c.user.id, 'cuerpo:' + cu.id); return { ok: true }; });
    ruta('POST', '/tesoreria/pago', async ({ ctx: c, body }) => { const cu = cuerpoDe(body.cuerpo_id); req(esGestor(c, cu.id), 403, 'Solo un cargo gestor registra pagos'); const t = porAlias(body.alias); req(t && E.pert.some((p) => p.usuario_id === t.id && p.cuerpo_id === cu.id && p.estado === 'activa'), 404, 'Usuario no encontrado');
      const periodo = String(body.periodo || ''), monto = Number(body.monto); req(/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo), 400, 'Periodo: AAAA-MM'); req(Number.isInteger(monto) && monto > 0 && monto < 1e12, 400, 'Monto no válido'); req(!E.pagos.some((x) => x.cuerpo_id === cu.id && x.usuario_id === t.id && x.periodo === periodo), 409, 'Ese periodo ya está pagado');
      E.pagos.push({ id: nid(), obediencia_id: cu.obediencia_id, cuerpo_id: cu.id, usuario_id: t.id, periodo, monto, fecha: iso().slice(0, 10), registrado_por: c.user.id }); await audit(cu.obediencia_id, 'tesoreria.pago', c.user.id, `cuerpo:${cu.id}:${t.id}:${periodo}`); return { ok: true }; });
    ruta('GET', '/tesoreria/:id', ({ ctx: c, params }) => { const cu = cuerpoDe(params.id); req(esGestor(c, cu.id), 404, 'No encontrado'); const cuota = E.cuotas.find((x) => x.cuerpo_id === cu.id) || null;
      const miembros = E.pert.filter((p) => p.cuerpo_id === cu.id && p.estado === 'activa').map((p) => ({ alias: U(p.usuario_id).alias, p })).sort((a, b) => a.alias.localeCompare(b.alias)).map(({ alias, p }) => { const ad = adeud(cuota, p.desde, new Set(E.pagos.filter((x) => x.cuerpo_id === cu.id && x.usuario_id === p.usuario_id).map((x) => x.periodo))); return { alias, adeudados: ad, moroso: !!cuota && ad.length >= cuota.meses_moroso }; });
      const por = {}; E.pagos.filter((x) => x.cuerpo_id === cu.id).forEach((x) => { por[x.periodo] ||= { periodo: x.periodo, total: 0, pagos: 0 }; por[x.periodo].total += x.monto; por[x.periodo].pagos++; });
      return { cuota, miembros, recaudado: Object.values(por).sort((a, b) => b.periodo.localeCompare(a.periodo)).slice(0, 12), pagos: E.pagos.filter((x) => x.cuerpo_id === cu.id).slice(-30).reverse().map((x) => ({ periodo: x.periodo, monto: x.monto, fecha: x.fecha, alias: U(x.usuario_id).alias })) }; });
    ruta('GET', '/mis-cuotas', ({ ctx: c }) => c.pert.map((p) => { const cuota = E.cuotas.find((x) => x.cuerpo_id === p.cuerpo_id); if (!cuota) return null; const pagos = E.pagos.filter((x) => x.cuerpo_id === p.cuerpo_id && x.usuario_id === c.user.id).sort((a, b) => b.periodo.localeCompare(a.periodo)).slice(0, 24).map((x) => ({ periodo: x.periodo, monto: x.monto, fecha: x.fecha })); const ad = adeud(cuota, p.desde, new Set(pagos.map((x) => x.periodo))); return { cuerpo_id: p.cuerpo_id, cuerpo: p.cuerpo, cuota, adeudados: ad, moroso: ad.length >= cuota.meses_moroso, pagos }; }).filter(Boolean));
    const puedeVerPl = (c, p) => p.autor_id === c.user.id || esGestor(c, p.cuerpo_id) || (p.estado === 'aprobada' && puedeVer(c, p));
    const plVisible = (c, id) => { const p = E.planchas.find((x) => x.id === ent(id, 'Plancha')); req(p && puedeVerPl(c, p), 404, 'No encontrado'); return p; };
    ruta('GET', '/planchas', ({ ctx: c }) => [...E.planchas].sort((a, b) => b.id - a.id).filter((p) => mias(c).includes(p.obediencia_id) && puedeVerPl(c, p)).map((p) => ({ id: p.id, obediencia_id: p.obediencia_id, cuerpo_id: p.cuerpo_id, titulo: p.titulo, grado_min: p.grado_min, estado: p.estado, creada: p.creada, autor_id: p.autor_id, autor: U(p.autor_id).alias, cuerpo: cuerpoDe(p.cuerpo_id).nombre, versiones: p.versiones.length, mia: p.autor_id === c.user.id, gestor: esGestor(c, p.cuerpo_id) })));
    ruta('POST', '/planchas', async ({ ctx: c, body }) => { const cu = cuerpoDe(body.cuerpo_id); req(miembroDe(c, cu.id), 404, 'No encontrado'); const g = Math.min(Math.max(1, Number(body.grado_min) || 1), Math.max(1, nivelMax(c, cu.obediencia_id))); const id = nid();
      E.planchas.push({ id, obediencia_id: cu.obediencia_id, cuerpo_id: cu.id, autor_id: c.user.id, titulo: txt(body.titulo, 'Título', 160, 3), grado_min: g, estado: 'borrador', creada: iso(), versiones: [{ n: 1, texto: txt(body.texto, 'Texto', 50000), t: iso() }], comentarios: [] }); await audit(cu.obediencia_id, 'plancha.crear', c.user.id, 'plancha:' + id); return { id }; });
    ruta('GET', '/planchas/:id', ({ ctx: c, params }) => { const p = plVisible(c, params.id); return { ...p, autor: U(p.autor_id).alias, mia: p.autor_id === c.user.id, gestor: esGestor(c, p.cuerpo_id), versiones: [...p.versiones].reverse(), comentarios: p.comentarios.map((x) => ({ alias: U(x.usuario_id).alias, texto: x.texto, t: x.t })) }; });
    ruta('POST', '/planchas/:id/version', ({ ctx: c, params, body }) => { const p = plVisible(c, params.id); req(p.autor_id === c.user.id, 403, 'Solo el autor edita la plancha'); req(p.estado === 'borrador', 409, 'La plancha entregada no admite cambios'); p.versiones.push({ n: p.versiones.length + 1, texto: txt(body.texto, 'Texto', 50000), t: iso() }); return { ok: true }; });
    ruta('POST', '/planchas/:id/estado', async ({ ctx: c, params, body }) => { const p = plVisible(c, params.id), flujo = { borrador: { entregada: 'autor' }, entregada: { revision: 'gestor' }, revision: { aprobada: 'gestor', borrador: 'gestor' } }, quien = (flujo[p.estado] || {})[body.estado]; req(quien, 409, `Transición no permitida: ${p.estado} → ${body.estado}`);
      if (quien === 'autor') req(c.user.id === p.autor_id, 403, 'Solo el autor entrega la plancha'); else { req(esGestor(c, p.cuerpo_id), 403, 'Solo un cargo gestor revisa'); req(c.user.id !== p.autor_id, 403, 'El autor no puede revisar su propia plancha'); }
      p.estado = body.estado; await audit(p.obediencia_id, 'plancha.estado', c.user.id, `plancha:${p.id}:${body.estado}`); return { ok: true }; });
    ruta('POST', '/planchas/:id/comentar', ({ ctx: c, params, body }) => { const p = plVisible(c, params.id); req(p.autor_id === c.user.id || esGestor(c, p.cuerpo_id), 403, 'Sin permiso'); p.comentarios.push({ usuario_id: c.user.id, texto: txt(body.texto, 'Comentario', 2000), t: iso() }); return { ok: true }; });
    ruta('GET', '/tareas', ({ ctx: c }) => [...E.tareas].sort((a, b) => b.id - a.id).filter((t) => mias(c).includes(t.obediencia_id) && (t.asignado_id === c.user.id || esGestor(c, t.cuerpo_id))).map((t) => ({ ...t, asignado: U(t.asignado_id).alias, cuerpo: cuerpoDe(t.cuerpo_id).nombre, mia: t.asignado_id === c.user.id, gestor: esGestor(c, t.cuerpo_id) })));
    ruta('POST', '/tareas', async ({ ctx: c, body }) => { const cu = cuerpoDe(body.cuerpo_id); req(esGestor(c, cu.id), 403, 'Solo un cargo gestor asigna tareas'); const t = porAlias(body.alias); req(t && E.pert.some((p) => p.usuario_id === t.id && p.cuerpo_id === cu.id && p.estado === 'activa'), 404, 'Usuario no encontrado'); if (body.vence) req(/^\d{4}-\d{2}-\d{2}$/.test(String(body.vence)), 400, 'Fecha: AAAA-MM-DD');
      const id = nid(); E.tareas.push({ id, obediencia_id: cu.obediencia_id, cuerpo_id: cu.id, titulo: txt(body.titulo, 'Título', 160, 3), asignado_id: t.id, comision: String(body.comision ?? '').slice(0, 80), vence: body.vence || null, estado: 'pendiente', creada_por: c.user.id, creada: iso() }); await audit(cu.obediencia_id, 'tarea.crear', c.user.id, 'tarea:' + id); return { id }; });
    ruta('POST', '/tareas/:id/estado', ({ ctx: c, params, body }) => { const t = E.tareas.find((x) => x.id === ent(params.id, 'Tarea')); req(t && (t.asignado_id === c.user.id || esGestor(c, t.cuerpo_id)), 404, 'No encontrado'); req(['pendiente', 'en_curso', 'hecha'].includes(body.estado), 400, 'Estado no válido'); t.estado = body.estado; return { ok: true }; });

    async function iniciar() {
      let g = null; try { g = opc.cargar ? opc.cargar() : null; } catch {}
      if (g && g.v === 2 && g.n && g.usuarios) E = g; else { await sembrar(); guardar(); }
    }
    listo = iniciar();
    async function handle(metodo, rutaCompleta, body, token) {
      await listo; const [path, qs] = String(rutaCompleta).split('?'), query = new URLSearchParams(qs || '');
      const r = R.find((x) => x.m === metodo && x.re.test(path)); if (!r) return { status: 404, body: { error: 'No encontrado' } };
      let ctx = null;
      if (r.auth) { const m = /^demo:(\d+)$/.exec(String(token || '')); ctx = m && ctxDe(Number(m[1])); if (!ctx) return { status: 401, body: { error: 'No autenticado' } }; viendo = ctx.user.id; }
      try { const out = await r.fn({ ctx, body: body || {}, params: path.match(r.re).groups || {}, query }); guardar(); return { status: 200, body: out ?? { ok: true } }; }
      catch (e) { if (e instanceof Err) return { status: e.status, body: { error: e.message } }; throw e; }
    }
    return { handle, listo: () => listo, alEvento: (f) => { oyentes.add(f); return () => oyentes.delete(f); }, perfiles: PERFILES, estado: () => E };
  }
  root.DEMO_FABRICA = crearDemo; root.DEMO_PERFILES = PERFILES;
  if (typeof module !== 'undefined') module.exports = { crearDemo, PERFILES };
})(typeof globalThis !== 'undefined' ? globalThis : window);
