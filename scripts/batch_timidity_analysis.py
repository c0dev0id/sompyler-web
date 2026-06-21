#!/usr/bin/env python3
"""
Batch TiMidity spectral analysis for Oxygène instruments.

Generates a TiMidity WAV for each instrument at its most-common score note,
finds the steady-state sustain window adaptively, and reports harmonics down
to -90 dBFS (the 16-bit quantisation floor is ≈ -96 dBFS).

Usage:
  python3 scripts/batch_timidity_analysis.py

Output: one block per instrument showing the compare-spectra-style table plus
a ready-to-paste sompyler `partials:` block.
"""
import struct, subprocess, sys, os, tempfile, math
import numpy as np

# ── MIDI helpers ──────────────────────────────────────────────────────────────

def vlq(value: int) -> bytes:
    result = [value & 0x7F]
    value >>= 7
    while value:
        result.append((value & 0x7F) | 0x80)
        value >>= 7
    return bytes(reversed(result))


def make_midi_melodic(program: int, note: int, velocity: int,
                      duration_ticks: int, tpq: int = 480) -> bytes:
    """Format-0 MIDI, channel 0, melodic."""
    tempo = 500000
    events = bytearray()
    events += vlq(0) + b'\xff\x51\x03' + struct.pack('>I', tempo)[1:]
    events += vlq(0) + bytes([0xC0, program & 0x7F])
    events += vlq(0) + bytes([0x90, note & 0x7F, velocity & 0x7F])
    events += vlq(duration_ticks) + bytes([0x80, note & 0x7F, 0x00])
    events += vlq(0) + b'\xff\x2f\x00'
    track = bytes(events)
    header = b'MThd' + struct.pack('>IHHH', 6, 0, 1, tpq)
    chunk  = b'MTrk' + struct.pack('>I', len(track)) + track
    return header + chunk


def make_midi_percussion(note: int, velocity: int,
                         duration_ticks: int, tpq: int = 480) -> bytes:
    """Format-0 MIDI, channel 9 (MIDI percussion channel)."""
    tempo = 500000
    events = bytearray()
    events += vlq(0) + b'\xff\x51\x03' + struct.pack('>I', tempo)[1:]
    events += vlq(0) + bytes([0x99, note & 0x7F, velocity & 0x7F])   # ch9 note on
    events += vlq(duration_ticks) + bytes([0x89, note & 0x7F, 0x00]) # ch9 note off
    events += vlq(0) + b'\xff\x2f\x00'
    track = bytes(events)
    header = b'MThd' + struct.pack('>IHHH', 6, 0, 1, tpq)
    chunk  = b'MTrk' + struct.pack('>I', len(track)) + track
    return header + chunk


# ── WAV rendering ─────────────────────────────────────────────────────────────

def render_timidity(midi_data: bytes, out_wav: str) -> bool:
    with tempfile.NamedTemporaryFile(suffix='.mid', delete=False) as f:
        f.write(midi_data)
        mid = f.name
    try:
        r = subprocess.run(
            ['timidity', '-Ow', '--output-mono', '-o', out_wav, mid],
            capture_output=True, text=True,
        )
        if r.returncode != 0:
            print(f'  TiMidity error: {r.stderr.strip()}', file=sys.stderr)
            return False
        return True
    finally:
        os.unlink(mid)


def load_wav_mono(path: str):
    """Return (float32 samples, sample_rate)."""
    with open(path, 'rb') as f:
        data = f.read()
    sr = struct.unpack_from('<I', data, 24)[0]
    off = 12
    while off < len(data) - 8:
        tag = data[off:off+4]
        sz  = struct.unpack_from('<I', data, off+4)[0]
        if tag == b'data':
            raw = data[off+8 : off+8+sz]
            samples = np.frombuffer(raw, dtype='<i2').astype(np.float64) / 32768.0
            return samples, sr
        off += 8 + sz
    raise RuntimeError('No data chunk in WAV')


# ── Spectral analysis ─────────────────────────────────────────────────────────

