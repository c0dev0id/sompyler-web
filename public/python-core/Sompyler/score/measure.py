import re, warnings
from math import ceil, log
from collections import defaultdict
from . import position as score_position, ScoreError
from .stressor import Stressor
from .chord import Chord
from ..synthesizer.shape import Shape # realize dynamic tempo, stress and custom attributes
from ..syntaxtracer import default_noop, deeper_level

syntracer = default_noop()

class LPU:

    def __init__(self, lower_bound, pattern, upper_bound):
        with deeper_level("lower_bound"):
            if lower_bound is None:
                self.lower_bound = 0
            elif lower_bound.isdecimal():
                self.lower_bound = int(lower_bound)
            else:
                self.lower_bound = Shape.from_string(lower_bound)

        with deeper_level("pattern"):
            self.pattern = Stressor(pattern.split(";"))

        with deeper_level("upper_bound"):
            if upper_bound.isdecimal():
                self.upper_bound = int(upper_bound)
            else:
                self.upper_bound = Shape.from_string(upper_bound)

    @classmethod
    def from_string(cls, string):
        try:
            lower_bound, pattern = string.split(";P")
        except ValueError:
            lower_bound = None
            pattern = string
        pattern, upper_bound = pattern.split(";U")
        return cls(lower_bound, pattern, upper_bound)

    def render(self, l, **shape_attr):
        if isinstance(self.lower_bound, Shape):
            lower_bound = self.lower_bound.render(l, **shape_attr)
        else:
            lower_bound = [self.lower_bound] * l
        pattern = self.pattern.tick_values()

        times, remainder = divmod(l, len(pattern))
        if remainder:
            raise RuntimeError(
                f"Target tick length {l} not divisible "
                "by pattern length without remainder"
            )
        else:
            extended = pattern * times

        if isinstance(self.upper_bound, Shape):
            upper_bound = self.upper_bound.render(l, **shape_attr)
        else:
            upper_bound = [self.upper_bound] * l

        ret = []
        for l, p, u in zip(lower_bound, extended, upper_bound):
            ret.append(l * (1-p) + u * p)
        return ret


def continuum(some_value):
    if some_value is None:
        return some_value
    elif isinstance(some_value, (Shape, LPU)):
        return some_value
    elif isinstance(some_value, int):
        return Shape.from_string(
                str(some_value) + ';1,' + str(some_value)
            )
    elif isinstance(some_value, str):
        if some_value[0] in "LP":
            return LPU.from_string(some_value[1:])
        elif '-' in some_value and not ';' in some_value:
            from_v, to_v = some_value.split('-')
            some_value = from_v + ';1,' + to_v
        return Shape.from_string(some_value)
    else: raise TypeError(
            "continuum must be either int or 'x-y' indication or "
            "shape definition string/object, but it is a "
            + str(type(some_value))
          )

def shape_continual_article_props(articles, _log=True):

    if callable(_log):
        logged = _log
    else:
        logged = lambda article, prop: _log

    def get_renderer(article, prop_name):
        def renderer(l):
            if article[prop_name] is None: return
            article[prop_name] = article[prop_name].render(
                l, y_scale=1 if prop_name.startswith('_') else True,
                is_length_factor=False
            )
            return True
        return renderer

    renderers = []
    for label, article in articles.items():
        synttr = syntracer('article', label, _defer=True)
        for prop_name, cont in article.items():
            if isinstance(cont, (int, float, list)):
                if logged(label, prop_name): synttr(
                    'article.property', prop_name, constant=cont
                )
                continue
            elif prop_name.isupper():
                if logged(label, prop_name): synttr(
                    'article.property', prop_name, static=cont
                )
                continue
            elif isinstance(cont, (Shape, LPU)):
                pass
            else:
                with deeper_level('continuum'):
                    article[prop_name] = continuum(cont)
            renderers.append(get_renderer(article, prop_name))

    return renderers


