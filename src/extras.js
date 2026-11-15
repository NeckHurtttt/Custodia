// Mecánicas extra de LIFELINE: Rutina (mejoras 1–25): ruido, sombras, sospecha por grados, turnos que cambian,
// cansancio, hambre y sed, fugas de aire, tarjetas, testigos, trueques, desgaste, fallos en cadena, inspecciones,
// gravedad, huellas, diario, rastro de hackeo, racha de días perfectos y eventos de la tripulación.
import * as C from './core.js';
import { ITEMS } from './common.js';

// ---------- estado nuevo (partidas nuevas y guardadas) ----------
export function init(s) {
  for (const p of C.players(s)) { p.hambre ??= s.mode === 'noche' ? 70 : 100; p.sed ??= s.mode === 'noche' ? 70 : 100; p.vx ??= 0; p.vy ??= 0; }
  s.wear ??= {}; s.diary ??= []; s.prints ??= []; s.streak ??= 0; s.dayClean ??= true; s.inspect ??= null; s.crewEv ??= null; s.shiftDone ??= -1;
}
export function diary(s, text) { s.diary ??= []; if (s.diary.some((d) => d.text === text && d.day === s.day)) return; s.diary.push({ day: s.day, min: Math.floor(s.min), text }); if (s.diary.length > 40) s.diary.shift(); }

// ---------- 1 · ruido ----------
/** Un ruido en (x, y) que oye la vigilancia dentro de r casillas. */
export function noise(s, x, y, r = 5, t = 3) { if (!s.noise || (s.noise.r ?? 10) < r) s.noise = { x, y, t, r }; }

// ---------- 2 · sombras ----------
/** Luz de cada casilla (0 oscuro … 1 bajo una lámpara). Mismas lámparas que se dibujan en el piso. */
export function light(s, x, y) {
  const m = s.map; const W = s.L.W;
  if (!m.light) {
    m.light = new Float32Array(W * s.L.H).fill(0.5);
    s.L.rooms.forEach((r) => {
      if (r.outside) return; const lamps = Math.max(1, Math.round(r.w / 5));
      for (let yy = r.y; yy < r.y + r.h; yy++) for (let xx = r.x; xx < r.x + r.w; xx++) {
        let best = 0;
        for (let i = 0; i < lamps; i++) { const lx = r.x + (i + 0.5) * r.w / lamps, ly = r.y + r.h * 0.45, rad = Math.max(r.h, r.w / lamps) * 0.75; best = Math.max(best, 1 - Math.hypot(xx + 0.5 - lx, yy + 0.5 - ly) / rad); }
        m.light[yy * W + xx] = Math.max(0, best);
      }
    });
  }
  const tx = Math.floor(x), ty = Math.floor(y); if (tx < 0 || ty < 0 || tx >= W || ty >= s.L.H) return 0.5;
  return m.light[ty * W + tx];
}
export const inShadow = (s, p = s.p) => !p.inDuct && !C.isOutside(s, p.x, p.y) && C.roomAt(s, p.x, p.y) && light(s, p.x, p.y) < 0.12;

// ---------- 3 · sospecha por grados (lo usa updateDrones) ----------
/** Devuelve true si el vigía ya decidió perseguirte. Antes duda (?) e investiga. */
export function suspect(s, d, dt, sees, why) {
  const p = s.p; const dist = Math.hypot(p.x - d.x, p.y - d.y);
  if (!sees || !why) { d.sus = Math.max(0, (d.sus ?? 0) - dt * 0.45); return false; }
  if (d.mode === 'persigue' || s.final || dist < 2.2) { d.sus = 1; return true; }
  const rate = (why === 'herramienta' ? 0.9 : 1.6) * (1.5 - dist / 6.5) * (p.crouch ? 0.7 : 1);
  d.sus = Math.min(1, (d.sus ?? 0) + dt * Math.max(0.35, rate));
  d.dir += Math.atan2(Math.sin(Math.atan2(p.y - d.y, p.x - d.x) - d.dir), Math.cos(Math.atan2(p.y - d.y, p.x - d.x) - d.dir)) * Math.min(1, dt * 3);
  if (d.sus >= 1) return true;
  if (d.sus > 0.4 && d.mode === 'patrulla') { d.mode = 'investiga'; d.target = [p.x, p.y]; d.look = 2.5; d.path = null; }
  return false;
}
/** 4 · ¿Por qué le pareces raro? Lugar/hora prohibidos, o una herramienta a la vista de cerca. */
export function why(s, d) {
  if (C.suspicious(s)) return 'lugar';
  if (s.p.inv.some(C.isContraband) && Math.hypot(s.p.x - d.x, s.p.y - d.y) < 3) return 'herramienta';
  return null;
}

