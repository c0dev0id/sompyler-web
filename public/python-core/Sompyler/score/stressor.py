from ..syntaxtracer import default_noop

syntracer = default_noop()

def stressor_cycle(parts):

    pos = -1

    def _cursor():
        nonlocal pos
        pos += 1; pos %= len(parts)
        return parts[pos]

    return _cursor

class Stressor:

    __slots__ = ('_tuple', '_next', '_cumlen', '_count', '_all_maxv')

    def __init__(self, strings):

        if isinstance(strings, str):
            strings = strings.split(";")
        else:
            syntracer("subdivision")

        if '/' in strings[0]:
            divisions = []
            parts = []
            with deeper_level("cycling"):
                for part in strings[0].split('/'):
                    parts.append(Stressor([part]))
            if (l := len(set([p._count for p in parts]))) > 1:
                raise RuntimeError(
                    "in stressor definition {';'.join(strings)}, "
                    "not all parts have the same length"
                )
            self._tuple = stressor_cycle(parts)
            self._count = parts[0]._count
        else:
            if ',' in strings[0]:
                divisions = strings[0].split(',')
                log = True
            else:
                d = int(strings[0])
                divisions = ['1'] * d
                syntracer("levels", d)
                log = False
            steps = []
            for step in divisions:
                if '-' in step:
                   minv, maxv = step.split('-', 1)
                   if log: syntracer("level", min=minv, max=maxv)
                else:
                   maxv = step
                   minv = 0
                   if log: syntracer("level", step)
                steps.append( (int(minv), int(maxv)) )
            self._tuple = tuple(steps)
            self._count = len(steps)
            self._all_maxv = max( i[1] for i in self._tuple )

        if len(strings) > 1:
            next_stressor = Stressor(strings[1:])
            s = self
            if callable(self._tuple):
                self._cumlen = next_stressor.cumlen
            else:
                parts = [ self ]
            for s in parts:
                s._next = next_stressor
                s._cumlen = next_stressor.cumlen
        else:
            self._next = None
            self._cumlen = 1

    @property
    def cumlen(self): return self._count * self._cumlen

    def sub_cumlen(self): return self._cumlen

    def of(self, start, end, _range=None):

        if callable(self._tuple):
            self = self._tuple()

        if (start or 0) < 0:
            new_start = start % self.cumlen
            end += new_start - start
            start = new_start

        if start in (0, None):
            dm_start = (0, None)
        else:
            dm_start = (
                int(round(start) / self._cumlen),
                start % self._cumlen
            )

        if end == 0:
            return []
        elif end is None:
            dm_end = (self._count, 0)
        else:
            dm_end = (
                int(round(end) / self._cumlen),
                end % self._cumlen
            )

        R = (*self._tuple[dm_start[0]], self._all_maxv)
        tlen = len(self._tuple)
        if self._next:
            if dm_start[0] == dm_end[0]:
                poslist = self._next.of(dm_start[1], dm_end[1], _range=R)
            else:
                poslist = []
                poslist.extend(self._next.of(dm_start[1], None, _range=R))
                for pos in range(dm_start[0]+1, dm_end[0]):
                    R = (*self._tuple[pos % tlen], self._all_maxv)
                    poslist.extend(self._next.of(None, None, _range=R))
                R = (*self._tuple[dm_end[0] % tlen], self._all_maxv)
                poslist.extend(self._next.of(None, dm_end[1], _range=R))
        else:
            poslist = []
            if dm_start[0] == dm_end[0]:
                poslist.append(dm_start[0])
            else:
                poslist.extend(
                        range(dm_start[0], min(tlen, dm_end[0]))
                    )
                roundabouts = False
                for _ in range(0, 0 if end is None else dm_end[0] // tlen):
                    roundabouts = True
                    poslist.extend(range(0, min(tlen, dm_end[0])))
                if roundabouts:
                    poslist.extend(range(0, dm_end[0] % tlen))
            poslist = [ self._tuple[i][1] / R[2] for i in poslist ]

        if _range is None:
            return max(poslist[:min(self._cumlen, round((len(poslist)+1)/2))])
        else:
            Rlmin, Rlmax, Ramax = _range
            return [
                ((Rlmax - Rlmin) * e + Rlmin) / Ramax
                    for e in poslist
            ]

    def lengths(self):
        this = self
        lengths = []
        while this:
            lengths.append(len(this._tuple))
            this = this._next
        return lengths

    def tick_values(self):
        return self.of(0, None, _range=(0, 1, 1))
