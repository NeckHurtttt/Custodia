# Música del juego

Seis pistas, dos por destino. Si una falta, suena la música generativa del juego.

| Archivo | Cuándo suena |
|---|---|
| `estacion-calma.mp3` / `estacion-panico.mp3` | Estación (CUSTODIA) |
| `luna-calma.mp3` / `luna-panico.mp3` | Luna (SELENE) |
| `marte-calma.mp3` / `marte-panico.mp3` | Marte (ARES) |

*calma* = rutina y tensión (niveles 0-1). *panico* = te ven, te persiguen o la huida final (niveles 2-3). Cambian con fundido.

Para preparar una canción: `tools/musica.sh ~/Descargas/cancion.mp3 luna-calma` (quita los fundidos, baja a -18 LUFS, 112 kbps).
