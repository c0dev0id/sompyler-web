# -*- coding: utf-8 -*-

import numpy as np
import re
from random import random
from collections import deque
from .modulation import Modulation
from .shape import Shape
from ..syntaxtracer import default_noop
from . import BYTES_PER_CHANNEL, SAMPLING_RATE, normalize_amplitude
from Sompyler.limits import observe_computing_resources

syntracer = default_noop()

class Oscillator:
    __slots__ = ('osc_func', 'amplitude_modulation', 'frequency_modulation',
                 'wave_shape', 'frequency_variation', '_name', 'wave_shaper'
        )
    def __init__(self, osc_func='sine',
            pp_registry=lambda n: _primitive_cache(n), **args
        ):

        self.osc_func = osc_func

        if isinstance(self.osc_func, str):
            cached_osc = pp_registry(self.osc_func).get('O')
            self._name = cached_osc._name
            self.osc_func = cached_osc.osc_func
        elif isinstance(self.osc_func, tuple):
            self._name = self.osc_func
            self.osc_func = self.weight_averaged_func(
                    *self.osc_func, pp_registry=pp_registry
                )
        else:
            self._name = args.get('_name', osc_func)

        for attr in 'amplitude_modulation', 'frequency_modulation':
            if args.get(attr):
                mod = (args[attr] if isinstance(args[attr], Modulation)
                       else Modulation.from_string(args[attr], pp_registry)
                     )
            else: mod = None
            setattr(self, attr, mod)

        ws = args.get('wave_shape')
        if ws:
            if not isinstance(ws, Shape):
                ws = Shape.from_string( ws )
            self.wave_shape = ws
            waveshape_res = 2 ** (BYTES_PER_CHANNEL * 8)
            waveshape_list = ws.render(waveshape_res)
            amplitudes = np.array(waveshape_list) - 1
            self.wave_shaper = lambda w: amplitudes[
                ( (w+1) / 2 * (waveshape_res-1) ).astype(int)
            ]
        else:
            self.wave_shape  = None
            self.wave_shaper = None

        fv = args.get('frequency_variation')
        if fv:
            if not isinstance(fv, Shape):
                fv = Shape.from_string( fv )
            self.frequency_variation = fv
        else:
            self.frequency_variation = None

    def shrink_and_stretch_sample_intervals(self, freq, iseq, shaped_pitch):

        try:
            freq0 = freq[0]
        except TypeError:
            freq0 = freq
            freq = (freq0, 1)

        if isinstance(iseq, int):
            iseq = np.arange(iseq)

        observe_computing_resources(iseq.size)

        seqprod = None

        if self.frequency_modulation:
            seqprod = self.frequency_modulation.modulate(
                    iseq, *freq, scale_base=True
                )
        else:
            seqprod = np.ones(len(iseq))

        if self.frequency_variation:
            fv = np.array(self.frequency_variation.render(len(iseq)))
            seqprod *= np.float_power(2, fv)
        if shaped_pitch:
            seqprod *= np.float_power(2, shaped_pitch)

        return freq, seqprod

    def __call__(
        self, iseq, freq, phase=0, shaped_pitch=None
    ):

        if not callable(self.osc_func):
            self.osc_func = self.weight_averaged_func(*self.osc_func)

        freq, iseq0 = self.shrink_and_stretch_sample_intervals(
                freq, iseq, shaped_pitch
            )
        wave = self.osc_func( np.cumsum(iseq0), freq[0], phase / 360.0 )

        if self.wave_shaper: wave = self.wave_shaper(wave)

        if self.amplitude_modulation:
            wave *= self.amplitude_modulation.modulate(iseq, *freq)

        return wave

    def derive (self, **args):

        for i in self.__class__.__slots__[:-1]:
            if args.get(i): continue
            mine = getattr(self, i)
            if mine is not None: args[i] = mine

        return self.__class__( **args )

    @classmethod
    def weighted_average( cls, left, dist, right ):

        args = {}

        for each in 'amplitude_modulation', 'frequency_modulation':
            l = getattr(left, each)
            r = getattr(right, each)
            if not ( l or r ):
                continue
            elif not l or l is r:
                args[each] = r
            elif not r:
                args[each] = l
            else:
                args[each] = l.weighted_average( l, dist, r )

        for each, default in {
                'wave_shape': '1:1,1',
                'frequency_variation': '1:-1+2;0,1;1,1',
            }.items():
            l = getattr(left, each)
            r = getattr(right, each)
            if l and r:
                args[each] = l if l is r else l.weighted_average( l, dist, r)
            elif l or r:
                s = Shape.from_string(default)
                args[each] = Shape.weighted_average( l or s, dist, r or s )

        if left.osc_func is right.osc_func:
            args['osc_func'] = left.osc_func
            args['_name'] = left._name
        else:
            args['osc_func'] = (dist, left.osc_func, right.osc_func)
            args['_name'] = (dist, left._name, right._name)

        return cls(**args)

    @classmethod
    def weight_averaged_func(cls, dist, *sides, pp_registry=None):

        new_sides = []
        for side in sides:
            if isinstance(side, tuple):
                new_sides.append(cls.weight_averaged_func(
                        *side, pp_registry=pp_registry
                    ))
            elif callable(side):
                new_sides.append(side)
            else:
                new_sides.append(pp_registry(side).get('O').osc_func)

        left, right = new_sides

        if pp_registry is None:
            return lambda l, f, p: (
                (1 - dist) * left(l,f,p) + dist * right(l,f,p)
            )
        else:
            return (dist, left, right)

    def __repr__(self):

        props = self.__class__.__slots__[1:-2]

        osc_func = repr(self._name)

        return self.__class__.__name__ + "(osc_func=" + osc_func + "," + \
            ", ".join("{}={!r}".format(name, getattr(self, name))
                for name in props
                if getattr(self, name) is not None
            ) + ")"



