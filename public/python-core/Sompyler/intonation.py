import re, configparser

_NONE = object()

class TunerConfigurationError(RuntimeError): pass

class TunersMismatchError(RuntimeError): pass

class ToneSpecificationError(RuntimeError): pass

class ToneOffScaleError(RuntimeError): pass

class Tuner:
    __slots__ = (
            'ref_frequency', 'intervals', 'octave_width', 'key_number',
            'ref_key_number', 'ref_octave_offset', 'span_octaves',
            'tuning_shift', '_tuning_shift', 'chords', 'current_chord',
            'alt_intervals', 'scales', 'scale_mode'
        )
    debug = False

    def derive(self, **props):
        return self.__class__(self, **props)

    def __init__(self, config_fn, **props_to_overwrite):
        if isinstance(config_fn, Tuner):
            base = config_fn
        else:
            base = None

        if base is None:
            tc = configparser.ConfigParser()
            tc.read(config_fn)
            scale_sec = tc["basics"]
            inheritor = lambda p: getattr(self, p, scale_sec.get( p ))
            self.key_number = None # assignment delayed
            self.chords = tc["chords"]
            self.alt_intervals = tc["intervals"]
            self.scales = tc["scales"]
        else:
            inheritor = lambda p: getattr(base, p, None)
            self.key_number = base.key_number
            self.chords = base.chords
            self.alt_intervals = base.alt_intervals
            self.scales = base.scales

        self.scale_mode = 'chr'

        def getv(prop, t=None):
            val = props_to_overwrite.get(prop, inheritor(prop))
            return t(val) if t else val

        for prop, validator in [
                ("intervals", self.resolve_intervals),
                ("scales", self._get_scale_validators),
                ("chords", self._get_chord_types),
                ("ref_frequency", float), ("ref_key_number", int),
                ("ref_octave_offset", int), ("span_octaves", int)
            ]:
            setattr(
                self, prop, getv(prop, validator)
            )

        self.octave_width = calc_octave_width(self.intervals)

        self._tuning_shift = 0
                           # values make only sense if the
                           # tuning is unequally tempered.
        if base:
            if (len(self.intervals) != len(base.intervals)
                 or int(round(self.octave_width, 3)*1000)
                 != int(round(base.octave_width, 3)*1000)
                ): raise TunersMismatchError(
                    "Scale size diff: {:+f} | Octave width diff: {:+f}".format(
                        len(self.intervals) - len(base.intervals),
                        self.octave_width - base.octave_width
                    )
                )
            self.tuning_shift = lambda: self._tuning_shift + base.tuning_shift()
        else:
            self.tuning_shift = lambda: self._tuning_shift

        if not self.key_number: 
            self.key_number = map_keynames_to_positions(
                    self.ref_octave_offset, len(self.intervals),
                    tc["tones"], scale_sec.getint("span_octaves")
                )

        self.ref_frequency  = float(self.ref_frequency)
        self.ref_key_number = int(self.ref_key_number)
        self.ref_octave_offset = int(self.ref_octave_offset)
        self.span_octaves = int(self.span_octaves)

    def resolve_intervals(self, intervals):

        if isinstance(intervals, str) and re.fullmatch(r'\w+', intervals):
            return resolve_intervals(self.alt_intervals[intervals])
        else:
            return resolve_intervals(intervals)

    def frequency_of_tone(self, tone_spec):
        """ Tone specifier can be one of:
            - tone name or integer key position, possibly extended by
              - ...[+-]Nc = add or substract N (interval in cent)
              - ...[+-]Nk = add or substract N key positions
              - ...[+-]Nt = tuning shift specific to this tone
              - '!' pitch may ignore scale restriction if any
            - frequency (simply returned)
        """

        def frequency_factor(key, shift, add_cent):
            ilen = len(self.intervals)
            base_pos = (self.ref_octave_offset - shift) % ilen
            key_diff = key - self.ref_key_number
            full_octaves, remainder = divmod(key_diff, ilen)
            ff = self.octave_width ** (
                    full_octaves + (add_cent / (100 * ilen))
                )
            for r in range(remainder):
               ff *= self.intervals[ (base_pos + r + 1) % ilen ]
            return ff

        def parse(spec):
            note, *attr = re.sub(r'(?=(?<!^)[+-]\w)', '|', spec).split('|')
            attr_d = {}
            for a in attr:
                amount, unit = re.fullmatch(r"(\S+)([a-z])", a).groups()
                attr_d.setdefault(unit, 0)
                try:
                    attr_d[unit] += int(amount)
                except ValueError:
                    attr_d[unit] = amount
            attr_d["key"] = note
            return attr_d

        try:
            freq = float(tone_spec)
            if str(tone_spec) != str(int(freq)):
                return freq # very same value as input
            else:
                raise ValueError
        except ValueError:

            if tone_spec[-1] in '!?':
                off_scale = tone_spec[-1]
                tone_spec = tone_spec[:-1]
                if off_scale == '!':
                    off_scale = True
                elif off_scale == '?':
                    off_scale = False
            else:
                off_scale = None

            note = parse(tone_spec)

            try:
                key, self.current_chord = re.split(
                        r"(?:\&|(?<=\d)(?=\D))", note["key"], 1
                    )
            except ValueError:
                key = note["key"]
                self.current_chord = None

            add_to_key = note.get("k", 0)
            add_cent = note.get("c", 0)

            if "t" in note:
                shift, in_scale = self.retune(note["t"], _change=False)
            else:
                shift = self.tuning_shift()
                in_scale = None

            if in_scale is None:
                in_scale = self.scales.get("current") or (lambda n: True)

            try:
                key = int(key)
            except ValueError:
                if (m := re.match(r'\^([b#]?)(\d+)', key)):
                    curscale = self.scales["current"](_NONE)
                    if curscale is None: raise ToneSpecificationError(
                            "No scale defined. scale-relative tone ^n notation requires tuning property."
                        )
                    shift_by_one = m.group(1)
                    octave, scale_offset = divmod(int(m.group(2)), len(curscale))
                    shift_by_one = 1 if shift_by_one == '#' else -1 if shift_by_one == 'b' else 0
                    if self.current_chord is None:
                        self.current_chord = self.scale_mode.title()
                        key = 1
                        add_to_key += scale_offset
                    else:
                        key = 1 + sum(curscale[0:scale_offset])
                    key += (
                            octave * len(self.intervals) + (shift % len(self.intervals))
                          + shift_by_one - self.ref_octave_offset
                        )
                else:
                    key = self.key_number[key]
                key += (
                     self.find_key_in_chord(add_to_key)
                         if self.current_chord is not None
                         else add_to_key
                     )
                if self.debug: print(f"Frequency of {tone_spec}: {key} => ", end="")
            else:
                if self.debug: print(f"Frequency of key {key}: ", end="")

            if not( in_scale(key) or off_scale ):
                if off_scale is False:
                    i = 0
                    while i < len(self.intervals):
                        i += 1
                        bias = i * int(shift/abs(shift) if shift else 1)
                        if in_scale(key + bias):
                            key += bias
                            break
                        elif in_scale(key - bias):
                            key -= bias
                            break
                    else:
                        raise ToneOffScaleError(
                            "Could not find neighbour in scale for lax tone "
                            "allowing for chromatic alteration: " + tone_spec
                        )
                else:
                    raise ToneOffScaleError(
                        "{} (key {}) not in scale {}".
                        format(tone_spec, key, [
                            'C','C#','D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#',
                            'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab',
                            'A', 'Bb', 'B'
                        ][shift] + self.scale_mode)
                    )

            frequency = (
                frequency_factor(key, shift, add_cent)
              * self.ref_frequency
            )

            if self.debug:
                print(frequency)

            return key, frequency

    def find_key_in_chord(self, key): # or scale
        if self.current_chord[:1].isupper():
            rel_intervals = self.scales[self.current_chord.lower()](_NONE)
            i = 0
            level, offset = divmod(key, len(rel_intervals))
            if offset: offset = sum(rel_intervals[:offset])
        else:
            chord = self.chords[self.current_chord]
            level, offset = divmod(key, len(chord))
            offset = chord[offset]
        return level*12 + offset

    def retune(self, diff, _change=True):

        if not isinstance(diff, int):
            retune_by_steps, scale_mode = re.fullmatch(
                    r"([+-](?=\b)\d*)(\w{2,3})?", diff
                ).groups()
            if retune_by_steps:
                if len(retune_by_steps) == 1:
                    retune_by_steps = retune_by_steps + '0'
                diff = int(retune_by_steps)
            if scale_mode:
                valid = self.scales[scale_mode]
                self.scale_mode = scale_mode
            else:
                valid = self.scales.get("current")
        else:
            valid = self.scales.get("current")

        if _change:
            self._tuning_shift += diff
            self.scales["current"] = valid
        else:
            return self.tuning_shift() + diff, lambda n: valid(n, _diff=diff)

    def _get_chord_types(self, chords):
        return { **self.chords, **parse_chords(chords) }

    def _get_scale_validators(self, modes):

        def validator(*intervals, name=None):

            _cumsum = 0
            valid_set = set()
            for i in intervals:
                _cumsum += i
                valid_set.add(_cumsum % len(self.intervals))

            def valid(key, _diff=0):
                if key is _NONE: return intervals
                pitch = (key + self.ref_octave_offset
                        - (self.tuning_shift() + _diff)
                        - 1
                        ) % len(self.intervals)
                return pitch in valid_set

            if len(self.intervals) == _cumsum:
                return valid
            else:
                raise TunerConfigurationError(
                    f"invalid set {name} != {len(valid_set)}"
                )

        ret = { **self.scales, **modes }

        for name, value in ret.items():
            if isinstance(ret[name], str):
                ret[name] = validator(
                        *[int(v) for v in value.split(' ')],
                        name=name
                    )
            else:
                # reinitialize for new invocant
                ret[name] = validator(
                        *ret[name](_NONE),
                        name=name
                    )

        return ret


