// Textura de LIFELINE: Rutina (mejoras 26–50): luces, alarmas, huellas, vapor y chispas, ventanas, ciclo de día,
// animaciones, expresiones, pantallas vivas, aberración al ser visto, viñeta, pasos por suelo, respiración en el casco,
// radio con estática, ambiente, sonido 3D, polvo, objetos flotando, visor, llegada y despegue.
import * as X from './extras.js';
import { audio } from './music.js';

const TS = 16;
const hr = (i) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };
const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
let parts = []; let cache = { loc: null };

// ---------- lugares fijos por mapa (ventanas, rejillas de vapor, motas, objetos flotando) ----------
function prep(s) {
  if (cache.loc === s.loc && cache.map === s.map) return cache;
  const L = s.L, g = s.map.grid, W = L.W; const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= L.H ? 0 : g[y * W + x]);
  const room = (x, y) => L.rooms[s.map.room[y * W + x]];
  const wins = [], vents = [];
  for (let y = 0; y < L.H - 1; y++) for (let x = 0; x < W; x++) {
    if (at(x, y) || !at(x, y + 1)) continue; const r = room(x, y + 1); if (!r || r.outside) continue;
    if (hr(x * 13 + y * 7) > 0.8 && !wins.some((w) => w.y === y && Math.abs(w.x - x) < 2)) wins.push({ x, y });
    else if (hr(x * 31 + y * 3) > 0.93) vents.push({ x, y, t: hr(x + y) * 5 });
  }
  const motes = [], floaters = [];
  L.rooms.forEach((r, ri) => {
    if (r.outside) return;
    const n = Math.min(14, Math.round(r.w * r.h / 7)); for (let i = 0; i < n; i++) motes.push({ x: r.x + hr(ri * 50 + i) * r.w, y: r.y + hr(ri * 70 + i * 3) * r.h, ph: hr(i * 9 + ri) * 6.28 });
    if (s.L.theme === 'estacion' && !r.restricted) for (let i = 0; i < (r.w * r.h > 40 ? 2 : 1); i++) floaters.push({ x: r.x + 1 + hr(ri * 11 + i) * (r.w - 2), y: r.y + 1 + hr(ri * 13 + i) * (r.h - 2), k: Math.floor(hr(ri * 17 + i) * 5), ph: hr(ri + i * 5) * 6.28 });
  });
  cache = { loc: s.loc, map: s.map, wins, vents, motes, floaters }; parts = [];
  return cache;
}
function emit(p) { if (parts.length < 320) parts.push(p); }

// ---------- capa del mundo, debajo de los personajes ----------
export function under(c, s, t, env) {
  const P = prep(s); const { vis } = env; const night = s.min < 360 || s.min >= 1320;
  // 30 · ventanas al exterior
  for (const w of P.wins) if (vis(w.x, w.y)) window_(c, s, t, w, night);
  // 34 · pantallas vivas
  for (const o of s.objects) if (vis(o.x, o.y)) screen(c, o, t, s);
  // 28 · tus huellas en el polvo de Marte
  for (const f of s.prints ?? []) { if (!vis(f.x, f.y)) continue; c.save(); c.translate(f.x * TS, f.y * TS + 5); c.rotate(f.dir); c.fillStyle = `rgba(40,15,5,${Math.min(0.45, f.t / 60)})`; c.fillRect(-2, -1, 4, 2); c.restore(); }
  // 44 · objetos que flotan en la estación
  for (const f of P.floaters) {
    const x = f.x + Math.sin(t / 2600 + f.ph) * 0.6, y = f.y + Math.cos(t / 3100 + f.ph) * 0.5; if (!vis(x, y)) continue;
    c.save(); c.translate(x * TS, y * TS); c.rotate(t / (1800 + f.k * 300) + f.ph);
    if (f.k === 0) { R(c, '#ffd23d', -4, -1, 8, 2); R(c, '#222', 3, -1, 1, 2); }          // lápiz
    else if (f.k === 1) { R(c, '#e8eef5', -2, -3, 5, 6); R(c, '#9fd4ff', -1, -2, 3, 1); }   // vaso
    else if (f.k === 2) { R(c, '#9aa4ae', -2, -2, 4, 4); R(c, '#6a737c', -1, -1, 2, 2); }   // tuerca
    else if (f.k === 3) { R(c, '#e0c080', -3, -2, 6, 4); R(c, '#a08050', -3, 0, 6, 1); }   // libreta
    else { R(c, '#ff6b9a', -1, -3, 2, 6); R(c, '#fff', -1, -3, 2, 1); }                    // cepillo
    c.restore();
  }
}

