'use strict';
// Cifrado local con WebCrypto (estandar del navegador): PBKDF2-SHA256 + AES-256-GCM. No se inventa criptografia.
(function (root) {
  const C = globalThis.crypto, subtle = C.subtle;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const ITER = 600000; // recomendacion OWASP 2023 para PBKDF2-HMAC-SHA256
  const AAD = enc.encode('logia-boveda-v1');
  const b64 = u8 => { let s = ''; for (const b of u8) s += String.fromCharCode(b); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const aleatorio = n => C.getRandomValues(new Uint8Array(n));

  async function derivar(pass, salt, iter) {
    const base = await subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base,
      { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function nuevaLlave(pass, iter = ITER) {
    if (typeof pass !== 'string' || pass.length < 10) throw new Error('La clave debe tener al menos 10 caracteres');
    const salt = aleatorio(16);
    return { key: await derivar(pass, salt, iter), salt, iter };
  }
  async function cifrar(llave, obj) {
    const iv = aleatorio(12);
    const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, llave.key, enc.encode(JSON.stringify(obj))));
    return { v: 1, kdf: 'PBKDF2-SHA256', iter: llave.iter, salt: b64(llave.salt), iv: b64(iv), ct: b64(ct) };
  }
  async function abrir(pass, paquete) {
    if (!paquete || paquete.v !== 1 || paquete.kdf !== 'PBKDF2-SHA256') throw new Error('Formato de copia no reconocido');
    const salt = unb64(paquete.salt);
    const key = await derivar(pass, salt, paquete.iter);
    try {
      const pt = await subtle.decrypt({ name: 'AES-GCM', iv: unb64(paquete.iv), additionalData: AAD }, key, unb64(paquete.ct));
      return { llave: { key, salt, iter: paquete.iter }, obj: JSON.parse(dec.decode(pt)) };
    } catch { throw new Error('Clave incorrecta o datos alterados'); }
  }
  async function sha256hex(txt) {
    const h = new Uint8Array(await subtle.digest('SHA-256', enc.encode(txt)));
    return Array.from(h, b => b.toString(16).padStart(2, '0')).join('');
  }
  const uid = () => Array.from(aleatorio(8), b => b.toString(16).padStart(2, '0')).join('');
  const api = { nuevaLlave, cifrar, abrir, sha256hex, uid, ITER };
  root.LogiaCrypto = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
