import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/core.js';

test('cooperativo: dos jugadores se mueven cada uno con su control', () => {
  const s = G.newGame('estacion', 7, 'normal', { coop: true }); s.drones = []; s.events = [];
  assert.equal(s.ps.length, 2); assert.equal(s.drones.length, 0);
  const [a, b] = s.ps; const ax = a.x, by = b.y;
  for (let i = 0; i < 10; i++) G.update(s, 0.05, { dx: 1, dy: 0 }, { dx: 0, dy: -1 });
  assert.ok(a.x > ax); assert.ok(b.y < by); assert.equal(s.p, a);
});

test('cooperativo: el plan cuenta las piezas de los dos y cada uno tiene su barra de acción', () => {
  const s = G.newGame('estacion', 7, 'normal', { coop: true });
  s.ps[0].inv.push('codigo', 'celda'); s.ps[1].inv.push('traje', 'llave');
  assert.ok(G.planDone(s));
  s.p = s.ps[0]; s.action = { kind: 'x', need: 9, t: 0 }; s.p = s.ps[1];
  assert.equal(s.action, null); s.p = s.ps[0]; assert.equal(s.action.kind, 'x');
});

test('cooperativo: si uno cae, el otro lo levanta con E; si caen los dos, se pierde', () => {
  const s = G.newGame('estacion', 7, 'normal', { coop: true }); s.drones = []; s.events = []; s.vil = null;
  const [a, b] = s.ps; b.salud = -5; G.update(s, 0.05);
  assert.ok(b.down); assert.ok(!s.over);
  Object.assign(a, { x: b.x + 0.5, y: b.y }); s.p = a; G.interact(s);
  assert.ok(!b.down); assert.ok(b.salud > 0);
  a.salud = -1; b.salud = -1; G.update(s, 0.05); assert.ok(s.over);
});

test('cooperativo: el dron persigue al jugador más cercano y se guarda bien', () => {
  const s = G.newGame('estacion', 7, 'normal', { coop: true }); const d = s.drones[0];
  Object.assign(s.ps[1], { x: d.x + 0.3, y: d.y }); G.focus(s, d); assert.equal(s.p, s.ps[1]);
  const r = G.revive(JSON.parse(G.serialize(s)));
  assert.equal(r.ps.length, 2); assert.equal(r.p, r.ps[0]); assert.equal(r.action, null);
});
