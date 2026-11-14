import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/core.js';
import { ROOMS, OBJECTS, GRATES, DRONE_ROUTES, W } from '../src/data.js';

const fresh = () => G.newGame(1234);

test('todas las salas, objetos y rutas de drones se pueden alcanzar', () => {
  const s = fresh();
  for (const d of s.map.doors) d.open = true;
  const from = [3, 3];
  for (const r of ROOMS) assert.ok(G.path(s, ...from, r.x + 1, r.y + 1, 'd'), `no se llega a ${r.name}`);
  for (const o of OBJECTS) assert.equal(s.map.grid[o.y * W + o.x], 1, `objeto ${o.t} fuera del piso en ${o.x},${o.y}`);
  for (const route of DRONE_ROUTES) for (const [x, y] of route) assert.ok(G.path(s, ...from, x, y, 'd'), `ruta de dron rota en ${x},${y}`);
  for (const [x, y] of GRATES) assert.equal(s.map.duct[y * W + x], 1, `rejilla ${x},${y} sin conducto`);
});

test('las salas restringidas empiezan cerradas con llave', () => {
  const s = fresh();
  for (const id of ['ia', 'esclusa', 'capsula']) assert.ok(s.map.doors.some((d) => d.room === id && d.lock), id);
  assert.ok(s.map.doors.filter((d) => d.lock).every((d) => !d.open));
});

test('los conductos conectan todas las rejillas', () => {
  const s = fresh(); s.p.inDuct = true;
  const seen = new Set(); const q = [GRATES[0]]; seen.add(GRATES[0].join());
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = [x + dx, y + dy]; if (G.walkable(s, ...k) && !seen.has(k.join())) { seen.add(k.join()); q.push(k); } } }
  for (const g of GRATES) assert.ok(seen.has(g.join()), `rejilla ${g} desconectada`);
});

test('el tiempo avanza y cambia el día', () => {
  const s = fresh(); s.drones = [];
  for (let i = 0; i < 2000 && s.day === 1; i++) G.update(s, 0.5);
  assert.equal(s.day, 2);
});

test('faltar al pase de lista sube la alerta', () => {
  const s = fresh(); s.drones = []; s.min = 365; s.block = -1;
  Object.assign(s.p, { x: 5.5, y: 14.5 }); // en el comedor
  for (let i = 0; i < 40; i++) G.update(s, 0.25);
  assert.ok(s.alert > 15, `alerta ${s.alert}`);
});

test('un dron que te ve de noche fuera del dormitorio te persigue', () => {
  const s = fresh(); s.min = 1400; s.block = -1;
  Object.assign(s.p, { x: 19.5, y: 13.5 });
  const d = s.drones[0]; Object.assign(d, { x: 17.5, y: 13.5, dir: 0 });
  assert.ok(G.canSee(s, d)); assert.ok(G.suspicious(s));
  G.update(s, 0.1);
  assert.equal(d.mode, 'persigue'); assert.ok(s.alert > 0);
});

test('en el conducto no te ven', () => {
  const s = fresh(); Object.assign(s.p, { x: 16.5, y: 10.5, inDuct: true });
  const d = s.drones[0]; Object.assign(d, { x: 17.5, y: 11.5, dir: Math.PI });
  assert.equal(G.canSee(s, d), false);
});

test('fabricar pide piezas y conocimiento', () => {
  const s = fresh(); s.p.inv = ['tornillos', 'placa', 'cinta', 'tela', 'sellador'];
  assert.ok(G.craft(s, 'destornillador')); assert.ok(G.has(s, 'destornillador'));
  s.p.conoc = 5; assert.equal(G.craft(s, 'parche'), false);
  s.p.conoc = 10; assert.ok(G.craft(s, 'parche'));
});

test('el pase de lista confisca si llevas 2 o más herramientas', () => {
  const s = fresh(); s.drones = []; s.min = 362; s.block = -1;
  Object.assign(s.p, { x: 19.5, y: 13.5, inv: ['destornillador', 'amarra', 'cinta'] });
  for (let i = 0; i < 20; i++) G.update(s, 0.25);
  assert.equal(s.p.inv.filter(G.isContraband).length, 1);
});

