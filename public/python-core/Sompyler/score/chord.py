import re
from .note import Note
from ..synthesizer.shape import Shape
from . import position
from ..syntaxtracer import default_noop
from collections import defaultdict

syntracer = default_noop()

class Chord:

    def __init__(
           self, voice, notes, articles,
           put_all_into_segment=None
        ):

        self.voice      = voice
        self.notes      = [*notes] if isinstance(notes, list) else [notes]
        if isinstance(self.notes[0], dict) and not(
                {'P', 'pitch'} & set(self.notes[0].keys())
            ):
            attributes, *self.notes = self.notes
            self.sustain = attributes.pop("sustain", 0)
            if not isinstance(self.sustain, list):
                self.sustain = [self.sustain]
            self.damp = attributes.pop("damp", 0)
        else:
            attributes = {}
            self.sustain = [0]
            self.damp = None
        all_attrib = {}
        for key, value in list(attributes.items()):
            if len(key) > 1:
               del attributes[key]
               all_attrib[key] = value
        if all_attrib:
            attributes['all'] = all_attrib
        self.articles   = {**articles}
        if attributes:
            for key, value in attributes.items(): self.articles[key] = {
                    **self.articles.get(key, {}), **value
                }
        self.write_sgmt = put_all_into_segment

        if (damp := self.damp) is not None:
            ticklen = sum(self.sustain)
            if isinstance(damp, str):
                damp = Shape.from_string(damp)
                self.damp = damp.render(ticklen)
            else:
                self.damp = [damp] * ticklen

    def __iter__(self):

        written_segments = {}

        has_multi_lines = len(self.notes) > 1
        for _, note in enumerate(self.notes):
            if has_multi_lines: position.line(_+1)

            if isinstance(note, str) and note.startswith('<'):
                if '>' in note:
                    read_from, write_to = note[1:].split('>')
                    write_to = re.split(r',\s*', write_to.strip())
                else:
                    read_from = note[1:]
                    write_to = []
                read_from = re.split(r',\s*', read_from.strip())
                def it():
                    base_offset = 0
                    has_multi_rf = len(read_from) > 1
                    for s, sgmt in enumerate(read_from):
                        if ':' in sgmt:
                            sgmt, chord = sgmt.split(":", 1)
                            if (m := re.search(r"\[(.+?)\]$", chord)):
                                chord = chord[:m.start()]
                                subseg = m.group(1)
                            else:
                                subseg = None
                            position.motif(sgmt)
                        else:
                            chord = subseg = None
                        if has_multi_rf: position.stem(s+1)
                        sgmt = self.voice.segments[sgmt]
                        sgmt.chord = chord
                        syntracer("motif", sgmt, chord=chord)
                        notes = ( sgmt.sub(base_offset, subseg) if subseg
                             else sgmt.notes(base_offset)
                        )
                        for offset, note in notes:
                            yield offset, note, write_to
                        base_offset += sgmt.length
                    return base_offset

            else:
                note_it = lambda note: Note.from_score(
                        instrument=self.voice.instrument, properties=note,
                        articles=self.articles
                    )
                if isinstance(note, str):
                    if '>' in note:
                        note, write_to = note.split('>', 1)
                    else:
                        write_to = None
                    has_multi_stem = False
                    def chained(note):
                        nonlocal has_multi_stem
                        last_sep = ', '
                        while ', ' in note or ' ; ' in note:
                            has_multi_stem = True
                            pre, sep, note = re.split(
                                    r"((?:,| ;)\s+)", note, 1
                                )
                            yield last_sep, pre
                            last_sep = sep
                        yield last_sep, note
                    def it():
                        max_offset = 0
                        last_n = None
                        stemno = 0
                        for sep, n_str in chained(note):
                            if has_multi_stem:
                                stemno += 1
                                position.stem(stemno)
                            if sep[0] == ',':
                                stem_type = 'adj'
                                min_offset = max_offset
                                if n_str.startswith('.'):
                                    max_offset += int(n_str[1:])
                                    syntracer("adj_pause_ticks", int(n_str[1:]))
                                    continue
                            else:
                                stem_type = 'par'
                            if ' ' not in n_str and last_n:
                                n_str = re.sub(r"^\S+", n_str, last_n)
                            my_it = note_it(
                                    f'{n_str}>{write_to}' if write_to
                                                          else n_str
                                )
                            syntracer(f"{stem_type}_note", n_str.split()[0])
                            try:
                                while True:
                                    o, n, s = next(my_it)
                                    o += min_offset
                                    yield o, n, s
                            except StopIteration as e:
                                this_offset = min_offset + e.value
                                if this_offset > max_offset:
                                    max_offset = this_offset
                            last_n = n_str
                        return max_offset
                else:
                    it = lambda: note_it(note)

            my_it = it()

            try:
                while True:
                    offset, note, segments = next(my_it)

                    note_pos = position.getinstance()
                    if self.write_sgmt:
                        note_pos.motif = (
                                f"L{note_pos.line}." if note_pos.line else ""
                            ) + '.'.join(note_pos.stem_with_chain())
                        segments.append(self.write_sgmt)

                    if note.position and isinstance(
                            (motif := note.position.motif), tuple
                        ):
                        note_pos = (note_pos, note.position)

                    note.set_position(note_pos)

                    for sgmt_name in segments:
                        sgmt = written_segments[sgmt_name] = \
                                self.voice.segments.setdefault(
                                        sgmt_name, Segment()
                                )
                        sgmt.save_note(offset, note)

                    sustain = 0
                    for sus in self.sustain:
                        if sustain > offset: break
                        sustain += sus

                    if (tl := note.length.ticks_left) == note.length.net_ticks:
                        note.length.ticks_left += max(0, sustain - offset - tl)

                    if self.damp:
                        try:
                            note.length.damp = self.damp[
                                int(offset + note.length.net_ticks)
                            ]
                        except IndexError:
                            note.length.damp = self.damp[-1]
                    yield offset, note

            except StopIteration as e:
                for s in written_segments.values():
                    s.final_length(e.value)


