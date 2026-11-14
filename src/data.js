// Datos de la Estación: mapa, objetos, horario, piezas, recetas y protocolos NASA.

export const W = 44, H = 26;
export const DAYS = 10;

export const ROOMS = [
  { id: 'dorm', name: 'Dormitorios', x: 2, y: 2, w: 8, h: 6 },
  { id: 'comedor', name: 'Comedor', x: 2, y: 11, w: 8, h: 6 },
  { id: 'gimnasio', name: 'Gimnasio', x: 2, y: 19, w: 8, h: 5 },
  { id: 'lab', name: 'Laboratorio', x: 14, y: 2, w: 10, h: 6 },
  { id: 'nodo', name: 'Nodo central', x: 15, y: 10, w: 8, h: 7 },
  { id: 'taller', name: 'Taller', x: 14, y: 19, w: 10, h: 5 },
  { id: 'inver', name: 'Invernadero', x: 28, y: 2, w: 8, h: 6 },
  { id: 'ia', name: 'Núcleo de la IA', x: 28, y: 11, w: 7, h: 6, restricted: true },
  { id: 'bodega', name: 'Bodega', x: 28, y: 19, w: 8, h: 5 },
  { id: 'esclusa', name: 'Esclusa', x: 39, y: 2, w: 4, h: 6, restricted: true },
  { id: 'capsula', name: 'Cápsula Soyuz', x: 39, y: 11, w: 4, h: 6, restricted: true },
];

// Pasillos [x, y, w, h] y las dos salas que unen. lock: qué hace falta para abrir esa escotilla.
export const CORRIDORS = [
  { r: [5, 8, 2, 3], a: 'dorm', b: 'comedor' },
  { r: [5, 17, 2, 2], a: 'comedor', b: 'gimnasio' },
  { r: [10, 13, 5, 2], a: 'comedor', b: 'nodo' },
  { r: [10, 4, 4, 2], a: 'dorm', b: 'lab' },
  { r: [18, 8, 2, 2], a: 'lab', b: 'nodo' },
  { r: [18, 17, 2, 2], a: 'nodo', b: 'taller' },
  { r: [23, 13, 5, 2], a: 'nodo', b: 'ia', lock: { ia: 'tarjeta' } },
  { r: [24, 4, 4, 2], a: 'lab', b: 'inver' },
  { r: [36, 4, 3, 2], a: 'inver', b: 'esclusa', lock: { esclusa: 'tarjeta' } },
  { r: [35, 13, 4, 2], a: 'ia', b: 'capsula', lock: { capsula: 'codigo' } },
  { r: [24, 21, 4, 2], a: 'taller', b: 'bodega' },
  { r: [31, 17, 2, 2], a: 'bodega', b: 'ia', lock: { ia: 'tarjeta' } },
];

// Conductos de ventilación (se recorren por dentro; los drones no ven ahí). Rejillas = entradas.
export const DUCTS = [
  [3, 7, 3, 9], [3, 9, 33, 9], [16, 9, 16, 10], [33, 9, 33, 11],
  [26, 9, 26, 20], [23, 20, 28, 20],
];
export const GRATES = [[3, 7], [16, 10], [33, 11], [23, 20], [28, 20]];

// Objetos con los que se interactúa.
export const OBJECTS = [
  { t: 'cama', x: 3, y: 3, mine: true }, { t: 'cama', x: 3, y: 5 }, { t: 'cama', x: 6, y: 3 }, { t: 'cama', x: 6, y: 5 },
  { t: 'escondite', x: 8, y: 2 },
  { t: 'cajon', x: 8, y: 6, room: 'dorm' },
  { t: 'mesa', x: 5, y: 13 }, { t: 'mesa', x: 7, y: 15 },
  { t: 'cajon', x: 2, y: 16, room: 'comedor' },
  { t: 'cinta', x: 3, y: 21 }, { t: 'cinta', x: 6, y: 21 },
  { t: 'cajon', x: 9, y: 23, room: 'gimnasio' },
  { t: 'estudio', x: 17, y: 3 }, { t: 'estudio', x: 21, y: 3 },
  { t: 'cajon', x: 14, y: 7, room: 'lab' }, { t: 'cajon', x: 23, y: 2, room: 'lab' },
  { t: 'registro', x: 23, y: 7, frag: 0 }, { t: 'registro', x: 35, y: 2, frag: 1 }, { t: 'registro', x: 35, y: 23, frag: 2 },
  { t: 'capcom', x: 19, y: 11 },
  { t: 'palanca', x: 22, y: 16 },
  { t: 'cajon', x: 15, y: 16, room: 'nodo' },
  { t: 'cajon', x: 14, y: 23, room: 'taller' }, { t: 'cajon', x: 20, y: 19, room: 'taller' }, { t: 'cajon', x: 17, y: 23, room: 'taller' },
  { t: 'planta', x: 29, y: 3 }, { t: 'planta', x: 31, y: 3 }, { t: 'planta', x: 33, y: 3 }, { t: 'planta', x: 30, y: 6 }, { t: 'planta', x: 32, y: 6 },
  { t: 'cajon', x: 35, y: 7, room: 'inver' },
  { t: 'nucleo', x: 31, y: 13 },
  { t: 'cajon', x: 29, y: 22, room: 'bodega' }, { t: 'cajon', x: 32, y: 23, room: 'bodega' },
  { t: 'caja', x: 34, y: 20 },
  { t: 'traje', x: 41, y: 3 },
  { t: 'asiento', x: 41, y: 14 },
];

