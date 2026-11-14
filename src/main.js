// Pantalla, controles y menús de LIFELINE: Rutina. Mundo en pixel art con cámara que sigue al jugador.
import { ITEMS, PROTOCOLS } from './common.js';
import { LOCS } from './locs.js';
import * as G from './core.js';

const TS = 16, ZOOM = 2;
const cv = document.getElementById('lienzo'); const cx = cv.getContext('2d');
const VW = cv.width / ZOOM, VH = cv.height / ZOOM; // vista en píxeles del mundo
const $ = (id) => document.getElementById(id);
let s = null; let menu = null; let last = performance.now(); let hudT = 0; let saveT = 0;
const keys = new Set(); const touch = { dx: 0, dy: 0 };
const cam = { x: 0, y: 0 };

// ---------- guardado (una ranura por destino) ----------
const SKEY = (loc) => `lfr.${loc}`;
function save() { if (!s || s.over) return; try { localStorage.setItem(SKEY(s.loc), G.serialize(s)); } catch { /* sin almacenamiento */ } }
function load(loc) { try { const raw = localStorage.getItem(SKEY(loc)); return raw ? G.revive(JSON.parse(raw)) : null; } catch { return null; } }
const clearSave = (loc) => { try { localStorage.removeItem(SKEY(loc)); } catch { /* nada */ } };
const best = (loc) => { try { return +localStorage.getItem(`lfr.best.${loc}`) || 0; } catch { return 0; } };
const setBest = (loc, n) => { try { if (n > best(loc)) localStorage.setItem(`lfr.best.${loc}`, n); } catch { /* nada */ } };

// ---------- sonido ----------
let ac = null;
function beep(f = 440, d = 0.08, type = 'square', vol = 0.035) {
  try { ac ??= new AudioContext(); const o = ac.createOscillator(); const g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.value = vol; o.connect(g).connect(ac.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d); o.stop(ac.currentTime + d); } catch { /* sin audio */ }
}

// ---------- paletas por destino ----------
const THEMES = {
  estacion: { void: '#02040a', floor: '#1d2733', floor2: '#232f3d', line: '#2c3a4a', wall: '#56677a', wallTop: '#8296ab', wallDark: '#2a3440', corr: '#1a222c', danger: '#2a1418', out: '#000' },
  luna: { void: '#3a3a3e', floor: '#2b2a2e', floor2: '#323136', line: '#3d3c42', wall: '#6d6a66', wallTop: '#9c978f', wallDark: '#3a3835', corr: '#262529', danger: '#2c1719', out: '#77777b' },
  marte: { void: '#5e2a18', floor: '#33281f', floor2: '#3a2e24', line: '#47382b', wall: '#8a6a52', wallTop: '#b8957a', wallDark: '#4a3528', corr: '#2d241c', danger: '#3a1a16', out: '#9a4a2a' },
};
const ROOM_TINT = { dorm: '#24314a', comedor: '#2f2a22', gym: '#23302a', lab: '#1f2f38', mando: '#22283a', taller: '#2e2a26', inver: '#1d3322', ia: '#3a1416', bodega: '#2c2a24', esclusa: '#30302a', capsula: '#2a2a36', generador: '#2e2c1c', refugio: '#2a2236' };

// ---------- capa fija del mundo (piso, paredes, objetos) ----------
let base = null; let baseLoc = null;
function hashRand(i) { let x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); }
function drawBase() {
  const L = s.L; const T = THEMES[L.theme];
  base = document.createElement('canvas'); base.width = L.W * TS; base.height = L.H * TS; baseLoc = s.loc;
  const b = base.getContext('2d'); b.imageSmoothingEnabled = false;
  const g = s.map.grid; const W = L.W, H = L.H;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : g[y * W + x]);
  // fondo: espacio con estrellas y la Tierra, o suelo lunar/marciano
  b.fillStyle = T.void; b.fillRect(0, 0, base.width, base.height);
  if (L.theme === 'estacion') {
    for (let i = 0; i < 400; i++) { b.fillStyle = `rgba(220,235,255,${0.2 + hashRand(i) * 0.7})`; b.fillRect(hashRand(i + 1) * base.width | 0, hashRand(i + 2) * base.height | 0, 1, 1); }
    const ex = base.width - 40, ey = base.height + 260; const gr = b.createRadialGradient(ex - 60, ey - 120, 30, ex, ey, 330);
    gr.addColorStop(0, '#6fb6ff'); gr.addColorStop(0.7, '#1d5fae'); gr.addColorStop(1, '#0a2a55'); b.fillStyle = gr; b.beginPath(); b.arc(ex, ey, 320, 0, 7); b.fill();
    b.fillStyle = 'rgba(80,200,120,.5)'; for (let i = 0; i < 30; i++) { b.beginPath(); b.arc(ex - 200 + hashRand(i + 9) * 260, ey - 300 + hashRand(i + 19) * 120, 6 + hashRand(i + 29) * 14, 0, 7); b.fill(); }
  } else {
    for (let i = 0; i < 900; i++) { const v = hashRand(i); b.fillStyle = v > 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.12)'; b.fillRect(hashRand(i + 3) * base.width | 0, hashRand(i + 4) * base.height | 0, 2, 2); }
  }
  // piso
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = at(x, y); if (!v) continue;
    const ri = s.map.room[y * W + x]; const r = L.rooms[ri];
    const px = x * TS, py = y * TS;
    if (r?.outside) {
      b.fillStyle = T.out; b.fillRect(px, py, TS, TS);
      for (let k = 0; k < 5; k++) { const h = hashRand(x * 31 + y * 17 + k); b.fillStyle = h > 0.5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.14)'; b.fillRect(px + (hashRand(h * 99) * 14 | 0), py + (hashRand(h * 77) * 14 | 0), 2, 2); }
      continue;
    }
    b.fillStyle = r ? (r.restricted ? T.danger : ROOM_TINT[r.kind] ?? T.floor) : T.corr; b.fillRect(px, py, TS, TS);
    b.fillStyle = 'rgba(255,255,255,.035)'; b.fillRect(px + 1, py + 1, TS - 2, TS - 2);
    b.fillStyle = 'rgba(0,0,0,.25)'; b.fillRect(px, py + TS - 1, TS, 1); b.fillRect(px + TS - 1, py, 1, TS);
    if (!r) { b.fillStyle = 'rgba(255,200,60,.12)'; if ((x + y) % 2) b.fillRect(px + 6, py + 6, 4, 4); }
    if (r?.kind === 'inver' && (x + y) % 3 === 0) { b.fillStyle = 'rgba(80,160,80,.12)'; b.fillRect(px + 2, py + 2, 12, 12); }
    if (r?.kind === 'refugio') { b.fillStyle = 'rgba(160,120,255,.08)'; b.fillRect(px, py, TS, TS); }
  }
  // cráteres y rocas en el exterior
  const ext = L.rooms.find((r) => r.outside);
  if (ext) for (let i = 0; i < 26; i++) {
    const x = (ext.x + hashRand(i * 3) * ext.w) * TS, y = (ext.y + hashRand(i * 5) * ext.h) * TS, rad = 4 + hashRand(i * 7) * 12;
    if (s.objects.some((o) => Math.hypot(o.x * TS + 8 - x, o.y * TS + 8 - y) < 26)) continue;
    b.fillStyle = 'rgba(0,0,0,.22)'; b.beginPath(); b.ellipse(x, y, rad, rad * 0.6, 0, 0, 7); b.fill();
    b.fillStyle = 'rgba(255,255,255,.08)'; b.beginPath(); b.ellipse(x - 1, y - 1, rad * 0.7, rad * 0.4, 0, 0, 7); b.fill();
  }
  // paredes con relieve
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (at(x, y)) continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => at(x + dx, y + dy) && !L.rooms[s.map.room[(y + dy) * W + x + dx]]?.outside);
    if (!near) continue;
    const px = x * TS, py = y * TS;
    b.fillStyle = T.wallDark; b.fillRect(px, py, TS, TS);
    b.fillStyle = T.wall; b.fillRect(px, py, TS, TS - 4);
    b.fillStyle = T.wallTop; b.fillRect(px, py, TS, 3);
    b.fillStyle = 'rgba(0,0,0,.25)'; b.fillRect(px + 7, py + 3, 1, TS - 7);
    if (at(x, y + 1) && hashRand(x * 13 + y) > 0.8) { b.fillStyle = hashRand(x + y * 7) > 0.5 ? '#4dff88' : '#ffc23d'; b.fillRect(px + 3, py + 6, 2, 2); }
  }
  // nombres de las salas
  b.font = '10px VT323'; b.textBaseline = 'top';
  for (const r of L.rooms) { b.fillStyle = 'rgba(0,0,0,.45)'; const w = b.measureText(r.name.toUpperCase()).width; b.fillRect(r.x * TS + 2, r.y * TS + 1, w + 4, 10); b.fillStyle = r.restricted ? '#ff6b6b' : r.outside ? '#ffffff' : '#9fe8b8'; b.fillText(r.name.toUpperCase(), r.x * TS + 4, r.y * TS + 1); }
  // objetos fijos
  for (const o of s.objects) drawObj(b, o, L.theme);
}

