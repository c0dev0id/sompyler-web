""" Variation of instruments

    Have an instrument reflect its aspects of sound depending on
    note properties.

"""
import re
from itertools import chain, repeat
from collections import defaultdict
from . import combinators
from .protopartial import ProtoPartial as _ProtoPartial
from ...synthesizer import normalize_amplitude
from ...synthesizer.oscillator import Oscillator, CORE_PRIMITIVE_OSCILLATORS, Shape
from ...synthesizer.sound_generator import SoundGenerator, SoundMorpher
from ...syntaxtracer import default_noop, deeper_level

SG_PROPS = (
    '_profile', '_railsback', '_timbre', '_spread', '_morph', '_volumes'
)

PARTIALS_LIMIT = 1000

root_variation = None # set after Variation class is defined
syntracer = default_noop()

class DbgContinua:
    spread = None
    volumes = None

class VariationDefinitionError(RuntimeError):
    pass

class Variation():

    __slots__ = (
        'upper', 'base', '_variation_composer', 'label_specs',
         '_upper_is_precedent'
    ) + SG_PROPS

    def __init__(
        self, upper, base, label_specs=None, _variation_composer=None,
        _upper_is_precedent=False, _profile=None, **sg_props
      ):

        if _profile is None:
            _profile = []

        if upper is None:
            upper = root_variation
        self.upper = upper
        if not isinstance(base, _ProtoPartial):
            if base: syntracer("basic_properties")
            base = _ProtoPartial(
                base=None, upper=upper.base if upper else None,
                pp_registry={
                    'LOOK_UP': upper.lookup if upper else lambda x: None
                },
                **base
            )
        self.base = base
        if label_specs is None:
            label_specs = {}
        self.label_specs = label_specs

        if upper is None:
            lookup = lambda name: None
        else:
            lookup = upper.lookup

        for slot in SG_PROPS[2:]:
            sg_props.setdefault(slot, None)

        up = self.upper
        for key, value in sg_props.items():
            setattr(self, key, value)
            if up and getattr(self, key) is None:
                setattr(self, key, getattr(up, key))

        if (railsback := getattr(self, '_railsback', None)):
            lowf, highf, curve = railsback
            if isinstance(curve, str):
                with deeper_level("RAILSBACK_CURVE", add=-1):
                    curve = Shape.from_string("1:" + curve).render(88)
            self._railsback = (lowf, highf, curve)
        else:
            self._railsback = None

        if isinstance(self._morph, list):
            with deeper_level("MORPH", add=-1):
                self._morph = SoundMorpher.shape(self._morph, get_tuple=True)
        if isinstance(self._timbre, str):
            with deeper_level("TIMBRE", add=-1):
                self._timbre = Shape.from_string(self._timbre)

        for slot in ("_volumes", "_spread"):
            shape = getattr(self, slot)
            if shape:
                if isinstance(shape, list):
                    syntracer(slot[1:].upper(), *shape)
                elif isinstance(shape, str):
                    with deeper_level(slot[1:].upper(), add=-1):
                        shape = Shape.from_string(shape)
                setattr(self, slot, shape)

        label_specs['LOOK_UP'] = lookup
        for i in topological_sort(label_specs, lookup):
            if i == 'LOOK_UP': continue
            syntracer("label_spec", i)
            with deeper_level("label_spec", add=-1):
                label_specs[i] = _ProtoPartial(
                    base, lookup(i), label_specs, **label_specs[i]
                )

        profile = list(up._profile) if up else []
        pt = 0
        def append_normalized_profile_item(profile_item):
            nonlocal pt
            if isinstance(profile_item, ProfileItem):
                profile.append(profile_item)
                return
            if isinstance(profile_item, int):
                profile_item = {'V': profile_item}
            if isinstance(profile_item.get("match"), int):
                pt = profile_item["orig_match"] = profile_item.pop("match")
            elif not 'match' in profile_item:
                pt += 1
                profile_item['orig_match'] = pt
            if 'D' in profile_item:
                profile_item['deviance'] = profile_item.pop('D')
            if 'V' in profile_item:
                profile_item['adj_volume'] = profile_item.pop('V')
            with deeper_level("partial", add=-1):
                profile.append(ProfileItem(
                    root_variation.base if root_variation else self.base,
                    self.label_specs,
                    **profile_item
                ))
        for profile_item in _profile:
            if isinstance(profile_item, list):
                for p in profile_item:
                    append_normalized_profile_item(p)
            elif isinstance(profile_item, str):
                vol, other_pp_label = profile_item.split(" ", 1)
                append_normalized_profile_item({
                    'V': int(vol), 'other': "@" + other_pp_label,
                })
            else:
                append_normalized_profile_item(profile_item)

        del self.label_specs['LOOK_UP'] # because it cannot be pickled
        self._profile = profile

        self._variation_composer = _variation_composer
        self._upper_is_precedent = _upper_is_precedent

        # if self.upper is root_variation and not hasattr(self, '_railsback'):
        #     self._railsback = (2, 20000, [0] * 88)

    def lookup(self, name):
        spec = self.label_specs.get(name)
        if spec is None and self.upper:
            spec = self.upper.lookup(name)
            self.label_specs[name] = spec
        return spec

    @classmethod
    def from_definition(cls, kwargs, upper=None, _maybe_next_type=True):

        def isnum(key):
            try:
                _ = float(key)
                return True
            except ValueError:
                return False

        def float_or_str(key):
            try:
                return float(key)
            except ValueError:
                return str(key)

        if upper is None:
            upper = root_variation

        attr = False
        if _maybe_next_type and isinstance(kwargs, list):
            variations = []
            base_variation = upper
            for variation in kwargs:
                attr = variation.get('ATTR', None)
                if attr:
                    syntracer("variation", depends_on=attr)
                    with deeper_level("variation"):
                        variation = cls.from_definition(
                               variation, base_variation, _maybe_next_type=False
                            )
                    variations.append( (attr, variation) )
                else:
                    # syntracer("variation")
                    base_variation = base_variation.derive(
                        cls.from_definition(
                            variation, base_variation, _maybe_next_type=False
                        )
                    )

            return cls(
                    base_variation, _ProtoPartial(
                            base=None, upper=base_variation.base, pp_registry={}
                        ),
                    _variation_composer=combinators.next(None, variations),
                )
            
        elif not isinstance(kwargs, dict):
           raise VariationDefinitionError("Not a dictionary: " + kwargs)

        attribute = kwargs.pop('ATTR', '')
        if '=' in attribute:
            attribute, extension = attribute.split('=')
            extension_list = extension.split('|')
            composer = combinators.stacked
        else: 
            extension_list = [
                    i for i in kwargs.keys() if isnum(i)
                ]
            composer = combinators.merge if attribute else None

        extension = set(extension_list)
        label_specs = {}
        base_args = {}

        sg_props = {
                '_profile': kwargs.pop('PROFILE', None),
                '_spread': kwargs.pop('SPREAD', None),
                '_morph': kwargs.pop('MORPH', None),
                '_timbre': kwargs.pop('TIMBRE', None),
                '_volumes': kwargs.pop('VOLUMES', None),
                '_railsback': kwargs.pop('RAILSBACK_CURVE', None)
            }

        for attr in list( kwargs.keys() ):
            if attr in extension:
                continue
            elif re.match('[A-Z]{1,3}$', attr):
                base_args[attr] = kwargs.pop(attr)
            else:
                label_specs[attr] = kwargs.pop(attr)

        if attr is False and upper is root_variation:
            syntracer("instrument.character")

        self = cls(
            upper, base_args,
            label_specs,
            **sg_props
        )

        if composer:
            for i, key in enumerate(extension_list):
                slot = float_or_str(key)
                syntracer("subvariation", for_value=slot)
                with deeper_level("variation"):
                    extension_list[i] = ( slot, 
                        Variation.from_definition(kwargs.pop(key), self)
                    )
            self._variation_composer = composer(attribute, extension_list)

        return self

    def derive(self, other):

        # merge other's with self's label_specs
        new_args = { 'label_specs': dict(self.label_specs) }
        new_args['label_specs'].update(other.label_specs)

        self_vc = self._variation_composer
        other_vc = other._variation_composer
        if self_vc and other_vc:
            new_args['_variation_composer'] = other_vc
            new_args['upper'] = self
            new_args['_upper_is_precedent'] = True
        else:
            new_args['_variation_composer'] = other_vc or self_vc
            new_args['upper'] = other.upper

        for prop in SG_PROPS:
            new_args[prop] = getattr(self, prop)
            other_prop = getattr(other, prop)
            if not other_prop: continue
            # Degrade the defaults, as we need to prefer what is explicitly
            # described in the instrument definition
            if not(self.upper and other_prop is getattr(self.upper, prop)):
                new_args[prop] = other_prop

        variation = self.__class__(
                base=self.base.derive(other.base),
                **new_args
            )

        return variation

    def sound_generator_for(
            self, note, forced_properties=None, _dbg_continua=DbgContinua()
        ):

        class ForcedProperties(set):
            def __init__(self, superset):
                self.superset = superset

        if self._upper_is_precedent:
            forced_properties = ForcedProperties(forced_properties)

        if self._variation_composer:
            sg = self._variation_composer(
                    note, forced_properties
                )
            if sg is not None and not self._upper_is_precedent:
                return sg
        else:
            sg = None

        if sg is None:
            partial_args = dict(
                    (key, value) for (key, value) in note.items()
                                     if key.isupper()
                )
            sg = self._build_sound_generator(**partial_args,
                 _dbg_continua=_dbg_continua
            )

        if forced_properties is not None:
            for prop in SG_PROPS:
                if prop in forced_properties:
                    continue
                if ( getattr(self, prop) is not getattr(self.upper, prop) ):
                    forced_properties.add(prop)
            superset = forced_properties.superset
            if self._upper_is_precedent and superset is not None:
                superset.union_update(forced_properties)

        if self._upper_is_precedent:
            upper = self.upper.sound_generator_for(note)

            if '_profile' in forced_properties:
                upper.inspire_profile_from(sg)
            elif '_spread' in forced_properties:
                upper.align_xpos_according(sg)

            for prop in ('_timbre', '_morph', '_railsback'):
                if prop in forced_properties and getattr(sg, prop[1:]):
                    setattr(upper, prop[1:], getattr(sg, prop[1:]))

            return upper

        else:
            return sg

    def _build_sound_generator(self, **partial_args):

        _dbg_continua = partial_args.pop('_dbg_continua')

        # Perhaps after pickling, we must put things back into place:
        self.label_specs['LOOK_UP'] = self.upper.lookup

        for profi in self._profile:
            profi.has_matched = False

        if isinstance(self._morph, tuple):
            total_length, *coords, divisions = self._morph
            self._morph = SoundMorpher(
                total_length, *coords, divisions=divisions
            )

        props = defaultdict(lambda: defaultdict(dict))
        all_ff = defaultdict(dict)
        if self._profile:
            for p in range(PARTIALS_LIMIT):
                p += 1
                last = True
                for profi in self._profile:
                    if profi.match(p):
                        pt = (p, profi.deviance)
                        all_ff[p][profi.deviance] = None
                        for prop, value in profi.as_dict().items():
                            props[prop][pt] = value
                        if profi.adj_volume is None:
                            props['volume'].setdefault(pt, 0)
                        else:
                            props['volume'][pt] = profi.adj_volume
                    elif not profi.has_matched:
                        last = False
                if last:
                    break
            else:
                raise VariationDefinitionError(
                    "Potential endless iteration: "
                    "Aborted rendition of more than {} partials without "
                    "all profile items having matched.".format(PARTIALS_LIMIT)
                )
        
        continua = dict()
        max_cont_len = 0
        # removed
        for slot in ('_spread', '_volumes'):
            shape = getattr(self, slot)
            slot = slot[1:]
            continua[slot] = shape

            if isinstance(shape, list):
                shapelen = len(shape)
            elif shape:
                shapelen = shape.length
            else: continue

            max_cont_len = max(max_cont_len, shapelen)

        if all_ff:
            resolution = max(all_ff)
        elif max_cont_len:
            resolution = int(round(max_cont_len))
        else:
            resolution = 1

        for slot, shape in continua.items():
            if shape is None:
                continua[slot] = [0] * resolution
            elif isinstance(shape, Shape):
                continua[slot] = shape.render(
                    1, adj_length=resolution, y_scale=True
                )
            else: # presume shape is a list already
                add_slots = resolution - len(shape)
                continua[slot] = list(shape)
                if add_slots > 0:
                    continua[slot] += [0] * add_slots
            setattr(_dbg_continua, slot, continua[slot])

        def _deviate(f, d):
            return f * 2 ** (d/1200)

        partial_seqno = 0
        cum_deviation = 0
        def spreaditer():
            nonlocal partial_seqno, cum_deviation
            for dev in chain(continua['spread'], repeat(0)):
                cum_deviation += int(dev)
                fix_deviance = _deviate(1, cum_deviation)
                yield lambda deviance: partial_seqno + _deviate(
                        fix_deviance, deviance
                    )
                partial_seqno += fix_deviance

        harmonic_ff = set(i+1 for i in range(resolution))
        base_vol = 0 if all_ff or max(continua["volumes"])>0 else 100
        for p in all_ff:
            harmonic_ff.remove(p)
        for p in harmonic_ff:
            props["volume"][(p, 0)] = base_vol
            all_ff[p][0] = None
        for pt in props["volume"]:
            p = pt[0] - 1
            vol = continua["volumes"][p]
            props["volume"][pt] += vol

        spread = spreaditer()
        maxf = 0
        for p in sorted(all_ff):
            ffd = next(spread)
            p = all_ff[p]
            for dp in p:
                f = p[dp] = ffd(dp)
                maxf = max(maxf, f)

        real_frequencies_orig_ffd = {}
        for prop, propvalue_at in props.items():
            for pt in list(propvalue_at):
                value = propvalue_at.pop(pt)
                ff, dev = pt
                realff = all_ff[ff][dev]
                propvalue_at[ realff ] = value
                pt0 = real_frequencies_orig_ffd.get(realff)
                if pt0 in (pt, None):
                    real_frequencies_orig_ffd[realff] = pt
                else:
                    raise VariationDefinitionError(
                        f"Profile items claim same frequency factor: "
                        f"{pt0} vs. {pt}"
                    )

        sympartial_points = infer_sympartial_points(
            self.base, dict(props), real_frequencies_orig_ffd,
            maxf, partial_args
        )

        return SoundGenerator(
            (sympartial_points[-1][0], 0, 1),
            *sympartial_points,
            spread=spread,
            timbre=self._timbre,
            morph=self._morph,
            railsback=self._railsback
        )


