#!/usr/bin/env python3
"""
refine_instrument.py — orchestrator for the sompyler_refine_instrument skill.

Drives the mechanical part of an iteration cycle:

  1. Look up the reference pitch from the first in-project score that uses
     the instrument (voice mapping → first non-`false` bar entry).
  2. Materialise samples/<inst>/<pitch>-sompyler.spli from src/defaults.ts
     unless it already exists (so iterations accumulate).
  3. Extract the soundfont mapping (GM program or drum note) from the first
     comment line of the .spli body.
  4. Render samples/<inst>/<pitch>-timidity.wav with FluidR3_GM2.sf2 unless
     present.
  5. Render samples/<inst>/<pitch>-sompyler.wav via render_spli.ts.
  6. Print an envelope + spectrum diff report. Claude reads the report and
     decides on the next ONE-parameter change.

Usage:
  python3 scripts/refine_instrument.py <instrument-name> [--rerender-only]

  --rerender-only   skip TiMidity (kept from a prior run); re-render Sompyler
                    and reprint the diff. Use after editing the .spli file.

Exit codes:
  0  success
  1  setup / IO error
  2  instrument not found in any in-project score
"""
from __future__ import annotations
import argparse, json, os, re, struct, subprocess, sys
from pathlib import Path

import numpy as np
import scipy.io.wavfile as wavfile
import yaml

# ---------------------------------------------------------------------------
# Paths and constants
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULTS_TS  = PROJECT_ROOT / 'src' / 'defaults.ts'
RENDER_TS    = PROJECT_ROOT / 'render_spli.ts'
VITE_NODE    = PROJECT_ROOT / 'node_modules' / '.bin' / 'vite-node'
SAMPLES_ROOT = PROJECT_ROOT / 'samples'
SOUNDFONT    = Path(os.environ.get(
    'SOMPYLER_SOUNDFONT',
    str(Path.home() / 'soundfonts' / 'FluidR3_GM2.sf2')
))

SAMPLE_RATE  = 44100
NOTE_INDEX = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}

# ---------------------------------------------------------------------------
# defaults.ts seed extraction
# ---------------------------------------------------------------------------
_SEED_RX  = re.compile(
    r"\{\s*name:\s*'([^']+)'\s*,\s*ext:\s*'([^']+)'\s*,\s*body:\s*(\w+)\s*,"
    r"\s*inProject:\s*(true|false)\s*\}"
)

def load_seeds() -> list[dict]:
    """Return [{name, ext, var, in_project, body}] for every seed in defaults.ts."""
    text = DEFAULTS_TS.read_text()
    seeds: list[dict] = []
    for m in _SEED_RX.finditer(text):
        name, ext, var, in_project = m.group(1), m.group(2), m.group(3), m.group(4) == 'true'
        body_rx = re.compile(
            rf"^(?:export\s+)?const\s+{re.escape(var)}\s*=\s*`(.*?)`\s*$",
            re.DOTALL | re.MULTILINE,
        )
        bm = body_rx.search(text)
        if not bm:
            raise RuntimeError(f"defaults.ts: body for {var} not found")
        seeds.append(dict(name=name, ext=ext, var=var, in_project=in_project, body=bm.group(1)))
    return seeds


# ---------------------------------------------------------------------------
# Score → first-pitch lookup
# ---------------------------------------------------------------------------
def pitch_to_midi(pitch: str) -> int:
    m = re.match(r"^([A-Ga-g])([#b]?)(-?\d+)$", pitch)
    if not m:
        raise ValueError(f"bad pitch token {pitch!r}")
    name, acc, oct_ = m.group(1).upper(), m.group(2), int(m.group(3))
    idx = NOTE_INDEX[name] + (1 if acc == '#' else -1 if acc == 'b' else 0)
    return (oct_ + 1) * 12 + idx


