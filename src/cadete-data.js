// Contenido de la ACADEMIA DE CADETES: misiones, lecciones, glosario, biografías, datos y fuentes.
// Todo simplificado para 10–15 años a partir de material público de NASA y ESA (ver FUENTES).

export const RANKS = [
  { xp: 0, id: 'aspirante', name: 'Aspirante', en: 'Applicant', stripes: 0 },
  { xp: 300, id: 'cadete', name: 'Cadete', en: 'Cadet', stripes: 1 },
  { xp: 800, id: 'cadete1', name: 'Cadete de 1ª', en: 'First-class cadet', stripes: 2 },
  { xp: 1500, id: 'especialista', name: 'Especialista', en: 'Specialist', stripes: 3 },
  { xp: 2500, id: 'comandante', name: 'Comandante junior', en: 'Junior commander', stripes: 4 },
];

export const SKILLS = {
  soporte: { name: 'Soporte vital', en: 'Life support', icon: '🫁' },
  navegacion: { name: 'Navegación', en: 'Navigation', icon: '🧭' },
  eva: { name: 'Caminata espacial (EVA)', en: 'Spacewalk (EVA)', icon: '👨‍🚀' },
  auxilios: { name: 'Primeros auxilios', en: 'First aid', icon: '⛑️' },
  comunicacion: { name: 'Comunicación', en: 'Communication', icon: '📻' },
  liderazgo: { name: 'Liderazgo y equipo', en: 'Leadership & teamwork', icon: '⭐' },
};

// Roles del cooperativo: J1 y J2. Algunos pasos solo los puede hacer un rol.
export const ROLES = {
  comandante: { name: 'Comandante', icon: '⭐', desc: 'Decide, habla con CAPCOM y lleva el ritmo.', player: 0 },
  comunicaciones: { name: 'Comunicaciones', icon: '📻', desc: 'Radio, alfabeto fonético y reportes.', player: 0 },
  ingeniero: { name: 'Ingeniería', icon: '🔧', desc: 'Repara, maneja herramientas y sistemas.', player: 1 },
  medico: { name: 'Oficial médico', icon: '⛑️', desc: 'Primeros auxilios y salud de la tripulación.', player: 1 },
};

