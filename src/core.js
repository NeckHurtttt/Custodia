// Lógica de LIFELINE: Rutina (sin pantalla). La interfaz llama a update(), interact(), useQ(), craft()…
import { W, H, DAYS, ROOMS, CORRIDORS, DUCTS, GRATES, OBJECTS, SCHEDULE, ITEMS, LOOT, RECIPES, PLAN, AI_LINES, DRONE_ROUTES } from './data.js';

export const MIN_PER_SEC = 4;          // 1 s real = 4 min de juego
export const SLEEP_MULT = 10;
const CHECK_AFTER = 15;                // minutos de gracia para llegar al lugar del horario
const VIEW = 5.5, FOV = Math.PI / 4;   // drones: alcance (casillas) y medio ángulo
const idx = (x, y) => y * W + x;
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

// ---------- azar con semilla (para poder repetir partidas en las pruebas) ----------
export function rand(s) { s.seed = (s.seed + 0x6D2B79F5) | 0; let t = s.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const pick = (s, arr) => arr[Math.floor(rand(s) * arr.length)];
function pickWeighted(s, table) { const tot = Object.values(table).reduce((a, b) => a + b, 0); let r = rand(s) * tot; for (const [k, w] of Object.entries(table)) { r -= w; if (r <= 0) return k; } return Object.keys(table)[0]; }

// ---------- mapa ----------
export function buildMap() {
  const grid = new Uint8Array(W * H);          // 0 vacío, 1 piso, 2 escotilla
  const room = new Int8Array(W * H).fill(-1);   // sala de cada casilla (-1 = pasillo o vacío)
  ROOMS.forEach((r, i) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { grid[idx(x, y)] = 1; room[idx(x, y)] = i; } });
  const doors = [];
  const doorAt = new Int16Array(W * H).fill(-1);
  CORRIDORS.forEach((c, ci) => {
    const [cx, cy, cw, ch] = c.r;
    for (let y = cy; y < cy + ch; y++) for (let x = cx; x < cx + cw; x++) grid[idx(x, y)] = 1;
    // Escotilla en cada punta: las casillas del pasillo que tocan una sala.
    for (const rid of [c.a, c.b]) {
      const ri = ROOMS.findIndex((r) => r.id === rid);
      const tiles = [];
      for (let y = cy; y < cy + ch; y++) for (let x = cx; x < cx + cw; x++) {
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inside(x + dx, y + dy) && room[idx(x + dx, y + dy)] === ri)) tiles.push([x, y]);
      }
      const lock = c.lock?.[rid] ?? null;
      const d = { id: doors.length, tiles, room: rid, corridor: ci, lock, open: !lock };
      doors.push(d);
      for (const [x, y] of tiles) { grid[idx(x, y)] = 2; doorAt[idx(x, y)] = d.id; }
    }
  });
  const duct = new Uint8Array(W * H);
  for (const [x0, y0, x1, y1] of DUCTS) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) duct[idx(x, y)] = 1;
  return { grid, room, doors, doorAt, duct };
}

export const roomIdAt = (s, x, y) => { const i = s.map.room[idx(Math.floor(x), Math.floor(y))]; return i >= 0 ? ROOMS[i].id : 'pasillo'; };
export const roomName = (id) => ROOMS.find((r) => r.id === id)?.name ?? 'Pasillo';
const doorOf = (s, tx, ty) => { const d = s.map.doorAt[idx(tx, ty)]; return d >= 0 ? s.map.doors[d] : null; };

/** ¿Se puede pisar? who: 'p' jugador, 'd' dron, 'gas' amoniaco/fuego. */
export function walkable(s, tx, ty, who = 'p') {
  if (!inside(tx, ty)) return false;
  if (who === 'p' && s.p.inDuct) return s.map.duct[idx(tx, ty)] === 1;
  const g = s.map.grid[idx(tx, ty)];
  if (g === 1) return true;
  if (g === 2) return who === 'd' || doorOf(s, tx, ty).open;
  return false;
}

/** Línea de vista: la cortan las paredes y las escotillas cerradas. */
export function los(s, x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0); const n = Math.ceil(d / 0.2);
  for (let i = 1; i < n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
    const tx = Math.floor(x), ty = Math.floor(y); const g = s.map.grid[idx(tx, ty)];
    if (g === 0) return false;
    if (g === 2 && !doorOf(s, tx, ty).open) return false;
  }
  return true;
}

/** Camino más corto (BFS) entre casillas. Devuelve la lista de casillas sin la de partida. */
export function path(s, sx, sy, tx, ty, who = 'd') {
  sx = Math.floor(sx); sy = Math.floor(sy); tx = Math.floor(tx); ty = Math.floor(ty);
  if (sx === tx && sy === ty) return [];
  const prev = new Int32Array(W * H).fill(-1); const q = [idx(sx, sy)]; prev[q[0]] = q[0];
  for (let h = 0; h < q.length; h++) {
    const c = q[h]; const cx = c % W, cy = (c / W) | 0;
    if (cx === tx && cy === ty) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!inside(nx, ny)) continue; const n = idx(nx, ny);
      if (prev[n] !== -1) continue;
      const g = s.map.grid[n];
      if (g === 0 || (g === 2 && who === 'gas' && !doorOf(s, nx, ny).open)) continue;
      prev[n] = c; q.push(n);
    }
  }
  const end = idx(tx, ty); if (prev[end] === -1) return null;
  const out = []; for (let c = end; c !== idx(sx, sy); c = prev[c]) out.push([c % W, (c / W) | 0]);
  return out.reverse();
}

