from .instrument import Instrument
from ..limits import observe_cache_quota, check_play_time_used
from ..syntaxtracer import initialize_ast_log, default_noop, deeper_level
from tempfile import mkdtemp, gettempdir
from glob import glob
from itertools import islice
from yaml import safe_load as load
from warnings import warn
import sys, os, numpy, traceback, pickle, base64

CHUNK_OF_NOTES_REVERBED_AT_ONCE = 20
cached_files_dir = None
room = None
reverbs = None

syntracer = default_noop()

def filename_for_instrument_cache(i):
    return base64.urlsafe_b64encode(
            bytes(i, encoding="utf-8")
        ).decode() + ".instr"

def instrument_check(instrument, absfile):

    cached_instrument_path = os.path.join(
            cached_files_dir, filename_for_instrument_cache(instrument)
        )

    if isinstance(absfile, str):
        timestamp = os.path.getmtime(absfile)
    else:
        timestamp = (
                absfile.pop( "NOT_CHANGED_SINCE" ).timestamp()
                if "NOT_CHANGED_SINCE" in absfile
                else 0
            )
        if not timestamp and os.path.exists(cached_instrument_path):
            from datetime import datetime
            timestamp = os.path.getmtime(cached_instrument_path)
            print(
                "NOTE to save you time: "
                "Score-Inlined " + instrument + " always recompiled and its "
                "tones re-rendered unless it has got set an explicit "
                "NOT_CHANGED_SINCE: " + (
                    datetime.fromtimestamp(int(timestamp))
                    .strftime('%Y-%m-%d %H:%M:%S')
                ) +
                " entry to update whenever you have made "
                "changes to that instrument.", file=sys.stderr
            )
            

    instrument_is_cached = os.path.isfile(cached_instrument_path)

    if (instrument_is_cached
            and os.path.getmtime(cached_instrument_path) > timestamp
        ):
        syntracer("instrument", instrument, cached=True,
            NOT_CHANGED_SINCE=timestamp
        )
        return os.path.getmtime(cached_instrument_path)

    else:
        syntracer("instrument", instrument, NOT_CHANGED_SINCE=timestamp)
        with open(cached_instrument_path, 'wb') as f, deeper_level():
            pickle.dump( Instrument(absfile), f )
        if not instrument_is_cached:
            return os.path.getmtime(cached_instrument_path)
        else:
            return False


