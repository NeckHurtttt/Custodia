# Música del juego

| Destino | Calma (rutina y tensión) | Crisis (te ven, te persiguen, huida final) |
|---|---|---|
| Estación | `estacion-calma.mp3` · *Orbital Emergency* (Suno, Do mayor) | `estacion-panico.mp3` · 132 bpm, La menor: sirena de dos tonos, caja metálica |
| Luna | `luna-calma.mp3` · *Orbital Pressure* v2 (Suno, Do menor) | `luna-panico.mp3` · 124 bpm, Do menor: latido, cuerdas disonantes en trémolo |
| Marte | `marte-calma.mp3` · *Orbital Pressure* v1 (Suno, Fa mayor) | `marte-panico.mp3` · 139 bpm, Re frigio: tambores de guerra, bajo distorsionado, polvo |

Las de crisis las genera `python3 tools/crisis.py` a partir de la canción de calma: la canción queda de fondo (filtrada y bombeando con el bombo) y encima va un arreglo nuevo en su tonalidad, en 3 partes (intro → núcleo → clímax).
En el juego: la crisis empieza desde su intro, en la huida final va 8 % más rápida y al atraparte la música se frena como una cinta.

- Preparar una canción nueva: `tools/musica.sh ~/Descargas/cancion.mp3 luna-calma`
- Ver tempo y tonalidad: `python3 tools/analiza.py music/luna-calma.mp3`
