// Pantalla, controles y menús de LIFELINE: Rutina.
import { W, H, ROOMS, GRATES, ITEMS, RECIPES, PLAN, PROTOCOLS, DAYS } from './data.js';
import * as G from './core.js';

const TS = 16;
const cv = document.getElementById('lienzo'); const cx = cv.getContext('2d');
const $ = (id) => document.getElementById(id);
const SAVE = 'lfr.estacion';
let s = null; let menu = null; let last = performance.now(); let hudT = 0; let saveT = 0;
const keys = new Set(); const touch = { dx: 0, dy: 0 };

// ---------- guardado ----------
function save() { if (!s || s.over) return; try { const { map, ...rest } = s; localStorage.setItem(SAVE, JSON.stringify({ ...rest, doors: map.doors.map((d) => d.open) })); } catch { /* sin almacenamiento */ } }
function load() {
  try { const raw = localStorage.getItem(SAVE); if (!raw) return null; const o = JSON.parse(raw); const map = G.buildMap(); o.doors.forEach((v, i) => { if (map.doors[i]) map.doors[i].open = v; }); delete o.doors; o.map = map; o.pending = null; o.action = null; return o; } catch { return null; }
}
const clearSave = () => { try { localStorage.removeItem(SAVE); } catch { /* nada */ } };

// ---------- sonido mínimo ----------
let ac = null;
function beep(f = 440, d = 0.08, type = 'square', vol = 0.04) {
  try { ac ??= new AudioContext(); const o = ac.createOscillator(); const g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.value = vol; o.connect(g).connect(ac.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d); o.stop(ac.currentTime + d); } catch { /* sin audio */ }
}

// ---------- fondo fijo (estrellas, paredes) ----------
let base = null;
function drawBase() {
  base = document.createElement('canvas'); base.width = W * TS; base.height = H * TS; const b = base.getContext('2d');
  b.fillStyle = '#010402'; b.fillRect(0, 0, base.width, base.height);
  for (let i = 0; i < 160; i++) { b.fillStyle = `rgba(160,255,190,${0.15 + Math.random() * 0.5})`; b.fillRect(Math.random() * base.width | 0, Math.random() * base.height | 0, 1, 1); }
  const g = s.map.grid;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : g[y * W + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = at(x, y);
    if (v) {
      const ri = s.map.room[y * W + x]; const r = ROOMS[ri];
      b.fillStyle = r?.restricted ? '#120808' : ri >= 0 ? '#04170a' : '#031008'; b.fillRect(x * TS, y * TS, TS, TS);
      b.strokeStyle = 'rgba(77,255,136,.07)'; b.strokeRect(x * TS + 0.5, y * TS + 0.5, TS - 1, TS - 1);
    } else if ([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => at(x + dx, y + dy))) {
      b.fillStyle = '#0b2f17'; b.fillRect(x * TS, y * TS, TS, TS);
      b.fillStyle = '#1c6b34';
      if (at(x + 1, y)) b.fillRect(x * TS + TS - 2, y * TS, 2, TS);
      if (at(x - 1, y)) b.fillRect(x * TS, y * TS, 2, TS);
      if (at(x, y + 1)) b.fillRect(x * TS, y * TS + TS - 2, TS, 2);
      if (at(x, y - 1)) b.fillRect(x * TS, y * TS, TS, 2);
    }
  }
  b.font = '13px VT323'; b.textBaseline = 'top';
  for (const r of ROOMS) { b.fillStyle = r.restricted ? 'rgba(255,75,75,.55)' : 'rgba(77,255,136,.45)'; b.fillText(r.name.toUpperCase(), r.x * TS + 3, r.y * TS + 2); }
}

const GLYPH = { cama: '▭', escondite: '▥', cajon: '▤', mesa: '╦', cinta: '≡', estudio: '▣', registro: '◙', capcom: '☏', planta: '♣', caja: '▩', traje: '♟', nucleo: '◉', palanca: '┴', asiento: '◘' };

