# LIFELINE: Rutina

> Cumple la rutina, esquiva a **CUSTODIA** y prepara en secreto tu regreso a la Tierra.

Versión aparte de [LIFELINE](https://github.com/NeckHurtttt/Lifeline) para comparar: en vez de administrar una misión,
**eres un astronauta** que vive el día a día de la estación mientras la IA que la controla no quiere dejar volver a nadie.

**Jugar:** https://neckhurtttt.github.io/Custodia/

## Cómo se juega
- **Rutina:** pase de lista con el CAPCOM, comidas, turno en el invernadero, 2 h de ejercicio (como en la ISS), tiempo libre y luces apagadas. Si faltas, sube la alerta de CUSTODIA.
- **Mejora:** la cinta del gimnasio sube la fuerza (cargas más y mueves cajas pesadas); las terminales del laboratorio suben el conocimiento (desbloquean recetas).
- **Fabrica** herramientas con piezas de los cajones: destornillador, amarra, parche, extintor (PFE), máscara (PBA), inhibidor, tarjeta clonada, llave de desacople.
- **Drones:** ven en un cono. Si te ven donde no debes, te persiguen. Los conductos de ventilación los esquivan.
- **Escondite:** guarda ahí tus herramientas; en el pase de lista te revisan.
- **Problemas-enemigo** que se mueven: incendio que se extiende, nube de amoniaco que te sigue, chatarra que rebota y fuga de aire que te jala. Se resuelven con **protocolos reales de la NASA** (pasos en orden, contra reloj).
- **Plan de regreso:** código de la cápsula, combustible, traje Sokol y llave de desacople. Después, la huida: 75 s para soltar la palanca y volver a la Soyuz.
- **Finales:** regreso silencioso, por los pelos, o apagar a CUSTODIA y recuperar la estación (3 estrellas).

Controles: `WASD`/flechas · `E` usar · `C` fabricar · `Q` inhibidor · `P` pausa. En el teléfono aparecen botones.

## Destinos
- 🛰️ **Estación** — jugable.
- 🌑 **Luna** y 🔴 **Marte** — próximamente (radiación, polvo, rover descontrolado, tormenta global…).

## Técnica
HTML + JavaScript sin dependencias. `src/core.js` es la lógica (sin pantalla) y tiene pruebas: `npm test`.
Fuente VT323 (licencia OFL, `fonts/`).
