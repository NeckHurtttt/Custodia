// Pantallas de la ACADEMIA DE CADETES: hub, briefing, minijuegos, informe, certificado, biblioteca,
// panel del profesor, ajustes de accesibilidad y modo instructor. Se conecta al juego con `api` (ver main.js).
import * as A from './academia.js';
import { MISSIONS, FASES, RANKS, SKILLS, ROLES, EVAL, GLOSARIO, BIOS, DATOS, FUENTES, MEDALLAS, PHONETIC } from './cadete-data.js';
import * as G from './core.js';

let api = null; let lastDato = 0;
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const plain = (t) => String(t).replace(/<[^>]+>/g, '');

// ---------- ajustes: idioma, voz, daltónico, letra grande, jugadores ----------
const opts = () => A.data().opts;
function setOptA(k, v) { const d = A.data(); d.opts[k] = v; A.saveData(d); applyA11y(); }
export function applyA11y() { const o = opts(); const h = document.documentElement; h.classList.toggle('daltonico', !!o.daltonico); h.classList.toggle('letra-grande', !!o.grande); h.lang = o.lang === 'en' ? 'en' : 'es'; }
const EN = { 'ACADEMIA DE CADETES': 'CADET ACADEMY', MISIONES: 'MISSIONS', EXPEDIENTE: 'RECORD', HABILIDADES: 'SKILLS', BIBLIOTECA: 'LIBRARY', PROFESOR: 'TEACHER', AJUSTES: 'SETTINGS', INSTRUCTOR: 'INSTRUCTOR', VOLVER: 'BACK', EMPEZAR: 'START', REPETIR: 'RETRY', 'A LA ACADEMIA': 'TO ACADEMY', 'Nuevo cadete': 'New cadet', Apodo: 'Nickname', 'Código de clase (opcional)': 'Class code (optional)', 'CREAR EXPEDIENTE': 'CREATE RECORD', Seguridad: 'Safety', Tiempo: 'Time', Precisión: 'Accuracy', Equipo: 'Teamwork', Comunicación: 'Communication', 'APROBADA': 'PASSED', 'NO APROBADA': 'NOT PASSED', 'Bloqueada': 'Locked', 'Mejor nota': 'Best score', 'Evaluación inicial': 'Pre-test', 'Evaluación final': 'Post-test', CERTIFICADO: 'CERTIFICATE', 'Glosario': 'Glossary', 'Astronautas': 'Astronauts', 'Datos curiosos': 'Fun facts', 'Fuentes': 'Sources', 'IMPRIMIR CHECKLISTS Y GLOSARIO': 'PRINT CHECKLISTS & GLOSSARY', 'Guía docente': 'Teacher guide', 'Cambiar de cadete': 'Switch cadet', Rango: 'Rank', 'Horas de vuelo': 'Flight hours' };
const t = (k) => (opts().lang === 'en' ? EN[k] ?? k : k);

// ---------- voz ----------
export function speak(text) {
  if (!opts().voz || !('speechSynthesis' in window)) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(plain(text)); u.lang = 'es-ES'; u.rate = 1.02; speechSynthesis.speak(u); } catch { /* sin voz */ }
}
const voiceBtn = (text) => (opts().voz ? '' : `<button class="mini voz" data-voz="${esc(plain(text))}" title="Leer en voz alta">🔊</button>`);
function wireVoice() { document.querySelectorAll('[data-voz]').forEach((b) => (b.onclick = () => { const o = opts().voz; setOptA('voz', true); speak(b.dataset.voz); if (!o) setOptA('voz', false); })); }

// ---------- insignia y avatar ----------
function insignia(r, size = 64) {
  const stripes = Array.from({ length: Math.min(3, r.stripes) }, (_, i) => `<path d="M12 ${40 + i * 7} l20 -9 l20 9" stroke="#ffd23d" stroke-width="4" fill="none"/>`).join('');
  const star = r.stripes >= 4 ? '<path d="M32 10l3.5 7 7.5 1-5.5 5 1.5 7.5-7-3.8-7 3.8 1.5-7.5-5.5-5 7.5-1z" fill="#ffd23d"/>' : '<circle cx="32" cy="20" r="7" fill="#5ff6ff"/>';
  return `<svg class="insignia" viewBox="0 0 64 64" width="${size}" height="${size}"><path d="M32 2l26 10v22c0 14-11 24-26 28C17 58 6 48 6 34V12z" fill="#13203a" stroke="#5fb6ff" stroke-width="2.5"/>${star}${stripes}</svg>`;
}
function avatar(c, size = 56) {
  const col = c.avatar?.color ?? '#3d7bff';
  return `<svg class="avatar" viewBox="0 0 16 20" width="${size}" height="${size * 1.25}" shape-rendering="crispEdges"><rect x="4" y="1" width="8" height="3" fill="#3a2a1a"/><rect x="4" y="3" width="8" height="6" fill="#e0b48a"/><rect x="6" y="5" width="1" height="1" fill="#111"/><rect x="9" y="5" width="1" height="1" fill="#111"/><rect x="3" y="9" width="10" height="7" fill="${col}"/><rect x="7" y="10" width="2" height="2" fill="#ffd23d"/><rect x="4" y="16" width="3" height="4" fill="#25304a"/><rect x="9" y="16" width="3" height="4" fill="#25304a"/></svg>`;
}

