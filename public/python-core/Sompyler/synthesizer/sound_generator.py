# -*- coding: utf-8 -*-
from .sympartial import Oscillator, log_to_linear
from .envelope import Envelope, Shape, CONSTANT_SUSTAIN as _default_shape
from .shape.point import SympartialPoint
from . import normalize_amplitude, SAMPLING_RATE
from ..limits import get_unit_shape_coords_observer
from ..syntaxtracer import default_noop, deeper_level
from math import ceil, log
import numpy as np
import re
from itertools import repeat, chain

syntracer = default_noop()

class SoundGenerator(Shape):
    __slots__ = ('spread', 'timbre', 'morph', 'railsback',
        'shape_coords_counting_observer'
    )

    def __init__(
            self, *coords, spread=None, timbre=None, morph=None,
            railsback=None
        ):
        super().__init__(*coords)
        self.spread = spread

        self.timbre = timbre
        self.morph = morph
        self.railsback = railsback
        observer = get_unit_shape_coords_observer()
        self.shape_coords_counting_observer = observer
        del self.coords[0]

    @classmethod
    # obsolete, to be deleted.
    def shape(
            cls, initial, the_list, term,
            spread, timbre, morph, railsback
        ):
        """ Get a new SoundGenerator instance. Please note:
            This function is not called __init__() just because
            we later need to call __init__ explicitly from
            the parent, but with us as the actual invocant.
        """

        partial_seqno = 0
        cum_deviation = 0
        def spreaditer():
            nonlocal partial_seqno, cum_deviation
            for dev in chain(spread, repeat(0)):
                cum_deviation += int(dev)
                fix_deviance = _deviate(1, cum_deviation)
                yield lambda deviance: partial_seqno + _deviate(
                        fix_deviance, deviance
                    )
                partial_seqno += fix_deviance


        sprit = spreaditer()

        if initial is None:
            try:
                initial = next(p[2] for p in the_list if p[2] is not None)
            except StopIteration as e:
                raise RuntimeError(
                    "No sympartial found for sound_generator from "
                  + repr(the_list)
                )
        mylist = [(0.0, 0, initial)]

        for p in the_list:
            p = (next(sprit)(p[0]), p[1], p[2])
            mylist.append(p)
    
        if term is None:
            term = next(p[2] for p in reversed(the_list) if p[2] is not None)
    
        mylist.append(( int(mylist[-1][0])+1.0, 0, term ))
    
        last_freq = 0
        last_symp = None
    
        tmp = []
    
        for i1, v in enumerate(mylist):
    
            if len(v) == 2:
                freq0, volume = v
                symp = None
            else:
                freq0, volume, symp = v

            if symp is None:
                tmp.append(i1)
                continue

            for tv in tmp:
                freq = mylist[tv][0]
                volume = mylist[tv][1]
                left = freq - last_freq
                right = freq0 - freq
                dist = left / (left + right)
                mylist[tv] = (
                    freq, volume,
                    last_symp.weighted_average(last_symp, dist, symp)
                )
    
            tmp = []
            last_freq = freq0
            last_symp = symp
    
        soundgen = cls(
                (mylist[-2][0], 0, 1), *mylist[1:-1],
                spread=sprit, timbre=timbre, morph=morph,
                railsback=railsback
            )

        return soundgen

    def timbre_to_base_freq(self, base_freq, force_array=False):

        class PseudoAmplifications:
            def __getitem__(self, ind):
                return 1.0

        return (
                self.shape_coords_counting_observer(self.timbre).render(
                    1, adj_length=( base_freq * self.length )
                ) if self.timbre else np.ones(int(base_freq * self.length)
            ) if force_array else PseudoAmplifications()
        )

    def prepared_iter(self, base_freq, duration=0, *args, **kwargs):

        observed = self.shape_coords_counting_observer

        if 'force_freqs' in kwargs:
            _sympit = self.iterate_coords(tuple_with_neighbourhood=True)
            next(_sympit) # prime it
            sympit = (_sympit.send(freq) for freq in kwargs.pop('force_freqs'))
        else:
            sympit = self.iterate_coords(0)

        if self.morph:
            morpher = self.morph.get_according_shapes()
            morph = lambda x, length: np.array( observed(morpher(x)).render(length) )
        else:
            morph = lambda x, length: 1

        if self.railsback:
            lowf, highf, curve = self.railsback
            if not lowf <= base_freq <= highf:
                raise Exception(
                    "base_freq {} not in range {}-{} "
                    "bounded by railsback".format(base_freq, lowf, highf)
                )
            base_freq *= 2 ** curve[ int(
                    (log(base_freq)/log(lowf))
                  / (log(highf)/log(lowf))
                  * 87
                ) ]

        for shaped in 'shaped_pitch', 'shaped_stress':
            if (kwargs.get(shaped)
                    and isinstance(kwargs[shaped], str)
                ):
                kwargs[shaped] = observed(Shape.from_string(
                    "1:" + kwargs[shaped]
                ))

        def freq_with_neighbours(*sympartial_points):
            ff = sympartial_points[1].x
            partial_seqno = int(round(ff))
            ret = []
            for sp in sympartial_points:
                ret.append(1200 * np.log2(sp.x/partial_seqno))
            return (base_freq * ff, partial_seqno,
                    ret[0] - ret[1] if ret[0] else None,
                    ret[1],
                    ret[2] - ret[1] if ret[2] else None
                )

        def observe_sympartial_shapes(sympartial):
            if (env := sympartial.envelope) is not None:
                for shape in ('attack', 'sustain', 'tail', 'release'):
                    if (shape := getattr(env, shape)) is not None:
                        self.shape_coords_counting_observer(shape)
            for shape in (
                  'amplitude_modulation', 'frequency_modulation', 'wave_shape'
                ):
                if (shape := getattr(sympartial.oscillator, shape)) is not None:
                    try: shape = shape.envelope
                    except AttributeError: pass
                    self.shape_coords_counting_observer(shape)

        amplifications = self.timbre_to_base_freq(base_freq)
        for s in sympit:
            if isinstance(s, tuple):
                prs, s, afs = s
            else:
                prs = afs = s
            freq = base_freq * s.x
            y = s.y + amplifications[ int(freq) - 1 ] - 1
            if freq > SAMPLING_RATE/2:
                break
            observe_sympartial_shapes(s.symp)
            yield (
                    freq if prs is afs else freq_with_neighbours(prs, s, afs),
                    s.symp.render(
                        freq, lambda l: y * morph(s.x, l), duration, **kwargs
                    )
                )

    def render(self, base_freq, duration, stress=100, *args, **kwargs):

        samples = np.array([0.0])

        for _, sympres in self.prepared_iter(
                base_freq, duration, *args, **kwargs
            ):
            len1 = len(samples)
            len2 = len(sympres)
            if len1 > len2:
                sympres = np.append( sympres, np.zeros(len1-len2) )
            elif len2 > len1:
                samples = np.append( samples, np.zeros(len2-len1) )
            samples = samples + sympres
            
        normalize_amplitude(samples, log_to_linear(stress/100))

        return samples

    @classmethod
    def weighted_average(cls, l, dist, r):

        if len(l.coords) != len(r.coords):
            shorter, longer = sorted((l, r), key=lambda s: len(s.coords) )
            lendiff = len(longer.coords) - len(shorter.coords)
            while lendiff:
                x = next(shorter.spread)(0)
                overflowing_x = x / shorter.length
                shorter.coords.append(
                    shorter.coords[-1].new_alike(x=overflowing_x, y=0)
                )
                lendiff -= 1
            for c in shorter.coords: c.x /= overflowing_x
            shorter.length = x

        self = super().weighted_average(l, dist, r,
                orig_form_length_dependent=False
            )
        if l.morph and r.morph:
            self.morph = l.morph.weighted_average(
                   l.morph, dist, r.morph
                )
        else:
            self.morph = l.morph or r.morph

        if l.timbre and r.timbre:
            self.timbre = l.timbre.weighted_average(
                   l.timbre, dist, r.timbre
                )
        else:
            self.timbre = l.timbre or r.timbre

        if (
                l.railsback and r.railsback
                and l.railsback != r.railsback
            ):
            self.railsback = tuple(
                (1-dist)*lr + dist*rr
                     for lr, rr in zip(l.railsback, r.railsback)
            )
        else:
            self.railsback = l.railsback or r.railsback

        def combined_spread():
            for ls, rs in zip(l.spread, r.spread):
                yield lambda deviance: (1-dist)*ls(deviance) + dist*rs(deviance)

        self.spread = combined_spread

        return self

    @classmethod
    def _raise_coords(cls, coords, by_num):
        """ Insert coordinates with y=0 between those with the greatest
            distance to each other. The new coordinates, and the neighbours
            are equally distant.
        """

        distances = {}
        c_last = coords[0]

        new_coords = [c_last]

        for c in coords[1:]:
            distances[c] = c.x - c_last.x
            c_last = c

        sum_dist = sum( d for d in distances.values() )

        remainders = []
        rem_by_num = by_num
        for (c, dist) in distances.items():
             scaled = dist / sum_dist * by_num
             int_scaled = int(scaled)
             remainders.append( (c, scaled - int_scaled) )
             distances[c] = int_scaled
             rem_by_num -= int_scaled

        for (c, _) in sorted(
            remainders, key=lambda x: x[1], reverse=True
        )[0:rem_by_num]:
            distances[c] += 1

        sum_coords = 0
        for i, c in enumerate(coords[1:]):
            inter_coords = distances[c]
            sum_coords += inter_coords

            xlen = c.x - coords[i].x

            for step in range(inter_coords):
                dist = (step+1) / (inter_coords+1) * 1
                x = (1 - dist) * coords[i].x + dist * c.x
                s = c.symp.weighted_average( coords[i].symp, dist, c.symp )
                new_coords.append( SympartialPoint(x, 0, s) )

            new_coords.append(c)

        assert sum_coords == by_num

        return new_coords

    @classmethod
    def _lessen_coords (cls, coords, by_num):
        """ The greater the value on the x-axis, the less its difference to
            x of the previous coordinate and the less also the amplitude (y),
            the more likely is that a coordinate gets dropped.
        """

        distances = {}

        oldlen = len(coords)

        for i, c in enumerate(coords[1:]):
            distances[c] = ( (c.x - coords[i].x) * c.y / c.x, coords[i] )

        sorted_distance_to_prev = [
                (c, d[1]) for c, d in sorted(
                    distances.items(), key=lambda i: i[1][0]
                )
            ]

        distances[coords[0]] = None # just so it can be deleted.

        new_coords = []
        for c, prev in sorted_distance_to_prev[0:by_num]:
            dist = 1.0 * ( c.y / (prev.y or c.y) if c.y else 0 )
            new_coords.append(
                c.weighted_average( prev, dist, c )
            )
            if c in distances:
                del distances[c]
            if prev in distances:
                del distances[prev]

        new_coords.extend( c for c in distances )
        new_coords.sort(key=lambda c: c.x)
        return new_coords

    def __repr__(self):

        return self._base_repr(orig_y=True) + ", " \
            + ", ".join("{}={!r}".format(
                    prop, getattr(self, prop)
                ) for prop in ['timbre', 'morph', 'railsback']
            ) + ")"

    def inspire_profile_from(self, other):
        if len(other.coords) == 1 and other.coords[0].symp.no_own_props:
            return
        self.coords = other.coords
        self.length = other.length
        self.y_max  = other.y_max

    def align_xpos_according(self, other):
        for lc, rc in zip(iter(self.coords), iter(other.coords)):
            rc.x = lc.x
        self.length = other.length * lc.x