function R(b, c, x, y, w, h) { b.fillStyle = c; b.fillRect(x, y, w, h); }
function drawObj(b, o, theme) {
  const x = o.x * TS, y = o.y * TS;
  switch (o.t) {
    case 'cama': R(b, '#3a4350', x, y + 2, 16, 12); R(b, '#c9d3dd', x + 1, y + 3, 14, 10); R(b, '#fff', x + 2, y + 4, 4, 4); R(b, o.mine ? '#2bb8c4' : '#b0505a', x + 6, y + 4, 9, 8); break;
    case 'escondite': R(b, '#3c4a5a', x + 2, y, 12, 16); R(b, '#566a80', x + 3, y + 1, 10, 14); R(b, '#2b3642', x + 4, y + 3, 8, 1); R(b, '#2b3642', x + 4, y + 5, 8, 1); R(b, '#d8e2ec', x + 11, y + 8, 1, 3); break;
    case 'cajon': R(b, '#4a3d2a', x + 1, y + 5, 14, 11); R(b, '#7a6646', x + 1, y + 4, 14, 3); R(b, '#3a2f20', x + 2, y + 9, 12, 1); R(b, '#3a2f20', x + 2, y + 12, 12, 1); R(b, '#c9b48a', x + 7, y + 10, 2, 1); break;
    case 'mesa': R(b, '#5d636e', x, y + 4, 16, 9); R(b, '#8a919e', x, y + 3, 16, 3); R(b, '#e8b04a', x + 2, y + 6, 4, 3); R(b, '#6ac46a', x + 9, y + 6, 4, 3); break;
    case 'cinta': R(b, '#2a2a2e', x, y + 6, 16, 8); R(b, '#4a4a52', x + 1, y + 7, 14, 6); R(b, '#9aa', x + 1, y + 1, 2, 7); R(b, '#9aa', x + 13, y + 1, 2, 7); R(b, '#9aa', x + 1, y + 1, 14, 2); break;
    case 'estudio': R(b, '#4a3a2c', x, y + 9, 16, 6); R(b, '#22272e', x + 3, y + 1, 10, 8); R(b, '#1c5a3a', x + 4, y + 2, 8, 6); R(b, '#4dff88', x + 5, y + 3, 5, 1); R(b, '#4dff88', x + 5, y + 5, 3, 1); break;
    case 'registro': R(b, '#2a1416', x + 2, y, 12, 16); R(b, '#401c20', x + 3, y + 1, 10, 14); for (let i = 0; i < 4; i++) R(b, '#1a0c0e', x + 4, y + 3 + i * 3, 8, 1); break;
    case 'capcom': R(b, '#3c4450', x, y + 6, 16, 10); R(b, '#1a2a3a', x + 2, y + 7, 7, 5); R(b, '#5ff6ff', x + 3, y + 8, 5, 1); R(b, '#aab', x + 12, y, 1, 7); R(b, '#ff4b4b', x + 11, y, 3, 2); break;
    case 'trabajo':
      if (theme === 'luna') { R(b, '#2c3444', x + 1, y + 1, 14, 15); for (let i = 0; i < 3; i++) R(b, '#ffd23d', x + 3, y + 3 + i * 4, 10, 2); }
      else { R(b, '#6b4a2a', x + 3, y + 10, 10, 6); R(b, '#3a8a3a', x + 2, y + 3, 12, 8); R(b, '#5fd35f', x + 5, y + 1, 6, 6); R(b, '#ff6b9a', x + 7, y + 3, 2, 2); }
      break;
    case 'caja':
      if (theme === 'estacion') { R(b, '#6a5a3a', x, y + 1, 16, 15); R(b, '#8a7650', x + 1, y + 2, 14, 13); R(b, '#4a3d28', x + 1, y + 8, 14, 1); R(b, '#4a3d28', x + 7, y + 2, 1, 13); }
      else { R(b, '#c8ccd2', x + 2, y, 12, 16); R(b, '#e8ecf2', x + 3, y + 1, 4, 14); R(b, theme === 'luna' ? '#4a8aff' : '#ff8a3d', x + 2, y + 6, 12, 3); }
      break;
    case 'traje': R(b, '#5a6066', x + 1, y, 14, 16); R(b, '#e8eef5', x + 5, y + 2, 6, 5); R(b, '#e8eef5', x + 4, y + 7, 8, 6); R(b, '#e8eef5', x + 4, y + 13, 3, 3); R(b, '#e8eef5', x + 9, y + 13, 3, 3); R(b, '#2a5a8a', x + 6, y + 3, 4, 2); break;
    case 'nucleo': R(b, '#1a0a0c', x - 2, y - 2, 20, 20); R(b, '#3a1418', x, y, 16, 16); break;
    case 'palanca': R(b, '#3a4250', x, y + 4, 16, 12); R(b, '#22303a', x + 2, y + 5, 12, 4); R(b, '#888', x + 7, y - 2, 2, 7); break;
    case 'asiento':
      if (theme === 'estacion') { R(b, '#3a3a44', x - 2, y - 2, 20, 20); R(b, '#c9b48a', x + 3, y + 3, 10, 10); R(b, '#8a7650', x + 4, y + 4, 8, 5); }
      else {
        R(b, '#d8dce2', x - 6, y - 10, 28, 20); R(b, '#aab0b8', x - 6, y + 2, 28, 8); R(b, '#2a4a7a', x + 2, y - 6, 12, 6);
        R(b, '#666', x - 10, y + 10, 4, 8); R(b, '#666', x + 22, y + 10, 4, 8); R(b, '#888', x - 2, y + 10, 20, 3);
        R(b, theme === 'luna' ? '#c9a84a' : '#ff8a3d', x - 6, y - 2, 28, 2);
      }
      break;
  }
}

