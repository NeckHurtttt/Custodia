// Banda sonora generativa de LIFELINE: Rutina (WebAudio, sin archivos).
// Cada destino tiene su tema; la intensidad (0 calma · 1 tensión · 2 persecución · 3 huida final) suma capas.
const THEMES = {
  estacion: { bpm: 84, root: 45, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 3, 4], lead: 'triangle', pad: 'sawtooth' },   // La menor, frío y metálico
  luna: { bpm: 66, root: 50, scale: [0, 2, 3, 5, 7, 9, 10], prog: [0, 3, 5, 4], lead: 'sine', pad: 'triangle' },             // Re dórico, vacío y lento
  mision: { bpm: 100, root: 48, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 4, 5, 3], lead: 'triangle', pad: 'triangle' },     // Do mayor: control de misión, con ánimo
  marte: { bpm: 96, root: 40, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 1, 5, 4], lead: 'square', pad: 'sawtooth' },          // Mi frigio, áspero
};
let ac = null, master = null, musBus = null, lp = null, delay = null, enabled = true;
let theme = THEMES.estacion, loc = null, level = 0, night = false, timer = null, step = 0, next = 0;
let lastSting = 0;
// Pistas grabadas (Suno u otras) en music/<destino>-calma.mp3 y music/<destino>-panico.mp3.
// Si existen, reemplazan a la música generativa: calma en niveles 0-1, desesperación en 2-3, con fundido.
// Si faltan (o no cargan), suena la generativa como siempre.
const TRACKS = { estacion: ['estacion-calma', 'estacion-panico'], luna: ['luna-calma', 'luna-panico'], marte: ['marte-calma', 'marte-panico'] };
const TRK_VOL = 0.55;
let trkBus = null, trk = { loc: null, els: [], gains: [], ok: [false, false] };
function setTracks(l) {
  for (const e of trk.els) { e.pause(); e.removeAttribute('src'); e.load(); }
  trk = { loc: l, els: [], gains: [], ok: [false, false] };
  (TRACKS[l] ?? []).forEach((n, i) => {
    const e = new Audio(); e.loop = true; e.preload = 'auto';
    const g = ac.createGain(); g.gain.value = 0; ac.createMediaElementSource(e).connect(g).connect(trkBus);
    e.addEventListener('canplay', () => { trk.ok[i] = true; e.play().catch(() => {}); }, { once: true });
    e.addEventListener('error', () => { trk.ok[i] = false; });
    e.src = `music/${n}.mp3`; trk.els.push(e); trk.gains.push(g);
  });
}
const usingTracks = () => trk.ok[0] || trk.ok[1];
function mixTracks() {
  if (!usingTracks()) return;
  const panic = level >= 2 && trk.ok[1] || !trk.ok[0]; const now = ac.currentTime;
  trk.gains.forEach((g, i) => g.gain.setTargetAtTime((i === 1) === panic ? (night && !panic ? 0.7 : 1) : 0, now, panic ? 0.25 : 0.9));
  for (const [i, e] of trk.els.entries()) if (trk.ok[i] && e.paused) e.play().catch(() => {});
}
const MUS_VOL = 2.4;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

