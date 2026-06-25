"""
Browser-side entry point for rendering a full score via Python sompyler.

Called from pyodideWorker.ts (render_score message type).
Globals set before each call:
  _score_path  — '/work/score.spls'
  _room_name   — 'project-room' if RFC splr mounted at /work/project-room.splr, else None
  _samplerate  — sample rate (int, typically 44100)

Returns stereo PCM via two globals:
  _result_left  — list[float], left channel
  _result_right — list[float], right channel

Instruments must be mounted at /work/{name}.spli before calling.
soundfile is not imported — the numpy array is returned directly to JS.
"""

from Sompyler.orchestra import play as _play
from Sompyler import synthesizer as _synthesizer
from Sompyler.synthesizer import normalize_amplitude as _normalize

_synthesizer.SAMPLING_RATE = _samplerate

_samples = _play(
    _score_path,
    None,                        # monitor — not needed
    lambda n: True,              # measure_is_in — render all measures
    workers=1,                   # avoid multiprocessing.Pool (not available in Pyodide)
    substitute_instruments={},
    room=_room_name if _room_name is not None else False,
)

_normalize(_samples, 1.0)

_result_left  = _samples[:, 0].tolist()
_result_right = _samples[:, 1].tolist()
