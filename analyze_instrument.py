#!/usr/bin/env python3
"""
Sompyler instrument analysis — derive character-block parameters from a WAV reference.

Scientific method:
  STFT (Hann, 4096 frames, 512 hop) → per-frame harmonic amplitudes and frequencies
  via parabolic interpolation at each expected integer multiple of f0.

Produces for each instrument:
  PROFILE   — mid-sustain harmonic ratios (H1=100)
  D:        — inharmonicity in cents per harmonic
  SPREAD    — if inharmonicity follows a monotonic trend
  A/S/R     — global envelope from RMS trajectory
  per-H A:  — harmonics that build significantly AFTER the loudness peak
  per-H S:  — harmonics that decay faster during sustain
  Vibrato   — FM rate + depth from H1 frequency autocorrelation
  Tremolo   — LFO rate + depth from H1 amplitude autocorrelation
"""
import sys, wave, struct
import numpy as np
from scipy.signal import butter, filtfilt

FIXTURES = '/home/sdk/repos/sompyler-web/src/conformance/fixtures'

def load_wav(path):
    with wave.open(path) as w:
        sr, n, ch, sw = w.getframerate(), w.getnframes(), w.getnchannels(), w.getsampwidth()
        raw = w.readframes(n)
    fmt   = {1: f'<{n*ch}b', 2: f'<{n*ch}h', 4: f'<{n*ch}i'}[sw]
    scale = {1: 127.0, 2: 32767.0, 4: 2147483647.0}[sw]
    s = np.array(struct.unpack(fmt, raw), np.float64) / scale
    if ch == 2: s = (s[0::2] + s[1::2]) / 2
    return s, sr

def stft_harmonics(samples, sr, f0, n_harm=24, frame=4096, hop=512):
    """Return (times, amps[n_harm,n_frames], freqs[n_harm,n_frames])."""
    win    = np.hanning(frame)
    bin_hz = sr / frame
    n_frames = (len(samples) - frame) // hop
    times  = np.arange(n_frames) * hop / sr
    amps   = np.zeros((n_harm, n_frames))
    freqs  = np.zeros((n_harm, n_frames))
    for fi in range(n_frames):
        seg = samples[fi*hop : fi*hop+frame]
        mag = np.abs(np.fft.rfft(seg * win))
        for h in range(n_harm):
            target = f0 * (h + 1)
            ci = int(round(target / bin_hz))
            r  = max(4, int(20 / bin_hz))        # ±20 Hz search
            lo, hi = max(1,ci-r), min(len(mag)-2, ci+r)
            pk = lo + int(np.argmax(mag[lo:hi+1]))
            # parabolic interpolation for sub-bin freq
            d = 0.0
            denom = 2*mag[pk] - mag[pk-1] - mag[pk+1]
            if abs(denom) > 1e-10:
                d = 0.5*(mag[pk+1]-mag[pk-1]) / denom
            amps[h, fi]  = mag[pk]
            freqs[h, fi] = (pk + d) * bin_hz
    return times, amps, freqs

def rms_env(samples, sr, hop_ms=10):
    hop = int(sr * hop_ms / 1000)
    v = [np.sqrt(np.mean(samples[i:i+hop]**2)) for i in range(0,len(samples)-hop,hop)]
    return np.arange(len(v))*hop_ms/1000, np.array(v)

def first_cross(t, v, after, threshold):
    idx = np.where((t > after) & (v < threshold))[0]
    return float(t[idx[0]]) if len(idx) else float(t[-1])

def autocorr_period(series, fps, min_hz=1.5, max_hz=20):
    s = series - series.mean()
    ac = np.correlate(s, s, 'full')[len(s)-1:]
    if ac[0] < 1e-12: return None, None
    ac /= ac[0]
    lo, hi = max(2, int(fps/max_hz)), int(fps/min_hz)
    if hi >= len(ac): return None, None
    pk = lo + int(np.argmax(ac[lo:hi+1]))
    if ac[pk] < 0.25: return None, None
    return fps/pk, float(np.std(series))