export function start() {
  try {
    if (!ac) {
      ac = new AudioContext();
      // compresor al final: permite subir mucho el volumen sin que sature
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.connect(ac.destination);
      master = ac.createGain(); master.gain.value = 1.6 * vol; master.connect(comp);
      musBus = ac.createGain(); musBus.gain.value = enabled ? MUS_VOL : 0;
      lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.Q.value = 0.7;
      delay = ac.createDelay(1); delay.delayTime.value = 0.36; const fb = ac.createGain(); fb.gain.value = 0.35; const wet = ac.createGain(); wet.gain.value = 0.3;
      trkBus = ac.createGain(); trkBus.gain.value = enabled ? TRK_VOL : 0; trkBus.connect(master);
      musBus.connect(lp).connect(master); lp.connect(delay); delay.connect(fb).connect(delay); delay.connect(wet).connect(master);
    }
    if (ac.state === 'suspended') ac.resume();
    if (!timer) { next = ac.currentTime + 0.1; timer = setInterval(schedule, 25); }
  } catch { /* sin audio */ }
}
export const on = () => enabled;
let vol = 1; try { vol = +(localStorage.getItem('lfr.vol') ?? 1) || 1; } catch { /* nada */ }
/** Volumen general 0.25..2 (botones − / + en la pausa). */
export function volume(d = 0) { vol = Math.max(0.25, Math.min(2, Math.round((vol + d) * 4) / 4)); if (master) master.gain.setTargetAtTime(1.6 * vol, ac.currentTime, 0.1); try { localStorage.setItem('lfr.vol', vol); } catch { /* nada */ } return vol; }
export function toggle() { enabled = !enabled; if (musBus) { musBus.gain.setTargetAtTime(enabled && !ducked ? MUS_VOL : 0, ac.currentTime, 0.2); trkBus.gain.setTargetAtTime(enabled && !ducked ? TRK_VOL : 0, ac.currentTime, 0.2); } try { localStorage.setItem('lfr.music', enabled ? '1' : '0'); } catch { /* nada */ } }
try { enabled = localStorage.getItem('lfr.music') !== '0'; } catch { /* nada */ }

/** Silencia la música (no los golpes) cuando la ventana no está activa: con dos ventanas en la misma PC no se superponen. */
let ducked = false;
export function duck(d) {
  if (d === ducked || !ac) return; ducked = d; const now = ac.currentTime;
  musBus.gain.setTargetAtTime(enabled && !d ? MUS_VOL : 0, now, 0.3); trkBus.gain.setTargetAtTime(enabled && !d ? TRK_VOL : 0, now, 0.3);
}

/** Lo llama el bucle del juego cada cuadro. */
export function set(newLoc, lvl, isNight) {
  if (newLoc !== loc) { loc = newLoc; theme = THEMES[loc] ?? THEMES.estacion; step = 0; }
  level = lvl; night = isNight;
  if (ac && trk.loc !== loc) setTracks(loc);
  if (ac) mixTracks();
  if (lp && ac) lp.frequency.setTargetAtTime(night ? 900 : level >= 2 ? 2600 : 1800, ac.currentTime, 0.5);
}

function note(freq, t, dur, type, vol, dest = musBus) {
  const o = ac.createOscillator(); const g = ac.createGain();
  o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
}
function noise(t, dur, vol, f = 6000, dest = musBus) {
  const n = ac.createBufferSource(); const b = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  n.buffer = b; const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = f; const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(hp).connect(g).connect(dest); n.start(t);
}
function kick(t, vol = 0.5) { const o = ac.createOscillator(); const g = ac.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.connect(g).connect(musBus); o.start(t); o.stop(t + 0.3); }

function schedule() {
  if (!ac) return;
  const bpm = theme.bpm * (level >= 3 ? 1.35 : level >= 2 ? 1.15 : 1);
  const sx = 60 / bpm / 4; // semicorchea
  const gen = !usingTracks(); // con pistas grabadas, la generativa calla (los golpes y el latido siguen)
  while (next < ac.currentTime + 0.12) { if (gen) play(step, next, sx); step++; next += sx; }
}
function play(i, t, sx) {
  const th = theme; const bar = Math.floor(i / 16); const chordDeg = th.prog[Math.floor(bar / 2) % th.prog.length];
  const deg = (k) => { const n = chordDeg + k; return th.root + th.scale[((n % 7) + 7) % 7] + 12 * Math.floor(n / 7); };
  const pos = i % 16;
  // pad: acorde largo cada 2 compases
  if (i % 32 === 0) for (const k of [0, 2, 4]) { note(hz(deg(k) + 12), t, sx * 32, th.pad, 0.025); note(hz(deg(k) + 12) * 1.004, t, sx * 32, th.pad, 0.02); }
  // drone grave
  if (i % 16 === 0) note(hz(th.root - 12 + (th.scale[chordDeg % 7] ?? 0)), t, sx * 16, 'sine', 0.09);
  // arpegio: más denso con la tensión
  const every = level >= 2 ? 2 : level === 1 ? 3 : 4;
  if (pos % every === 0) {
    const pat = [0, 2, 4, 7, 4, 2, 6, 4]; const k = pat[(i / every | 0) % pat.length];
    if (level > 0 || (i * 7) % 5 !== 0) note(hz(deg(k) + 24), t, sx * (level >= 2 ? 1.5 : 3), th.lead, level >= 2 ? 0.035 : 0.028);
  }
  // tensión: bajo pulsante
  if (level >= 1 && pos % 4 === 0) note(hz(deg(0)), t, sx * 2, 'square', 0.03);
  // persecución: latido y nota disonante
  if (level >= 2) { if (pos === 0 || pos === 3) kick(t, pos === 0 ? 0.45 : 0.3); if (pos === 8 && bar % 2) note(hz(deg(0) + 25), t, sx * 6, 'sawtooth', 0.02); }
  // huida final: platillos
  if (level >= 3) { if (pos % 2 === 0) noise(t, 0.04, 0.05); if (pos === 4 || pos === 12) noise(t, 0.12, 0.12, 1500); }
  // calma de noche: campanita lejana
  if (level === 0 && night && pos === 0 && bar % 4 === 3) note(hz(deg(4) + 36), t, 2, 'sine', 0.02);
}

