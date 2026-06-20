#!/usr/bin/env python3
"""
compare-spectra.py — compare two WAV files spectrally (SF2 reference vs Sompyler render).

Usage:
  python3 scripts/compare-spectra.py <reference.wav> <sompyler.wav> [fundamental_hz]

Output:
  - Detected harmonics in both files
  - Per-harmonic amplitude difference (dB)
  - Attack/release envelope comparison
  - Suggested Sompyler partials list

The fundamental is auto-detected if not provided (highest-amplitude FFT peak
below 2000 Hz). Analysis uses the steady-state window (20%–80% of note length)
to avoid transient contamination.
"""

import sys
import wave
import struct
import math
import numpy as np

# ─── WAV loader ──────────────────────────────────────────────────────────────

def read_wav_mono(path: str) -> tuple[np.ndarray, int]:
    """Return (float32 samples [-1,1], sample_rate). Mixes stereo to mono."""
    with wave.open(path) as w:
        nch = w.getnchannels()
        sr  = w.getframerate()
        sw  = w.getsampwidth()
        raw = w.readframes(w.getnframes())
    fmt = {1: 'b', 2: '<h', 4: '<i'}[sw]
    peak = 2 ** (sw * 8 - 1)
    arr = np.frombuffer(raw, dtype=np.dtype(fmt)).astype(np.float32) / peak
    if nch == 2:
        arr = arr[0::2] * 0.5 + arr[1::2] * 0.5
    return arr, sr

# ─── Spectral analysis ───────────────────────────────────────────────────────

def steady_state(arr: np.ndarray, start=0.2, end=0.8) -> np.ndarray:
    n = len(arr)
    return arr[int(n * start):int(n * end)]

def fft_peaks(arr: np.ndarray, sr: int, fundamental: float, max_harmonics=16
              ) -> list[tuple[int, float, float]]:
    """
    Return list of (harmonic_number, freq_hz, amplitude_linear) for each
    harmonic that is detectable. Searches ±5% around each expected harmonic.
    """
    window = np.hanning(len(arr))
    spectrum = np.abs(np.fft.rfft(arr * window))
    freqs = np.fft.rfftfreq(len(arr), d=1/sr)
    spectrum /= spectrum.max() if spectrum.max() > 0 else 1

    results = []
    for h in range(1, max_harmonics + 1):
        target = fundamental * h
        if target > sr / 2: break
        lo = target * 0.95
        hi = target * 1.05
        mask = (freqs >= lo) & (freqs <= hi)
        if not mask.any(): continue
        idx = np.argmax(spectrum[mask])
        amp = spectrum[mask][idx]
        freq = freqs[mask][idx]
        results.append((h, float(freq), float(amp)))
    return results

def detect_fundamental(arr: np.ndarray, sr: int) -> float:
    """Find dominant frequency below 2000 Hz via FFT peak."""
    window = np.hanning(len(arr))
    spectrum = np.abs(np.fft.rfft(arr * window))
    freqs = np.fft.rfftfreq(len(arr), d=1/sr)
    mask = freqs < 2000
    idx = np.argmax(spectrum[mask])
    return float(freqs[mask][idx])

def envelope_rms(arr: np.ndarray, sr: int, block_ms=10) -> np.ndarray:
    """RMS energy in successive blocks, in dBFS."""
    block = max(1, int(sr * block_ms / 1000))
    n_blocks = len(arr) // block
    rms = np.array([
        np.sqrt(np.mean(arr[i*block:(i+1)*block]**2)) + 1e-9
        for i in range(n_blocks)
    ])
    return 20 * np.log10(rms)

def detect_attack_release(env_db: np.ndarray, block_ms=10):
    """Crude ADSR: return (attack_ms, release_ms) from dB envelope."""
    peak_idx = int(np.argmax(env_db))
    peak_val = env_db[peak_idx]
    threshold = peak_val - 40  # -40 dB from peak

    attack_ms = 0
    for i in range(peak_idx):
        if env_db[i] >= threshold:
            attack_ms = i * block_ms
            break

    release_ms = 0
    for i in range(len(env_db) - 1, peak_idx, -1):
        if env_db[i] >= threshold:
            release_ms = (len(env_db) - i) * block_ms
            break

    return attack_ms, release_ms

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__); sys.exit(1)

    ref_path, syn_path = args[0], args[1]
    user_fund = float(args[2]) if len(args) > 2 else None

    ref, sr_ref = read_wav_mono(ref_path)
    syn, sr_syn = read_wav_mono(syn_path)

    if sr_ref != sr_syn:
        print(f"⚠  Sample rate mismatch: ref={sr_ref} syn={sr_syn}")

    sr = sr_ref
    ref_ss = steady_state(ref)
    syn_ss = steady_state(syn)

    fund = user_fund or detect_fundamental(ref_ss, sr)
    print(f"Fundamental: {fund:.1f} Hz\n")

    ref_peaks = fft_peaks(ref_ss, sr, fund)
    syn_peaks = fft_peaks(syn_ss, sr, fund)

    # Index by harmonic number
    ref_map = {h: a for h, _, a in ref_peaks}
    syn_map = {h: a for h, _, a in syn_peaks}

    all_h = sorted(set(ref_map) | set(syn_map))

    print(f"{'H':>3}  {'Freq':>8}  {'SF2 (dB)':>10}  {'Sompyler':>10}  {'Δ dB':>8}")
    print("─" * 50)

    partials_suggestion = []
    for h in all_h:
        r = ref_map.get(h, 0.0)
        s = syn_map.get(h, 0.0)
        r_db = 20 * math.log10(r + 1e-9)
        s_db = 20 * math.log10(s + 1e-9)
        diff  = s_db - r_db
        freq = fund * h
        flag = " ◄ TWEAK" if abs(diff) > 3 else ""
        print(f"{h:>3}  {freq:>8.1f}  {r_db:>+10.1f}  {s_db:>+10.1f}  {diff:>+8.1f}{flag}")
        if r > 0.005:
            partials_suggestion.append((h, r))

    # Envelope comparison
    ref_env = envelope_rms(ref, sr)
    syn_env = envelope_rms(syn, sr)
    ref_atk, ref_rel = detect_attack_release(ref_env)
    syn_atk, syn_rel = detect_attack_release(syn_env)

    print(f"\nEnvelope (approximate):")
    print(f"  Attack:  SF2 {ref_atk:4d} ms   Sompyler {syn_atk:4d} ms")
    print(f"  Release: SF2 {ref_rel:4d} ms   Sompyler {syn_rel:4d} ms")

    # Suggest partials normalised to fundamental = 1.0
    if partials_suggestion:
        norm = partials_suggestion[0][1]
        print(f"\nSuggested partials (from SF2 amplitudes, freqMult 1–{partials_suggestion[-1][0]}):")
        print("  partials:")
        for h, a in partials_suggestion:
            print(f"    - {{ freqMult: {h}, amp: {a/norm:.3f} }}")

if __name__ == '__main__':
    main()
