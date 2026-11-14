import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../src/academia.js';
import * as G from '../src/core.js';
import { MISSIONS, FASES, EVAL } from '../src/cadete-data.js';
import { LOCS } from '../src/locs.js';
import { HAZARDS, ITEMS } from '../src/common.js';

let mem = null; A.useStore({ load: () => (mem ? JSON.parse(mem) : null), save: (d) => { mem = JSON.stringify(d); } });
const goRoom = (s, p, id) => { const r = s.L.rooms.find((x) => x.id === id); Object.assign(p, { x: r.x + 1.5, y: r.y + 1.5 }); };

test('todas las misiones usan salas, peligros y herramientas que existen', () => {
  for (const m of MISSIONS) {
    const L = LOCS[FASES[m.fase].loc]; const has = (id) => L.rooms.some((r) => r.id === id);
    for (const st of m.steps) {
      for (const k of ['room', 'leer', 'meter']) if (st[k]) assert.ok(has(st[k]), `${m.id}: falta la sala ${st[k]}`);
      if (st.t === 'peligro') { assert.ok(HAZARDS[st.kind], `${m.id}: peligro ${st.kind}`); assert.ok(ITEMS[HAZARDS[st.kind].tool], `${m.id}: herramienta`); }
      if (st.game?.type === 'quiz') for (const q of st.game.qs) assert.ok(q.ok < q.ops.length);
    }
  }
  for (const qs of Object.values(EVAL)) for (const q of qs) assert.ok(q.ok < q.ops.length);
});

test('misión 1 completa en solitario: pasos, minijuego, puntaje y perfil', () => {
  mem = null; A.newCadet('Ana', { color: '#f0f' }, '5B');
  const s = A.startMission('m1'); const p = s.p;
  assert.equal(s.vil, null); assert.equal(s.drones.length, 0);
  let req = null;
  for (const st of A.mission('m1').steps) {
    goRoom(s, p, st.room); req = A.tick(s, 1);
    if (st.t === 'juego') { assert.equal(req.open, 'juego'); A.finishGame(s, { ok: 2, total: 2 }); }
  }
  assert.ok(s.cadet.done);
  const sc = A.score(s); assert.ok(sc.pass); assert.equal(sc.crit.equipo, null);
  const r = A.applyResult(s, sc); assert.ok(r.xp > 100);
  const c = A.active(); assert.ok(A.passed(c, 'm1')); assert.ok(A.missionUnlocked(c, 'm2')); assert.ok(!A.unlocked(c, 'luna'));
});

test('misión de fuego: el peligro aparece, se da el extintor y el protocolo lo resuelve', () => {
  const s = A.startMission('m2'); const p = s.p;
  goRoom(s, p, 'nodo'); assert.equal(A.tick(s, 1).open, 'juego'); A.finishGame(s, { ok: 5, total: 5 });
  A.tick(s, 0.1); const h = s.cadet.hz; assert.ok(h && G.has(s, 'extintor'));
  Object.assign(p, { x: (h.tiles[0] % s.L.W) + 0.5, y: Math.floor(h.tiles[0] / s.L.W) + 0.5 });
  G.interact(s); assert.equal(s.pending?.id, 'fuego'); G.resolveProtocol(s, true);
  A.tick(s, 0.1); assert.equal(s.cadet.step, 2); assert.equal(s.cadet.hzFail, 0);
});

test('cooperativo: los roles mandan y el código necesita a los dos a la vez', () => {
  const s = A.startMission('m3', { coop: true }); const [a, b] = s.ps;
  goRoom(s, b, 'nodo'); A.tick(s, 1); assert.equal(s.cadet.step, 1);
  assert.equal(A.tick(s, 1), null, 'J2 no es de comunicaciones');
  goRoom(s, a, 'nodo'); const r = A.tick(s, 1); assert.equal(r.player, 0); A.finishGame(s, { ok: 4, total: 4 }, 0);
  A.tick(s, 1); A.finishGame(s, { ok: 3, total: 3 }, 0);
  A.tick(s, 0.1); assert.ok(s.cadet.code);
  goRoom(s, a, 'lab'); goRoom(s, b, 'nodo'); assert.ok(A.codeVisible(s));
  const q = A.tick(s, 1); assert.equal(q.open, 'codigo'); assert.equal(q.player, 1);
  assert.equal(A.finishGame(s, { ok: 0, total: 1 }, 1), false);
  A.tick(s, 1); A.finishGame(s, { ok: 1, total: 1 }, 1); assert.ok(s.cadet.done);
  const sc = A.score(s); assert.ok(sc.crit.equipo != null);
});

test('panel del profesor: CSV, importar y errores frecuentes', () => {
  const c = A.active(); c.missions.m2 = { best: 50, tries: 2, errors: { 'Checklist: FUEGO': 2 } };
  const n = A.importCadets({ cadets: { x1: { id: 'x1', nick: 'Beto', clase: '5B', xp: 10, secs: 60, missions: { m2: { best: 40, errors: { 'Checklist: FUEGO': 1 } } }, skills: {}, medals: [], pre: {}, post: {} } } });
  assert.equal(n, 1);
  const all = Object.values(A.data().cadets); assert.ok(A.csv(all).includes('Beto'));
  assert.ok(A.topErrors([c, all.find((x) => x.id === 'x1')])[0][0].includes('FUEGO'));
  assert.equal(A.rank(0).id, 'aspirante'); assert.equal(A.rank(900).id, 'cadete1');
  assert.equal(A.gradeEval('estacion', [0, 1, 0, 0]), 4);
});
