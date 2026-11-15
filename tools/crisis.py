# Genera la música de CRISIS (persecución/captura) de cada destino a partir de su canción de calma.
# La canción queda de fondo (filtrada, en su tonalidad, "bombeando" con el bombo) y encima va un arreglo nuevo
# en la misma tonalidad: batería, bajo insistente, alarmas. 32 compases que suben de intensidad y repiten sin corte.
# Uso: python3 tools/crisis.py estacion|luna|marte   (lee music/<loc>-calma.mp3, escribe music/<loc>-panico.mp3)
import sys, subprocess, os, tempfile, numpy as np
SR = 44100
rng = np.random.default_rng(7)

# tonalidad de la crisis (relativa menor de lo que detectó tools/analiza.py) y tempo
CFG = {
    'estacion': dict(bpm=132, root=57, scale=[0, 2, 3, 5, 7, 8, 10], bed_start=40),   # La menor (canción en Do mayor)
    'luna':     dict(bpm=124, root=48, scale=[0, 2, 3, 5, 7, 8, 10], bed_start=30),   # Do menor (igual que la canción)
    'marte':    dict(bpm=139, root=50, scale=[0, 1, 3, 5, 7, 8, 10], bed_start=35),   # Re frigio (canción en Fa mayor)
}
hz = lambda m: 440 * 2 ** ((m - 69) / 12)

def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x, axis=0); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X * (g[:, None] if x.ndim == 2 else g), n=len(x), axis=0)
def env(n, a, d):  # ataque/caída exponencial en muestras
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def place(buf, snd, t, gain=1.0, pan=0.0):
    i = int(t * SR); j = min(len(buf), i + len(snd))
    if j <= i: return
    s = snd[: j - i] * gain; buf[i:j, 0] += s * (1 - max(0, pan)); buf[i:j, 1] += s * (1 + min(0, pan))
def kick(d=0.45, f0=120, f1=42):
    t = np.arange(int(d * SR)) / SR; f = f1 + (f0 - f1) * np.exp(-t * 28); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, 0.18)
def snare(d=0.3, tone=190, metal=False):
    n = int(d * SR); t = np.arange(n) / SR; nz = fft_filter(rng.standard_normal(n), lo=1500) * env(n, 0.001, 0.07)
    body = np.sin(2 * np.pi * tone * t) * env(n, 0.001, 0.05)
    ring = (np.sin(2 * np.pi * 1730 * t) + np.sin(2 * np.pi * 2410 * t)) * env(n, 0.001, 0.12) * 0.25 if metal else 0
    return nz * 0.8 + body * 0.6 + ring
def hat(d=0.06, open_=False):
    n = int((0.25 if open_ else d) * SR); return fft_filter(rng.standard_normal(n), lo=7000) * env(n, 0.0005, 0.09 if open_ else 0.018)
def tom(f=90, d=0.5):
    t = np.arange(int(d * SR)) / SR; fr = f * (1 + 0.6 * np.exp(-t * 20)); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(len(t), 0.002, 0.22)
def saw(f, d, bright=1.0):
    t = np.arange(int(d * SR)) / SR; x = 2 * ((t * f) % 1) - 1; x2 = 2 * ((t * f * 1.006) % 1) - 1; return fft_filter((x + x2) / 2, hi=300 + 2500 * bright)
def sq(f, d):
    t = np.arange(int(d * SR)) / SR; return np.sign(np.sin(2 * np.pi * f * t)) * 0.5
def sine(f, d):
    t = np.arange(int(d * SR)) / SR; return np.sin(2 * np.pi * f * t)

