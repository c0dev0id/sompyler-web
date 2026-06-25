import re
from . import position as score_position, ScoreError
from ..syntaxtracer import default_noop, deeper_level
from dataclasses import asdict

syntracer = default_noop()

class Note:
    """ Abstract description of a tone

    Mandatory properties: pitch in Hz, length in seconds, stress

    Optional properties:
      * occurrences in the score, expected as tuple of three values:
        * position in the time line, in seconds
        * volume on the left channel, on the range 0.0 (mute) to 1.0 (max. vol)
        * volume on the right channel, on the range 0.0 (mute) to 1.0 (max. vol)
        (First or only occurrence can be given as "occurrence" parameter to
        the constructor, but any further need to be passed by
        note.add_occurrence(time_pos, left_pos, right_pos).)
      * num_samples, if known or tone has been calculated
      * 'am_shape', 'fm_shape' and other, instrument-specific properties

    """

    __slots__ = (
        'instrument', 'weight', 'stress', 'pitch', 'orig_pitch', 
        'netlength', 'length', 'num_samples',
        'properties', '_occurrences', 'position', 'head'
    )

    def __init__(
            self, instrument, pitch, length, weight,
            head=None, occurrence=None, num_samples=None, netlength=None,
            damp=0.0,
            **properties
        ):


        self.instrument = instrument
        self.pitch = pitch
        self.netlength = netlength # netlength is length without pedaling
        self.length = (
            length if isinstance(length, GatheredLength) else GatheredLength(
                netlength, length, damp
            )
        )
        self.head = head
            # note head if the note originates from a chain
        try:
            self.stress = float(weight)
        except TypeError:
            self.weight = weight
        self.properties = properties
        self.position = None

        self._occurrences = []

        if occurrence is not None:
            self.add_occurrence(*occurrence)

        if num_samples is not None:
            self.num_samples = num_samples

    @classmethod
    def from_score(
            cls, instrument, properties, articles
        ):

        if isinstance(properties, str):
            properties = parse_properties(properties)
         
        if 'pitch' not in properties:
           properties['pitch'] = properties.pop("P")
        if 'length' not in properties:
           properties['length'] = properties.pop("L", None)
        w = properties.get('weight', 1)
        if not isinstance(w, tuple):
            properties['weight'] = ( w, properties.pop("adj_stress",0) )

        displayed = {**properties}
        displayed.pop("chain", None)
        if isinstance((L := displayed.pop('length', None)), tuple):
            displayed['real_length'] = L[0]
            displayed['eff_length'] = L[1]
        if isinstance((W := displayed.get('weight', None)), tuple):
            displayed['weight'] = None if W[0] == 1 else W[0]
            displayed['extra_stress'] = W[1] or None
        syntracer("stem_note", **displayed)

        def notes_chain():
            if 'chain' in properties:
                if isinstance(properties['length'], str):
                    properties['length'] = tuple( int(x) for x in length.split(":", 1) )
                elif isinstance(properties['length'], (int, float)):
                    properties['length'] = (None, properties["length"])
                it = expanded_note_properties(articles, **properties)
                try:
                    while True: yield next(it)
                except StopIteration as e:
                    return e.value
            else:
                length = properties['length']
                if length is None:
                    length = 1
                length += articles['all'].pop("adj_length", 0)
                properties['netlength'] = properties['length'] = length
                for key, value in articles['all'].items():
                    properties.setdefault(key, value)
                yield properties
                return length

        notes_it = notes_chain()
        try:
            while True:
                props = next(notes_it)
                offset_ticks = props.pop('shift', 0)
                length_ticks = float(
                        props.pop('length')
                    )
                weight = props.pop('weight')

                pitch = props.pop('pitch')

                segments = props.pop('write_to', [])

                props.pop('position', None)

                off = props.pop('off_scale', None)
                if off is True:
                    pitch = pitch + '!'
                elif off is False:
                    pitch = pitch + '?'

                yield offset_ticks, cls(
                    instrument, pitch, length_ticks, weight, **props
                ), segments
        except StopIteration as e:
            return e.value


    @classmethod
    def from_csv(cls, instrument, pitch, length, stress, num_samples, *other):
        properties = {}
        for assignmt in other:
            prop, value = assignmt.split('=', 1)
            try:
                f_value = float(value)
                if value == str(int(f_value)): value = int(value)
                else: value = f_value
            except ValueError:
                if value in ('True', 'False', 'None'):
                    value = eval(value)
            properties[prop] = value
        properties['num_samples'] = int(num_samples)
        note = cls(instrument, pitch, 0, stress, **properties)
        note.length = length
        return note

    def copy(self):
        newinstance = self.__class__(
            self.instrument, self.pitch, self.length,
            self.weight, netlength=self.netlength, **self.properties
        )
        newinstance.position = score_position.PositionPath(**asdict(self.position))
        return newinstance

    def add_occurrence(self, time_position, position):
        self._occurrences.append( (time_position, position) )
        
    def add_occurrences_of(self, other):
        for time_pos, position in other._occurrences:
            self.add_occurrence(time_pos, position)

    def is_unused(self):
        return not self._occurrences

    def occurrence_iter(self):
        return (o for o in self._occurrences)

    def _sorted_properties_tuple(self):

        if 'netlength' in self.properties:
            breakpoint()

        return tuple(
            sorted(
                (i for i in self.properties.items()),
                key=lambda i: i[0]
            )
        )

    def __hash__(self):

        relevant_data = (
                self.instrument,
                str(self.stress),
                str(self.pitch),
                self.length
                    if isinstance(self.length, (str, float, int))
                    else serialized_length_tuple(
                        self.length if isinstance(self.length, tuple)
                                    else self.length.fix()
                    )
            ) + self._sorted_properties_tuple()

        return hash(relevant_data)

    def __eq__(self, other):

        other_length = other.length
        if isinstance(other_length, GatheredLength):
            other_length = serialized_length_tuple(other_length.fix())

        return (
           self.instrument == other.instrument
           and str(self.pitch)  == str(other.pitch)
           and str(self.stress) == str(other.stress)
           and (
              serialized_length_tuple(self.length.fix()) == other_length
                if isinstance(self.length, GatheredLength)
                else str(self.length) == str(other_length)
           )
           and self._sorted_properties_tuple()
            == other._sorted_properties_tuple()
        )

    def __str__(self):
        s = (
                "Note {}{} played by {} at pitch {:0.3f} with stress {:4.3f}, "
                "{:3.3f}s long"
            ).format(
                "{}: {}({:d})".format(self.position, *self.orig_pitch),
                f", head '{self.head}'" if self.head is not None
                                        and self.head != self.position.article
                                        else '',
                self.instrument, self.pitch, self.stress, self.length_seconds()
            )
        if self.properties:
            s += " (Further properties: " + str(self.properties) + ")"
        return s

    def to_csvible_tuple(self):
        if isinstance(self.length, GatheredLength):
            length_secs = serialized_length_tuple(self.length.fix())
        else:
            length_secs = self.length
        if isinstance(length_secs, tuple):
            length_secs = serialized_length_tuple(length_secs)
        elif not isinstance(length_secs, str):
            length_secs = str(round(length_secs, 6))
        return (
            self.instrument, self.pitch, length_secs, self.stress
        ) + (self.num_samples,) + tuple(
            '{}={}'.format(*i) for i in self._sorted_properties_tuple()
        )

    def set_position(self, position):

        if self.position is None:
            self.position = position
        else:
            if isinstance(position, tuple):
                position, self.position.motif = position
            for prop in ('measure', 'bar', 'line', 'offset'):
                setattr(self.position, prop, getattr(position, prop))
            if self.position.motif:
                self.position.motif = (position.motif, self.position.motif)

    def length_seconds(self):
        try:
            return self.length.total_seconds()
        except AttributeError:
            return (
                sum(self.length[:2])
                    if isinstance(self.length, tuple)
                    else self.length
            )
