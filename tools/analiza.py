# Detecta tempo (bpm), fase del pulso y tonalidad de una canción. Uso: python3 tools/analiza.py music/x.mp3
import sys, subprocess, json, numpy as np
SR = 22050
def load(f, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)
def analyze(f):
    x = load(f); n, h = 2048, 256; fps = SR / h
    fr = np.lib.stride_tricks.sliding_window_view(x, n)[::h] * np.hanning(n)
    S = np.abs(np.fft.rfft(fr, axis=1)); fq = np.fft.rfftfreq(n, 1 / SR)
    lo = S[:, (fq > 30) & (fq < 4000)]
    on = np.maximum(0, np.diff(np.log1p(lo), axis=0)).sum(1); on = np.concatenate([[0], on]); on -= np.convolve(on, np.ones(16) / 16, 'same'); on = np.maximum(on, 0)
    # tempo: autocorrelación con interpolación fina, entre 70 y 180 bpm
    m = min(len(on), int(fps * 90)); ac = np.correlate(on[:m], on[:m], 'full')[m - 1:]
    best = None
    for bpm in np.arange(70, 180, 0.05):
        lag = 60 * fps / bpm; i = int(lag); fr_ = lag - i
        v = sum(ac[int(k * lag)] * (1 - (k * lag - int(k * lag))) + ac[int(k * lag) + 1] * (k * lag - int(k * lag)) for k in (1, 2, 4) if int(k * lag) + 1 < len(ac))
        if best is None or v > best[0]: best = (v, bpm)
    bpm = best[1]
    # preferir el doble/mitad si cae en 80-140
    if bpm < 80 and bpm * 2 < 180: bpm *= 2
    # fase: plegar el envolvente en un periodo
    per = 60 * fps / bpm; t = np.arange(len(on))
    ph = np.linspace(0, per, 64, endpoint=False)
    score = [on[np.clip(np.round(np.arange(p, len(on) - 1, per)).astype(int), 0, len(on) - 1)].sum() for p in ph]
    phase = ph[int(np.argmax(score))] / fps
    # tonalidad (Krumhansl)
    pcs = np.zeros(12); m2 = (fq > 60) & (fq < 2000); midi = 69 + 12 * np.log2(fq[m2] / 440)
    E = (S[:, m2] ** 2).sum(0)
    for pc in range(12): pcs[pc] = E[np.round(midi).astype(int) % 12 == pc].sum()
    maj = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]); mnr = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    cands = [(np.corrcoef(np.roll(p, r), pcs)[0, 1], r, mode) for r in range(12) for p, mode in ((maj, 'mayor'), (mnr, 'menor'))]
    c, root, mode = max(cands)
    names = ['Do', 'Do#', 'Re', 'Mib', 'Mi', 'Fa', 'Fa#', 'Sol', 'Lab', 'La', 'Sib', 'Si']
    return {'bpm': round(float(bpm), 2), 'phase': round(float(phase), 3), 'root': int(root), 'mode': mode, 'key': f'{names[root]} {mode}', 'conf': round(float(c), 2), 'dur': round(len(x) / SR, 2)}
if __name__ == '__main__':
    for f in sys.argv[1:]: print(f, json.dumps(analyze(f), ensure_ascii=False))