class Measure:
    __slots__ = (
        'name', 'tempo_shape', 'stressor', 'offset', 'length',
        'elasticks_pattern', 'elasticks_shape', 'skip',
        'structure', 'voices', 'measure_cut', 'lower_stress_bound',
        'tuning', 'upper_stress_bound'
    )

    def __init__(
            self, structure, name, voices, previous, cut=None,
            stress_pattern=None,
            ticks_per_minute=None, beats_per_minute=None,
            elasticks_pattern=None, elasticks_shape=None,
            tempo_shape=None,
            tuning=None,
            lower_stress_bound=None, upper_stress_bound=None,
            repeat_unmentioned_voices=False,
            offset_seconds=0,
            skip=None
        ):

        synttr = syntracer("bar", name)

        if skip is None:
            self.skip = previous.skip if previous else skip
        else:
            self.skip = skip

        self.measure_cut = cut or 0
        if not self.skip:
            self.offset = offset_seconds

        if not previous and beats_per_minute is None:
            if ticks_per_minute is None: raise RuntimeError(
                "First measure must have a tempo (meta[beats_per_minute])"
            )

        if stress_pattern is not None:
            synttr("stress_pattern.stressor")
            with deeper_level("stressor", add=1):
                self.stressor = Stressor( stress_pattern )
        else:
            self.stressor = previous.stressor

        with deeper_level("tempo"):
            if beats_per_minute is not None:
                if ticks_per_minute is not None:
                    raise RuntimeError(
                        "Both beats_per_minute and ticks_per_minute given"
                    )
                elif isinstance(beats_per_minute, (int, float)):
                    ticks_per_minute = beats_per_minute * self.stressor.sub_cumlen()
                else:
                    ticks_per_minute = re.sub(
                        r"(?<!\*)(?P<y>\d+)(?![,:])",
                        lambda m: str(int(m.group('y')) * self.stressor.sub_cumlen()),
                        beats_per_minute
                    )
            elif ticks_per_minute is not None:
                warnings.warn(
                    "ticks_per_minute needs to be replaced by beats_per_minute",
                    RuntimeWarning
                )

            if ticks_per_minute is None:
                self.tempo_shape = tempo_shape or previous.tempo_shape
            else:
                self.tempo_shape = continuum(ticks_per_minute)

            self.check_set_elasticks_pattern(elasticks_pattern, previous=previous)

        with deeper_level("elasticks"):
            if elasticks_shape is None and previous:
                self.elasticks_shape = previous.elasticks_shape
            elif elasticks_shape:
                self.elasticks_shape = Shape.from_string(elasticks_shape)
            else:
                self.elasticks_shape = None

        with deeper_level("lower_stress_bound"):
            self.lower_stress_bound = (
                continuum(lower_stress_bound)
                    if lower_stress_bound is not None
                    else previous.lower_stress_bound
            )

        with deeper_level("upper_stress_bound"):
            self.upper_stress_bound = (
                continuum(upper_stress_bound)
                    if upper_stress_bound
                    else previous.upper_stress_bound
            )


        self.structure = structure
        self.tuning = tuning
        self.voices = voices

        self.length = self.stressor.cumlen - abs(self.measure_cut)

        if repeat_unmentioned_voices:
            for voice in previous.structure.keys():
                structure.setdefault(voice, True)

        for v_name, voice in structure.items():
            if voice is True:
                structure[v_name] = previous.structure[v_name]

        self.name = name

    def __iter__(self):

        if self.skip:
            yield from []
            return

        with deeper_level("voice"):
            for v_name, v_chords in self.structure.items():

                if not isinstance(v_chords, dict):
                    v_chords = { 0: v_chords }

                v_meta = v_chords.pop('_meta', {})

                v_articles = v_chords.pop('_articles', {})

                if 'stress_pattern' in v_meta:
                    v_meta['stressor'] = Stressor(
                            v_meta.pop('stress_pattern').split(";")
                        )

                    if not v_meta['stressor'].cumlen == self.stressor.cumlen:
                        raise RuntimeError(
                            "Voice bound measure stressor has other length "
                            "than that of the overall measure"
                        )

                if 'elasticks_pattern' in v_meta:
                    v_meta['elasticks_pattern'] = Stressor(
                            v_meta['elasticks_pattern'].split(";")
                        )
                    if (
                        self.stressor.cumlen
                          % v_meta['elasticks_pattern'].cumlen
                    ): raise RuntimeError(
                        "Voice bound measure elasticks_pattern has other length "
                        "than that of the overall measure"
                    )
                if 'elasticks_shape' in v_meta:
                    v_meta['elasticks_pattern'] = Shape.from_string(
                            v_meta['elasticks_pattern']
                        )

                if self.voices[v_name] is False:
                    continue

                yield VoiceBoundMeasure(
                     self, self.voices[v_name], v_chords, articles=v_articles, **v_meta
                )

    def imply_empty_vbmeasure(self, voice):
        return VoiceBoundMeasure(self, self.voices[voice], {})
    
    def check_set_elasticks_pattern(self, elasticks_pattern,
            measure=None, previous=None):

        if elasticks_pattern is None:
            if measure is not None:
                elasticks_pattern = measure.elasticks_pattern
            elif previous is not None:
                elasticks_pattern = (
                        previous.elasticks_pattern
                            if previous and self.stressor is previous.stressor
                            else Stressor(str(self.stressor.cumlen))
                    )
            else:
                elasticks_pattern = Stressor(str(self.stressor.cumlen))
                
        if isinstance(elasticks_pattern, str):
            elasticks_pattern = Stressor(elasticks_pattern)
        if isinstance(elasticks_pattern, Stressor):
            elasticks_pattern = elasticks_pattern.tick_values()
        mult, _ = divmod(self.stressor.cumlen, len(elasticks_pattern))

        if _: raise RuntimeError(
                "elasticks_pattern length must divide stress_pattern "
                f"without remainder. remainder is {_}"
            )
        self.elasticks_pattern = []
        for e in elasticks_pattern:
            self.elasticks_pattern.extend([e] * mult)


    def get_length_calculator(self, diff):

        if not 0 < diff <= 1:
            raise ValueError(f"diff(={diff}) must be in range 0] to 1]")

        cumlen = self.stressor.cumlen
        units = ceil( cumlen / diff )
        diff = cumlen / units

        elasticks_pattern = self.elasticks_pattern

        if self.elasticks_shape and elasticks_pattern:
            shaped_elasticks_pattern = []
            elasticks_shape = self.elasticks_shape
            elasticks_shape = elasticks_shape.render(
                len(elasticks_pattern), is_length_factor=False
            )
            for ep, es in zip(elasticks_pattern, elasticks_shape):
                shaped_elasticks_pattern.append(ep ** es)
            elasticks_pattern = shaped_elasticks_pattern

        elasticks_sum = sum(elasticks_pattern)
        elasticks_len = len(elasticks_pattern)
        for i in range(elasticks_len):
            elasticks_pattern[i] *= elasticks_len / elasticks_sum

        elastick_factors = []
        for i in range(units):
            # TODO: Bug, Unwucht bei diff < 1, z.B. 0.5
            mult, span = divmod(i * diff, 1)
            span = 1 - span
            factor = min(span/diff,1) * elasticks_pattern[int(mult)]
            if span < diff:
                mult, span = divmod((i+1) * diff, 1)
                try:
                    factor += min(span/diff,1) * elasticks_pattern[int(mult)]
                except IndexError:
                    if int(mult) > len(elasticks_pattern): raise
            elastick_factors.append(factor)

        tempo_profile = [
            tempo / factor for tempo, factor in zip(
                self.tempo_shape.render(
                    units, is_length_factor=False, y_scale=True
                ),
                elastick_factors
            )
        ]

        def tpm_to_seconds(tempo):
            s = 60 * cumlen / (units * tempo)
            return s

        def calc(offset, length):
            """ calculates offset and length of a note depending on length
                and tempo of current measure.
                If offset is negative, take absolute value for that calculation
                but finally mirror it to negative again. For length assume
                offset = 0.
            """
            offset_i, offset_r = divmod(abs(offset), diff)
            offset_sum = sum(
                    tpm_to_seconds(i)
                        for i in tempo_profile[0:int(offset_i)]
                ) + offset_r / diff * tpm_to_seconds(
                    tempo_profile[int(offset_i)]
                )

            end_offset_i, end_offset_r = divmod( 
                    length + max(offset, 0), diff
                )
            length_sum = sum(
                    tpm_to_seconds(i)
                        for i in tempo_profile[0:int(end_offset_i)]
                ) + (
                    end_offset_r / diff
                      * tpm_to_seconds(tempo_profile[int(end_offset_i)])
                      if end_offset_i < len(tempo_profile)
                      else 0
                ) - (offset_sum if offset > 0 else 0)
            if offset < 0:
                offset_sum *= -1
            return offset_sum, length_sum

        return calc, tuple(x / self.stressor.sub_cumlen() for x in tempo_profile)
                     # 2nd argument enable people to reconstruct the tick numbers
                     # from offset and length values in seconds as are listed in the
                     # pre-midi note table, so they can set their MIDI clocks
                     # appropriately and can therefore approach the original offsets
                     # and lengths more precisely.

    def general_tuner(self):

        if self.tuning is None:
            tuning = ['+0'] * self.stressor.cumlen
        else:
            tuning = []
            last_end = 0
            for m in re.finditer(r'\.\d*|([+-]?\d+)?(?(1)\w*|\w+)', self.tuning):
                if m.group(1) and m.group(1)[0] not in "+-":
                    raise ScoreError(f"tuning does not support numbers without sign: {m.group(0)}")
                if last_end != m.start():
                    in_between_str = self.tuning[ last_end : m.start() ]
                    if not in_between_str.isspace(): raise RuntimeError(
                        "Could not parse substring in tuning: "
                        + in_between_str
                        )
                i = m.group(0)
                if i.startswith('.'): tuning.extend(
                        ['+0'] * int(m.group(0)[1:] or 1)
                    )
                else:
                    tuning.append(m.group(0))
                    syntracer(
                        "tuning", offset=len(tuning)-1,
                        shift=int(re.match(r'(?:.\d+)?', m.group(0))[0] or 0),
                        scale=re.search(r'(?:[a-z]\w*\b)?', m.group(0))[0]
                              or None
                    )
                last_end = m.end()
            if len(tuning) != self.stressor.cumlen:
                raise(RuntimeError(
                    "Tuning length does not match stressor length: "
                    "len({}) = {} in a measure with {} ticks".format(
                        self.tuning, len(tuning), self.stressor.cumlen
                    )
                ))

        last_offset = 0
        scale = ''

        def getint(tuning):
            nonlocal scale
            number, this_scale = re.fullmatch(r'([+-]\d)?(\w*)', tuning).groups()
            if this_scale:
                scale = this_scale
            return int(number or 0)

        def calc(offset):
            nonlocal last_offset

            offset = int(offset) + 1

            if offset > last_offset:
                diff_offset = offset - last_offset
                first_i = last_offset
                last_i = first_i + diff_offset
                ret = sum(getint(i) for i in tuning[first_i:last_i])
                last_offset = offset
                return f"{ret:+d}" + scale
            elif offset == last_offset:
                return 0
            else:
                raise RuntimeError(
                    "Wrong order: offset must be greater than last_offset"
                )
            pass

        return calc