def play(score_fn, monitor, measure_is_in, workers=None,
        substitute_instruments=None, room=False
    ):

    from ..score import Score, ScoreError # can't write that on top of module
                              # to avoid circular import
    from ..score.position import getinstance as position

    global cached_files_dir, reverbs

    if os.path.isdir(score_fn):
        score_fn = os.path.join(score_fn, "score")

    score_fh = open(score_fn, 'r')
    score = Score(score_fh)

    cached_files_dir = (
            score.directory if os.path.isfile(
                os.path.join(score.directory, ".use_dir_as_cache")
            )
            else get_prepared_tempdir(score_fn)
        )

    with initialize_ast_log(os.path.join(cached_files_dir, "ast.log")):

        score.prepare()

        if substitute_instruments is None:
            substitute_instruments = {}

        voices = score.stage.voices
        for voice, otherfile in substitute_instruments.items():
            voices[voice].instrument = otherfile

        registry_file = os.path.join(cached_files_dir, 'registry')
        if not os.path.exists(registry_file):
            open(registry_file, 'w').close()

        def tonefile_check(tone_id):
            fn = tone_id_to_filename(tone_id, "snd.npy")
            if os.path.isfile(fn):
                return os.path.getmtime(fn)
            else:
                return False

        score.load_prev_run_cache(
                registry_file=open(registry_file,'r+'),
                instr_check=instrument_check,
                tonefile_check=tonefile_check,
            )

        try:
            unused, distinct_notes = score.notes_feed_1st_pass(monitor, measure_is_in)
        except ScoreError as e:
            print(f"Error at note {position()}", file=sys.stderr)
            raise

    if workers is None or workers > 1:
        import multiprocessing 
        pool = multiprocessing.Pool(
            processes=workers,
            initializer=initialize_worker,
            initargs=[cached_files_dir]
        )
        mymap = pool.imap_unordered
    elif workers:
        mymap = map
    else:
        def just_quit(*args):
            if (notes_to_render := len(distinct_notes)):
                exit(
                    f"No heavy rendering of {notes_to_render} notes, "
                    "leaving output file empty due to arg '--workers=0'.\n"
                )
            yield from []
        mymap = just_quit

    unused_cnt = {}

    try:
        with open(
                os.path.join(cached_files_dir, "unused_tone.files"), "r"
            ) as unused_fh:

            for line in unused_fh:
                fname, cnt = line.split()
                unused_cnt[fname] = int(cnt)
                if not fname.endswith(".snd.npy"):
                    unused_cnt[fname] += 1
    except FileNotFoundError:
        pass

    for note_id in unused:
        fname = tone_id_to_filename(note_id, "snd.npy")
        unused_cnt.setdefault(fname, 0)
        unused_cnt[fname] += 1

    for used_again in set(
            int(fname.split(".")[0].rsplit(os.sep, 1)[1])
                for fname in unused_cnt.keys()
                 if fname.endswith(".snd.npy")
        ) - set(unused):
        del unused_cnt[ tone_id_to_filename(used_again, "snd.npy") ]

    with open(
            os.path.join(cached_files_dir, "unused_tone.files"), "w"
        ) as unused_fh:

        for fname, cnt in unused_cnt.items():
            print(f"{fname} {cnt}", file=unused_fh)

    monitor.delete_orphan_notes( len(unused) )

    observer = observe_cache_quota(cached_files_dir, unused_cnt)

    for note_id, is_new, frames, length in mymap(
            render_tone, distinct_notes
        ):
        
        if frames is None:
            raise NoteRenderingFailure(note_id)

        if is_new: observer(
            os.stat(
                tone_id_to_filename(note_id, "snd.npy")
            ).st_size
        )

        monitor.rendered_note(note_id, length)

        score.set_length_for_note(note_id, frames)

    score_fh.close()

    from ..shapereverb import Room, FreeField

    if room is False:
        if score.room:
            warn(
                    "A room definition is embedded into the score. Use it "
                    "with --room flag to get reverb. Without it is ignored,"
                    " Will use free field."
                )
        room = FreeField()
    elif room is None:
        if score.room:
            room = Room(**score.room)
        else:
            warn(
                    "The score is lacking a room definition. "
                    "Sounds are rendered in the free field."
                )
            room = FreeField()
    else:
        from .. import FROM_BASE_DIR
        if score.room: warn(
                "As requested we will ignore room definition in the score, "
                "will reverberate with virtual room " + room
            )
        room = Room(**load(open(FROM_BASE_DIR(
                "lib", "rooms", room,
                ending="splr",
                prefer_directory=score.real_directory
            ))))

    total_length_for_pos, distinct_notes_iter = score.notes_feed_2nd_pass()
    total_length = 0

    my_reverbs = {}

    for position, position_total_len in total_length_for_pos.items():
        pos_dep_reverb = room.position(*position)
        my_reverbs[position] = pos_dep_reverb
        total_length = max(
                total_length,
                position_total_len + pos_dep_reverb.total_reverb_size()
            )

    if workers is None or workers > 1:
        pool = multiprocessing.Pool(
            processes=workers,
            initializer=initialize_room,
            initargs=[room, my_reverbs]
        )
        mymap = pool.imap_unordered
    else:
        reverbs = my_reverbs
        mymap = map

    check_play_time_used(total_length)

    if hasattr(monitor, 'total_per_position'):
        add_to_total_all_positions = 0 
        for position, reverb in my_reverbs.items():
            add_to_total_all_positions += (
                len(monitor.total_per_position[1][position])
              * reverb.total_reverb_size()
              # * (reverb.left_reverb[0].size + reverb.right_reverb[0].size)
            )
        monitor.total_per_position[0] = (
            monitor.total_per_position[0],
            add_to_total_all_positions
        )

    monitor.switch_to_room_reverb_assembler_progress()

    samples = numpy.zeros( (total_length, 2) )

    sliced_notes = lambda: islice(
            distinct_notes_iter, CHUNK_OF_NOTES_REVERBED_AT_ONCE
        )

    while (notes := list(sliced_notes())):
        for note_id, position, reverbed_tone, slices in mymap(
                get_tone_from_reverbs, notes
            ):
            monitor.apply_tone(note_id, position, [s.start for s in slices])
            for slc in slices: samples[slc] += reverbed_tone
            monitor.rendered_note(note_id, reverbed_tone.shape[0])

    monitor.report_cache_directory(cached_files_dir)

    return samples