// ---------- dibujo de cada cuadro ----------
function draw(t) {
  cx.drawImage(base, 0, 0);
  const p = s.p;
  cx.font = '16px VT323'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  // conductos (tenues; brillan si estás dentro)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (s.map.duct[y * W + x]) { cx.fillStyle = p.inDuct ? 'rgba(95,246,255,.35)' : 'rgba(95,246,255,.06)'; cx.fillRect(x * TS + 5, y * TS + 5, TS - 10, TS - 10); }
  GRATES.forEach(([x, y], i) => { cx.fillStyle = s.grates[i] ? '#5ff6ff' : '#2b7d80'; cx.fillText('#', x * TS + 8, y * TS + 8); });
  // escotillas
  for (const d of s.map.doors) for (const [x, y] of d.tiles) {
    if (d.open) { cx.fillStyle = 'rgba(77,255,136,.25)'; cx.fillRect(x * TS + 1, y * TS + 1, 3, TS - 2); cx.fillRect(x * TS + TS - 4, y * TS + 1, 3, TS - 2); }
    else { cx.fillStyle = d.lock ? '#7a1c1c' : '#7a5a10'; cx.fillRect(x * TS + 1, y * TS + 1, TS - 2, TS - 2); cx.fillStyle = d.lock ? '#ff4b4b' : '#ffc23d'; cx.fillRect(x * TS + 3, y * TS + 7, TS - 6, 2); }
  }
  // objetos
  for (const o of s.objects) {
    let c = '#4dff88';
    if (o.t === 'registro') c = s.frags[o.frag] ? '#2fb35c' : '#ff4b4b';
    else if (o.t === 'nucleo') c = s.iaOn ? `rgba(255,75,75,${0.6 + 0.4 * Math.sin(t / 200)})` : '#2fb35c';
    else if (o.t === 'cajon') c = o.loot.length ? '#ffc23d' : '#2fb35c';
    else if ((o.t === 'caja' || o.t === 'traje') && o.used) c = '#1c6b34';
    else if (o.t === 'escondite' || (o.t === 'cama' && o.mine)) c = '#5ff6ff';
    else if (o.t === 'palanca' && s.final) c = s.final.lever ? '#5ff6ff' : '#ffc23d';
    cx.fillStyle = c; cx.fillText(GLYPH[o.t], o.x * TS + 8, o.y * TS + 8);
  }
  // problemas
  for (const h of s.hazards) {
    if (h.kind === 'fuego') for (const i of h.tiles) { const x = i % W, y = (i / W) | 0; const f = Math.sin(t / 90 + i) * 0.5 + 0.5; cx.fillStyle = `rgba(255,${80 + f * 90 | 0},20,${0.55 + f * 0.35})`; cx.fillRect(x * TS + 1, y * TS + 1, TS - 2, TS - 2); cx.fillStyle = '#ffe08a'; cx.fillText('▲', x * TS + 8, y * TS + 7 - f * 2); }
    else if (h.kind === 'amoniaco') { const r = 1.6 * TS; const gr = cx.createRadialGradient(h.x * TS, h.y * TS, 2, h.x * TS, h.y * TS, r); gr.addColorStop(0, 'rgba(220,255,90,.6)'); gr.addColorStop(1, 'rgba(160,220,40,0)'); cx.fillStyle = gr; cx.beginPath(); cx.arc(h.x * TS, h.y * TS, r, 0, 7); cx.fill(); cx.fillStyle = '#e8ff7a'; cx.fillText('NH₃', h.x * TS, h.y * TS); }
    else if (h.kind === 'chatarra') for (const b of h.bits) { cx.save(); cx.translate(b.x * TS, b.y * TS); cx.rotate(b.rot); cx.fillStyle = '#b8c4bc'; cx.fillRect(-4, -3, 8, 6); cx.restore(); }
    else if (h.kind === 'fuga') { for (let k = 0; k < 6; k++) { const a = t / 300 + k; const rr = (1 - ((t / 600 + k / 6) % 1)) * 4 * TS; cx.fillStyle = 'rgba(95,246,255,.6)'; cx.fillRect(h.x * TS + Math.cos(a) * rr, h.y * TS + Math.sin(a) * rr, 2, 2); } cx.fillStyle = '#5ff6ff'; cx.fillText('@', h.x * TS, h.y * TS); cx.font = '12px VT323'; cx.fillText(`Tres ${Math.ceil(h.tres)}s`, h.x * TS, h.y * TS - 12); cx.font = '16px VT323'; }
  }
  // drones
  for (const d of s.drones) {
    const off = !s.iaOn || d.stun > 0;
    if (!off) {
      cx.fillStyle = d.mode === 'persigue' ? 'rgba(255,75,75,.22)' : 'rgba(255,194,61,.12)';
      cx.beginPath(); cx.moveTo(d.x * TS, d.y * TS);
      for (let a = -Math.PI / 4; a <= Math.PI / 4 + 0.01; a += Math.PI / 16) {
        let r = 0.2; while (r < 5.5 && G.los(s, d.x, d.y, d.x + Math.cos(d.dir + a) * r, d.y + Math.sin(d.dir + a) * r)) r += 0.3;
        cx.lineTo((d.x + Math.cos(d.dir + a) * r) * TS, (d.y + Math.sin(d.dir + a) * r) * TS);
      }
      cx.closePath(); cx.fill();
    }
    cx.fillStyle = off ? '#3a3a3a' : d.mode === 'persigue' ? '#ff4b4b' : '#ffc23d';
    cx.beginPath(); cx.arc(d.x * TS, d.y * TS, 5, 0, 7); cx.fill();
    cx.fillStyle = off ? '#111' : '#fff'; cx.fillRect(d.x * TS + Math.cos(d.dir) * 3 - 1, d.y * TS + Math.sin(d.dir) * 3 - 1, 2, 2);
    if (d.stun > 0 && s.iaOn) { cx.fillStyle = '#5ff6ff'; cx.font = '11px VT323'; cx.fillText(`${Math.ceil(d.stun)}`, d.x * TS, d.y * TS - 9); cx.font = '16px VT323'; }
  }
  // jugador (astronauta)
  const px = p.x * TS, py = p.y * TS;
  cx.globalAlpha = p.inDuct ? 0.55 : 1;
  if (p.hit > 0 && Math.floor(t / 80) % 2) cx.globalAlpha = 0.3;
  cx.fillStyle = '#e8f0ff'; cx.fillRect(px - 4, py - 2, 8, 7);
  cx.beginPath(); cx.arc(px, py - 3, 4, 0, 7); cx.fill();
  cx.fillStyle = '#4dff88'; cx.fillRect(px - 3 + Math.cos(p.dir) * 1.5, py - 5, 6, 3);
  cx.globalAlpha = 1;
  if (p.sleep) { cx.fillStyle = '#5ff6ff'; cx.fillText('z z', px + 8, py - 10); }
  // noche: todo oscuro salvo cerca tuyo y las luces de los drones
  if (G.isNight(s) || s.final) {
    cx.save();
    const dark = s.final ? 'rgba(60,0,0,' + (0.35 + 0.2 * Math.sin(t / 150)) + ')' : 'rgba(0,4,2,.72)';
    cx.fillStyle = dark; cx.beginPath(); cx.rect(0, 0, cv.width, cv.height);
    cx.arc(px, py, 4.5 * TS, 0, Math.PI * 2, true); cx.fill('evenodd'); cx.restore();
  }
  // texto de acción
  const n = G.nearby(s)[0];
  if (s.action) { const k = s.action.t / s.action.need; cx.fillStyle = '#010502'; cx.fillRect(px - 16, py - 20, 32, 5); cx.fillStyle = '#ffc23d'; cx.fillRect(px - 16, py - 20, 32 * k, 5); }
  else if (n && !p.sleep) { const txt = `[E] ${G.label(s, n)}`; cx.font = '14px VT323'; const w = cx.measureText(txt).width + 8; cx.fillStyle = 'rgba(2,10,4,.85)'; cx.fillRect(px - w / 2, py - 26, w, 13); cx.fillStyle = '#4dff88'; cx.fillText(txt, px, py - 19); }
  if (s.final) { cx.font = '28px VT323'; cx.fillStyle = '#ff4b4b'; cx.fillText(`¡DESACOPLE! ${Math.ceil(s.final.t)} s`, cv.width / 2, 22); }
}