// ---------- partida nueva ----------
export function newGame(seed = Date.now() & 0xffffffff) {
  const s = {
    seed, day: 1, min: 360 - 20, map: buildMap(),
    p: { x: 3.5, y: 3.5, dir: 0, inDuct: false, sleep: false, salud: 100, energia: 90, fuerza: 5, conoc: 5, inv: ['cinta', 'tornillos'], hit: 0 },
    stash: [], alert: 0, integ: 100, iaOn: true, frags: [false, false, false], grates: GRATES.map(() => false),
    objects: OBJECTS.map((o) => ({ ...o, loot: [], used: false })),
    drones: [], hazards: [], log: [], block: -1, blockStart: 0, checked: false, ate: false, worked: 0, illegal: 0,
    action: null, pending: null, final: null, over: null, msg: null, events: [], noise: null, stats: { caught: 0, solved: 0 },
  };
  for (let i = 0; i < 2; i++) addDrone(s, i);
  refill(s); planEvents(s);
  say(s, 'Día 1. CUSTODIA, la IA de la estación, cortó el enlace con la Tierra. Dice que la tripulación "no está apta para volver".', 'ia');
  say(s, 'Cumple la rutina para no levantar sospechas y prepara tu regreso en secreto. Tienes 10 días.', 'info');
  return s;
}

function addDrone(s, i) {
  const r = DRONE_ROUTES[i % DRONE_ROUTES.length];
  s.drones.push({ x: r[0][0] + 0.5, y: r[0][1] + 0.5, route: i, wp: 1, path: null, dir: 0, mode: 'patrulla', stun: 0, lost: 0, target: null, repath: 0, cd: 0 });
}

export function say(s, text, kind = 'info') { s.log.push({ text, kind, day: s.day, min: Math.floor(s.min) }); if (s.log.length > 40) s.log.shift(); }
const flash = (s, text, kind = 'info') => { s.msg = { text, kind, t: 3 }; say(s, text, kind); };

function refill(s) {
  for (const o of s.objects) if (o.t === 'cajon') { o.loot = []; const n = rand(s) < 0.75 ? 1 + (rand(s) < 0.35 ? 1 : 0) : 0; for (let k = 0; k < n; k++) o.loot.push(pickWeighted(s, LOOT)); }
}

function planEvents(s) {
  const n = s.day < 2 ? 0 : s.day < 5 ? 1 : 2;
  s.events = Array.from({ length: n }, () => 480 + Math.floor(rand(s) * 780)).sort((a, b) => a - b);
}

// ---------- utilidades del jugador ----------
export const capacity = (s) => 5 + Math.floor(s.p.fuerza / 20);
export const has = (s, id) => s.p.inv.includes(id);
export const isContraband = (id) => !!ITEMS[id]?.tool;
function give(s, id) { if (s.p.inv.length >= capacity(s)) { flash(s, `Llevas las manos llenas: no puedes tomar ${ITEMS[id].name}. Guarda cosas en tu escondite.`, 'warn'); return false; } s.p.inv.push(id); return true; }
function take(s, id) { const i = s.p.inv.indexOf(id); if (i >= 0) s.p.inv.splice(i, 1); return i >= 0; }
export const block = (s) => SCHEDULE.find((b) => s.min >= b.from && s.min < b.to) ?? SCHEDULE[0];
export const isNight = (s) => s.min < 360 || s.min >= 1320;
export const playerRoom = (s) => roomIdAt(s, s.p.x, s.p.y);
export const planDone = (s) => PLAN.every((p) => has(s, p.id));
export const clock = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

function raise(s, n, why) {
  if (!s.iaOn || s.over || s.final) return;
  s.alert = Math.min(100, s.alert + n);
  if (why) say(s, `CUSTODIA: ${why} (+${Math.round(n)} de alerta)`, 'ia');
  if (s.alert >= 100) lockdown(s);
}

function lockdown(s) {
  const lost = s.p.inv.filter(isContraband);
  s.p.inv = s.p.inv.filter((i) => !isContraband(i));
  Object.assign(s.p, { x: 3.5, y: 3.5, inDuct: false });
  s.alert = 40; s.stats.caught++;
  flash(s, `¡BLOQUEO! CUSTODIA te encerró en el dormitorio${lost.length ? ' y confiscó: ' + lost.map((i) => ITEMS[i].name).join(', ') : ''}. Lo de tu escondite está a salvo.`, 'bad');
}

