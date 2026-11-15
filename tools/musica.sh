#!/usr/bin/env bash
# Prepara una canción para el juego: quita el fundido de entrada/salida (para que el bucle no tenga hueco),
# baja el volumen a -18 LUFS (deja lugar a efectos y latido) y la guarda liviana en music/<nombre>.mp3.
# Uso: tools/musica.sh ~/Descargas/cancion.mp3 estacion-calma [segundos_a_quitar_al_inicio=4] [al_final=6]
set -euo pipefail
in="$1"; name="$2"; a="${3:-4}"; b="${4:-6}"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
end=$(python3 -c "print(max(10, $dur - $b))")
cd "$(dirname "$0")/.."
ffmpeg -v error -y -ss "$a" -to "$end" -i "$in" -af "loudnorm=I=-18:TP=-2:LRA=7,afade=t=in:d=0.05" -ar 44100 -b:a 112k "music/$name.mp3"
echo "listo: music/$name.mp3 ($(du -h "music/$name.mp3" | cut -f1))"
