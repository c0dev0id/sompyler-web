import yaml
from .variation import Variation
from ...syntaxtracer import default_noop, deeper_level

syntracer = default_noop()

class Instrument:
    __slots__ = ('root_variation',)

    def __init__(self, definition_file):
        if isinstance(definition_file, str):
            with open(definition_file, 'r') as stream:
                definition = yaml.safe_load(stream)
        else:
            definition = definition_file

        try:
            # Do not process metadata, only the character
            definition = definition['character']
        except KeyError:
            # If that slot does not exist, however, treat whole dict
            # as the character
            pass

        with deeper_level("character"):
            self.root_variation = Variation.from_definition(definition)

    def render_tone(self, pitch, length, stress, properties=None, get_sg=False):

        note = {
            'pitch': pitch,
            'length': length,
            'stress': stress,
        }

        if properties:
            note.update(properties)
        else:
            properties = {}

        sg = self.root_variation.sound_generator_for(note)
        if get_sg: return sg
        return sg.render(pitch, length, stress, **dict(
            (x, properties[x])
                for x in ('shaped_stress', 'shaped_pitch')
                if x in properties
        ))