// ---------- personajes ----------
function astro(ctx, x, y, dir, phase, stripe, moving, alpha = 1) {
  ctx.globalAlpha = alpha;
  const px = Math.round(x * TS), py = Math.round(y * TS);
  const f = Math.abs(Math.cos(dir)) > Math.abs(Math.sin(dir)) ? (Math.cos(dir) > 0 ? 'r' : 'l') : (Math.sin(dir) > 0 ? 'd' : 'u');
  const step = moving ? Math.round(Math.sin(phase * 14)) : 0;
  R(ctx, 'rgba(0,0,0,.3)', px - 5, py + 5, 10, 3);
  R(ctx, '#c9d3dd', px - 4, py + 2 + Math.max(0, step), 3, 4); R(ctx, '#c9d3dd', px + 1, py + 2 + Math.max(0, -step), 3, 4);
  R(ctx, '#e8eef5', px - 5, py - 4, 10, 7);
  R(ctx, stripe, px - 5, py - 1, 10, 2);
  if (f === 'u') R(ctx, '#9aa4b0', px - 4, py - 4, 8, 6);
  R(ctx, '#f4f8fc', px - 4, py - 11, 8, 7);
  R(ctx, '#ffffff', px - 3, py - 12, 6, 1);
  const visor = '#1e3a5a'; const shine = '#5fb6ff';
  if (f === 'd') { R(ctx, visor, px - 3, py - 9, 6, 3); R(ctx, shine, px - 2, py - 9, 2, 1); }
  if (f === 'l') { R(ctx, visor, px - 4, py - 9, 4, 3); R(ctx, shine, px - 4, py - 9, 1, 1); }
  if (f === 'r') { R(ctx, visor, px, py - 9, 4, 3); R(ctx, shine, px + 3, py - 9, 1, 1); }
  ctx.globalAlpha = 1;
}
function droneSprite(ctx, d, t, off) {
  const bob = off ? 0 : Math.sin(t / 200 + d.route) * 1.5; const px = d.x * TS, py = d.y * TS + bob;
  R(ctx, 'rgba(0,0,0,.3)', px - 5, d.y * TS + 6, 10, 2);
  R(ctx, off ? '#333' : '#5a6270', px - 6, py - 4, 12, 6); R(ctx, off ? '#222' : '#8a94a2', px - 4, py - 6, 8, 3);
  const eye = off ? '#111' : d.mode === 'persigue' ? '#ff3b3b' : '#ffc23d';
  R(ctx, eye, px - 1 + Math.round(Math.cos(d.dir) * 3), py - 3 + Math.round(Math.sin(d.dir) * 1), 3, 2);
  if (!off && Math.floor(t / 300) % 2) R(ctx, eye, px - 1, py - 7, 2, 1);
}
function robotSprite(ctx, h, t, rover) {
  const px = h.x * TS, py = h.y * TS; const c = h.stun > 0 ? '#555' : h.def.color;
  R(ctx, 'rgba(0,0,0,.35)', px - 8, py + 5, 16, 3);
  if (rover) { R(ctx, '#333', px - 8, py + 1, 4, 5); R(ctx, '#333', px + 4, py + 1, 4, 5); R(ctx, c, px - 7, py - 5, 14, 7); R(ctx, '#222', px - 2, py - 8, 4, 3); R(ctx, h.stun > 0 ? '#111' : '#ff3b3b', px - 1 + Math.round(Math.cos(h.dir) * 4), py - 3, 2, 2); }
  else { R(ctx, '#333', px - 6, py + 2, 12, 4); R(ctx, c, px - 5, py - 7, 10, 9); R(ctx, '#222', px - 3, py - 5, 6, 3); R(ctx, h.stun > 0 ? '#111' : '#ff3b3b', px - 2, py - 4, 1, 1); R(ctx, h.stun > 0 ? '#111' : '#ff3b3b', px + 1, py - 4, 1, 1); R(ctx, '#888', px + 5, py - 3 + Math.round(Math.sin(t / 120) * 2), 4, 1); }
  if (h.stun > 0) { ctx.fillStyle = '#5ff6ff'; ctx.font = '9px VT323'; ctx.fillText(`${Math.ceil(h.stun)}`, px, py - 12); }
}