def _first_pitch_token(value) -> str | None:
    """Pull the first '<note><octave>' substring out of a dict-bar or chain string."""
    if value is False or value is None:
        return None
    if isinstance(value, dict):
        if not value:
            return None
        # smallest tick number
        try:
            key = min(value.keys(), key=lambda k: int(k))
        except (TypeError, ValueError):
            return None
        return _first_pitch_token(value[key])
    if isinstance(value, str):
        head = value.split(';', 1)[0].strip()    # first parallel subchain
        head = head.split()[0] if head else ''   # first token
        m = re.match(r"^([A-Ga-g][#b]?-?\d+)", head)
        return m.group(1) if m else None
    return None


def find_first_use(instrument_name: str, seeds: list[dict]) -> tuple[str, str, str]:
    """
    Return (score_name, voice_name, pitch_token) for the first in-project
    score that references the instrument.
    """
    for seed in seeds:
        if seed['ext'] != 'spls' or not seed['in_project']:
            continue
        try:
            docs = list(yaml.safe_load_all(seed['body']))
        except yaml.YAMLError as e:
            print(f"warning: {seed['name']}.spls: {e}", file=sys.stderr)
            continue
        if not docs:
            continue
        header = docs[0] or {}
        stage  = header.get('stage') or {}
        # stage entry: "<pos> <pan> <instrument>"
        voice = None
        for vname, line in stage.items():
            if not isinstance(line, str):
                continue
            parts = line.split()
            if parts and parts[-1] == instrument_name:
                voice = vname
                break
        if not voice:
            continue
        for bar in docs[1:]:
            if not isinstance(bar, dict) or voice not in bar:
                continue
            pitch = _first_pitch_token(bar[voice])
            if pitch:
                return seed['name'], voice, pitch
    raise LookupError(
        f"instrument {instrument_name!r} not found (or never played) "
        f"in any in-project .spls"
    )


# ---------------------------------------------------------------------------
# .spli comment → soundfont mapping
# ---------------------------------------------------------------------------
def extract_sf_mapping(spli_body: str) -> tuple[str, int]:
    """
    Return ('melodic', gm_1based) or ('drum', drum_note).
    Raise if the first-line comment doesn't carry a recognised tag.
    """
    first = spli_body.lstrip().splitlines()[0] if spli_body.strip() else ''
    m = re.search(r"\bGM(\d+)\b", first)
    if m:
        return 'melodic', int(m.group(1))
    m = re.search(r"bank=128\s+note=(\d+)", first)
    if m:
        return 'drum', int(m.group(1))
    raise ValueError(
        "first comment line lacks (GM<N> / ...) or (bank=128 note=<N> / ...) tag"
    )


# ---------------------------------------------------------------------------
# MIDI synthesis (single-note Format-0 file)
# ---------------------------------------------------------------------------
def _vlq(n: int) -> bytes:
    out = [n & 0x7F]
    n >>= 7
    while n:
        out.insert(0, (n & 0x7F) | 0x80)
        n >>= 7
    return bytes(out)


def make_midi(program: int, midi_note: int, velocity: int,
              note_on_s: float, damp_s: float, is_drum: bool,
              tpq: int = 480) -> bytes:
    tempo = 500_000
    def ticks(s): return int(round(s / (tempo / 1_000_000) * tpq))
    ch = 9 if is_drum else 0
    events: list[tuple[int, bytes]] = []
    events.append((0, b'\xff\x51\x03' + struct.pack('>I', tempo)[1:]))
    if not is_drum:
        events.append((0, bytes([0xC0 | ch, program & 0x7F])))
    events.append((0,              bytes([0x90 | ch, midi_note, velocity])))
    events.append((ticks(note_on_s), bytes([0x80 | ch, midi_note, 0])))
    events.append((ticks(damp_s),  b'\xff\x2f\x00'))
    track = b''.join(_vlq(dt) + ev for dt, ev in events)
    header = b'MThd' + struct.pack('>IHHH', 6, 0, 1, tpq)
    return header + b'MTrk' + struct.pack('>I', len(track)) + track