// ---------- HUB ----------
export function init(a) {
  api = a; applyA11y();
  try { const ch = new BroadcastChannel('lfr-instructor'); ch.onmessage = (e) => instructorEvent(e.data); } catch { /* sin canal */ }
}
export function hub(tab = 'misiones') {
  api.setMenu('academia'); const c = A.active();
  if (!c) return createScreen();
  const r = A.rank(c.xp), nx = A.nextRank(c.xp); const pct = nx ? Math.round(((c.xp - r.xp) / (nx.xp - r.xp)) * 100) : 100;
  const tabs = ['misiones', 'expediente', 'biblioteca', 'profesor', 'ajustes'].map((k) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${t(k.toUpperCase())}</button>`).join('');
  api.open(`<div class="acad">
    <header class="acad-top">${insignia(r, 72)}<div class="acad-who">${avatar(c)}<div><div class="acad-nick">${esc(c.nick)} ${c.clase ? `<small>· ${esc(c.clase)}</small>` : ''}</div>
      <div class="acad-rank">${t('Rango')}: <b>${opts().lang === 'en' ? r.en : r.name}</b> · ${c.xp} XP · ${t('Horas de vuelo')}: ${(c.secs / 3600).toFixed(1)}</div>
      <div class="acad-xp"><i style="width:${pct}%"></i></div><small class="dim">${nx ? `${nx.xp - c.xp} XP para ${nx.name}` : 'Rango máximo'}</small></div></div>
      <div class="acad-title">🎖 ${t('ACADEMIA DE CADETES')}</div></header>
    <nav class="acad-tabs">${tabs}<button id="ac-volver" class="mini">⟵ ${t('VOLVER')}</button></nav>
    <section class="acad-body">${TABS[tab](c)}</section></div>`, 'ancha');
  document.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { api.beep(700, 0.04); hub(b.dataset.tab); }));
  $('ac-volver').onclick = api.titleScreen;
  WIRE[tab]?.(c); wireVoice();
}

function createScreen() {
  const cols = ['#3d7bff', '#ff8a3d', '#4dff88', '#ff5d9a', '#c86bff', '#ffd23d'];
  const others = Object.values(A.data().cadets);
  api.open(`<div class="acad"><div class="acad-title">🎖 ${t('ACADEMIA DE CADETES')}</div>
    <p>Bienvenida/o, aspirante. Aquí vas a entrenar como los astronautas de verdad: protocolos de emergencia, radio con Houston, caminatas espaciales, primeros auxilios y trabajo en equipo.</p>
    <p class="dim">Solo guardamos un apodo en este dispositivo. No uses tu nombre completo.</p>
    <div class="acad-form"><label>${t('Apodo')} <input id="ac-nick" maxlength="18" placeholder="Ej.: Halcón"></label>
    <label>${t('Código de clase (opcional)')} <input id="ac-clase" maxlength="10" placeholder="Ej.: 5B"></label>
    <div class="fila">${cols.map((c, i) => `<button class="color ${i ? '' : 'on'}" data-col="${c}" style="background:${c}"></button>`).join('')}</div>
    <button id="ac-crear">${t('CREAR EXPEDIENTE')} ▶</button></div>
    ${others.length ? `<h3>${t('Cambiar de cadete')}</h3><div class="fila">${others.map((c) => `<button data-cad="${c.id}">${esc(c.nick)} · ${A.rank(c.xp).name}</button>`).join('')}</div>` : ''}
    <div class="fila"><button id="ac-volver">⟵ ${t('VOLVER')}</button></div></div>`, 'ancha');
  let col = cols[0];
  document.querySelectorAll('[data-col]').forEach((b) => (b.onclick = () => { col = b.dataset.col; document.querySelectorAll('[data-col]').forEach((x) => x.classList.toggle('on', x === b)); }));
  $('ac-crear').onclick = () => { const n = $('ac-nick').value.trim(); if (!n) { $('ac-nick').focus(); return; } A.newCadet(n, { color: col, key: n }, $('ac-clase').value); api.beep(990, 0.15); hub(); };
  document.querySelectorAll('[data-cad]').forEach((b) => (b.onclick = () => { const d = A.data(); d.active = b.dataset.cad; A.saveData(d); hub(); }));
  $('ac-volver').onclick = api.titleScreen;
}

const TABS = {
  misiones(c) {
    return Object.entries(FASES).map(([f, F]) => {
      const open = A.unlocked(c, f); const done = A.phaseDone(c, f);
      const cards = A.missionsOf(f).map((m) => { const rec = c.missions[m.id]; const ok = A.passed(c, m.id); const un = A.missionUnlocked(c, m.id);
        return `<button class="mision ${ok ? 'ok' : ''} ${un ? '' : 'bloq'} ${m.exam ? 'examen' : ''}" ${un ? `data-mis="${m.id}"` : 'disabled'}><b>${m.exam ? '📝' : m.tutorial ? '🎓' : '🚀'} ${m.name}</b><small>${Object.keys(m.skills).map((k) => SKILLS[k].icon).join(' ')} · par ${Math.round(m.par / 60)} min</small><small>${un ? (rec ? `${t('Mejor nota')}: ${rec.best} ${ok ? '✓' : ''}` : 'Nueva') : '🔒 ' + t('Bloqueada')}</small></button>`; }).join('');
      const evals = `<div class="fila evals">${c.pre[f] == null ? `<button data-eval="${f}:pre" ${open ? '' : 'disabled'}>📋 ${t('Evaluación inicial')}</button>` : `<span class="dim">${t('Evaluación inicial')}: ${c.pre[f]}/${EVAL[f].length}</span>`}
        ${done ? (c.post[f] == null ? `<button data-eval="${f}:post" class="destaca">📋 ${t('Evaluación final')}</button>` : `<span class="dim">${t('Evaluación final')}: ${c.post[f]}/${EVAL[f].length}</span> <button data-cert="${f}" class="destaca">📜 ${t('CERTIFICADO')}</button>`) : ''}</div>`;
      return `<div class="fase ${open ? '' : 'bloq'}"><h3>${opts().lang === 'en' ? F.en : F.name} <small>${F.nivel}${done ? ' · ✓' : ''}</small></h3><div class="misiones">${cards}</div>${evals}</div>`;
    }).join('') + `<p class="dim">💡 ${DATOS[(lastDato = (lastDato + 1) % DATOS.length)]}</p>`;
  },
  expediente(c) {
    const sk = Object.entries(SKILLS).map(([k, S]) => `<div class="skill"><span>${S.icon} ${opts().lang === 'en' ? S.en : S.name}</span><div class="acad-xp"><i style="width:${c.skills[k] ?? 0}%"></i></div><b>${c.skills[k] ?? 0}</b></div>`).join('');
    const med = MEDALLAS.map((m) => `<div class="medalla ${c.medals.includes(m.id) ? 'si' : ''}" title="${esc(m.desc)}">🏅<b>${m.name}</b><small>${m.desc}</small></div>`).join('');
    const hist = MISSIONS.filter((m) => c.missions[m.id]).map((m) => { const r = c.missions[m.id]; return `<li>${m.name}: mejor ${r.best} · intentos ${r.tries}</li>`; }).join('') || '<li class="dim">Todavía no hay misiones.</li>';
    const ranks = RANKS.map((r) => `<div class="rango ${c.xp >= r.xp ? 'si' : ''}">${insignia(r, 40)}<small>${r.name}<br>${r.xp} XP</small></div>`).join('');
    return `<h3>${t('HABILIDADES')}</h3><div class="skills">${sk}</div><h3>Rangos</h3><div class="rangos">${ranks}</div><h3>Medallas</h3><div class="medallas">${med}</div><h3>Historial</h3><ul class="lista">${hist}</ul>`;
  },
  biblioteca() {
    const glos = GLOSARIO.map(([es, en, def]) => `<div class="tarjeta"><b>${es}</b><small>${en}</small><p>${def}</p></div>`).join('');
    const bios = BIOS.map((b) => `<div class="tarjeta"><b>${b.name}</b><small>${b.pais}</small><p>${b.txt}</p></div>`).join('');
    const lec = MISSIONS.map((m) => `<details class="nota"><summary>📘 ${m.name}</summary>${m.leccion.map((p) => `<p>${p}</p>`).join('')}</details>`).join('');
    return `<div class="fila"><button id="ac-print">🖨 ${t('IMPRIMIR CHECKLISTS Y GLOSARIO')}</button><button id="ac-guia">👩‍🏫 ${t('Guía docente')}</button></div>
      <h3>Mini-lecciones</h3>${lec}<h3>${t('Glosario')} (ES · EN)</h3><div class="tarjetas">${glos}</div>
      <h3>${t('Astronautas')}</h3><div class="tarjetas">${bios}</div>
      <h3>Alfabeto fonético</h3><p class="fonetico">${PHONETIC.map((w) => `<span><b>${w[0]}</b> ${w}</span>`).join('')}</p>
      <h3>${t('Datos curiosos')}</h3><ul class="lista">${DATOS.map((d) => `<li>${d}</li>`).join('')}</ul>
      <h3>${t('Fuentes')}</h3><ul class="lista">${FUENTES.map(([n, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${n}</a></li>`).join('')}</ul>`;
  },
  profesor() {
    const d = A.data(); const all = Object.values(d.cadets); const cl = opts().clase ?? '';
    const list = cl ? all.filter((c) => c.clase === cl) : all; const clases = [...new Set(all.map((c) => c.clase).filter(Boolean))];
    const rows = list.map((c) => { const ms = Object.values(c.missions); const avg = ms.length ? Math.round(ms.reduce((a, r) => a + r.best, 0) / ms.length) : '—';
      return `<tr><td>${esc(c.nick)}</td><td>${esc(c.clase || '—')}</td><td>${A.rank(c.xp).name}</td><td>${c.xp}</td><td>${MISSIONS.filter((m) => A.passed(c, m.id)).length}/${MISSIONS.length}</td><td>${avg}</td><td>${Math.round(c.secs / 60)}</td><td>${Object.keys(FASES).map((f) => `${c.pre[f] ?? '–'}→${c.post[f] ?? '–'}`).join(' ')}</td></tr>`; }).join('');
    const top = A.topErrors(list).map(([k, n]) => `<li>${esc(k)} <b>×${n}</b></li>`).join('') || '<li class="dim">Sin errores registrados.</li>';
    return `<p class="dim">Datos guardados solo en este dispositivo. Para juntar varios dispositivos: cada cadete exporta y el profesor importa.</p>
      <div class="fila"><span>Clase:</span><button data-clase="" class="${cl ? '' : 'on'}">TODAS</button>${clases.map((c) => `<button data-clase="${esc(c)}" class="${c === cl ? 'on' : ''}">${esc(c)}</button>`).join('')}</div>
      <div class="tabla"><table><thead><tr><th>Apodo</th><th>Clase</th><th>Rango</th><th>XP</th><th>Misiones</th><th>Promedio</th><th>Min</th><th>Eval. antes→después (E · L · M)</th></tr></thead><tbody>${rows || '<tr><td colspan="8" class="dim">Sin cadetes.</td></tr>'}</tbody></table></div>
      <h3>Errores más frecuentes</h3><ul class="lista">${top}</ul>
      <div class="fila"><button id="ac-exp">⬇ EXPORTAR (JSON)</button><button id="ac-csv">⬇ CSV para Excel</button><label class="boton">⬆ IMPORTAR<input id="ac-imp" type="file" accept=".json" hidden multiple></label><button id="ac-guia">👩‍🏫 ${t('Guía docente')}</button><button id="ac-instr">🎛 ${t('INSTRUCTOR')} (otra ventana)</button></div>`;
  },
  ajustes() {
    const o = opts(); const tg = (k, label) => `<button data-opt="${k}" class="${o[k] ? 'on' : ''}">${o[k] ? '✓' : '○'} ${label}</button>`;
    return `<h3>Accesibilidad</h3><div class="fila">${tg('voz', '🔊 Narración por voz')}${tg('daltonico', '🎨 Modo daltónico')}${tg('grande', '🔠 Letra grande')}</div>
      <h3>Idioma de la academia</h3><div class="fila"><button data-lang="es" class="${o.lang !== 'en' ? 'on' : ''}">Español</button><button data-lang="en" class="${o.lang === 'en' ? 'on' : ''}">English</button><small class="dim">El menú y el glosario cambian; las misiones están en español con términos técnicos en ambos idiomas.</small></div>
      <h3>Tripulación</h3><div class="fila"><button data-jug="1" class="${o.jug !== 2 ? 'on' : ''}">1 cadete</button><button data-jug="2" class="${o.jug === 2 ? 'on' : ''}">2 cadetes · cooperativo con roles</button>${o.jug === 2 ? `<button id="ac-swap">⇄ Intercambiar roles (${o.swap ? 'J2 manda' : 'J1 manda'})</button>` : ''}</div>
      ${o.jug === 2 ? `<p class="dim">J1: ${rolesTxt(0)} · J2: ${rolesTxt(1)}. J1 juega con WASD + E; J2 con flechas + Enter.</p>` : ''}
      <h3>Cadetes en este dispositivo</h3><div class="fila"><button id="ac-nuevo">+ ${t('Nuevo cadete')}</button>${Object.values(A.data().cadets).map((c) => `<button data-cad="${c.id}" class="${c.id === A.data().active ? 'on' : ''}">${esc(c.nick)}</button>`).join('')}</div>
      <p class="dim">Funciona sin internet: después de abrirlo una vez, se puede instalar como app (menú del navegador → Instalar).</p>`;
  },
};
const rolesTxt = (i) => Object.entries(roles()).filter(([, v]) => v === i).map(([k]) => `${ROLES[k].icon} ${ROLES[k].name}`).join(', ');
function roles() { const r = A.defaultRoles(); if (opts().swap) for (const k in r) r[k] = 1 - r[k]; return r; }

const WIRE = {
  misiones() {
    document.querySelectorAll('[data-mis]').forEach((b) => (b.onclick = () => briefing(b.dataset.mis)));
    document.querySelectorAll('[data-eval]').forEach((b) => (b.onclick = () => { const [f, w] = b.dataset.eval.split(':'); evalScreen(f, w); }));
    document.querySelectorAll('[data-cert]').forEach((b) => (b.onclick = () => certificate(b.dataset.cert)));
  },
  biblioteca() { $('ac-print').onclick = printPack; $('ac-guia').onclick = guide; },
  profesor() {
    document.querySelectorAll('[data-clase]').forEach((b) => (b.onclick = () => { setOptA('clase', b.dataset.clase); hub('profesor'); }));
    $('ac-exp').onclick = () => download('cadetes.json', JSON.stringify({ cadets: A.data().cadets }, null, 1), 'application/json');
    $('ac-csv').onclick = () => download('cadetes.csv', '﻿' + A.csv(Object.values(A.data().cadets)), 'text/csv');
    $('ac-imp').onchange = async (e) => { let n = 0; for (const f of e.target.files) { try { n += A.importCadets(await f.text()); } catch { /* archivo malo */ } } api.beep(880, 0.1); hub('profesor'); api.toast(`Importados: ${n}`); };
    $('ac-guia').onclick = guide; $('ac-instr').onclick = () => window.open('instructor.html', 'lfr-instructor', 'width=520,height=640');
  },
  ajustes() {
    document.querySelectorAll('[data-opt]').forEach((b) => (b.onclick = () => { setOptA(b.dataset.opt, !opts()[b.dataset.opt]); if (b.dataset.opt === 'voz' && opts().voz) speak('Narración activada.'); hub('ajustes'); }));
    document.querySelectorAll('[data-lang]').forEach((b) => (b.onclick = () => { setOptA('lang', b.dataset.lang); hub('ajustes'); }));
    document.querySelectorAll('[data-jug]').forEach((b) => (b.onclick = () => { setOptA('jug', +b.dataset.jug); hub('ajustes'); }));
    $('ac-swap') && ($('ac-swap').onclick = () => { setOptA('swap', !opts().swap); hub('ajustes'); });
    $('ac-nuevo').onclick = () => { const d = A.data(); d.active = null; A.saveData(d); createScreen(); };
    document.querySelectorAll('[data-cad]').forEach((b) => (b.onclick = () => { const d = A.data(); d.active = b.dataset.cad; A.saveData(d); hub('ajustes'); }));
  },
};
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }

// ---------- evaluaciones antes / después ----------
function evalScreen(fase, when) {
  const qs = EVAL[fase]; const ans = [];
  const show = (i) => {
    if (i >= qs.length) { const sc = A.gradeEval(fase, ans); A.recordEval(fase, when, sc); api.open(`<h2>${when === 'pre' ? t('Evaluación inicial') : t('Evaluación final')}</h2><p class="grande-num">${sc}/${qs.length}</p><p>${when === 'pre' ? 'Ahora entrena con las misiones y al final repites esta evaluación para ver cuánto aprendiste.' : `Antes: ${A.active().pre[fase] ?? '–'} · Ahora: ${sc}.`}</p><div class="fila"><button id="ev-ok">${when === 'post' ? '📜 ' + t('CERTIFICADO') : 'OK'}</button></div>`); $('ev-ok').onclick = () => (when === 'post' ? certificate(fase) : hub()); return; }
    const q = qs[i];
    api.open(`<h2>📋 ${FASES[fase].name} · ${i + 1}/${qs.length}</h2><p class="pregunta">${q.q} ${voiceBtn(q.q)}</p><div class="opciones">${q.ops.map((o, k) => `<button data-op="${k}">${String.fromCharCode(65 + k)}. ${o}</button>`).join('')}</div>`);
    speak(q.q); wireVoice();
    document.querySelectorAll('[data-op]').forEach((b) => (b.onclick = () => { ans[i] = +b.dataset.op; api.beep(600, 0.04); show(i + 1); }));
  };
  show(0);
}

// ---------- briefing y arranque ----------
function briefing(id) {
  const m = A.mission(id); const coop = opts().jug === 2; let page = 0;
  const show = () => {
    const last = page >= m.leccion.length - 1;
    const roleTxt = coop ? `<div class="roles">${[0, 1].map((i) => `<div style="--pc:${api.PCOL[i]}"><b>J${i + 1}</b> ${rolesTxt(i)}</div>`).join('')}</div>` : '';
    const steps = m.exam ? '<p class="dim">Examen: los pasos se revelan durante la misión.</p>' : `<ol class="pasos">${m.steps.map((s) => `<li>${s.txt}${coop && s.rol ? ` <em>(${ROLES[s.rol].icon} ${ROLES[s.rol].name})</em>` : ''}</li>`).join('')}</ol>`;
    api.open(`<div class="brief"><h2>${m.exam ? '📝' : '🚀'} ${m.name} <small>${FASES[m.fase].name}</small></h2>
      <div class="leccion"><p>${m.leccion[page]}</p>${voiceBtn(m.leccion[page])}<small class="dim">Lección ${page + 1}/${m.leccion.length}</small></div>
      ${last ? `<h3>Objetivos</h3>${steps}${roleTxt}<p class="dim">Tiempo par: ${Math.round(m.par / 60)} min · aprueba con ${m.exam ? A.PASS_EXAM : A.PASS}. Criterios: seguridad, tiempo, precisión${coop ? ', equipo' : ''} y comunicación.</p>` : ''}
      <div class="fila">${page ? '<button id="br-prev">◀</button>' : ''}${last ? `<button id="br-go" class="destaca">${t('EMPEZAR')} ▶</button>` : '<button id="br-next">SIGUIENTE ▶</button>'}<button id="br-back">${t('VOLVER')}</button></div></div>`, 'ancha');
    speak(m.leccion[page]); wireVoice();
    $('br-prev') && ($('br-prev').onclick = () => { page--; show(); });
    $('br-next') && ($('br-next').onclick = () => { page++; show(); });
    $('br-go') && ($('br-go').onclick = () => launch(id));
    $('br-back').onclick = () => hub();
  };
  show();
}
function launch(id) {
  const coop = opts().jug === 2; const c = A.active();
  const s = A.startMission(id, { coop, seed: (Date.now() & 0xffff) + 1, roles: coop ? roles() : null });
  api.PNAME[0] = c.nick; api.PCOL[0] = c.avatar.color;
  api.setS(s); api.close(); api.M.start();
  const st = A.currentStep(s); api.toast(plain(st.txt)); speak(st.txt);
}

// ---------- cada cuadro de la misión ----------
let lastStep = -1;
export function frame(s, dt) {
  const c = s.cadet; if (!c) return;
  if (c.done) { debrief(s); return; }
  const req = A.tick(s, dt);
  if (c.step !== lastStep) { lastStep = c.step; const st = A.currentStep(s); if (st && c.step > 0) { api.toast(plain(st.txt)); speak(st.txt); api.beep(880, 0.08); } }
  if (c.done) { debrief(s); return; }
  if (req) { const sv = s.p; if (s.ps) s.p = s.ps[req.player]; if (req.open === 'codigo') codeGame(s, req); else game(s, req.st, req.player); s.p = sv; }
}
/** Texto del objetivo actual (para la barra de arriba). */
export function objective(s) {
  const c = s.cadet; const st = A.currentStep(s); if (!st) return '';
  const n = `${c.step + 1}/${A.mission(c.id).steps.length}`;
  const who = s.ps && st.rol ? ` [J${(c.roles?.[st.rol] ?? ROLES[st.rol].player) + 1} ${ROLES[st.rol].icon}]` : '';
  return `🎯 ${n}${who} ${plain(st.txt)}`;
}
/** Sala a la que apunta la flecha (null en examen). */
export function target(s) {
  const c = s.cadet; const st = A.currentStep(s); if (!st || c.exam) return null;
  if (st.t === 'codigo') return c.reader == null ? st.leer : st.meter;
  return st.room;
}
export const code = (s) => (A.codeVisible(s) ? s.cadet.code : null);

// ---------- minijuegos ----------
function game(s, st, player) {
  const g = st.game; const tag = s.ps ? `<span class="jtag" style="--pc:${api.PCOL[player]}">J${player + 1}</span>` : '';
  const done = (res) => { api.close(); A.finishGame(s, res, player); };
  api.setMenu('cadete');
  ({ orden: gameOrder, quiz: gameQuiz, numero: gameNumber, recursos: gameResources })[g.type](s, st, tag, done);
}

function gameOrder(s, st, tag, done) {
  const g = st.game; const pool = shuffle([...g.items, ...(g.extra ?? [])]); const picked = []; let errors = 0; const notes = [];
  const render = () => {
    api.open(`<h2>${tag} ✅ ${g.title}</h2><p class="dim">${plain(st.txt)} Toca los pasos <b>en orden</b>.</p>
      <ol class="checklist">${g.items.map((it, i) => `<li class="${i < picked.length ? 'ok' : ''}">${i < picked.length ? '☑ ' + it : '☐ …'}</li>`).join('')}</ol>
      <div class="opciones">${pool.map((it, k) => (picked.includes(it) ? '' : `<button data-it="${k}">${it}</button>`)).join('')}</div><p class="dim">Errores: ${errors}</p>`);
    document.querySelectorAll('[data-it]').forEach((b) => (b.onclick = () => {
      const it = pool[+b.dataset.it];
      if (it === g.items[picked.length]) { picked.push(it); api.beep(700 + picked.length * 60, 0.06); if (picked.length === g.items.length) { const ok = Math.max(0, g.items.length - errors); return done({ ok, total: g.items.length, notes, tag: g.title }); } }
      else { errors++; api.beep(180, 0.15, 'sawtooth'); b.classList.add('mal'); const want = g.items[picked.length]; notes.push(`${g.title}: elegiste "${it}" cuando tocaba "${want}".`); setTimeout(render, 380); return; }
      render();
    }));
  };
  speak(g.title); render();
}

function gameQuiz(s, st, tag, done) {
  const g = st.game; let i = 0, ok = 0; const notes = []; const exam = s.cadet.exam;
  const show = () => {
    if (i >= g.qs.length) return done({ ok, total: g.qs.length, notes, tag: g.decision ? 'Decisión bajo presión' : plain(st.txt), comm: g.qs.some((q) => /radio|Houston|CAPCOM|copiado/i.test(q.q)) });
    const q = g.qs[i]; const stars = g.stars ? starMap(q.star) : '';
    api.open(`<h2>${tag} ${g.decision ? '⚖ Decisión' : '❓ Pregunta'} ${i + 1}/${g.qs.length}</h2>${stars}<p class="pregunta">${q.q} ${voiceBtn(q.q)}</p><div class="opciones">${q.ops.map((o, k) => `<button data-op="${k}">${String.fromCharCode(65 + k)}. ${o}</button>`).join('')}</div>`);
    speak(q.q); wireVoice();
    document.querySelectorAll('[data-op]').forEach((b) => (b.onclick = () => {
      const right = +b.dataset.op === q.ok; if (right) ok++; else notes.push(`"${plain(q.q)}" → correcta: ${q.ops[q.ok]}. ${q.why}`);
      api.beep(right ? 880 : 180, 0.12, right ? 'square' : 'sawtooth');
      if (exam) { i++; return show(); }
      api.open(`<h2>${right ? '✔ ¡Correcto!' : '✘ No exactamente'}</h2><p>${right ? '' : `La respuesta era: <b>${q.ops[q.ok]}</b>.`}</p><p class="porque">💡 ${q.why}</p><div class="fila"><button id="q-next">SIGUIENTE ▶</button></div>`);
      speak((right ? 'Correcto. ' : 'No exactamente. ') + q.why); $('q-next').onclick = () => { i++; show(); };
    }));
  };
  show();
}
function starMap(bright) {
  const cols = 'ABCDE'; let h = '<div class="estrellas"><div></div>' + [...cols].map((c) => `<b>${c}</b>`).join('');
  for (let r = 1; r <= 4; r++) { h += `<b>${r}</b>`; for (const c of cols) { const id = c + r; const big = id === bright; const dim = !big && ((c.charCodeAt(0) * 7 + r * 3) % 4 === 0); h += `<span>${big ? '★' : dim ? '·' : ''}</span>`; } }
  return h + '</div>';
}

function gameNumber(s, st, tag, done) {
  const g = st.game; let i = 0, ok = 0; const notes = []; const exam = s.cadet.exam;
  const show = () => {
    if (i >= g.qs.length) return done({ ok, total: g.qs.length, notes, tag: 'Cálculo: ' + plain(st.txt) });
    const q = g.qs[i];
    api.open(`<h2>${tag} 🧮 Cálculo ${i + 1}/${g.qs.length}</h2><p class="pregunta">${q.q} ${voiceBtn(q.q)}</p><div class="fila"><input id="n-val" inputmode="decimal" autocomplete="off" placeholder="Tu respuesta"><button id="n-ok">COMPROBAR</button></div><p class="dim">Puedes usar coma o punto para los decimales.</p>`);
    speak(q.q); wireVoice(); const inp = $('n-val'); inp.focus();
    const check = () => { const v = parseFloat(inp.value.replace(',', '.')); if (Number.isNaN(v)) return inp.focus();
      const right = Math.abs(v - q.ans) <= q.tol; if (right) ok++; else notes.push(`Cálculo: respondiste ${v}; era ${String(q.ans).replace('.', ',')}. ${q.why}`);
      api.beep(right ? 880 : 180, 0.12, right ? 'square' : 'sawtooth');
      if (exam) { i++; return show(); }
      api.open(`<h2>${right ? '✔ ¡Correcto!' : '✘ Revisa el cálculo'}</h2><p class="porque">💡 ${q.why}</p><div class="fila"><button id="q-next">SIGUIENTE ▶</button></div>`); $('q-next').onclick = () => { i++; show(); }; };
    $('n-ok').onclick = check; inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') check(); };
  };
  show();
}

function gameResources(s, st, tag, done) {
  const g = st.game; const val = Object.fromEntries(g.items.map((it) => [it.id, 25]));
  const render = () => {
    const sum = Object.values(val).reduce((a, b) => a + b, 0);
    api.open(`<h2>${tag} ⚡ ${g.title}</h2><p class="dim">${plain(st.txt)} Total: <b class="${sum === 100 ? 'okc' : 'malc'}">${sum}/100</b></p>
      <div class="recursos">${g.items.map((it) => `<label><span>${it.name}</span><input type="range" min="0" max="100" step="5" value="${val[it.id]}" data-r="${it.id}"><b>${val[it.id]}</b></label>`).join('')}</div>
      <div class="fila"><button id="r-ok" ${sum === 100 ? '' : 'disabled'}>CONFIRMAR</button></div>`);
    document.querySelectorAll('[data-r]').forEach((r) => (r.oninput = () => { val[r.dataset.r] = +r.value; r.nextElementSibling.textContent = r.value; const sm = Object.values(val).reduce((a, b) => a + b, 0); $('r-ok').disabled = sm !== 100; r.closest('.ventana').querySelector('.dim b').textContent = `${sm}/100`; }));
    $('r-ok').onclick = () => { let ok = 0; const notes = [];
      for (const it of g.items) { if (val[it.id] >= it.min && val[it.id] <= it.max) ok++; else notes.push(`Energía: ${it.name} quedó en ${val[it.id]}; lo recomendable es entre ${it.min} y ${it.max}.`); }
      if (val.vital < 45) notes.unshift('¡Cuidado! El soporte vital (aire y calor) siempre va primero.');
      done({ ok, total: g.items.length, notes, tag: g.title }); };
  };
  render();
}

function codeGame(s, req) {
  const tag = s.ps ? `<span class="jtag" style="--pc:${api.PCOL[req.player]}">J${req.player + 1}</span>` : '';
  api.setMenu('cadete'); const coop = !!s.ps;
  api.open(`<h2>${tag} 📟 Marca el código</h2><p>${coop ? 'Tu compañero lo está leyendo en la otra sala: ¡pregúntale en voz alta!' : 'Escribe el código que viste.'}</p>${coop ? `<p class="codigo-grande">${s.cadet.code.split('').map(() => '•').join(' ')}</p><p class="dim">El código aparece en la pantalla mientras J${s.cadet.reader + 1} esté en la sala de lectura.</p>` : ''}
    <div class="fila"><input id="c-val" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="0000"><button id="c-ok">ENVIAR</button><button id="c-x">${t('VOLVER')}</button></div>`);
  const inp = $('c-val'); inp.focus();
  const send = () => { const ok = inp.value.trim() === s.cadet.code; api.beep(ok ? 990 : 160, 0.15, ok ? 'square' : 'sawtooth'); api.close(); A.finishGame(s, { ok: ok ? 1 : 0, total: 1, comm: true, tag: 'Código leído en equipo' }, req.player); if (!ok) api.toast('Código incorrecto. Vuelve a leerlo.'); };
  $('c-ok').onclick = send; inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') send(); };
  $('c-x').onclick = () => { api.close(); A.cancelGame(s); const p = s.ps?.[req.player] ?? s.p; p.x += 0; };
}

// ---------- informe final ----------
function debrief(s) {
  if (s.cadet.shown) return; s.cadet.shown = true; api.setMenu('cadete');
  const sc = s.over ? { ...A.score(s), total: 0, pass: false } : A.score(s); const m = A.mission(s.cadet.id);
  const res = A.applyResult(s, sc); const c = A.active();
  const crit = [['Seguridad', sc.crit.seguridad], ['Tiempo', sc.crit.tiempo], ['Precisión', sc.crit.precision], ['Equipo', sc.crit.equipo], ['Comunicación', sc.crit.comunicacion]].filter(([, v]) => v != null);
  const coop = sc.coop ? `<h3>¿Quién hizo qué?</h3><div class="roles">${[0, 1].map((i) => `<div style="--pc:${api.PCOL[i]}"><b>J${i + 1}</b> ${sc.byPlayer[i] ?? 0} pasos · ${rolesTxt(i)}</div>`).join('')}</div>` : '';
  api.open(`<div class="debrief"><h2>${sc.pass ? '✔ ' + t('APROBADA') : '✘ ' + t('NO APROBADA')} · ${m.name}</h2>
    <div class="nota-final ${sc.pass ? 'ok' : 'mal'}">${sc.total}<small>/100</small></div>
    <div class="criterios">${crit.map(([k, v]) => `<div><span>${t(k)}</span><div class="acad-xp"><i style="width:${v}%"></i></div><b>${v}</b></div>`).join('')}</div>
    <p>⏱ ${Math.floor(sc.time / 60)}:${String(sc.time % 60).padStart(2, '0')} (par ${Math.round(m.par / 60)} min) · +${res.xp} XP ${res.rankUp ? `· <b class="okc">¡ASCENSO A ${res.rankUp.name.toUpperCase()}!</b>` : ''}</p>
    ${res.gained.length ? `<div class="medallas">${res.gained.map((g) => `<div class="medalla si nueva">🏅<b>${g.name}</b><small>${g.desc}</small></div>`).join('')}</div>` : ''}
    <h3>Comentarios de la instructora</h3><ul class="comentarios">${sc.notes.map((n) => `<li>${esc(plain(n))}</li>`).join('')}</ul>${coop}
    <div class="fila"><button id="d-rep">↻ ${t('REPETIR')}</button><button id="d-hub" class="destaca">🎖 ${t('A LA ACADEMIA')}</button>${A.phaseDone(c, m.fase) && c.post[m.fase] == null ? `<button id="d-eval">📋 ${t('Evaluación final')}</button>` : ''}</div></div>`, 'ancha');
  speak(`${sc.pass ? 'Misión aprobada' : 'Misión no aprobada'}. Nota ${sc.total}. ${sc.notes[0] ?? ''}`);
  if (res.rankUp) api.M.sting?.('logro');
  $('d-rep').onclick = () => { api.setS(null); briefing(m.id); };
  $('d-hub').onclick = () => { api.setS(null); hub(); };
  $('d-eval') && ($('d-eval').onclick = () => { api.setS(null); evalScreen(m.fase, 'post'); });
}

// ---------- certificado, impresión y guía ----------
function printWin(title, body) {
  const w = window.open('', '_blank'); if (!w) return api.toast('Permite las ventanas emergentes para imprimir.');
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${title}</title><style>body{font-family:system-ui,sans-serif;margin:2rem;color:#111}h1,h2{margin:.2em 0}.cert{border:8px double #1d3b6e;padding:2.5rem;text-align:center;max-width:780px;margin:auto}.cert h1{font-size:2.4rem;color:#1d3b6e}.big{font-size:2rem;font-weight:700;margin:.6rem 0}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:.3rem .5rem;text-align:left}ol li{margin:.2rem 0}.box{break-inside:avoid;border:1px solid #bbb;padding:.6rem 1rem;margin:.6rem 0;border-radius:6px}@media print{button{display:none}}</style>${body}<p><button onclick="print()">Imprimir</button></p>`);
  w.document.close();
}
function certificate(fase) {
  const c = A.active(); const F = FASES[fase]; const r = A.rank(c.xp); const ms = A.missionsOf(fase);
  printWin('Certificado', `<div class="cert"><p>ACADEMIA DE CADETES · LIFELINE</p><h1>CERTIFICADO</h1><p>Se certifica que el cadete</p><div class="big">${esc(c.nick)}</div><p>completó la <b>${F.name}</b> (nivel ${F.nivel})</p>
    <table><tr><th>Misión</th><th>Mejor nota</th></tr>${ms.map((m) => `<tr><td>${m.name}</td><td>${c.missions[m.id]?.best ?? '–'}</td></tr>`).join('')}</table>
    <p>Evaluación: antes ${c.pre[fase] ?? '–'}/${EVAL[fase].length} → después ${c.post[fase] ?? '–'}/${EVAL[fase].length}</p><p>Rango: <b>${r.name}</b> · ${c.xp} XP · ${new Date().toLocaleDateString('es')}</p><p style="margin-top:2.5rem">______________________<br>Instructor/a</p></div>`);
}
function printPack() {
  const checks = MISSIONS.flatMap((m) => m.steps.filter((s) => s.game?.type === 'orden' && !s.game.extra).map((s) => `<div class="box"><h2>☐ ${s.game.title}</h2><ol>${s.game.items.map((i) => `<li>☐ ${i}</li>`).join('')}</ol></div>`)).join('');
  const glos = `<table><tr><th>Término</th><th>English</th><th>Qué es</th></tr>${GLOSARIO.map(([a, b, c]) => `<tr><td><b>${a}</b></td><td>${b}</td><td>${c}</td></tr>`).join('')}</table>`;
  printWin('Checklists y glosario', `<h1>Checklists de la academia</h1>${checks}<h1>Glosario espacial</h1>${glos}<h1>Alfabeto fonético</h1><p>${PHONETIC.join(' · ')}</p>`);
}
function guide() {
  printWin('Guía docente', `<h1>Guía docente · Academia de cadetes</h1><p>Para 10–15 años. Cada misión dura 3–5 minutos y entrena una habilidad. Se recomienda jugar en parejas (cooperativo con roles) y conversar después.</p>
  <h2>Cómo usarla en clase (45 min)</h2><ol><li>5 min · Evaluación inicial de la fase (en el juego).</li><li>25 min · 2–3 misiones en parejas. Rotar roles en cada misión.</li><li>10 min · Actividad sin pantalla (abajo).</li><li>5 min · Comentar los "comentarios de la instructora" de cada pareja.</li></ol>
  <h2>Modo instructor</h2><p>En el panel del profesor, abre "Instructor" en otra ventana del mismo equipo (por ejemplo en el proyector): desde ahí puedes lanzar incendios, fugas, apagones o mensajes de radio a las misiones en curso de ese equipo.</p>
  <h2>Actividades fuera de la pantalla</h2>${MISSIONS.filter((m) => !m.exam).map((m) => `<div class="box"><b>${m.name}</b> — ${ACTIVIDADES[m.id]}</div>`).join('')}
  <h2>Seguimiento</h2><p>Panel del profesor: progreso, errores más frecuentes y evaluación antes→después. Exporta CSV para Excel. Para juntar varios equipos: cada uno exporta JSON y se importan todos en uno.</p>
  <h2>Privacidad</h2><p>No se piden nombres reales ni correos. Todo queda en el navegador del equipo.</p>`);
}
const ACTIVIDADES = {
  m1: 'Armar el horario de un día en la ISS con 2 h de ejercicio y comparar con el propio.',
  m2: 'Simulacro de evacuación del aula con roles: quien avisa, quien cierra, quien cuenta.',
  m3: 'Deletrear sus nombres con el alfabeto fonético en parejas, espalda con espalda.',
  m4: 'Calcular cuánto oxígeno usaría la clase entera en un día (0,84 kg por persona).',
  m5: 'Ponerse guantes gruesos y abrochar botones: ¿por qué todo cuesta más con traje?',
  m6: 'Tarjetas de triaje: ordenar casos del más urgente al menos urgente y justificar.',
  m7: 'Repartir 100 fichas de energía entre sistemas y defender la decisión ante el grupo.',
  m8: 'Mapa de estrellas en cuadrícula: ubicar constelaciones con coordenadas.',
  m9: 'Seguir un manual paso a paso para armar algo simple (avión de papel) sin saltarse pasos.',
  m10: 'Debate: ¿qué apagarías primero en una tormenta? Votar y explicar.',
  m11: 'Dibujar el ciclo del agua y del aire de una base marciana con flechas.',
};

// ---------- modo instructor (otra ventana del mismo equipo) ----------
function instructorEvent(msg) {
  const s = api.getS(); if (!s?.cadet || s.cadet.done || !msg) return;
  if (msg.type === 'peligro') { const kind = { estacion: { fuego: 'fuego', fuga: 'fuga', amoniaco: 'amoniaco' }, luna: { fuego: 'frio', fuga: 'grieta', amoniaco: 'polvo' }, marte: { fuego: 'perclorato', fuga: 'plaga', amoniaco: 'perclorato' } }[s.loc][msg.kind];
    const h = G.spawnHazard(s, kind, msg.room || undefined); const tool = h?.def.tool; for (const p of G.players(s)) if (tool && !p.inv.includes(tool)) { p.inv.push(tool); break; }
    api.toast(`🎛 Instructor: ¡${h?.def.name ?? 'Emergencia'}! Resuélvanla.`); speak(`Atención: ${h?.def.name}`); }
  if (msg.type === 'radio') { api.toast(`📻 CAPCOM: ${msg.text}`); speak(`CAPCOM: ${msg.text}`); }
  if (msg.type === 'pista') { const st = A.currentStep(s); if (st) api.toast(`💡 Pista: ${plain(st.txt)}`); }
  if (msg.type === 'pausa') api.pause();
}

/** Lista de objetivos para el panel de abajo. */
export function stepsHtml(s) {
  const c = s.cadet; const m = A.mission(c.id);
  return `<div class="dk-col dk-plan dk-mision"><h3>🎯 ${m.name} <small>${Math.min(c.step + 1, m.steps.length)}/${m.steps.length}</small></h3><div class="dk-prog"><i style="width:${(c.step / m.steps.length) * 100}%"></i></div>
    <ul>${m.steps.map((st, i) => `<li class="${i < c.step ? 'ok' : i === c.step ? 'actual' : ''}">${i < c.step ? '☑' : i === c.step ? '▶' : '☐'} <span>${c.exam && i > c.step ? '???' : plain(st.txt)}</span></li>`).join('')}</ul></div>
    <div class="dk-col dk-rutas"><h3>⏱ ${Math.floor(c.t / 60)}:${String(Math.floor(c.t % 60)).padStart(2, '0')}</h3><ul><li>Par: ${Math.round(m.par / 60)} min</li><li>Daño: ${Math.round(c.dmg)}</li>${s.ps ? `<li>J1 ${c.byPlayer[0] ?? 0} · J2 ${c.byPlayer[1] ?? 0} pasos</li>` : ''}</ul></div>`;
}
export { debrief };