// ---------- 6 · turnos de vigilancia ----------
export function rotateShifts(s) {
  const n = s.L.routes.length; s.drones.forEach((d, i) => { d.route = (i + s.day) % n; d.rev = (s.day + i) % 2 === 1; d.wp = 0; d.path = null; });
  diary(s, `Día ${s.day}: los ${s.L.watcher}s cambiaron de ruta${s.drones.some((d) => d.rev) ? ' (algunos van al revés)' : ''}.`);
}

// ---------- 7 · cansancio ----------
export const tired = (p) => p.energia < 25;
export const speedMult = (s, p) => (tired(p) ? 0.8 : 1) * (p.hambre < 10 ? 0.85 : 1) * (p.inDuct ? 1.3 : 1);
/** Tiempo de los minijuegos: si estás agotado, tienes menos. */
export const focus = (s) => (tired(s.p) ? 0.75 : 1) * (s.p.sed < 15 ? 0.85 : 1);

// ---------- 8 · hambre y sed · 9 · fugas de aire · 28 · huellas ----------
export function tickPlayer(s, p, dt, dm, moving) {
  if (!s.cadet) {
    p.hambre = Math.max(0, p.hambre - dm * (p.sleep ? 0.025 : 0.045));
    p.sed = Math.max(0, p.sed - dm * (p.sleep ? 0.03 : 0.06));
    if (p.hambre < 15 || p.sed < 15) { p.energia = Math.max(0, p.energia - dm * 0.08); if (p.hambre <= 0 || p.sed <= 0) p.salud -= dm * 0.04; }
    if ((p.hambre < 15 || p.sed < 15) && !p.starveWarn) { p.starveWarn = true; C.flash(s, p.sed < 15 ? 'Tienes mucha sed: bebe agua en la mesa del comedor.' : 'Tienes hambre: no te saltes las comidas (07:00, 12:00, 19:00).', 'warn'); }
    if (p.hambre > 30 && p.sed > 30) p.starveWarn = false;
  }
  // fuga de aire en la sala: el oxígeno baja aunque estés adentro
  const leak = !p.inDuct && s.hazards.some((h) => h.def.type === 'pull' && h.room === C.roomIdAt(s, p.x, p.y));
  if (leak) { p.o2 = Math.max(0, p.o2 - dt * (C.has(s, 'traje') ? 0.5 : 7)); if (p.o2 <= 0) { p.salud -= 12 * dt; p.hit = 0.2; } return true; }
  // huellas en el polvo de Marte (agachado no dejas)
  if (s.L.theme === 'marte' && moving && !p.crouch && !p.inDuct) {
    p.printT = (p.printT ?? 0) - dt;
    if (p.printT <= 0) { p.printT = 0.3; p.foot = !p.foot; s.prints.push({ x: p.x + Math.cos(p.dir + Math.PI / 2) * (p.foot ? 0.12 : -0.12), y: p.y, dir: p.dir, t: 45 }); if (s.prints.length > 70) s.prints.shift(); }
  }
  return false;
}
/** Los vigías que patrullan siguen huellas frescas. */
function followPrints(s, dt) {
  for (const f of s.prints) f.t -= dt; while (s.prints.length && s.prints[0].t <= 0) s.prints.shift();
  if (!s.prints.length || !s.iaOn) return;
  const fresh = s.prints.filter((f) => f.t > 32); if (!fresh.length) return;
  const last = fresh[fresh.length - 1];
  for (const d of s.drones) {
    if (d.mode !== 'patrulla' || d.stun > 0 || (d.trackCd = (d.trackCd ?? 0) - dt) > 0) continue;
    const f = fresh.find((q) => Math.hypot(q.x - d.x, q.y - d.y) < 3.5 && C.los(s, d.x, d.y, q.x, q.y));
    if (f) { d.trackCd = 15; d.mode = 'investiga'; d.target = [last.x, last.y]; d.look = 3; d.path = null; d.alarmT = 0.8; C.say(s, `Un ${s.L.watcher} encontró tus huellas en el polvo y las sigue.`, 'warn'); }
  }
}

