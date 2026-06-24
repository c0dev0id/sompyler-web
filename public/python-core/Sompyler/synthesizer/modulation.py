# -*- coding: utf-8 -*-

from __future__ import division
from .shape import Shape
from ..syntaxtracer import deeper_level, default_noop
from numpy import pi, sin
import re

syntracer = default_noop()

class Modulation:
    __slots__ = ('frequency', 'mod_share', 'base_share', 'is_dynamic',
            'init_phase', 'overdrive', 'envelope', 'function')

    def __init__(
        self, frequency, mod_share, base_share, oscillator,
        init_phase=0, overdrive=True, is_dynamic=0,
        envelope=None
    ):
        """ We have a constant socket and a part to modulate, the heights
            of which are given in a relation (mod_share:base_share)

        [-------|-------|-------|-------] Frequency in intervals per second
           *     *     *     *     *    T
          ***   ***   ***   ***   ***   | ^ mod_share (3)
         ***** ***** ***** ***** *****  | = Modulation intensity in relation
        ******************************* –   to ...
        ******************************* |
        ******************************* |
        ******************************* |
        ******************************* | ^ base_share (6)
        ******************************* _ = Minimum amplitude or frequency
        """
        self.frequency  = frequency
        self.mod_share  = mod_share
        self.base_share = base_share 
        self.is_dynamic = is_dynamic
        self.init_phase = init_phase
        self.overdrive = overdrive # center base line
        self.envelope = envelope
        self.function = oscillator

    @classmethod
    def from_string(cls, string, cache):
        m = re.fullmatch(
                r"([\d.]+)([fF])?(?:@(\w+))?(?:\[([^]]+)\])?;"
                r"(^)?(\d+):(\d+)([+-]\d+)?",
            string
        )

        if m:

            osc = m.group(3) or 'sine'

            syntracer("modulation", frequency=m.group(1),
                mod_share=m.group(6), base_share=m.group(7), init_phase=m.group(8),
                overdrive=not m.group(5), oscillator=osc
            )

            if m.group(4) is None:
                env = None
            else:
                with deeper_level("envelope"):
                    env = Shape.from_string(m.group(4))

            return Modulation(
                   frequency=float(m.group(1)),
                   overdrive=not m.group(5),
                   mod_share=int(m.group(6)) if m.group(6) else None,
                   base_share=int(m.group(7)) if m.group(7) else None,
                   init_phase=int(m.group(8)) if m.group(8) else 0,
                   is_dynamic={ None: 0, 'f': 1, 'F': 2 }[m.group(2)],
                   oscillator=cache(osc).get_full_osc(),
                   envelope=env
                )

        else:
            raise RuntimeError("Modulation definition syntax")

    def modulate(self, iseq, freq, bfactor=1, scale_base=False):
        b = self.base_share
        if scale_base:
            b *= bfactor
        m = self.mod_share
        # is_dynamic is really bool, but after weighted averaging ...
        is_dynamic = self.is_dynamic
        if is_dynamic > 1:
            is_dynamic -= 1
        else:
            freq /= bfactor
        f = freq ** float(is_dynamic) * self.frequency
        e = self.envelope.render(len(iseq)) if self.envelope else 1
        p = self.init_phase
        o = ((m + b) / (m/2 + b)) ** self.overdrive
        mosc = self.function(iseq, f, p)
        return o * (m * ( e * mosc + 1 ) / 2 + b) / (m + b)

    @classmethod
    def weighted_average(cls, left, dist, right):

        avg = lambda a, b: (1 - dist) * a + dist * b

        attr = {}

        default = Shape.from_string("-1+2;0,1;1,1")
        e_lattr = left.envelope or default
        e_rattr = right.envelope or default

        if e_lattr is (e_rattr or e_lattr):
            attr['envelope'] = e_lattr or e_rattr
        else:
            attr['envelope'] = e_lattr.weighted_average(e_lattr, dist, e_rattr)

        for p in ( 'mod_share', 'base_share', 'frequency',
                'is_dynamic', 'init_phase', 'overdrive'
            ):
            attr[p] = avg(getattr(left, p), getattr(right, p))

        if left.function is right.function:
            attr['oscillator'] = left.function
        elif isinstance(left.function, right.function.__class__) and \
                left.function.__class__.__name__ != 'function':
            attr['oscillator'] = left.function.weighted_average(
                                   left.function, dist, right.function
                               )
        else:
            # We do not know how to mean unknown functions, so we apply both
            # and mean the result. Please use this sparely if at all, as it is
            # not performant.
            attr['oscillator'] = lambda f, l, s: avg(
                left.function(f, l, s), right.function(f, l, s)
            )
            
        return Modulation(**attr)

    def __repr__(self):

        return self.__class__.__name__ + ("(" +
            ", ".join( "{}={!r}".format(attr, getattr(self, attr))
                for attr in self.__class__.__slots__        
                if getattr(self, attr, None) is not None
        ) + ")")