test('el incendio crece y el protocolo correcto lo apaga', () => {
  const s = fresh(); s.drones = []; s.min = 900;
  const h = G.spawnHazard(s, 'fuego', 'taller');
  for (let i = 0; i < 40; i++) G.update(s, 0.25);
  assert.ok(h.tiles.length > 1);
  s.p.inv.push('extintor'); Object.assign(s.p, { x: (h.tiles[0] % W) + 0.5, y: Math.floor(h.tiles[0] / W) + 0.5 });
  G.interact(s); assert.equal(s.pending?.id, 'fuego');
  G.resolveProtocol(s, true);
  assert.equal(s.hazards.length, 0); assert.equal(G.has(s, 'extintor'), false);
});

test('la fuga te jala y si no la sellas daña la estación', () => {
  const s = fresh(); s.drones = []; s.min = 900;
  const h = G.spawnHazard(s, 'fuga', 'taller');
  Object.assign(s.p, { x: h.x + (h.x > 19 ? -2.5 : 2.5), y: h.y });
  const d0 = Math.hypot(h.x - s.p.x, h.y - s.p.y);
  for (let i = 0; i < 8; i++) G.update(s, 0.25);
  assert.ok(Math.hypot(h.x - s.p.x, h.y - s.p.y) < d0);
  for (let i = 0; i < 900 && s.hazards.length; i++) G.update(s, 0.25);
  assert.ok(s.integ < 75);
});

test('alerta 100 = bloqueo: pierdes lo que llevas, no lo escondido', () => {
  const s = fresh(); s.p.inv = ['extintor', 'cinta']; s.stash = ['tarjeta'];
  s.alert = 95; Object.assign(s.p, { x: 31.5, y: 13.5 });
  G.update(s, 0); s.illegal = 1;
  const d = s.drones[0]; Object.assign(d, { x: 29.5, y: 13.5, dir: 0, mode: 'patrulla' });
  for (let i = 0; i < 20 && s.alert < 100 && s.stats.caught === 0; i++) G.update(s, 0.1);
  assert.equal(G.has(s, 'extintor'), false); assert.ok(s.stash.includes('tarjeta')); assert.ok(G.has(s, 'cinta'));
});

test('partida completa: con el plan listo, el desacople manual gana', () => {
  const s = fresh(); s.iaOn = false; s.drones = [];
  s.p.inv = ['codigo', 'celda', 'traje', 'llave'];
  Object.assign(s.p, { x: 41.5, y: 13.5 }); s.min = 900;
  G.interact(s); assert.ok(s.final, 'empieza el final');
  Object.assign(s.p, { x: 22.5, y: 15.5 }); G.interact(s); assert.equal(s.pending?.id, 'desacople');
  G.resolveProtocol(s, true); assert.ok(s.final.lever);
  Object.assign(s.p, { x: 41.5, y: 13.5 }); G.interact(s);
  assert.ok(s.over?.won); assert.ok(s.over.stars >= 2);
});

test('apagar a CUSTODIA abre las escotillas con tarjeta y apaga los drones', () => {
  const s = fresh(); s.p.inv = ['tarjeta']; s.p.conoc = 50;
  Object.assign(s.p, { x: 31.5, y: 14.5 }); G.interact(s);
  assert.equal(s.pending?.id, 'ia'); G.resolveProtocol(s, true);
  assert.equal(s.iaOn, false);
  assert.ok(s.map.doors.filter((d) => d.lock === 'tarjeta').every((d) => d.open));
});

test('10 días sin escapar = derrota', () => {
  const s = fresh(); s.drones = []; s.day = 10; s.min = 1430;
  G.update(s, 5); assert.equal(s.over?.won, false);
});

test('en la huida final un dron solo te quita segundos, no las piezas', () => {
  const s = fresh(); s.p.inv = ['codigo', 'celda', 'traje', 'llave'];
  Object.assign(s.p, { x: 41.5, y: 13.5 }); s.min = 900; G.interact(s);
  Object.assign(s.p, { x: 19.5, y: 13.5 }); const d = s.drones[0]; Object.assign(d, { x: 19.6, y: 13.5, mode: 'persigue', cd: 0 });
  const t0 = s.final.t; G.update(s, 0.05);
  assert.ok(s.final.t < t0 - 7); assert.equal(s.p.inv.length, 4);
});