def get_prepared_tempdir(scorefile):
    score_file = os.path.abspath(scorefile)
    for t in glob(os.path.join(gettempdir(), 'sompyler_cached-notes*/score')):
        if os.readlink(t) == score_file:
            tempdir = os.path.dirname(t)
            break
    else:
        tempdir = mkdtemp(prefix='sompyler_cached-notes-')
        open( os.path.join(tempdir, ".use_dir_as_cache"), 'w' ).close()
        os.symlink( score_file, os.path.join(tempdir, "score") )

    return tempdir


def initialize_worker(tempdir):
    global cached_files_dir
    cached_files_dir = tempdir

def initialize_room(my_room, my_reverbs):
    global room, reverbs
    room = my_room
    reverbs = my_reverbs

instruments = dict() # Instrument objects reside here for the lifetime of
                     # the process. Because of circular inner references,
                     # they would stick in memory anyway.

def get_cached_instrument(instrument):

    if instrument not in instruments:

        cache_file = os.path.join(
                cached_files_dir,
                filename_for_instrument_cache(instrument)
            )

        with open(cache_file, "rb") as f: 
            i = pickle.load(f)

        instruments[instrument] = i

    return instruments[instrument]


def render_tone(info):

    note_id, instrument, pitch, stress, length, properties = info

    instrument = get_cached_instrument(instrument)
    filename = tone_id_to_filename(note_id, "snd")
    is_new = not os.path.isfile(filename)
    err_file = tone_id_to_filename(note_id, "err")

    try:
        tone = instrument.render_tone(
            pitch, length, stress, properties
        )
    except RuntimeError as e:
        exc = traceback.format_exception(f"Worker raised {type(e)}", e, e.__traceback__)
        with open(err_file, "w") as fh:
            fh.writelines(exc)
        return note_id, is_new, None, length
    else:
        if os.path.exists(err_file):
            os.unlink(err_file)

    numpy.save( filename, tone )
    framelen = len(tone)

    if isinstance(length, tuple): length = sum(length[:2])

    return note_id, is_new, framelen, length


def tone_id_to_filename(id, ext):
    return os.path.join( cached_files_dir, "{:05d}.{}".format(id,ext) )

def get_tone_from_reverbs(info):

    note_id, position, slices = info

    tone = numpy.load(
        tone_id_to_filename(note_id, "snd.npy")
    ).reshape(-1)

    reverbed_tone = reverbs[position].apply_reverb_to_sound(tone)
    return note_id, position, reverbed_tone, [slice(i, i + reverbed_tone.shape[0]) for i in slices]

class NoteRenderingFailure(Exception):

    def __init__(self, note_id):
        self.note_id = note_id

    def orig_info(self):
        with open(tone_id_to_filename(self.note_id, "err"), "r") as f:
            return f.read()
