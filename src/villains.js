// Villanos de LIFELINE: Rutina. Cada destino tiene 10: el primero es la IA (siempre activa);
// cada día se sortean otros al azar. También: misiones con reloj, huellas, votación y peligros nuevos.
import { ITEMS, LOOT } from './common.js';
import * as C from './core.js';

/*
 kind:
  ia     = rasgo de la IA del destino (siempre activo)
  walker = persona que patrulla y te atrapa al tocarte (no le afecta el inhibidor ni apagar la IA)
  snitch = alguien que te sigue (soplón, doble, desertor)
  hazard = peligro del mapa (usa HAZARDS)
  vote   = el Consejo de colonos vota cada noche
*/
export const VILLAINS = {
  // ---- Estación ----
  custodia: { kind: 'ia', name: 'CUSTODIA aprende', desc: 'Si usas mucho la misma rejilla, CUSTODIA la suelda por 2 días.' },
  inspector: { kind: 'walker', name: 'El Inspector', desc: 'Llega con la nave de carga y revisa a todos: si te ve con herramientas, te las quita TODAS.', shirt: '#e8e8e8', speed: 2.3, cond: 'contra', onCatch: 'confisca', window: true, search: 0.35 },
  cazador: { kind: 'hazard', hz: 'cazador', name: 'Dron cazador', desc: 'Más rápido que los demás y te sigue el rastro aunque te pierda de vista.' },
  volkov: { kind: 'walker', name: 'Comandante Volkov', desc: 'Hace rondas a pie. Háblale (E) y se pone a contar historias 20 s.', shirt: '#b03030', speed: 2.4, onCatch: 'castigo', chat: true, search: 0.3 },
  soplon: { kind: 'snitch', name: 'El Soplón', desc: 'Te sigue y le cuenta todo a la IA. Dale una pieza (E) para que se calle.', shirt: '#9a9a3a', mode: 'soplon' },
  basura: { kind: 'hazard', hz: 'basura', name: 'Basura orbital', desc: 'Aviso de choque: todos al Nodo central. Quien no llegue, sale herido.' },
  canadarm: { kind: 'hazard', hz: 'canadarm', name: 'Brazo robótico', desc: 'Barre una sala de lado a lado. Pasa por el hueco.' },
  fuego0g: { kind: 'hazard', hz: 'fuego0g', name: 'Fuego en ingravidez', desc: 'Bolas de fuego que flotan y rebotan. Extintor.' },
  medico: { kind: 'walker', name: 'El Médico', desc: 'Si te ve con poca salud o energía, te persigue para encerrarte en la enfermería.', shirt: '#f4f4ff', speed: 2.5, cond: 'debil', onCatch: 'enfermeria' },
  hongo: { kind: 'hazard', hz: 'hongo', name: 'Hongo en los filtros', desc: 'Tapa las rejillas de los conductos una por una. Fungicida.' },
  // ---- Luna ----
  selene: { kind: 'ia', name: 'Cámaras de SELENE', desc: 'Cámaras fijas que giran. Inhíbelas (Q) y desármalas con destornillador.' },
  hart: { kind: 'walker', name: 'Comandante Hart', desc: 'Sigue tus huellas de polvo lunar. Pasa por la esclusa para limpiarte.', shirt: '#2a5aa8', speed: 2.5, onCatch: 'castigo', prints: true, search: 0.4 },
  mineros: { kind: 'walker', name: 'Mineros de la empresa', desc: 'Dos guardias que patrullan la superficie.', shirt: '#e8a020', speed: 2.6, count: 2, zone: 'outside', onCatch: 'golpe' },
  rover: { kind: 'hazard', hz: 'rover', name: 'Rover autónomo', desc: 'Recorre la base y te atropella.' },
  solar: { kind: 'hazard', hz: 'radiacion', name: 'Tormenta solar', desc: 'Todos al refugio de radiación.' },
  doble: { kind: 'snitch', name: 'El Doble', desc: 'Un infiltrado copia el color de un compañero. Háblale (E) para desenmascararlo.', mode: 'doble' },
  meteoritos: { kind: 'hazard', hz: 'meteoritos', name: 'Micrometeoritos', desc: 'Marcas en la superficie que explotan a los 2 s.' },
  grieta: { kind: 'hazard', hz: 'grieta', name: 'Grietas del cráter', desc: 'El piso se abre. Resina.' },
  frio: { kind: 'hazard', hz: 'frio', name: 'Noche lunar', desc: 'El frío se come la energía. Batería.' },
  perro: { kind: 'hazard', hz: 'perro', name: 'Perro-robot', desc: 'Huele las herramientas que llevas encima.' },
  // ---- Marte ----
  ares: { kind: 'ia', name: 'Apagones de ARES', desc: 'Corta la energía de una sala: las escotillas no abren sin batería.' },
  consejo: { kind: 'vote', name: 'El Consejo de colonos', desc: 'A las 20:30 votan. Si sospechan de ti, te registran el escondite.' },
  bioseg: { kind: 'walker', name: 'Bioseguridad', desc: 'Dos guardias con traje; sellan una sala en cuarentena.', shirt: '#ffe14a', speed: 2.4, count: 2, onCatch: 'cuarentena', extra: 'cuarentena', search: 0.3 },
  diablo: { kind: 'hazard', hz: 'diablo', name: 'Diablo de polvo', desc: 'Remolinos afuera que te arrastran.' },
  tormenta: { kind: 'hazard', hz: 'tormenta', name: 'Tormenta global', desc: 'Afuera es mortal; adentro se va la luz.' },
  mutacion: { kind: 'hazard', hz: 'mutacion', name: 'Plantas mutantes', desc: 'Crecen en el invernadero y te atrapan. Fungicida.' },
  jefe: { kind: 'walker', name: 'El Jefe de colonia', desc: 'Si te pilla en tiempo libre, te pone trabajo extra (pierdes horas).', shirt: '#6a3aa8', speed: 2.5, cond: 'libre', onCatch: 'trabajo' },
  minero: { kind: 'hazard', hz: 'robotminero', name: 'Robot minero roto', desc: 'Lo atrae el metal de tus herramientas.' },
  perclorato: { kind: 'hazard', hz: 'perclorato', name: 'Perclorato', desc: 'Charcos tóxicos que se extienden.' },
  desertor: { kind: 'snitch', name: 'El Desertor', desc: 'Otro colono que quiere escapar: te roba piezas del plan y las esconde. ¡Atrápalo (E)!', shirt: '#3a3a3a', mode: 'ladron' },
};
export const LOC_VILLAINS = {
  estacion: ['custodia', 'inspector', 'cazador', 'volkov', 'soplon', 'basura', 'canadarm', 'fuego0g', 'medico', 'hongo'],
  luna: ['selene', 'hart', 'mineros', 'rover', 'solar', 'doble', 'meteoritos', 'grieta', 'frio', 'perro'],
  marte: ['ares', 'consejo', 'bioseg', 'diablo', 'tormenta', 'mutacion', 'jefe', 'minero', 'perclorato', 'desertor'],
};

