from yaml import safe_load_all as load_all, safe_load as load
import re, sys, numpy, csv
from math import log
from collections import defaultdict
from os import path, readlink, getpid, environ
from ..synthesizer import SAMPLING_RATE
from ..intonation import Tuner
from .. import FROM_BASE_DIR
from . import position as position_in_score
from Sompyler.syntaxtracer import default_noop, deeper_level

DEFAULT_MEASURE_PROPS = {
    'beats_per_minute': 60,
    'stress_pattern': '1',
    'upper_stress_bound': 100,
    'lower_stress_bound': 100,
    'skip': False,
}

syntracer = default_noop()

class ScoreError(RuntimeError):
    pass

from .measure import Measure, MultiMeasure
from .stressor import Stressor
from .stage import Stage
from .note import Note

class Score:

    def __init__(self, file):

        self._yamliter = load_all(file)
        self.directory = path.dirname( path.abspath(file.name) )

        try:
            linkedfile = readlink(file.name)
            self.real_directory = path.dirname(linkedfile)
        except OSError:
            self.real_directory = self.directory

    def prepare(self):

        metadata = next(self._yamliter)

        if not any(x in metadata for x in ('solo', 'stage', 'title', 'room')):
            metadata = { 'solo': metadata }

        info = { k: metadata.pop(k) for k in (
                        'title', 'composer', 'arranger', 'license', 'edition',
                        'source'
                    ) if k in metadata
                }

        if info: syntracer('info', **info)

        if 'measures' in metadata:
            if isinstance(metadata['measures'], list):
                self._yamliter = iter(metadata.pop('measures'))
            else:
                global DEFAULT_MEASURE_PROPS
                DEFAULT_MEASURE_PROPS = metadata.pop('measures')
                DEFAULT_MEASURE_PROPS['.common_for_all'] = True
        tuning_config = metadata.pop("tuning", None)
        if isinstance(tuning_config, dict):
            if 'inherit' in tuning_config:
                tuner = Tuner(FROM_BASE_DIR(
                    "lib", tuning_config.pop('inherit'), ending="splt",
                    prefer_directory=self.real_directory
                ))
            else:
                tuner = Tuner(FROM_BASE_DIR("lib", "tones_euro_de+en.splt"))
            tuner = tuner.derive(**tuning_config)
        elif tuning_config:
            tuner = Tuner(**tuning_config)
        else:
            tuner = Tuner(FROM_BASE_DIR("lib", "tones_euro_de+en.splt"))

        self.tuner = tuner

        inlined_instruments = {}

        for instr in list(metadata.keys()):
            if instr.startswith("instrument "):
                inlined_instruments[ instr[11:] ] = metadata.pop(instr)

        self.room = metadata.pop('room', None)

        if 'solo' in metadata:
            stage = metadata.setdefault('stage', {})
            self.solovoice = "solo"
            if isinstance(metadata['solo'], str):
                stage[self.solovoice] = f"1|1 0 {metadata['solo']}"
            else:
                inlined_instruments[self.solovoice] = metadata['solo']
                stage[self.solovoice] = {
                        "direction": "1|1",
                        "distance": 0,
                        "instrument": self.solovoice,
                    }
            del metadata['solo']
        else:
            self.solovoice = False

        articles = metadata.pop('articles', None)
        if articles:
            for label, props in articles.items():
                syntracer("article", label, **props)

        self.stage = Stage(
            metadata['stage'].pop('_space', '0|1:0'),
            metadata.pop('stage'),
            inlined_instruments,
            tuner,
            articles,
        )

        if metadata:
            raise ScoreError("Unprocessed metadata " + ' '.join(metadata))


    def load_prev_run_cache(self, registry_file, instr_check, tonefile_check):

        prev_run_cache = {}

        instruments = { v.instrument for v in self.stage.voices.values() if v }
        uptodate_instruments = dict()

        for instrument in instruments:

            if instrument in self.stage.inlined_instruments:
                data_or_fileref = self.stage.inlined_instruments[instrument]
                if environ.get("SOMPYLER_REFRESH_EMBEDDED_CACHED_INSTR"):
                    data_or_fileref.pop("NOT_CHANGED_SINCE", None)
            else:
                data_or_fileref = FROM_BASE_DIR(
                        "lib", "instruments", instrument,
                        ending="spli", prefer_directory=self.real_directory
                    )

            mtime = instr_check( instrument, data_or_fileref )
            if mtime:
                uptodate_instruments[instrument] = mtime

        csvreader = csv.reader(registry_file)
        note_cnt = 1
        for t in csvreader:
            note = Note.from_csv(*t)
            prev_run_cache[ note ] = note_cnt
            note_cnt += 1

        notes = [None] * note_cnt
        notes[0] = prev_run_cache
        for note, note_id in prev_run_cache.items():
            notes[note_id] = note

        self._registry_file = registry_file
        self._distinct_notes = notes
        self._tonefile_check = tonefile_check
        self._uptodate_instruments = uptodate_instruments


    def notes_feed_1st_pass(self, monitor, measure_is_in):

        msmit = None
        def flattened_measures():
            nonlocal msmit
            while True:
                if msmit:
                    try:
                        yield from msmit
                    except StopIteration:
                        msmit = None
                try:
                    yield next(self._yamliter)
                except StopIteration:
                    break

        def flattened_notes():
            nonlocal msmit

            prev_measure = None
            prev_cumlength = 0
            deferred = {}

            mno = 0

            for m in flattened_measures():
                mno += 1
                monitor.next_measure(mno, prev_cumlength)
                if self.solovoice:
                    if isinstance(m, dict):
                        meta = m.pop('_meta', None)
                        if m and not any(
                                isinstance(x, int)
                             or x.translate({
                                    ord(x): None for x in ',*+'
                                 }).isdecimal()
                             for x in m
                           ):
                            m = { 0: [m] }
                    else:
                        meta = None
                    if m: m = {self.solovoice: m }
                else:
                    meta = m.pop('_meta', None)

                if meta is None:
                    if '.common_for_all' in DEFAULT_MEASURE_PROPS:
                        meta = { **DEFAULT_MEASURE_PROPS }
                        del meta['.common_for_all']
                    elif prev_measure:
                        meta = {}
                    else:
                        meta = DEFAULT_MEASURE_PROPS
                    if '_loop' in m:
                        for key, value in meta.items():
                            meta[key] = [value]
                last = meta.pop('is_last', False)
                overmeta = {
                     'voices': self.stage.voices,
                     'previous': prev_measure,
                }
                if '_id' in m:
                    name = m.pop('_id') 
                    if name is None:
                        name = str(mno)
                else:
                    pname = re.sub(r"\[\d+\]$", '', prev_measure.name) if prev_measure else '0'
                    if pname[-1] not in '0123456789':
                        pname = pname + '+0'
                    name = re.sub(
                            r'\d+$',
                            lambda m: f'{int(m.group(0))+1:0{len(m.group(0))}}',
                            pname
                        )
                if '_loop' in m:
                    loop_cnt = m.pop('_loop')
                    meta['overwrite_meta'] = overmeta
                    m = MultiMeasure(m, name, loop=loop_cnt, **meta)
                    msmit = m.sub_measures()
                    m = next(msmit)
                    m = Measure(m, m.pop('_id'), **m.pop('_meta'))
                else:
                    overmeta.update(meta)
                    m = Measure(m, name, **overmeta)
                    msmit = None
                position_in_score.measure(m.name)
                mnotes = defaultdict(list)
                ticks = {1}

                def init_lencalc(m):
                    return lambda unit: m.get_length_calculator(unit)

                lencalcs = { None: init_lencalc(m) }

                for voice, offsets_notes in deferred.items():
                    lencalcs[voice] = init_lencalc(m.imply_empty_vbmeasure(voice))
                    for orig_offset, pos_notes in offsets_notes.items():
                        mnotes[(voice, orig_offset)].extend(pos_notes)
                        for _, n in pos_notes:
                            ticks.add( min(m.length, n.length.net_ticks, n.length.ticks_reduced) )

                abslength = m.stressor.cumlen

                notes_to_tune = {}

                # Tune the notes depending on their offset.
                # That has an effect only when un-equal temperatures are applied
                with deeper_level("bar"):
                    gen_tuner = m.general_tuner()

                if measure_is_in(mno):
                   for vbmeasure in m:

                       single_beat_length = vbmeasure.stressor.sub_cumlen()

                       monitor.emit_premidi_comment(
                               "MEASURE",
                               abstime=prev_cumlength,
                               number=mno,
                               beats=vbmeasure.stressor.cumlen//single_beat_length,
                               orig_ticks_per_beat=single_beat_length
                       )

                       lencalcs[vbmeasure.voice.name] = init_lencalc(vbmeasure)

                       offset_notes = deferred.get(vbmeasure.voice.name, {})
                       for (offset, _), notes in offset_notes.items():
                           syncopated_notes = [
                                   n[1] for n in notes
                                     if -offset < single_beat_length
                                                <= n[1].netlength/2
                               ]
                           if syncopated_notes:
                               vbmeasure.calculate_stress_for_notes(
                                   offset, syncopated_notes
                               )

                       v_id = id(vbmeasure.voice)
                       position_in_score.voice(vbmeasure.voice.name)
                       for offset, pos_note in vbmeasure:
                           mnotes[(vbmeasure.voice.name, offset)].append(pos_note)
                           notes_to_tune.setdefault(offset, {}).\
                                   setdefault(
                                       v_id, [vbmeasure.voice.tuner]
                                   ).append(pos_note[1])
                           ticks.add(offset)
                           ticks.add(min(
                               abslength - offset, pos_note[1].length.ticks_left
                           ))

                for offset in sorted(notes_to_tune.keys()):
                    shift_tonic_steps = gen_tuner(offset)
                    if shift_tonic_steps:
                        self.tuner.retune(shift_tonic_steps)
                        monitor.retune_notes(
                                offset, self.tuner.tuning_shift()
                            )
                    for tuner, *notes in notes_to_tune[offset].values():
                        for note in notes:
                            orig_pitch = note.pitch
                            key, note.pitch = tuner(note.pitch)
                            note.orig_pitch = (orig_pitch, key)

                shift_tonic_steps = gen_tuner(m.stressor.cumlen-1)
                if shift_tonic_steps:
                    self.tuner.retune(shift_tonic_steps)

                (last_elem, *ticks) = sorted(set(round(t, 2) for t in ticks))

                unit = 1
                for i in ticks:
                    diff = i - last_elem
                    if diff < unit:
                        unit = diff
                    last_elem = i

                for v_name, lencalc in lencalcs.items():
                    lencalcs[v_name], tempo_profile = lencalc(unit)
                    if v_name is None: continue
                    self.stage.voices[v_name].tempo_profile = tempo_profile

                deferred.clear()

                mnotes = sorted(mnotes.items(), key=lambda n: (
                            0 if isinstance(n[0][1], tuple) else n[0][1]
                        )
                    )

                voice_name = None
                for (voice_name, offset), pos_notes in mnotes:
                    real_offset = 0 if isinstance(offset, tuple) else offset

                    for (position, note) in pos_notes:

                        offset_secs = note.length.convert(
                                abslength, real_offset, max(m.measure_cut, 0),
                                lencalcs[voice_name]
                            )

                        offset_secs += prev_cumlength + m.offset
                        if note.length.ticks_left == 0 and isinstance(offset, tuple):
                            offset_secs = offset[1]

                        if note.length.ticks_left > 0:
                            slot = deferred.setdefault(voice_name, {})
                            slot = slot.setdefault((
                                (offset[0] if isinstance(offset, tuple)
                                           else offset) - m.length,
                                offset_secs
                            ), [])
                            slot.append((position, note))
                        else:
                            note.add_occurrence(
                                    offset_secs, position
                                )
                            yield ( self.stage.voices[voice_name].tempo_profile[
                                        int(real_offset)
                                    ],
                                    note
                                )

                if measure_is_in(mno) and not m.skip:
                    prev_cumlength += lencalcs[voice_name](
                        max(m.measure_cut,0), m.length
                    )[1] + m.offset

                prev_measure = m

                if last: break

            # deferred dictionary should be empty, but pending notes might be left.
            # Raise an error in this case.
            unfulfilled_voices = []
            max_exceeding = 0
            for voice, notes in deferred.items():
                def niter(): return (
                        ntup[1] for nlist in notes.values()
                                 for ntup in nlist
                    )
                unfulfilled_notes = re.sub(r",(?=[^,]+$)", " and",
                    ", ".join(f"{n.orig_pitch[0]} exceeds by {n.length.ticks_left} ticks"
                        for n in niter()
                    ))
                if unfulfilled_notes: unfulfilled_voices.append(
                    f"Voice {voice} has pending overlong notes: {unfulfilled_notes}"
                )
                else: continue
                max_exceeding = max(max_exceeding, max(
                    n.length.ticks_left for n in niter()
                ))
            if max_exceeding:
                unfulfilled_voices = "; ".join(unfulfilled_voices)
                raise ScoreError(
                        f"Score is {max_exceeding} ticks short: {unfulfilled_voices}. "
                        f"Fix lengths of these notes or, when checked, append "
                            + str(int(max_exceeding/m.length) + 1)
                        + " pairs of '---' and '{}' lines to the score"
                          " signifying measures without any beginning notes."
                    )

        voice_count = 0
        voice_names = {}
        for name, voice in self.stage.voices.items():
            if voice and voice.instrument not in voice_names:
                voice_names[ voice.instrument ] = name
                monitor.emit_premidi_comment(
                    "VOICE", name=name, instrument=voice.instrument
                )

        distinct_notes = list()
        last_bpm = 0
        for bpm, note in flattened_notes():

            note_id = self._distinct_notes[0].get( note )
            occ = next(note.occurrence_iter())

            bpm = round(bpm, 3)
            if bpm != last_bpm:
                monitor.emit_premidi_comment("CLOCK", bpm=bpm, abstime=occ[0])
                last_bpm = bpm

            monitor.emit_premidi_note(
                    occ[0], voice_names[ note.instrument ],
                    note.orig_pitch[1], "{:f} (net {:.1f} ticks)".format(
                        round(note.length_seconds(), 6), note.netlength
                    ),
                    note.stress, tfid=note_id or len(self._distinct_notes),
                    pitch=f'{note.orig_pitch[0]}={note.pitch:.3f}',
                    **note.properties
                )

            if note_id:

                distinct_note = self._distinct_notes[note_id]
                first_use = distinct_note.is_unused()
                distinct_note.add_occurrences_of(note)

                if not first_use:
                    monitor.reuse_note(
                            note_id, occ, str(note), note.length_seconds()
                        )
                    continue

                elif (
                       note.instrument in self._uptodate_instruments
                       and self._uptodate_instruments[note.instrument]
                           < self._tonefile_check(note_id)
                     ):

                    monitor.reuse_former_note(
                            note_id, occ, str(note), note.length_seconds()
                        )
                    continue

            else:
                note_id = len(self._distinct_notes)
                self._distinct_notes[0][note] = note_id
                self._distinct_notes.append(note)

            monitor.new_note(
                    note_id, occ, str(note), length=note.length_seconds()
                )

            distinct_notes.append((
                    note_id, note.instrument, note.pitch, note.stress,
                    note.length.fix(), note.properties
                ))

        monitor.emit_premidi_comment("FINALLY DONE")

        unused_notes = []
        for note_id, note in enumerate(self._distinct_notes[1:]):
            note_id += 1
            if note is None: breakpoint()
            if note.is_unused():
                unused_notes.append(note_id)

        return unused_notes, distinct_notes

    def set_length_for_note(self, note_id, length):
        note = self._distinct_notes[note_id]
        note.num_samples = length

    def notes_feed_2nd_pass(self):

        self._registry_file.seek(0)
        csv_w = csv.writer(self._registry_file)
        for note in self._distinct_notes[1:]:
            csv_w.writerow(note.to_csvible_tuple())

        self._registry_file.close()

        def occiter(occ):
            for offset, position in occ:
                offset = int(round( SAMPLING_RATE * offset ))
                yield offset, position

        total_end_offset_for_position = defaultdict(int)

        for note in self._distinct_notes[1:]:

            if note.is_unused(): continue

            for offset, position in note.occurrence_iter():
                end_offset = max(
                    total_end_offset_for_position[position],
                    int(round(SAMPLING_RATE * offset)) + note.num_samples
                )
                total_end_offset_for_position[position] = end_offset

        def note_iter():
            for note_id, note in enumerate(self._distinct_notes[1:]):
                note_id += 1
                if note.is_unused(): continue
                occ_at_pos = {}
                for slc, pos in occiter(note.occurrence_iter()):
                    slices = occ_at_pos.setdefault(pos, [])
                    slices.append(slc)
                for position, time_pos in occ_at_pos.items():
                    yield note_id, position, time_pos

        return total_end_offset_for_position, note_iter()