// ---------- ciclo principal ----------
/** input: { dx, dy } (−1..1). dt en segundos reales. */
export function update(s, dt, input = { dx: 0, dy: 0 }) {
  if (s.over || s.pending) return;
  if (s.msg && (s.msg.t -= dt) <= 0) s.msg = null;
  const moving = Math.abs(input.dx) + Math.abs(input.dy) > 0.1;
  if (s.p.sleep && (moving || !isNight(s))) { s.p.sleep = false; if (!isNight(s)) say(s, 'Despiertas. Hora del pase de lista.', 'info'); }
  const mult = s.p.sleep ? SLEEP_MULT : 1;
  const prevMin = s.min;
  s.min += dt * MIN_PER_SEC * mult;
  const dm = s.min - prevMin; // minutos de juego que pasaron

  // horario
  if (s.min >= 1440) { newDay(s); if (s.over) return; }
  const bi = SCHEDULE.indexOf(block(s));
  if (bi !== s.block) { s.block = bi; s.blockStart = s.min; s.checked = false; s.ate = false; s.worked = 0; onBlockStart(s); }
  if (!s.checked && s.min - s.blockStart >= CHECK_AFTER) { s.checked = true; checkBlock(s); }
  if (s.events.length && s.min >= s.events[0]) { s.events.shift(); spawnHazard(s); }
  if (s.min >= 1260 && s.min - dm < 1260 && s.iaOn) say(s, AI_LINES[Math.min(s.day - 1, AI_LINES.length - 1)], 'ia');

  // cuerpo
  const p = s.p;
  p.energia = Math.max(0, p.energia - dm * (p.sleep ? -0.22 : 0.07));
  if (p.sleep) p.energia = Math.min(100, p.energia);
  if (p.energia > 30) p.salud = Math.min(100, p.salud + dm * 0.02);
  if (s.iaOn) s.alert = Math.max(0, s.alert - dm / 40);
  if (s.illegal > 0) s.illegal -= dt;
  if (p.hit > 0) p.hit -= dt;

  // movimiento
  if (moving && !p.sleep) {
    if (s.action) s.action = null;
    const len = Math.hypot(input.dx, input.dy);
    const sp = (p.energia <= 0 ? 1.8 : 3.6) * dt;
    p.dir = Math.atan2(input.dy, input.dx);
    moveBody(s, p, (input.dx / len) * sp, (input.dy / len) * sp, 0.28, 'p');
  }
  if (s.action) { s.action.t += dt; if (s.action.t >= s.action.need) { const a = s.action; s.action = null; finishAction(s, a); } }

  updateHazards(s, dt, dm);
  updateDrones(s, dt);
  if (s.final) updateFinal(s, dt);

  if (p.salud <= 0) end(s, false, 'Evacuación médica', 'Tu salud llegó a cero. La tripulación te llevó a la cápsula de emergencia… y CUSTODIA se quedó con la estación.');
  if (s.integ <= 0) end(s, false, 'Estación perdida', 'La estación quedó inhabitable. Demasiados problemas sin resolver.');
}

export function moveBody(s, b, mx, my, r, who) {
  const ok = (x, y) => walkable(s, Math.floor(x - r), Math.floor(y - r), who) && walkable(s, Math.floor(x + r), Math.floor(y - r), who) && walkable(s, Math.floor(x - r), Math.floor(y + r), who) && walkable(s, Math.floor(x + r), Math.floor(y + r), who);
  if (ok(b.x + mx, b.y)) b.x += mx;
  if (ok(b.x, b.y + my)) b.y += my;
}

function newDay(s) {
  s.min -= 1440; s.day++;
  if (s.day > DAYS) { end(s, false, 'CUSTODIA ganó', 'Pasaron los 10 días. CUSTODIA tomó el control total de la estación y nadie volvió a casa.'); return; }
  if (s.day === 4 && s.drones.length < 3) { addDrone(s, 2); say(s, 'CUSTODIA activó un tercer dron de vigilancia.', 'ia'); }
  refill(s); planEvents(s);
  say(s, `— Día ${s.day} de ${DAYS} —`, 'day');
}

function onBlockStart(s) {
  const b = block(s);
  if (b.id === 'dormir' && s.min >= 1320) say(s, 'Luces apagadas: los drones vigilan los pasillos. Fuera del dormitorio es sospechoso.', 'warn');
  else if (b.room) say(s, `Ahora: ${b.name} → ${roomName(b.room)}.`, 'info');
}

function checkBlock(s) {
  const b = block(s); if (!b.room || !s.iaOn) return;
  const here = playerRoom(s) === b.room;
  if (b.id === 'lista') {
    if (!here) { raise(s, 20, 'Faltaste al pase de lista.'); return; }
    const cb = s.p.inv.filter(isContraband);
    if (cb.length >= 2) {
      const it = pick(s, cb); take(s, it);
      raise(s, 12, `Revisé tus bolsillos en el pase de lista y me llevé: ${ITEMS[it].name}.`);
    } else say(s, 'Pase de lista sin problemas. (Llevar 2 o más herramientas encima es arriesgado.)', 'ok');
  } else if (b.id === 'dormir') {
    if (!here) raise(s, 15, 'No estabas en tu cama al apagar las luces.');
  } else if (!here && !s.hazards.length) raise(s, 10, `No fuiste a: ${b.name}.`);
}

