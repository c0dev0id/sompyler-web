#!/usr/bin/env python3
"""
compare_instrument.py — Compare TiMidity SF2 rendering vs sompyler-web .spli.

Usage:
    python3 compare_instrument.py SF2 GM_NUM --spli FILE [options]
    python3 compare_instrument.py SF2 drum:NOTE --spli FILE [options]

    GM_NUM is 1-based (e.g. 52 = Synth Strings 2).
    drum:NOTE reads from GM percussion bank (e.g. drum:54 = Tambourine).

Options:
    --spli FILE      .spli instrument file to compare against (required)
    --note N         MIDI note number for both renderers (default 60 = C4)
    --duration D     Note-on duration in seconds (default 3.0)
    --damp D         Release tail in seconds captured after note-off (default 2.0)
    --velocity V     MIDI velocity 1-127 (default 80)
    --harmonics N    Number of harmonics to compare in spectrum (default 16)
    --mid-time T     Time in seconds for spectral snapshot (default: mid-note)
"""

import argparse, os, struct, subprocess, sys, tempfile
import numpy as np
try:
    import scipy.io.wavfile as wavfile
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False
    print('scipy not available; install with: pip install scipy', file=sys.stderr)
    sys.exit(1)

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
VITE_NODE   = os.path.join(SCRIPT_DIR, 'node_modules/.bin/vite-node')
RENDER_TS   = os.path.join(SCRIPT_DIR, 'render_spli.ts')
TIMIDITY    = 'timidity'

# Typical MIDI note per GM program as used in the Oxygène Pt. IV score.
# Keys are the 'gm' argument string (e.g. '36', 'drum:54').
# Used as the --note default when the GM program is recognised.
SCORE_NOTES = {
    '36':      36,   # Fretless Bass (bass voice)      → C2
    '108':     60,   # Koto (kalimba voice)            → C4
    '64':      67,   # Synth Brass 2 (synbrass)        → G4
    '52':      51,   # Synth Strings 2 (strings)       → Eb3
    '49':      67,   # String Ensemble 1 (ensemble)    → G4
    '93':      60,   # Bowed Glass (bowedpad)          → C4
    '25':      55,   # Nylon Guitar (melody)           → G3
    'drum:54': 60,   # Tambourine (noise — pitch irrelevant)
    '123':     60,   # Sea Shore (noise — pitch irrelevant)
}

# ---------------------------------------------------------------------------
# MIDI generation (no external dependency — raw bytes)
# ---------------------------------------------------------------------------
def _var_len(n):
    result = [n & 0x7F]
    n >>= 7
    while n:
        result.insert(0, (n & 0x7F) | 0x80)
        n >>= 7
    return bytes(result)

def make_midi(program, midi_note, velocity, duration_s, damp_s=2.0,
              is_drum=False, tpq=480):
    """Single-note MIDI file (format 0). damp_s adds silence after note-off
    so TiMidity captures the release tail."""
    tempo     = 500_000          # 120 BPM = 0.5s per quarter
    spq       = tempo / 1_000_000  # seconds per quarter note
    def ticks(secs): return int(round(secs / spq * tpq))
    channel   = 9 if is_drum else 0

    events = []
    events.append((0, bytes([0xFF, 0x51, 0x03]) + struct.pack('>I', tempo)[1:]))
    if not is_drum:
        events.append((0, bytes([0xC0 | channel, program & 0x7F])))
    events.append((0,              bytes([0x90 | channel, midi_note, velocity])))
    events.append((ticks(duration_s), bytes([0x80 | channel, midi_note, 0])))
    events.append((ticks(damp_s),  bytes([0xFF, 0x2F, 0x00])))   # end of track

    track_data = b''.join(_var_len(d) + e for d, e in events)
    header = b'MThd' + struct.pack('>IHHH', 6, 0, 1, tpq)
    track  = b'MTrk' + struct.pack('>I', len(track_data)) + track_data
    return header + track

# ---------------------------------------------------------------------------
# Audio analysis
# ---------------------------------------------------------------------------
def load_mono_f32(path):
    sr, data = wavfile.read(path)
    # normalise BEFORE channel reduction: numpy.mean() on int16 returns float64
    # without dividing, making all subsequent dB calculations wrong.
    dtype = data.dtype
    if dtype == np.uint8:
        data = (data.astype(np.float32) - 128.0) / 128.0
    elif dtype == np.int16:
        data = data.astype(np.float32) / 32768.0
    elif dtype == np.int32:
        data = data.astype(np.float32) / 2**31
    else:
        data = data.astype(np.float32)   # float32/float64 WAV already in [-1,1]
    if data.ndim == 2:
        data = data.mean(axis=1)
    return sr, data