const rnd = (s) => C.rand(s);
const pick = (s, a) => C.pick(s, a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const room = (s, id) => s.L.rooms.find((r) => r.id === id);
const indoor = (s) => s.L.rooms.filter((r) => !r.restricted && !r.outside);
const tileIn = (s, r) => [r.x + 0.5 + Math.floor(rnd(s) * r.w), r.y + 0.5 + Math.floor(rnd(s) * r.h)];
const sfx = (s, k) => { (s.sfx ??= []).push(k); if (s.sfx.length > 8) s.sfx.shift(); };

// ---------- inicio de cada día: sorteo ----------
export function startDay(s) {
  const prev = s.vil?.today ?? [];
  const v = s.vil ?? (s.vil = { today: [], walkers: [], events: [], prints: [], gUse: {}, welded: [], mission: null, missions: [], spot: 0 });
  v.walkers = []; v.events = []; v.spot = 0; v.favors0 = s.stats.favors; v.voted = false;
  const all = LOC_VILLAINS[s.loc]; const ia = all[0];
  const n = s.day < 2 ? 1 : s.day < 4 ? 2 : 3;
  let pool = all.slice(1).filter((id) => !prev.includes(id)); if (pool.length < n) pool = all.slice(1);
  const chosen = [];
  while (chosen.length < n && pool.length) chosen.push(pool.splice(Math.floor(rnd(s) * pool.length), 1)[0]);
  v.today = [ia, ...chosen];
  // rasgo de la IA
  if (ia === 'custodia' && s.iaOn) {
    v.welded = v.welded.filter((w) => w.until > s.day);
    for (const [i, n2] of Object.entries(v.gUse)) if (n2 >= 3 && !v.welded.some((w) => w.i === +i)) { v.welded.push({ i: +i, until: s.day + 2 }); C.say(s, `CUSTODIA: Noté tráfico raro en una rejilla de ${C.roomName(s, C.roomIdAt(s, s.L.grates[i][0] + 0.5, s.L.grates[i][1] + 0.5))}. La soldé.`, 'ia'); }
    v.gUse = {};
  }
  if (ia === 'selene' && s.iaOn) { const want = Math.min(5, 2 + Math.floor((s.day - 1) / 3)); while (s.hazards.filter((h) => h.kind === 'camara').length < want) C.spawnHazard(s, 'camara'); }
  if (ia === 'ares' && s.iaOn) for (let k = 0; k < (s.day >= 4 ? 2 : 1); k++) v.events.push({ min: 500 + Math.floor(rnd(s) * 760), hz: 'apagon' });
  for (const id of chosen) {
    const d = VILLAINS[id];
    if (d.kind === 'hazard') v.events.push({ min: 480 + Math.floor(rnd(s) * 780), hz: d.hz });
    else if (d.kind === 'walker') { for (let k = 0; k < (d.count ?? 1); k++) v.walkers.push(newWalker(s, id, k)); if (d.extra) v.events.push({ min: 540 + Math.floor(rnd(s) * 600), hz: d.extra }); }
    else if (d.kind === 'snitch') v.walkers.push(newSnitch(s, id));
  }
  v.events.sort((a, b) => a.min - b.min);
  // misiones del día (más suspenso entre los pasos del plan)
  v.missions = [];
  if (s.day >= 1) v.missions.push(480 + Math.floor(rnd(s) * 420));
  if (s.day >= 3) v.missions.push(1340 + Math.floor(rnd(s) * 60));
  C.say(s, `Amenazas de hoy: ${v.today.map((id) => VILLAINS[id].name).join(' · ')}.`, 'ia');
}

function newWalker(s, vid, k) {
  const d = VILLAINS[vid];
  const r = d.zone === 'outside' ? s.L.rooms.find((x) => x.outside) : pick(s, indoor(s).filter((x) => x.id !== 'dorm'));
  if (!r) return { vid, gone: true, kind: 'walker', x: 0, y: 0 };
  const [x, y] = tileIn(s, r);
  const w = { vid, kind: 'walker', name: d.name, shirt: d.shirt, x, y, dir: 0, path: null, mode: 'patrulla', look: 0, lost: 9, cd: 0, busy: 0, chatCd: 0, goal: null, k,
    avoid: d.zone === 'outside' ? s.L.rooms.filter((x) => !x.outside && x.id !== 'esclusa').map((x) => x.id) : ['exterior'] };
  if (d.window) { w.from = 540 + Math.floor(rnd(s) * 300); w.to = w.from + 240; w.away = true; }
  return w;
}
function newSnitch(s, vid) {
  const d = VILLAINS[vid]; const r = pick(s, indoor(s)); const [x, y] = tileIn(s, r);
  const w = { vid, kind: 'snitch', name: d.name, shirt: d.shirt, x, y, dir: 0, path: null, mode: 'sigue', rep: 0, cd: 0, avoid: ['exterior', 'ia'] };
  if (d.mode === 'doble') { const c = pick(s, s.crew); w.name = c.name; w.shirt = c.color; w.copy = c.name; }
  return w;
}

// ---------- cada cuadro ----------
export function updateVillains(s, dt, dm) {
  const v = s.vil; if (!v) return; const p = s.p;
  while (v.events.length && s.min >= v.events[0].min) { const e = v.events.shift(); if (e.hz === 'apagon' && !s.iaOn) continue; C.spawnHazard(s, e.hz); sfx(s, 'alarma'); }
  if (v.missions.length && s.min >= v.missions[0] && !v.mission && !s.final) { v.missions.shift(); newMission(s); }
  if (v.mission) updateMission(s, dt);
  // huellas de polvo
  if (C.isOutside(s)) p.dusty = 90; else if (C.playerRoom(s) === 'esclusa') p.dusty = 0;
  if (p.dusty > 0 && s.loc === 'luna') {
    p.dusty -= dt;
    const last = v.prints[v.prints.length - 1];
    if (!C.isOutside(s) && !p.inDuct && (!last || Math.hypot(last.x - p.x, last.y - p.y) > 0.8)) { v.prints.push({ x: p.x, y: p.y, t: 70, a: p.dir }); if (v.prints.length > 50) v.prints.shift(); }
  }
  for (const f of v.prints) f.t -= dt; v.prints = v.prints.filter((f) => f.t > 0);
  // votación
  if (v.today.includes('consejo') && !v.voted && s.min >= 1230) { v.voted = true; vote(s); }
  for (const w of v.walkers) { if (w.gone) continue; if (w.kind === 'walker') updateWalker(s, w, dt); else updateSnitch(s, w, dt); }
  if (s.shake > 0) s.shake -= dt;
  if (s.thrown && (s.thrown.t -= dt) <= 0) s.thrown = null;
}

function sees(s, w, range = 6) {
  const p = s.p; if (p.inDuct || p.hidden) return false;
  let k = 1; if (p.crouch) k *= 0.7; if (C.isNight(s)) k *= 0.8; if (C.dark(s)) k *= 0.55;
  const dx = p.x - w.x, dy = p.y - w.y, d = Math.hypot(dx, dy);
  if (d > range * k) return false;
  if (d > 1.2) { let a = Math.atan2(dy, dx) - w.dir; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) > 0.9) return false; }
  return C.los(s, w.x, w.y, p.x, p.y);
}
function wants(s, w) {
  const d = VILLAINS[w.vid]; const p = s.p;
  if (d.cond === 'contra') return p.inv.some(C.isContraband) || C.suspicious(s);
  if (d.cond === 'debil') return p.salud < 50 || p.energia < 25;
  if (d.cond === 'libre') return C.suspicious(s) || C.block(s).id === 'libre';
  return C.suspicious(s);
}
export function spotted(s, who) { if (s.vil) s.vil.spot++; sfx(s, 'visto'); who.alarmT = 1.2; }

