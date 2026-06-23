#!/usr/bin/env python3
"""
sf2_to_spli.py — Extract GM instrument definitions from an SF2 soundfont and
emit sompyler-compatible .spli YAML.

Usage:
    python3 sf2_to_spli.py /path/to/font.sf2 [gm_number ...]

    gm_number is 1-based (GM 64 = Synth Brass 2). Defaults to the six
    Oxygène instruments.

Generator op numbers verified against FluidSynth source + actual SF2 data:
    5=modLfoToPitch  6=vibLfoToPitch  8=filterFc  9=filterQ
   11=modEnvToFilterFc  12=modLfoToVol  20=modLfoDelay  21=modLfoFreq
   22=vibLfoDelay  23=vibLfoFreq  25=modEnvAttack  26=modEnvHold
   27=modEnvDecay  28=modEnvSustain  29=modEnvRelease
   33=volEnvAttack  34=volEnvHold  35=volEnvDecay
   36=volEnvSustain  37=volEnvRelease  38=keynumToVolEnvHold
   39=keynumToVolEnvDecay  41=instrument(pgen)  43=keyRange  44=velRange
   48=initialAttenuation  52=fineTune  53=sampleID  54=sampleModes
"""

import struct, math, sys
import numpy as np

# ---------------------------------------------------------------------------
# Generator op codes (FluidSynth-verified numbering)
# ---------------------------------------------------------------------------
OP = dict(
    modLfoToPitch    = 5,
    vibLfoToPitch    = 6,
    filterFc         = 8,    # absolute cents, default 13500 (~20 kHz = open)
    filterQ          = 9,    # centibels
    modEnvToFilterFc = 11,
    modLfoToVol      = 12,   # centibels tremolo
    modLfoDelay      = 20,
    modLfoFreq       = 21,   # absolute cents
    vibLfoDelay      = 22,
    vibLfoFreq       = 23,   # absolute cents
    modEnvAttack     = 25,   # timecents
    modEnvHold       = 26,
    modEnvDecay      = 27,
    modEnvSustain    = 28,   # centibels (0=full,1000=silent)
    modEnvRelease    = 29,
    volEnvAttack     = 33,   # timecents
    volEnvHold       = 34,
    volEnvDecay      = 35,
    volEnvSustain    = 36,   # centibels (0=full,1000=silent)
    volEnvRelease    = 37,
    keynumToVolHold  = 38,
    keynumToVolDecay = 39,
    instrument       = 41,   # pgen only: unsigned index into inst[]
    keyRange         = 43,   # two bytes: lo, hi MIDI note
    velRange         = 44,   # two bytes: lo, hi MIDI velocity
    initialAttn      = 48,   # centibels attenuation (0=full, 1440=min)
    fineTune         = 52,   # cents, -99 to +99
    sampleID         = 53,   # igen only: unsigned index into shdr[]
    sampleModes      = 54,   # bit 0=loop, bit 1=loop-during-release
)

DEFAULTS = {
    OP['filterFc']:      13500,
    OP['filterQ']:       0,
    OP['modEnvToFilterFc']: 0,
    OP['modLfoToVol']:   0,
    OP['modLfoFreq']:    0,
    OP['modLfoDelay']:  -12000,
    OP['vibLfoToPitch']: 0,
    OP['vibLfoFreq']:    0,
    OP['vibLfoDelay']:  -12000,
    OP['modEnvAttack']: -12000,
    OP['modEnvHold']:   -12000,
    OP['modEnvDecay']:  -12000,
    OP['modEnvSustain']: 0,
    OP['modEnvRelease']:-12000,
    OP['volEnvAttack']: -12000,
    OP['volEnvHold']:   -12000,
    OP['volEnvDecay']:  -12000,
    OP['volEnvSustain']: 0,
    OP['volEnvRelease']:-12000,
    OP['initialAttn']:   0,
    OP['fineTune']:      0,
}

def tc(v):  return 2 ** (v / 1200)           # timecents → seconds
def achz(c): return 8.176 * 2 ** (c / 1200)  # absolute cents → Hz
def cbl(c):  return 10 ** (-c / 200)          # centibels attenuation → linear

