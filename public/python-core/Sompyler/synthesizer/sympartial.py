# -*- coding: utf-8 -*-

import numpy as np
import re
import copy
from collections import namedtuple
from . import SAMPLING_RATE
from .oscillator import Oscillator
from .envelope import Envelope, Shape

class Sympartial:
    """
    A Sympartial is a partial that may be accompanied by dependent partials
    implied by modulation of its amplitude, frequency, and/or by wave
    shaping.

    Main and dependent partials are all shaped with the same envelope.
    """

    # True for interpolated sympartials in sound generators
    no_own_props = False
    cluster_pos = 1

    def __init__(self, envelope=None, oscillator=None, cluster_pos=None):
        self.envelope = envelope
        self.oscillator = oscillator or Oscillator()
        if cluster_pos is not None:
            self.cluster_pos = cluster_pos

    def normalized_env(self, share_func, duration, args):

        envelope = None
        if share_func:
            envelope = self.envelope
            if envelope is None:
                iseq = np.arange(duration * SAMPLING_RATE)
                share = np.ones(iseq.size)
            else:
                envelope = np.array(envelope.render(duration))
                share = envelope
                share /= np.max(envelope)
                iseq = np.arange(envelope.size)
        else:
            return np.zeros(int( duration * SAMPLING_RATE ))

        if args.get('shaped_pitch'):
            args['shaped_pitch'] = args['shaped_pitch'].render(iseq.size)

        shaped_stress = args.pop('shaped_stress', None)
        if shaped_stress:
            share *= np.array(shaped_stress.render(iseq.size))

        return share, iseq

    def render(self, freq, share_func, duration, separate=False, **args):

        share, iseq = self.normalized_env(
                share_func, duration, args
            )

        phase = int(args.pop('phase', 0))

        # phase alignment to maximum volume position of attack so that percussive sounds 
        env = self.envelope
        samples_per_period = SAMPLING_RATE / freq
        if env:
            max_volume_y = 0
            for c in env.attack.coords:
                if c.y <= max_volume_y:
                    continue
                max_volume_x = c.x
                max_volume_y = c.y
            phase = 360 * (
                (max_volume_x * env.attack.length * SAMPLING_RATE) % samples_per_period
            ) / samples_per_period - phase

        freq = (freq, self.cluster_pos)

        morph = share_func(iseq.size) if share_func else 1
        if separate:
            if (am := self.oscillator.amplitude_modulation):
                share *= am.modulate(iseq, *freq)
            freq, iseq = self.oscillator.shrink_and_stretch_sample_intervals(
                freq, iseq, args.get("shaped_pitch")
            )
            return (iseq, log_to_linear(share * morph), lambda: self.oscillator(
                    np.arange(int(samples_per_period)), freq, phase, **args
                ))

        else:
            samples = self.oscillator(iseq, freq, phase, **args)
            return samples * log_to_linear(share * morph)

    def derive(self, symp_registry={}, **args):

        env_args, osc_args = _gather_args(args)
        osc_args['symp_registry'] = symp_registry

        if env_args:
            envelope = self.envelope.derive(**env_args)
        else:
            envelope = self.envelope

        if osc_args:
            oscillator = self.oscillator.derive(**osc_args)
        else:
            oscillator = self.oscillator

        return self.__class__(envelope, oscillator)

    @classmethod
    def weighted_average(cls, left, dist, right):

        if left is right:
            return left

        args = {}
        for each in ('envelope', 'oscillator'):
            l = getattr(left, each)
            r = getattr(right, each)
            if l is r:
                args[each] = l
            else:
                args[each] = l.weighted_average( l, dist, r )

        args["cluster_pos"] = (
                (1 - dist) * left.cluster_pos
              + dist * right.cluster_pos
            )

        self = cls(**args)
        if left.no_own_props and right.no_own_props:
            self.no_own_props = True

        return self

    def __repr__(self):
        return str(self.__class__.__name__
            + "(" + repr(self.envelope)
            + ', ' + repr(self.oscillator)
            + ', cluster_pos=' + str(self.cluster_pos)
            + ")")

def log_to_linear(num):
    return np.power( 10.0, -5 * ( 1 - num ) )