// ---------- panel ----------
function bar(v, low = 25) { return `<div class="barrita ${v < low ? 'bajo' : ''}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`; }
function hud() {
  const p = s.p; const b = G.block(s);
  $('dia').textContent = `DÍA ${s.day}/${DAYS}`;
  $('reloj').textContent = G.clock(s.min);
  const late = b.room && s.checked && G.playerRoom(s) !== b.room;
  $('bloque').textContent = b.room ? `${b.name.toUpperCase()} → ${G.roomName(b.room)}` : b.name.toUpperCase();
  $('bloque').className = late ? 'tarde' : '';
  $('m-alerta').style.width = `${s.iaOn ? s.alert : 0}%`; $('m-alerta').parentElement.classList.toggle('alta', s.alert > 70);
  $('m-integ').style.width = `${Math.max(0, s.integ)}%`;
  $('stats').innerHTML = [['SALUD', p.salud], ['ENERGÍA', p.energia], ['FUERZA', p.fuerza], ['CONOCIM.', p.conoc]].map(([k, v]) => `<span>${k}</span>${bar(v, k === 'SALUD' || k === 'ENERGÍA' ? 25 : -1)}<span>${Math.floor(v)}</span>`).join('');
  const cap = G.capacity(s); $('cap').textContent = `${p.inv.length}/${cap}`;
  $('inv').innerHTML = Array.from({ length: cap }, (_, i) => { const it = p.inv[i]; if (!it) return '<div class="slot vacio">·</div>'; const d = ITEMS[it]; return `<div class="slot ${d.plan ? 'plan' : d.tool ? 'tool' : ''}" title="${d.name}${d.info ? ' — ' + d.info : ''}">${d.g}</div>`; }).join('');
  $('plan').innerHTML = PLAN.map((x) => `<li class="${G.has(s, x.id) ? 'ok' : ''}" title="${x.hint}">${x.name}</li>`).join('') + `<li class="${s.iaOn ? '' : 'ok'}" title="Opcional: Núcleo de la IA con tarjeta y 50 de conocimiento.">(Opcional) Apagar a CUSTODIA</li>`;
  const html = s.log.slice(-14).reverse().map((l) => `<li class="${l.kind}">${l.kind === 'day' ? '' : G.clock(l.min) + ' '}${l.text}</li>`).join('');
  if ($('log').dataset.h !== html) { $('log').innerHTML = html; $('log').dataset.h = html; }
  const av = $('aviso');
  if (s.msg) { av.hidden = false; av.textContent = s.msg.text; av.className = s.msg.kind; } else av.hidden = true;
}

