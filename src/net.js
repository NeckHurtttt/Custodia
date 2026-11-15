// Cooperativo EN LÍNEA. El anfitrión corre la partida y manda fotos del estado; el invitado manda sus controles.
// Conexión P2P con WebRTC usando PeerJS y su servidor público gratis, así funciona desde GitHub Pages sin servidor propio.
const PEER_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIX = 'lfr-custodia-';
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const SNAP_HZ = 12;

/** Lo que el invitado puede pedir que haga el anfitrión (siempre sobre el jugador 2). */
export const OPS = new Set(['interact', 'useQ', 'toggleHide', 'throwItem', 'dropItem', 'betray', 'craft', 'stashPut', 'stashTake', 'resolveProtocol', 'resolveCodigo', 'resolveBreath', 'clearPending']);

export const newCode = (rnd = Math.random) => Array.from({ length: 5 }, () => ABC[Math.floor(rnd() * ABC.length)]).join('');
export const cleanCode = (c) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

// ---------- foto del estado ----------
/** Empaqueta la partida para el invitado: el estado normal + lo que serialize() no guarda (minijuego, captura, acciones). */
export function pack(G, s, sfx = []) {
  const ps = s.ps ?? [s.p];
  const pd = s.pending && {
    kind: s.pending.kind, id: s.pending.id, by: s.pending.by ?? 0,
    hi: s.pending.h ? s.hazards.indexOf(s.pending.h) : -1, vid: s.pending.who?.vid ?? null,
  };
  const es = s.escort && { pi: ps.indexOf(s.escort.p), by: s.escort.by ? { x: s.escort.by.x, y: s.escort.by.y } : null, phase: s.escort.phase, t: s.escort.t, label: s.escort.label, dest: s.escort.dest };
  const acts = ps.map((q) => (q.action ? { kind: q.action.kind, need: q.action.need, t: q.action.t } : null));
  const pos = es ? [ps[es.pi].x, ps[es.pi].y] : null; // serialize() mueve al capturado a su destino: devolvemos la posición real
  return JSON.stringify({ g: G.serialize(s), pd, es, acts, pos, sfx });
}
/** Arma en el invitado una partida dibujable a partir de la foto. Devuelve el estado con s.p = jugador 2. */
export function unpack(G, raw, me = 1) {
  const o = JSON.parse(raw); const s = G.revive(JSON.parse(o.g)); const ps = s.ps ?? [s.p];
  o.acts?.forEach((a, i) => { if (ps[i]) ps[i].action = a; });
  if (o.es) { const p = ps[o.es.pi] ?? ps[0]; if (o.pos) [p.x, p.y] = o.pos; s.escort = { ...o.es, p, pts: [] }; }
  if (o.pd) s.pending = { kind: o.pd.kind, id: o.pd.id, by: o.pd.by, h: o.pd.hi >= 0 ? s.hazards[o.pd.hi] : null, who: { vid: o.pd.vid } };
  s.p = ps[me] ?? ps[0]; s.net = 'guest';
  return { s, sfx: o.sfx ?? [] };
}
/** En el anfitrión: ejecuta lo que pidió el invitado como si lo hiciera el jugador 2. */
export function applyOp(G, s, k, a = []) {
  if (!OPS.has(k) || !s?.ps || s.over) return;
  const sv = s.p; const p2 = s.ps[1];
  if (k === 'clearPending') { if (s.pending?.by === 1 && s.pending.kind === 'escondite') s.pending = null; return; }
  if (k.startsWith('resolve')) { if (s.pending?.by !== 1) return; s.p = p2; G[k](s, !!a[0]); s.p = s.escort ? s.escort.p : sv; return; }
  if (s.pending || p2.down) return;
  s.p = p2; const had = !!s.pending;
  G[k](s, ...a.map((x) => (typeof x === 'number' || typeof x === 'string' ? x : undefined)));
  if (!had && s.pending) s.pending.by = 1;
  s.p = s.escort ? s.escort.p : sv;
}

// ---------- conexión ----------
let libP = null;
function lib() {
  if (globalThis.Peer) return Promise.resolve(globalThis.Peer);
  libP ??= new Promise((ok, bad) => { const sc = document.createElement('script'); sc.src = PEER_URL; sc.onload = () => ok(globalThis.Peer); sc.onerror = () => { libP = null; bad(new Error('No se pudo cargar PeerJS (¿sin internet?)')); }; document.head.appendChild(sc); });
  return libP;
}
const why = (e) => ({ 'peer-unavailable': 'No existe esa sala (revisa el código).', 'unavailable-id': 'Ese código ya está en uso, prueba otra vez.', network: 'Sin conexión con el servidor de salas.', 'browser-incompatible': 'Este navegador no soporta WebRTC.' }[e?.type] ?? (e?.message || 'Error de conexión.'));

/** Crea una sala. cb: { onOpen(code), onJoin(), onMsg(m), onLeave(), onError(txt) } */
export async function host(cb, code = newCode()) {
  const Peer = await lib(); const peer = new Peer(PREFIX + code); let conn = null;
  const api = { role: 'host', code, peer, get open() { return !!conn?.open; }, send(m) { if (conn?.open) conn.send(m); }, close() { try { conn?.close(); peer.destroy(); } catch { /* nada */ } } };
  peer.on('open', () => cb.onOpen?.(code));
  peer.on('connection', (c) => {
    if (conn?.open) { c.on('open', () => { c.send({ t: 'lleno' }); setTimeout(() => c.close(), 300); }); return; }
    conn = c; c.on('open', () => cb.onJoin?.()); c.on('data', (m) => cb.onMsg?.(m)); c.on('close', () => { conn = null; cb.onLeave?.(); });
  });
  peer.on('error', (e) => cb.onError?.(why(e)));
  return api;
}
/** Se une a una sala. cb: { onOpen(), onMsg(m), onLeave(), onError(txt) } */
export async function join(code, cb) {
  const Peer = await lib(); const peer = new Peer(); let conn = null;
  const api = { role: 'guest', code, peer, get open() { return !!conn?.open; }, send(m) { if (conn?.open) conn.send(m); }, close() { try { conn?.close(); peer.destroy(); } catch { /* nada */ } } };
  peer.on('open', () => {
    conn = peer.connect(PREFIX + cleanCode(code), { reliable: true, serialization: 'json' });
    conn.on('open', () => cb.onOpen?.()); conn.on('data', (m) => cb.onMsg?.(m)); conn.on('close', () => cb.onLeave?.());
  });
  peer.on('error', (e) => cb.onError?.(why(e)));
  return api;
}