function updateWalker(s, w, dt) {
  const d = VILLAINS[w.vid]; const p = s.p;
  if (d.window) {
    const inWin = s.min >= w.from && s.min < w.to;
    if (inWin && w.away) { w.away = false; const r = room(s, 'nodo'); [w.x, w.y] = tileIn(s, r); C.flash(s, `Llegó la nave de carga con ${d.name} (hasta las ${C.clock(w.to)}). Esconde tus herramientas.`, 'bad'); sfx(s, 'alarma'); }
    if (!inWin && !w.away) { w.away = true; C.say(s, `${d.name} se fue en la nave de carga.`, 'info'); }
    if (w.away) return;
  }
  w.moving = false; w.cd = Math.max(0, w.cd - dt); w.chatCd = Math.max(0, w.chatCd - dt); if (w.alarmT > 0) w.alarmT -= dt; if (w.ignore > 0) w.ignore -= dt;
  if (w.busy > 0) { w.busy -= dt; if (w.busyBy) w.dir = Math.atan2(w.busyBy.y - w.y, w.busyBy.x - w.x); w.mode = 'charla'; if (w.busy <= 0) w.mode = 'patrulla'; return; }
  if (C.isNight(s) && s.min > 1380 && !d.zone && w.mode === 'patrulla' && rnd(s) < 0.0005) { /* rondas nocturnas: siguen */ }
  const see = sees(s, w) && !(w.ignore > 0);
  if (see && wants(s, w)) { if (w.mode !== 'persigue') spotted(s, w); w.mode = 'persigue'; w.lost = 0; w.goal = [p.x, p.y]; }
  else if (w.mode === 'persigue') { w.lost += dt; if (w.lost > 3.5) { w.mode = 'investiga'; w.look = 4; } }
  if (w.mode === 'patrulla' && p.noisy && !p.hidden && Math.hypot(p.x - w.x, p.y - w.y) < 3) { w.mode = 'investiga'; w.goal = [p.x, p.y]; w.look = 3; }
  if (s.noise && w.mode === 'patrulla' && Math.hypot(s.noise.x - w.x, s.noise.y - w.y) < 10) { w.mode = 'investiga'; w.goal = [s.noise.x, s.noise.y]; w.look = 4; }
  // Hart sigue las huellas
  if (d.prints && w.mode === 'patrulla' && s.vil.prints.length) { const f = s.vil.prints[s.vil.prints.length - 1]; if (Math.hypot(f.x - w.x, f.y - w.y) < 16) { w.mode = 'investiga'; w.goal = [f.x, f.y]; w.look = 1; } }
  w.chasing = w.mode === 'persigue';
  if (w.mode === 'patrulla' && (!w.goal || Math.hypot(w.goal[0] - w.x, w.goal[1] - w.y) < 0.7)) {
    if ((w.look -= dt) > 0) { w.dir += dt * 1.6; return; }
    const rs = d.zone === 'outside' ? s.L.rooms.filter((x) => x.outside) : indoor(s);
    w.goal = tileIn(s, pick(s, rs)); w.look = 1.5 + rnd(s) * 2;
  }
  if ((w.mode === 'investiga' || w.mode === 'busca') && Math.hypot(w.goal[0] - w.x, w.goal[1] - w.y) < 0.9) {
    if (w.mode === 'busca') { w.mode = 'investiga'; w.look = 3; if (p.hidden && Math.hypot(p.hidden.x - w.x, p.hidden.y - w.y) < 1.9 && !s.pending) { s.pending = { kind: 'respira', who: w }; return; } }
    w.look -= dt; w.dir += dt * 2; if (w.look <= 0) { w.mode = 'patrulla'; w.goal = null; } return;
  }
  // revisa escondites al pasar (como en las rondas)
  if (d.search && p.hidden && !s.pending && w.mode !== 'persigue' && Math.hypot(p.hidden.x - w.x, p.hidden.y - w.y) < 1.4 && w.checked !== p.hidden) { w.checked = p.hidden; if (rnd(s) < d.search) { s.pending = { kind: 'respira', who: w }; sfx(s, 'visto'); return; } }
  if (w.goal) C.follow(s, w, w.goal, d.speed * (w.chasing ? 1.4 : w.mode === 'investiga' ? 1.1 : 0.75), dt, 'd');
  if (w.chasing && see) w.dir = Math.atan2(p.y - w.y, p.x - w.x);
  if (w.cd <= 0 && !p.inDuct && !p.hidden && Math.hypot(p.x - w.x, p.y - w.y) < 0.75 && (w.chasing || wants(s, w))) caughtBy(s, w);
}

