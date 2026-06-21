#!/usr/bin/env python3
"""
Generate a TiMidity reference WAV for a single GM instrument note.

Usage:
  python3 scripts/gen_timidity_ref.py <gm_program_0indexed> <midi_note> <duration_s> <out.wav>

Example (Kalimba=108, C4=60, 2s):
  python3 scripts/gen_timidity_ref.py 108 60 2.0 src/conformance/fixtures/kalimba_c4_timidity.wav

TiMidity uses TimGM6mb (/etc/timidity.cfg) as the default soundfont.
"""
import struct, subprocess, sys, os, tempfile


def vlq(value: int) -> bytes:
    """Encode an integer as a MIDI variable-length quantity."""
    result = [value & 0x7F]
    value >>= 7
    while value:
        result.append((value & 0x7F) | 0x80)
        value >>= 7
    return bytes(reversed(result))


def make_midi(program: int, note: int, velocity: int, duration_ticks: int, tpq: int = 480) -> bytes:
    """Build a minimal Format-0 MIDI file: one note on channel 0."""
    tempo = 500000  # 120 BPM in µs/beat

    events = bytearray()
    # Set tempo
    events += vlq(0) + b'\xff\x51\x03' + struct.pack('>I', tempo)[1:]
    # Program change to GM instrument
    events += vlq(0) + bytes([0xC0, program & 0x7F])
    # Note On
    events += vlq(0) + bytes([0x90, note & 0x7F, velocity & 0x7F])
    # Note Off after duration_ticks
    events += vlq(duration_ticks) + bytes([0x80, note & 0x7F, 0x00])
    # End of track
    events += vlq(0) + b'\xff\x2f\x00'

    track = bytes(events)
    header = b'MThd' + struct.pack('>IHHH', 6, 0, 1, tpq)
    chunk  = b'MTrk' + struct.pack('>I', len(track)) + track
    return header + chunk


def main():
    if len(sys.argv) != 5:
        print(__doc__)
        sys.exit(1)

    program   = int(sys.argv[1])
    note      = int(sys.argv[2])
    duration  = float(sys.argv[3])
    out_wav   = sys.argv[4]

    tpq       = 480
    bpm       = 120
    ticks     = int(duration * bpm / 60 * tpq)

    midi_data = make_midi(program, note, 100, ticks, tpq)

    os.makedirs(os.path.dirname(out_wav) or '.', exist_ok=True)

    with tempfile.NamedTemporaryFile(suffix='.mid', delete=False) as f:
        f.write(midi_data)
        mid_path = f.name

    try:
        result = subprocess.run(
            ['timidity', '-Ow', '--output-mono', '-o', out_wav, mid_path],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            print('TiMidity error:', result.stderr, file=sys.stderr)
            sys.exit(1)
    finally:
        os.unlink(mid_path)

    print(f"Written: {out_wav}")
    print(f"  program={program} note={note} duration={duration}s")


if __name__ == '__main__':
    main()