def sustain_rdfs(cB):
    """SF2 sustainVolEnv centibels → REVERSED_DBFS (100=full, 0=silent).
       Derivation: RDFS = 100*(1 - cB/1000)  [cB range 0–1000]"""
    return max(0.0, min(100.0, 100.0 * (1.0 - cB / 1000.0)))

def lin_to_rdfs(lin):
    if lin <= 0: return 0.0
    return max(0.0, min(100.0, 100.0 * (1.0 + math.log10(lin) / 5.0)))

def decode_range(raw_s16):
    """Decode keyRange/velRange: stored as two bytes in a signed 16-bit word."""
    u = raw_s16 & 0xFFFF
    return u & 0xFF, (u >> 8) & 0xFF  # (lo, hi)

# ---------------------------------------------------------------------------
# SF2 parser
# ---------------------------------------------------------------------------
class SF2:
    def __init__(self, path):
        with open(path, 'rb') as f:
            self._d = f.read()
        self._parse()

    def _u16(self, o): return struct.unpack_from('<H', self._d, o)[0]
    def _s16(self, o): return struct.unpack_from('<h', self._d, o)[0]
    def _u32(self, o): return struct.unpack_from('<I', self._d, o)[0]
    def _str(self, o, n=20): return self._d[o:o+n].rstrip(b'\x00').decode('ascii','replace')

    def _parse(self):
        d = self._d
        assert d[:4] == b'RIFF' and d[8:12] == b'sfbk'

        # locate LIST chunks
        pos, tops = 12, {}
        while pos < len(d) - 8:
            tag  = d[pos:pos+4]
            size = self._u32(pos + 4)
            if tag == b'LIST':
                tops[d[pos+8:pos+12]] = (pos + 12, size - 4)
            pos += 8 + size

        # smpl is inside LIST:sdta
        sdta_b, sdta_sz = tops[b'sdta']
        p = sdta_b
        while p < sdta_b + sdta_sz:
            tag  = d[p:p+4]
            size = self._u32(p + 4)
            if tag == b'smpl':
                self._smpl = p + 8
            p += 8 + size

        # pdta sub-chunks
        pdta_b, pdta_sz = tops[b'pdta']
        sub = {}
        p = pdta_b
        while p < pdta_b + pdta_sz:
            tag  = d[p:p+4]
            size = self._u32(p + 4)
            sub[tag] = (p + 8, size)
            p += 8 + size

        self.phdr = self._tbl(sub[b'phdr'], 38,
            lambda o: dict(name=self._str(o,20), preset=self._u16(o+20),
                           bank=self._u16(o+22), bag=self._u16(o+24)))
        self.pbag = self._tbl(sub[b'pbag'], 4,
            lambda o: dict(gen=self._u16(o), mod=self._u16(o+2)))
        self.pgen = self._tbl(sub[b'pgen'], 4,
            lambda o: dict(op=self._u16(o), val=self._s16(o+2), uval=self._u16(o+2)))
        self.inst = self._tbl(sub[b'inst'], 22,
            lambda o: dict(name=self._str(o,20), bag=self._u16(o+20)))
        self.ibag = self._tbl(sub[b'ibag'], 4,
            lambda o: dict(gen=self._u16(o), mod=self._u16(o+2)))
        self.igen = self._tbl(sub[b'igen'], 4,
            lambda o: dict(op=self._u16(o), val=self._s16(o+2), uval=self._u16(o+2)))
        self.shdr = self._tbl(sub[b'shdr'], 46,
            lambda o: dict(name=self._str(o,20), start=self._u32(o+20),
                           end=self._u32(o+24), loop_start=self._u32(o+28),
                           loop_end=self._u32(o+32), rate=self._u32(o+36),
                           root=d[o+40], pitch_corr=struct.unpack_from('<b',d,o+41)[0]))

    def _tbl(self, base_sz, rec, fn):
        base, size = base_sz
        return [fn(base + i * rec) for i in range(size // rec)]

    # ------------------------------------------------------------------
    def _zone_gens(self, bag_idx, bags, gens):
        g0 = bags[bag_idx]['gen']
        g1 = bags[bag_idx + 1]['gen'] if bag_idx + 1 < len(bags) else len(gens)
        result = {}
        for i in range(g0, g1):
            g = gens[i]
            # sampleID is unsigned; store uval for it
            result[g['op']] = g['uval'] if g['op'] == OP['sampleID'] else g['val']
        return result

    def find_preset(self, bank, program):
        for i, ph in enumerate(self.phdr):
            if ph['bank'] == bank and ph['preset'] == program:
                return i
        return None

    def preset_instrument(self, preset_idx, midi_note=60):
        """Return (inst_idx, preset_override_gens) for midi_note."""
        pb0 = self.phdr[preset_idx]['bag']
        pb1 = self.phdr[preset_idx + 1]['bag'] if preset_idx + 1 < len(self.phdr) else len(self.pbag)
        global_gens = {}
        for bi in range(pb0, pb1):
            z = self._zone_gens(bi, self.pbag, self.pgen)
            if OP['instrument'] not in z:
                global_gens.update(z)
                continue
            # check key range if present
            if OP['keyRange'] in z:
                lo, hi = decode_range(z[OP['keyRange']])
                if not (lo <= midi_note <= hi):
                    continue
            return z[OP['instrument']], {**global_gens, **z}
        # fallback: first zone with instrument link regardless of range
        for bi in range(pb0, pb1):
            z = self._zone_gens(bi, self.pbag, self.pgen)
            if OP['instrument'] in z:
                return z[OP['instrument']], z
        return None, {}

    def instrument_gens(self, inst_idx, midi_note=60, midi_vel=80):
        """Merge global zone + best-match key/velocity zone for inst_idx."""
        ib0 = self.inst[inst_idx]['bag']
        ib1 = self.inst[inst_idx + 1]['bag'] if inst_idx + 1 < len(self.inst) else len(self.ibag)

        global_gens = {}
        sample_gens = None

        for bi in range(ib0, ib1):
            z = self._zone_gens(bi, self.ibag, self.igen)
            if OP['sampleID'] not in z:
                global_gens.update(z)
                continue
            # key range check
            if OP['keyRange'] in z:
                lo, hi = decode_range(z[OP['keyRange']])
                if not (lo <= midi_note <= hi):
                    continue
            # velocity range check
            if OP['velRange'] in z:
                lo, hi = decode_range(z[OP['velRange']])
                if not (lo <= midi_vel <= hi):
                    continue
            sample_gens = z
            break

        if sample_gens is None:
            # grab first sample zone ignoring ranges
            for bi in range(ib0, ib1):
                z = self._zone_gens(bi, self.ibag, self.igen)
                if OP['sampleID'] in z:
                    sample_gens = z
                    break

        merged = {**DEFAULTS}
        merged.update(global_gens)
        if sample_gens:
            merged.update(sample_gens)
        return merged

    def loop_pcm(self, sample_idx):
        s = self.shdr[sample_idx]
        raw = self._d[self._smpl + s['start'] * 2 : self._smpl + s['end'] * 2]
        pcm = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768.0
        ls = s['loop_start'] - s['start']
        le = s['loop_end']   - s['start']
        return pcm, ls, le, s['rate']

    def fft_profile(self, sample_idx, n_harmonics=24, n_cycles=16):
        """FFT the loop region; return list of REVERSED_DBFS values (H1=100)."""
        s = self.shdr[sample_idx]
        f0 = 440.0 * 2 ** ((s['root'] - 69) / 12) * 2 ** (s['pitch_corr'] / 1200)
        pcm, ls, le, rate = self.loop_pcm(sample_idx)
        loop = pcm[ls:le]
        if len(loop) < 4:
            return []

        # tile to get at least n_cycles periods
        period_samples = rate / f0
        needed_tiles = max(1, math.ceil(n_cycles * period_samples / len(loop)))
        tiled = np.tile(loop, needed_tiles)
        take = int(round(n_cycles * period_samples))
        seg = tiled[:take]

        N = len(seg)
        spectrum = np.abs(np.fft.rfft(seg * np.hanning(N)))
        bw = rate / N

        profile_lin = []
        for h in range(1, n_harmonics + 1):
            tf = f0 * h
            if tf >= rate / 2:
                break
            cb = tf / bw
            lo, hi = max(0, int(cb) - 4), min(len(spectrum) - 1, int(cb) + 4)
            profile_lin.append(float(np.max(spectrum[lo:hi+1])))

        if not profile_lin or profile_lin[0] == 0:
            return []
        h1 = profile_lin[0]
        return [lin_to_rdfs(v / h1) for v in profile_lin]


# ---------------------------------------------------------------------------
# Conversion helpers
# ---------------------------------------------------------------------------
def gens_to_envelope(gens):
    """Return (a_str, s_str, r_str) for sompyler character block."""
    A  = max(0.001, tc(gens[OP['volEnvAttack']]))
    H  = tc(gens[OP['volEnvHold']])
    D  = tc(gens[OP['volEnvDecay']])
    Sv = sustain_rdfs(gens[OP['volEnvSustain']])
    R  = max(0.001, tc(gens[OP['volEnvRelease']]))

    a_str = f'{A:.4g}:1,100'

    # S: hold plateau then decay, or just instant hold at sustain level
    no_decay = D < 0.005 or Sv >= 99.9
    if no_decay and H < 0.01:
        s_str = f'0.001:100;1,{Sv:.1f}'
    elif no_decay:
        s_str = f'{H:.4g}:100;1,{Sv:.1f}'
    elif H < 0.01:
        s_str = f'{D:.4g}:100;1,{Sv:.1f}'
    else:
        # hold then decay
        total = H + D
        hold_frac = H / total
        s_str = (f'{total:.4g}:100;'
                 f'{hold_frac:.3f},100;'
                 f'1,{Sv:.1f}')

    r_str = f'{R:.4g}:100;1,0'
    return a_str, s_str, r_str


def gens_to_spli(gens, sf2, gm_num, preset_name):
    sid = gens.get(OP['sampleID'])
    s = sf2.shdr[sid] if sid is not None else None

    lines = [
        f'# GM {gm_num}: {preset_name}',
        f'# Source: FluidR3_GM2.sf2',
    ]
    if s:
        loop_f = s['loop_end'] - s['loop_start']
        lines += [
            f'# Sample: {s["name"]!r}  root={s["root"]}  rate={s["rate"]} Hz',
            f'# Loop:   {loop_f} frames ({loop_f / s["rate"] * 1000:.1f} ms)',
        ]

    # filter envelope note
    fc = gens[OP['filterFc']]
    menv_fc = gens[OP['modEnvToFilterFc']]
    if fc < 13000:
        fc_hz = achz(fc)
        if menv_fc:
            peak_hz = achz(fc + menv_fc)
            lines.append(f'# Filter sweep: {fc_hz:.0f} Hz → {peak_hz:.0f} Hz (mod env); '
                         f'PROFILE captures open-filter state from loop FFT.')
        else:
            lines.append(f'# Filter: {fc_hz:.0f} Hz fixed')

    a_str, s_str, r_str = gens_to_envelope(gens)

    attn = gens[OP['initialAttn']]
    amp  = round(cbl(attn) * 0.5, 3)  # half for mix headroom
    amp  = max(0.05, amp)

    lines += [
        'character:',
        '  O: sine',
        f'  AMP: {amp}',
        f'  A: "{a_str}"',
        f'  S: "{s_str}"',
        f'  R: "{r_str}"',
    ]

    # VCF: only if filter is meaningfully active AND no sweep (sweep → use PROFILE)
    if fc < 12000 and not menv_fc:
        lines.append(f'  VCF: "{achz(fc):.0f};{min(0.9, cbl(gens[OP["filterQ"]])):.2f}"')

    # LFO tremolo
    mvol = gens[OP['modLfoToVol']]
    if abs(mvol) > 5:
        freq_hz = achz(gens[OP['modLfoFreq']])
        delay   = max(0.0, tc(gens[OP['modLfoDelay']]) - 0.001)
        depth   = cbl(abs(mvol))
        lfo = f'  LFO: "{freq_hz:.2f}@sin'
        if delay > 0.05:
            lfo += f';{delay:.2f}'
        lfo += f':{depth:.3f}:amp"'
        lines.append(lfo)

    # vibrato (just note, not implemented as LFO in sompyler yet)
    vdepth = gens[OP['vibLfoToPitch']]
    if abs(vdepth) > 2:
        vfreq  = achz(gens[OP['vibLfoFreq']])
        vdelay = max(0.0, tc(gens[OP['vibLfoDelay']]) - 0.001)
        lines.append(f'  # Vibrato: {vfreq:.2f} Hz  depth={vdepth} cents'
                     + (f'  delay={vdelay:.2f}s' if vdelay > 0.05 else ''))

    # PROFILE from FFT
    if sid is not None:
        profile = sf2.fft_profile(sid)
        if profile:
            lines.append('  PROFILE:')
            for i, v in enumerate(profile):
                lines.append(f'    - {v:.1f}  # H{i+1}')

    return '\n'.join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
OXYGENE_PROGRAMS = {
    36: 'Fretless Bass',
    49: 'String Ensemble 1',
    52: 'Synth Strings 2',
    64: 'Synth Brass 2',
    93: 'Pad 5 (Bowed Glass)',
    108: 'Koto (used as Kalimba)',
}

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    path = sys.argv[1]
    programs = [int(x) for x in sys.argv[2:]] if len(sys.argv) > 2 else list(OXYGENE_PROGRAMS)

    print(f'Loading {path}...', file=sys.stderr)
    sf2 = SF2(path)
    print(f'  {len(sf2.phdr)} presets, {len(sf2.inst)} instruments, '
          f'{len(sf2.shdr)} samples\n', file=sys.stderr)

    for gm in programs:
        pi = sf2.find_preset(0, gm - 1)
        ph = sf2.phdr[pi]
        name = OXYGENE_PROGRAMS.get(gm, ph['name'])

        print(f'# {"="*56}', file=sys.stderr)
        print(f'# GM {gm}: {ph["name"]!r}', file=sys.stderr)

        inst_idx, preset_ov = sf2.preset_instrument(pi, midi_note=60)
        if inst_idx is None:
            print(f'  ERROR: no instrument link found', file=sys.stderr)
            continue

        iname = sf2.inst[inst_idx]['name']
        print(f'# Instrument: {iname!r}', file=sys.stderr)

        gens = sf2.instrument_gens(inst_idx, midi_note=60, midi_vel=80)
        # apply preset-level overrides (volume envelope scale, etc.)
        for op in (OP['volEnvAttack'], OP['volEnvDecay'], OP['volEnvSustain'],
                   OP['volEnvRelease'], OP['keynumToVolHold'], OP['keynumToVolDecay']):
            if op in preset_ov:
                gens[op] = gens.get(op, DEFAULTS.get(op, 0)) + preset_ov[op]

        A  = max(0.001, tc(gens[OP['volEnvAttack']]))
        Sv = sustain_rdfs(gens[OP['volEnvSustain']])
        D  = tc(gens[OP['volEnvDecay']])
        R  = max(0.001, tc(gens[OP['volEnvRelease']]))
        print(f'# Envelope: A={A:.3f}s  D={D:.3f}s  S={Sv:.1f}rdfs  R={R:.3f}s',
              file=sys.stderr)

        sid = gens.get(OP['sampleID'])
        if sid is not None:
            s = sf2.shdr[sid]
            loop_f = s['loop_end'] - s['loop_start']
            print(f'# Sample: {s["name"]!r}  root={s["root"]}  '
                  f'loop={loop_f}fr ({loop_f/s["rate"]*1000:.1f}ms)', file=sys.stderr)

        print()
        print(f'# --- {name} ---')
        print(gens_to_spli(gens, sf2, gm, ph['name']))
        print()

if __name__ == '__main__':
    main()