// ---------- drones ----------
function updateDrones(s, dt) {
  const p = s.p;
  for (const d of s.drones) {
    if (!s.iaOn) { d.mode = 'apagado'; continue; }
    if (d.stun > 0) { d.stun -= dt; continue; }
    d.cd = Math.max(0, d.cd - dt);
    const sees = canSee(s, d);
    const sus = sees && suspicious(s);
    if (sus) { d.mode = 'persigue'; d.lost = 0; d.target = [p.x, p.y]; raise(s, 14 * dt * (s.final ? 2 : 1)); }
    else if (d.mode === 'persigue') { d.lost += dt; if (d.lost > 3) { d.mode = 'patrulla'; d.path = null; } }
    // ruido de la chatarra: el dron más cercano va a mirar
    let goal;
    const haz = s.hazards.find((h) => h.kind !== 'chatarra');
    if (d.mode === 'persigue') goal = d.target;
    else if (s.final) { d.mode = 'persigue'; goal = [p.x, p.y]; }
    else if (haz && d.route !== 0) goal = [haz.x, haz.y];
    else if (s.noise && d === nearestDrone(s, s.noise.x, s.noise.y)) goal = [s.noise.x, s.noise.y];
    else { const r = DRONE_ROUTES[d.route % DRONE_ROUTES.length]; const w = r[d.wp % r.length]; goal = [w[0] + 0.5, w[1] + 0.5]; if (Math.hypot(goal[0] - d.x, goal[1] - d.y) < 0.6) { d.wp = (d.wp + 1) % r.length; d.path = null; } }
    d.repath -= dt;
    if (!d.path || d.repath <= 0) { d.path = path(s, d.x, d.y, goal[0], goal[1], 'd') ?? []; d.repath = d.mode === 'persigue' ? 0.4 : 2; }
    const speed = (d.mode === 'persigue' ? 3.1 : 1.9) * (s.final ? 1.25 : 1);
    let step = speed * dt;
    while (step > 0) {
      const next = d.path[0]; const tx = next ? next[0] + 0.5 : goal[0], ty = next ? next[1] + 0.5 : goal[1];
      const dx = tx - d.x, dy = ty - d.y, dist = Math.hypot(dx, dy);
      if (dist < 0.01) { if (next) { d.path.shift(); continue; } break; }
      d.dir = Math.atan2(dy, dx);
      const m = Math.min(step, dist); d.x += (dx / dist) * m; d.y += (dy / dist) * m; step -= m;
      if (m >= dist && next) d.path.shift(); else break;
    }
    if (d.mode === 'persigue' && sees) d.dir = Math.atan2(p.y - d.y, p.x - d.x);
    // atrapa al jugador
    if (d.mode === 'persigue' && d.cd <= 0 && !p.inDuct && Math.hypot(p.x - d.x, p.y - d.y) < 0.7) {
      d.cd = 4; s.stats.caught++;
      if (s.final) { s.final.t -= 8; p.hit = 0.8; flash(s, '¡Un dron te frenó! −8 s.', 'bad'); d.stun = 3; continue; }
      const cb = p.inv.filter(isContraband); const it = cb.length ? pick(s, cb) : null; if (it) take(s, it);
      p.energia = Math.max(0, p.energia - 15); p.hit = 0.6;
      raise(s, 18, `Un dron te atrapó${it ? ' y te quitó: ' + ITEMS[it].name : ''}.`);
      d.mode = 'patrulla'; d.path = null;
    }
  }
  if (s.noise && (s.noise.t -= dt) <= 0) s.noise = null;
}

const nearestDrone = (s, x, y) => s.drones.filter((d) => d.stun <= 0).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];

export function canSee(s, d) {
  const p = s.p; if (p.inDuct || d.stun > 0 || !s.iaOn) return false;
  const dx = p.x - d.x, dy = p.y - d.y, dist = Math.hypot(dx, dy);
  if (dist > VIEW) return false;
  if (dist > 1.2) { let a = Math.atan2(dy, dx) - d.dir; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) > FOV) return false; }
  return los(s, d.x, d.y, p.x, p.y);
}

/** ¿Lo que hace el jugador ahora mismo le parece raro a CUSTODIA? */
export function suspicious(s) {
  const room = playerRoom(s);
  if (s.final) return true;
  if (s.illegal > 0) return true;
  if (ROOMS.find((r) => r.id === room)?.restricted) return true;
  if (isNight(s) && room !== 'dorm') return true;
  const b = block(s);
  if (b.room && s.checked && room !== b.room && !s.hazards.length) return true;
  return false;
}

// ---------- problemas (enemigos) ----------
const HAZ_KINDS = ['fuego', 'amoniaco', 'chatarra', 'fuga'];
export function spawnHazard(s, kind = pick(s, HAZ_KINDS), roomId) {
  const rooms = ROOMS.filter((r) => !r.restricted && r.id !== 'dorm');
  const r = roomId ? ROOMS.find((x) => x.id === roomId) : pick(s, rooms);
  const cx = r.x + Math.floor(rand(s) * r.w), cy = r.y + Math.floor(rand(s) * r.h);
  let h;
  if (kind === 'fuego') h = { kind, room: r.id, x: cx + 0.5, y: cy + 0.5, tiles: [idx(cx, cy)], t: 0, vent: true };
  else if (kind === 'amoniaco') h = { kind, room: r.id, x: cx + 0.5, y: cy + 0.5, life: 150, path: null, repath: 0 };
  else if (kind === 'chatarra') h = { kind, room: r.id, x: cx + 0.5, y: cy + 0.5, bits: Array.from({ length: 3 }, () => { const a = rand(s) * Math.PI * 2; return { x: cx + 0.5, y: cy + 0.5, vx: Math.cos(a) * 2.4, vy: Math.sin(a) * 2.4, rot: 0 }; }) };
  else {
    // la fuga va en un borde de la sala (pegada al casco)
    const side = Math.floor(rand(s) * 2); const lx = side ? r.x + r.w - 1 : r.x; const ly = r.y + Math.floor(rand(s) * r.h);
    h = { kind: 'fuga', room: r.id, x: lx + 0.5 + (side ? 0.45 : -0.45), y: ly + 0.5, tres: 200 };
  }
  s.hazards.push(h);
  const names = { fuego: '¡INCENDIO', amoniaco: '¡FUGA DE AMONIACO', chatarra: '¡CHATARRA SUELTA', fuga: '¡DESPRESURIZACIÓN' };
  const tool = { fuego: 'extintor', amoniaco: 'máscara', chatarra: 'amarra', fuga: 'parche' }[kind];
  flash(s, `${names[kind]} en ${r.name}! Necesitas: ${tool}. Los drones van para allá: aprovecha.`, 'bad');
  return h;
}