# ---------------------------------------------------------------------------
# Renderers
# ---------------------------------------------------------------------------
def render_timidity(sf_kind: str, sf_num: int, midi_note: int,
                    duration_s: float, damp_s: float, velocity: int,
                    out_wav: Path) -> None:
    is_drum = sf_kind == 'drum'
    program = 0 if is_drum else sf_num - 1
    note    = sf_num if is_drum else midi_note
    midi    = make_midi(program, note, velocity, duration_s, damp_s, is_drum)
    midi_path = out_wav.with_suffix('.mid')
    midi_path.write_bytes(midi)
    try:
        cmd = ['timidity', '-Ow', '--output-mono',
               '-o', str(out_wav),
               '-x', f'soundfont {SOUNDFONT}',
               str(midi_path)]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0 or not out_wav.exists():
            sys.exit(f"timidity failed:\n{r.stderr}")
    finally:
        midi_path.unlink(missing_ok=True)


def render_sompyler(spli_path: Path, freq_hz: float,
                    duration_s: float, damp_s: float,
                    out_wav: Path) -> None:
    cmd = [str(VITE_NODE), str(RENDER_TS),
           str(spli_path), f"{freq_hz}", f"{duration_s}",
           str(out_wav), f"{damp_s}"]
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=str(PROJECT_ROOT))
    if r.returncode != 0 or not out_wav.exists():
        sys.exit(f"render_spli.ts failed:\n{r.stderr}\n{r.stdout}")


# ---------------------------------------------------------------------------
# Audio analysis (mirrors compare_instrument.py)
# ---------------------------------------------------------------------------
def load_mono(path: Path) -> tuple[int, np.ndarray]:
    sr, data = wavfile.read(str(path))
    if data.dtype == np.int16:
        data = data.astype(np.float32) / 32768.0
    elif data.dtype == np.int32:
        data = data.astype(np.float32) / 2**31
    elif data.dtype == np.uint8:
        data = (data.astype(np.float32) - 128.0) / 128.0
    else:
        data = data.astype(np.float32)
    if data.ndim == 2:
        data = data.mean(axis=1)
    return sr, data


def to_db(x, floor=-80.0):
    with np.errstate(divide='ignore'):
        return np.where(x > 0, 20 * np.log10(np.maximum(x, 1e-10)), floor)


def rms_envelope(signal: np.ndarray, sr: int, win_s=0.05):
    w = max(1, int(sr * win_s))
    n = len(signal) // w
    t = np.arange(n) * win_s + win_s / 2
    rms = np.array([np.sqrt(np.mean(signal[i*w:(i+1)*w]**2)) for i in range(n)])
    return t, rms


def lin_to_rdfs(r: float) -> float:
    if r <= 0:
        return 0.0
    return float(np.clip(100.0 * (1.0 + np.log10(r) / 5.0), 0, 100))


