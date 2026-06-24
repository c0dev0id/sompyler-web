import shlex
from contextlib import contextmanager

STRUCTURE = {} # obsolete, maybe redone when needed

ADD_LEVEL=None

@contextmanager
def initialize_ast_log(outfilename):
    global ADD_LEVEL
    outfile = open(outfilename, "w")
    if ADD_LEVEL:
        raise RuntimeError("initialize_ast_log must not be called more than once")
    else:
        ADD_LEVEL = []
    ourtracer = tracer(outfile=outfile)
    from Sompyler import score, synthesizer, orchestra, intonation

    from Sompyler.score import measure, note, stage, stressor
    from Sompyler.orchestra import instrument
    from Sompyler.orchestra.instrument import (
            variation, protopartial, combinators
        )
    from Sompyler.synthesizer import oscillator, modulation, envelope, shape, sound_generator
    from Sompyler.synthesizer.shape import point
    import warnings
    handled_modules = (
            score, measure, note, stage, stressor, orchestra, instrument,
            variation, protopartial, combinators, oscillator, modulation,
            shape, envelope, sound_generator, point, intonation
        )

    for mod in handled_modules:
        if getattr(mod, 'syntracer', None) == default_noop:
            mod.syntracer = ourtracer
        else:
            warnings.warn(f"{mod} has no tracer that refers to default_noop")

    try:
        yield
    finally:
        outfile.close()

    for mod in handled_modules:
        if getattr(mod, 'syntracer', None) == ourtracer:
            mod.syntracer = default_noop
        else:
            warnings.warn(f"{mod} has no tracer that refers to default_noop")

def default_noop(*args, **kwargs):
    return default_noop

LEVEL = last_displayed_level = 0

@contextmanager
def deeper_level(slot=None, add=0):
    global LEVEL
    if ADD_LEVEL is None:
        yield
        return
    ADD_LEVEL.append((slot, []))
    if slot is not None: LEVEL += 1 + add
    yield
    ADD_LEVEL.pop(-1)
    if slot is not None: LEVEL -= 1 + add

def tracer(*args, level=-1, outfile=None, _defer=False, _add=None, **kwargs):
    global last_displayed_level
    if _add:
        level += _add
    string_properties = []
    for key, value in kwargs.items():
        if value is None: continue
        string_properties.append(f"{key}={value!r}")
    if args and (ADD_LEVEL[-1][0] is not None if ADD_LEVEL else True):
        slot, *args = args
        if '.' in slot:
            real_slot, slot = slot.split(".")
        else:
            real_slot = None
        slot = ' ' + (f"{real_slot}." if real_slot
                                    else f"{ADD_LEVEL[-1][0]}."
                                      if ADD_LEVEL
                                     and ADD_LEVEL[-1][0]
                                    else ''
                    ) + slot
        displayed_level = level + LEVEL
        if displayed_level > (missing_level := last_displayed_level + 1):
            print(f"{missing_level:02d} # DEBUG missing level: {ADD_LEVEL}", file=outfile)
        last_displayed_level = displayed_level
        msg = (
            f"{displayed_level:02d}{slot}{''.join(' ' + repr(v) for v in args)} "
            + ' '.join(string_properties)
        )
        if _defer and ADD_LEVEL:
            ADD_LEVEL[-1][1].clear()
            ADD_LEVEL[-1][1].append(msg)
        else:
            if ADD_LEVEL:
                deferred = []
                ld = 0
                while len(deferred) < len(ADD_LEVEL)-1:
                    ld -= 1
                    deferred.insert(0, ADD_LEVEL[ld][1])
                for msgs in deferred:
                    for imsg in msgs: print(imsg, file=outfile)
                    msgs.clear()
            print(msg, file=outfile)

    return lambda *posargs, **kwargs: tracer(
            *posargs, level=level+1, outfile=outfile, **kwargs
        )


def process_line(line):
    properties = {}
    slot = values = None
    properties_follow = False
    for part in shlex.split(line):
        if (m := re.match(r"([a-z]\w+)=", part)):
            properties_follow = True
            property_name = m.group(1)
            property_value = part[m.end() : ]
            if property_value[0] in ("'", '"'):
                if property_value[-1] == property_value[0]:
                    property_value = property_value[1:-1]
                else:
                    raise SyntaxError("Wrong quoting")
                if property_value == str(float(property_value)):
                    property_value = float(property_value)
                elif property_value == str(int(property_value)):
                    property_value = int(property_value)
                elif property_value in ("Y", "on", "true"):
                    property_value = True
                elif property_value in ("N", "off", "false"):
                    property_value = False
            properties[property_name] = property_value
        elif properties_follow:
            raise SyntaxError("Property=Value pairs must contain = sign")
        elif values is not None:
            values.append(part)
        else:
            slot = part
            values = []