// ---------- 10 · tarjeta del bolsillo · 23 · compañero enfermo ----------
/** Hablar con alguien dormido o enfermo. Devuelve true si ya se resolvió. */
export function talkSpecial(s, c) {
  const asleep = (s.min >= 1320 || s.min < 300) && !c.moving && Math.hypot(c.x - (s.L.beds[s.crew.indexOf(c)]?.[0] ?? -9) - 0.5, c.y - (s.L.beds[s.crew.indexOf(c)]?.[1] ?? -9) - 0.5) < 1.2;
  if (asleep) {
    if (c.pickDay === s.day) { C.flash(s, `${c.name} duerme. Ya le revisaste los bolsillos esta noche.`, 'info'); return true; }
    c.pickDay = s.day;
    if (C.has(s, 'tarjeta')) { C.flash(s, `${c.name} duerme. Ya tienes una tarjeta.`, 'info'); return true; }
    if (C.rand(s) < 0.55 + (C.perk(s).quiet ? 0.2 : 0)) { if (C.give(s, 'tarjeta')) { C.flash(s, `Le sacaste la tarjeta de acceso a ${c.name} mientras dormía. Abre las escotillas con tarjeta.`, 'ok'); diary(s, `Robé la tarjeta de ${c.name}.`); } }
    else { c.trust = Math.max(-1, c.trust - 1); c.say = '¿¡Qué haces en mis cosas!?'; c.sayFor = 4; noise(s, c.x, c.y, 7); C.raise(s, 10, `${c.name} se despertó y gritó.`); }
    return true;
  }
  if (c.sick) {
    if (s.action) return true;
    s.action = { kind: 'cuidar', need: 3, t: 0, c }; C.say(s, `Cuidas a ${c.name}…`, 'info'); return true;
  }
  return false;
}
export function finishCare(s, a) { const c = a.c; c.sick = false; c.trust = Math.min(3, c.trust + 1); c.say = 'Gracias… ya me siento mejor.'; c.sayFor = 4; C.flash(s, `${c.name} se recuperó gracias a ti (+1 confianza).`, 'ok'); }

// ---------- 11 · testigos ----------
export function witness(s, c, dt) {
  if (c.betrayed || c.sick || !s.iaOn || s.illegal <= 0 || (c.witCd = (c.witCd ?? 0) - dt) > 0) return;
  const p = s.p; if (p.hidden || p.inDuct || Math.hypot(c.x - p.x, c.y - p.y) > 5 || !C.los(s, c.x, c.y, p.x, p.y)) return;
  c.witCd = 25; c.saw = 2.5;
  if (c.trust >= 2) { c.say = 'Yo no vi nada…'; c.sayFor = 3; s.alert = Math.max(0, s.alert - 3); }
  else if (c.trust <= 0 && C.rand(s) < 0.3) { c.say = 'Esto se lo cuento a la IA.'; c.sayFor = 3; C.raise(s, 6, `${c.name} me contó lo que hacías.`); }
  else { c.say = '¿Qué estás haciendo?'; c.sayFor = 3; }
}

