// Lógica de la ACADEMIA DE CADETES (sin pantalla, se puede probar con node --test).
// Perfiles de cadete, rangos, puntaje por criterios, medallas educativas y el motor de misiones sobre el juego.
import { MISSIONS, RANKS, SKILLS, FASES, MEDALLAS, EVAL, ROLES } from './cadete-data.js';
import * as G from './core.js';
import { HAZARDS } from './common.js';

export const mission = (id) => MISSIONS.find((m) => m.id === id);
export const missionsOf = (fase) => MISSIONS.filter((m) => m.fase === fase);
export const PASS = 60, PASS_EXAM = 70;

// ---------- perfiles (guardados en el navegador; sin datos personales: solo un apodo) ----------
const KEY = 'lfr.academia';
let store = { load: () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }, save: (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* sin almacenamiento */ } } };
export function useStore(st) { store = st; }
export function data() { const d = store.load() ?? {}; d.cadets ??= {}; d.active ??= null; d.opts ??= {}; return d; }
export function saveData(d) { store.save(d); }
export function active(d = data()) { return d.cadets[d.active] ?? null; }

export function newCadet(nick, avatar = {}, clase = '') {
  const d = data(); const id = 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  d.cadets[id] = { id, nick: String(nick).trim().slice(0, 18) || 'Cadete', avatar: { color: avatar.color ?? '#3d7bff', key: avatar.key ?? nick }, clase: String(clase).trim().toUpperCase().slice(0, 10), xp: 0, secs: 0, missions: {}, skills: Object.fromEntries(Object.keys(SKILLS).map((k) => [k, 0])), medals: [], pre: {}, post: {}, created: Date.now() };
  d.active = id; saveData(d); return d.cadets[id];
}
export function updateCadet(fn) { const d = data(); const c = active(d); if (!c) return null; fn(c, d); saveData(d); return c; }

export function rank(xp) { let r = RANKS[0]; for (const x of RANKS) if (xp >= x.xp) r = x; return r; }
export function nextRank(xp) { return RANKS.find((r) => r.xp > xp) ?? null; }
export const passed = (c, id) => (c.missions[id]?.best ?? 0) >= (mission(id).exam ? PASS_EXAM : PASS);
export const phaseDone = (c, fase) => missionsOf(fase).every((m) => passed(c, m.id));
export function unlocked(c, fase) { const order = Object.keys(FASES); const i = order.indexOf(fase); return i <= 0 || phaseDone(c, order[i - 1]); }
export function missionUnlocked(c, id) { const m = mission(id); if (!unlocked(c, m.fase)) return false; const list = missionsOf(m.fase); const i = list.indexOf(m); return i === 0 || passed(c, list[i - 1].id); }

/** Evaluación de antes/después de una fase. answers = índices elegidos. */
export function gradeEval(fase, answers) { const qs = EVAL[fase]; return qs.reduce((a, q, i) => a + (answers[i] === q.ok ? 1 : 0), 0); }
export function recordEval(fase, when, score) { return updateCadet((c) => { c[when][fase] = score; if (when === 'post' && (c.post[fase] - (c.pre[fase] ?? c.post[fase])) >= 2 && !c.medals.includes('mejora')) c.medals.push('mejora'); }); }