/** Latido del corazón: lo llama el juego cuando algo te persigue (rate 0..1). */
let beatNext = 0;
export function heartbeat(rate) {
  if (!ac || !enabled || ducked || rate <= 0) return; const t = ac.currentTime; if (t < beatNext) return;
  const gap = 0.95 - rate * 0.55; beatNext = t + gap;
  for (const [dt, v] of [[0, 0.55], [0.16, 0.38]]) { const o = ac.createOscillator(); const g = ac.createGain(); o.frequency.setValueAtTime(70, t + dt); o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.12); g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(v * (0.4 + rate * 0.6), t + dt + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.18); o.connect(g).connect(master); o.start(t + dt); o.stop(t + dt + 0.2); }
}
/** Golpes de sonido para momentos de susto. */
export function sting(kind) {
  if (!ac || !enabled) return; const t = ac.currentTime + 0.01;
  if (t - lastSting < 0.25 && kind === 'visto') return; lastSting = t;
  if (kind === 'visto') { for (const f of [hz(theme.root + 24), hz(theme.root + 25), hz(theme.root + 31)]) note(f, t, 0.7, 'sawtooth', 0.05, master); noise(t, 0.3, 0.08, 3000, master); }
  else if (kind === 'atrapado') { kick(t, 0.9); for (const f of [hz(theme.root - 12), hz(theme.root - 11)]) note(f, t, 1.4, 'sawtooth', 0.08, master); }
  else if (kind === 'alarma') { const o = ac.createOscillator(); const g = ac.createGain(); o.type = 'square'; o.frequency.setValueAtTime(600, t); for (let k = 0; k < 4; k++) { o.frequency.linearRampToValueAtTime(900, t + k * 0.4 + 0.2); o.frequency.linearRampToValueAtTime(600, t + k * 0.4 + 0.4); } g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6); o.connect(g).connect(master); o.start(t); o.stop(t + 1.7); }
  else if (kind === 'radio') { noise(t, 0.25, 0.06, 2000, master); note(1200, t + 0.25, 0.08, 'square', 0.03, master); note(1500, t + 0.36, 0.08, 'square', 0.03, master); }
  else if (kind === 'susto') { noise(t, 0.5, 0.35, 800, master); for (const f of [hz(theme.root + 36), hz(theme.root + 37), hz(theme.root + 42)]) note(f, t, 1.1, 'sawtooth', 0.09, master); kick(t, 1); }
  else if (kind === 'nota') { for (const [k, f] of [[0, 660], [0.12, 880], [0.24, 1320]]) note(f, t + k, 0.3, 'sine', 0.06, master); }
  else if (kind === 'boom') { noise(t, 0.8, 0.3, 200, master); kick(t, 1); }
}
export const trackState = () => ({ loc: trk.loc, ok: [...trk.ok], gain: trk.gains.map((g) => +g.gain.value.toFixed(2)), time: trk.els.map((e) => +e.currentTime.toFixed(1)), gen: !usingTracks() }); // para depurar