def spectral_profile(signal: np.ndarray, sr: int, f0: float,
                     n_harm: int, t_start: float, win_samples=4096):
    start = max(0, int(t_start * sr))
    seg = signal[start:start + win_samples]
    if len(seg) < win_samples:
        seg = np.pad(seg, (0, win_samples - len(seg)))
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg))))
    bw = sr / len(seg)

    def peak_at(freq: float) -> float:
        cb = freq / bw
        lo = max(0, int(cb) - 4)
        hi = min(len(sp) - 1, int(cb) + 4)
        return float(np.max(sp[lo:hi + 1]))

    h1 = peak_at(f0) or 1e-12
    out = []
    for h in range(1, n_harm + 1):
        f = f0 * h
        if f >= sr / 2:
            break
        out.append((h, f, lin_to_rdfs(peak_at(f) / h1)))
    return out


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
def print_report(ref_wav: Path, spl_wav: Path,
                 freq_hz: float, duration_s: float, damp_s: float,
                 n_harm: int = 16) -> None:
    ref_sr, ref = load_mono(ref_wav)
    spl_sr, spl = load_mono(spl_wav)
    ref_peak_db = to_db(np.max(np.abs(ref)))
    spl_peak_db = to_db(np.max(np.abs(spl)))

    print()
    print('=' * 66)
    print(f"  ref (timidity) : {len(ref)/ref_sr:5.2f}s @ {ref_sr} Hz  "
          f"peak={ref_peak_db:+5.1f} dBFS")
    print(f"  cur (sompyler) : {len(spl)/spl_sr:5.2f}s @ {spl_sr} Hz  "
          f"peak={spl_peak_db:+5.1f} dBFS")
    peak_diff_db  = spl_peak_db - ref_peak_db
    amp_scale     = 10 ** (-peak_diff_db / 20)
    amp_advice = ''
    if abs(peak_diff_db) > 1.0:
        amp_advice = (f"   →  multiply AMP: by ~{amp_scale:.2f}  "
                      f"({'too loud' if peak_diff_db>0 else 'too quiet'} "
                      f"by {abs(peak_diff_db):.1f} dB)")
    print(f"  peak diff      : {peak_diff_db:+5.1f} dB{amp_advice}")
    print('=' * 66)

    # ── envelope ────────────────────────────────────────────────────────────
    ref_t, ref_rms = rms_envelope(ref, ref_sr)
    spl_t, spl_rms = rms_envelope(spl, spl_sr)
    ref_peak_t = float(ref_t[int(np.argmax(ref_rms))]) if len(ref_rms) else 0.0
    spl_peak_t = float(spl_t[int(np.argmax(spl_rms))]) if len(spl_rms) else 0.0

    points = [0.05, 0.10, 0.20, 0.50, 1.00, 1.50, 2.00, 2.50, 3.00,
              duration_s, duration_s + 0.5, duration_s + 1.5]
    points = sorted({t for t in points if t <= duration_s + damp_s - 0.05})

    print('\nENVELOPE   (RMS dBFS @ 50 ms windows;  |diff| > 3 dB flagged)\n')
    print(f"  ref peak @ {ref_peak_t:.3f} s     cur peak @ {spl_peak_t:.3f} s\n")
    print(f"  {'t(s)':>5}  {'ref':>7}  {'cur':>7}  {'diff':>6}")
    print(f"  {'-'*5}  {'-'*7}  {'-'*7}  {'-'*6}")
    for t in points:
        def at(ts, rs):
            i = np.searchsorted(ts, t)
            return rs[min(i, len(rs)-1)] if len(rs) else 0.0
        rd = to_db(at(ref_t, ref_rms))
        sd = to_db(at(spl_t, spl_rms))
        d  = sd - rd
        tag = '  ← note off' if t == duration_s else (f"  ← {d:+.0f} dB" if abs(d) > 3 else '')
        print(f"  {t:>5.2f}  {rd:>+7.1f}  {sd:>+7.1f}  {d:>+6.1f}{tag}")

    # ── spectrum ────────────────────────────────────────────────────────────
    # Choose mid-sustain time relative to the TiMidity peak so percussive
    # instruments with sub-second decays are sampled while still ringing.
    mid_t = max(0.0, min(ref_peak_t + 0.15, duration_s - 0.25))
    print(f"\nSPECTRUM   (RDFS at t={mid_t:.2f}s, H1=100;  |diff| > 5 flagged)\n")
    print(f"  {'H':>3}  {'freq(Hz)':>9}  {'ref':>7}  {'cur':>7}  {'diff':>6}")
    print(f"  {'-'*3}  {'-'*9}  {'-'*7}  {'-'*7}  {'-'*6}")
    ref_p = spectral_profile(ref, ref_sr, freq_hz, n_harm, mid_t)
    spl_p = spectral_profile(spl, spl_sr, freq_hz, n_harm, mid_t)
    spectrum_l1 = 0.0
    for (h, f, r), (_, _, s) in zip(ref_p, spl_p):
        d = s - r
        spectrum_l1 += abs(d)
        if abs(d) > 5:
            arrow = f"  ← PROFILE[H{h}] {'too high' if d>0 else 'too low'} by {abs(d):.0f} RDFS"
        else:
            arrow = ''
        print(f"  {h:>3}  {f:>9.1f}  {r:>+7.1f}  {s:>+7.1f}  {d:>+6.1f}{arrow}")

    # ── quality score (lower is better; track across iterations) ────────────
    env_l1 = 0.0
    for t in points:
        def at(ts, rs):
            i = np.searchsorted(ts, t)
            return rs[min(i, len(rs)-1)] if len(rs) else 0.0
        env_l1 += abs(to_db(at(spl_t, spl_rms)) - to_db(at(ref_t, ref_rms)))
    quality = spectrum_l1 + env_l1 + abs(peak_diff_db)
    print()
    print(f"QUALITY  L1={quality:.1f}   "
          f"(spectrum={spectrum_l1:.1f} RDFS, "
          f"envelope={env_l1:.1f} dB, "
          f"peak={abs(peak_diff_db):.1f} dB)   ← lower is better")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('instrument', help='Seed name (e.g. "kalimba", "filtered-bass")')
    ap.add_argument('--rerender-only', action='store_true',
                    help='Skip TiMidity; rerun Sompyler render + diff only')
    ap.add_argument('--duration', type=float, default=3.0,
                    help='Note-on duration (s)  [3.0]')
    ap.add_argument('--damp',     type=float, default=2.0,
                    help='Release tail (s)      [2.0]')
    ap.add_argument('--velocity', type=int,   default=80,
                    help='MIDI velocity 1-127   [80]')
    ap.add_argument('--harmonics',type=int,   default=16,
                    help='Harmonics to compare  [16]')
    ap.add_argument('--json',     action='store_true',
                    help='Emit machine-readable preamble for the skill driver')
    args = ap.parse_args()

    if not VITE_NODE.exists():
        sys.exit(f"vite-node not found at {VITE_NODE} — run `npm install` first")
    if not SOUNDFONT.exists():
        sys.exit(f"soundfont not found at {SOUNDFONT}")

    seeds = load_seeds()
    seed = next((s for s in seeds if s['name'] == args.instrument and s['ext'] == 'spli'), None)
    if not seed:
        sys.exit(f"no spli seed named {args.instrument!r} in defaults.ts")

    score_name, voice, pitch_tok = find_first_use(args.instrument, seeds)
    midi_note = pitch_to_midi(pitch_tok)
    freq_hz   = 440.0 * 2 ** ((midi_note - 69) / 12.0)

    work_dir  = SAMPLES_ROOT / args.instrument
    work_dir.mkdir(parents=True, exist_ok=True)
    spli_path = work_dir / f"{pitch_tok}-sompyler.spli"
    ref_wav   = work_dir / f"{pitch_tok}-timidity.wav"
    spl_wav   = work_dir / f"{pitch_tok}-sompyler.wav"

    if not spli_path.exists():
        spli_path.write_text(seed['body'])

    sf_kind, sf_num = extract_sf_mapping(spli_path.read_text())

    print(f"# instrument : {args.instrument}", file=sys.stderr)
    print(f"# score      : {score_name}.spls  (voice '{voice}')", file=sys.stderr)
    print(f"# pitch      : {pitch_tok}  MIDI {midi_note}  {freq_hz:.2f} Hz",
          file=sys.stderr)
    print(f"# soundfont  : {sf_kind} {sf_num}  ({SOUNDFONT.name})", file=sys.stderr)
    print(f"# spli       : {spli_path}", file=sys.stderr)
    print(f"# ref wav    : {ref_wav}", file=sys.stderr)
    print(f"# cur wav    : {spl_wav}", file=sys.stderr)

    if args.json:
        meta = dict(instrument=args.instrument, score=score_name, voice=voice,
                    pitch=pitch_tok, midi_note=midi_note, freq_hz=freq_hz,
                    sf_kind=sf_kind, sf_num=sf_num,
                    spli=str(spli_path), ref_wav=str(ref_wav), spl_wav=str(spl_wav))
        print('META=' + json.dumps(meta))

    if not args.rerender_only and not ref_wav.exists():
        print(f"# rendering timidity → {ref_wav.name} ...", file=sys.stderr)
        render_timidity(sf_kind, sf_num, midi_note,
                        args.duration, args.damp, args.velocity, ref_wav)
    elif not args.rerender_only:
        print(f"# reusing existing {ref_wav.name}", file=sys.stderr)

    print(f"# rendering sompyler → {spl_wav.name} ...", file=sys.stderr)
    render_sompyler(spli_path, freq_hz, args.duration, args.damp, spl_wav)

    print_report(ref_wav, spl_wav, freq_hz, args.duration, args.damp,
                 n_harm=args.harmonics)


if __name__ == '__main__':
    main()