class ProfileItem(_ProtoPartial):
    __slots__ = ('_match', 'has_matched', 'deviance', 'adj_volume')
    def __init__(self, base, pp_registry, orig_match, deviance=0, adj_volume=None, **props):
        self.deviance = deviance
        self.has_matched = False
        if isinstance(orig_match, int) or orig_match.isdecimal():
            match = (int(orig_match), None)
        else:
            match = tuple(map(
                lambda s: int(s or 0),
                re.match(r"(\d+)n([+-]\d+)?$", orig_match
            ).groups()))
        self._match = match
        self.adj_volume = adj_volume
        syntracer("PROFILE.partial", orig_match, deviance=deviance, adj_volume=adj_volume)
        super().__init__(None, base, pp_registry, **props)
            
    def match(self, x):
        if self._match[1] is None:
            matched = x == self._match[0]
        else:
            factor, remainder = self._match
            x -= remainder
            if (remainder and x >= 0) or x > 0:
                matched = x % factor == 0
            else:
                matched = False

        if matched:
            self.has_matched = True

        return matched

def infer_sympartial_points(base, properties, clusters, max_pt, partial_args=None):
    
    def make_chain_cursor(prop):
        edgepoints = [(0, base.get(prop))]
        for item in sorted(properties[prop].items(), key=lambda x: x[0]):
            edgepoints.append(item)
        if edgepoints[-1][0] != max_pt:
            edgepoints.append((max_pt, base.get(prop)))
        last = 0
        current = 1

        def cursor(pt):
            nonlocal last, current

            if pt < last:
                raise RuntimeError(
                    "Argument smaller than in recent run: {} < {}".format(pt, last)
                )

            while pt > edgepoints[current][0]:
                last = edgepoints[current][0]
                current += 1

            curr = edgepoints[current][0]
            if pt == curr:
                return edgepoints[current][1]
            else:
                curr -= last
                pt -= last
                edge0 = edgepoints[current-1][1]
                edge1 = edgepoints[current][1]
                if edge0 and edge1:
                    if edge0 is True: edge0 = base.get(prop)
                    if edge1 is True: edge1 = base.get(prop)
                    return edge0.weighted_average(edge0, pt/curr, edge1)
                elif bool(edge0)         ^  bool(edge1) and (
                          edge0 is False or      edge1 is False
                    ):
                    return None
                else:
                    return edge0 or edge1 or None

        return cursor

    all_ff = set()
    for prop, edges in properties.items():
        all_ff |= set(edges)
        properties[prop] = make_chain_cursor(prop)

    points = []
    if partial_args is None:
        partial_args = dict()
    for pt in sorted(all_ff):
        myprops = {}
        for prop, cursor in properties.items():
            value = cursor(pt)
            if value is True:
                value = base.get(prop)
            if value is None:
                value = partial_args.get(prop)
            myprops[prop] = value
        volume = myprops.pop("volume")
        for prop, value in partial_args.items():
            myprops.setdefault(prop, value)
        points.append((
            pt,
            volume,
            1,
            _ProtoPartial(
                base, None, root_variation.label_specs, **myprops
            ).sympartial(cluster=clusters[pt][0])
        ))
        for prop, value in myprops.items():
            if (partial_args.get(prop) or base.get(prop)) is value: continue
            break
        else:
            points[-1][3].no_own_props = True

    return points