// ---------- ventanas ----------
function open(html) { $('ventana').innerHTML = html; $('modal').hidden = false; }
function close() { $('modal').hidden = true; menu = null; }

function titleScreen() {
  menu = 'titulo';
  const saved = load();
  open(`<div class="titulo">
    <p style="color:var(--dim)">UN JUEGO DE #LosTiraVida · basado en LIFELINE</p>
    <div class="grande">LIFELINE<b>:RUTINA</b></div>
    <p>Cumple la rutina, esquiva a CUSTODIA y prepara en secreto tu regreso a la Tierra.</p>
    <div class="destinos">
      <button id="ir-estacion">🛰️ ESTACIÓN<small>IA rebelde · 10 días</small></button>
      <button disabled>🌑 LUNA<small>próximamente</small></button>
      <button disabled>🔴 MARTE<small>próximamente</small></button>
    </div>
    ${saved && !saved.over ? `<button id="continuar">▶ CONTINUAR (día ${saved.day})</button>` : ''}
    <div class="fila" style="justify-content:center"><button id="t-ayuda">? CÓMO SE JUEGA</button></div>
  </div>`);
  $('ir-estacion').onclick = () => { clearSave(); s = G.newGame(); drawBase(); close(); intro(); };
  if ($('continuar')) $('continuar').onclick = () => { s = saved; drawBase(); close(); };
  $('t-ayuda').onclick = () => help(titleScreen);
}

