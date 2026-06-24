"""
Browser-side entry point for rendering a single note via Python sompyler.

Called from pyodideWorker.ts:
  Globals set before each call: _spli_yaml, _freq_hz, _duration_s, _stress
Returns: list[float] — PCM samples at 44100 Hz.

sompyler-web-only keys (LFO, VCF, UNISON) are stripped from the character
block before passing to the Python engine. UNISON would cause a crash
(goes to label_specs as a non-dict); LFO/VCF are silently ignored but
stripped for cleanliness.
"""

import yaml as _yaml
from Sompyler.orchestra.instrument import Instrument as _Instrument

_WEB_ONLY_KEYS = {'LFO', 'VCF', 'UNISON'}

_definition = _yaml.safe_load(_spli_yaml)
_character = _definition.get('character', _definition)
for _key in _WEB_ONLY_KEYS:
    _character.pop(_key, None)

_inst = _Instrument(_definition)
_pcm = _inst.render_tone(_freq_hz, _duration_s, _stress)
_pcm.tolist()