class VoiceBoundMeasure(Measure):
    __slots__ = ('measure', 'voice', 'chords', 'ticks', 'articles')

    def __init__(
            self, measure, voice, ch_data,
            stressor=None,
            lower_stress_bound=None,
            upper_stress_bound=None,
            elasticks_pattern=None,
            elasticks_shape=None,
            articles=None,
        ):

        self.measure  = measure
        self.voice    = voice
        if ch_data:
            shape_continual_article_props(voice.articles, _log=False)
        self.stressor = stressor or measure.stressor
        self.tempo_shape = measure.tempo_shape
        self.ticks    = { t for t in ch_data }

        if lower_stress_bound:
            shape = continuum(lower_stress_bound)
        else:
            shape = measure.lower_stress_bound

        self.lower_stress_bound = shape.render(
                self.stressor.cumlen, y_scale=True
            )

        if upper_stress_bound:
            shape = continuum(upper_stress_bound)
        else:
            shape = measure.upper_stress_bound

        self.upper_stress_bound = shape.render(
                self.stressor.cumlen, y_scale=True
            )

        self.check_set_elasticks_pattern(elasticks_pattern, measure)

        if elasticks_shape is None:
            self.elasticks_shape = measure.elasticks_shape
        elif elasticks_shape:
            self.elasticks_shape = Shape.from_string(elasticks_shape)
        else:
            self.elasticks_shape = None

        if articles is None:
            self.articles = self.voice.articles
        else:
            articles['all'] = dict(
                self.voice.articles['all'],
                **articles.get('all', {})
            )
            self.articles = dict(self.voice.articles, **articles)

        if not isinstance(ch_data, dict):
            ch_data_d = defaultdict(list)
            offset = 0
            for note in ch_data:
                if isinstance(note, (int, float)):
                    offset += note
                    ch_data_d[offset] = voice.saved_chord
                else:
                    if isinstance(note, dict):
                        offset += note.pop('offset', 0)
                    ch_data_d[offset].append(note)
                voice.saved_chord = ch_data_d[offset]

            ch_data = ch_data_d

        self.chords   = ch_data

    def stress_of_tick( self, tick, end ):

        tick = int(tick)

        ls = self.lower_stress_bound[ max(0, tick) ]
        us = self.upper_stress_bound[ max(0, tick) ]

        if ls > us:
            raise ValueError("Lower stress exceeds upper stress")

        return ls + (us-ls) * self.stressor.of(tick, end or 1)

    def __iter__(self):

        def shall_log_article_reconfig(article, property_name):
            a = self.voice.articles.get(article)
            return not(
                a and self.articles[article][property_name]
                   == a.get(property_name)
            )

        notes = {}

        chords = {}

        synttr = syntracer("bar.voice", self.voice.name)

        with deeper_level("voice"):
            for renderer in shape_continual_article_props(
                    self.articles, _log=shall_log_article_reconfig):
                renderer(self.stressor.cumlen)

        for key, value in self.chords.items():
            if isinstance(key, str):
                if key.strip("0123456789,*+"):
                    synttr("motif", label=key)
                    with deeper_level("motif", add=1):
                        for _ in Chord(self.voice, value, self.articles,
                                put_all_into_segment=key):
                            pass
                    self.voice.segments[key].mode = 'r'
                else:
                    for o in key.split(","):
                        m = re.fullmatch(r"(\d+)(?:\+(\d+)(?:\*(\d+))?)?", o)
                        if m:
                            start_offset = int(m.group(1))
                            offset_dist = int(m.group(2) or 0)
                            if offset_dist:
                                times = int(m.group(3) or 1)
                                for i in range(times):
                                    chords[start_offset + i * offset_dist] = value
                            else:
                                chords[start_offset] = value
                        else:
                            raise SyntaxError(
                                    f"offset '{o}' cannot be resolved to a list of integers"
                                )
            else:
                chords[key] = value

        if len(chords) == 1 and 0 in chords:
            multiticks = False
        else:
            multiticks = True
  
        for tick, chord in chords.items():
            if multiticks: score_position.offset(tick)

            synttr("offset", tick=tick)

            if not isinstance(chord, list):
                note = chord
                chord = [note]

            with deeper_level("offset", add=1):
                for offset, note in Chord(self.voice, chord, self.articles):
                    orig_offset = offset
                    offset += tick
                    slot = notes.setdefault(offset, [])
                    for prop, prop_value in note.properties.items():
                        if isinstance(prop_value, list):
                            try:
                                note.properties[prop] = prop_value[int(offset)]
                            except IndexError as e:
                                raise ScoreError(
                                    f'offset {offset} beyond note property resolution ({len(prop_value)})'
                                )
                    slot.append(note)

        for offset, chord_notes in notes.items():
            self.calculate_stress_for_notes(offset, chord_notes)

            for note in chord_notes:
                lrpos = note.properties.pop('_LRpos', None)
                zpos = note.properties.pop( '_Zpos', None)
                position = self.voice.relative_position_for_tone(lrpos, zpos)
                yield offset, (position, note)

        for sgmt in self.voice.segments.values():
            sgmt.trim_and_erase_mode_flag()

    def calculate_stress_for_notes(self, offset, notes):
        dynamic_stress = self.stress_of_tick(
                offset, offset + max(c.netlength for c in notes)
            )
        max_weight = max(n.weight[0] for n in notes)
        for note in notes:
            note.stress = (
                20 * log(note.weight[0] / max_weight, 10)
                    + dynamic_stress + note.weight[1]
            )