function window_(c, s, t, w, night) {
  const px = w.x * TS + 2, py = w.y * TS + 3, ww = 12, wh = 8; const th = s.L.theme;
  R(c, '#0d1118', px - 1, py - 1, ww + 2, wh + 2);
  c.save(); c.beginPath(); c.rect(px, py, ww, wh); c.clip();
  if (th === 'estacion') {
    R(c, '#02040c', px, py, ww, wh);
    for (let i = 0; i < 5; i++) R(c, `rgba(230,240,255,${0.4 + hr(i + w.x) * 0.6})`, px + ((hr(i * 7 + w.x) * 40 + t / 90) % ww), py + hr(i * 3 + w.y) * wh, 1, 1);
    const turn = (t / 9000 + w.x * 0.3) % 6.28; c.fillStyle = '#1d5fae'; c.beginPath(); c.arc(px + 6, py + 20, 15, 0, 7); c.fill();
    c.fillStyle = 'rgba(80,200,120,.7)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(px + 6 + Math.sin(turn + i * 2.1) * 10, py + 7 + i, 2, 0, 7); c.fill(); }
    R(c, 'rgba(140,200,255,.6)', px, py + 5, ww, 1);
  } else if (th === 'luna') {
    R(c, '#000', px, py, ww, wh); for (let i = 0; i < 4; i++) if (Math.sin(t / 400 + i * 3 + w.x) > -0.5) R(c, '#fff', px + hr(i + w.x) * ww, py + hr(i * 5 + w.y) * 4, 1, 1);
    c.fillStyle = '#3d7bff'; c.beginPath(); c.arc(px + 9, py + 2, 1.6, 0, 7); c.fill(); R(c, '#8a8a90', px, py + 6, ww, 2); R(c, '#6a6a70', px + 3, py + 5, 4, 1);
  } else {
    const h = s.min / 60; const dusk = (h > 17 && h < 19.5) || (h > 5 && h < 6.5);
    R(c, night ? '#140a08' : dusk ? '#4a6a9a' : '#c98a5a', px, py, ww, wh);
    if (dusk) { c.fillStyle = '#cfe6ff'; c.beginPath(); c.arc(px + 6, py + 6, 1.5, 0, 7); c.fill(); }
    const stormy = X.frontBlinds(s); for (let i = 0; i < (stormy ? 8 : 3); i++) R(c, 'rgba(255,190,140,.5)', px + ((hr(i + w.x) * 30 + t / (stormy ? 20 : 70)) % (ww + 4)) - 2, py + hr(i * 3) * wh, 3, 1);
    R(c, '#7a3a1a', px, py + 6, ww, 2);
  }
  c.restore();
  R(c, 'rgba(255,255,255,.18)', px + 1, py + 1, 3, 1);
}

function screen(c, o, t, s) {
  const x = o.x * TS, y = o.y * TS; const f = Math.floor(t / 180);
  if (o.t === 'estudio') { for (let k = 0; k < 3; k++) R(c, k === (f % 3) ? '#5ff6ff' : '#9fd4ff', x + 5, y + 2 + k * 2, 2 + Math.floor(hr(f + k + o.x) * 6), 1); }
  else if (o.t === 'capcom') { for (let k = 0; k < 6; k++) R(c, '#5ff6ff', x + 3 + k, y + 9 + Math.round(Math.sin(t / 120 + k) * 1.5), 1, 1); }
  else if (o.t === 'registro' && s.iaOn) { for (let k = 0; k < 3; k++) R(c, hr(f * 3 + k) > 0.5 ? '#ff6b6b' : '#5a1c20', x + 4 + Math.floor(hr(f + k) * 6), y + 4 + k * 3, 2, 1); }
  else if (o.t === 'mesa' && s.L.schedule.find((b) => s.min >= b.from && s.min < b.to)?.id === 'comer') { R(c, 'rgba(255,255,255,.35)', x + 3, y + 1 - (t / 300 % 3), 1, 2); R(c, 'rgba(255,255,255,.25)', x + 10, y - (t / 260 % 3), 1, 2); }
}