// ---------- 12 · trueque: una pieza por un dato ----------
export function trade(s, c) {
  const i = s.p.inv.findIndex((x) => !ITEMS[x]?.tool && !(x in s.L.plan)); if (i < 0) return false;
  const [it] = s.p.inv.splice(i, 1);
  const tips = [];
  if (s.inspect && s.inspect.min > s.min) tips.push(`hoy a las ${C.clock(s.inspect.min)} ${s.L.ai} revisa los escondites`);
  if (s.events.length) tips.push(`cerca de las ${C.clock(s.events[0])} va a fallar algo en la base`);
  const r = s.drones.find((d) => d.rev); if (r) tips.push(`un ${s.L.watcher} hace su ronda al revés`);
  tips.push(`agachado no dejas huellas y casi no haces ruido`);
  const tip = tips[Math.floor(C.rand(s) * Math.min(tips.length, 3))];
  C.flash(s, `${c.name} acepta ${ITEMS[it].name} y te susurra: "${tip}".`, 'ok'); diary(s, `${c.name}: ${tip}.`); return true;
}

// ---------- 13 · desgaste de herramientas ----------
const USES = { destornillador: 6, mascara: 5, tarjeta: 8 };
export function wear(s, id) {
  if (!USES[id] || !C.has(s, id)) return; s.wear ??= {};
  s.wear[id] = (s.wear[id] ?? USES[id]) - 1;
  if (s.wear[id] <= 0) { C.take(s, id); delete s.wear[id]; C.flash(s, `Tu ${C.itemName(s, id).toLowerCase()} se rompió de tanto usarlo. Fabrica otro.`, 'bad'); }
  else if (s.wear[id] <= 2) C.say(s, `${C.itemName(s, id)}: le quedan ${s.wear[id]} usos.`, 'warn');
}
export const usesLeft = (s, id) => (USES[id] ? s.wear?.[id] ?? USES[id] : null);
export const resetWear = (s, id) => { if (USES[id] && s.wear) delete s.wear[id]; };

// ---------- 14 · fallos en cadena ----------
export function chain(s, name) {
  if (s.cadet || s.mode === 'noche') return;
  s.events.push(s.min + 35 + Math.floor(C.rand(s) * 30)); s.events.sort((a, b) => a - b);
  if (s.vital) { s.vital.energia = Math.max(0, s.vital.energia - 8); }
  C.say(s, `Falla en cadena: por ${name.toLowerCase()} sin resolver, otro sistema va a fallar pronto.`, 'bad'); diary(s, `${name} sin resolver → otra falla en camino.`);
}