class MultiMeasure:

    class IncompletelyDigested(ScoreError):
        pass

    class cycler:
        is_completed = False
        voice = None
        offset = None
        article = None
        property = None
        cpos = 0

        def __init__(self, my_list):
            items = []
            my_list_r = []
            for i in my_list:
                if i == '':
                    my_list_r.append(None)
                elif i == '+':
                    my_list_r.append(True)
                elif i == '-':
                    my_list_r.append(False)
                elif (m := re.match(r'%(\d+)', str(i))):
                    my_list_r.append(items[ int(m.group(1))-1 ])
                else:
                    if isinstance(i, (int, float)):
                        pass
                    elif i[bool(i.startswith("-")):].isdecimal():
                        i = int(i)
                    elif all(j.isdecimal() for j in re.split('[.e]', i[bool(i.startswith("-")):], 2)):
                        i = float(i)
                    items.append(i)
                    my_list_r.append(i)

            self.values = my_list_r

        def __iter__(self):
            while True:
                this = self.values[self.cpos]
                self.cpos += 1
                if self.cpos == len(self.values):
                    self.cpos = 0
                    self.is_completed = True
                yield this

    def __init__(self, structure, name, *args, loop, overwrite_meta, **kwargs):
        self.loop_cnt = loop
        self.meta = {}
        self.name = name
        self.overwrite_meta = overwrite_meta
        self.cyclers = []
        props = (
                'stress_pattern', 'elasticks_pattern', 'elasticks_shape',
                'lower_stress_bound', 'upper_stress_bound',
                'beats_per_minute', 'tuning')
        for slot in props:
            if slot not in kwargs: continue
            c = self.get_cycler(kwargs[slot])
            c.property = slot
            self.cyclers.append((c, iter(c)))
        self.v_motifs = {}
        for voice, d in structure.items():
            if isinstance(d, str):
                d = {0: [d] }
            elif isinstance(d, list):
                d = {0: d}
            if '_meta' in d:
                v_meta = d.pop('_meta')
                for key, value in v_meta.items():
                    c = self.get_cycler(value)
                    c.voice = voice
                    c.property = key
                    self.cyclers.append((c, iter(c)))
            if '_articles' in d:
                v_articles = d.pop('_articles')
                for key, values in v_articles.items():
                    for propname, value in values.items():
                        c = self.get_cycler(value)
                        c.voice = voice
                        c.article = key
                        c.property = propname
                        self.cyclers.append((c, iter(c)))
            for offset, notes in d.items():
                if isinstance(offset, int) or offset[0].isdecimal():
                    pass
                else:
                    self.v_motifs.setdefault(voice, {})[offset] = notes
                    continue
                notes = notes if isinstance(notes, list) else [notes]
                for seq in notes:
                    c = self.get_cycler(seq)
                    c.voice = voice
                    c.offset = offset
                    self.cyclers.append((c, iter(c)))

            
    @staticmethod
    def get_cycler(prop):

        def _flatten(string):
            stack = []
            depth = max((len(x) for x in re.findall(r"\|+", string)), default=0)
            for i in range(depth+1): stack.append([])
            for sgmt in re.split(r"\s+\|", string):
                m = re.match(r"\|*\s?", sgmt)
                lvl = depth - len(m.group(0)) + 1
                sgmt = sgmt[m.end():]
                if (times := re.match(r"\s*(\*(?:\d+|\**))", sgmt)):
                    times = times.group(1)
                    if times.strip("*") == '':
                        times = len(times)
                    else:
                        times = int(times[1:])
                    for i in range(times):
                        for l in stack[:lvl]: l.extend(stack[lvl])
                else: # normal measure with content
                    for l in stack[lvl:]: l.clear()
                    for l in stack: l.append(sgmt)
            return stack[0]

        return MultiMeasure.cycler(_flatten(prop) if isinstance(prop, str) else prop)

    def sub_measures(self):

        measures = []
        voice = None
        seen = {}
        for _ in range(self.loop_cnt):
            measure = {"_id": f"{self.name}[{_}]"}
            for c, it in self.cyclers:
                this_val = next(it)
                if this_val is None: continue
                if all(x is None for x in (c.voice, c.article)):
                    measure.setdefault("_meta", {})[c.property] = this_val
                    voice = None
                elif c.article is not None:
                    voice = measure.setdefault(c.voice, {})
                    articles = voice.setdefault('_articles', {})
                    prop = articles.setdefault(c.article, {})
                    prop[c.property] = this_val
                elif c.offset is not None:
                    voice = measure.setdefault(c.voice, {})
                    offset = voice.setdefault(c.offset, [])
                    offset.append(this_val)
                else:
                    voice = measure.setdefault(c.voice, {})
                    voice.setdefault("_meta", {})[c.property] = this_val

                seen[c.voice] = {}

            if self.v_motifs:
                for voice, motifs in self.v_motifs.items():
                    measure[voice].update(motifs)
                self.v_motifs = None

            measure.setdefault("_meta", {}).update(self.overwrite_meta)

            yield measure

        incomplete = []
        for c, it in self.cyclers:
            count = 0
            while not c.is_completed:
                val = next(it)
                count += 1
            if hasattr(c, 'offset'):
                if c.offset in seen[c.voice]:
                    seen[c.voice][c.offset] += 1
                else:
                    seen[c.voice][c.offset] = 0
            if count == 0: continue
            elif all(x is None for x in (c.voice, c.article)):
                incomplete.append(f"{c.property} in _meta ({count} left)")
            elif c.article is not None:
                incomplete.append(
                        f"{c.property} in {c.voice}, article "
                        f"'{c.article}' ({count} left)"
                    )
            elif c.offset is not None:
                incomplete.append(
                        f"offset[{c.offset}][{seen[c.voice][c.offset]}] "
                        f"in {c.voice} ({count} left, last value {val})"
                    )
            else:
                incomplete.append(
                        f"{c.property} in {c.voice} meta ({count} left)"
                    )

        if incomplete:
            raise MultiMeasure.IncompletelyDigested(
                "Loop ended prematurely, more measures pending: "
              + ", ".join(incomplete)
            )