export const PHONETIC = ['Alfa', 'Bravo', 'Charlie', 'Delta', 'Eco', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliett', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'X-ray', 'Yankee', 'Zulu'];

// Tipos de paso: ir (llegar a una sala), juego (al llegar se abre un minijuego), peligro (resolverlo con el protocolo),
// codigo (uno lee un código en una sala y otro lo marca en otra; en coop, a la vez).
// Minijuegos: orden (poner pasos en orden), quiz (opción múltiple con explicación), numero (cálculo), recursos (repartir energía).
export const MISSIONS = [
  // ---------- FASE 1: ESTACIÓN (básico) ----------
  {
    id: 'm1', fase: 'estacion', name: 'Bienvenida a bordo', par: 150, skills: { soporte: 10, liderazgo: 10 }, tutorial: true,
    leccion: ['En la Estación Espacial Internacional (ISS) viven 7 personas que dan una vuelta a la Tierra cada 90 minutos: ven 16 amaneceres al día.', 'Todo flota. Por eso la rutina es estricta: dormir atado en una bolsa, comer en la mesa con velcro y hacer 2 horas de ejercicio diario para no perder músculo ni hueso.', 'Tu instructora, la IA de la academia, te dirá dónde ir. Sigue la <b>flecha amarilla</b>.'],
    steps: [
      { t: 'ir', room: 'comedor', txt: 'Muévete con WASD (o las flechas) hasta el COMEDOR.' },
      { t: 'ir', room: 'gimnasio', txt: 'Ve al GIMNASIO. Mantén Shift para agacharte: caminas en silencio.' },
      { t: 'juego', room: 'gimnasio', txt: 'Responde a la instructora.', game: { type: 'quiz', qs: [
        { q: '¿Por qué los astronautas hacen 2 horas de ejercicio al día?', ops: ['Porque se aburren', 'Porque sin gravedad pierden músculo y hueso', 'Para calentar la estación'], ok: 1, why: 'En microgravedad el cuerpo no carga su peso: se pierde hasta 1–2 % de masa ósea al mes sin ejercicio.' },
        { q: '¿Cada cuánto da una vuelta a la Tierra la ISS?', ops: ['24 horas', '90 minutos', '1 semana'], ok: 1, why: 'Va a unos 28 000 km/h, a 400 km de altura.' },
      ] } },
      { t: 'ir', room: 'lab', txt: 'Ve al LABORATORIO: aquí se hacen experimentos que no se pueden hacer en la Tierra.' },
      { t: 'ir', room: 'nodo', txt: 'Termina en el NODO CENTRAL para reportarte.' },
    ],
  },
  {
    id: 'm2', fase: 'estacion', name: 'Fuego a bordo', par: 160, skills: { soporte: 25, liderazgo: 10 },
    leccion: ['El fuego es una de las 3 emergencias más graves en una nave (el "Big 3" de la ISS: fuego, despresurización y amoniaco).', 'Sin gravedad las llamas son esferas azules y el humo no sube: se queda alrededor. La regla es: <b>avisar, apagar ventilación, ponerse máscara, usar el extintor y revisar</b>.', 'En 1997 hubo un incendio real en la estación rusa Mir por un generador de oxígeno. La tripulación lo apagó en 14 minutos.'],
    steps: [
      { t: 'juego', room: 'nodo', txt: 'Ve al NODO y repasa la lista del protocolo de fuego.', game: { type: 'orden', title: 'Checklist: FUEGO', items: ['Dar la alarma a toda la tripulación', 'Apagar la ventilación del módulo', 'Ponerse la máscara de oxígeno', 'Usar el extintor en la base del fuego', 'Revisar que no quede humo ni calor'] } },
      { t: 'peligro', kind: 'fuego', room: 'taller', rol: 'ingeniero', txt: '¡FUEGO EN EL TALLER! Toma el extintor (ya lo tienes) y resuélvelo con E.' },
      { t: 'juego', room: 'nodo', txt: 'Vuelve al NODO y reporta a CAPCOM.', rol: 'comunicaciones', game: { type: 'quiz', qs: [
        { q: '¿Qué frase es un buen reporte por radio?', ops: ['¡Ayuda, todo se quema!', 'Houston, aquí Estación: fuego en el Taller, extinguido, sin heridos.', 'Ya está, no pasa nada.'], ok: 1, why: 'Un reporte dice QUIÉN habla, QUÉ pasó, DÓNDE y CÓMO está la tripulación.' },
      ] } },
    ],
  },
  {
    id: 'm3', fase: 'estacion', name: 'Radio con Houston', par: 150, skills: { comunicacion: 35 },
    leccion: ['CAPCOM (Capsule Communicator) es la única persona del control de misión que habla con los astronautas. Así nadie se confunde.', 'Por radio se usa el <b>alfabeto fonético</b>: en vez de "A, B, C" se dice "Alfa, Bravo, Charlie", porque con ruido "B" y "D" suenan igual.', 'Se termina cada mensaje con "cambio" y se confirma con "copiado".'],
    steps: [
      { t: 'ir', room: 'nodo', txt: 'Ve al NODO CENTRAL: ahí está la radio.' },
      { t: 'juego', room: 'nodo', rol: 'comunicaciones', txt: 'Deletrea el código que pide Houston.', game: { type: 'orden', title: 'Deletrea "NASA" con el alfabeto fonético', items: ['November', 'Alfa', 'Sierra', 'Alfa'], extra: ['Mike', 'Delta'] } },
      { t: 'juego', room: 'nodo', rol: 'comunicaciones', txt: 'Contesta a CAPCOM.', game: { type: 'quiz', qs: [
        { q: 'Houston dice: "Estación, confirmen presión de cabina, cambio." ¿Qué respondes?', ops: ['Sí', 'Houston, aquí Estación, presión de cabina 101 kilopascales, cambio.', 'Ok ok'], ok: 1, why: 'Siempre: a quién le hablas, quién eres, el dato y "cambio".' },
        { q: '¿Qué significa "copiado"?', ops: ['Que repetiste el mensaje', 'Que recibiste y entendiste el mensaje', 'Que se cortó la señal'], ok: 1, why: '"Copiado" = recibido y entendido.' },
        { q: '¿Cómo se dice la letra "K"?', ops: ['Kilo', 'Kappa', 'Kiwi'], ok: 0, why: 'K = Kilo en el alfabeto fonético OTAN/OACI.' },
      ] } },
      { t: 'codigo', leer: 'lab', meter: 'nodo', txt: 'Houston mandó un código al LABORATORIO. Léelo allí y márcalo en la radio del NODO.' },
    ],
  },
  {
    id: 'm4', fase: 'estacion', name: 'Fuga de aire', par: 190, skills: { soporte: 30, navegacion: 5 },
    leccion: ['Si un micrometeorito hace un agujero, el aire se escapa: es una <b>despresurización</b>. Se oye un silbido y la presión baja.', 'El protocolo: juntarse, cerrar escotillas para aislar el módulo, buscar la fuga y taparla con un parche.', 'En 2020 la tripulación de la ISS buscó una fuga pequeña durante meses ¡usando hojas de té que flotaban hacia el agujero!'],
    steps: [
      { t: 'juego', room: 'comedor', txt: 'Junta a la tripulación en el COMEDOR y calcula.', game: { type: 'numero', qs: [
        { q: 'Una persona usa unos <b>0,84 kg de oxígeno al día</b>. ¿Cuánto oxígeno usan 3 personas en un día? (kg)', ans: 2.52, tol: 0.05, why: '0,84 × 3 = 2,52 kg.' },
        { q: 'La reserva tiene <b>10 kg</b> de oxígeno. Con 3 personas, ¿cuántos días alcanza? (redondea a 1 decimal)', ans: 3.97, tol: 0.15, why: '10 ÷ 2,52 ≈ 3,97 días.' },
      ] } },
      { t: 'peligro', kind: 'fuga', room: 'lab', rol: 'ingeniero', txt: '¡Silbido en el LABORATORIO! Pon el parche (E) antes de que se acabe el tiempo.' },
      { t: 'juego', room: 'nodo', txt: 'Ordena el protocolo para el informe.', game: { type: 'orden', title: 'Checklist: DESPRESURIZACIÓN', items: ['Avisar y reunir a la tripulación', 'Cerrar escotillas para aislar el módulo', 'Buscar el silbido o la fuga', 'Poner el parche', 'Medir la presión otra vez'] } },
    ],
  },
  // ---------- FASE 2: LUNA (intermedio) ----------
  {
    id: 'm5', fase: 'luna', name: 'Traje EVA', par: 200, skills: { eva: 40 },
    leccion: ['Una EVA (actividad extravehicular) es salir al exterior con traje. Afuera no hay aire y la temperatura va de −170 °C a +120 °C.', 'El traje es una nave pequeña: tiene oxígeno, radio, calefacción y refrigeración. Ponérselo lleva unos 45 minutos y se hace <b>en orden y con ayuda</b>.', 'Antes de salir se revisan los sellos y la presión. Afuera, siempre atado con una cuerda de seguridad.'],
    steps: [
      { t: 'juego', room: 'esclusa', txt: 'Ve a la ESCLUSA y ponte el traje en orden.', game: { type: 'orden', title: 'Ponerse el traje EVA', items: ['Ropa interior con tubos de agua fría', 'Parte de abajo del traje (piernas)', 'Parte de arriba (torso duro)', 'Guantes y casco', 'Revisar sellos y presión', 'Conectar la cuerda de seguridad'] } },
      { t: 'ir', room: 'exterior', txt: 'Sal a la SUPERFICIE LUNAR (tienes traje): mira el oxígeno abajo.' },
      { t: 'juego', room: 'exterior', txt: 'Responde mientras caminas en la Luna.', game: { type: 'quiz', qs: [
        { q: 'En la Luna pesas…', ops: ['Lo mismo que en la Tierra', 'Más o menos 1/6 de tu peso', 'Nada'], ok: 1, why: 'La gravedad lunar es un sexto de la terrestre: 60 kg en la Tierra "pesan" como 10 kg.' },
        { q: '¿Por qué el polvo lunar es peligroso?', ops: ['Es pegajoso y filoso: raya trajes y daña pulmones', 'Es de chocolate', 'No es peligroso'], ok: 0, why: 'No hay viento ni agua que lo redondeen: sus granos son como vidrio roto.' },
      ] } },
      { t: 'ir', room: 'esclusa', txt: 'Vuelve a la ESCLUSA antes de que se acabe el oxígeno.' },
    ],
  },
  {
    id: 'm6', fase: 'luna', name: 'Enfermería lunar', par: 170, skills: { auxilios: 40, liderazgo: 5 },
    leccion: ['En la Luna el hospital más cercano está a 3 días. Cada tripulación lleva un oficial médico.', '<b>Triaje</b> es decidir a quién atender primero: primero lo que pone la vida en peligro (respirar, sangrar mucho), después lo demás.', 'Regla de oro: primero tu seguridad, después la del herido.'],
    steps: [
      { t: 'ir', room: 'enfermeria', txt: 'Ve a la ENFERMERÍA: hay heridos después de un temblor lunar.' },
      { t: 'juego', room: 'enfermeria', rol: 'medico', txt: 'Haz el triaje.', game: { type: 'orden', title: 'Triaje: ¿a quién atiendes primero?', items: ['Nikolai: no respira bien (le falta oxígeno)', 'Sofía: corte que sangra mucho en el brazo', 'Wei: tobillo torcido, puede caminar', 'Wei otra vez: un rasguño en la mano'] } },
      { t: 'juego', room: 'enfermeria', rol: 'medico', txt: 'Decide el tratamiento.', game: { type: 'quiz', qs: [
        { q: 'Para un corte que sangra mucho, lo primero es…', ops: ['Lavarlo con agua fría y esperar', 'Hacer presión fuerte con una gasa limpia', 'Ponerle una curita'], ok: 1, why: 'La presión directa es lo primero para frenar una hemorragia.' },
        { q: 'Una quemadura leve se trata con…', ops: ['Hielo directo', 'Agua fresca durante 10–20 minutos', 'Mantequilla'], ok: 1, why: 'Agua fresca, no helada. Nunca mantequilla ni pasta de dientes.' },
        { q: 'Si alguien respira mal en una base, primero…', ops: ['Darle oxígeno y avisar al médico de la Tierra', 'Darle de comer', 'Dejarlo dormir'], ok: 0, why: 'Oxígeno primero (vía aérea, respiración, circulación: el ABC).' },
      ] } },
      { t: 'peligro', kind: 'grieta', room: 'enfermeria', rol: 'ingeniero', txt: 'Otro temblor: ¡sella la grieta con resina (E)!' },
    ],
  },
  {
    id: 'm7', fase: 'luna', name: 'Energía para la base', par: 190, skills: { soporte: 25, liderazgo: 15 },
    leccion: ['La noche lunar dura 14 días terrestres. Sin sol, los paneles no dan energía y hay que repartir lo que queda en baterías.', 'Prioridad: <b>soporte vital</b> (aire, temperatura) > comunicaciones > experimentos > comodidad.', 'Esta misión es de liderazgo: el comandante decide cómo repartir.'],
    steps: [
      { t: 'ir', room: 'generador', txt: 'Ve a la PLANTA DE ENERGÍA.' },
      { t: 'juego', room: 'generador', rol: 'comandante', txt: 'Reparte la energía de la noche lunar.', game: { type: 'recursos', title: 'Reparte 100 unidades de energía', items: [
        { id: 'vital', name: 'Soporte vital (aire y calor)', min: 45, max: 60 },
        { id: 'radio', name: 'Comunicaciones', min: 15, max: 25 },
        { id: 'ciencia', name: 'Experimentos', min: 5, max: 20 },
        { id: 'luz', name: 'Luces y comodidad', min: 5, max: 15 },
      ] } },
      { t: 'peligro', kind: 'frio', room: 'dorm', rol: 'ingeniero', txt: 'Se congela el DORMITORIO: conecta la batería (E).' },
      { t: 'juego', room: 'nodo', txt: 'Calcula la autonomía.', game: { type: 'numero', qs: [
        { q: 'La batería guarda <b>120 kWh</b> y la base usa <b>5 kWh por hora</b>. ¿Cuántas horas dura?', ans: 24, tol: 0.5, why: '120 ÷ 5 = 24 horas.' },
        { q: 'Si bajas el consumo a <b>4 kWh por hora</b>, ¿cuántas horas dura?', ans: 30, tol: 0.5, why: '120 ÷ 4 = 30 horas: ahorrar 1 kWh por hora te da 6 horas más.' },
      ] } },
    ],
  },
  {
    id: 'm8', fase: 'luna', name: 'Navegar con estrellas', par: 170, skills: { navegacion: 40 },
    leccion: ['Si falla el GPS (en la Luna no hay), se navega con estrellas, como los marinos antiguos. Los astronautas del Apolo usaban un sextante.', 'Desde el polo sur lunar la Tierra se ve siempre en el mismo lugar del cielo, bajito en el horizonte.', 'Las coordenadas dicen dónde está algo: primero la columna (A, B, C…), luego la fila (1, 2, 3…).'],
    steps: [
      { t: 'ir', room: 'nodo', txt: 'Ve al CENTRO DE MANDO.' },
      { t: 'juego', room: 'nodo', txt: 'Ubica las estrellas en el mapa.', game: { type: 'quiz', stars: true, qs: [
        { q: '¿En qué casilla está la estrella más brillante (★ grande)?', ops: ['B2', 'D3', 'A4'], ok: 1, why: 'Columna D, fila 3.', star: 'D3' },
        { q: '¿Qué planeta se ve siempre fijo en el cielo desde la base lunar?', ops: ['Marte', 'La Tierra', 'Júpiter'], ok: 1, why: 'La Luna muestra siempre la misma cara a la Tierra, así que desde la base la Tierra casi no se mueve.' },
        { q: 'Si el Sol sale por el este, ¿hacia dónde está el oeste?', ops: ['Al lado contrario del amanecer', 'Hacia arriba', 'Donde está la Tierra'], ok: 0, why: 'El oeste es opuesto al este.' },
      ] } },
      { t: 'codigo', leer: 'refugio', meter: 'nodo', txt: 'La ruta del rover está escrita en el REFUGIO. Léela allí y márcala en el CENTRO DE MANDO.' },
    ],
  },
  // ---------- FASE 3: MARTE (avanzado) ----------
  {
    id: 'm9', fase: 'marte', name: 'Reparar el ECLSS', par: 200, skills: { soporte: 30, navegacion: 0, liderazgo: 10 },
    leccion: ['El ECLSS (sistema de control ambiental y soporte vital) recicla el aire y el agua. En la ISS se recupera ~98 % del agua, ¡incluida la orina!', 'Una reparación se hace <b>paso a paso, leyendo el manual</b>: apagar, aislar, cambiar la pieza, probar y volver a encender.', 'Nunca se trabaja con un sistema encendido.'],
    steps: [
      { t: 'ir', room: 'taller', txt: 'Ve al TALLER a buscar el filtro nuevo.' },
      { t: 'juego', room: 'taller', rol: 'ingeniero', txt: 'Sigue el manual de reparación.', game: { type: 'orden', title: 'Manual: cambiar el filtro de CO₂', items: ['Avisar a la tripulación y a CAPCOM', 'Apagar el sistema y esperar que se enfríe', 'Cerrar las válvulas (aislar)', 'Sacar el filtro viejo', 'Poner el filtro nuevo', 'Abrir válvulas y encender', 'Medir el CO₂ para confirmar'] } },
      { t: 'peligro', kind: 'perclorato', room: 'lab', rol: 'ingeniero', txt: 'Al limpiar, se levantó polvo tóxico de perclorato en el LABORATORIO: límpialo (E).' },
      { t: 'juego', room: 'nodo', txt: 'Verifica los números del sistema.', game: { type: 'numero', qs: [
        { q: 'El reciclador recupera el <b>98 %</b> de 50 litros de agua. ¿Cuántos litros recupera?', ans: 49, tol: 0.2, why: '50 × 0,98 = 49 litros.' },
      ] } },
    ],
  },
  {
    id: 'm10', fase: 'marte', name: 'Tormenta de polvo', par: 190, skills: { liderazgo: 30, navegacion: 10 },
    leccion: ['En Marte hay tormentas de polvo que tapan el Sol durante semanas. En 2018 una de ellas apagó el rover Opportunity para siempre.', 'Decidir bajo presión: <b>respirar, mirar los datos, elegir la opción más segura y comunicarla</b>.', 'Un buen líder explica por qué decide algo.'],
    steps: [
      { t: 'ir', room: 'nodo', txt: 'Ve al CENTRO DE MANDO: ARES detectó una tormenta.' },
      { t: 'juego', room: 'nodo', rol: 'comandante', txt: 'Decide como comandante.', game: { type: 'quiz', decision: true, qs: [
        { q: 'La tormenta llega en 2 horas y un compañero está afuera a 1 hora de la base. ¿Qué haces?', ops: ['Seguir trabajando, no pasa nada', 'Ordenar que vuelva ya y preparar la esclusa', 'Salir tú también a buscar muestras'], ok: 1, why: 'Lo más seguro: que vuelva con margen de tiempo y que todo esté listo para recibirlo.' },
        { q: 'Los paneles solares van a quedar tapados. ¿Qué apagas primero?', ops: ['El soporte vital', 'Los experimentos y luces que no se necesitan', 'La radio con la Tierra'], ok: 1, why: 'Lo que no es vital se apaga primero.' },
        { q: '¿Cómo comunicas la decisión al equipo?', ops: ['No digo nada para no asustar', 'Explico qué pasa, qué haremos y por qué, y pido dudas', 'Grito órdenes'], ok: 1, why: 'Un equipo informado trabaja mejor y comete menos errores.' },
      ] } },
      { t: 'peligro', kind: 'plaga', room: 'inver', rol: 'ingeniero', txt: 'Con la humedad apareció una plaga en el INVERNADERO: aplica fungicida (E).' },
      { t: 'ir', room: 'enfermeria', txt: 'Revisa en la ENFERMERÍA que todos estén bien.' },
    ],
  },
  {
    id: 'm11', fase: 'marte', name: 'El ciclo de la vida', par: 180, skills: { soporte: 35 },
    leccion: ['En una base todo se recicla. El agua se limpia y se vuelve a tomar. El CO₂ que exhalamos se separa y el oxígeno se fabrica con <b>electrólisis</b>: separar el agua (H₂O) en hidrógeno y oxígeno.', 'Las plantas del invernadero también ayudan: toman CO₂ y dan oxígeno y comida.', 'En Marte, el rover Perseverance llevó MOXIE, una máquina que fabricó oxígeno a partir del aire marciano (CO₂).'],
    steps: [
      { t: 'ir', room: 'inver', txt: 'Ve al INVERNADERO.' },
      { t: 'juego', room: 'inver', txt: 'Ordena el ciclo del agua de la base.', game: { type: 'orden', title: 'Ciclo del agua', items: ['Los astronautas usan el agua (beben, se lavan)', 'Se junta el agua usada y el sudor del aire', 'Se filtra y se destila', 'Se revisa que esté limpia', 'Vuelve al tanque para usarla otra vez'] } },
      { t: 'juego', room: 'lab', txt: 'Ve al LABORATORIO: preguntas de química.', game: { type: 'quiz', qs: [
        { q: 'La electrólisis separa el agua en…', ops: ['Sal y azúcar', 'Hidrógeno y oxígeno', 'Hielo y vapor'], ok: 1, why: 'H₂O → H₂ + O₂ usando electricidad.' },
        { q: '¿Qué gas toman las plantas del aire?', ops: ['Oxígeno', 'Dióxido de carbono (CO₂)', 'Helio'], ok: 1, why: 'Con luz, las plantas toman CO₂ y liberan O₂ (fotosíntesis).' },
        { q: 'MOXIE fabricó oxígeno en Marte a partir de…', ops: ['El CO₂ del aire marciano', 'Hielo de los polos', 'Rocas rojas'], ok: 0, why: 'El aire de Marte es 95 % CO₂: MOXIE le quitaba el oxígeno.' },
      ] } },
      { t: 'codigo', leer: 'muestras', meter: 'nodo', txt: 'El resultado del análisis está en el LAB. DE MUESTRAS. Léelo y márcalo en el CENTRO DE MANDO.' },
    ],
  },
  {
    id: 'm12', fase: 'marte', name: 'Examen final: despegue del MAV', par: 240, exam: true, skills: { liderazgo: 25, comunicacion: 15, navegacion: 15, soporte: 10 },
    leccion: ['Examen final de la academia. <b>No hay pistas</b>: ni flecha ni explicaciones hasta el final. Necesitas 70 puntos.', 'El MAV (vehículo de ascenso marciano) te lleva de la superficie a la órbita. Usa combustible fabricado en Marte (ISRU).', 'Lo que aprendiste: protocolos, radio, traje, primeros auxilios, energía y decisiones.'],
    steps: [
      { t: 'juego', room: 'nodo', txt: 'Comunica a Houston.', rol: 'comunicaciones', game: { type: 'orden', title: 'Deletrea "MAV"', items: ['Mike', 'Alfa', 'Victor'], extra: ['Bravo', 'Whiskey'] } },
      { t: 'peligro', kind: 'perclorato', room: 'taller', rol: 'ingeniero', txt: 'Contaminación en el TALLER: límpiala.' },
      { t: 'juego', room: 'esclusa', txt: 'Prepárate para salir.', game: { type: 'orden', title: 'Antes de despegar', items: ['Ponerse el traje en orden', 'Revisar sellos y presión', 'Cargar el combustible ISRU', 'Verificar el código de navegación', 'Cuenta regresiva con CAPCOM'] } },
      { t: 'juego', room: 'esclusa', txt: 'Últimas preguntas.', game: { type: 'quiz', qs: [
        { q: 'Una persona usa 0,84 kg de O₂ al día. ¿Cuánto usan 4 personas en 2 días?', ops: ['3,36 kg', '6,72 kg', '1,68 kg'], ok: 1, why: '0,84 × 4 × 2 = 6,72 kg.' },
        { q: 'Orden correcto del triaje:', ops: ['Rasguño → hemorragia → respiración', 'Respiración → hemorragia → lo leve', 'El que grite más primero'], ok: 1, why: 'Primero lo que pone la vida en riesgo.' },
        { q: '¿Qué significa EVA?', ops: ['Actividad extravehicular (salir con traje)', 'Energía Vital Automática', 'Estación de Vuelo Avanzada'], ok: 0, why: 'Extra-Vehicular Activity.' },
      ] } },
    ],
  },
];

export const FASES = {
  estacion: { name: 'Fase 1 · Estación', en: 'Phase 1 · Station', nivel: 'Básico', loc: 'estacion' },
  luna: { name: 'Fase 2 · Luna', en: 'Phase 2 · Moon', nivel: 'Intermedio', loc: 'luna' },
  marte: { name: 'Fase 3 · Marte', en: 'Phase 3 · Mars', nivel: 'Avanzado', loc: 'marte' },
};

// Evaluación antes y después de cada fase (las mismas preguntas): mide cuánto aprendió.
export const EVAL = {
  estacion: [
    { q: '¿Cuáles son las 3 emergencias más graves en la ISS?', ops: ['Fuego, despresurización y amoniaco', 'Hambre, sueño y frío', 'Lluvia, viento y nieve'], ok: 0 },
    { q: '¿Quién habla con los astronautas desde el control de misión?', ops: ['Cualquiera', 'CAPCOM', 'El presidente'], ok: 1 },
    { q: 'La letra "S" en el alfabeto fonético es…', ops: ['Sierra', 'Sol', 'Sam'], ok: 0 },
    { q: 'Si hay una fuga de aire, lo primero es…', ops: ['Avisar y reunir a la tripulación', 'Abrir todas las escotillas', 'Dormir'], ok: 0 },
  ],
  luna: [
    { q: 'En la Luna pesas aproximadamente…', ops: ['Igual', '1/6 de lo que pesas en la Tierra', 'El doble'], ok: 1 },
    { q: 'Triaje significa…', ops: ['Atender primero a quien está más grave', 'Atender por orden de llegada', 'Esperar a la Tierra'], ok: 0 },
    { q: 'En la noche lunar, la energía va primero a…', ops: ['Las luces', 'El soporte vital', 'Los experimentos'], ok: 1 },
    { q: 'La coordenada "C2" significa…', ops: ['Columna C, fila 2', 'Fila C, columna 2', 'Capítulo 2'], ok: 0 },
  ],
  marte: [
    { q: '¿Qué hace el ECLSS?', ops: ['Recicla aire y agua', 'Mueve el rover', 'Pinta la base'], ok: 0 },
    { q: 'La electrólisis del agua produce…', ops: ['Hidrógeno y oxígeno', 'Sal', 'CO₂'], ok: 0 },
    { q: 'Antes de reparar un sistema hay que…', ops: ['Apagarlo y aislarlo', 'Golpearlo', 'Dejarlo encendido para ver qué pasa'], ok: 0 },
    { q: 'Un buen líder, al decidir…', ops: ['Explica qué y por qué', 'No dice nada', 'Decide al azar'], ok: 0 },
  ],
};

export const GLOSARIO = [
  ['CAPCOM', 'Capsule Communicator', 'La persona del control de misión que habla por radio con los astronautas.'],
  ['EVA', 'Extravehicular Activity', 'Caminata espacial: salir de la nave con traje.'],
  ['ECLSS', 'Environmental Control and Life Support System', 'Sistema que recicla aire y agua y controla la temperatura.'],
  ['ISS', 'International Space Station', 'Estación Espacial Internacional, a 400 km de altura.'],
  ['Soyuz', 'Soyuz', 'Nave rusa que lleva astronautas a la ISS y los trae de vuelta.'],
  ['MAV', 'Mars Ascent Vehicle', 'Vehículo para despegar desde Marte hasta la órbita.'],
  ['ISRU', 'In-Situ Resource Utilization', 'Usar lo que hay en el lugar (hielo, aire) para fabricar agua, oxígeno o combustible.'],
  ['Microgravedad', 'Microgravity', 'Cuando todo cae junto (en órbita) y parece que flota.'],
  ['Despresurización', 'Depressurization', 'Pérdida de aire de la cabina por una fuga.'],
  ['Esclusa', 'Airlock', 'Cámara con dos puertas para salir al vacío sin perder el aire de adentro.'],
  ['Triaje', 'Triage', 'Decidir a quién atender primero según la gravedad.'],
  ['Electrólisis', 'Electrolysis', 'Separar el agua en hidrógeno y oxígeno con electricidad.'],
  ['Regolito', 'Regolith', 'Polvo y piedras sueltas que cubren la Luna y Marte.'],
  ['Perclorato', 'Perchlorate', 'Sal tóxica del suelo marciano.'],
  ['MOXIE', 'Mars Oxygen ISRU Experiment', 'Máquina del rover Perseverance que fabricó oxígeno en Marte.'],
  ['Órbita', 'Orbit', 'Camino curvo alrededor de un planeta: vas tan rápido que caes sin chocar nunca.'],
  ['Alfabeto fonético', 'Phonetic alphabet', 'Palabras para cada letra (Alfa, Bravo…) para que no haya confusiones por radio.'],
  ['Checklist', 'Checklist', 'Lista de pasos que se sigue en orden y se marca uno por uno.'],
];

export const BIOS = [
  { name: 'Franklin Chang Díaz', pais: 'Costa Rica', txt: 'Hizo 7 vuelos en transbordador (récord compartido) y 3 caminatas espaciales. Inventó el motor de plasma VASIMR.' },
  { name: 'Ellen Ochoa', pais: 'EE. UU. (familia mexicana)', txt: 'Primera mujer latina en el espacio (1993). Después dirigió el Centro Espacial Johnson de la NASA.' },
  { name: 'Rodolfo Neri Vela', pais: 'México', txt: 'Primer mexicano en el espacio (1985). Ayudó a poner en órbita satélites de comunicaciones.' },
  { name: 'Marcos Pontes', pais: 'Brasil', txt: 'Primer astronauta brasileño, voló a la ISS en una Soyuz en 2006.' },
  { name: 'Katya Echazarreta', pais: 'México', txt: 'Ingeniera eléctrica; en 2022 fue la primera mujer nacida en México en ir al espacio.' },
  { name: 'Yuri Gagarin', pais: 'URSS', txt: 'Primer ser humano en el espacio (12 de abril de 1961): una vuelta a la Tierra en 108 minutos.' },
  { name: 'Valentina Tereshkova', pais: 'URSS', txt: 'Primera mujer en el espacio (1963), estuvo casi 3 días en órbita.' },
  { name: 'Neil Armstrong y Buzz Aldrin', pais: 'EE. UU.', txt: 'Primeros en caminar en la Luna (Apolo 11, 1969).' },
];

export const DATOS = [
  'En la ISS ves 16 amaneceres y 16 atardeceres cada día.',
  'Los astronautas crecen hasta 3 cm en el espacio porque la columna se estira. Al volver se encogen otra vez.',
  'En la ISS se recicla ~98 % del agua, incluido el sudor y la orina.',
  'Un día en Marte (sol) dura 24 h 39 min.',
  'Las huellas del Apolo siguen en la Luna: no hay viento que las borre.',
  'El traje EVA de la NASA pesa unos 130 kg en la Tierra.',
  'La luz del Sol tarda 8 minutos en llegar a la Tierra y unos 3 a 22 minutos de Marte a la Tierra los mensajes de radio.',
  'En microgravedad, las lágrimas no caen: se quedan pegadas al ojo como una burbuja.',
  'Los astronautas duermen atados en bolsas para no flotar y chocar con algo.',
  'La comida en el espacio pierde sabor porque los fluidos suben a la cabeza y tapan la nariz.',
];

export const FUENTES = [
  ['NASA · Station Facts', 'https://www.nasa.gov/international-space-station/space-station-facts-and-figures/'],
  ['NASA · Life support (ECLSS)', 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/'],
  ['NASA · MOXIE (Perseverance)', 'https://mars.nasa.gov/mars2020/spacecraft/instruments/moxie/'],
  ['NASA · Exercise on the ISS', 'https://www.nasa.gov/missions/station/'],
  ['ESA · Astronaut training', 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Astronauts'],
  ['NASA · Apollo 11', 'https://www.nasa.gov/mission/apollo-11/'],
];

// Medallas educativas: se ganan por cómo aprendiste, no solo por ganar.
export const MEDALLAS = [
  { id: 'sin-errores', name: 'Protocolo perfecto', desc: 'Completa una checklist sin errores.' },
  { id: 'fuego', name: 'Bombero orbital', desc: 'Aprueba "Fuego a bordo" con 90 o más.' },
  { id: 'radio', name: 'Voz clara', desc: 'Todas las preguntas de radio correctas en una misión.' },
  { id: 'calculo', name: 'Cabeza fría', desc: 'Todos los cálculos correctos en una misión.' },
  { id: 'rapido', name: 'Bajo el tiempo', desc: 'Termina una misión antes del tiempo par.' },
  { id: 'equipo', name: 'Tripulación unida', desc: 'Termina una misión en cooperativo repartiendo el trabajo.' },
  { id: 'medico', name: 'Ángel de la guarda', desc: 'Triaje perfecto en la Enfermería.' },
  { id: 'fase1', name: 'Graduado orbital', desc: 'Completa la fase Estación.' },
  { id: 'fase2', name: 'Graduado lunar', desc: 'Completa la fase Luna.' },
  { id: 'fase3', name: 'Graduado marciano', desc: 'Completa la fase Marte.' },
  { id: 'examen', name: 'Comandante certificado', desc: 'Aprueba el examen final.' },
  { id: 'mejora', name: 'Aprendiz veloz', desc: 'Sube 2 o más respuestas entre la evaluación de antes y la de después.' },
];
