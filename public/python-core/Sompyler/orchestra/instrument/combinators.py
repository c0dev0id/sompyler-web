from ...syntaxtracer import default_noop

syntracer = default_noop()

class Combinator:
    
    def __init__( self, attr, attr_checks ):
        self.attr_checks = attr_checks
        self.attr = attr


class next(Combinator):

    def __call__(self, note, forced_properties):

        lastvar = None

        for key, variation in self.attr_checks:
            if key in note:
                if lastvar:
                    lastvar = lastvar.derive(variation)
                else:
                    lastvar = variation

        if lastvar:
            return lastvar.sound_generator_for(note, forced_properties)
        else:
            return


class stacked(Combinator):

    def __call__(self, note, forced_properties):

        sound_generators = []
        for i in self.attr_checks:
            if len(i) == 2 and self.attr is None:
               if note.get(i[0]):
                   v = i[1]
            elif attr is None:
               v = note.get(i[0])
               if v and v == i[1]:
                   v = i[2]
            else:
               v = note.get(self.attr)
               if v and v == i[0]:
                   v = i[1]
               else: continue
            sound_generators.append(
                    v.sound_generator_for(note, forced_properties)
                )

        if len(sound_generators) > 1:
            last_sg = sound_generators[0]
            for sg in sound_generators[1:]:
                last_sg = last_sg.derive( sg )
            return last_sg
        elif sound_generators:
            return sound_generators[0]
        else: return


class merge(Combinator):

    def __init__(self, attr, attr_checks):
        self.attr_checks = sorted( attr_checks, key=lambda x: x[0] )
        self.attr = attr

    def __call__(self, note, forced_properties):

        attrval = note.get(self.attr)
        if attrval is None:
            return

        leftv = None
        lastval = None
        for value, variation in self.attr_checks:

            if attrval == value:
                return variation.sound_generator_for(note, forced_properties)
            elif attrval < value:
                if leftv is None:
                    return variation.sound_generator_for(note, forced_properties)
                else:
                    dist = (attrval - lastval) / (value - lastval)
                    left_sg = leftv.sound_generator_for(note, forced_properties)
                    right_sg = variation.sound_generator_for(note, forced_properties)
                    return left_sg.weighted_average( left_sg, dist, right_sg )
            else:
                lastval = value
                leftv = variation

        if leftv:
            return leftv.sound_generator_for(note, forced_properties)