export function caughtBy(s, w) {
  const d = VILLAINS[w.vid]; const p = s.p; w.cd = 6; w.mode = 'patrulla'; w.goal = null; s.stats.caught++; p.hit = 1; s.shake = 0.6; sfx(s, 'atrapado');
  const tools = () => { const lost = p.inv.filter(C.isContraband); p.inv = p.inv.filter((i) => !C.isContraband(i)); return lost.map((i) => C.itemName(s, i)).join(', '); };
  const toDorm = () => Object.assign(p, { x: 3.5, y: 3.5, inDuct: false, hidden: null });
  const skip = (m) => { s.min = Math.min(s.min + m, 1439); };
  switch (d.onCatch) {
    case 'confisca': { const l = tools(); C.raise(s, 10); return C.flash(s, `${d.name} te revisó${l ? ' y te quitó: ' + l : ', pero no llevabas nada'}.`, 'bad'); }
    case 'enfermeria': toDorm(); skip(150); p.salud = Math.max(p.salud, 85); p.energia = Math.max(p.energia, 70); return C.flash(s, `${d.name} te llevó a la enfermería. Perdiste 2 h y media, pero te curó.`, 'bad');
    case 'golpe': { p.salud -= 20; const r = room(s, 'esclusa'); Object.assign(p, { x: r.x + 1.5, y: r.y + 2.5 }); C.raise(s, 10); return C.flash(s, `Los mineros te golpearon (−20 salud) y te tiraron a la esclusa.`, 'bad'); }
    case 'cuarentena': toDorm(); skip(120); p.energia = Math.max(0, p.energia - 10); return C.flash(s, `${d.name}: "Posible contagio." Te pusieron 2 h en cuarentena.`, 'bad');
    case 'trabajo': { skip(90); p.energia = Math.max(0, p.energia - 20); const b = s.L.schedule.find((x) => x.id === 'trabajo'); const r = room(s, b.room); Object.assign(p, { x: r.x + 1.5, y: r.y + 1.5, inDuct: false, hidden: null }); return C.flash(s, `${d.name} te puso a trabajar 1 h y media extra (−20 energía).`, 'bad'); }
    default: { const l = tools(); toDorm(); p.energia = Math.max(0, p.energia - 20); C.raise(s, 15); return C.flash(s, `${d.name} te atrapó y te encerró en el dormitorio${l ? '. Te quitó: ' + l : ''}.`, 'bad'); }
  }
}