// ---------- dibujo de cada cuadro ----------
function draw(t) {
  if (baseLoc !== s.loc || !base) drawBase();
  const L = s.L; const p = s.p;
  // cámara centrada en el jugador
  const ww = L.W * TS, wh = L.H * TS;
  cam.x = ww <= VW ? (ww - VW) / 2 : Math.max(0, Math.min(ww - VW, p.x * TS - VW / 2));
  cam.y = wh <= VH ? (wh - VH) / 2 : Math.max(0, Math.min(wh - VH, p.y * TS - VH / 2));
  cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false;
  cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height);
  cx.setTransform(ZOOM, 0, 0, ZOOM, Math.round(-cam.x * ZOOM), Math.round(-cam.y * ZOOM));
  cx.drawImage(base, 0, 0);
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  const vis = (x, y, m = 2) => x * TS > cam.x - m * TS && x * TS < cam.x + VW + m * TS && y * TS > cam.y - m * TS && y * TS < cam.y + VH + m * TS;

  // conductos y rejillas
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (s.map.duct[y * L.W + x] && vis(x, y)) {
    if (p.inDuct) { R(cx, 'rgba(95,246,255,.28)', x * TS + 3, y * TS + 3, 10, 10); R(cx, 'rgba(95,246,255,.5)', x * TS + 7, y * TS + 7, 2, 2); }
    else if ((x + y) % 2 === 0 && !s.map.grid[y * L.W + x]) R(cx, 'rgba(95,246,255,.1)', x * TS + 7, y * TS + 7, 2, 2);
  }
  L.grates.forEach(([x, y], i) => { R(cx, s.grates[i] ? '#0c2a2c' : '#3a4a52', x * TS + 2, y * TS + 2, 12, 12); for (let k = 0; k < 4; k++) R(cx, s.grates[i] ? '#1b5a5e' : '#7a8a92', x * TS + 3, y * TS + 3 + k * 3, 10, 1); });
  // escotillas
  for (const d of s.map.doors) for (const [x, y] of d.tiles) {
    if (!vis(x, y)) continue; const px = x * TS, py = y * TS;
    if (d.open) { R(cx, '#3a4450', px, py, 3, TS); R(cx, '#3a4450', px + TS - 3, py, 3, TS); R(cx, d.lock ? '#ff4b4b' : '#4dff88', px + 1, py + 2, 1, 2); }
    else { R(cx, d.lock ? '#5a1c1c' : '#5a6270', px, py, TS, TS); R(cx, d.lock ? '#ff4b4b' : '#ffc23d', px, py + 6, TS, 2); R(cx, 'rgba(0,0,0,.3)', px + 7, py, 2, TS); if (d.lock) { R(cx, '#ffd23d', px + 6, py + 9, 4, 3); R(cx, '#ffd23d', px + 7, py + 7, 2, 2); } }
  }
  // indicadores de objetos
  for (const o of s.objects) {
    if (!vis(o.x, o.y)) continue; const px = o.x * TS, py = o.y * TS;
    if (o.t === 'cajon' && o.loot.length) R(cx, Math.floor(t / 400) % 2 ? '#ffd23d' : '#c9a030', px + 12, py + 5, 2, 2);
    if (o.t === 'registro') { const on = s.frags[o.frag]; R(cx, on ? '#4dff88' : Math.floor(t / 250) % 2 ? '#ff4b4b' : '#7a1c1c', px + 5, py + 2, 6, 2); }
    if (o.t === 'nucleo') { const k = s.iaOn ? 0.5 + 0.5 * Math.sin(t / 220) : 0; cx.fillStyle = s.iaOn ? `rgba(255,${40 + 60 * k | 0},50,${0.6 + 0.4 * k})` : '#2a3a2a'; cx.beginPath(); cx.arc(px + 8, py + 8, 6, 0, 7); cx.fill(); if (s.iaOn) { cx.fillStyle = '#fff'; cx.fillRect(px + 7, py + 7, 2, 2); } }
    if ((o.t === 'caja' || o.t === 'traje') && o.used) R(cx, 'rgba(0,0,0,.55)', px - 1, py - 1, 18, 18);
    if (o.t === 'escondite') R(cx, '#5ff6ff', px + 12, py + 9, 1, 2);
    if (o.t === 'palanca' && s.final) R(cx, s.final.lever ? '#4dff88' : (Math.floor(t / 200) % 2 ? '#ffc23d' : '#ff4b4b'), px + 6, py - 4, 4, 3);
    if (o.t === 'estudio' && Math.floor(t / 600 + o.x) % 2) R(cx, '#4dff88', px + 10, py + 5, 1, 1);
  }
  // problemas
  for (const h of s.hazards) drawHazard(h, t, vis);
  // tripulación
  for (const c of s.crew) if (vis(c.x, c.y)) astro(cx, c.x, c.y, c.dir, t / 1000, c.color, c.moving);
  // vigilancia (conos y drones)
  for (const d of s.drones) {
    if (!vis(d.x, d.y, 7)) continue;
    const off = !s.iaOn || d.stun > 0;
    if (!off) {
      const k = G.storm(s) ? 0.55 : 1;
      cx.fillStyle = d.mode === 'persigue' ? 'rgba(255,60,60,.22)' : 'rgba(255,200,60,.13)';
      cx.beginPath(); cx.moveTo(d.x * TS, d.y * TS);
      for (let a = -Math.PI / 4; a <= Math.PI / 4 + 0.01; a += Math.PI / 20) {
        let r = 0.2; while (r < 5.5 * k && G.los(s, d.x, d.y, d.x + Math.cos(d.dir + a) * r, d.y + Math.sin(d.dir + a) * r)) r += 0.25;
        cx.lineTo((d.x + Math.cos(d.dir + a) * r) * TS, (d.y + Math.sin(d.dir + a) * r) * TS);
      }
      cx.closePath(); cx.fill();
    }
    droneSprite(cx, d, t, off);
    if (d.stun > 0 && s.iaOn) { cx.fillStyle = '#5ff6ff'; cx.font = '9px VT323'; cx.fillText(`${Math.ceil(d.stun)}`, d.x * TS, d.y * TS - 12); }
  }
  // jugador
  const blink = p.hit > 0 && Math.floor(t / 80) % 2;
  astro(cx, p.x, p.y, p.dir, p.walk, '#5ff6ff', keys.size > 0 || touch.dx || touch.dy, p.inDuct ? 0.5 : blink ? 0.35 : 1);
  if (p.sleep) { cx.fillStyle = '#5ff6ff'; cx.font = '10px VT323'; cx.fillText('z', p.x * TS + 7, p.y * TS - 14 - (t / 300 % 4)); }

  // luz: noche, tormenta, final
  const night = G.isNight(s); const st = G.storm(s);
  if (night || st || s.final) {
    const px = p.x * TS, py = p.y * TS;
    const col = s.final ? `rgba(70,0,0,${0.38 + 0.18 * Math.sin(t / 140)})` : st ? 'rgba(60,20,5,.78)' : 'rgba(0,3,10,.74)';
    const gr = cx.createRadialGradient(px, py, 10, px, py, (st ? 3.2 : 4.6) * TS);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, col);
    cx.fillStyle = gr; cx.fillRect(cam.x - 2, cam.y - 2, VW + 4, VH + 4);
  }
  // frentes (radiación, tormenta)
  for (const h of s.hazards) if (h.def.type === 'front' && h.phase === 'barre') {
    const [r, g, b] = h.def.color; const x0 = (h.x - h.def.width) * TS, x1 = h.x * TS;
    const gr = cx.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, `rgba(${r},${g},${b},0)`); gr.addColorStop(0.8, `rgba(${r},${g},${b},.22)`); gr.addColorStop(1, `rgba(${r},${g},${b},.5)`);
    cx.fillStyle = gr; cx.fillRect(x0, 0, x1 - x0, L.H * TS);
    for (let i = 0; i < 40; i++) { const y = hashRand(i + Math.floor(t / 60)) * L.H * TS; R(cx, `rgba(${r},${g},${b},.7)`, x1 - hashRand(i * 3 + Math.floor(t / 90)) * Math.min(h.def.width, 8) * TS, y, 3, 1); }
  }
  // globos de diálogo y texto de acción
  cx.font = '10px VT323';
  for (const c of s.crew) if (c.say && vis(c.x, c.y)) bubble(c.x * TS, c.y * TS - 18, `${c.name}: ${c.say}`, c.color);
  const n = G.nearby(s)[0];
  if (s.action) { const k = s.action.t / s.action.need; R(cx, '#010502', p.x * TS - 12, p.y * TS - 20, 24, 4); R(cx, '#ffc23d', p.x * TS - 12, p.y * TS - 20, 24 * k, 4); }
  else if (n && !p.sleep && !menu) bubble(p.x * TS, p.y * TS - 20, `[E] ${G.label(s, n)}`, '#4dff88');

  // capa de pantalla (sin cámara)
  cx.setTransform(1, 0, 0, 1, 0, 0);
  arrowToGoal(t);
  minimap();
  cx.textAlign = 'center';
  for (const h of s.hazards) if (h.def.type === 'front' && h.phase === 'aviso') { cx.font = '26px VT323'; cx.fillStyle = Math.floor(t / 250) % 2 ? '#ff4b4b' : '#ffc23d'; cx.fillText(`⚠ ${h.def.name}: ${Math.ceil(h.t)} s`, cv.width / 2, 30); }
  if (s.final) { cx.font = '32px VT323'; cx.fillStyle = '#ff4b4b'; cx.fillText(`¡DESPEGUE! ${Math.ceil(s.final.t)} s`, cv.width / 2, 30); }
  if (G.isOutside(s) && !p.inDuct) { cx.font = '20px VT323'; cx.fillStyle = p.o2 < 30 ? '#ff4b4b' : '#5ff6ff'; cx.fillText(`O₂ ${Math.ceil(p.o2)}%${G.has(s, 'traje') ? '' : ' · ¡SIN TRAJE!'}`, cv.width / 2, cv.height - 18); }
}

function bubble(x, y, txt, color) {
  const w = Math.min(190, cx.measureText(txt).width + 8);
  R(cx, 'rgba(2,8,6,.88)', x - w / 2, y - 6, w, 12); R(cx, color, x - w / 2, y + 6, w, 1);
  cx.fillStyle = '#e8f0ff'; cx.fillText(txt.length > 46 ? txt.slice(0, 45) + '…' : txt, x, y);
}

