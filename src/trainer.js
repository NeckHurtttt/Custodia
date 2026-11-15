// Capa de ENTRENAMIENTO: lo que un astronauta practica de verdad, metido dentro del juego sin frenarlo.
// - Panel de alarmas: leer los sensores e identificar la emergencia (1 clic, dentro del minijuego).
// - Radio a Control de Misión: elegir el mensaje bien formado (1 clic). En Marte, el retraso obliga a actuar primero.
// - Soporte vital: O2, agua y energía bajan con los problemas sin resolver y suben al resolverlos.
// - EVA: chequeo del traje + pre-respiración quieto en la esclusa (los drones siguen moviéndose).
// - Informe al final: qué salió bien, qué mejorar y el error más repetido.

/** Lectura de sensores por problema. rojo = PELIGRO (las 3 emergencias del ISS), amarillo = PRECAUCIÓN. */
export const SENSORS = {
  fuego: { lvl: 'rojo', name: 'Incendio', read: 'Humo: ALTO · Temp.: 61 °C · CO: 45 ppm' },
  fuga: { lvl: 'rojo', name: 'Despresurización', read: 'Presión: 101 → 94 kPa y bajando · ventiladores forzados' },
  amoniaco: { lvl: 'rojo', name: 'Atmósfera tóxica (amoniaco)', read: 'NH₃: 32 ppm · olor fuerte · circuito externo con baja presión' },
  polvo: { lvl: 'amarillo', name: 'Polvo en el hábitat', read: 'Partículas PM10: 900 µg/m³ · filtros saturados' },
  grieta: { lvl: 'amarillo', name: 'Grieta estructural', read: 'Sismómetro: 3,1 · presión del módulo oscila' },
  plaga: { lvl: 'amarillo', name: 'Plaga en cultivos', read: 'Hojas manchadas · humedad 92 % · esporas altas' },
  mutacion: { lvl: 'amarillo', name: 'Plaga en cultivos', read: 'Crecimiento anormal · humedad 95 % · esporas altas' },
  perclorato: { lvl: 'amarillo', name: 'Contaminación química', read: 'Perclorato en superficies · irritación en la piel' },
  hongo: { lvl: 'amarillo', name: 'Contaminación biológica', read: 'Esporas en el aire · flujo del filtro −40 %' },
};
/** Qué recurso de soporte vital gasta cada problema. */
export const VITAL_OF = { fuego: 'energia', fuego0g: 'energia', apagon: 'energia', canadarm: 'energia', fuga: 'o2', grieta: 'o2', meteoritos: 'o2', basura: 'o2', amoniaco: 'o2', hongo: 'o2', polvo: 'o2', diablo: 'o2', tormenta: 'energia', radiacion: 'energia', frio: 'energia', plaga: 'agua', mutacion: 'agua', perclorato: 'agua', cuarentena: 'agua' };
export const VITALS = { o2: 'OXÍGENO', agua: 'AGUA', energia: 'ENERGÍA' };
export const AREAS = { alarma: 'Panel de alarmas', radio: 'Comunicación', proc: 'Procedimientos', eva: 'Salidas (EVA)', vital: 'Soporte vital' };
export const EVA_STEPS = ['Revisar sellos del casco y los guantes', 'Presurizar el traje (29,6 kPa)', 'Probar oxígeno y filtro de CO₂', 'Probar radio y luces del casco'];
export const PREBREATHE = 6; // segundos quieto con oxígeno puro antes de salir

export const newTrain = () => ({ alarma: [0, 0], radio: [0, 0], proc: [0, 0], eva: [0, 0], vital: [0, 0], why: {} });
const shuffle = (a, rnd) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** Anota un acierto o error. why = causa corta del error (para el informe). */
export function trainRecord(s, area, ok, why) {
  s.train ??= newTrain(); const a = s.train[area]; if (!a) return;
  a[1]++; if (ok) a[0]++; else if (why) s.train.why[String(why).slice(0, 80)] = (s.train.why[why] ?? 0) + 1;
}

/** Pregunta del panel de alarmas para un problema (o null si ese problema no tiene sensores). */
export function alarmQuiz(kind, rnd = Math.random) {
  const sn = SENSORS[kind]; if (!sn) return null;
  const others = shuffle([...new Set(Object.values(SENSORS).map((x) => x.name))].filter((n) => n !== sn.name), rnd).slice(0, 2);
  return { lvl: sn.lvl, read: sn.read, answer: sn.name, options: shuffle([sn.name, ...others], rnd) };
}

/** Pregunta de radio: un mensaje bien formado (quién llama, qué pasa, dónde, qué hacen) entre mensajes incompletos. */
export function radioQuiz(L, what, room, rnd = Math.random) {
  const ctl = 'Houston', me = L.callsign ?? L.name; const mars = L.id === 'marte';
  const good = mars
    ? `${ctl}, ${me}: ${what} en ${room}. Por el retraso de la señal actuamos ya con el protocolo y reportamos.`
    : `${ctl}, ${me}: ${what} en ${room}. Iniciamos el protocolo, pedimos apoyo.`;
  const bad = [
    [`¡${ctl}! ¡Ayuda, pasa algo grave!`, 'Radio sin decir qué pasa ni dónde'],
    [`${me} a todos: ${what}. Después les digo dónde.`, 'Radio sin decir el lugar'],
    mars ? [`${ctl}, ${me}: ${what} en ${room}. Esperamos su respuesta antes de actuar.`, 'En Marte esperar a la Tierra tarda demasiado (retraso de minutos)']
      : [`${what} en ${room}… creo. Vamos viendo, cambio.`, 'Radio sin quién llama ni qué se hará'],
  ];
  const opts = shuffle([[good, null], ...shuffle(bad, rnd).slice(0, 2)], rnd);
  return { answer: good, options: opts.map((o) => o[0]), why: Object.fromEntries(opts.map((o) => [o[0], o[1]])), mars };
}

/** Soporte vital: los problemas activos gastan su recurso; se recupera solo y despacio. dm = minutos de juego. */
export function tickVital(s, dm) {
  s.vital ??= { o2: 100, agua: 100, energia: 100 };
  for (const k in s.vital) s.vital[k] = Math.min(100, s.vital[k] + dm * 0.04);
  for (const h of s.hazards) { const k = VITAL_OF[h.kind]; if (k) s.vital[k] = Math.max(0, s.vital[k] - dm * 0.12); }
  const low = Object.keys(s.vital).filter((k) => s.vital[k] <= 0);
  if (low.length) s.integ -= dm * 0.05 * low.length; // sin un recurso, la base se deteriora
  return low;
}
/** Resolver bien un problema devuelve parte de su recurso. */
export function restoreVital(s, kind, n = 20) { const k = VITAL_OF[kind]; if (k && s.vital) s.vital[k] = Math.min(100, s.vital[k] + n); }

/** Informe de entrenamiento estilo NASA. */
export function report(s) {
  const t = s.train ?? newTrain();
  const areas = Object.entries(AREAS).filter(([k]) => t[k][1] > 0).map(([k, name]) => ({ k, name, ok: t[k][0], n: t[k][1], pct: Math.round(t[k][0] / t[k][1] * 100) }));
  const good = areas.filter((a) => a.pct >= 80).map((a) => a.name);
  const improve = areas.filter((a) => a.pct < 60).map((a) => a.name);
  const cause = Object.entries(t.why).sort((a, b) => b[1] - a[1])[0] ?? null;
  return { areas, good, improve, cause: cause && { text: cause[0], n: cause[1] } };
}