function updateSnitch(s, w, dt) {
  const d = VILLAINS[w.vid]; const p = s.p; w.moving = false; w.cd = Math.max(0, w.cd - dt);
  const dd = Math.hypot(p.x - w.x, p.y - w.y);
  if (d.mode === 'ladron') {
    if (w.loot) { // huye a un cajón para esconder lo robado
      if (!w.goal) { const o = pick(s, s.objects.filter((o) => o.t === 'cajon' && !C.roomAt(s, o.x, o.y)?.restricted)); w.goal = [o.x + 0.5, o.y + 0.5]; w.obj = o; }
      if (C.follow(s, w, w.goal, 3.0, dt, 'd')) { const o = s.objects.find((x) => x.x === w.obj?.x && x.y === w.obj?.y) ?? s.objects.find((x) => x.t === 'cajon'); o.loot.push(w.loot); C.flash(s, `El Desertor escondió tu ${C.itemName(s, w.loot)} en un cajón de ${C.roomName(s, C.roomIdAt(s, w.x, w.y))}.`, 'bad'); w.loot = null; w.goal = null; w.cd = 45; }
      return;
    }
    if (w.cd > 0 || p.inDuct || p.hidden) { if (!w.goal || Math.hypot(w.goal[0] - w.x, w.goal[1] - w.y) < 0.7) w.goal = tileIn(s, pick(s, indoor(s))); C.follow(s, w, w.goal, 1.6, dt, 'd'); return; }
    C.follow(s, w, [p.x, p.y], 2.4, dt, 'd');
    if (dd < 0.7) { const it = C.PLAN_IDS.find((x) => C.has(s, x)) ?? p.inv.find(C.isContraband) ?? p.inv[0]; if (it) { C.take(s, it); w.loot = it; w.goal = null; sfx(s, 'visto'); C.flash(s, `¡El Desertor te robó: ${C.itemName(s, it)}! Atrápalo (E) antes de que lo esconda.`, 'bad'); } else w.cd = 20; }
    return;
  }
  // soplón y doble: te siguen y cuentan
  const keep = d.mode === 'doble' ? 4.5 : 2.6;
  if (p.inDuct || p.hidden) { if (!w.goal || Math.hypot(w.goal[0] - w.x, w.goal[1] - w.y) < 0.7) w.goal = tileIn(s, pick(s, indoor(s))); C.follow(s, w, w.goal, 1.5, dt, 'd'); }
  else if (dd > keep) C.follow(s, w, [p.x, p.y], 2.6, dt, 'd');
  else w.dir = Math.atan2(p.y - w.y, p.x - w.x);
  const bad = C.suspicious(s) || (d.mode === 'soplon' && p.inv.filter(C.isContraband).length >= 1);
  if (dd < 6 && !p.inDuct && !p.hidden && C.los(s, w.x, w.y, p.x, p.y) && bad) {
    w.rep += dt;
    if (w.rep > 3) { w.rep = 0; w.say = d.mode === 'doble' ? '…' : '¡Te vi!'; w.sayFor = 2; if (s.iaOn) C.raise(s, 12, `${d.mode === 'doble' ? 'Un compañero' : 'El Soplón'} me contó lo que hacías.`); sfx(s, 'visto'); }
  }
  if (w.sayFor > 0) w.sayFor -= dt;
}

