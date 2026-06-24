# -*- coding: utf-8 -*-

from ...synthesizer.sympartial import Sympartial
from ...synthesizer.modulation import Modulation
from ...synthesizer.envelope import Envelope, Shape
from ...syntaxtracer import default_noop, deeper_level
from string import Formatter
import re

syntracer = default_noop()

ABBREV_ARGS = {
    'A': 'attack',
    'S': "sustain",
    'T': "tail",
    'R': "release",
    'AM': "amplitude_modulation",
    'FM': "frequency_modulation",
    'FV': "frequency_variation",
    'WS': "wave_shape",
    'O': "oscillator" # value merely informational (not used)
}

ENV_ARGS = ('A', 'S', 'T', 'R')
OSC_ARGS = ('AM', 'FM', 'FV', 'WS')

SHAPES = ENV_ARGS + ('FV', 'WS')
MODS = ('AM', 'FM')

_sentinel = object()

class ProtoPartial:
    """
    Manage all properties. Inherit them top-down from base of the variation
    or from the protopartial labelled the same from an upper variation, and get
    a sympartial instance with which you can render tones.
    """

    __slots__ = ('_base', '_upper', '_cache', '_wrapped_osc') + tuple(
            ABBREV_ARGS.keys()
        )

    def __init__( self, base, upper, pp_registry, other=None, **args ):

        def refresolver(name):
            pp = pp_registry.get(name)
            if pp is None:
                pp = pp_registry['LOOK_UP'](name)
            if pp is None:
                raise ValueError('Name cannot be resolved: ' + name)
            return pp

        if other:
            if not other.startswith('@'):
                raise ValueError('other argument must reference a @label')
            for ref in other[1:].split(','):
                if ref.startswith('@'):
                    inherit = True
                    ref = ref[1:]
                else:
                    inherit = False
                refpp = refresolver(ref)
                for prop in ABBREV_ARGS:
                    if prop in args: continue
                    value = refpp.get(prop, inherit, _sentinel)
                    if value is not _sentinel:
                        args[prop] = value

        self._base = base
        self._upper = upper
        self._cache = {}
        self._wrapped_osc = False

        for prop in ABBREV_ARGS.keys():

            value = args.get(prop, _sentinel)
            if value is _sentinel:
                continue

            elif prop == "O" and isinstance(value, str):
                if value.startswith('@'):
                    self._wrapped_osc = True
                else:
                    value = '@' + value

            if not isinstance(value, dict):
                value = { value: 1 }

            res, total_weight = None, 0

            multi_value = value
            for value, weight in multi_value.items():

                if isinstance(value, str):
                    if value.startswith('@'):
                        value = value[1:]
                        syntracer(prop, ref=value, weight=weight if len(multi_value)>1 else None, _add=1)
                        pp = refresolver(value)
                        if prop == 'O':
                            value = pp.get_full_osc()
                        else:
                            value = pp.get(prop)
                    elif prop == 'O':
                        syntracer('O', ref=value, _add=1)
                        value = refresolver(value).get(prop)
                    else:
                        value = re.sub(
                            r'\{(\w+)\}',
                            lambda m: refresolver(m.group(1)),
                            value
                        )
                        with deeper_level(prop):
                            if prop in SHAPES:
                                value = Shape.from_string(value)
                            elif prop in MODS:
                                value = Modulation.from_string(value, refresolver)

                if res:
                    total_weight += weight
                    res = res.weighted_average(
                        res, weight / total_weight, value
                    )
                else:
                    res, total_weight = value, weight

            setattr(self, prop, res)

        if self.get('O') is None:
            raise Exception("ProtoPartial instance missing oscillator")

    def get (self, attr, inherit=True, sentinel=None):
        """ Look up attribute first in own attributes, then in the ancestry
            of named variation. If it is not found there, try the base and its ancestry.
        """

        value = getattr(self, attr, _sentinel)

        if value is not _sentinel:
            return value
        elif not inherit:
            return sentinel
        elif attr in self._cache:
            if self._cache[attr] is _sentinel:
                return sentinel
            else:
                return self._cache[attr]

        for m in (self._upper, self._base):
            if m is None: continue
            value = m.get(attr, True, _sentinel)
            if value is not _sentinel:
                self._cache[attr] = value
                return value

        self._cache[attr] = _sentinel
        return sentinel

    def as_dict(self, inherit=False):
        props = {}
        for prop in ABBREV_ARGS.keys():
            value = self.get(prop, inherit, _sentinel)
            if value is _sentinel:
                continue
            else:
                props[prop] = value
        return props

    def get_full_osc(self):

        osc_args = {}

        for each in OSC_ARGS:
             val = self.get(each)
             if val is not None and type(val) is not object: # sentinel
                 osc_args[ ABBREV_ARGS[each] ] = val

        base_osc = self.get('O')
        return (
            base_osc.__class__(base_osc, **osc_args)
                if self._wrapped_osc
                else base_osc.derive(**osc_args)
            )

    def sympartial (self, cluster=None):

        env_args = {}; osc_args = {}

        for each in ENV_ARGS:
             val = self.get(each)
             if val is not None:
                 env_args[ ABBREV_ARGS[each] ] = val

        if 'release' in env_args:
            env_args['release'].coords[-1].y = 0

        return Sympartial(
            Envelope(**env_args) if env_args else None,
            self.get_full_osc(),
            cluster_pos=cluster
        )
        
    def derive(self, other, adopt_base=False):
        if adopt_base:
            self._base = other._base
        other._base = self
        return other
