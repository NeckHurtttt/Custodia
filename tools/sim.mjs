// Simulador sin pantalla: un jugador "obediente" que solo cumple el horario.
// Mide cuánto lo castigan sin hacer nada ilegal. Uso: node tools/sim.mjs [destino] [partidas] [dificultad]
import * as G from '../src/core.js';
const locs = process.argv[2] && process.argv[2] !== 'all' ? [process.argv[2]] : ['estacion', 'luna', 'marte'];
const DBG = {}; const N = +(process.argv[3] ?? 20), dif = process.argv[4];
const DT = 1 / 20, DAYS_MAX = +(process.argv[5] ?? 3);
function bot(s) {
  const p = s.p; if (p.sleep) return { dx: 0, dy: 0 };
  // huir: si algo le hace daño, se va a la sala sin peligros más cercana unos segundos
  if (p.salud < (p.last ?? 100) - 0.01) { const bad = new Set(s.hazards.map((h) => h.room ?? G.roomIdAt(s, h.x, h.y)));
    const ok = s.L.rooms.filter((r) => !r.outside && !r.restricted && !bad.has(r.id) && r.id !== G.playerRoom(s));
    const far = ok.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    if (far) { p.flee = [far.x + Math.floor(far.w / 2) + 0.5, far.y + Math.floor(far.h / 2) + 0.5]; p.fleeT = 8; } }
  p.last = p.salud;
  if (p.fleeT > 0) { p.fleeT -= DT; return toward(s, p.flee); }
  const b = G.block(s); const id = b.room ?? 'dorm';
  if (G.isNight(s) && G.playerRoom(s) === 'dorm') {
    const bed = s.objects.find((o) => o.t === 'cama' && o.mine);
    if (bed && Math.hypot(bed.x + 0.5 - p.x, bed.y + 0.5 - p.y) < 1.2) { G.interact(s); return { dx: 0, dy: 0 }; }
    return toward(s, [bed.x + 0.5, bed.y + 0.5]);
  }
  const r = s.L.rooms.find((x) => x.id === id);
  if (b.id === 'comer' && !s.ate && G.playerRoom(s) === id) {
    const m = s.objects.find((o) => o.t === 'mesa' && G.roomIdAt(s, o.x + 0.5, o.y + 0.5) === id);
    if (m) { if (Math.hypot(m.x + 0.5 - p.x, m.y + 0.5 - p.y) < 1.3) { G.interact(s); return { dx: 0, dy: 0 }; } const g = toward(s, [m.x + 0.5, m.y + 1.5]); if (g.dx || g.dy) return g; }
  }
  if (G.playerRoom(s) === id && (!p.goal || G.roomIdAt(s, ...p.goal) === id) && p.arr) return { dx: 0, dy: 0 };
  return toward(s, [r.x + Math.floor(r.w / 2) + 0.5, r.y + Math.floor(r.h / 2) + 0.5]);
}
function toward(s, g) {
  const p = s.p; const pa = G.path(s, p.x, p.y, g[0], g[1], 'p', ['exterior']);
  if (!pa || !pa.length) { p.arr = true; return { dx: 0, dy: 0 }; }
  p.arr = false; const [tx, ty] = pa[0]; return { dx: tx + 0.5 - p.x, dy: ty + 0.5 - p.y };
}
for (const loc of locs) {
  const agg = { caught: 0, alertMax: 0, lock: 0, dead: 0, lost: 0, integ: 0, salud: 0, days: 0 };
  for (let k = 0; k < N; k++) {
    const s = G.newGame(loc, 1000 + k, dif); let mx = 0, lk = 0, prevC = 0;
    for (let t = 0; t < 20 * 60 * 60 && !s.over; t++) {
      if (s.pending) { if (s.pending.kind === 'respira') G.resolveBreath(s, Math.random() < 0.7); else s.pending = null; }
      const ctx = `${G.playerRoom(s)}/${G.block(s).id}${s.checked ? '+chk' : ''}${G.isNight(s) ? ' noche' : ''}${G.suspicious(s) ? ' SOSP' : ''} fl${(s.p.fleeT ?? 0) > 0 ? 1 : 0}`; const hs = s.p.salud, ig = s.integ; G.update(s, DT, bot(s));
      const tag = s.hazards.map((h) => h.kind).sort().join(',') || '-';
      if (s.p.salud < hs) DBG['salud ' + tag] = (DBG['salud ' + tag] ?? 0) + hs - s.p.salud;
      if (s.stats.caught > prevC) { const m = s.log[s.log.length - 1]?.text.slice(0, 40); DBG['atrapa ' + m + ' @' + ctx] = (DBG['atrapa ' + m + ' @' + ctx] ?? 0) + 1; }
      if (s.integ < ig) DBG['integ ' + tag] = (DBG['integ ' + tag] ?? 0) + ig - s.integ; mx = Math.max(mx, s.alert);
      if (s.alert === 40 && s.stats.caught > prevC) lk++; prevC = s.stats.caught;
      if (s.day > DAYS_MAX) break;
    }
    agg.caught += s.stats.caught; agg.alertMax += mx; agg.days += s.day; agg.integ += s.integ; agg.salud += s.p.salud;
    if (s.over) { if (/salud/.test(s.over.text)) agg.dead++; else agg.lost++; }
  }
  if (process.env.DBG) { Object.entries(DBG).sort((a, b) => b[1] - a[1]).filter(([k], i) => i < 6 || k.startsWith('atrapa')).forEach(([k, v]) => console.log('   ', Math.round(v / N), k)); for (const k in DBG) delete DBG[k]; }
  const f = (x) => (x / N).toFixed(1);
  console.log(`${loc.padEnd(9)} atrapado/partida ${f(agg.caught)} · alerta máx ${f(agg.alertMax)} · integridad ${f(agg.integ)} · salud ${f(agg.salud)} · día ${f(agg.days)} · muertes ${agg.dead} · otras derrotas ${agg.lost}`);
}
