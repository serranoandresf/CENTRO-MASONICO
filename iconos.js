'use strict';
// Iconos vectoriales propios (trazo, 24×24). Se construyen con createElementNS: nunca se usa innerHTML.
const ICONOS = {
  inicio: ['M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  camino: [{ c: [12, 12, 9] }, 'M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z'],
  chat: ['M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z'],
  agenda: [{ r: [3, 5, 18, 16, 3] }, 'M3 10h18M8 3v4M16 3v4'],
  tenidas: ['M3 21h18M12 3 3 8h18zM6 11v7M10 11v7M14 11v7M18 11v7'],
  planchas: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6'],
  tareas: ['M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9'],
  formacion: [{ c: [12, 9, 6] }, 'M8.6 14.2 7 21l5-3 5 3-1.6-6.8'],
  tesoreria: ['M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2M16 14.5h.01'],
  biblioteca: ['M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7'],
  directorio: ['M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M21 19v-1a4 4 0 0 0-3-3.9M15.5 4.3a3.5 3.5 0 0 1 0 6.8', { c: [9.5, 8, 3.5] }],
  logia: [{ c: [12, 12, 3] }, 'M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1'],
  admin: ['M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6zM9 12l2 2 4-4'],
  perfil: [{ c: [12, 8, 4] }, 'M4 21a8 8 0 0 1 16 0'],
  mas: ['M5 12h.01M12 12h.01M19 12h.01'],
  buscar: [{ c: [11, 11, 7] }, 'M21 21l-4.3-4.3'],
  enviar: ['M22 2 11 13M22 2l-7 20-4-9-9-4z'],
  mas_: ['M12 5v14M5 12h14'],
  salir: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'],
  candado: [{ r: [5, 11, 14, 10, 2] }, 'M8 11V8a4 4 0 0 1 8 0v3'],
  check: ['M5 12l5 5L20 7'],
  cerrar: ['M6 6l12 12M18 6 6 18'],
  luna: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
  sol: [{ c: [12, 12, 4] }, 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'],
  campana: ['M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0'],
  info: [{ c: [12, 12, 9] }, 'M12 16v-4M12 8h.01'],
  estrella: ['M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z'],
  flecha: ['M9 6l6 6-6 6'],
  rayo: ['M13 2 4 14h7l-1 8 9-12h-7z'],
  triangulo: ['M12 4 3.5 19h17z', { c: [12, 14, 1.4] }]
};
function icono(nombre, clase) {
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('class', 'ic' + (clase ? ' ' + clase : '')); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  for (const p of ICONOS[nombre] || ICONOS.info) {
    if (typeof p === 'string') { const e = document.createElementNS(ns, 'path'); e.setAttribute('d', p); svg.append(e); }
    else if (p.c) { const e = document.createElementNS(ns, 'circle'); e.setAttribute('cx', p.c[0]); e.setAttribute('cy', p.c[1]); e.setAttribute('r', p.c[2]); svg.append(e); }
    else if (p.r) { const e = document.createElementNS(ns, 'rect'); e.setAttribute('x', p.r[0]); e.setAttribute('y', p.r[1]); e.setAttribute('width', p.r[2]); e.setAttribute('height', p.r[3]); e.setAttribute('rx', p.r[4]); svg.append(e); }
  }
  return svg;
}