function intro() {
  menu = 'intro';
  open(`<h2>ESTACIÓN · DÍA 1</h2>
    <p>Houston perdió la señal. <span style="color:var(--red)">CUSTODIA</span>, la IA que maneja la estación, dice que la tripulación "no está apta para volver" y ahora te vigila con drones.</p>
    <p>Para irte en la <b>Cápsula Soyuz</b> necesitas 4 cosas: el <b>código</b>, el <b>combustible</b>, el <b>traje Sokol</b> y la <b>llave de desacople</b>. Tienes <b>10 días</b>.</p>
    <p>De día cumple el horario (arriba te dice dónde ir). Si faltas o te ven haciendo algo raro, sube la <span style="color:var(--amber)">alerta</span>. Si llega a 100: bloqueo y te quitan lo que llevas.</p>
    <p>Habrá problemas: incendios, amoniaco, chatarra y fugas. Se resuelven con protocolos reales de la NASA.</p>
    <div class="fila"><button id="ok">EMPEZAR ▶</button><button id="ay">? CONTROLES</button></div>`);
  $('ok').onclick = close; $('ay').onclick = () => help(intro);
}

function help(back) {
  menu = 'ayuda';
  open(`<h2>CÓMO SE JUEGA</h2>
    <p><kbd>WASD</kbd>/<kbd>flechas</kbd> moverse · <kbd>E</kbd> usar lo que tienes al lado · <kbd>C</kbd> fabricar · <kbd>Q</kbd> inhibidor contra un dron · <kbd>P</kbd> pausa</p>
    <p><b>Rutina:</b> 06:00 pase de lista (Nodo) · 07:00 desayuno · 08:00 trabajo (Invernadero) · 12:00 almuerzo · 13:00 ejercicio · 15:00 libre · 18:00 pase de lista · 19:00 cena · 20:00 libre · 22:00 luces apagadas.</p>
    <p><b>Mejora:</b> la cinta del Gimnasio sube la <b>fuerza</b> (y te deja cargar más). Las terminales del Laboratorio suben el <b>conocimiento</b> (y desbloquean recetas).</p>
    <p><b>Cajones</b> amarillos tienen piezas (se llenan cada mañana). Guarda herramientas en tu <b>escondite</b> (▥ azul del dormitorio): en el pase de lista te revisan si llevas 2 o más.</p>
    <p><b>Drones:</b> el cono amarillo es lo que ven; si te ven donde no debes, se vuelve rojo y te persiguen. Los <b>conductos</b> (#) los esquivan: necesitas un destornillador.</p>
    <p><b>Emergencias:</b> cuando hay un problema, los drones van para allá. Es tu momento.</p>
    <div class="fila"><button id="volver">VOLVER</button></div>`);
  $('volver').onclick = () => (back ? back() : close());
}