function drawHazard(h, t, vis) {
  const def = h.def;
  if (def.type === 'spread') {
    const [r, g, b] = def.color;
    for (const i of h.tiles) {
      const x = i % s.L.W, y = (i / s.L.W) | 0; if (!vis(x, y)) continue; const px = x * TS, py = y * TS; const f = Math.sin(t / 110 + i) * 0.5 + 0.5;
      if (h.kind === 'fuego') { R(cx, `rgba(${r},${g},${b},${0.45 + f * 0.3})`, px, py, TS, TS); R(cx, '#ffd23d', px + 4, py + 6 - f * 3, 3, 6); R(cx, '#ff6b1a', px + 9, py + 4 - f * 2, 3, 8); R(cx, 'rgba(60,60,60,.4)', px + 3, py - 4 - f * 4, 8, 4); }
      else if (h.kind === 'grieta') { R(cx, 'rgba(0,0,0,.35)', px, py, TS, TS); R(cx, '#0a0806', px + 2, py + 7, 12, 2); R(cx, '#0a0806', px + 6, py + 3, 2, 10); R(cx, '#ffb04a', px + 7, py + 8, 1, 1); }
      else if (h.kind === 'frio') { R(cx, `rgba(${r},${g},${b},${0.25 + f * 0.15})`, px, py, TS, TS); R(cx, '#e8f8ff', px + 3, py + 3, 1, 5); R(cx, '#e8f8ff', px + 1, py + 5, 5, 1); R(cx, '#e8f8ff', px + 10, py + 9, 1, 4); R(cx, '#e8f8ff', px + 9, py + 10, 3, 1); }
      else { R(cx, `rgba(${r},${g},${b},${0.3 + f * 0.2})`, px, py, TS, TS); for (let k = 0; k < 4; k++) R(cx, `rgb(${r},${g},${b})`, px + (hashRand(i + k) * 13 | 0), py + (hashRand(i * 2 + k) * 13 | 0), 2, 2); }
    }
  } else if (def.type === 'chaser') {
    if (!vis(h.x, h.y, 3)) return;
    const [r, g, b] = def.color;
    for (let k = 0; k < 14; k++) { const a = t / (def.knock ? 120 : 500) + k * 0.9; const rr = (0.3 + (k % 5) * 0.28) * TS; cx.fillStyle = `rgba(${r},${g},${b},${0.25 + (k % 3) * 0.12})`; cx.beginPath(); cx.arc(h.x * TS + Math.cos(a) * rr, h.y * TS + Math.sin(a) * rr * (def.knock ? 0.6 : 1) - (def.knock ? k * 1.2 : 0), 4 + (k % 4), 0, 7); cx.fill(); }
    cx.fillStyle = '#fff'; cx.font = '9px VT323'; cx.fillText(def.label ?? '', h.x * TS, h.y * TS);
  } else if (def.type === 'bouncer') {
    for (const b of h.bits) { cx.save(); cx.translate(b.x * TS, b.y * TS); cx.rotate(b.rot); R(cx, '#9aa4ae', -5, -3, 10, 6); R(cx, '#cfd6dc', -5, -3, 10, 2); R(cx, '#6a737c', 2, -1, 3, 3); cx.restore(); }
  } else if (def.type === 'pull') {
    for (let k = 0; k < 10; k++) { const ph = (t / 700 + k / 10) % 1; const a = k * 2.4 + t / 900; const rr = (1 - ph) * 4.5 * TS; R(cx, 'rgba(160,230,255,.75)', h.x * TS + Math.cos(a) * rr, h.y * TS + Math.sin(a) * rr, 2, 1); }
    R(cx, '#000', h.x * TS - 3, h.y * TS - 3, 6, 6); R(cx, '#5ff6ff', h.x * TS - 1, h.y * TS - 1, 2, 2);
    cx.fillStyle = '#5ff6ff'; cx.font = '10px VT323'; cx.fillText(`Tres ${Math.ceil(h.tres)} s`, h.x * TS, h.y * TS - 12);
  } else if (def.type === 'robot') robotSprite(cx, h, t, h.kind === 'rover');
}

// Flecha al borde de la pantalla que apunta a donde te toca estar.
function arrowToGoal(t) {
  if (s.final) return;
  const b = G.block(s); if (!b.room || G.playerRoom(s) === b.room) return;
  const r = s.L.rooms.find((x) => x.id === b.room); const gx = (r.x + r.w / 2) * TS - cam.x, gy = (r.y + r.h / 2) * TS - cam.y;
  if (gx > 0 && gx < VW && gy > 0 && gy < VH) return;
  const a = Math.atan2(gy - VH / 2, gx - VW / 2); const ex = cv.width / 2 + Math.cos(a) * (cv.width / 2 - 40), ey = cv.height / 2 + Math.sin(a) * (cv.height / 2 - 40);
  cx.save(); cx.translate(ex, ey); cx.rotate(a); cx.fillStyle = Math.floor(t / 300) % 2 ? '#ffc23d' : '#ffe08a';
  cx.beginPath(); cx.moveTo(14, 0); cx.lineTo(-8, -9); cx.lineTo(-8, 9); cx.fill(); cx.restore();
  cx.font = '14px VT323'; cx.fillStyle = '#ffc23d'; cx.textAlign = 'center'; cx.fillText(r.name, ex - Math.cos(a) * 30, ey - Math.sin(a) * 22);
}

function minimap() {
  const L = s.L; const k = 2; const mw = L.W * k, mh = L.H * k; const ox = cv.width - mw - 8, oy = 8;
  R(cx, 'rgba(0,0,0,.6)', ox - 3, oy - 3, mw + 6, mh + 6); cx.strokeStyle = '#1c6b34'; cx.strokeRect(ox - 3.5, oy - 3.5, mw + 7, mh + 7);
  const goal = G.block(s).room;
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
    const g = s.map.grid[y * L.W + x]; if (!g) continue; const r = L.rooms[s.map.room[y * L.W + x]];
    cx.fillStyle = g === 2 ? '#ffc23d' : r?.id === goal ? '#2f6b4a' : r?.restricted ? '#4a1c1c' : r?.outside ? '#555' : '#1f3a2a';
    cx.fillRect(ox + x * k, oy + y * k, k, k);
  }
  for (const h of s.hazards) if (h.def.type !== 'front') R(cx, '#ff8a3d', ox + h.x * k - 1, oy + h.y * k - 1, 3, 3);
  for (const c of s.crew) R(cx, c.color, ox + c.x * k - 1, oy + c.y * k - 1, 2, 2);
  if (s.iaOn) for (const d of s.drones) R(cx, d.mode === 'persigue' ? '#ff3b3b' : '#ffc23d', ox + d.x * k - 1, oy + d.y * k - 1, 3, 3);
  R(cx, '#5ff6ff', ox + s.p.x * k - 2, oy + s.p.y * k - 2, 4, 4);
  R(cx, 'rgba(255,255,255,.25)', ox + cam.x / TS * k, oy + cam.y / TS * k, VW / TS * k, 1);
}

