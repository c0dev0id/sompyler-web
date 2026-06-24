# -*- coding: utf-8 -*-

from __future__ import division
from . import SAMPLING_RATE
from .shape import Shape
from ..syntaxtracer import default_noop

syntracer = default_noop()

class Envelope:
    """ Threesome of attack, sustain and release phases of a partial tone.

    Please note that in contrast to the ADSR envelope combining linearly
    shaped attack, decay, sustain and release phase, as is conventionally used
    in digital synthesis, in our ASR model, formed by bezier curves, a decay
    part may be optionally merged into either the attack or the sustain.

    A decay part at the end of the attack phase will not be extended for longer
    tones, a decay in the beginning of the sustain phase will. Hence, sustain
    must not increase in the end. When it increases, it is almost certainly an
    error, that the user wishes so unlikely. To make sympartial specification
    less error-prone, this is checked and an exception is thrown.

    A tail shape is needed to level up a sustain ending in a volume too low.

    """

    def __init__(self, attack, sustain=None, tail=None, release=None):
        self.attack = (
            attack if isinstance(attack, Shape)
                  else Shape.from_string(attack)
        )

        if sustain:

            if isinstance(sustain, Shape):
                sustain_def = None
            else:
                sustain_def = sustain
                sustain = Shape.from_string(sustain) 

            sust_penult_y, sust_ult_y = sustain.y_slice(-2, None, None)
            if sust_penult_y < sust_ult_y:
                if sustain_def:
                    raise Exception("Final two coords may not rise in " + sustain_def)
                else:
                    sustain.coords[-1].y = sustain.coords[-2].y

            self.sustain = sustain

        else:
            self.sustain = None

        if release:
            self.release = (
                release if isinstance(release, Shape)
                        else Shape.from_string(release)
            )
        else:
            self.release = None

        initial_y, final_y = self.attack.edgy()

        if initial_y:
            raise Exception("Attack does not start at 0dB")

        if final_y:
            if not self.release:
                raise Exception("Attack not finalized, neither is a "
                      + "release phase defined"
                    )
        elif ( self.sustain or self.release ):
            raise Exception(
                "Sustain and release defined after finalized attack"
            )

        if self.release:
            r_start, r_end = self.release.edgy()
            if not r_start:
                raise Exception("Release phase may not start at 0dB")
            if r_end:
                raise Exception("Release phase must end with 0dB")

        if self.sustain and not self.sustain.edgy()[0]:
            raise Exception("Sustain phase may not start at 0dB")

            
        if tail:
            if not (self.sustain and self.release):
                raise Exception(
                    "tail connects sustain and release phases which "
                  + "requires both to be defined"
                )
            self.tail = (
                tail if isinstance(tail, Shape)
                      else Shape.from_string(tail)
            )
            self.tail.rescale_y( self.sustain.y_max )
        
        else: self.tail = None

    def derive ( **args ):

        for i in 'attack', 'sustain', 'release', 'tail':
            if args.get(i):
                continue
            mine = getattr(self, i, None)
            if mine:
                args[i] = mine

        self.__class__( **args )

    def render (self, duration=0):
        """ considers different prolongation for each phase:
         * attack: cannot be prolonged or trimmed. Static length.
         * sustain: prolonged or trimmed by linear interpolation
         * release: scaled proportionally extending the sustain
        """

        if isinstance(duration, str) and ";" in duration:
            duration, sustain_t, sustain_pos = duration.split(";", 2)
            sustain_t = float("0." + sustain_t)
            duration = sustain_t * float(duration)
            sustain_t = ( 1 / sustain_t - 1 ) * duration
            sustain_pos = float("0." + sustain_pos)
        elif isinstance(duration, (str, int, float)):
            duration = float(duration)
            sustain_t = 0
            sustain_pos = 1
        elif isinstance(duration, tuple):
            duration, sustain_t, sustain_pos = duration

        elif not isinstance(duration, tuple):
            raise TypeError(
                "duration must be of type int, float, string or tuple, "
                "but is " + type(duration)
            )

        overlength = duration and duration > self.attack.length
        fill = (duration - self.attack.length) if overlength else 0
    
        sustain = self.sustain or CONSTANT_SUSTAIN

        results = self.attack.render(SAMPLING_RATE)
    
        if fill: results.extend(
            sustain.render(
                SAMPLING_RATE,
                y_scale=results[-1],
                adj_length=fill,
                tail_shape=self.tail
            )
        )
    
        if results[-1]:
            results.extend(
                self.release.render(
                    SAMPLING_RATE,
                    y_scale=results[-1],
                    add_plateau=(
                        (sustain_t, sustain_pos)
                          if sustain_t > 0
                          else None
                    )
                )
            )
        
        return results

    @classmethod
    def weighted_average (cls, left, dist, right):

        phases = {}

        if left is right:
            return left

        for p in 'attack', 'sustain', 'tail', 'release':

            lattr = getattr(left, p)
            rattr = getattr(right, p)

            if lattr and rattr and lattr is not rattr:
                phases[p] = Shape.weighted_average( lattr, dist, rattr )
            else:
                phases[p] = lattr or rattr

        if 'release' in phases:
            phases['release'].coords[-1].y = 0

        return cls( **phases )

    def __repr__(self):
        s = "{}(attack={!r}, sustain={!r}, tail={!r}, release={!r})".format(
            self.__class__.__name__,
            self.attack, self.sustain, self.tail, self.release
            )
        return s

CONSTANT_SUSTAIN = Shape((1,1,1), (1,1,1, True))