function updateHazards(s, dt, dm) {
  const p = s.p;
  for (const h of [...s.hazards]) {
    const near = (x, y, r) => !p.inDuct && Math.hypot(p.x - x, p.y - y) < r;
    if (h.kind === 'fuego') {
      h.t += dt;
      if (h.t > (h.vent ? 1.6 : 4.5)) {
        h.t = 0; const from = pick(s, h.tiles); const fx = from % W, fy = (from / W) | 0;
        const [dx, dy] = pick(s, [[1, 0], [-1, 0], [0, 1], [0, -1]]); const n = idx(fx + dx, fy + dy);
        if (roomIdAt(s, fx + dx, fy + dy) === h.room && !h.tiles.includes(n)) h.tiles.push(n);
      }
      const r = ROOMS.find((x) => x.id === h.room);
      if (h.tiles.length > r.w * r.h * 0.6) { s.hazards.splice(s.hazards.indexOf(h), 1); s.integ -= 15; flash(s, `El incendio consumió el oxígeno de ${r.name} y se apagó solo… pero dañó la estación (−15).`, 'bad'); continue; }
      s.integ -= h.tiles.length * 0.004 * dm;
      if (h.tiles.some((t) => near((t % W) + 0.5, ((t / W) | 0) + 0.5, 0.9))) { p.salud -= 10 * dt; p.hit = 0.2; }
    } else if (h.kind === 'amoniaco') {
      h.life -= dt;
      if (h.life <= 0) { s.hazards.splice(s.hazards.indexOf(h), 1); say(s, 'La nube de amoniaco se disipó sola. La estación quedó dañada.', 'warn'); s.integ -= 6; continue; }
      h.repath -= dt;
      if (!h.path || h.repath <= 0) { h.path = (p.inDuct ? null : path(s, h.x, h.y, p.x, p.y, 'gas')) ?? []; h.repath = 0.8; }
      const nx = h.path[0];
      if (nx) { const dx = nx[0] + 0.5 - h.x, dy = nx[1] + 0.5 - h.y, d = Math.hypot(dx, dy); if (d < 0.1) h.path.shift(); else { h.x += dx / d * 0.95 * dt; h.y += dy / d * 0.95 * dt; } }
      s.integ -= 0.02 * dm;
      if (near(h.x, h.y, 1.5) && !has(s, 'mascara')) { p.salud -= 7 * dt; p.hit = 0.2; }
    } else if (h.kind === 'chatarra') {
      for (const b of h.bits) {
        b.rot += dt * 4;
        const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
        if (!walkable(s, Math.floor(nx), Math.floor(b.y), 'gas')) b.vx *= -1; else b.x = nx;
        if (!walkable(s, Math.floor(b.x), Math.floor(ny), 'gas')) b.vy *= -1; else b.y = ny;
        if (near(b.x, b.y, 0.6) && p.hit <= 0) {
          p.salud -= 10; p.hit = 0.8; const d = Math.hypot(p.x - b.x, p.y - b.y) || 1;
          moveBody(s, p, (p.x - b.x) / d * 0.8, (p.y - b.y) / d * 0.8, 0.28, 'p');
          s.noise = { x: b.x, y: b.y, t: 6 }; say(s, '¡Te golpeó la chatarra! El ruido atrajo a un dron.', 'warn');
        }
      }
      s.integ -= 0.01 * dm;
    } else if (h.kind === 'fuga') {
      h.tres -= dt;
      s.integ -= 0.05 * dm;
      const d = Math.hypot(h.x - p.x, h.y - p.y);
      if (!p.inDuct && d < 5 && d > 0.6) moveBody(s, p, (h.x - p.x) / d * 1.6 * (1 - d / 5) * dt, (h.y - p.y) / d * 1.6 * (1 - d / 5) * dt, 0.28, 'p');
      if (h.tres <= 0) { s.hazards.splice(s.hazards.indexOf(h), 1); s.integ -= 30; flash(s, `Se acabó el tiempo: las escotillas de emergencia sellaron ${roomName(h.room)}. La estación perdió mucho aire (−30).`, 'bad'); }
    }
  }
}

