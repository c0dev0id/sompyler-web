import re
from ..syntaxtracer import default_noop, deeper_level
from .measure import shape_continual_article_props

syntracer = default_noop()

class Stage:

    def __init__(
            self, space, voices, inlined_instruments, tuner,
            shared_articles=None
        ):

        m = re.match(r'(\d+)\|(\d+):(\d+)', space)
        if m:
            Voice.minvol = int(m.group(1))
            Voice.vardir = float( m.group(2) )
            Voice.framedir = float( m.group(3) )
        else:
            raise SyntaxError("room_spread: MINVOL|VARDIR:FRAMEDIR")
        
        sum_intensities = 0

        self.voices = {}

        self.inlined_instruments = inlined_instruments

        for name, ch_data in voices.items():
            if ch_data is False: # muted voice
                self.voices[ name ] = False
                continue
            elif isinstance(ch_data, str):
                try:
                    direction, distance, instrument = ch_data.split()
                except ValueError:
                    direction, distance = ch_data.split()
                    instrument = None
                articles = shared_articles
            else:
                direction, distance, instrument, tuning, articles = (
                    ch_data.pop(i, None) for i in (
                        'direction', 'distance', 'instrument', 'tuning',
                        'articles' # articles = groups of note attributes
                                   # associated to a letter.
                    )
                )
                if tuning is not None:
                    tuner = tuner.derive(**tuning)
                if shared_articles is not None:
                    if articles is None:
                        articles = shared_articles
                    else:
                        for key, props in shared_articles.items():
                            if key in articles:
                                a = articles[key]
                                for k, v in props:
                                    if k in a and v != a[k]:
                                        synttr("article", key, **{k: v})
                                    a.setdefault(k, v)
                            else:
                                articles[key] = props

            tuner_func = tuner.frequency_of_tone

            voice = self.voices[ name ] = Voice(
                name, direction, float(distance), instrument or name,
                tuner_func, articles
            )

class Voice:
    __slots__ = (
            'name', 'tuner', 'instrument', 'position',
            'intensity', 'segments', 'articles', 'tempo_profile'
        )

    minvol = None
    vardir = None
    framedir = None

    @classmethod
    def norm_position(cls, left, right=None):

        if right is None: # interpret left as -1..+1 (left to right)
            direction = left
            left = 1 - max(direction, 0)
            right = 1 + min(direction, 0)
        else:
            both = left + right
            left  = (cls.framedir + left / both * cls.vardir ) / (
                    cls.framedir + cls.vardir
                )
            right = (cls.framedir + right / both * cls.vardir) / (
                    cls.framedir + cls.vardir
                )
            max_ampl = max(left, right)
            left /= max_ampl
            right /= max_ampl

        return left, right

    def __init__(
            self, name, direction, distance, instrument, tuner, articles
        ):

        self.name       = name
        self.tuner      = tuner
        self.instrument = instrument
        self.segments   = {}

        if articles is None:
            articles = {}
        articles.setdefault('all', {})
        articles.setdefault('o', articles['all'])
        self.articles   = articles

        intensity = (self.minvol + 1) / (self.minvol + 1 + distance)

        m = re.match(r'(\d+)\|(\d+)', direction)
        if m:
            left = float(m.group(1))
            right = float(m.group(2))
        else:
            raise SyntaxError("direction: 0-100|0-100")
        
        syntracer("stage_voice", self.name, direction=direction, distance=distance)
        with deeper_level():
            shape_continual_article_props(articles)

        self.position = self.norm_position(left, right), intensity

    def relative_position_for_tone(self, direction, distance=None):

        if not(direction or distance):
            return self.position
        else:
            if direction is None: direction = 0
            if distance is None: distance = 0

        if abs(direction) > 1:
            raise RuntimeError(
                    f"direction = {direction} beyond -1..+1: Not supported (yet?)"
                )
        if abs(distance) > 1:
            raise RuntimeError(
                    f"distance = {distance} beyond -1..+1: Not supported (yet?)"
                )

        orig_position = self.position[0][1] - self.position[0][0]

        right_span = self.vardir / (self.framedir + self.vardir)
        left_span = right_span + orig_position
        right_span -= orig_position

        if direction < 0:
            new_position = orig_position + left_span * direction
        else:
            new_position = orig_position + right_span * direction

        new_position = self.norm_position(new_position)

        if distance < 0:
            intensity = max(self.position[1] / (1+distance), 1.0)
        else:
            intensity = self.position[1] * (1-distance)

        return new_position, intensity
