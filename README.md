# LIFELINE: Rutina

> Cumple la rutina, esquiva a **CUSTODIA** y prepara en secreto tu regreso a la Tierra.

Versión aparte de [LIFELINE](https://github.com/NeckHurtttt/Lifeline) para comparar: en vez de administrar una misión,
**eres un astronauta** que vive el día a día de la estación mientras la IA que la controla no quiere dejar volver a nadie.

**Jugar:** https://neckhurtttt.github.io/Custodia/

## Cómo se juega
- **Rutina:** pase de lista, comidas, turno de trabajo, 2 h de ejercicio (como en la ISS), tiempo libre y luces apagadas. Si faltas, sube la alerta de la IA. Una flecha te dice a dónde ir.
- **Mejora:** la cinta del gimnasio sube la fuerza; las terminales del laboratorio, el conocimiento (desbloquea recetas).
- **Tripulación viva:** 3 compañeros siguen la rutina, hablan y te piden piezas; si los ayudas te devuelven favores.
- **Fabrica** herramientas con lo que hay en los cajones (13 recetas, según el destino).
- **Vigilancia:** drones/vigías con cono de visión. Los conductos de ventilación los esquivan. Escondite para tus cosas.
- **Minijuegos:** protocolos NASA (pasos en orden contra reloj), hackeo de registros (memoria) y cables (robots, energía).
- **Plan de regreso:** código, combustible, traje y llave. Después, la huida final contra reloj.
- **Finales:** regreso silencioso, por los pelos, o apagar a la IA (3 estrellas).

- **Sigilo fino:** los vigías primero dudan (?) e investigan, después persiguen. Te ven menos en las sombras. Cajones, fabricar y forzar rejillas hacen ruido. Si ven una herramienta de cerca, sospechan.
- **Supervivencia:** hambre y sed (come en los horarios, bebe agua en la mesa), cansancio que te hace lento y torpe en los protocolos, fugas de aire que gastan oxígeno dentro de la sala.
- **Base viva:** las rondas cambian cada día y se invierten a las 14:00. Hay inspecciones de escondites con aviso, fallos en cadena si no resuelves un problema, compañeros enfermos, peleas que distraen a la vigilancia, testigos que te cubren o te delatan, trueques de piezas por datos y tarjetas que se roban a un compañero dormido.
- **Cada destino tiene su gravedad** (inercia distinta). En Marte dejas huellas que los drones siguen (agachado no). Las herramientas se gastan. El diario guarda las pistas. Los días perfectos seguidos dan racha. Con <kbd>H</kbd> juegas sin HUD.
- **Textura:** ventanas al exterior, luces de alarma giratorias, vapor y chispas, polvo en la luz, objetos que flotan en la estación, desgaste y carteles, amanecer y atardecer, pantallas vivas, expresiones de la tripulación, aberración de color al ser visto, viñeta, visor del casco, llegada y despegue animados, datos reales en la pantalla de carga, pasos que suenan distinto según el suelo, respiración en el casco, radio con estática, ambiente de la base, vigías en sonido 3D y capa de tensión musical.

## Destinos y sus 5 problemas-enemigo
| | IA | Problemas que se mueven |
|---|---|---|
| 🛰️ **Estación** | CUSTODIA | drones, incendio que se extiende, nube de amoniaco, chatarra que rebota, fuga que te jala |
| 🌑 **Luna** (Shackleton) | SELENE | tormenta solar (corre al refugio), remolino de polvo, rover descontrolado, grieta por temblor, frío de la noche lunar |
| 🔴 **Marte** (Jezero) | ARES | diablo de polvo, plaga del invernadero, perclorato tóxico, robot fallado que desarma cajones, tormenta global |

En Luna y Marte hay **superficie**: sin traje se acaba el oxígeno en segundos.

Controles: `WASD`/flechas · `E` usar/hablar · `C` fabricar · `Q` inhibidor · `P` pausa. En el teléfono aparecen botones.

## Cooperativo en línea

En el título: **JUGADORES → 🌐 EN LÍNEA**.
- **Anfitrión:** elige un destino; aparece un código de 5 letras. Pásaselo a tu compañero.
- **Invitado:** **UNIRSE CON CÓDIGO** y escribe el código. Juega como J2 (naranja) con WASD o flechas.

La conexión es directa entre las dos computadoras (WebRTC con PeerJS; el servidor público gratis de PeerJS solo los presenta). El anfitrión corre la partida y le manda al invitado el estado 12 veces por segundo; el invitado manda sus controles. Si el invitado se cae, puede volver con el mismo código. El anfitrión no debe minimizar la pestaña (el navegador la pausa). En redes muy cerradas (algunas de universidad) puede no conectar.

## Técnica
HTML + JavaScript sin dependencias. `src/core.js` es la lógica (sin pantalla) y tiene pruebas: `npm test`.
Fuente VT323 (licencia OFL, `fonts/`).
