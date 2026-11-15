import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/core.js';
import * as Net from '../src/net.js';

const game = () => { const s = G.newGame('estacion', 11, 'normal', { coop: true }); s.events = []; return s; };

test('en línea: la foto del anfitrión se arma en el invitado con J2 activo', () => {
  const s = game(); for (let i = 0; i < 40; i++) G.update(s, 0.05, { dx: 1, dy: 0 }, { dx: 0, dy: 1 });
  s.ps[1].action = { kind: 'reparar', need: 5, t: 2, o: { x: 1 } };
  const { s: g, sfx } = Net.unpack(G, Net.pack(G, s, ['susto']));
  assert.deepEqual(sfx, ['susto']); assert.equal(g.p, g.ps[1]);
  assert.equal(g.ps[0].x, s.ps[0].x); assert.equal(g.ps[1].y, s.ps[1].y);
  assert.equal(g.ps[1].action.t, 2); assert.equal(g.day, s.day); assert.equal(g.map.doors.length, s.map.doors.length);
});

test('en línea: el minijuego pendiente y la captura viajan en la foto', () => {
  const s = game(); s.p = s.ps[1]; G.escort(s, s.ps[1].x + 3, s.ps[1].y, { x: 2, y: 3 });
  s.pending = { kind: 'protocolo', id: 'ia', by: 1 };
  const { s: g } = Net.unpack(G, Net.pack(G, s));
  assert.equal(g.pending.kind, 'protocolo'); assert.equal(g.pending.by, 1);
  assert.equal(g.escort.p, g.ps[1]); assert.equal(g.escort.phase, 'agarre'); assert.equal(g.ps[1].x, s.ps[1].x);
});

test('en línea: las órdenes del invitado se aplican solo al J2', () => {
  const s = game(); s.p = s.ps[0];
  s.ps[1].inv = ['cinta']; s.ps[0].inv = ['cinta'];
  Net.applyOp(G, s, 'dropItem', [0]);
  assert.equal(s.ps[1].inv.length, 0); assert.equal(s.ps[0].inv.length, 1); assert.equal(s.p, s.ps[0]);
  Net.applyOp(G, s, 'newGame', []); Net.applyOp(G, s, 'update', []); // no permitidas: no pasa nada
  assert.equal(s.ps[0].inv.length, 1);
});

test('en línea: el invitado solo resuelve sus propios minijuegos', () => {
  const s = game();
  s.pending = { kind: 'escondite', by: 0 }; Net.applyOp(G, s, 'clearPending'); assert.ok(s.pending);
  s.pending.by = 1; Net.applyOp(G, s, 'clearPending'); assert.equal(s.pending, null);
  s.pending = { kind: 'protocolo', id: 'ia', by: 0 }; Net.applyOp(G, s, 'resolveProtocol', [true]); assert.ok(s.pending); assert.ok(s.iaOn);
  s.pending.by = 1; Net.applyOp(G, s, 'resolveProtocol', [true]); assert.equal(s.pending, null); assert.equal(s.iaOn, false);
});

test('en línea: códigos de sala de 5 caracteres sin letras confusas', () => {
  const c = Net.newCode(); assert.match(c, /^[A-HJ-NP-Z2-9]{5}$/);
  assert.equal(Net.cleanCode(' ab-c d9xx'), 'ABCD9');
});
