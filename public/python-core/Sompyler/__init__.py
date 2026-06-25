import os

def FROM_BASE_DIR(*args, ending=None, prefer_directory=None):
    *dirpath, fpath = args
    if '.' not in fpath and ending is not None:
        fpath = '.'.join((fpath, ending))
    if fpath[0] in './' and 'SOMPYLER_LIMITS' not in os.environ:
        return fpath
    if '../' in fpath:
        raise FileNotFoundError(fpath)
    if prefer_directory is not None and os.path.isfile(
            (fullpath := os.path.join(prefer_directory, fpath))
        ):
        return fullpath
    else:
        return os.path.join(os.path.dirname(__file__), "..", *dirpath, fpath)


class Progress:
    def new_note(self, note_id, length_s, position, description): pass
    def rendered_note(self, note_id, length_s): pass
    def reuse_note(self, note_id): pass
    def retune_notes(self, offset, htonic): pass
    def reuse_former_note(self, note_id): pass
    def delete_orphan_notes(self, count): pass
    def next_measure(self, number, cumlength): pass
    def assemble(self, total_length): pass
    def switch_to_room_reverb_assembler_progress(self): pass
    def apply_tone(self, note_id, position, offsets): pass
    def report_cache_directory(self, cache_dir): pass
    def emit_premidi_note(self, abstime, channel, keynum, length, stress,
                          comment=None, **further): pass
    def emit_premidi_comment(self, comment, **further_opts): pass
