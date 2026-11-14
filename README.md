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

## Destinos y sus 5 problemas-enemigo
| | IA | Problemas que se mueven |
|---|---|---|
| 🛰️ **Estación** | CUSTODIA | drones, incendio que se extiende, nube de amoniaco, chatarra que rebota, fuga que te jala |
| 🌑 **Luna** (Shackleton) | SELENE | tormenta solar (corre al refugio), remolino de polvo, rover descontrolado, grieta por temblor, frío de la noche lunar |
| 🔴 **Marte** (Jezero) | ARES | diablo de polvo, plaga del invernadero, perclorato tóxico, robot fallado que desarma cajones, tormenta global |

En Luna y Marte hay **superficie**: sin traje se acaba el oxígeno en segundos.

Controles: `WASD`/flechas · `E` usar/hablar · `C` fabricar · `Q` inhibidor · `P` pausa. En el teléfono aparecen botones.

## Técnica
HTML + JavaScript sin dependencias. `src/core.js` es la lógica (sin pantalla) y tiene pruebas: `npm test`.
Fuente VT323 (licencia OFL, `fonts/`).