def analyze(wav_path, name, f0, note):
    samples, sr = load_wav(wav_path)
    dur = len(samples)/sr

    t_rms, rms = rms_env(samples, sr)
    pk_i  = int(np.argmax(rms))
    peak_t = float(t_rms[pk_i])

    t12 = first_cross(t_rms, rms, peak_t, rms[pk_i]*10**(-12/20))
    t40 = first_cross(t_rms, rms, peak_t, rms[pk_i]*10**(-40/20))

    times, amps, freqs = stft_harmonics(samples, sr, f0)
    fps = sr / 512

    # sustain window: peak → min(peak+2.5s, -6dB point)
    t6  = first_cross(t_rms, rms, peak_t, rms[pk_i]*10**(-6/20))
    s0  = int((peak_t + 0.15) * fps)
    s1  = int(min(peak_t + 2.5, t6 - 0.1) * fps)
    s0  = max(s0, 0);  s1 = min(s1, amps.shape[1]-1)
    if s1 <= s0: s1 = min(s0+20, amps.shape[1]-1)

    # PROFILE
    h1m  = np.mean(amps[0, s0:s1]) + 1e-12
    prof = [float(np.mean(amps[h, s0:s1]) / h1m * 100) for h in range(24)]

    # Inharmonicity (cents deviation at mid-sustain)
    inh = []
    for h in range(24):
        mf  = float(np.median(freqs[h, s0:s1]))
        exp = f0 * (h+1)
        inh.append(1200*np.log2(mf/exp) if mf > 30 else 0.0)

    # Per-partial envelope relative to H1
    pk_f = int(peak_t * fps)
    per  = []
    for h in range(1, 24):
        ratio_full = amps[h] / (amps[0] + 1e-12) * 100
        at_pk  = float(np.mean(ratio_full[max(0,pk_f-2):pk_f+3]))
        at_sus = float(np.mean(ratio_full[s0:s1]))
        if at_sus < 0.5: continue
        # slow build: ratio at peak much lower than sustained
        if at_pk < at_sus * 0.6 and at_sus > 2:
            per.append(('build', h+1, at_pk, at_sus))
        # fast decay in sustain
        late0 = s1
        late1 = min(int(t40*fps*0.8), amps.shape[1]-1)
        if late1 > late0 + 5:
            at_late = float(np.mean(ratio_full[late0:late1]))
            if at_late < at_sus * 0.45 and at_sus > 2:
                per.append(('decay', h+1, at_sus, at_late))

    # Vibrato: H1 frequency oscillation
    h1_freq = freqs[0, s0:s1]
    if len(h1_freq) > 10:
        mean_f = np.mean(h1_freq)
        cents_f = 1200*np.log2(h1_freq/mean_f + 1e-10)
        # smooth
        if len(cents_f) > 10:
            b,a = butter(2, min(0.49, 25/fps), 'low')
            try: cents_f = filtfilt(b,a,cents_f)
            except: pass
        vib_rate, vib_std = autocorr_period(cents_f, fps)
        vibrato = (vib_rate, vib_std*1.41) if vib_rate else None
    else:
        vibrato = None

    # Tremolo: H1 amplitude oscillation
    h1_amp = amps[0, s0:s1]
    if len(h1_amp) > 10 and np.mean(h1_amp) > 1e-10:
        norm_a = h1_amp / np.mean(h1_amp)
        tr_rate, tr_std = autocorr_period(norm_a, fps)
        tremolo = (tr_rate, tr_std*100*1.41) if tr_rate else None
    else:
        tremolo = None

    return dict(name=name, note=note, f0=f0, dur=dur,
                peak_t=peak_t, t12=t12, t40=t40,
                profile=prof, inh=inh, per=per,
                vibrato=vibrato, tremolo=tremolo)