// ---------- capa del mundo, encima de los personajes ----------
export function over(c, s, t, dt, env) {
  const P = prep(s); const { vis } = env;
  // 29 · vapor de las rejillas, chispas si la base está dañada, humo del fuego, aire que escapa
  for (const v of P.vents) { if (!vis(v.x, v.y)) continue; v.t -= dt; if (v.t <= 0) { v.t = 3 + hr(v.x * t) * 4; for (let i = 0; i < 8; i++) emit({ x: v.x * TS + 8, y: (v.y + 1) * TS, vx: (Math.random() - 0.5) * 8, vy: 6 + Math.random() * 10, life: 1.2, max: 1.2, k: 'vapor' }); } }
  if (s.integ < 60 && Math.random() < (60 - s.integ) / 600) { const v = P.vents[Math.floor(Math.random() * P.vents.length)] ?? P.wins[0]; if (v && vis(v.x, v.y)) for (let i = 0; i < 6; i++) emit({ x: v.x * TS + Math.random() * 16, y: (v.y + 1) * TS, vx: (Math.random() - 0.5) * 50, vy: -20 - Math.random() * 30, g: 120, life: 0.6, max: 0.6, k: 'chispa' }); }
  for (const h of s.hazards) {
    if (h.kind === 'fuego' && h.tiles && Math.random() < 0.5) { const i = h.tiles[Math.floor(Math.random() * h.tiles.length)]; emit({ x: (i % s.L.W) * TS + Math.random() * 16, y: ((i / s.L.W) | 0) * TS + 8, vx: (Math.random() - 0.5) * 10, vy: -25 - Math.random() * 20, life: 1, max: 1, k: 'brasa' }); }
    if (h.def.type === 'pull' && Math.random() < 0.6) { const a = Math.random() * 6.28; emit({ x: h.x * TS + Math.cos(a) * 50, y: h.y * TS + Math.sin(a) * 50, tx: h.x * TS, ty: h.y * TS, life: 0.8, max: 0.8, k: 'aire' }); }
  }
  // 32 · animaciones: chispitas al teclear, migas al comer
  const p = s.p; const a = s.action?.kind;
  if ((a === 'estudio' || a === 'trabajo') && Math.random() < 0.3) emit({ x: p.x * TS + 5, y: p.y * TS - 4, vx: (Math.random() - 0.5) * 20, vy: -15, life: 0.4, max: 0.4, k: 'tecla' });
  if (s.ate && !cache.ate) for (let i = 0; i < 6; i++) emit({ x: p.x * TS, y: p.y * TS - 8, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 15, g: 60, life: 0.8, max: 0.8, k: 'miga' });
  cache.ate = s.ate;
  for (const q of parts) {
    q.life -= dt;
    if (q.k === 'aire') { q.x += (q.tx - q.x) * dt * 4; q.y += (q.ty - q.y) * dt * 4; }
    else { q.vy += (q.g ?? 0) * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.k === 'vapor') { q.vx *= 0.97; q.vy *= 0.95; } }
    const k = q.life / q.max;
    if (q.k === 'vapor') { c.fillStyle = `rgba(200,210,220,${0.25 * k})`; c.beginPath(); c.arc(q.x, q.y, 3 + (1 - k) * 5, 0, 7); c.fill(); }
    else if (q.k === 'chispa') R(c, k > 0.5 ? '#fff6a0' : '#ffb03d', q.x, q.y, 1, 1);
    else if (q.k === 'brasa') R(c, `rgba(255,${120 + k * 100 | 0},40,${k})`, q.x, q.y, 1, 2);
    else if (q.k === 'aire') R(c, `rgba(170,230,255,${0.7 * k})`, q.x, q.y, 1, 1);
    else if (q.k === 'tecla') R(c, '#9fd4ff', q.x, q.y, 1, 1);
    else if (q.k === 'miga') R(c, '#e8b04a', q.x, q.y, 1, 1);
  }
  parts = parts.filter((q) => q.life > 0);
  // 43 · polvo flotando bajo las lámparas
  for (const m of P.motes) {
    const x = m.x + Math.sin(t / 2200 + m.ph) * 0.7, y = m.y - ((t / 9000 + m.ph) % 1) * 1.5; if (!vis(x, y)) continue;
    const li = X.light(s, x, y); if (li < 0.2) continue; R(c, `rgba(255,250,220,${0.35 * li})`, x * TS, y * TS, 1, 1);
  }
  // 27 · alarma: luces rojas giratorias en las crisis
  const crisis = s.final || env.G.emergency(s) || s.drones.some((d) => d.mode === 'persigue');
  if (crisis) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const r of s.L.rooms) {
      if (r.outside || !vis(r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h))) continue;
      const lx = (r.x + r.w / 2) * TS, ly = (r.y + 0.6) * TS, rad = Math.max(r.w, r.h) * TS * 0.7, ang = t / 260 + r.x;
      for (const off of [0, Math.PI]) { const g = c.createRadialGradient(lx, ly, 2, lx, ly, rad); g.addColorStop(0, 'rgba(255,30,30,.16)'); g.addColorStop(1, 'rgba(255,30,30,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(lx, ly); c.arc(lx, ly, rad, ang + off - 0.35, ang + off + 0.35); c.closePath(); c.fill(); }
      R(c, Math.floor(t / 260) % 2 ? '#ff3b3b' : '#7a1010', lx - 2, r.y * TS + 1, 4, 3);
    }
    c.restore();
  }
  // 3 · el vigía duda: «?» con su medidor
  for (const d of s.drones) if ((d.sus ?? 0) > 0.02 && d.mode !== 'persigue' && s.iaOn && vis(d.x, d.y)) {
    c.font = '13px VT323'; c.textAlign = 'center'; c.fillStyle = d.sus > 0.6 ? '#ff8a3d' : '#ffd23d'; c.fillText('?', d.x * TS, d.y * TS - 15);
    R(c, '#0a0e17', d.x * TS - 6, d.y * TS - 23, 12, 2); R(c, d.sus > 0.6 ? '#ff8a3d' : '#ffd23d', d.x * TS - 6, d.y * TS - 23, 12 * d.sus, 2);
  }
  // 33 · expresiones de la tripulación
  for (const cr of s.crew) {
    if (!vis(cr.x, cr.y) || cr.say) continue; const x = cr.x * TS, y = cr.y * TS - 20; const asleep = (s.min >= 1320 || s.min < 360) && !cr.moving;
    if (cr.sick) { R(c, '#4dff88', x - 1, y - 3, 2, 6); R(c, '#4dff88', x - 3, y - 1, 6, 2); }
    else if (cr.betrayed) { R(c, '#ff4b4b', x - 3, y - 2, 2, 1); R(c, '#ff4b4b', x + 1, y - 2, 2, 1); R(c, '#ff4b4b', x - 2, y + 1, 4, 1); }
    else if (cr.saw > 0) { c.font = '12px VT323'; c.textAlign = 'center'; c.fillStyle = '#ffd23d'; c.fillText('?', x, y); }
    else if (cr.alarmed) { c.font = '12px VT323'; c.textAlign = 'center'; c.fillStyle = '#ff8a3d'; c.fillText('!', x, y); }
    else if (asleep) { c.font = '9px VT323'; c.textAlign = 'center'; c.fillStyle = '#9fd4ff'; c.fillText('z', x + 5, y + 4 - (t / 350 % 4)); }
    else if (cr.trust >= 2) { R(c, '#ff6b9a', x - 2, y - 1, 2, 2); R(c, '#ff6b9a', x + 1, y - 1, 2, 2); R(c, '#ff6b9a', x - 1, y + 1, 3, 1); }
    else if (cr.busyT > 0) { R(c, '#ffc23d', x - 3, y, 2, 1); R(c, '#ffc23d', x + 1, y, 2, 1); }
  }
}