function vote(s) {
  const v = s.vil; const fav = s.stats.favors - (v.favors0 ?? 0);
  const score = s.alert * 0.6 + v.spot * 8 + s.p.inv.filter(C.isContraband).length * 5 - fav * 15;
  if (score >= 35) {
    const inStash = s.stash.findIndex(C.isContraband);
    if (inStash >= 0) { const [it] = s.stash.splice(inStash, 1); C.flash(s, `El Consejo votó en tu contra: registraron tu escondite y se llevaron ${C.itemName(s, it)}.`, 'bad'); }
    else { const it = s.p.inv.find(C.isContraband); if (it) C.take(s, it); C.flash(s, `El Consejo votó en tu contra${it ? ': te quitaron ' + C.itemName(s, it) : ''}. Mañana te vigilan más.`, 'bad'); C.raise(s, 15); }
    sfx(s, 'atrapado');
  } else if (score < 15) { s.alert = Math.max(0, s.alert - 20); const it = C.pick(s, Object.keys(LOOT)); C.give(s, it); C.flash(s, `El Consejo confía en ti (−20 alerta). Te regalaron: ${ITEMS[it].name}.`, 'ok'); }
  else C.say(s, 'El Consejo votó: nada contra ti… por ahora.', 'info');
}

// ---------- E cerca de un villano o de la misión ----------
export function nearbyVillains(s) {
  const out = []; const p = s.p; const v = s.vil; if (!v) return out;
  for (const w of v.walkers) {
    if (w.gone || w.away) continue; const d = Math.hypot(w.x - p.x, w.y - p.y); const def = VILLAINS[w.vid];
    if (d < 1.3 && (def.chat || w.kind === 'snitch')) out.push({ kind: 'vil', w, d: d - 0.2 });
  }
  const m = v.mission; if (m && m.x != null && Math.hypot(m.x - p.x, m.y - p.y) < 1.4) out.push({ kind: 'vil', m, d: 0 });
  return out;
}
export function label(s, n) {
  if (n.m) return `MISIÓN: ${n.m.verb}`;
  const def = VILLAINS[n.w.vid];
  if (def.mode === 'ladron') return n.w.loot ? '¡Atrapar al Desertor!' : 'Desertor';
  if (def.mode === 'doble') return `Hablar con ${n.w.name}`;
  if (def.mode === 'soplon') return 'Sobornar al Soplón';
  return `Distraer a ${def.name}`;
}
export function interact(s, n) {
  const p = s.p;
  if (n.m) { n.m.holding = true; return C.flash(s, `Quédate quieto ${n.m.need} s junto al objetivo… que no te vean.`, 'info'); }
  const w = n.w; const def = VILLAINS[w.vid];
  if (def.mode === 'ladron') { if (!w.loot) return C.flash(s, 'El Desertor te mira de reojo.', 'info'); C.give(s, w.loot); C.flash(s, `¡Recuperaste ${C.itemName(s, w.loot)}! El Desertor huye.`, 'ok'); w.loot = null; w.cd = 60; w.goal = null; return; }
  if (def.mode === 'doble') { w.gone = true; s.alert = Math.max(0, s.alert - 10); sfx(s, 'radio'); return C.flash(s, `"${w.name}" no sabe tu apodo… ¡era EL DOBLE! Huyó por la esclusa (−10 alerta).`, 'ok'); }
  if (def.mode === 'soplon') { const i = p.inv.findIndex((x) => !ITEMS[x].tool); if (i < 0) return C.flash(s, 'El Soplón: "Mi silencio cuesta una pieza."', 'warn'); const [it] = p.inv.splice(i, 1); w.gone = true; return C.flash(s, `Le diste ${ITEMS[it].name} al Soplón. Hoy no dirá nada.`, 'ok'); }
  if (def.chat) {
    if (w.mode === 'persigue') return; if (w.chatCd > 0) return C.flash(s, `${def.name}: "Ahora no, tengo cosas que hacer."`, 'warn');
    w.busy = 20; w.busyBy = p; w.chatCd = 120; p.energia = Math.max(0, p.energia - 8);
    return C.flash(s, `${def.name} empieza a contar historias de su primera misión… tienes 20 s (−8 energía).`, 'ok');
  }
}

// ---------- rejillas ----------
export function grateBlocked(s, i) {
  if (s.vil?.welded.some((w) => w.i === i) && s.iaOn) return 'CUSTODIA soldó esta rejilla. Usa otra (vuelve en 2 días).';
  if (s.hazards.some((h) => h.def.type === 'mold' && h.blocked.includes(i))) return 'Hongo: la rejilla está tapada. Límpiala con fungicida (E cerca).';
  return null;
}
export function onGrate(s, i) { if (s.vil) s.vil.gUse[i] = (s.vil.gUse[i] ?? 0) + 1; }