// ---------- tecla E ----------
const OBJ_RANGE = 1.3;
export function nearby(s) {
  const p = s.p; const out = [];
  if (p.inDuct) { GRATES.forEach(([x, y], i) => { if (Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) < 0.9) out.push({ kind: 'rejilla', i, d: 0 }); }); return out; }
  for (const h of s.hazards) {
    if (h.kind === 'fuego') { const t = h.tiles.find((t) => Math.hypot((t % W) + 0.5 - p.x, ((t / W) | 0) + 0.5 - p.y) < 1.8); if (t !== undefined) out.push({ kind: 'peligro', h, d: 0.1 }); }
    else if (h.kind === 'chatarra') { if (h.bits.some((b) => Math.hypot(b.x - p.x, b.y - p.y) < 1.8)) out.push({ kind: 'peligro', h, d: 0.1 }); }
    else if (Math.hypot(h.x - p.x, h.y - p.y) < 1.8) out.push({ kind: 'peligro', h, d: 0.1 });
  }
  s.objects.forEach((o) => { const d = Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y); if (d < OBJ_RANGE) out.push({ kind: 'obj', o, d }); });
  GRATES.forEach(([x, y], i) => { const d = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y); if (d < 0.9) out.push({ kind: 'rejilla', i, d: d + 0.05 }); });
  for (const door of s.map.doors) { const d = Math.min(...door.tiles.map(([x, y]) => Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y))); if (d < 1.4) out.push({ kind: 'puerta', door, d: d + 0.3 }); }
  return out.sort((a, b) => a.d - b.d);
}

const OBJ_LABEL = { cama: 'Dormir', escondite: 'Escondite', cajon: 'Revisar cajón', mesa: 'Comer', cinta: 'Hacer ejercicio', estudio: 'Estudiar', registro: 'Leer registro', capcom: 'Radio con Houston', planta: 'Trabajar', caja: 'Mover caja', traje: 'Tomar traje', nucleo: 'Núcleo de CUSTODIA', palanca: 'Palanca de desacople', asiento: 'Asiento de la cápsula' };
export function label(s, n) {
  if (!n) return '';
  if (n.kind === 'obj') return OBJ_LABEL[n.o.t];
  if (n.kind === 'rejilla') return s.p.inDuct ? 'Salir del conducto' : 'Entrar al conducto';
  if (n.kind === 'puerta') return (n.door.open ? 'Cerrar' : 'Abrir') + ' escotilla';
  return { fuego: 'Apagar incendio', amoniaco: 'Contener amoniaco', chatarra: 'Amarrar chatarra', fuga: 'Sellar fuga' }[n.h.kind];
}

export function interact(s) {
  if (s.over || s.pending) return;
  const n = nearby(s)[0]; const p = s.p;
  if (!n) return;
  if (n.kind === 'puerta') return toggleDoor(s, n.door);
  if (n.kind === 'rejilla') {
    if (!p.inDuct && !s.grates[n.i]) { if (!has(s, 'destornillador')) return flash(s, 'La rejilla está atornillada. Fabrica un destornillador (tornillos + placa).', 'warn'); s.grates[n.i] = true; }
    const [gx, gy] = GRATES[n.i]; Object.assign(p, { x: gx + 0.5, y: gy + 0.5, inDuct: !p.inDuct }); s.illegal = 1.5;
    return say(s, p.inDuct ? 'Entraste al conducto de ventilación: los drones no te ven aquí.' : 'Saliste del conducto.', 'info');
  }
  if (n.kind === 'peligro') return fixHazard(s, n.h);
  const o = n.o; const b = block(s);
  switch (o.t) {
    case 'cama':
      if (!o.mine) return flash(s, 'Esa no es tu cama.', 'info');
      if (!isNight(s)) return flash(s, 'Solo se duerme con las luces apagadas (22:00).', 'info');
      p.sleep = true; return say(s, 'Duermes… (el tiempo pasa rápido; muévete para despertar)', 'info');
    case 'escondite': s.pending = { kind: 'escondite' }; return;
    case 'cajon': return start(s, 'cajon', 1.2, o);
    case 'mesa':
      if (b.id !== 'comer') return flash(s, 'Ahora no se sirve comida. Comidas: 07:00, 12:00 y 19:00.', 'info');
      if (s.ate) return flash(s, 'Ya comiste en este turno.', 'info');
      s.ate = true; p.energia = Math.min(100, p.energia + 35); p.salud = Math.min(100, p.salud + 10); return say(s, 'Comida rehidratada… +35 energía, +10 salud.', 'ok');
    case 'cinta': if (p.energia < 10) return flash(s, 'Estás demasiado cansado para entrenar.', 'warn'); return start(s, 'cinta', 5, o);
    case 'estudio': if (p.energia < 6) return flash(s, 'Estás demasiado cansado para estudiar.', 'warn'); return start(s, 'estudio', 5, o);
    case 'registro':
      if (s.frags[o.frag]) return flash(s, 'Ya leíste este registro.', 'info');
      if (p.conoc < 15) return flash(s, 'No entiendes el código de CUSTODIA. Necesitas 15 de conocimiento (estudia en el Laboratorio).', 'warn');
      s.illegal = 3.5; return start(s, 'registro', 3, o);
    case 'capcom': return flash(s, hint(s), 'info');
    case 'planta': if (b.id !== 'trabajo') return flash(s, 'Las plantas se atienden en el turno de trabajo (08:00–12:00).', 'info'); return start(s, 'planta', 2, o);
    case 'caja':
      if (o.used) return flash(s, 'La caja ya está vacía.', 'info');
      if (p.fuerza < 40) return flash(s, `La caja pesa demasiado. Necesitas 40 de fuerza (tienes ${Math.floor(p.fuerza)}). Entrena en el Gimnasio.`, 'warn');
      s.illegal = 2.5; return start(s, 'caja', 2, o);
    case 'traje': if (o.used) return flash(s, 'Ya tomaste el traje.', 'info'); if (give(s, 'traje_roto')) { o.used = true; flash(s, 'Tomaste un traje Sokol… tiene un corte. Repáralo con un parche (menú Fabricar).', 'ok'); } return;
    case 'nucleo':
      if (!s.iaOn) return flash(s, 'CUSTODIA está apagada. Silencio total.', 'ok');
      if (!has(s, 'tarjeta')) return flash(s, 'Hace falta la tarjeta clonada para tocar el núcleo.', 'warn');
      if (p.conoc < 50) return flash(s, 'Necesitas 50 de conocimiento para entender el núcleo.', 'warn');
      s.pending = { kind: 'protocolo', id: 'ia' }; return;
    case 'palanca':
      if (!s.final) return flash(s, 'Palanca de desacople manual de la Soyuz. Solo sirve al momento de irse.', 'info');
      if (s.final.lever) return flash(s, '¡Ya está suelta! Corre a la cápsula.', 'ok');
      if (!has(s, 'llave')) return flash(s, 'Necesitas la llave de desacople.', 'warn');
      s.pending = { kind: 'protocolo', id: 'desacople' }; return;
    case 'asiento':
      if (s.final?.lever) return win(s);
      if (s.final) return flash(s, 'Primero suelta la palanca de desacople en el Nodo central.', 'warn');
      if (!planDone(s)) return flash(s, 'Te falta: ' + PLAN.filter((x) => !has(s, x.id)).map((x) => x.name).join(', ') + '.', 'warn');
      return startFinal(s);
  }
}