def CORE_PRIMITIVE_OSCILLATORS (**osc_args):

    core_oscs = {
        'sine': _sine_wave,
        'sawtooth': _sawtooth_wave,
        'square': _square_wave,
        'triangle': _triangle_wave,
        'noise': _noise_generator,
        'slopy': _slopes_generator,
    }

    if 'pp_registry' not in osc_args:
        osc_args['pp_registry'] = {}

    for (name, func) in core_oscs.items():
        osc_args[ 'osc_func' ] = func
        core_oscs[name] = Oscillator( _name=name, **osc_args )

    return core_oscs


def _primitive_cache(which):

    class _pp:
        __slots__ = ('osc',)
        def __init__(self, osc):
            self.osc = osc
        def get(self, prop):
            if prop == 'O': return self.osc
            else: raise NotImplemented

    _c = {}
    def cache(which):
        if not _c: _c.update(dict((name, _pp(osc))
            for name, osc in CORE_PRIMITIVE_OSCILLATORS().items()
        ))
        return _c[which]

    global _primitive_cache
    _primitive_cache = cache
    return cache(which)

def _sine_wave(iseq, freq, phase):
    return np.sin(
        2*np.pi * (iseq * freq / SAMPLING_RATE + phase)
    )
def _sawtooth_wave(iseq, freq, phase):
    x = iseq * freq / SAMPLING_RATE + phase
    return 2 * (x - np.floor(x)) - 1

def _square_wave(iseq, freq, phase):
    x = iseq * freq / SAMPLING_RATE + phase
    return 2 * (np.floor(x) - np.round(x)) + 1

def _triangle_wave(iseq, freq, phase):
    x = iseq * freq / SAMPLING_RATE + phase
    return 4 * (np.abs(x % 1 - 1/2) - 1/4)

_RANDOMS_1SEC = np.random.random_sample(SAMPLING_RATE)

def _getfreq_rnd(iseq):
    random_iter = np.nditer(_RANDOMS_1SEC)
    seq_iter = np.nditer(iseq)
    count = -1
    for i in seq_iter:
        try:
            rnd = next(random_iter)
        except StopIteration:
            random_iter.reset()
            rnd = next(random_iter)
        yield ((i - count), rnd)
        count = i

def _noise_generator(
    iseq, freq, phase=None,
    ):
    """ This noise generator is dynamic in that it respects the
        frequency. The phase is ignored.
    """

    def rnd_samples():

        last_sample = 0

        count = 0

        posw = 1; negw = 1; recent_samples = deque()

        for ff, sample in _getfreq_rnd(iseq):
        
            window_size = -2 * freq * ff / SAMPLING_RATE + 1

            if window_size > 1:
                window_size = 1.0
                inv = False
            elif window_size < 0:
                window_size *= -1
                inv = True
            else:
                inv = False

            half_period_length = SAMPLING_RATE / (2*freq*ff)

            earlier_sample = 0

            while len(recent_samples) > half_period_length:
                earlier_sample = recent_samples.popleft()
                if earlier_sample > 0:
                    posw -= earlier_sample
                else:
                    negw += earlier_sample

            if earlier_sample:
                tendency = posw / (posw + negw)
            else:
                tendency = (last_sample or sample) > 0

            window_size = 2 * (1 - window_size)
            lower_bound = last_sample - window_size * tendency
            upper_bound = lower_bound + window_size
        
            if lower_bound < -1:
                upper_bound -= lower_bound + 1
                lower_bound = -1
            elif upper_bound > 1:
                lower_bound -= upper_bound - 1
                upper_bound = 1
        
            if inv:
                lower_bound, upper_bound = (upper_bound * -1.0, lower_bound * -1.0)

            next_sample = lower_bound + sample % window_size
            
            count += 1;

            yield next_sample

            recent_samples.append(next_sample)
            if next_sample > 0:
                posw += next_sample
            else:
                negw -= next_sample

            last_sample = next_sample

    noise = np.fromiter(rnd_samples(), np.float32, iseq.size)
    normalize_amplitude(noise)
    return noise


def _slopes_generator(iseq, freq, phase=None):
    freq_rnd_iter = _getfreq_rnd(iseq)
    def rnd_samples():
        rnd = last_rnd = 0
        for i in np.nditer(iseq):
            ff, basernd = next(freq_rnd_iter)
            segments = int( round(SAMPLING_RATE / (2*freq*ff)) )
            i = i % segments
            if i < 1:
                last_rnd = rnd
                rnd = random() * 2 - 1
            yield last_rnd + (rnd - last_rnd) * i / segments
    noise = np.fromiter(rnd_samples(), np.float32, iseq.size)
    normalize_amplitude(noise)
    return noise