class SoundMorpher(SoundGenerator):
    """ Similar to a SoundGenerator, SoundMorpher links simple shapes
        to simple frequency factors. When a SoundGenerator renders
        a sound, the associated SoundMorpher, if any, will multiply
        the partial sounds with the shapes of the same frequency factor.
    """

    __slots__ = ('divisions',)

    def __init__(self, *coords, divisions=None):
        super().__init__(*coords)
        self.spread = self.ff_iter()
        self.divisions = divisions or []

    @classmethod
    def shape(cls, shapes, get_tuple=False):
        myshapes = []
        divisions = []
        total_len = 1
        for s in shapes:
            pno, s = s.split(" ", 1)
            syntracer("MORPH.partials", pno)
            with deeper_level("partials"):
                s = Shape.from_string(s)
                if "n" in pno:
                    divisions.append(
                            tuple(int(x or 0) for x in pno.split("n",1)) + (s,)
                    )
                else:
                    myshapes.append( (int(pno), 1, 1, s) )
                    total_len = float(pno)

        if len(myshapes) == 0:
            myshapes.append( (1, 1, 1, _default_shape) )

        if get_tuple: # serializable in that form only
            return (total_len, 0, 1), *myshapes, divisions
        else:
            return cls((total_len, 0, 1), *coords, divisions=divisions)

    def ff_iter(self):
        x = self.length
        while True:
            x += 1
            yield lambda _: x

    def get_according_shapes(self):
        """ Missing frequency factors will be added and the according shape
            will be weighted_average()'d.
        """

        real_ff, shape = (0, _default_shape)
        last_real = None

        sgiter = self.iterate_coords(0)

        def weighter(req_ff):
            nonlocal last_real, real_ff, shape

            merge_needed = False
            while req_ff > real_ff:
                try:
                    point = next(sgiter)
                    last_real = (real_ff, shape)
                    real_ff, shape = (point.x, point.symp)
                    merge_needed = True
                except StopIteration:
                    merge_needed = False
                    break

            if merge_needed: # last_real is not None:
                dist = (req_ff - last_real[0]) / (real_ff - last_real[0])
                w_shape = Shape.weighted_average( last_real[1], dist, shape )
            else:
                w_shape = shape

            relevant_shapes = []
            def add_shape(shape):
                weight = shape.length
                shape.length = 1
                relevant_shapes.append( (weight, shape) )

            add_shape(w_shape)

            for d in self.divisions:
                req_ff2 = int(round(req_ff)) - d[1]
                if self.coords[-1].x < req_ff2 > 0 and req_ff2 % d[0] == 0:
                    add_shape(d[2])

            total_weight, ret_shape = relevant_shapes[0]

            for weight, shape in relevant_shapes[1:]:
                ret_shape = Shape.weighted_average(
                        ret_shape,
                        total_weight / (total_weight + weight),
                        shape
                    )
                total_weight += weight

            return ret_shape

        return weighter

    @classmethod
    def weighted_average(cls, left, dist, right):
        self = super().weighted_average(left, dist, right)

        if left and right:

            left_div = dict( (x[0:2], x[2]) for x in left.divisions )
            right_div = dict( (x[0:2], x[2]) for x in right.divisions )
            all_div = set(left_div.keys()) | set(right_div.keys())

            merged = []
            for d in all_div:
                ls = left_div.get(d, _default_shape)
                rs = right_div.get(d, _default_shape)
                merged.append( d + (ls.weighted_average(ls, dist, rs),) )
            self.divisions = merged

        else:
            self.divisions = (left or right).divisions

        return self


    def __repr__(self):

        res = self._base_repr()

        if self.divisions:
            res += ', divisions={!r}'.format(self.divisions)

        return res + ')'