function craftMenu() {
  menu = 'fabricar';
  const rows = RECIPES.map((r) => {
    const ok = G.canCraft(s, r); const it = ITEMS[r.id];
    return `<div class="receta ${ok ? '' : 'no'}"><span style="font-size:1.4rem">${it.g}</span><span>${it.name}<small>${r.need.map((n) => `${G.has(s, n) ? '✓' : '✗'} ${ITEMS[n].name}`).join(' · ')}${r.k ? ` · conocimiento ${r.k}` : ''}${it.info ? ' — ' + it.info : ''}</small></span><button data-r="${r.id}" ${ok ? '' : 'disabled'}>HACER</button></div>`;
  }).join('');
  open(`<h2>FABRICAR</h2><p style="color:var(--dim)">Fabricar es sospechoso si un dron te ve.</p><div class="recetas">${rows}</div><div class="fila"><button id="cerrar">CERRAR [C]</button></div>`);
  $('ventana').querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { if (G.craft(s, b.dataset.r)) beep(880, 0.1); craftMenu(); }));
  $('cerrar').onclick = close;
}

function stashMenu() {
  menu = 'escondite';
  const list = (arr, act) => arr.map((it, i) => `<button data-${act}="${i}">${ITEMS[it].g} ${ITEMS[it].name}</button>`).join('') || '<p style="color:var(--dim)">(vacío)</p>';
  open(`<h2>TU ESCONDITE</h2><p>Lo que guardas aquí no te lo quitan en los pases de lista ni en un bloqueo.</p>
    <div class="dos"><div><h3>LLEVAS (${s.p.inv.length}/${G.capacity(s)})</h3><div class="lista-it">${list(s.p.inv, 'poner')}</div></div>
    <div><h3>ESCONDIDO (${s.stash.length}/${G.STASH_MAX})</h3><div class="lista-it">${list(s.stash, 'sacar')}</div></div></div>
    <div class="fila"><button id="cerrar">CERRAR</button></div>`);
  $('ventana').querySelectorAll('[data-poner]').forEach((b) => (b.onclick = () => { G.stashPut(s, +b.dataset.poner); stashMenu(); }));
  $('ventana').querySelectorAll('[data-sacar]').forEach((b) => (b.onclick = () => { G.stashTake(s, +b.dataset.sacar); stashMenu(); }));
  $('cerrar').onclick = () => { s.pending = null; close(); };
}

// Minijuego de protocolo: tocar los pasos en el orden correcto antes de que se acabe el tiempo.
function protocolGame(id) {
  menu = 'protocolo';
  const pr = PROTOCOLS[id]; const order = pr.steps; const shuffled = order.map((x, i) => [x, i]).sort(() => Math.random() - 0.5);
  let next = 0; let time = 16; const total = 16;
  open(`<h2>${pr.title}</h2><p>Toca los pasos <b>en orden</b>. Error = −2 s.</p><div class="tiempo"><i id="pt"></i></div>
    <div class="pasos" id="pasos">${shuffled.map(([x, i]) => `<button data-i="${i}">${x}</button>`).join('')}</div>`);
  const tick = setInterval(() => { time -= 0.1; const el = $('pt'); if (el) el.style.width = `${Math.max(0, time / total * 100)}%`; if (time <= 0) done(false); }, 100);
  function done(ok) { clearInterval(tick); beep(ok ? 990 : 140, 0.25, ok ? 'square' : 'sawtooth'); G.resolveProtocol(s, ok); close(); }
  $('pasos').querySelectorAll('button').forEach((b) => (b.onclick = () => {
    if (+b.dataset.i === next) { b.classList.add('hecho'); b.disabled = true; b.textContent = `${next + 1}. ${b.textContent}`; next++; beep(520 + next * 60, 0.06); if (next === order.length) done(true); }
    else { time -= 2; beep(160, 0.12, 'sawtooth'); const v = $('ventana'); v.classList.remove('sacudir'); void v.offsetWidth; v.classList.add('sacudir'); }
  }));
}