// ---------- peligros nuevos ----------
export function initHazard(s, h, r) {
  const def = h.def;
  if (def.type === 'shelter') Object.assign(h, { phase: 'aviso', t: def.warn });
  else if (def.type === 'sweep') { const rs = indoor(s).filter((x) => x.w >= 6 && x.id !== 'dorm'); const q = pick(s, rs); Object.assign(h, { room: q.id, x: q.x + 0.5, y: q.y + q.h / 2, dirx: 1, life: def.life, gap: q.y + Math.floor(rnd(s) * (q.h - 1)) }); }
  else if (def.type === 'mold') { const free = s.L.grates.map((_, i) => i); const i = pick(s, free); Object.assign(h, { blocked: [i], t: 0, x: s.L.grates[i][0] + 0.5, y: s.L.grates[i][1] + 0.5 }); }
  else if (def.type === 'meteor') { const o = s.L.rooms.find((x) => x.outside); Object.assign(h, { life: def.life, marks: [], t: 0, room: o?.id, x: o ? o.x + o.w / 2 : 0, y: o ? o.y + o.h / 2 : 0 }); }
  else if (def.type === 'camera') { const q = pick(s, indoor(s).filter((x) => x.id !== 'dorm')); Object.assign(h, { room: q.id, x: q.x + 0.5 + Math.floor(rnd(s) * q.w), y: q.y + 0.5, base: Math.PI / 2, ph: rnd(s) * 6, dir: Math.PI / 2, stun: 0 }); }
  else if (def.type === 'blackout') {
    const q = pick(s, indoor(s).filter((x) => x.id !== 'dorm'));
    const doors = s.map.doors.filter((d) => d.room === q.id);
    Object.assign(h, { room: q.id, x: q.x + q.w / 2, y: q.y + q.h / 2, life: def.life, saved: doors.map((d) => [d.id, d.open, d.lock]) });
    for (const d of doors) { d.open = false; d.lock = def.quarantine ? 'cuarentena' : 'energia'; }
    h.def = def; // por si acaso
  }
  if (def.type === 'blackout' || def.type === 'sweep') C.say(s, `${def.name} en ${C.roomName(s, h.room)}.`, 'bad');
}

/** Devuelve true si el peligro terminó. */
export function updateHazard(s, h, dt, dm) {
  const def = h.def; const p = s.p;
  if (def.type === 'shelter') {
    h.t -= dt;
    s.crew.forEach((c, i) => { const r = room(s, def.safe[0]); c.goal = [r.x + 1.5 + i, r.y + 2.5]; c.goalBlock = s.block; c.goalDay = s.day; });
    if (h.t > 0) return false;
    if (def.safe.includes(C.playerRoom(s))) { s.stats.solved++; C.flash(s, `${def.name}: pasó rozando. Estabas a salvo.`, 'ok'); }
    else { p.salud -= def.dmg; p.hit = 1; s.shake = 0.8; s.integ -= def.loss; C.flash(s, `${def.name}: ¡IMPACTO! No llegaste a tiempo (−${def.dmg} salud).`, 'bad'); }
    sfx(s, 'boom'); return true;
  }
  if (def.type === 'sweep') {
    const r = room(s, h.room); h.life -= dt; h.x += h.dirx * def.speed * dt;
    if (h.x > r.x + r.w - 0.5 || h.x < r.x + 0.5) { h.dirx *= -1; h.x = Math.max(r.x + 0.5, Math.min(r.x + r.w - 0.5, h.x)); h.gap = r.y + Math.floor(rnd(s) * (r.h - 1)); }
    if (C.playerRoom(s) === h.room && !p.inDuct && !p.hidden && Math.abs(p.x - h.x) < 0.5 && !(p.y >= h.gap && p.y < h.gap + 2) && p.hit <= 0) {
      p.salud -= def.dmg; p.hit = 0.9; C.moveBody(s, p, h.dirx * 1.2, 0, 0.28, 'p'); s.noise = { x: p.x, y: p.y, t: 5 }; C.say(s, '¡El brazo robótico te golpeó!', 'bad'); sfx(s, 'boom');
    }
    if (h.life <= 0) { C.say(s, `${def.name}: se detuvo.`, 'info'); return true; }
    return false;
  }
  if (def.type === 'mold') {
    h.t += dt; s.integ -= 0.004 * dm * h.blocked.length;
    if (h.t > def.grow && h.blocked.length < s.L.grates.length) { h.t = 0; const free = s.L.grates.map((_, i) => i).filter((i) => !h.blocked.includes(i)); h.blocked.push(pick(s, free)); C.say(s, 'El hongo tapó otra rejilla.', 'warn'); }
    return false;
  }
  if (def.type === 'meteor') {
    h.life -= dt; h.t -= dt;
    const o = room(s, h.room);
    if (o && h.life > 0 && h.t <= 0) {
      h.t = 0.35;
      let x, y; if (C.isOutside(s) && rnd(s) < 0.55) { x = p.x + (rnd(s) - 0.5) * 4; y = p.y + (rnd(s) - 0.5) * 4; } else { [x, y] = tileIn(s, o); }
      if (C.isOutside(s, x, y)) h.marks.push({ x, y, t: 2 });
    }
    for (const m of h.marks) { m.t -= dt; if (m.t <= 0 && !m.done) { m.done = true; m.boom = 0.3; if (Math.hypot(p.x - m.x, p.y - m.y) < 1.1 && !p.inDuct) { p.salud -= def.dmg; p.hit = 0.8; s.shake = 0.4; C.say(s, '¡Te alcanzó un micrometeorito!', 'bad'); } } if (m.boom > 0) m.boom -= dt; }
    h.marks = h.marks.filter((m) => !m.done || m.boom > 0);
    if (h.life <= 0 && !h.marks.length) { s.stats.solved++; C.say(s, 'La lluvia de micrometeoritos terminó.', 'ok'); return true; }
    return false;
  }
  if (def.type === 'camera') {
    if (!s.iaOn) return false;
    if (h.stun > 0) { h.stun -= dt; return false; }
    h.ph += dt * 0.7; h.dir = h.base + Math.sin(h.ph) * 1.0;
    const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy);
    let a = Math.atan2(dy, dx) - h.dir; a = Math.atan2(Math.sin(a), Math.cos(a));
    h.sees = !p.inDuct && !p.hidden && d < def.range * (p.crouch ? 0.75 : 1) && Math.abs(a) < 0.45 && C.los(s, h.x, h.y, p.x, p.y);
    if (h.sees && C.suspicious(s)) { if (!h.alarm) { spotted(s, h); h.alarm = true; } C.raise(s, 16 * dt); s.noise = { x: p.x, y: p.y, t: 4 }; } else h.alarm = false;
    return false;
  }
  if (def.type === 'blackout') {
    h.life -= dt;
    if (h.life > 0) return false;
    for (const [id, open, lock] of h.saved) { const d = s.map.doors[id]; if (d.lock === 'energia' || d.lock === 'cuarentena') { d.lock = lock; d.open = open || !lock; } }
    C.say(s, `${def.name} terminó en ${C.roomName(s, h.room)}.`, 'info'); return true;
  }
  return false;
}