def bed(loc, start, dur):
    """La canción de calma, filtrada y con eco, como fondo armónico."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(start), '-t', f'{dur + 2:.3f}', '-i', f'music/{loc}-calma.mp3',
                          '-af', 'lowpass=f=700,lowpass=f=900,aecho=0.8:0.6:90|180:0.35|0.2', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)[: int(dur * SR)]
    if len(x) < int(dur * SR): x = np.pad(x, ((0, int(dur * SR) - len(x)), (0, 0)))
    fade = int(1.5 * SR); w = np.linspace(0, 1, fade)[:, None]
    # bucle sin corte: se mezcla el final con el principio
    x[:fade] = x[:fade] * w + x[-fade:] * (1 - w)
    return x / (np.abs(x).max() + 1e-9)

def render(loc):
    c = CFG[loc]; bpm = c['bpm']; beat = 60 / bpm; bars = 32; dur = bars * 4 * beat; N = int(dur * SR)
    out = np.zeros((N, 2)); drums = np.zeros((N, 2)); duck = np.ones(N)
    deg = lambda k: c['root'] + c['scale'][k % 7] + 12 * (k // 7)
    prog = [0, 0, 5, 6] if loc != 'marte' else [0, 1, 0, 6]   # grados por cada 2 compases
    K, S, H, OH = kick(), snare(metal=(loc == 'estacion')), hat(), hat(open_=True)
    for b in range(bars):
        t0 = b * 4 * beat; sec = 0 if b < 8 else 1 if b < 24 else 2   # intro / núcleo / clímax
        ch = prog[(b // 2) % len(prog)]
        for st in range(16):
            t = t0 + st * beat / 4
            # ---- batería por destino ----
            if loc == 'estacion':
                if st % 4 == 0: place(drums, K, t, 0.9); duck[int(t * SR): int(t * SR) + int(0.18 * SR)] = np.linspace(0.35, 1, int(0.18 * SR))
                if sec and st in (4, 12): place(drums, S, t, 0.55)
                if st % 2 == 0 or sec == 2: place(drums, H, t, 0.12 if st % 4 else 0.18, pan=0.3)
                if st == 14 and b % 2: place(drums, OH, t, 0.12, pan=-0.3)
            elif loc == 'luna':
                if st in (0, 3) or (sec == 2 and st in (8, 11)): place(drums, K, t, 0.95 if st in (0, 8) else 0.6); duck[int(t * SR): int(t * SR) + int(0.25 * SR)] = np.linspace(0.3, 1, int(0.25 * SR))
                if sec and st == 8: place(drums, S, t, 0.5)
                if sec == 2 and st % 2 == 0: place(drums, H, t, 0.08)
                if st % 4 == 2 and sec: place(drums, tom(70), t, 0.25, pan=0.4)
            else:  # marte: tambores de guerra
                if st in (0, 6, 10) or (sec == 2 and st == 14): place(drums, K, t, 0.9); duck[int(t * SR): int(t * SR) + int(0.15 * SR)] = np.linspace(0.4, 1, int(0.15 * SR))
                if st % 2 == 0 and sec: place(drums, tom(110 if st % 4 else 80), t, 0.35, pan=(-0.4 if st % 4 else 0.4))
                if sec and st in (4, 12): place(drums, S, t, 0.5)
                if sec == 2 and st % 2 == 1: place(drums, H, t, 0.09)
            # ---- bajo insistente (corcheas) ----
            if st % 2 == 0:
                n = deg(ch) - 12 + (12 if st in (6, 14) else 0)
                b_ = saw(hz(n), beat / 2 * 0.95, bright=0.25 + 0.25 * sec) * env(int(beat / 2 * 0.95 * SR), 0.004, 0.18)
                if loc == 'marte': b_ = np.tanh(b_ * 3) * 0.6
                place(out, b_, t, 0.32)
            # ---- arpegio de tensión (semicorcheas en el clímax) ----
            if sec >= 1 and (st % 2 == 0 or sec == 2) and loc != 'luna':
                k = [0, 2, 4, 7, 4, 2, 1, 2][st % 8]; f = hz(deg(ch + k) + 12)
                place(out, (sq(f, beat / 4) if loc == 'estacion' else np.tanh(3 * saw(f, beat / 4, 0.6))) * env(int(beat / 4 * SR), 0.002, 0.06), t, 0.05, pan=(0.25 if st % 4 else -0.25))
        # ---- capas por compás ----
        if loc == 'estacion' and b % 4 == 3:   # sirena de dos tonos
            for i in range(4): place(out, sq(hz(deg(4) + 24 + (1 if i % 2 else 0)), beat) * env(int(beat * SR), 0.01, 0.6), t0 + i * beat, 0.035)
        if loc == 'luna':   # cuerdas disonantes en trémolo + campana lejana
            d = 4 * beat; tr = 0.6 + 0.4 * np.sin(2 * np.pi * 8 * np.arange(int(d * SR)) / SR)
            for m in (deg(ch) + 12, deg(ch) + 13, deg(ch) + 19): place(out, saw(hz(m), d, 0.3) * tr * env(int(d * SR), 0.4, 3.0), t0, 0.03 + 0.015 * sec)
            if b % 2 == 0: place(out, sine(hz(deg(4) + 36), 2.0) * env(int(2 * SR), 0.002, 0.7), t0 + 2 * beat, 0.05, pan=0.5)
        if loc == 'marte' and b % 2 == 1:   # barrido de tormenta de polvo
            d = 4 * beat; nz = fft_filter(rng.standard_normal(int(d * SR)), lo=800, hi=5000) * np.linspace(0, 1, int(d * SR)) ** 2
            place(out, nz, t0, 0.06 + 0.04 * sec)
        if b in (7, 23, 31):   # subida antes de cada sección
            d = 4 * beat; nz = fft_filter(rng.standard_normal(int(d * SR)), lo=2000) * np.linspace(0, 1, int(d * SR)) ** 3
            place(out, nz, t0, 0.08)
    bd = bed(loc, c['bed_start'], dur) * duck[:, None]
    mix = bd * 0.55 + out + drums * 0.8
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)
    tmp = os.path.join(tempfile.gettempdir(), f'lfr-crisis-{loc}')
    (np.clip(mix, -1, 1) * 32767).astype('<i2').tofile(tmp + '.raw')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', tmp + '.raw', '-af', 'loudnorm=I=-15:TP=-1.5:LRA=7', '-ar', str(SR), '-b:a', '128k', f'music/{loc}-panico.mp3'], check=True)
    os.remove(tmp + '.raw')
    print(f'listo: music/{loc}-panico.mp3 · {bpm} bpm · {dur:.0f} s')

if __name__ == '__main__':
    for loc in sys.argv[1:] or CFG: render(loc)