def find_sustain_window(samples, sr, note_duration_s):
    """
    Adaptively locate the steady-state portion of the signal.

    Strategy:
      1. Compute RMS in 20ms blocks.
      2. Find peak block.
      3. Walk forward from peak until RMS has dropped by > 6 dB (not a pure
         sustain) OR we exceed note_duration - 0.2s (end of note).
      4. The window is [peak + 0.1s, chosen_end].
      If no valid sustain is found (decaying instrument), fall back to
      the 25%–60% region of the note (attack gone, pre-release).
    """
    block = max(1, int(0.020 * sr))
    n_blocks = len(samples) // block
    rms = np.array([
        np.sqrt(np.mean(samples[i*block:(i+1)*block]**2)) + 1e-12
        for i in range(n_blocks)
    ])
    peak_idx = int(np.argmax(rms))
    peak_rms = rms[peak_idx]

    note_end_block = min(n_blocks - 1, int(note_duration_s * sr / block))

    # Walk forward from peak looking for sustain plateau (< 2 dB drop over 0.5s)
    sustain_end = peak_idx
    for i in range(peak_idx, note_end_block):
        if rms[i] >= peak_rms * 0.5:   # still within 6 dB of peak
            sustain_end = i
        else:
            break

    sustain_start = min(peak_idx + int(0.1 * sr / block), sustain_end - 1)

    if sustain_end - sustain_start < int(0.2 * sr / block):
        # Decaying instrument: use 25%–60% of note
        note_samples = int(note_duration_s * sr)
        a = int(note_samples * 0.25)
        b = int(note_samples * 0.60)
        return max(0, a), min(len(samples), b), False

    a = sustain_start * block
    b = sustain_end   * block
    return a, b, True


def spectral_harmonics(samples, sr, fund_hz, max_h=20, db_floor=-90.0):
    """
    FFT the samples and extract amplitude at each harmonic of fund_hz.
    Returns list of (h, freq_hz, amplitude_linear, db_rel_h1) for all
    harmonics above db_floor relative to H1.
    """
    w = np.hanning(len(samples))
    fft = np.abs(np.fft.rfft(samples * w)) * 2 / np.sum(w)
    freqs = np.fft.rfftfreq(len(samples), 1.0 / sr)

    def peak_near(hz, tol=0.04):
        lo = int(hz * (1 - tol) * len(samples) / sr)
        hi = int(hz * (1 + tol) * len(samples) / sr)
        lo = max(0, lo); hi = min(len(fft) - 1, hi)
        if lo > hi:
            return 0.0, hz
        idx = lo + int(np.argmax(fft[lo:hi+1]))
        return float(fft[idx]), float(freqs[idx])

    h1_amp, h1_freq = peak_near(fund_hz)
    if h1_amp <= 0:
        return []

    results = [(1, h1_freq, h1_amp, 0.0)]
    for h in range(2, max_h + 1):
        if fund_hz * h > sr / 2:
            break
        amp, freq = peak_near(fund_hz * h)
        db = 20.0 * math.log10(amp / h1_amp) if amp > 0 else -999.0
        if db >= db_floor:
            results.append((h, freq, amp, db))

    return results


def detect_fund(samples, sr, hint_hz=None, search_max=2000):
    """Find dominant frequency below search_max Hz."""
    w = np.hanning(len(samples))
    fft = np.abs(np.fft.rfft(samples * w))
    freqs = np.fft.rfftfreq(len(samples), 1.0 / sr)
    mask = freqs < search_max
    idx = int(np.argmax(fft[mask]))
    return float(freqs[mask][idx])


def spectral_noise_profile(samples, sr):
    """
    For noise instruments: report spectral centroid and rolloff.
    """
    w = np.hanning(len(samples))
    fft = np.abs(np.fft.rfft(samples * w)) ** 2
    freqs = np.fft.rfftfreq(len(samples), 1.0 / sr)
    total = np.sum(fft) + 1e-12
    centroid = float(np.sum(freqs * fft) / total)
    cumsum = np.cumsum(fft)
    rolloff95 = float(freqs[np.searchsorted(cumsum, 0.95 * total)])
    return centroid, rolloff95


# ── Per-instrument configuration ──────────────────────────────────────────────

INSTRUMENTS = [
    # (label, gm_program_0indexed, midi_note, note_duration_s, is_percussion, note_name, const_name)
    ('bass',       35,  36, 3.0, False, 'C2',  'OXYGENE_BASS'),
    ('synbrass',   63,  60, 3.0, False, 'C4',  'OXYGENE_SYNBRASS'),
    ('strings',    51,  48, 5.0, False, 'C3',  'OXYGENE_STRINGS'),
    ('ensemble',   48,  60, 5.0, False, 'C4',  'OXYGENE_ENSEMBLE'),
    ('bowedpad',   92,  60, 6.0, False, 'C4',  'OXYGENE_BOWEDPAD'),
    ('melody',     24,  55, 3.0, False, 'G3',  'OXYGENE_MELODY'),
    ('tambourine', 54,  54, 1.5, True,  'p54', 'OXYGENE_TAMBOURINE'),
    ('seashore',   122, 60, 6.0, False, 'C4',  'OXYGENE_SEASHORE'),
]