// ---------- panel ----------
function bar(v, low = 25) { return `<div class="barrita ${v < low ? 'bajo' : ''}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`; }
function slot(it) { const d = ITEMS[it]; return `<div class="slot ${d.plan ? 'plan' : d.tool ? 'tool' : ''}" title="${G.itemName(s, it)}${d.info ? ' — ' + d.info : ''}">${icon(it)}</div>`; }
function hud() {
  const p = s.p; const b = G.block(s); const L = s.L;
  $('dia').textContent = `${L.icon} DÍA ${s.day}/${G.DAYS}`;
  $('reloj').textContent = G.clock(s.min);
  const late = b.room && s.checked && G.playerRoom(s) !== b.room;
  $('bloque').textContent = b.room ? `${b.name.toUpperCase()} → ${G.roomName(s, b.room)}` : b.name.toUpperCase();
  $('bloque').className = late ? 'tarde' : '';
  $('t-alerta').textContent = `${L.ai} · ALERTA`;
  $('m-alerta').style.width = `${s.iaOn ? s.alert : 0}%`; $('m-alerta').parentElement.classList.toggle('alta', s.alert > 70);
  $('m-integ').style.width = `${Math.max(0, s.integ)}%`;
  const rows = [['SALUD', p.salud, 25], ['ENERGÍA', p.energia, 25], ['FUERZA', p.fuerza, -1], ['CONOCIM.', p.conoc, -1]];
  if (L.rooms.some((r) => r.outside)) rows.push(['OXÍGENO', p.o2, 35]);
  $('stats').innerHTML = rows.map(([k, v, low]) => `<span>${k}</span>${bar(v, low)}<span>${Math.floor(v)}</span>`).join('');
  const cap = G.capacity(s); $('cap').textContent = `${p.inv.length}/${cap}`;
  $('inv').innerHTML = Array.from({ length: cap }, (_, i) => (p.inv[i] ? slot(p.inv[i]) : '<div class="slot vacio"></div>')).join('');
  $('plan').innerHTML = G.PLAN_IDS.map((id) => `<li class="${G.has(s, id) ? 'ok' : ''}" title="${L.plan[id].hint}">${L.plan[id].name}</li>`).join('') + `<li class="${s.iaOn ? '' : 'ok'}" title="Opcional: núcleo de la IA con tarjeta y 50 de conocimiento.">(Opcional) Apagar a ${L.ai}</li>`;
  $('crew').innerHTML = s.crew.map((c) => `<li><b style="color:${c.color}">■</b> ${c.name}: ${c.want ? `pide <span title="${ITEMS[c.want].name}">${icon(c.want)} ${ITEMS[c.want].name}</span>` : 'contento'}</li>`).join('');
  const html = s.log.slice(-16).reverse().map((l) => `<li class="${l.kind}">${l.kind === 'day' ? '' : G.clock(l.min) + ' '}${l.text}</li>`).join('');
  if ($('log').dataset.h !== html) { $('log').innerHTML = html; $('log').dataset.h = html; }
  const av = $('aviso');
  if (s.msg) { av.hidden = false; av.textContent = s.msg.text; av.className = s.msg.kind; } else av.hidden = true;
}

// Íconos de piezas en pixel art (SVG chico).
const ICON = {
  cinta: ['#c9c9c9', 'M3 5h10v6H3z M6 7h4v2H6z'], tela: ['#e0c080', 'M2 3h12v10H2z'], tornillos: ['#aab', 'M4 3h3v3H4z M9 7h3v3H9z M5 10h3v3H5z'], placa: ['#9aa4b0', 'M2 5h12v6H2z'],
  cable: ['#ff6b3d', 'M2 8h4v-4h4v8h4'], tubo: ['#c8ccd2', 'M6 1h4v14H6z'], chip: ['#3dd68c', 'M4 4h8v8H4z M2 6h2v1H2z M12 9h2v1h-2z'], bateria: ['#ffd23d', 'M4 3h8v11H4z M6 1h4v2H6z'],
  filtro: ['#555', 'M3 3h10v10H3z'], sellador: ['#5fb6ff', 'M5 2h6v12H5z'], cartucho: ['#e8e8e8', 'M5 3h6v10H5z'],
  destornillador: ['#ffc23d', 'M3 13l7-7 2 2-7 7z M10 3h3v3h-3z'], amarra: ['#ffc23d', 'M3 5h10v2H3z M3 9h10v2H3z'], parche: ['#5ff6ff', 'M3 3h10v10H3z'],
  extintor: ['#ff4b4b', 'M5 4h6v11H5z M7 1h3v3H7z'], mascara: ['#9aa4b0', 'M3 4h10v6l-3 3H6l-3-3z'], aspiradora: ['#ffc23d', 'M3 6h8v7H3z M11 8h3v2h-3z'],
  resina: ['#c96bff', 'M5 2h6v12H5z'], fungicida: ['#7ad35f', 'M5 3h6v11H5z M7 1h2v2H7z'], kit: ['#ff8a3d', 'M2 5h12v8H2z M6 3h4v2H6z'],
  inhibidor: ['#5ff6ff', 'M8 1l-4 8h4l-2 6 6-9H8z'], tarjeta: ['#4dff88', 'M2 4h12v8H2z M4 6h4v1H4z'], llave: ['#ffd23d', 'M2 6h5v4H2z M7 7h7v2H7z M12 9h2v2h-2z'],
  traje_roto: ['#aa8888', 'M5 1h6v5H5z M4 6h8v6H4z M4 12h3v3H4z M9 12h3v3H9z'], traje: ['#e8eef5', 'M5 1h6v5H5z M4 6h8v6H4z M4 12h3v3H4z M9 12h3v3H9z'],
  codigo: ['#5ff6ff', 'M2 3h12v10H2z M4 6h2v1H4z M7 6h2v1H7z M10 6h2v1h-2z M4 9h8v1H4z'], celda: ['#ff8a3d', 'M4 2h8v12H4z M6 5h4v2H6z'],
};
function icon(id) { const [c, d] = ICON[id] ?? ['#fff', 'M4 4h8v8H4z']; return `<svg viewBox="0 0 16 16" width="22" height="22" shape-rendering="crispEdges"><path d="${d}" fill="${c}" stroke="${c}" stroke-width=".5"/></svg>`; }

// ---------- ventanas ----------
function open(html) { $('ventana').innerHTML = html; $('modal').hidden = false; }
function close() { $('modal').hidden = true; menu = null; }

function titleScreen() {
  menu = 'titulo';
  const cards = Object.values(LOCS).map((L) => { const sv = load(L.id); const st = best(L.id); return `<div class="destino">
      <button data-loc="${L.id}"><span class="ico">${L.icon}</span>${L.name.toUpperCase()}<small>${L.tag}</small><small class="ia">IA: ${L.ai}</small><small>${'★'.repeat(st)}${'☆'.repeat(3 - st)}</small></button>
      ${sv && !sv.over ? `<button class="mini" data-cont="${L.id}">▶ Continuar (día ${sv.day})</button>` : ''}</div>`; }).join('');
  open(`<div class="titulo">
    <p style="color:var(--dim)">UN JUEGO DE #LosTiraVida · basado en LIFELINE</p>
    <div class="grande">LIFELINE<b>:RUTINA</b></div>
    <p>Cumple la rutina, esquiva a la IA y prepara en secreto tu regreso a la Tierra.</p>
    <div class="destinos">${cards}</div>
    <div class="fila" style="justify-content:center"><button id="t-ayuda">? CÓMO SE JUEGA</button></div>
  </div>`);
  $('ventana').querySelectorAll('[data-loc]').forEach((b) => (b.onclick = () => { clearSave(b.dataset.loc); s = G.newGame(b.dataset.loc); base = null; close(); intro(); }));
  $('ventana').querySelectorAll('[data-cont]').forEach((b) => (b.onclick = () => { s = load(b.dataset.cont); base = null; close(); }));
  $('t-ayuda').onclick = () => help(titleScreen);
}