def spread_fit(inh):
    """If inharmonicity grows roughly linearly, return per-step cents."""
    vals = [(h+1, c) for h, c in enumerate(inh) if h > 0 and abs(c) > 3]
    if len(vals) < 4: return None
    hs  = np.array([v[0] for v in vals], float)
    cs  = np.array([v[1] for v in vals], float)
    # linear fit through origin: c = slope * h
    slope = float(np.dot(hs, cs) / (np.dot(hs, hs) + 1e-10))
    resid = np.std(cs - slope*hs)
    if abs(slope) < 2 or resid > abs(slope)*2: return None
    return slope   # cents per harmonic number (cumulative step = slope)

INSTRUMENTS = [
    ('bass.wav',                'BASS',     65.41,  'C2'),
    ('synbrass.wav',            'SYNBRASS', 261.63, 'C4'),
    ('strings.wav',             'STRINGS',  130.81, 'C3'),
    ('ensemble.wav',            'ENSEMBLE', 261.63, 'C4'),
    ('bowedpad.wav',            'BOWEDPAD', 261.63, 'C4'),
    ('melody.wav',              'MELODY',   196.00, 'G3'),
    ('kalimba_c4_timidity.wav', 'KALIMBA',  261.63, 'C4'),
]

for wav, name, f0, note in INSTRUMENTS:
    r = analyze(f'{FIXTURES}/{wav}', name, f0, note)
    sp = spread_fit(r['inh'])

    print(f"\n{'='*64}")
    print(f"  {name} ({note})  f0={f0}Hz  dur={r['dur']:.2f}s")
    print(f"  peak={r['peak_t']:.3f}s  -12dB={r['t12']:.2f}s  -40dB={r['t40']:.2f}s")

    if r['vibrato']:
        vr, vd = r['vibrato']
        print(f"  VIBRATO  rate={vr:.2f}Hz  depth≈±{vd:.1f}c  → FM: \"{vr:.2f}[@sin];{vd/1200*r['f0']:.3f}\"")
    if r['tremolo']:
        tr, td = r['tremolo']
        print(f"  TREMOLO  rate={tr:.2f}Hz  depth≈{td:.1f}%  → LFO: \"{tr:.2f}@sin;{td/100:.3f}:amp\"")

    print(f"\n  PROFILE (mid-sustain, H1=100):")
    p = r['profile']
    print(f"  [{', '.join(f'{x:.1f}' for x in p)}]")

    sig_inh = [(h+1,c) for h,c in enumerate(r['inh']) if abs(c) > 5]
    if sig_inh:
        print(f"\n  INHARMONICITY (|cents|>5):")
        for h,c in sig_inh:
            print(f"    H{h:02d}: {c:+.1f}c", end='')
            if r['profile'][h-1] > 5:
                print(f"  → D: {c:.0f} in PROFILE[{h-1}]", end='')
            print()
        if sp:
            print(f"  SPREAD fit: {sp:+.2f} c/harmonic → SPREAD: [{', '.join(str(round(sp*i)) for i in range(1,25))}]")

    if r['per']:
        print(f"\n  PER-PARTIAL ENVELOPE:")
        for entry in r['per']:
            if entry[0] == 'build':
                _, h, at_pk, at_sus = entry
                print(f"    H{h:02d} builds: {at_pk:.1f}%→{at_sus:.1f}% after peak"
                      f"  → PROFILE[{h-1}]: {{V:{at_sus:.1f}, A:\"longer\"}}")
            elif entry[0] == 'decay':
                _, h, at_sus, at_late = entry
                factor = at_late/(at_sus+1e-10)
                print(f"    H{h:02d} fast decay: {at_sus:.1f}%→{at_late:.1f}% (×{factor:.2f})"
                      f"  → PROFILE[{h-1}]: {{V:{at_sus:.1f}, S:\"shorter\"}}")