// ---------- motor de misión sobre una partida del juego ----------
/** Crea la partida para una misión: sin villanos, sin drones, sin alerta; puertas abiertas; reloj quieto. */
export function startMission(id, { coop = false, seed = 4242, roles = null } = {}) {
  const m = mission(id); const loc = FASES[m.fase].loc;
  const s = G.newGame(loc, seed, 'facil', { coop });
  s.cadet = { id, step: 0, t: 0, stepT: 0, stepTimes: [], games: [], notes: [], dmg: 0, hzFail: 0, byPlayer: [0, 0], code: null, reader: null, waiting: false, done: false, exam: !!m.exam, roles: roles ?? (coop ? defaultRoles() : null), hp: G.players(s).map((p) => p.salud), entered: -1 };
  s.vil = null; s.drones = []; s.events = []; s.hazards = []; s.alert = 0; s.min = 600; s.crew = [];
  s.log = []; s.block = s.L.schedule.indexOf(G.block(s)); s.blockStart = 600; s.checked = true; s.iaName = 'INSTRUCTORA';
  G.say(s, `Academia: ${m.name}. ¡Suerte, cadete!`, 'ok');
  for (const d of s.map.doors) { d.lock = null; d.open = true; }
  for (const p of G.players(s)) { p.energia = 100; p.inv = []; }
  return s;
}
export function defaultRoles() { return { comandante: 0, comunicaciones: 0, ingeniero: 1, medico: 1 }; }
/** Qué jugadores pueden hacer el paso (en solitario, siempre el único). */
export function eligible(s, st) { const ps = G.players(s); if (!s.ps || !st.rol) return ps; return [ps[s.cadet.roles?.[st.rol] ?? ROLES[st.rol].player]]; }
export const roleOf = (s, i) => (s.cadet?.roles ? Object.entries(s.cadet.roles).filter(([, v]) => v === i).map(([k]) => k) : []);
const inRoom = (s, p, room) => !p.down && G.roomIdAt(s, p.x, p.y) === room;
export const currentStep = (s) => mission(s.cadet.id).steps[s.cadet.step] ?? null;

function enterStep(s) {
  const c = s.cadet; const st = currentStep(s); c.entered = c.step; c.stepT = 0;
  if (!st) return;
  if (st.t === 'peligro') {
    const h = G.spawnHazard(s, st.kind, st.room); c.hz = h; c.solved0 = s.stats.solved;
    const tool = HAZARDS[st.kind].tool; const who = eligible(s, st)[0];
    if (tool && !who.inv.includes(tool)) who.inv.push(tool);
  }
  if (st.t === 'codigo') { c.code = String(1000 + Math.floor(G.rand(s) * 9000)); c.reader = null; }
}
function advance(s, who = 0) {
  const c = s.cadet; c.stepTimes.push({ i: c.step, t: c.stepT, who }); c.byPlayer[who] = (c.byPlayer[who] ?? 0) + 1;
  c.step++; c.waiting = false;
  if (!currentStep(s)) { c.done = true; return; }
  enterStep(s);
}

/**
 * Avanza la misión un cuadro. Devuelve un pedido para la pantalla:
 * { open: 'juego', st, player } para abrir un minijuego, { open: 'codigo', st, player } para marcar el código, o null.
 */
export function tick(s, dt) {
  const c = s.cadet; if (!c || c.done || s.over) return null;
  if (c.entered !== c.step) enterStep(s);
  s.min = 600; s.alert = 0;
  c.t += dt; c.stepT += dt;
  G.players(s).forEach((p, i) => { const d = (c.hp[i] ?? p.salud) - p.salud; if (d > 0) c.dmg += d; c.hp[i] = p.salud; p.energia = Math.max(p.energia, 60); });
  if (c.cool > 0) { c.cool -= dt; return null; }
  const st = currentStep(s); if (!st || c.waiting) return null;
  const el = eligible(s, st); const ps = G.players(s);
  if (st.t === 'ir') { const p = el.find((q) => inRoom(s, q, st.room)); if (p) advance(s, ps.indexOf(p)); return null; }
  if (st.t === 'juego') { const p = el.find((q) => inRoom(s, q, st.room)); if (p) { c.waiting = true; return { open: 'juego', st, player: ps.indexOf(p) }; } return null; }
  if (st.t === 'peligro') {
    if (!s.hazards.includes(c.hz)) {
      const ok = s.stats.solved > c.solved0;
      if (!ok) { c.hzFail++; c.notes.push(`El peligro "${HAZARDS[st.kind].name}" se resolvió solo o se perdió la sala: hay que actuar más rápido.`); }
      c.games.push({ kind: 'peligro', ok: ok ? 1 : 0, total: 1, tag: `${st.kind}` });
      const who = el[0]; advance(s, ps.indexOf(who));
    }
    return null;
  }
  if (st.t === 'codigo') {
    const reader = ps.find((q) => inRoom(s, q, st.leer)); if (reader) c.reader = ps.indexOf(reader);
    if (c.reader == null) return null;
    // En cooperativo el que lee tiene que SEGUIR leyendo mientras el otro marca: trabajo en equipo de verdad.
    const writer = s.ps ? ps.find((q, i) => i !== c.reader && inRoom(s, q, st.meter) && inRoom(s, ps[c.reader], st.leer)) : ps.find((q) => inRoom(s, q, st.meter));
    if (writer) { c.waiting = true; return { open: 'codigo', st, player: ps.indexOf(writer) }; }
  }
  return null;
}
/** ¿El código se ve ahora? (solo mientras alguien está en la sala de lectura). */
export function codeVisible(s) { const st = currentStep(s); return st?.t === 'codigo' && G.players(s).some((p) => inRoom(s, p, st.leer)); }

