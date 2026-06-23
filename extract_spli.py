#!/usr/bin/env python3
"""Extract .spli YAML bodies from defaults.ts template literals."""
import re, os, sys

src = open(os.path.join(os.path.dirname(__file__), 'src/defaults.ts')).read()

# Map const name → output filename
INSTRUMENTS = {
    'OXYGENE_BASS':       'oxygene-bass.spli',
    'OXYGENE_KALIMBA':    'kalimba.spli',
    'OXYGENE_SYNBRASS':   'synbrass.spli',
    'OXYGENE_STRINGS':    'synstrings.spli',
    'OXYGENE_ENSEMBLE':   'string-ensemble.spli',
    'OXYGENE_BOWEDPAD':   'bowed-pad.spli',
    'OXYGENE_MELODY':     'oxygene-melody.spli',
    'OXYGENE_TAMBOURINE': 'tambourine.spli',
    'OXYGENE_SEASHORE':   'seashore.spli',
}

out_dir = os.path.join(os.path.dirname(__file__), 'tmp_spli')
os.makedirs(out_dir, exist_ok=True)

for const, fname in INSTRUMENTS.items():
    m = re.search(rf'const {const} = `(.*?)`', src, re.DOTALL)
    if not m:
        print(f'WARNING: {const} not found', file=sys.stderr)
        continue
    body = m.group(1).strip()
    path = os.path.join(out_dir, fname)
    with open(path, 'w') as f:
        f.write(body + '\n')
    print(f'  {path}')