NOISE_INSTRUMENTS = {'tambourine', 'seashore'}


def analyse_instrument(label, program, note, duration_s, is_percussion,
                       note_name, const_name, out_dir):
    print(f'\n{"=" * 60}')
    print(f'  {const_name}  ({note_name}, GM{program+1 if not is_percussion else "perc"+str(note)})')
    print(f'{"=" * 60}')

    tpq = 480
    bpm = 120
    ticks = int(duration_s * bpm / 60 * tpq)

    if is_percussion:
        midi = make_midi_percussion(note, 100, ticks, tpq)
    else:
        midi = make_midi_melodic(program, note, 100, ticks, tpq)

    wav_path = os.path.join(out_dir, f'{label}.wav')
    print(f'  Rendering via TiMidity → {wav_path} ...', end=' ', flush=True)
    ok = render_timidity(midi, wav_path)
    if not ok:
        print('FAILED')
        return
    print('done')

    samples, sr = load_wav_mono(wav_path)
    total_dur = len(samples) / sr
    print(f'  Output: {total_dur:.2f}s  ({len(samples)} samples @ {sr} Hz)')

    # Envelope overview
    block = max(1, int(0.05 * sr))
    rms_env = [np.sqrt(np.mean(samples[i*block:(i+1)*block]**2))
               for i in range(len(samples) // block)]
    peak_rms = max(rms_env) if rms_env else 0.0
    peak_t = rms_env.index(peak_rms) * 0.05 if rms_env else 0.0
    # find -40dB point from end
    thresh = peak_rms * 0.01
    last_above = 0
    for i, r in enumerate(rms_env):
        if r >= thresh:
            last_above = i
    release_s = total_dur - last_above * 0.05
    print(f'  Envelope: peak at {peak_t:.2f}s  |  last −40dB: {last_above*0.05:.2f}s  |  tail: {release_s:.2f}s')

    if label in NOISE_INSTRUMENTS:
        # Noise instrument: just report spectral shape
        a, b, _ = find_sustain_window(samples, sr, duration_s)
        window = samples[a:b]
        if len(window) > 256:
            centroid, rolloff = spectral_noise_profile(window, sr)
            print(f'  Noise: centroid={centroid:.0f} Hz  rolloff95={rolloff:.0f} Hz')
        print('  → Noise instrument; no harmonic partials to extract.')
        return

    # Find sustain window
    a, b, is_sustain = find_sustain_window(samples, sr, duration_s)
    win_dur = (b - a) / sr
    print(f'  Sustain window: {a/sr:.2f}s – {b/sr:.2f}s  ({win_dur:.2f}s)  '
          f'[{"plateau" if is_sustain else "fallback 25-60%"}]')

    window = samples[a:b]
    if len(window) < 256:
        print('  Window too short for FFT, skipping.')
        return

    # Detect fundamental
    fund = detect_fund(window, sr)
    print(f'  Detected fundamental: {fund:.2f} Hz')

    # Extract harmonics
    harmonics = spectral_harmonics(window, sr, fund, max_h=24, db_floor=-90.0)
    if not harmonics:
        print('  No harmonics found.')
        return

    h1_amp = harmonics[0][2]

    print()
    print(f'  {"H":>3}  {"Freq":>8}  {"Amp":>10}  {"dB rel H1":>10}')
    print(f'  {"─"*3}  {"─"*8}  {"─"*10}  {"─"*10}')
    for h, freq, amp, db in harmonics:
        print(f'  H{h:>2}  {freq:>8.1f}  {amp/h1_amp:>10.5f}  {db:>+10.1f} dB')

    # Suggested partials block (all above -90 dB, rounded to 4 sig figs)
    print()
    print(f'  Suggested partials:')
    print(f'  partials:')
    for h, freq, amp, db in harmonics:
        rel = amp / h1_amp
        # Round to 4 significant figures
        if rel >= 0.01:
            fmt = f'{rel:.3f}'
        elif rel >= 0.001:
            fmt = f'{rel:.4f}'
        else:
            fmt = f'{rel:.5f}'
        print(f'    - {{ freqMult: {h:<2}, amp: {fmt} }}')


def main():
    out_dir = 'src/conformance/fixtures'
    os.makedirs(out_dir, exist_ok=True)

    for args in INSTRUMENTS:
        analyse_instrument(*args, out_dir=out_dir)

    print(f'\n{"=" * 60}')
    print('Done.')


if __name__ == '__main__':
    main()