/** Resultado de un minijuego: { ok, total, notes: [], tag, comm } */
export function finishGame(s, res, player = 0) {
  const c = s.cadet; const st = currentStep(s);
  c.games.push({ kind: st.game?.type ?? st.t, ok: res.ok, total: res.total, comm: !!(st.rol === 'comunicaciones' || res.comm), tag: res.tag ?? st.game?.title ?? st.txt, calc: st.game?.type === 'numero' });
  for (const n of res.notes ?? []) c.notes.push(n);
  if (st.t === 'codigo' && res.ok < res.total) { c.waiting = false; c.cool = 1.5; c.notes.push('El código marcado no coincidía: hay que leer con atención y repetir en voz alta.'); return false; }
  advance(s, player); return true;
}
export function cancelGame(s) { if (s.cadet) { s.cadet.waiting = false; s.cadet.cool = 4; } }

/** Puntaje por criterios (0–100 cada uno) y total. */
export function score(s) {
  const c = s.cadet; const m = mission(c.id);
  const sum = (arr) => arr.reduce((a, g) => [a[0] + g.ok, a[1] + g.total], [0, 0]);
  const [ok, tot] = sum(c.games); const precision = tot ? Math.round((ok / tot) * 100) : 100;
  const comm = c.games.filter((g) => g.comm); const [cok, ctot] = sum(comm);
  const tiempo = Math.round(c.t <= m.par ? 100 : Math.max(30, 100 - ((c.t - m.par) / m.par) * 100));
  const seguridad = Math.round(Math.max(0, 100 - c.dmg * 0.8 - c.hzFail * 20));
  const totalSteps = c.byPlayer.reduce((a, b) => a + b, 0) || 1;
  const equipo = s.ps ? Math.round(Math.max(30, 100 - (Math.abs((c.byPlayer[0] ?? 0) - (c.byPlayer[1] ?? 0)) / totalSteps) * 100)) : null;
  const comunicacion = ctot ? Math.round((cok / ctot) * 100) : null;
  const crit = { precision, seguridad, tiempo, equipo, comunicacion };
  const W = { precision: 0.35, seguridad: 0.25, tiempo: 0.15, equipo: 0.15, comunicacion: 0.1 };
  let a = 0, w = 0; for (const [k, v] of Object.entries(crit)) if (v != null) { a += v * W[k]; w += W[k]; }
  const total = Math.round(a / w);
  const pass = total >= (m.exam ? PASS_EXAM : PASS);
  // comentarios concretos de tiempo: el paso más lento
  const slow = [...c.stepTimes].sort((x, y) => y.t - x.t)[0]; const notes = [...c.notes];
  if (slow && slow.t > (m.par / m.steps.length) * 1.4) notes.unshift(`Tardaste ${Math.round(slow.t)} s en: "${stripTags(m.steps[slow.i].txt)}". Objetivo: ~${Math.round(m.par / m.steps.length)} s por paso.`);
  if (c.dmg > 10) notes.push(`Recibiste ${Math.round(c.dmg)} de daño: acércate a los peligros solo con la herramienta lista.`);
  if (!notes.length) notes.push('¡Misión limpia! Sin errores que comentar.');
  return { crit, total, pass, notes, time: Math.round(c.t), byPlayer: c.byPlayer, coop: !!s.ps };
}
const stripTags = (t) => String(t).replace(/<[^>]+>/g, '');