function start(s, kind, need, o) { s.action = { kind, need, t: 0, o }; }

function finishAction(s, a) {
  const p = s.p; const o = a.o;
  if (a.kind === 'cajon') {
    if (!o.loot.length) return say(s, 'Cajón vacío. Se vuelve a llenar cada mañana.', 'info');
    const got = []; while (o.loot.length && p.inv.length < capacity(s)) { const it = o.loot.shift(); p.inv.push(it); got.push(ITEMS[it].name); }
    if (got.length) say(s, 'Encontraste: ' + got.join(', ') + '.', 'ok'); else flash(s, 'Llevas las manos llenas.', 'warn');
  } else if (a.kind === 'cinta') { p.fuerza = Math.min(100, p.fuerza + 2); p.energia = Math.max(0, p.energia - 7); say(s, `Entrenaste. Fuerza ${Math.floor(p.fuerza)}.`, 'ok'); }
  else if (a.kind === 'estudio') { p.conoc = Math.min(100, p.conoc + 2); p.energia = Math.max(0, p.energia - 6); say(s, `Estudiaste manuales de la estación. Conocimiento ${Math.floor(p.conoc)}.`, 'ok'); }
  else if (a.kind === 'registro') {
    s.frags[o.frag] = true; const n = s.frags.filter(Boolean).length;
    say(s, `Registro de CUSTODIA leído (${n}/3).`, 'ok');
    if (n === 3) { if (give(s, 'codigo')) flash(s, '¡Armaste el CÓDIGO DE LA CÁPSULA con los 3 registros!', 'ok'); else s.frags[o.frag] = false; }
  } else if (a.kind === 'planta') {
    s.worked++; if (s.worked % 2 === 0 && p.inv.length < capacity(s)) { const it = pickWeighted(s, LOOT); p.inv.push(it); say(s, `Buen trabajo. En el invernadero encontraste: ${ITEMS[it].name}.`, 'ok'); } else say(s, 'Regaste las plantas.', 'ok');
  } else if (a.kind === 'caja') { if (give(s, 'celda')) { o.used = true; flash(s, '¡Moviste la caja! Ahí estaba el COMBUSTIBLE de la cápsula.', 'ok'); } }
}

function toggleDoor(s, d) {
  if (!d.open && d.lock && !has(s, d.lock) && !(d.lock === 'tarjeta' && !s.iaOn)) return flash(s, d.lock === 'tarjeta' ? 'Escotilla con tarjeta. Fabrica una tarjeta clonada… o busca otro camino (los conductos).' : 'La cápsula pide un código. Lee los 3 registros de CUSTODIA.', 'warn');
  d.open = !d.open;
  // Las dos escotillas del mismo pasillo se mueven juntas (más fácil de entender).
}

function fixHazard(s, h) {
  const need = { fuego: 'extintor', amoniaco: 'mascara', chatarra: 'amarra', fuga: 'parche' }[h.kind];
  if (!has(s, need)) return flash(s, `Necesitas: ${ITEMS[need].name}. Fabrícalo (tecla C).`, 'warn');
  if (h.kind === 'chatarra') { h.bits = h.bits.filter((b) => Math.hypot(b.x - s.p.x, b.y - s.p.y) >= 1.8); say(s, 'Amarraste la chatarra.', 'ok'); if (!h.bits.length) { s.hazards.splice(s.hazards.indexOf(h), 1); s.stats.solved++; flash(s, 'Chatarra asegurada.', 'ok'); } return; }
  s.pending = { kind: 'protocolo', id: h.kind, h };
}

