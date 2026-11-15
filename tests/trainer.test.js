import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/core.js';
import * as T from '../src/trainer.js';
import { LOCS } from '../src/locs.js';

test('entrenamiento: panel de alarmas con la respuesta entre 3 opciones', () => {
  const q = T.alarmQuiz('fuego'); assert.equal(q.lvl, 'rojo'); assert.equal(q.options.length, 3); assert.ok(q.options.includes(q.answer));
  assert.equal(T.alarmQuiz('plaga').lvl, 'amarillo'); assert.equal(T.alarmQuiz('chatarra'), null);
});

test('entrenamiento: radio bien formada; en Marte se actúa sin esperar a la Tierra', () => {
  const e = T.radioQuiz(LOCS.estacion, 'incendio', 'Laboratorio'); assert.match(e.answer, /Houston, .*incendio en Laboratorio/); assert.equal(e.options.length, 3);
  const m = T.radioQuiz(LOCS.marte, 'grieta', 'Hangar'); assert.match(m.answer, /retraso/); assert.ok(m.mars);
  for (const o of m.options) if (o !== m.answer) assert.ok(m.why[o]);
});

test('entrenamiento: soporte vital baja con problemas, la base sufre en cero y se recupera al resolver', () => {
  const s = G.newGame('estacion', 3); s.hazards = [{ kind: 'fuga' }];
  T.tickVital(s, 900); assert.equal(s.vital.o2, 0); assert.equal(s.vital.agua, 100);
  const i0 = s.integ; assert.deepEqual(T.tickVital(s, 10), ['o2']); assert.ok(s.integ < i0);
  T.restoreVital(s, 'fuga'); assert.ok(s.vital.o2 >= 20);
});

function edge(s) { // casilla de adentro con el exterior justo a la derecha
  for (const d of s.map.doors) d.open = true;
  for (let y = 1; y < 60; y++) for (let x = 1; x < 90; x++)
    if (G.walkable(s, x, y) && !G.isOutside(s, x + 0.5, y + 0.5) && G.walkable(s, x + 1, y) && G.isOutside(s, x + 1.5, y + 0.5)) return [x, y];
}
const calm = (s) => { s.drones = []; s.events = []; s.vil = null; s.hazards = []; s.crew = []; };

test('entrenamiento EVA: chequeo del traje, pre-respirar quieto y salir sin castigo', () => {
  const s = G.newGame('luna', 5); calm(s); s.p.inv.push('traje');
  const [x, y] = edge(s); Object.assign(s.p, { x: x + 0.7, y: y + 0.5 });
  for (let i = 0; i < 10 && !s.pending; i++) G.update(s, 0.05, { dx: 1, dy: 0 });
  assert.equal(s.pending?.kind, 'eva'); assert.ok(!G.isOutside(s));
  G.resolveEva(s, true); assert.equal(s.action.kind, 'prerespira');
  for (let i = 0; i < 140; i++) G.update(s, 0.05, { dx: 0, dy: 0 });
  assert.equal(s.p.evaDay, s.day); const hp = s.p.salud;
  for (let i = 0; i < 10; i++) G.update(s, 0.05, { dx: 1, dy: 0 });
  assert.ok(G.isOutside(s)); assert.ok(s.p.salud >= hp - 1); assert.deepEqual(s.train.eva, [1, 1]);
});

test('entrenamiento EVA: salir sin terminar la pre-respiración castiga y queda en el informe', () => {
  const s = G.newGame('marte', 5); calm(s); s.p.inv.push('traje');
  const [x, y] = edge(s); Object.assign(s.p, { x: x + 0.7, y: y + 0.5 });
  for (let i = 0; i < 10 && !s.pending; i++) G.update(s, 0.05, { dx: 1, dy: 0 });
  G.resolveEva(s, true); const hp = s.p.salud;
  for (let i = 0; i < 10; i++) G.update(s, 0.05, { dx: 1, dy: 0 });
  assert.ok(G.isOutside(s)); assert.ok(s.p.salud <= hp - 19);
  const r = T.report(s); assert.match(r.cause.text, /pre-respiración/); assert.ok(r.improve.includes('Salidas (EVA)'));
});

test('entrenamiento: los protocolos cuentan en el informe y se guardan', () => {
  const s = G.newGame('estacion', 9); s.hazards = []; G.spawnHazard(s, 'fuego');
  const h = s.hazards[0]; s.pending = { kind: 'protocolo', id: 'fuego', h }; G.resolveProtocol(s, true);
  G.trainRecord(s, 'alarma', false, 'Confundir la alarma'); G.trainRecord(s, 'radio', true);
  const r = T.report(G.revive(JSON.parse(G.serialize(s))));
  assert.deepEqual(r.areas.map((a) => a.k), ['alarma', 'radio', 'proc']); assert.ok(r.good.includes('Procedimientos'));
});
