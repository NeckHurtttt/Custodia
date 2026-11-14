import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/core.js';
import { VILLAINS, LOC_VILLAINS } from '../src/villains.js';

const run = (s, sec, inp = { dx: 0, dy: 0 }) => { for (let t = 0; t < sec; t += 0.05) { G.update(s, 0.05, typeof inp === 'function' ? inp(t) : inp); if (s.pending?.kind === 'respira') G.resolveBreath(s, t % 2 < 1); else if (s.pending) s.pending = null; } };

for (const loc of Object.keys(LOC_VILLAINS)) {
  test(`${loc}: los 10 villanos existen y aparecen sin romperse`, () => {
    assert.equal(LOC_VILLAINS[loc].length, 10);
    const s = G.newGame(loc, 11);
    for (const id of LOC_VILLAINS[loc]) {
      const d = VILLAINS[id]; assert.ok(d, id);
      if (d.kind === 'hazard') G.spawnHazard(s, d.hz);
    }
    s.vil.today = LOC_VILLAINS[loc].slice();
    for (let day = 0; day < 4; day++) {
      run(s, 60, (t) => ({ dx: Math.sin(t / 3), dy: Math.cos(t / 4), crouch: t % 9 < 3 }));
      s.p.salud = 100; s.integ = 100; s.over = null;
    }
    assert.ok(G.serialize(s).length > 100);
    const back = G.revive(JSON.parse(G.serialize(s)));
    run(back, 5);
  });
  test(`${loc}: cada día se sortean villanos distintos`, () => {
    const s = G.newGame(loc, 3); const seen = new Set();
    for (let d = 0; d < 9; d++) { s.vil.today.forEach((x) => seen.add(x)); s.min = 1439.9; s.p.salud = 100; s.integ = 100; s.alert = 0; G.update(s, 0.05); }
    assert.equal(s.vil.today[0], LOC_VILLAINS[loc][0]);
    assert.ok(seen.size >= 7, `vistos: ${seen.size}`);
  });
}

test('un dron te atrapa en cuanto te toca si llevas herramientas', () => {
  const s = G.newGame('estacion', 5); const d = s.drones[0];
  s.p.inv.push('destornillador'); s.p.x = d.x; s.p.y = d.y; s.min = 600;
  G.update(s, 0.05);
  assert.ok(s.escort, 'empieza la animación de captura'); assert.ok(!G.has(s, 'destornillador'));
  for (let i = 0; i < 400 && s.escort; i++) G.update(s, 0.05);
  assert.ok(!s.escort); assert.equal(s.p.x, 3.5); assert.equal(s.p.y, 3.5);
});

test('escondido no te ven; si te vio entrar, te busca y hay que contener la respiración', () => {
  const s = G.newGame('estacion', 5); const lock = s.objects.find((o) => o.t === 'casillero');
  s.min = 1400; s.p.x = lock.x + 0.5; s.p.y = lock.y + 0.5;
  const d = s.drones[0]; d.x = s.p.x + 3; d.y = s.p.y; d.mode = 'persigue'; d.lost = 0; d.target = [s.p.x, s.p.y];
  G.toggleHide(s); assert.ok(s.p.hidden); assert.equal(d.mode, 'busca');
  assert.equal(G.canSee(s, d), false);
  for (let i = 0; i < 200 && !s.pending; i++) G.update(s, 0.05);
  assert.equal(s.pending?.kind, 'respira');
  G.resolveBreath(s, true); assert.ok(s.p.hidden);
});

test('lanzar una pieza hace ruido', () => {
  const s = G.newGame('estacion', 5); G.throwItem(s); assert.ok(s.noise);
});

test('un compañero contento distrae a la vigilancia', () => {
  const s = G.newGame('estacion', 5); const c = s.crew[0]; c.want = null; s.p.x = c.x; s.p.y = c.y;
  G.interact(s); assert.ok(c.busyT > 0);
});

test('apagón: escotilla cerrada se abre con batería', () => {
  const s = G.newGame('marte', 5); const h = G.spawnHazard(s, 'apagon');
  const d = s.map.doors.find((x) => x.room === h.room); assert.equal(d.lock, 'energia'); assert.equal(d.open, false);
  run(s, 90); assert.notEqual(d.lock, 'energia');
});

test('misión: quedarse junto al objetivo la cumple', () => {
  const s = G.newGame('luna', 5); s.vil.missions = [0]; s.min = 600; G.update(s, 0.05);
  const m = s.vil.mission; assert.ok(m);
  s.iaOn = false; s.vil.walkers = []; s.p.x = m.x; s.p.y = m.y; G.interact(s);
  run(s, m.need + 1); assert.equal(s.vil.mission, null); assert.ok(s.stats.solved >= 1);
});

test('dificultad: Fácil ve menos, sortea menos villanos y da gracia tras un bloqueo', async () => {
  const G = await import('../src/core.js');
  const f = G.newGame('estacion', 7, 'facil'), t = G.newGame('estacion', 7, 'dificil');
  assert.equal(f.dif, 'facil'); assert.equal(G.newGame('luna', 1, 'xx').dif, 'normal');
  assert.ok(G.dif(f).see < G.dif(t).see && G.dif(f).alert < G.dif(t).alert);
  G.raise(f, 20); G.raise(t, 20); assert.ok(f.alert < t.alert);
  G.lockdown(f); assert.ok(f.grace > 0);
  f.day = 5; t.day = 5; (await import('../src/villains.js')).startDay(f); (await import('../src/villains.js')).startDay(t);
  assert.ok(f.vil.today.length < t.vil.today.length);
  const r = G.revive(JSON.parse(G.serialize(f))); assert.equal(r.dif, 'facil');
});