function intro() {
  menu = 'intro'; const L = s.L;
  open(`<h2>${L.icon} ${L.name.toUpperCase()} · DÍA 1</h2>${L.intro.map((t) => `<p>${t}</p>`).join('')}
    <p>De día cumple el horario (arriba te dice dónde ir; una flecha te guía). Si faltas o te ven haciendo algo raro, sube la <span style="color:var(--amber)">alerta</span>. A 100: bloqueo y te quitan lo que llevas.</p>
    <p>Tus 3 compañeros te piden piezas: ayúdalos y te devuelven favores. Los problemas se resuelven con protocolos de la NASA.</p>
    <div class="fila"><button id="ok">EMPEZAR ▶</button><button id="ay">? CONTROLES</button></div>`);
  $('ok').onclick = close; $('ay').onclick = () => help(intro);
}

function help(back) {
  menu = 'ayuda';
  open(`<h2>CÓMO SE JUEGA</h2>
    <p><kbd>WASD</kbd>/<kbd>flechas</kbd> moverse · <kbd>E</kbd> usar / hablar · <kbd>C</kbd> fabricar · <kbd>Q</kbd> inhibidor (drones y robots) · <kbd>P</kbd> pausa</p>
    <p><b>Rutina:</b> 06:00 pase de lista · 07:00 desayuno · 08:00 trabajo · 12:00 almuerzo · 13:00 ejercicio · 15:00 libre · 18:00 pase de lista · 19:00 cena · 20:00 libre · 22:00 luces apagadas.</p>
    <p><b>Mejora:</b> la cinta del Gimnasio sube la <b>fuerza</b> (cargas más y mueves cosas pesadas). Las terminales del Laboratorio suben el <b>conocimiento</b> (desbloquean recetas).</p>
    <p><b>Cajones</b> con luz amarilla tienen piezas (se llenan cada mañana). Guarda herramientas en tu <b>escondite</b>: en el pase de lista te revisan si llevas 2 o más.</p>
    <p><b>Vigilancia:</b> el cono amarillo es lo que ve; rojo = te persigue. Los <b>conductos</b> (rejillas) los esquivan: necesitas un destornillador.</p>
    <p><b>Afuera</b> (Luna y Marte) solo se sobrevive con el traje: mira el oxígeno.</p>
    <p><b>Emergencias:</b> los drones se distraen yendo al problema. Es tu momento.</p>
    <div class="fila"><button id="volver">VOLVER</button></div>`);
  $('volver').onclick = () => (back ? back() : close());
}

function craftMenu() {
  menu = 'fabricar';
  const rows = G.recipes(s).map((r) => {
    const ok = G.canCraft(s, r); const it = ITEMS[r.id];
    return `<div class="receta ${ok ? '' : 'no'}"><span>${icon(r.id)}</span><span>${G.itemName(s, r.id)}<small>${r.need.map((n) => `${G.has(s, n) ? '✓' : '✗'} ${ITEMS[n].name}`).join(' · ')}${r.k ? ` · conocimiento ${r.k}` : ''}${it.info ? ' — ' + it.info : ''}</small></span><button data-r="${r.id}" ${ok ? '' : 'disabled'}>HACER</button></div>`;
  }).join('');
  open(`<h2>FABRICAR</h2><p style="color:var(--dim)">Fabricar es sospechoso si la vigilancia te ve.</p><div class="recetas">${rows}</div><div class="fila"><button id="cerrar">CERRAR [C]</button></div>`);
  $('ventana').querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { if (G.craft(s, b.dataset.r)) beep(880, 0.1); craftMenu(); }));
  $('cerrar').onclick = close;
}

function stashMenu() {
  menu = 'escondite';
  const list = (arr, act) => arr.map((it, i) => `<button data-${act}="${i}">${icon(it)} ${G.itemName(s, it)}</button>`).join('') || '<p style="color:var(--dim)">(vacío)</p>';
  open(`<h2>TU ESCONDITE</h2><p>Lo que guardas aquí no te lo quitan en los pases de lista ni en un bloqueo.</p>
    <div class="dos"><div><h3>LLEVAS (${s.p.inv.length}/${G.capacity(s)})</h3><div class="lista-it">${list(s.p.inv, 'poner')}</div></div>
    <div><h3>ESCONDIDO (${s.stash.length}/${G.STASH_MAX})</h3><div class="lista-it">${list(s.stash, 'sacar')}</div></div></div>
    <div class="fila"><button id="cerrar">CERRAR</button></div>`);
  $('ventana').querySelectorAll('[data-poner]').forEach((b) => (b.onclick = () => { G.stashPut(s, +b.dataset.poner); stashMenu(); }));
  $('ventana').querySelectorAll('[data-sacar]').forEach((b) => (b.onclick = () => { G.stashTake(s, +b.dataset.sacar); stashMenu(); }));
  $('cerrar').onclick = () => { s.pending = null; close(); };
}

// Minijuego 1: protocolo NASA, tocar los pasos en orden.
function protocolGame(id) {
  menu = 'protocolo';
  const pr = PROTOCOLS[id]; const order = pr.steps; const shuffled = order.map((x, i) => [x, i]).sort(() => Math.random() - 0.5);
  let next = 0; let time = 16; const total = 16;
  open(`<h2>${pr.title}</h2><p>Toca los pasos <b>en orden</b>. Error = −2 s.</p><div class="tiempo"><i id="pt"></i></div>
    <div class="pasos" id="pasos">${shuffled.map(([x, i]) => `<button data-i="${i}">${x}</button>`).join('')}</div>`);
  const tick = setInterval(() => { time -= 0.1; const el = $('pt'); if (el) el.style.width = `${Math.max(0, time / total * 100)}%`; if (time <= 0) done(false); }, 100);
  function done(ok) { clearInterval(tick); beep(ok ? 990 : 140, 0.25, ok ? 'square' : 'sawtooth'); G.resolveProtocol(s, ok); close(); }
  $('pasos').querySelectorAll('button').forEach((b) => (b.onclick = () => {
    if (+b.dataset.i === next) { b.classList.add('hecho'); b.disabled = true; b.textContent = `${next + 1}. ${b.textContent}`; next++; beep(520 + next * 60, 0.06); if (next === order.length) done(true); }
    else { time -= 2; beep(160, 0.12, 'sawtooth'); shake(); }
  }));
}
function shake() { const v = $('ventana'); v.classList.remove('sacudir'); void v.offsetWidth; v.classList.add('sacudir'); }