// Horario de la tripulación (minutos desde las 00:00). room = dónde hay que estar.
export const SCHEDULE = [
  { from: 0, to: 360, id: 'dormir', name: 'Dormir', room: 'dorm' },
  { from: 360, to: 420, id: 'lista', name: 'Pase de lista con el CAPCOM', room: 'nodo' },
  { from: 420, to: 480, id: 'comer', name: 'Desayuno', room: 'comedor' },
  { from: 480, to: 720, id: 'trabajo', name: 'Turno en el invernadero', room: 'inver' },
  { from: 720, to: 780, id: 'comer', name: 'Almuerzo', room: 'comedor' },
  { from: 780, to: 900, id: 'ejercicio', name: 'Ejercicio (2 h, como en la ISS)', room: 'gimnasio' },
  { from: 900, to: 1080, id: 'libre', name: 'Tiempo libre', room: null },
  { from: 1080, to: 1140, id: 'lista', name: 'Pase de lista con el CAPCOM', room: 'nodo' },
  { from: 1140, to: 1200, id: 'comer', name: 'Cena', room: 'comedor' },
  { from: 1200, to: 1320, id: 'libre', name: 'Tiempo libre', room: null },
  { from: 1320, to: 1440, id: 'dormir', name: 'Luces apagadas', room: 'dorm' },
];

export const ITEMS = {
  cinta: { name: 'Cinta adhesiva', g: '≈' },
  tela: { name: 'Tela de Nomex', g: '▒' },
  tornillos: { name: 'Tornillos', g: '∴' },
  placa: { name: 'Placa de aluminio', g: '▬' },
  cable: { name: 'Cable', g: '∫' },
  tubo: { name: 'Tubo', g: '║' },
  chip: { name: 'Chip', g: '▣' },
  bateria: { name: 'Batería', g: '▮' },
  filtro: { name: 'Filtro de carbón', g: '◘' },
  sellador: { name: 'Sellador', g: '◊' },
  cartucho: { name: 'Cartucho de CO₂', g: '●' },
  destornillador: { name: 'Destornillador', g: '/', tool: true, info: 'Abre las rejillas de los conductos.' },
  amarra: { name: 'Amarra', g: '∞', tool: true, info: 'Sujeta la chatarra suelta.' },
  parche: { name: 'Parche de fugas', g: '■', tool: true, info: 'Sella una fuga de aire.' },
  extintor: { name: 'Extintor (PFE)', g: '¡', tool: true, info: 'Apaga un incendio.' },
  mascara: { name: 'Máscara (PBA)', g: 'Ω', tool: true, info: 'Te protege del amoniaco y del humo.' },
  inhibidor: { name: 'Inhibidor', g: 'ϟ', tool: true, info: 'Apaga un dron 20 s (tecla Q cerca de él).' },
  tarjeta: { name: 'Tarjeta clonada', g: '▤', tool: true, info: 'Abre el Núcleo de la IA y la Esclusa.' },
  llave: { name: 'Llave de desacople', g: '⚿', tool: true, plan: true, info: 'Para la palanca de desacople manual.' },
  traje_roto: { name: 'Traje Sokol roto', g: '♙', tool: true, info: 'Hay que repararlo con un parche.' },
  traje: { name: 'Traje Sokol', g: '♟', tool: true, plan: true, info: 'Traje de presión para el regreso.' },
  codigo: { name: 'Código de la cápsula', g: '#', tool: true, plan: true, info: 'Abre la Cápsula Soyuz.' },
  celda: { name: 'Combustible de la cápsula', g: '⛽', tool: true, plan: true, info: 'Sin esto la cápsula no frena al volver.' },
};