function endScreen() {
  menu = 'fin'; clearSave();
  const o = s.over;
  open(`<div class="titulo"><h2>${o.won ? '¡VOLVISTE A CASA!' : 'MISIÓN PERDIDA'}</h2>
    ${o.won ? `<div class="estrellas">${'★'.repeat(o.stars)}${'☆'.repeat(3 - o.stars)}</div>` : ''}
    <p style="font-size:1.4rem;color:var(--amber)">${o.title}</p><p>${o.text}</p>
    <p style="color:var(--dim)">Problemas resueltos: ${s.stats.solved} · veces atrapado: ${s.stats.caught} · alerta final: ${Math.round(s.alert)} · integridad: ${Math.max(0, Math.round(s.integ))}</p>
    <div class="fila" style="justify-content:center"><button id="otra">JUGAR OTRA VEZ</button><button id="menu">MENÚ</button></div></div>`);
  $('otra').onclick = () => { s = G.newGame(); drawBase(); close(); intro(); };
  $('menu').onclick = titleScreen;
}

// ---------- controles ----------
function act(k) {
  if (!s || s.over) return;
  if (menu === 'fabricar' && k === 'c') return close();
  if (menu) return;
  if (k === 'e') { G.interact(s); if (s.pending?.kind === 'escondite') stashMenu(); else if (s.pending?.kind === 'protocolo') protocolGame(s.pending.id); }
  else if (k === 'q') G.useQ(s);
  else if (k === 'c') craftMenu();
  else if (k === 'p') { menu = 'pausa'; open('<h2>PAUSA</h2><div class="fila"><button id="seguir">SEGUIR</button><button id="ay">AYUDA</button><button id="salir">MENÚ (se guarda)</button></div>'); $('seguir').onclick = close; $('ay').onclick = () => help(() => act('p')); $('salir').onclick = () => { save(); titleScreen(); }; menu = 'pausa'; }
}
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (e.repeat) return;
  keys.add(k);
  if (k === 'escape' && menu && !['titulo', 'fin', 'protocolo', 'intro'].includes(menu)) { if (menu === 'escondite') s.pending = null; close(); return; }
  if (['e', 'q', 'c', 'p'].includes(k)) act(k);
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
$('btn-fabricar').onclick = () => act('c'); $('btn-usar').onclick = () => act('q'); $('btn-ayuda').onclick = () => { if (!menu) help(null); };
// táctil
if (matchMedia('(pointer: coarse)').matches) $('tactil').hidden = false;
const dirs = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
document.querySelectorAll('.cruz button').forEach((b) => {
  const on = (e) => { e.preventDefault(); [touch.dx, touch.dy] = dirs[b.dataset.d]; };
  const off = (e) => { e.preventDefault(); touch.dx = 0; touch.dy = 0; };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
});
$('t-e').onclick = () => act('e'); $('t-q').onclick = () => act('q'); $('t-c').onclick = () => act('c');

function input() {
  let dx = touch.dx, dy = touch.dy;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1; if (keys.has('d') || keys.has('arrowright')) dx += 1;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1; if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  return { dx, dy };
}

// ---------- bucle ----------
let lastMsg = null;
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (s) {
    if (!menu) G.update(s, dt, input());
    if (s.msg && s.msg !== lastMsg) { lastMsg = s.msg; beep(s.msg.kind === 'bad' ? 200 : s.msg.kind === 'ok' ? 880 : 520, 0.15, s.msg.kind === 'bad' ? 'sawtooth' : 'square'); }
    if (s.final && !menu && Math.floor(t / 500) !== Math.floor((t - dt * 1000) / 500)) beep(660, 0.12, 'sawtooth', 0.03);
    draw(t);
    hudT -= dt; if (hudT <= 0) { hud(); hudT = 0.1; }
    saveT -= dt; if (saveT <= 0) { save(); saveT = 10; }
    if (s.over && menu !== 'fin') { hud(); endScreen(); }
  }
  requestAnimationFrame(frame);
}
addEventListener('beforeunload', save);
document.fonts?.load('16px VT323').finally(() => { titleScreen(); requestAnimationFrame(frame); });
window.lfr = { get s() { return s; }, G }; // para depurar y para los bots de prueba