root_osc = CORE_PRIMITIVE_OSCILLATORS()

def topological_sort(labeled_specs, lookup):
    """
    Modified version of:
    http://blog.jupo.org/2012/04/06/topological-sorting-acyclic-directed-graphs/
    """

    LABEL_REF_RX = r'@([a-z]\w+)'     # Oscillator for modulations
    LABEL_REF_RX2 = r'\{([a-z]\w+)\}' # normal string interpolation

    # Extract dependency information
    def find_dependencies(spec):
        dependencies = set()
        for i in spec.values():
            if isinstance(i, dict):
                listdeps = []
                for j in i.keys():
                    listdeps.extend(re.findall(LABEL_REF_RX, j))
            else:
                listdeps = (
                    re.findall(LABEL_REF_RX, i)
                  + re.findall(LABEL_REF_RX2, i)
                )
            for d in listdeps:
                if d not in labeled_specs:
                    pp = lookup(d)
                    if pp: labeled_specs[d] = pp
                    else: raise VariationDefinitionError(
                        "Protopartial reference irresoluble: " + d
                    )
                dependencies.add(d)
        return dependencies

    labeled_dependency_sets = {}
    for label, spec in list(labeled_specs.items()):
        if label == "LOOK_UP": continue
        if isinstance(spec, _ProtoPartial):
            deps = []
        else:
            try:
                deps = find_dependencies(spec)
            except AttributeError:
                if not isinstance(spec, (str, int, float)):
                    raise AttributeError(
                            label + " has unsupported type: "
                                  + str(type(spec))
                        )
                else: raise
        labeled_dependency_sets[label] = deps

    # This is the list we'll return, that stores each node/edges pair
    # in topological order.
    graph_sorted = []

    # Run until the unsorted graph is empty.
    while labeled_dependency_sets:

        acyclic = False
        for node, edges in list(labeled_dependency_sets.items()):
            for edge in edges:
                if edge in labeled_dependency_sets:
                    break
            else:
                acyclic = True
                del labeled_dependency_sets[node]
                if not isinstance(labeled_specs[node], _ProtoPartial):
                    graph_sorted.append(node)

        if not acyclic:
            circular_dependencies = labeled_dependency_sets.keys().join(", ")
            raise VariationDefinitionError(
                "Circular dependencies could not be resolved among elements "
                     + circular_dependencies
            )

    return graph_sorted


root_variation = Variation(
    None,
    _ProtoPartial(
            None, None,
            { 'LOOK_UP': lambda x: None },
            O=root_osc['sine']
        ),
    { key: _ProtoPartial(None, None, {}, O=value)
        for key, value in root_osc.items() },
    _profile=None,
    _timbre=None, # Shape.from_string("20000:1;1,1"),
    _morph=None,
    _volumes=None,
    _spread=None,
    _railsback=None
)


def ProtoPartial(**args):
    return _ProtoPartial(
            None,
            root_variation.base,
            root_variation.label_specs,
            **args
        )