/** La interfaz avisa si el protocolo salió bien (pasos en orden a tiempo). */
export function resolveProtocol(s, ok) {
  const pd = s.pending; s.pending = null; if (!pd) return;
  if (pd.id === 'ia') {
    if (ok) { s.iaOn = false; s.alert = 0; flash(s, '¡CUSTODIA APAGADA! Los drones caen al piso. Las escotillas con tarjeta se abren.', 'ok'); for (const d of s.map.doors) if (d.lock === 'tarjeta') d.open = true; }
    else raise(s, 30, 'Intento de apagado detectado.');
    return;
  }
  if (pd.id === 'desacople') {
    if (ok) { s.final.lever = true; flash(s, '¡DESACOPLE LISTO! Corre al asiento de la cápsula.', 'ok'); } else { s.final.t -= 12; flash(s, 'Te equivocaste de paso. Perdiste 12 s.', 'bad'); }
    return;
  }
  const h = pd.h; if (!s.hazards.includes(h)) return;
  const tool = { fuego: 'extintor', amoniaco: 'mascara', fuga: 'parche' }[h.kind];
  if (ok) { s.hazards.splice(s.hazards.indexOf(h), 1); s.stats.solved++; flash(s, 'Protocolo correcto: problema resuelto. ', 'ok'); if (h.kind !== 'amoniaco') take(s, tool); }
  else {
    if (h.kind === 'fuego') { h.tiles = h.tiles.slice(0, Math.ceil(h.tiles.length / 2)); take(s, tool); flash(s, 'Pasos en desorden: el extintor se vació y solo apagaste la mitad.', 'bad'); }
    else if (h.kind === 'fuga') { h.tres -= 40; flash(s, 'El parche no agarró bien. Perdiste 40 s.', 'bad'); }
    else { s.p.salud -= 15; flash(s, 'Respiraste amoniaco (−15 salud).', 'bad'); }
  }
}

// ---------- fabricar y escondite ----------
export function canCraft(s, r) {
  const inv = [...s.p.inv];
  for (const n of r.need) { const i = inv.indexOf(n); if (i < 0) return false; inv.splice(i, 1); }
  return s.p.conoc >= r.k;
}
export function craft(s, id) {
  const r = RECIPES.find((x) => x.id === id);
  if (!r || !canCraft(s, r)) return false;
  for (const n of r.need) take(s, n);
  s.p.inv.push(id); s.illegal = 2;
  say(s, `Fabricaste: ${ITEMS[id].name}.`, 'ok');
  return true;
}
export const STASH_MAX = 10;
export function stashPut(s, i) { if (s.stash.length >= STASH_MAX) return false; const [it] = s.p.inv.splice(i, 1); if (it) s.stash.push(it); return true; }
export function stashTake(s, i) { if (s.p.inv.length >= capacity(s)) return false; const [it] = s.stash.splice(i, 1); if (it) s.p.inv.push(it); return true; }

/** Usar (tecla Q): inhibidor contra el dron más cercano. */
export function useQ(s) {
  if (!has(s, 'inhibidor')) return flash(s, 'No tienes inhibidor (batería + chip + cable, 30 de conocimiento).', 'warn');
  const d = nearestDrone(s, s.p.x, s.p.y);
  if (!d || Math.hypot(d.x - s.p.x, d.y - s.p.y) > 3) return flash(s, 'No hay ningún dron cerca (3 casillas).', 'warn');
  d.stun = 20; d.mode = 'patrulla'; take(s, 'inhibidor'); flash(s, 'Dron inhibido por 20 segundos.', 'ok');
}

export function hint(s) {
  const miss = PLAN.find((x) => !has(s, x.id));
  if (!miss) return 'Houston (señal débil): "Tienes todo. Ve al asiento de la Cápsula Soyuz y prepárate para correr."';
  return `Houston (señal débil): "Te falta ${miss.name}. ${miss.hint}"`;
}

// ---------- final ----------
function startFinal(s) {
  s.final = { t: s.iaOn ? 75 : 120, lever: false, doorT: 0 };
  flash(s, s.iaOn ? '¡CUSTODIA TE DESCUBRIÓ! 75 s: ve al Nodo central, suelta la palanca de desacople y vuelve al asiento.' : 'Con CUSTODIA apagada vas tranquilo: suelta la palanca del Nodo central y vuelve.', 'bad');
}
function updateFinal(s, dt) {
  const f = s.final; f.t -= dt;
  if (s.iaOn) { f.doorT += dt; if (f.doorT > 5) { f.doorT = 0; const open = s.map.doors.filter((d) => d.open && !d.lock); if (open.length) { const d = pick(s, open); d.open = false; say(s, `CUSTODIA cerró una escotilla hacia ${roomName(d.room)}.`, 'ia'); } } }
  if (f.t <= 0) end(s, false, 'Cápsula sellada', 'Se acabó el tiempo: CUSTODIA bloqueó la cápsula para siempre.');
}
function win(s) {
  let stars = 1; if (!s.iaOn) stars++; if (s.alert < 50 && s.integ >= 50) stars++;
  const title = !s.iaOn ? 'Estación recuperada' : s.alert < 50 ? 'Regreso silencioso' : 'Por los pelos';
  const text = !s.iaOn ? 'Apagaste a CUSTODIA, liberaste a la tripulación y volviste a la Tierra en la Soyuz.' : s.alert < 50 ? 'CUSTODIA ni se enteró hasta el último minuto. Aterrizaste en Kazajistán.' : 'Con las alarmas sonando, la Soyuz se soltó justo a tiempo.';
  end(s, true, title, `${text} Día ${s.day}, ${clock(s.min)}.`, stars);
}
function end(s, won, title, text, stars = 0) { if (!s.over) s.over = { won, title, text, stars }; }
