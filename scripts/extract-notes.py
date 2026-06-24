#!/usr/bin/env python3
"""extract-notes.py — extract note events from a sompyler score (first pass only).

Usage: python3 extract-notes.py <sompyler-root> <score.spls>

Outputs JSON: list of {voice, pitchHz, offsetSecs, lengthSecs, stress} objects.
Exits immediately after first-pass note collection; no audio is synthesised.
"""
import sys, json, os, re, tempfile
from pathlib import Path

sompyler_root = sys.argv[1]
score_path = sys.argv[2]

sys.path.insert(0, sompyler_root)

from Sompyler.score import Score
from Sompyler import Progress

class NoteCollector(Progress):
    def __init__(self):
        self.notes = []
        self._pending_bpm = 60.0

    def emit_premidi_note(self, abstime, channel, keynum, length, stress,
                          comment=None, pitch=None, tfid=None, **_):
        if abstime is None or keynum is None:
            return
        # Extract Hz from pitch string like "C4=261.626"
        pitch_hz = None
        if isinstance(pitch, str):
            m = re.search(r'=([\d.]+)$', pitch)
            if m:
                pitch_hz = float(m.group(1))
        # Extract length in seconds from length string like "0.428571 (net 1.0 ticks)"
        length_secs = None
        if isinstance(length, str):
            m = re.match(r'([\d.]+)', length)
            if m:
                length_secs = float(m.group(1))
        if pitch_hz is not None and length_secs is not None:
            self.notes.append({
                'voice': channel,
                'pitchHz': pitch_hz,
                'offsetSecs': float(abstime),
                'lengthSecs': length_secs,
                'stress': float(stress) if stress is not None else 100.0,
            })

    def emit_premidi_comment(self, comment, **kw):
        if comment == 'FINALLY DONE':
            raise _Done()

    def new_note(self, *a, **kw): pass
    def reuse_note(self, *a, **kw): pass
    def reuse_former_note(self, *a, **kw): pass
    def retune_notes(self, *a, **kw): pass
    def delete_orphan_notes(self, *a, **kw): pass
    def next_measure(self, *a, **kw): pass

class _Done(Exception):
    pass

monitor = NoteCollector()

with tempfile.TemporaryDirectory() as tmpdir:
    score_fh = open(score_path)
    score = Score(score_fh)
    score.directory = str(Path(score_path).parent)
    score.real_directory = score.directory

    score.prepare()

    def noop_instr_check(instrument, absfile): return True
    def noop_tonefile_check(tone_id): return False

    registry = os.path.join(tmpdir, 'registry')
    open(registry, 'w').close()
    score.load_prev_run_cache(
        registry_file=open(registry, 'r+'),
        instr_check=noop_instr_check,
        tonefile_check=noop_tonefile_check,
    )

    try:
        score.notes_feed_1st_pass(monitor, lambda n: True)
    except _Done:
        pass

print(json.dumps(monitor.notes))