def rms_windows(signal, sr, win_s=0.05):
    w = max(1, int(win_s * sr))
    n = len(signal) // w
    times = np.arange(n) * win_s + win_s / 2
    rms   = np.array([np.sqrt(np.mean(signal[i*w:(i+1)*w]**2)) for i in range(n)])
    return times, rms

def to_db(x, floor=-80.0):
    with np.errstate(divide='ignore'):
        return np.where(x > 0, 20 * np.log10(np.maximum(x, 1e-10)), floor)

def lin_to_rdfs(lin_ratio):
    if lin_ratio <= 0: return 0.0
    return float(np.clip(100.0 * (1.0 + np.log10(lin_ratio) / 5.0), 0, 100))

def spectral_profile(signal, sr, f0, n_harmonics, t_start_s, win_samples=4096):
    """FFT centred on t_start_s; returns list of (h, freq_hz, rdfs)."""
    start = int(t_start_s * sr)
    seg = signal[start:start + win_samples]
    if len(seg) < win_samples:
        seg = np.pad(seg, (0, win_samples - len(seg)))
    N  = len(seg)
    sp = np.abs(np.fft.rfft(seg * np.hanning(N)))
    bw = sr / N

    def peak_at(freq):
        cb = freq / bw
        lo = max(0, int(cb) - 4)
        hi = min(len(sp) - 1, int(cb) + 4)
        return float(np.max(sp[lo:hi+1]))

    h1 = peak_at(f0)
    results = []
    for h in range(1, n_harmonics + 1):
        freq = f0 * h
        if freq >= sr / 2:
            break
        amp = peak_at(freq)
        results.append((h, freq, lin_to_rdfs(amp / h1) if h1 > 0 else 0.0))
    return results

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('sf2',         help='Path to SF2 soundfont file')
    ap.add_argument('gm',          help='GM program 1-based, or drum:NOTE')
    ap.add_argument('--spli',      required=True, help='.spli file to compare')
    ap.add_argument('--note',      type=int,   default=None,
                    help='MIDI note (default: score-typical note per GM program, else 60=C4)')
    ap.add_argument('--duration',  type=float, default=3.0,  help='Note-on duration (s)')
    ap.add_argument('--damp',      type=float, default=2.0,  help='Release tail (s)')
    ap.add_argument('--velocity',  type=int,   default=80,   help='MIDI velocity')
    ap.add_argument('--harmonics', type=int,   default=16,   help='Harmonics to compare')
    ap.add_argument('--mid-time',  type=float, default=None, help='Time for spectrum snapshot (s)')
    args = ap.parse_args()

    is_drum = args.gm.startswith('drum:')
    if is_drum:
        drum_note = int(args.gm[5:])
        program   = 0
        midi_note = drum_note
        label     = f'drum:{drum_note}'
    else:
        gm        = int(args.gm)
        program   = gm - 1
        label     = f'GM{gm}'

    # Resolve note: explicit arg → lookup by GM → fallback 60
    if args.note is not None:
        note = args.note
    else:
        note = SCORE_NOTES.get(args.gm, 60)

    if not is_drum:
        midi_note = note

    freq_hz  = 440.0 * 2 ** ((note - 69) / 12)
    mid_time = args.mid_time if args.mid_time is not None else args.duration / 2

    with tempfile.TemporaryDirectory() as tmp:
        midi_path = os.path.join(tmp, 'note.mid')
        ref_path  = os.path.join(tmp, 'reference.wav')
        spl_path  = os.path.join(tmp, 'sompyler.wav')

        # --- MIDI ---
        midi_bytes = make_midi(program, midi_note, args.velocity,
                               args.duration, args.damp, is_drum)
        with open(midi_path, 'wb') as f:
            f.write(midi_bytes)

        # --- TiMidity ---
        print(f'[timidity] {label}  note={midi_note}  vel={args.velocity}'
              f'  dur={args.duration}s …', file=sys.stderr)
        cmd = [TIMIDITY, '-Ow', '-o', ref_path,
               '-x', f'soundfont {args.sf2}',
               midi_path]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0 or not os.path.exists(ref_path):
            print(f'TiMidity failed:\n{r.stderr}', file=sys.stderr)
            sys.exit(1)

        # --- sompyler ---
        print(f'[sompyler] {args.spli}  freq={freq_hz:.1f}Hz …', file=sys.stderr)
        cmd = [VITE_NODE, RENDER_TS,
               args.spli, str(freq_hz), str(args.duration), spl_path, '0']
        r = subprocess.run(cmd, capture_output=True, text=True, cwd=SCRIPT_DIR)
        if r.returncode != 0 or not os.path.exists(spl_path):
            print(f'render_spli failed:\n{r.stderr}\n{r.stdout}', file=sys.stderr)
            sys.exit(1)

        ref_sr, ref = load_mono_f32(ref_path)
        spl_sr, spl = load_mono_f32(spl_path)

        # ================================================================
        # Report
        # ================================================================
        sep = '=' * 66
        print(f'\n{sep}')
        print(f'  {label}  note={midi_note} ({freq_hz:.1f} Hz)'
              f'  dur={args.duration}s  vel={args.velocity}')
        print(f'  TiMidity : {len(ref)/ref_sr:.2f}s @ {ref_sr} Hz   peak={to_db(np.max(np.abs(ref))):.1f} dBFS')
        print(f'  Sompyler : {len(spl)/spl_sr:.2f}s @ {spl_sr} Hz   peak={to_db(np.max(np.abs(spl))):.1f} dBFS')
        print(sep)

        # --- Envelope ---
        print('\nENVELOPE  (RMS dB, 50ms windows)  [diff > 3 dB flagged]\n')
        print(f'  {"t(s)":>5}  {"TiMidity":>9}  {"Sompyler":>9}  {"diff":>6}')
        print(f'  {"-"*5}  {"-"*9}  {"-"*9}  {"-"*6}')

        ref_t, ref_rms = rms_windows(ref, ref_sr)
        spl_t, spl_rms = rms_windows(spl, spl_sr)

        checkpoints = [0.05, 0.10, 0.20, 0.50, 1.00, 1.50, 2.00, 2.50, 3.00,
                       args.duration, args.duration + 0.5, args.duration + 1.5]
        checkpoints = sorted(set(
            t for t in checkpoints
            if t <= args.duration + args.damp - 0.05
        ))

        for t in checkpoints:
            def rms_at(times, rms, t):
                idx = np.searchsorted(times, t)
                return rms[min(idx, len(rms)-1)] if len(rms) > 0 else 0.0
            rd = to_db(rms_at(ref_t, ref_rms, t))
            sd = to_db(rms_at(spl_t, spl_rms, t))
            diff = sd - rd
            flag = ''
            if t == args.duration:
                flag = '  ← note off'
            elif abs(diff) > 3:
                flag = f'  ← {diff:+.0f} dB'
            print(f'  {t:>5.2f}  {rd:>9.1f}  {sd:>9.1f}  {diff:>+6.1f}{flag}')

        # --- Spectrum ---
        safe_t = max(0, min(mid_time, args.duration - 0.2))
        print(f'\nSPECTRUM  at t={safe_t:.2f}s  (RDFS, H1 normalised to 100)'
              f'  [|diff| > 5 flagged]\n')
        print(f'  {"H":>3}  {"freq(Hz)":>8}  {"TiMidity":>9}  {"Sompyler":>9}  {"diff":>6}')
        print(f'  {"-"*3}  {"-"*8}  {"-"*9}  {"-"*9}  {"-"*6}')

        ref_profile = spectral_profile(ref, ref_sr, freq_hz, args.harmonics, safe_t)
        spl_profile = spectral_profile(spl, spl_sr, freq_hz, args.harmonics, safe_t)

        for (h, freq, r_rdfs), (_, _, s_rdfs) in zip(ref_profile, spl_profile):
            diff = s_rdfs - r_rdfs
            flag = ''
            if abs(diff) > 5:
                dir_ = 'high' if diff > 0 else 'low'
                flag = f'  ← PROFILE[H{h}] {abs(diff):.0f} RDFS too {dir_}'
            print(f'  {h:>3}  {freq:>8.1f}  {r_rdfs:>9.1f}  {s_rdfs:>9.1f}  {diff:>+6.1f}{flag}')

        print()

if __name__ == '__main__':
    main()