// ---------- misiones con reloj ----------
const MISSIONS = [
  { id: 'caja', verb: 'Recuperar la caja negra', text: (r) => `Encuentra la caja negra del último accidente en ${r}. Tiene los datos que la IA borró.`, need: 3, time: 110 },
  { id: 'rele', verb: 'Sabotear el relé', text: (r) => `Corta el relé de vigilancia en ${r}: los drones quedarán sordos un rato.`, need: 4, time: 100 },
  { id: 'diario', verb: 'Leer el diario', text: (r) => `Alguien dejó un diario en ${r} con el código de una escotilla. Léelo antes de que lo encuentre la IA.`, need: 3, time: 90 },
  { id: 'baliza', verb: 'Encender la baliza', text: (r) => `Enciende la baliza de emergencia en ${r} para que la Tierra te escuche.`, need: 5, time: 120 },
];
function newMission(s) {
  const t = pick(s, MISSIONS); const night = C.isNight(s);
  const rooms = s.L.rooms.filter((r) => !r.outside && r.id !== 'dorm' && r.id !== C.playerRoom(s));
  const r = pick(s, rooms); const [x, y] = tileIn(s, r);
  const giver = pick(s, s.crew);
  s.vil.mission = { ...t, text: t.text(r.name), room: r.id, x, y, left: t.time + (night ? 20 : 0), prog: 0, holding: false, night, spot0: s.vil.spot, giver: giver.name };
  sfx(s, 'radio');
  C.flash(s, `📻 ${giver.name} por radio: "${t.text(r.name)}" Tienes ${t.time} s. ${night ? '(De noche: el doble de premio.)' : ''}`, 'warn');
}
function updateMission(s, dt) {
  const m = s.vil.mission; const p = s.p;
  m.left -= dt;
  if (m.left <= 0) return failMission(s, 'Se acabó el tiempo.');
  if (m.holding) {
    const near = Math.hypot(m.x - p.x, m.y - p.y) < 1.4 && !p.inDuct && !p.hidden;
    const hunted = [...s.drones.filter((d) => s.iaOn && d.mode === 'persigue'), ...s.vil.walkers.filter((w) => w.mode === 'persigue')].length > 0;
    if (!near) { m.holding = false; C.say(s, 'Te alejaste del objetivo: el progreso se pausa.', 'warn'); }
    else if (!hunted) m.prog += dt;
    if (m.prog >= m.need) winMission(s);
  }
}
function winMission(s) {
  const m = s.vil.mission; s.vil.mission = null; const p = s.p; const k = m.night ? 2 : 1;
  const rewards = [
    () => { s.alert = Math.max(0, s.alert - 25 * k); return `−${25 * k} de alerta`; },
    () => { p.conoc = Math.min(100, p.conoc + 6 * k); return `+${6 * k} conocimiento`; },
    () => { p.fuerza = Math.min(100, p.fuerza + 6 * k); return `+${6 * k} fuerza`; },
    () => { for (let i = 0; i < k; i++) C.give(s, 'chip'); return `${k} chip(s)`; },
    () => { C.give(s, k > 1 ? 'tarjeta' : 'bateria'); return k > 1 ? 'una tarjeta clonada' : 'una batería'; },
  ];
  let txt = pick(s, rewards)();
  if (m.id === 'rele') { for (const d of s.drones) d.stun = Math.max(d.stun, 25); txt += ' y los drones quedaron sordos 25 s'; }
  if (s.vil.spot === m.spot0) { s.alert = Math.max(0, s.alert - 10); txt += ' · ¡sin que te vieran! (−10 alerta)'; }
  s.stats.solved++; sfx(s, 'radio');
  C.flash(s, `MISIÓN CUMPLIDA: ${m.verb}. Premio: ${txt}.`, 'ok');
}
function failMission(s, why) {
  const m = s.vil.mission; s.vil.mission = null; if (!m) return;
  C.raise(s, 12, `Interferí la radio de ${m.giver}.`);
  C.flash(s, `MISIÓN FALLIDA (${m.verb}): ${why}`, 'bad');
}