// ---------- capa de pantalla ----------
let chroma = 0, tmp = null;
export function hit(k) { chroma = Math.max(chroma, k); }
export function screenFx(c, cv, s, t, dt, env) {
  const W = cv.width, H = cv.height; const p = s.p; const G = env.G;
  // 50 · color propio de cada destino
  c.save(); c.globalCompositeOperation = 'soft-light'; c.fillStyle = { estacion: 'rgba(60,110,200,.35)', luna: 'rgba(170,170,185,.30)', marte: 'rgba(230,110,40,.40)' }[s.L.theme] ?? 'rgba(0,0,0,0)'; c.fillRect(0, 0, W, H); c.restore();
  // 31 · amanecer y atardecer
  const h = s.min / 60; const dawn = h >= 5.5 && h < 7.5 ? 1 - Math.abs(h - 6.5) : 0, dusk = h >= 17.5 && h < 21 ? 1 - Math.abs(h - 19.25) / 1.75 : 0;
  if (dawn > 0) R(c, `rgba(255,150,70,${0.10 * dawn})`, 0, 0, W, H);
  if (dusk > 0) R(c, `rgba(120,60,170,${0.13 * dusk})`, 0, 0, W, H);
  // 26 · luces que fallan cuando falta energía
  const en = s.vital?.energia ?? 100; if (en < 45 && Math.random() < (45 - en) / 180) R(c, `rgba(0,0,0,${0.3 + Math.random() * 0.4})`, 0, 0, W, H);
  // 36 · viñeta: sin aire, agotado, hambre o sed
  const bad = Math.max(p.o2 < 40 ? (40 - p.o2) / 40 : 0, p.energia < 20 ? (20 - p.energia) / 25 : 0, (p.hambre ?? 100) < 15 || (p.sed ?? 100) < 15 ? 0.45 : 0);
  if (bad > 0) { const k = bad * (0.75 + 0.25 * Math.sin(t / 300)); const g = c.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, W * 0.62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.85 * k})`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  // 46 · visor del casco afuera
  if (G.isOutside(s) && G.has(s, 'traje') && !p.inDuct) {
    c.save(); c.fillStyle = 'rgba(5,8,14,.92)'; c.beginPath(); c.rect(0, 0, W, H); c.ellipse(W / 2, H / 2, W * 0.56, H * 0.62, 0, 0, 7); c.fill('evenodd');
    c.strokeStyle = 'rgba(160,200,255,.35)'; c.lineWidth = 3; c.beginPath(); c.ellipse(W / 2, H / 2, W * 0.56, H * 0.62, 0, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 14; c.beginPath(); c.arc(W * 0.3, H * 0.3, H * 0.4, 3.6, 4.4); c.stroke();
    c.fillStyle = 'rgba(95,246,255,.7)'; c.font = '14px VT323'; c.textAlign = 'left'; c.fillText(`TRAJE · O₂ ${Math.ceil(p.o2)}% · ${s.L.theme === 'luna' ? '1,62' : '3,71'} m/s²`, 26, H - 44); c.restore();
  }
  // 35 · aberración de color al ser detectado
  if (chroma > 0) {
    chroma = Math.max(0, chroma - dt * 1.4); tmp ??= document.createElement('canvas'); tmp.width = W; tmp.height = H; tmp.getContext('2d').drawImage(cv, 0, 0);
    const o = Math.round(6 * chroma); c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35 * chroma;
    c.filter = 'sepia(1) saturate(8) hue-rotate(-40deg)'; c.drawImage(tmp, o, 0); c.filter = 'sepia(1) saturate(8) hue-rotate(150deg)'; c.drawImage(tmp, -o, 0); c.restore();
  }
}

// ---------- 48 · llegada · 49 · despegue ----------
export function arrival(c, cv, s, k) {
  const W = cv.width, H = cv.height; const th = s.L.theme; c.save(); c.globalAlpha = k < 0.85 ? 1 : (1 - k) / 0.15;
  R(c, th === 'estacion' ? '#02040a' : '#000', 0, 0, W, H);
  for (let i = 0; i < 120; i++) R(c, `rgba(255,255,255,${hr(i) * 0.8})`, hr(i + 1) * W, hr(i + 2) * H * (th === 'estacion' ? 1 : 0.7), 1, 1);
  c.textAlign = 'center'; c.font = '26px VT323'; c.fillStyle = '#5ff6ff';
  if (th === 'estacion') {
    c.fillStyle = '#1d5fae'; c.beginPath(); c.arc(W / 2, H + 380, 460, 0, 7); c.fill();
    const sx = W / 2 + 60; R(c, '#8a96a8', sx - 40, H / 2 - 6, 80, 12); R(c, '#2a4a8a', sx - 100, H / 2 - 22, 50, 44); R(c, '#2a4a8a', sx + 50, H / 2 - 22, 50, 44); R(c, '#c9d3dd', sx - 8, H / 2 - 16, 16, 32);
    const cxp = 60 + (sx - 60 - 70) * Math.min(1, k / 0.75); R(c, '#e8eef5', cxp, H / 2 - 7, 26, 14); R(c, '#1e3a5a', cxp + 18, H / 2 - 4, 6, 8); if (k < 0.75) R(c, '#5ff6ff', cxp - 6, H / 2 - 2, 6, 4);
    c.fillStyle = '#5ff6ff'; c.fillText(k < 0.75 ? `ACOPLAMIENTO · DISTANCIA ${Math.max(0, Math.round((0.75 - k) * 140))} m · 0,1 m/s` : '¡ACOPLADO! ABRIENDO ESCOTILLA', W / 2, 40);
  } else {
    const ground = th === 'luna' ? '#77777b' : '#9a4a2a'; R(c, ground, 0, H - 90, W, 90); R(c, 'rgba(0,0,0,.2)', 0, H - 90, W, 3);
    if (th === 'marte') { const g = c.createLinearGradient(0, 0, 0, H - 90); g.addColorStop(0, '#2a120a'); g.addColorStop(1, '#a8603a'); c.fillStyle = g; c.fillRect(0, 0, W, H - 90); }
    const y = 40 + (H - 160 - 40) * Math.min(1, k / 0.7); const x = W / 2;
    R(c, '#d8dce2', x - 18, y, 36, 26); R(c, '#2a4a7a', x - 8, y + 5, 16, 7); R(c, '#666', x - 24, y + 22, 4, 16); R(c, '#666', x + 20, y + 22, 4, 16);
    if (k < 0.7) { R(c, '#ffd23d', x - 5, y + 26, 10, 8 + Math.random() * 10); R(c, '#ff6b1a', x - 3, y + 34, 6, 6 + Math.random() * 8); }
    if (k > 0.6 && k < 0.85) for (let i = 0; i < 18; i++) { c.fillStyle = `rgba(${th === 'luna' ? '200,200,200' : '220,130,80'},${0.5 - (k - 0.6) * 2})`; c.beginPath(); c.arc(x + (i - 9) * 9 * (1 + (k - 0.6) * 6), H - 92, 6 + i % 4, 0, 7); c.fill(); }
    c.fillStyle = '#5ff6ff'; c.fillText(k < 0.7 ? `DESCENSO · ALTITUD ${Math.round((0.7 - k) * 2200)} m · ${th === 'luna' ? 'g = 1,62' : 'g = 3,71'} m/s²` : '¡CONTACTO! MOTORES APAGADOS', W / 2, 40);
  }
  c.font = '20px VT323'; c.fillStyle = '#9fb0c8'; c.fillText(s.L.name.toUpperCase(), W / 2, H - 24); c.restore();
}
export function liftoff(c, cv, s, k) {
  const W = cv.width, H = cv.height; const th = s.L.theme; c.save(); c.globalAlpha = Math.min(1, k * 4);
  R(c, '#000', 0, 0, W, H); for (let i = 0; i < 140; i++) R(c, `rgba(255,255,255,${hr(i) * 0.8})`, hr(i + 1) * W, ((hr(i + 2) * H + k * 300 * (th === 'estacion' ? 0 : 1)) % H), 1, 1);
  c.textAlign = 'center';
  if (th === 'estacion') {
    c.fillStyle = '#1d5fae'; c.beginPath(); c.arc(W / 2, H + 300 - k * 260, 420, 0, 7); c.fill();
    const y = 80 + k * (H - 120); const x = W / 2; R(c, '#e8eef5', x - 10, y - 14, 20, 24);
    if (k > 0.4) { c.fillStyle = `rgba(255,${150 - k * 80 | 0},40,.8)`; c.beginPath(); c.ellipse(x, y + 14, 14, 10 + k * 20, 0, 0, 7); c.fill(); }
  } else {
    const ground = th === 'luna' ? '#77777b' : '#9a4a2a'; R(c, ground, 0, H - 70 + k * 200, W, 90);
    const y = H - 110 - Math.pow(k, 2) * (H + 40); const x = W / 2;
    R(c, '#d8dce2', x - 8, y - 30, 16, 40); R(c, '#ff4b4b', x - 8, y - 34, 16, 6); R(c, '#2a4a7a', x - 4, y - 22, 8, 6);
    R(c, '#ffd23d', x - 6, y + 10, 12, 12 + Math.random() * 20); R(c, '#ff6b1a', x - 4, y + 22, 8, 10 + Math.random() * 16);
  }
  c.font = '34px VT323'; c.fillStyle = '#4dff88'; c.fillText(th === 'estacion' ? 'REENTRADA · RUMBO A LA TIERRA' : 'DESPEGUE · RUMBO A CASA', W / 2, H / 2 - 120);
  c.font = '22px VT323'; c.fillStyle = '#9fd4ff'; c.fillText({ motin: 'Toda la tripulación a bordo.', sabotaje: 'Pilotaje manual: sin la IA.', plan: 'El plan funcionó.' }[s.route] ?? '', W / 2, H / 2 - 90);
  c.restore();
}

// ---------- 47 · datos reales para la pantalla de carga ----------
export const FACTS = {
  estacion: ['La Estación Espacial da una vuelta a la Tierra cada 90 minutos: sus tripulantes ven 16 amaneceres al día.', 'En la estación se hace unas 2 horas de ejercicio al día para no perder hueso ni músculo.', 'Casi toda el agua de la estación se recicla, incluso la de la orina y el sudor.', 'La estación orbita a unos 400 km de altura, a 28 000 km/h.'],
  luna: ['En la Luna la gravedad es 1,62 m/s²: un sexto de la de la Tierra.', 'El polvo lunar (regolito) es filoso como vidrio molido y se pega a los trajes.', 'Entre el día y la noche lunar la temperatura cambia más de 250 °C.', 'Un día lunar dura unas dos semanas terrestres.'],
  marte: ['En Marte la gravedad es 3,71 m/s², algo más de un tercio de la terrestre.', 'Los atardeceres de Marte son azules: el polvo fino dispersa la luz al revés que en la Tierra.', 'El suelo marciano tiene percloratos, sales tóxicas para las personas.', 'Un mensaje de radio entre Marte y la Tierra tarda entre 3 y 22 minutos.'],
};

// ---------- sonido: 37 pasos · 38 respiración · 39 estática · 40 ambiente · 42 vigías en 3D ----------
let A = null; let breathT = 0, creakT = 6, lastLog = null;
function nodes() {
  const au = audio(); if (!au) return null; if (A?.ac === au.ac) return A;
  const { ac, master } = au; const out = ac.createGain(); out.gain.value = 0; out.connect(master);
  const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(); src.buffer = buf; src.loop = true; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; const ng = ac.createGain(); ng.gain.value = 0.05; src.connect(lp).connect(ng).connect(out); src.start();
  const hum = ac.createOscillator(); hum.frequency.value = 60; const hg = ac.createGain(); hg.gain.value = 0.012; hum.connect(hg).connect(out); hum.start();
  const lfo = ac.createOscillator(); lfo.frequency.value = 0.15; const lg = ac.createGain(); lg.gain.value = 0; lfo.connect(lg).connect(ng.gain); lfo.start();
  A = { ac, master, out, lp, ng, hum, lg, buf, drones: [] }; return A;
}
function burst(dur, vol, type, f, q = 1, when = 0, sweep = null) {
  const { ac, master, buf } = A; const t = ac.currentTime + when; const n = ac.createBufferSource(); n.buffer = buf; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q; if (sweep) fl.frequency.linearRampToValueAtTime(sweep, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); n.connect(fl).connect(g).connect(master); n.start(t, Math.random()); n.stop(t + dur + 0.05);
}
function tone(f, dur, vol, type = 'sine', f2 = null) { const { ac, master } = A; const t = ac.currentTime; const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05); }

export function step(s, p, G) {
  if (!nodes()) return; const v = p.crouch ? 0.35 : 1;
  if (p.inDuct) { burst(0.06, 0.05 * v, 'bandpass', 1300, 4); tone(320, 0.08, 0.012 * v, 'triangle'); return; }
  if (G.isOutside(s, p.x, p.y)) { burst(s.L.theme === 'luna' ? 0.14 : 0.1, 0.06 * v, 'lowpass', s.L.theme === 'luna' ? 280 : 420); return; }
  const k = G.roomAt(s, p.x, p.y)?.kind ?? 'corr';
  if (k === 'dorm') burst(0.05, 0.025 * v, 'lowpass', 300);
  else if (k === 'gym') { tone(110, 0.07, 0.03 * v, 'sine', 60); }
  else if (['corr', 'taller', 'hangar', 'esclusa', 'capsula', 'generador', 'bodega'].includes(k) || s.L.theme === 'estacion') { burst(0.05, 0.04 * v, 'bandpass', 2200, 3); tone(520 + Math.random() * 80, 0.05, 0.008 * v, 'triangle'); }
  else burst(0.05, 0.035 * v, 'bandpass', 900, 2);
}
export function staticBurst() { if (!nodes()) return; burst(0.35, 0.05, 'bandpass', 1800, 2); for (let i = 0; i < 4; i++) burst(0.02, 0.06, 'highpass', 4000, 1, Math.random() * 0.3); }

export function tickAudio(s, dt, on, G) {
  if (!nodes()) return; const { ac, out, lp, ng, lg, hum } = A; const now = ac.currentTime; const p = s.p;
  out.gain.setTargetAtTime(on ? 1 : 0, now, 0.4);
  // ambiente: ventiladores (estación), silencio y crujidos (Luna), viento (Marte)
  const th = s.L.theme; const outside = G.isOutside(s) && !p.inDuct;
  lp.frequency.setTargetAtTime(outside ? (th === 'marte' ? 700 : 120) : th === 'estacion' ? 520 : th === 'luna' ? 260 : 600, now, 0.5);
  ng.gain.setTargetAtTime(outside ? (th === 'marte' ? 0.09 : 0.012) : (s.vital?.energia ?? 100) < 30 ? 0.02 : 0.05, now, 0.5);
  lg.gain.setTargetAtTime(th === 'marte' ? 0.04 : 0, now, 1); hum.frequency.setTargetAtTime((s.vital?.energia ?? 100) < 30 ? 50 : 60, now, 1);
  if (!on) return;
  if ((creakT -= dt) <= 0) { creakT = 8 + Math.random() * 14; if (!outside) tone(th === 'luna' ? 70 : 95, 0.6, 0.025, 'sawtooth', th === 'luna' ? 50 : 70); }
  // respiración dentro del casco
  if (outside && G.has(s, 'traje')) { breathT -= dt * (p.o2 < 30 ? 1.8 : 1); if (breathT <= 0) { breathT = 3.4; burst(1.1, 0.035, 'bandpass', 500, 2, 0, 1100); burst(1.3, 0.03, 'bandpass', 1100, 2, 1.4, 450); } }
  // radio con estática cuando habla la IA
  const last = s.log[s.log.length - 1]; if (last !== lastLog) { if (last?.kind === 'ia' && lastLog) staticBurst(); lastLog = last; }
  // vigías en 3D: zumbido que suena a la izquierda o derecha según dónde están
  const ds = s.iaOn ? s.drones.slice().sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 3) : [];
  for (let i = 0; i < 3; i++) {
    let v = A.drones[i];
    if (!v) { const o = ac.createOscillator(); o.type = 'sawtooth'; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; const g = ac.createGain(); g.gain.value = 0; const pn = ac.createStereoPanner(); o.connect(f).connect(g).connect(pn).connect(out); o.start(); v = A.drones[i] = { o, g, pn }; }
    const d = ds[i]; const dist = d ? Math.hypot(d.x - p.x, d.y - p.y) : 99; const live = d && d.stun <= 0;
    v.g.gain.setTargetAtTime(live ? Math.max(0, 1 - dist / 9) * 0.035 : 0, now, 0.15);
    if (d) { v.pn.pan.setTargetAtTime(Math.max(-1, Math.min(1, (d.x - p.x) / 6)), now, 0.1); v.o.frequency.setTargetAtTime(d.mode === 'persigue' ? 150 : 85 + i * 7, now, 0.2); }
  }
}