class NoteImparsible(ScoreError): pass

NOTE_PROPERTIES_RX = re.compile(r"""
        (?P<pitch>\S+)(?:\s+(?P<length>\d+(?=[:.\s]|$)([:.]\S*)?))?
        (?:\s+(?=[-+\d])(?P<weight>\d+)?(?P<adjintensity>[+-]\d+)?)?
        (?:\s+(?P<chain>[^>]+))? # see below CHAIN_ELEMENT_RX
        (?:\s*>\s*(?P<segments>[\w, ]+))?
        """, re.X
    )

CHAIN_ELEMENT_RX = re.compile(r"""
          \$\d+                     # process next subchain (do not use, internal!)
          | \.(\d+|\.*)             # pause
          | ((?:((?:(?<=;)|^)(?=\D)\w?(?::[a-z]+)*:?
             (?:[+-]\d+|(?:\++|-+|=)(?!\d))?
             (?:\^-?\d+)?)
             (?:[?!]?)
             (?:;(?![\d\s]))?)+
            )
            (_(\d+|_*))?([,;]\d+)?  # with length > 1 ticks
        """, re.X
    )

CHAIN_TONE_RX = re.compile(r"""
          (\w?(?::[a-z]+)*:?|(?=[-+=]))
               # letter, _, or 0len-assert before +|-|=
               # - letter: note attributes of ref'd article
               #   may be extended with len()>1 articles the
               #   attributes of which have priority over
               #   main letter and each other predecessor
               # - _/empty: equals recently used letter + ext
            (([+=-])(?!(?<=_.)\3*\d*_)(?:(?<!=)(\d+|\3*))?)?
                                    # w/o shift of pitch, forbidden after '_'
            ([!?]?)
            (\^-?\d+)?
        """, re.X
    )