// ---------- 15 · inspección sorpresa · 21 · racha · 23 · eventos de tripulación ----------
export function newDay(s) {
  if (s.cadet) return;
  if (s.dayClean) { s.streak++; if (s.streak >= 2) { s.alert = Math.max(0, s.alert - 10); s.grace = Math.max(s.grace, 25); C.flash(s, `🔥 ${s.streak} días perfectos seguidos: ${s.L.ai} confía más en ti (−10 alerta y 25 s de margen).`, 'ok'); } }
  else s.streak = 0;
  s.dayClean = true;
  rotateShifts(s);
  s.inspect = s.day >= 2 ? { min: 600 + Math.floor(C.rand(s) * 600), warned: false, done: false } : null;
  s.crew.forEach((c) => { c.sick = false; });
  s.crewEv = null;
  if (s.day >= 2 && C.rand(s) < 0.45) {
    if (C.rand(s) < 0.5) { const c = C.pick(s, s.crew.filter((x) => !x.betrayed)); if (c) { c.sick = true; s.crewEv = { kind: 'enfermo', who: c.name }; C.say(s, `${c.name} amaneció enfermo y se queda en cama. Cuidarlo (E) sube su confianza.`, 'warn'); diary(s, `Día ${s.day}: ${c.name} está enfermo.`); } }
    else { s.crewEv = { kind: 'pelea', min: 500 + Math.floor(C.rand(s) * 600), done: false }; }
  }
}
export function tick(s, dt, dm) {
  if (s.cadet) return;
  followPrints(s, dt);
  // inspección: aviso 1 h antes, después revisan tu escondite
  const ins = s.inspect;
  if (ins && !ins.done) {
    if (!ins.warned && s.min >= ins.min - 60) { ins.warned = true; C.say(s, `${s.L.ai}: Inspección de escondites a las ${C.clock(ins.min)}.`, 'ia'); diary(s, `Inspección a las ${C.clock(ins.min)}.`); }
    if (s.min >= ins.min) {
      ins.done = true; const tools = s.stash.filter(C.isContraband);
      if (tools.length >= 2 && s.alert > 25 && s.iaOn) { const it = C.pick(s, tools); s.stash.splice(s.stash.indexOf(it), 1); C.flash(s, `INSPECCIÓN: ${s.L.ai} revisó tu escondite y confiscó ${C.itemName(s, it)}. (Con 2+ herramientas y alerta alta, buscan.)`, 'bad'); s.sfx.push('alarma'); }
      else C.say(s, `${s.L.ai}: Inspección terminada. Sin novedades.`, 'ia');
    }
  }
  // cambio de turno a las 14:00: las rondas se invierten
  if (s.min >= 840 && s.shiftDone !== s.day && s.mode !== 'noche') { s.shiftDone = s.day; for (const d of s.drones) d.rev = !d.rev; C.say(s, `Cambio de turno: los ${s.L.watcher}s invierten su ronda.`, 'info'); }
  // pelea en el comedor: los vigías van a separarlos
  const ev = s.crewEv;
  if (ev?.kind === 'pelea' && !ev.done && s.min >= ev.min) {
    ev.done = true; const two = s.crew.filter((c) => !c.betrayed && !c.sick).slice(0, 2); if (two.length < 2) return;
    const r = s.L.rooms.find((x) => x.id === 'comedor') ?? s.L.rooms[0];
    two.forEach((c, i) => { c.distractT = { x: r.x + 2 + i, y: r.y + 2 }; c.busyT = 30; c.say = i ? '¡Te comiste mi ración!' : '¡Mentira!'; c.sayFor = 5; });
    for (const d of s.drones.filter((x) => x.stun <= 0).slice(0, 2)) { d.busy = 25; d.busyBy = two[0]; d.mode = 'patrulla'; }
    C.flash(s, `¡Pelea en el comedor entre ${two[0].name} y ${two[1].name}! Los ${s.L.watcher}s se distraen 25 s.`, 'warn'); s.sfx.push('alarma');
  }
}

// ---------- 17 · gravedad ----------
const GRIP = { estacion: 7, luna: 4.5, marte: 10 };
export function steer(s, p, tx, ty, dt) {
  const k = Math.min(1, dt * (GRIP[s.L.theme] ?? 12) * (p.crouch ? 1.6 : 1) * (p.inDuct ? 2 : 1));
  p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k;
  if (Math.abs(p.vx) < 0.02) p.vx = 0; if (Math.abs(p.vy) < 0.02) p.vy = 0;
}

// ---------- 20 · rastro de hackeo ----------
export function trace(s, o) {
  for (const d of s.drones) if (d.stun <= 0 && d.mode !== 'persigue') { d.mode = 'investiga'; d.target = [o.x + 0.5, o.y + 1.5]; d.look = 5; d.path = null; }
  C.say(s, `${s.L.ai} rastreó el intento de hackeo: los ${s.L.watcher}s van a esa terminal.`, 'bad');
}

// ---------- 18 · frentes ciegan cámaras ----------
export const frontBlinds = (s) => s.hazards.some((h) => h.def.type === 'front' && h.phase === 'barre');
