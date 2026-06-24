import os
from collections import defaultdict
from glob import glob
from Sompyler.synthesizer import SAMPLING_RATE

units = {'K': 3, 'M': 6, 'G': 9, 'T': 12}
def int_wo_unit(number): # integer with/without (w/o) units resolved
    if (unit := number[-1]) in units:
        number = int(number[:-1]) * 10 ** units[unit]
    else:
        number = int(number)
    return number

try:
    _UNIT_LIMIT, _UNIT_SHAPE_COORDS_MAX, _TOTAL_LIMIT,\
        _TOTAL_PLAYING_SECONDS_MAX, _CACHE_QUOTA = (
            int_wo_unit(x) for x in os.environ['SOMPYLER_LIMITS'].split(':')
        )
except KeyError:
    _UNIT_LIMIT = _UNIT_SHAPE_COORDS_MAX = _TOTAL_LIMIT = \
            _TOTAL_PLAYING_SECONDS_MAX = _CACHE_QUOTA = 0

_used = 0


class ExceededLimitsError(RuntimeError):
    pass


class ExceededUnitLimitsError(ExceededLimitsError):
    pass


class QuotaUsedUpError(ExceededLimitsError):
    pass


class ExceededDiskUsageLimitError(ExceededLimitsError):
    pass


def check_play_time_used(samples_cnt):
    ps = play_seconds = samples_cnt / SAMPLING_RATE
    if not _TOTAL_PLAYING_SECONDS_MAX: ps = 0
    if ps > _TOTAL_PLAYING_SECONDS_MAX:
        raise ExceededLimitsError(
            f"{play_seconds} > {_TOTAL_PLAYING_SECONDS_MAX} seconds"
            " - Piece too long."
        )

def get_unit_shape_coords_observer():

    _used = 0

    def _observer(shape):
        nonlocal _used
        if shape is None: return
        _used += sum(c.z for c in shape.coords)
        if _used > _UNIT_SHAPE_COORDS_MAX:
            raise ExceededLimitsError(
                f"{_used} > {_UNIT_SHAPE_COORDS_MAX} shape coordinates"
                " - Sound too complex."
            )
        return shape

    return _observer if _UNIT_SHAPE_COORDS_MAX else lambda x: x

def observe_computing_resources(samples_cnt):
    global _used

    if _UNIT_LIMIT and samples_cnt > _UNIT_LIMIT:
        raise ExceededUnitLimitsError(f"{samples_cnt} > {_UNIT_LIMIT}")

    if _TOTAL_LIMIT and _used + samples_cnt > _TOTAL_LIMIT:
        raise QuotaUsedUpError(f"{_used}+{samples_cnt} > {_TOTAL_LIMIT}")

    _used += samples_cnt


def observe_cache_quota(directory, not_used):

    total_size = 0
    not_used_rank = defaultdict(list)

    # 1. Sum up overall size of cached *.npy files
    # 1a. Register, when found, files that are not used
    for fpath in glob(os.path.join(directory, "*.npy")):
        fsize = os.stat(fpath).st_size
        total_size += fsize
        if fpath in not_used:
            not_used_rank[ (-not_used[fpath], fsize) ].append(fpath)

    def iterate():
        nonlocal total_size
        for slot in sorted(not_used_rank):
            _, fsize = slot
            files = not_used_rank[slot]
            for f in files:
                os.remove(os.path.join(directory, f))
                yield
                del not_used[f]
                total_size -= fsize

    def observer(size):
        nonlocal total_size
        if _CACHE_QUOTA == 0: return
        it = iterate()
        while (tsize := total_size + size) > _CACHE_QUOTA:
            try: next(it)
            except StopIteration:
                raise ExceededDiskUsageLimitError(f"{tsize} > {_CACHE_QUOTA}")
        total_size += size

    observer(0)
    return observer