/** Guarda el resultado en el perfil activo: mejor nota, XP, habilidades, errores frecuentes, medallas. */
export function applyResult(s, sc) {
  const c0 = s.cadet; const m = mission(c0.id); const gained = []; let xp = 0; let rankUp = null;
  updateCadet((c) => {
    const rec = (c.missions[m.id] ??= { best: 0, tries: 0, errors: {}, last: 0 });
    const firstPass = sc.pass && !(rec.best >= (m.exam ? PASS_EXAM : PASS));
    rec.tries++; rec.last = sc.total; rec.best = Math.max(rec.best, sc.total); rec.when = Date.now();
    for (const g of c0.games) if (g.ok < g.total) rec.errors[g.tag] = (rec.errors[g.tag] ?? 0) + 1;
    c.secs += sc.time;
    xp = Math.round(sc.total * (sc.pass ? 2 : 0.5)) + (firstPass ? 50 : 0);
    const before = rank(c.xp); c.xp += xp; const after = rank(c.xp); if (after.id !== before.id) rankUp = after;
    for (const [k, v] of Object.entries(m.skills)) c.skills[k] = Math.min(100, (c.skills[k] ?? 0) + Math.round(v * sc.total / 100));
    const award = (id) => { if (!c.medals.includes(id)) { c.medals.push(id); gained.push(MEDALLAS.find((x) => x.id === id)); } };
    if (c0.games.some((g) => g.kind === 'orden' && g.ok === g.total)) award('sin-errores');
    if (m.id === 'm2' && sc.total >= 90) award('fuego');
    const comm = c0.games.filter((g) => g.comm); if (comm.length && comm.every((g) => g.ok === g.total)) award('radio');
    const calc = c0.games.filter((g) => g.calc); if (calc.length && calc.every((g) => g.ok === g.total)) award('calculo');
    if (sc.pass && sc.time <= m.par) award('rapido');
    if (sc.coop && sc.crit.equipo >= 70 && sc.pass) award('equipo');
    if (m.id === 'm6' && c0.games.find((g) => g.kind === 'orden')?.ok === 4) award('medico');
    if (phaseDone(c, 'estacion')) award('fase1'); if (phaseDone(c, 'luna')) award('fase2'); if (phaseDone(c, 'marte')) award('fase3');
    if (m.exam && sc.pass) award('examen');
  });
  return { xp, gained, rankUp };
}

/** Juntar perfiles de otros dispositivos (para el panel del profesor). */
export function importCadets(json) {
  const inc = typeof json === 'string' ? JSON.parse(json) : json; const list = inc.cadets ?? inc; const d = data(); let n = 0;
  for (const c of Object.values(list)) { if (!c?.id || !c.missions) continue; const cur = d.cadets[c.id]; if (!cur || (c.xp ?? 0) >= (cur.xp ?? 0)) { d.cadets[c.id] = c; n++; } }
  saveData(d); return n;
}
/** Errores más repetidos de un grupo de cadetes. */
export function topErrors(cadets, n = 5) {
  const m = {}; for (const c of cadets) for (const [mid, r] of Object.entries(c.missions)) for (const [tag, k] of Object.entries(r.errors ?? {})) { const key = `${mission(mid)?.name ?? mid} · ${tag}`; m[key] = (m[key] ?? 0) + k; }
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
}
export function csv(cadets) {
  const head = ['apodo', 'clase', 'rango', 'xp', 'minutos', ...MISSIONS.map((m) => m.id), ...Object.keys(SKILLS), ...Object.keys(FASES).flatMap((f) => [`pre_${f}`, `post_${f}`])];
  const rows = cadets.map((c) => [c.nick, c.clase, rank(c.xp).name, c.xp, Math.round(c.secs / 60), ...MISSIONS.map((m) => c.missions[m.id]?.best ?? ''), ...Object.keys(SKILLS).map((k) => c.skills[k] ?? 0), ...Object.keys(FASES).flatMap((f) => [c.pre[f] ?? '', c.post[f] ?? ''])]);
  return [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
}