class SegmentUsageError(RuntimeError):
    pass

class Segment:
    __slots__ = ('offset_notes', 'length', 'mode', 'chord', 'cursor')

    def __init__(self):
        self.mode = None
        self.cursor = 0

    def save_note(self, offset, note):
        if self.mode is None:
            self.offset_notes = defaultdict(list)
            self.mode = 'w'
            self.length = 0
        elif self.mode == 'w':
            pass
        else:
            raise SegmentUsageError("Cannot write to segment"
                    "read from in same measure")
        self.offset_notes[offset].append(note.copy())

    def final_length(self, length):
        self.length = max(self.length, length)

    def trim_and_erase_mode_flag(self):
        if self.mode == 'w':
            min_offset = min(self.offset_notes.keys())
            offset_notes = {}
            for offset, notes in self.offset_notes.items():
                offset_notes[ offset - min_offset ] = notes
            self.length -= min_offset
        self.mode = None

    def notes(self, base_offset):
        if self.mode == 'w':
            raise SegmentUsageError("Cannot read from segment"
                    " written to in same measure")
        else:
            self.mode = 'r'

        for offset, notes in self.offset_notes.items():
            if self.chord is None:
                if notes[0].pitch.isdecimal():
                    raise RuntimeError(
                            "Dynamically pitched motif reference missing "
                            "initial key and chord indication"
                        )
                for note in notes:
                    yield base_offset + offset, note.copy()
            else:
                first_it = True
                for note in notes:

                    pint = 0
                    def adder(m):
                        nonlocal pint
                        pint += int(m.group(1))
                        return ""

                    note = note.copy()

                    if re.split(r"[+-]", note.pitch, 1)[0].isdecimal():
                        pstr = re.sub(r"([+-]?\d+)(?:k|(?!\w))", adder, note.pitch)
                        note.pitch = re.sub(
                                r"(?:([+-]\d+)k?)?$",
                                lambda m: pstr + "{:+d}k".format(
                                    int(m.group(1) or 0) + pint
                                ), self.chord
                            )
                        first_it = False
                    elif first_it:
                        raise RuntimeError(
                            "Within a dynamic motif assignment "
                            f"initial pitches must be integer, but this is {note.pitch}"
                        )

                    yield base_offset + offset, note

    def sub(self, base_offset, string):
        m = re.match(r"""
            (?P<presign>[+-])?
            (?P<offset>\d+)?
            (?P<sep>(?:(?<=\d)|^):|\+)
            (?P<length>\d+)
            (?P<postsign>[+-])?
        """, string, re.VERBOSE)
        if not m:
            raise SegmentUsageError(f"Sub-segment syntax error in '{string}'")

        offset = int(m.group('offset') or self.cursor)
        if (sep := m.group('sep') ) == '+':
            end = offset + int(m.group('length'))
        else:
            end = int(m.group('length'))
        self.cursor = end

        presign = m.group("presign")
        postsign = m.group("postsign")

        # if presign == '-':
        #     # tones always begin from their original offset
        #     # even if this means shifting the nominal offset
        #     # of the sub-segment. So, presign and postsign - match.
        # elif presign == '+':
        #     # pause until first tone originally starting within
        #     # sub-segment range. So, presign and postsign + match.
        # else: pass
        #     # tones are chopped at start if they originally start earlier

        # if postsign == '+':
        #     # tones retain their full length even if that means
        #     # they exceed nominal length of the sub-segment range
        # elif postsign == '-':
        #     # suppress tones that exceed nominal sub-segment range
        # else:
        #     # tones are chopped at end of sub-segment range

        for n_offset, note in self.notes(0):
            if n_offset + note.netlength <= offset:
                print(f"{n_offset}+{note.netlength}<{offset}")
                continue
            if not n_offset < end:
                print(f"not {n_offset}<{end}")
                continue
            if n_offset < offset:
                if presign == '+':
                    print(f"{n_offset}<{offset} with presign '+'")
                    continue
                if presign != '-':
                   breakpoint()
                   note.netlength -= n_offset
                   n_offset = 0
            if n_offset + note.netlength > end:
                if postsign == '-':
                    print(f"{n_offset}+{note.netlength}>{end} with postsign .-'")
                    continue
                if postsign != '+':
                    note.netlength -= end - note.netlength - n_offset
            if n_offset: n_offset -= offset
            yield base_offset + n_offset, note