// Minijuego 2: hackeo, memorizar una secuencia y repetirla.
function codeGame() {
  menu = 'codigo';
  const len = 4 + s.frags.filter(Boolean).length; const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 9));
  let pos = 0; let showing = true;
  open(`<h2>HACKEO · registro de ${s.L.ai}</h2><p id="cg-msg">Memoriza la secuencia…</p>
    <div class="teclado" id="teclado">${Array.from({ length: 9 }, (_, i) => `<button data-k="${i}" disabled>${'▲●■◆★✚♦▼◉'[i]}</button>`).join('')}</div>`);
  const btns = [...$('teclado').querySelectorAll('button')];
  seq.forEach((k, i) => { setTimeout(() => { btns[k].classList.add('lit'); beep(300 + k * 60, 0.15); }, 600 + i * 650); setTimeout(() => btns[k].classList.remove('lit'), 1000 + i * 650); });
  setTimeout(() => { showing = false; btns.forEach((b) => (b.disabled = false)); $('cg-msg').textContent = 'Ahora repítela.'; }, 700 + len * 650);
  btns.forEach((b) => (b.onclick = () => {
    if (showing) return; const k = +b.dataset.k;
    b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 150);
    if (k === seq[pos]) { pos++; beep(300 + k * 60, 0.08); if (pos === len) { beep(990, 0.2); G.resolveCodigo(s, true); close(); } }
    else { beep(140, 0.3, 'sawtooth'); shake(); setTimeout(() => { G.resolveCodigo(s, false); close(); }, 300); showing = true; }
  }));
}

// Minijuego 3: cables, unir cada color con su par.
function cablesGame() {
  menu = 'cables';
  const colors = ['#ff4b4b', '#4dff88', '#5fb6ff', '#ffd23d']; const right = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  let sel = null; let done = 0; let errors = 0; let time = 14;
  open(`<h2>CABLES · ${s.pending.h.def.name}</h2><p>Une cada cable con su color (toca uno a la izquierda y luego su par). 2 errores = falla.</p><div class="tiempo"><i id="ct"></i></div>
    <div class="cables"><div>${colors.map((c, i) => `<button data-l="${i}" style="background:${c}"></button>`).join('')}</div><div>${right.map((i) => `<button data-r="${i}" style="background:${colors[i]}"></button>`).join('')}</div></div>`);
  const tick = setInterval(() => { time -= 0.1; const el = $('ct'); if (el) el.style.width = `${Math.max(0, time / 14 * 100)}%`; if (time <= 0) finish(false); }, 100);
  function finish(ok) { clearInterval(tick); beep(ok ? 990 : 140, 0.25, ok ? 'square' : 'sawtooth'); G.resolveProtocol(s, ok); close(); }
  $('ventana').querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => { $('ventana').querySelectorAll('[data-l]').forEach((x) => x.classList.remove('sel')); sel = +b.dataset.l; b.classList.add('sel'); beep(400, 0.05); }));
  $('ventana').querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => {
    if (sel === null || b.disabled) return;
    if (+b.dataset.r === sel) { b.disabled = true; b.textContent = '✓'; const l = $('ventana').querySelector(`[data-l="${sel}"]`); l.disabled = true; l.textContent = '✓'; sel = null; done++; beep(700 + done * 80, 0.08); if (done === 4) finish(true); }
    else { errors++; beep(160, 0.12, 'sawtooth'); shake(); if (errors >= 2) finish(false); }
  }));
}

function endScreen() {
  menu = 'fin'; clearSave(s.loc);
  const o = s.over; if (o.won) setBest(s.loc, o.stars);
  open(`<div class="titulo"><h2>${o.won ? '¡VOLVISTE A CASA!' : 'MISIÓN PERDIDA'}</h2>
    ${o.won ? `<div class="estrellas">${'★'.repeat(o.stars)}${'☆'.repeat(3 - o.stars)}</div>` : ''}
    <p style="font-size:1.4rem;color:var(--amber)">${o.title}</p><p>${o.text}</p>
    <p style="color:var(--dim)">Problemas resueltos: ${s.stats.solved} · favores: ${s.stats.favors} · veces atrapado: ${s.stats.caught} · alerta final: ${Math.round(s.alert)} · integridad: ${Math.max(0, Math.round(s.integ))}</p>
    <div class="fila" style="justify-content:center"><button id="otra">JUGAR OTRA VEZ</button><button id="menu">MENÚ</button></div></div>`);
  $('otra').onclick = () => { s = G.newGame(s.loc); base = null; close(); intro(); };
  $('menu').onclick = titleScreen;
}

// ---------- controles ----------
function act(k) {
  if (!s || s.over) return;
  if (menu === 'fabricar' && k === 'c') return close();
  if (menu) return;
  if (k === 'e') {
    G.interact(s);
    const pd = s.pending?.kind;
    if (pd === 'escondite') stashMenu(); else if (pd === 'protocolo') protocolGame(s.pending.id); else if (pd === 'codigo') codeGame(); else if (pd === 'cables') cablesGame();
  } else if (k === 'q') G.useQ(s);
  else if (k === 'c') craftMenu();
  else if (k === 'p') { open('<h2>PAUSA</h2><div class="fila"><button id="seguir">SEGUIR</button><button id="ay">AYUDA</button><button id="salir">MENÚ (se guarda)</button></div>'); menu = 'pausa'; $('seguir').onclick = close; $('ay').onclick = () => help(() => { close(); act('p'); }); $('salir').onclick = () => { save(); titleScreen(); }; }
}
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (e.repeat) return;
  keys.add(k);
  if (k === 'escape' && menu && !['titulo', 'fin', 'protocolo', 'intro', 'codigo', 'cables'].includes(menu)) { if (menu === 'escondite') s.pending = null; close(); return; }
  if (['e', 'q', 'c', 'p'].includes(k)) act(k);
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
$('btn-fabricar').onclick = () => act('c'); $('btn-usar').onclick = () => act('q'); $('btn-ayuda').onclick = () => { if (!menu) help(null); };
if (matchMedia('(pointer: coarse)').matches) $('tactil').hidden = false;
const dirs = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
document.querySelectorAll('.cruz button').forEach((b) => {
  const on = (e) => { e.preventDefault(); [touch.dx, touch.dy] = dirs[b.dataset.d]; };
  const off = (e) => { e.preventDefault(); touch.dx = 0; touch.dy = 0; };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
});
$('t-e').onclick = () => act('e'); $('t-q').onclick = () => act('q'); $('t-c').onclick = () => act('c');

function input() {
  let dx = touch.dx, dy = touch.dy;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1; if (keys.has('d') || keys.has('arrowright')) dx += 1;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1; if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  return { dx, dy };
}

// ---------- bucle ----------
let lastMsg = null; let stepT = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (s) {
    const inp = input();
    if (!menu) G.update(s, dt, inp);
    if (s.msg && s.msg !== lastMsg) { lastMsg = s.msg; beep(s.msg.kind === 'bad' ? 200 : s.msg.kind === 'ok' ? 880 : 520, 0.15, s.msg.kind === 'bad' ? 'sawtooth' : 'square'); }
    if (!menu && (inp.dx || inp.dy) && (stepT -= dt) <= 0) { stepT = 0.28; beep(G.isOutside(s) ? 70 : 110, 0.03, 'triangle', 0.02); }
    if (!menu && (s.final || s.hazards.some((h) => h.def.type === 'front' && h.phase === 'aviso')) && Math.floor(t / 500) !== Math.floor((t - dt * 1000) / 500)) beep(660, 0.12, 'sawtooth', 0.025);
    draw(t);
    hudT -= dt; if (hudT <= 0) { hud(); hudT = 0.12; }
    saveT -= dt; if (saveT <= 0) { save(); saveT = 10; }
    if (s.over && menu !== 'fin') { hud(); endScreen(); }
  }
  requestAnimationFrame(frame);
}
addEventListener('beforeunload', save);
document.fonts?.load('16px VT323').finally(() => { titleScreen(); requestAnimationFrame(frame); });
window.lfr = { get s() { return s; }, G }; // para depurar y para los bots de prueba