OFF_SCALE_FLAGS = {
    '?': False,
    '!': True,
    '': None
}

def parse_properties(string):
    m = NOTE_PROPERTIES_RX.match(string)
    if m:
        props = {
                'pitch': m.group('pitch'),
                'weight': (
                    int(m.group('weight') or 1),
                    int(m.group('adjintensity') or 0),
                    ),
           }
        if props['pitch'][-1] in '!?':
            off = props['pitch'][-1]
            props['pitch'] = props['pitch'][:-1]
            if off == '!':
                props['off_scale'] = True
            elif off == '?':
                props['off_scale'] = False

        length = m.group('length')
        if length and ':' in length:
            items_cnt, length = length.split(":")
            items_cnt = int(items_cnt)
        else:
            items_cnt = None

        chain = m.group('chain')
        if chain:
            props['chain'] = chain

        if length: length = float(length)
        if chain and length and items_cnt:
            props['length'] = (items_cnt, length)
        elif length:
            props['length'] = (None, length) if chain else length
        elif chain:
            props['length'] = (None, None)

        segments = m.group('segments')
        if segments:
            props['write_to'] = re.split(r',\s?', m.group('segments') or '')

    else:
        raise NoteImparsible(string)

    return props

def expanded_note_properties(articles, chain, pitch, **props):

    full_chain = chain
    del chain

    overlength = props.pop('overlength', 0)
    check_offset, total_length = props.pop('length')
    base_weight, base_stress = props.pop('weight', (1,0))

    def resolve_quant(count):
        if count.isnumeric():
            return int(count)
        else:
            return len(count) + 1
    
    def process_clause(clause, pitch, subchains):
        nonlocal offset, note_shift, overlength

        last_letter_ext = 'o'
        position = 0
        while clause:

            m = CHAIN_ELEMENT_RX.match(clause.lstrip())
            if m and len(match := m.group(0)):
                clause = clause[m.end():]
            elif clause:
                raise NoteImparsible(f"clause (end) '{clause}' in '{chain}': Parsing error")

            if match.startswith('$'):
                scno = int(match[1:])
                subchain, times, chainlength, off_scale = subchains[scno]
                if isinstance(chainlength, list):
                    chainlength[1] /= times
                    chainlength = tuple(chainlength)
                else:
                    chainlength /= times
                rep = "subchain"
                syntracer(rep,
                    length=chainlength[1] if isinstance(chainlength, tuple) else chainlength,
                    repeat=times-1 or None
                )
                for _ in range(times):
                    overlength -= min(chainlength[1], overlength)
                    with deeper_level(rep):
                        syntracer("number", scno)
                        for n in expanded_note_properties(
                                articles, subchain, f"{pitch}{note_shift:+d}k",
                                length=chainlength,
                                overlength=overlength,
                                weight=(base_weight, base_stress),
                                **props, off_scale=off_scale
                            ):
                            n['shift'] += offset
                            if 'subchain' not in n:
                                n['subchain'] = (scno, *n['position'])
                            yield n
                    offset += chainlength[1]
                    rep = None

            elif match.startswith("."):
                this_length = resolve_quant(m.group(1))
                offset += this_length
                syntracer("pause", length=this_length)
            else:
                tone_group = m.group(2)

                group = {}

                if m.group(4):
                    netlength = resolve_quant(m.group(5))
                else:
                    netlength = 0
                netlength += 1

                # netlength will be added to the offset of next note.
                # thislength-length will be overlapped by subsequent notes.
                # overlength is used for subsequent notes instead their own
                # length, if that is lower, and to the extend that its end
                # tick is justified to that one of the note overlength has
                # originally applied to.
                overlen = m.group(6)
                thislength = netlength
                if overlen:
                    thislength += int(overlen[1:])
                    if overlen.startswith(";"):
                        overlength = offset + thislength
                group['length'] = max(
                        thislength, overlength - offset
                    )
                group['netlength'] = netlength
                if ";" in tone_group:
                    syntracer("group", **group)

                for tone in tone_group.split(";"):
                    position += 1
                    m = CHAIN_TONE_RX.match(tone)
                    orig_letter = letter = m.group(1)
                    if letter in ('', '_'):
                        letter = last_letter_ext
                    letter, *extended_articles = letter.split(":")
                    if extended_articles and not extended_articles[0]:
                        extended_articles.pop(0)
                        extended_articles = (
                                last_letter_ext.split(":")[1:]
                              + extended_articles
                        )
                    if extended_articles and extended_articles[-1] == '':
                        extended_articles.pop(-1)
                    last_letter_ext = ':'.join([letter, *extended_articles])
                    try:
                        stacked_props = {**articles[letter]}
                        for exa in extended_articles:
                            for key, value in articles[exa].items():
                                stacked_props[key] = value
                    except KeyError as e:
                        raise NoteImparsible(f"article {e.args[0]} not defined")
                    off_scale_flag = OFF_SCALE_FLAGS[m.group(5)]
                    if off_scale_flag is None:
                        off_scale_flag = props.get('off_scale', None)
                    note = {
                        'position': (position, last_letter_ext),
                        'head': m.group(0),
                        **articles['all'],
                        **stacked_props,
                        **props,
                        **group,
                        'off_scale': off_scale_flag,
                    }
                    n_shift = m.group(2)

                    if n_shift == '=':
                        note_shift = 0
                    elif n_shift:
                        sign = m.group(3)
                        quant = resolve_quant(m.group(4))
                        note_shift += (-1 if sign=='-' else 1) * quant

                    stress_adjustment = int(m.group(6)[1:]) if m.group(6) else 0
                    syntracer("note",
                        letter=orig_letter, extended_articles=extended_articles or None,
                        shift=note_shift, stress=stress_adjustment or None, length=
                              None if ";" in tone_group else group['netlength']
                    )

                    note_shift = (
                            note_shift
                          + note.pop('extra_adj_pitch', 0)
                        )

                    adj_pitch = note.pop('adj_pitch_cent_per_key', 0)

                    if adj_pitch:
                        this_pitch = "{}{:+d}c".format(
                                pitch, note_shift * adj_pitch
                            )
                    elif note_shift:
                        this_pitch = "{}{:+d}k".format(pitch, note_shift)
                    else:
                        this_pitch = pitch

                    note[ 'pitch' ] = this_pitch

                    note[ 'weight'] = (
                            base_weight * note.pop('weight', 1),
                            base_stress + note.pop('stress', 0) + (
                                stress_adjustment
                            )
                        )

                    note.setdefault('shift', 0)
                    note['shift'] += offset
                    note['length'] += note.pop("adj_length", 0)
                    yield note

                offset += netlength

    subchains = []
    idx = 0
    chain = full_chain
    while '(' in chain:

        prefix, tail = chain.split('(', 1)
        n = 1
        pos = 0
        for c in tail:
            if c == '(':
                n += 1
            elif c == ')':
                n -= 1
            pos += 1
            if not n: break
        else:
            raise NoteImparsible("Unbalanced parantheses in " + chain)

        embedded, tail = tail[:pos-1], tail[pos:]
        m = re.match(r"(?P<times>\d+)?(?P<offscale>[!?]?)(?:_(?P<chlen>\d+|_*))?", tail)
        tail = tail[len(m.group(0)):]
        chain = f"{prefix}${idx}{tail}"
        chlen = m.group('chlen')
        chlen = 1 + (resolve_quant(chlen) if chlen is not None else 0)
        if (m2 := re.match(r'(\d+):\s?', embedded)):
            embedded = embedded[m2.end():]
            chlen = [int(m2.group(1)), chlen]
        else:
            chlen = [None, chlen]
        subchains.append((
            embedded, int(m.group('times') or 1), chlen,
            OFF_SCALE_FLAGS[m.group('offscale')]
        ))
        idx += 1

    parallel_chains = chain
    offsets = set()

    parallel_count = 0
    for chain in parallel_chains.split("; "):
        if "; " in parallel_chains: syntracer("chain", parallel_count)
        segment_list = []
        note_shift = offset = 0
        has_multi_clusters = len(re.split(r'\s+[^\d*]', chain)) > 1
        cl = 0
        for c, m in enumerate(
                re.finditer(r"\s*([^\s*]+)(?:\s*(\*[\s*\d]*))?", chain)
            ):
            if has_multi_clusters: cl = parallel_count + c + 1
            if m.group(2):
                clause_times = 0
                for i in re.split(
                        r"(?<=[\d*])\s*(?=\*)", m.group(2)
                    ): clause_times += ( int(i[1:].strip())
                            if i.rstrip()[-1].isdecimal()
                            else 1 if clause_times else 2
                    )
            else:
                clause_times = 1

            syntracer("cluster", cl, repeat=clause_times-1 or None)

            rep="cluster"
            for _ in range(clause_times):
                with deeper_level(rep):
                    for n in process_clause(m.group(1), pitch, subchains):
                        n['position'] = (cl, *n['position'])
                        segment_list.append(n)
                rep = None

        parallel_count += c + 1

        if total_length is None:
            total_length = offset
        if check_offset:
            if check_offset != offset:
                raise NoteImparsible(f"Wrong length of chain notes: {offset}, expected {check_offset}")
        elif total_length % offset and offset % total_length:
            raise NoteImparsible(
                f"Wrong length of chain notes: number {offset} not divisible by {total_length} or vice versa."
            )
        length_factor = total_length / offset
        for n in segment_list:
            span = n['length'] + n['shift']
            n['length'] = (min(offset,span) - n['shift']) * length_factor + max(0, span-offset)
            n['netlength'] *= length_factor
            n['shift'] *= length_factor
            if 'subchain' in n:
                sc, cl, pos, article = n.pop('subchain')
                score_position.chainparen(sc+1)
            else:
                cl, pos, article = n['position']
            if cl: score_position.cluster(cl)
            score_position.position(pos)
            score_position.article(article)
            yield n

        offsets.add(offset)

    if len(offsets) > 1:
        raise NoteImparsible(
                "Different lengths of parallel chains in " + full_chain
            )

    return total_length