def map_keynames_to_positions(offset, scale_len, tonerows, span_octaves):
    keynum_reg = {}

    def set_keys(names, octave, add_octave=False):
        for num, tone in enumerate(names):
            if tone == '-': continue
            num = num + scale_len * int(octave) - offset + 1
            if add_octave is True:
                tone, adj = re.fullmatch(r"(\S+?)([+-]?)", tone).groups()
                if adj:
                    octave = str(int(octave) + int(adj + '1'))
                tone += octave
            if tone in keynum_reg:
                raise RuntimeError(
                        "tone {} cannot be stored twice "
                        "in key_num registry".format(tone)
                    )
            keynum_reg[tone] = num

    for row_name, tones in tonerows.items():
        m = re.search(r"_(\d+)$", row_name)
        tones = re.split(r"\s+", tones)
        if len(tones) != scale_len:
            raise TunerConfigurationError(
                "{} is {} tones long, instead of {}".format(
                    row_name, len(tones), scale_len
                )
            )
        if m:
            octave = m.group(1)
            set_keys(tones, octave)
        else:
            for o in range(span_octaves):
                set_keys(tones, str(o), True)

    return keynum_reg


def resolve_intervals(intervals):

    if isinstance(intervals, list) or re.fullmatch(r'\w+', intervals):
        return intervals

    if '^' in intervals:
        m = re.fullmatch(r"(\d)\s*\^\s*(\d+)/(\d+)", intervals)
        if m:
            base, exp, root = (int(n) for n in m.groups())
            exp /= root
            octave_steps = int(round(1 / exp))
            intervals_l = [base ** exp] * octave_steps
        else:
            raise TunerConfigurationError(
                    "Cannot parse intervals: {}".format(intervals)
                )
    elif ' ' in intervals:
        intervals_l = []
        str_intervals = re.split(r"\s+", intervals)
        for interval in str_intervals:
            if interval.isdigit():
                interval = int(interval)
                if not interval > 0: raise TunerConfigurationError(
                    "integer interval is not above 0 cent: {}"
                    .format(interval)
                )
                intervals_l.append(2 ** (interval/(100 * str_intervals)))
            elif ':' in interval:
                # Perfect fifth is 2:1, read as: Given a string, separate it
                # by a finger so that one side has double length of the other.
                # Be stroken the part with double length, a perfect fifth sounds
                # compared to the whole string swinging.
                higher, lower = (int(n) for n in interval.split(':', 1))
                if lower > higher: raise TunerConfigurationError(
                        "Wrong order in interval notation: {}. "
                        "a>b required.".format(interval)
                    )
                intervals_l.append( (higher + lower) / higher )
            elif '/' in interval:
                # Perfect fifth is 3/2.
                counter, divisor = (int(n) for n in interval.split('/', 1)),
                if divisor > counter: raise TunerConfigurationError(
                        "Wrong order in interval notation: {}. "
                        "a>b required, yielding a value >1.".format(interval)
                    )
                intervals_l.append( counter / divisor )
            else: raise TunerConfigurationError(
                    "Failed to parse interval: {}".format(interval)
                )

    elif intervals.isinteger():
        steps = int(intervals)
        intervals_l = [2 ** (1/steps)] * steps

    else:
        raise Tuner.ConfigurationError(
                "Cannot parse intervals: {}".format(intervals)
            )

    return intervals_l

def calc_octave_width(intervals_l):
    octave_width = 1 # should result to 2, but feel free to experiment
    for interval in intervals_l:
        octave_width *= interval
    return octave_width

def parse_chords(chords):

    parsed_chords = {}
    for name, interv in chords.items():
        interv = map(int, re.split(r"\s+", interv) if isinstance(interv, str) else interv)
        base = next(interv)
        if base != 0:
            raise TunerConfigurationError(name + ": first interval must be 0")
        if name.startswith("x"):
            name = name[1:]
        parsed_chords[name] = [base] + list(interv)

    return parsed_chords