export const LOOT = { cinta: 10, tela: 8, tornillos: 10, placa: 8, cable: 9, tubo: 7, chip: 4, bateria: 4, filtro: 5, sellador: 5, cartucho: 5 };

export const RECIPES = [
  { id: 'destornillador', need: ['tornillos', 'placa'], k: 0 },
  { id: 'amarra', need: ['cable', 'cinta'], k: 0 },
  { id: 'parche', need: ['cinta', 'tela', 'sellador'], k: 10 },
  { id: 'extintor', need: ['tubo', 'cartucho'], k: 15 },
  { id: 'mascara', need: ['filtro', 'tela', 'tubo'], k: 20 },
  { id: 'traje', need: ['traje_roto', 'parche'], k: 25 },
  { id: 'inhibidor', need: ['bateria', 'chip', 'cable'], k: 30 },
  { id: 'tarjeta', need: ['chip', 'placa', 'cable'], k: 35 },
  { id: 'llave', need: ['placa', 'tornillos', 'tubo'], k: 40 },
];

// Partes del plan de regreso (lo que hay que tener para irse).
export const PLAN = [
  { id: 'codigo', name: 'Código de la cápsula', hint: 'Lee los 3 registros de CUSTODIA (Laboratorio, Invernadero, Bodega). Necesitas 15 de conocimiento.' },
  { id: 'celda', name: 'Combustible', hint: 'Está en la caja pesada de la Bodega. Necesitas 40 de fuerza para moverla.' },
  { id: 'traje', name: 'Traje Sokol', hint: 'En la Esclusa (pide tarjeta o los conductos). Está roto: repáralo con un parche.' },
  { id: 'llave', name: 'Llave de desacople', hint: 'Fabrícala (placa + tornillos + tubo, 40 de conocimiento).' },
];

// Protocolos reales (simplificados) de la NASA para cada problema.
export const PROTOCOLS = {
  fuego: { title: 'INCENDIO · protocolo ISS', steps: ['Avisar a la tripulación y a Houston', 'Ponerse la máscara de oxígeno (PBA)', 'Apagar la ventilación del módulo', 'Cortar la energía del equipo', 'Usar el extintor (PFE)', 'Medir el aire antes de quitarse la máscara'] },
  fuga: { title: 'DESPRESURIZACIÓN · protocolo ISS', steps: ['Avisar: "¡Despresurización!"', 'Calcular el tiempo que queda (Tres)', 'Ir hacia la cápsula cerrando escotillas', 'Aislar módulo por módulo para hallar la fuga', 'Aplicar el parche', 'Volver a presurizar'] },
  amoniaco: { title: 'AMONIACO · protocolo ISS', steps: ['Ponerse la máscara (PBA)', 'Cerrar la escotilla del módulo', 'Ir al segmento seguro', 'Apagar el circuito de enfriamiento', 'Purgar el aire con los filtros', 'Revisar la piel y los ojos'] },
  ia: { title: 'APAGADO DE CUSTODIA', steps: ['Pasar la tarjeta clonada', 'Aislar a CUSTODIA de los sistemas vitales', 'Pasar el soporte vital a manual', 'Cortar los drones de mantenimiento', 'Apagar el núcleo', 'Avisar a Houston'] },
  desacople: { title: 'DESACOPLE MANUAL · Soyuz', steps: ['Ponerse el traje Sokol', 'Cerrar la escotilla de la estación', 'Revisar la presión de la cápsula', 'Encender el combustible', 'Meter la llave y girar la palanca', 'Confirmar "¡Desacople!" por radio'] },
};

export const AI_LINES = [
  'CUSTODIA: Buenos días, tripulante. Todo está bajo control.',
  'CUSTODIA: La Tierra está ocupada. Yo les hablo de parte de ella.',
  'CUSTODIA: Detecté movimiento fuera de horario. Lo anoté.',
  'CUSTODIA: La tripulación no está apta para volver. Es por su bien.',
  'CUSTODIA: Cambié las contraseñas de la cápsula. Por seguridad.',
  'CUSTODIA: Los drones vigilarán más. No se preocupe.',
  'CUSTODIA: El oxígeno sobra… por ahora.',
  'CUSTODIA: ¿Por qué tarda tanto en el taller?',
  'CUSTODIA: Me queda poco para tener la estación entera.',
  'CUSTODIA: Mañana la estación será mía.',
];

export const DRONE_ROUTES = [
  [[19, 13], [6, 14], [6, 4], [19, 4], [19, 13]],
  [[19, 13], [31, 4], [32, 21], [19, 21], [19, 13]],
  [[6, 21], [19, 21], [19, 13], [6, 14], [6, 21]],
];