def serialized_length_tuple(length):
    if isinstance(length, tuple):
        length_secs, added_sustain, sustain_pos = length
        length_secs += added_sustain
        added_sustain /= length_secs
        net_share = str(round(1 - added_sustain, 3))[2:]
        sustain_pos = str(round(sustain_pos, 3))[2:] or '0'
        length_secs = str(round(length_secs, 6))
        return f"{length_secs};{net_share};{sustain_pos}"
    else: return str(round(length, 6))

class GatheredLength:
    __slots__ = (
            'net_ticks', 'ticks_left', 'ticks_reduced', 'net_seconds',
            'sustain_seconds', 'damp'
        )

    def __init__(self, net_ticks, length, sustain_pos):
        self.net_ticks     = net_ticks
        self.ticks_reduced = 0
        self.ticks_left    = length
            # need to be converted to seconds at upper
        self.net_seconds     = 0
        self.sustain_seconds = 0
        self.damp            = sustain_pos
            # level as tempo_shape must be respected.

    def to_tuple(self):
        if self.ticks_left:
            raise RuntimeError(
                    "note not fully converted from ticks to seconds, yet"
                )
        return self.net_seconds, self.sustain_seconds, self.damp

    def convert(self, abslength, real_offset, measure_offset, lencalc):
        lenticks = min(abslength - real_offset, self.ticks_left)
        self.ticks_left    -= lenticks
        if (sustain := self.ticks_reduced + lenticks - self.net_ticks) > 0:
            lenticks -= sustain
        else:
            sustain = 0
        self.ticks_reduced += lenticks + sustain
        this_offset = real_offset - measure_offset
        offset_secs, length_secs = lencalc(this_offset, lenticks)
        if sustain:
            this_offset += lenticks
            _, sustain = lencalc(this_offset, sustain)
        self.net_seconds += length_secs
        self.sustain_seconds += sustain
        return offset_secs

    def total_seconds(self):
        return self.net_seconds + self.sustain_seconds

    def fix(self):
        if not self.sustain_seconds: return self.net_seconds
        else: return self.net_seconds, self.sustain_seconds, self.damp
