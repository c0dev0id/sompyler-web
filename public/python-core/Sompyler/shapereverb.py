import numpy
from .limits import observe_computing_resources
from .synthesizer import SAMPLING_RATE, normalize_amplitude
from .synthesizer.sympartial import log_to_linear
from .synthesizer.shape import Shape
from .score.stressor import Stressor

class FreeField:

    class Position:

        def __init__(self, left, right, intensity):
            self.left = left
            self.right = right
            assert intensity > 0
            self.intensity = intensity

        def apply_reverb_to_sound(self, soundata):
            level = numpy.amax(soundata)
            left = self.left * self.intensity * level
            left = normalize_amplitude(
                    # we need to make a copy here
                    numpy.array(soundata), left
                ) if left else numpy.zeros(soundata.size)
            right = self.right * self.intensity * level
            right = normalize_amplitude(soundata, right) if right else numpy.zeros(soundata.size)
            return numpy.transpose([ left, right ])
    
        def total_reverb_size(self):
            return 0

    def position(self, in_panorama, intensity):
        return FreeField.Position(in_panorama[0], in_panorama[1], intensity)


class Room:

    closer = Shape((1,1), (0,1,1, True), (1,1,1, True))

    class Side:

        def __init__(self, levels, delays, jitter, deldiffs):
            self.levels = levels
            self.delays = numpy.array(delays.render(SAMPLING_RATE))
            if deldiffs is None:
                self.deldiffs = numpy.zeros(levels.length, dtype='int')
            else:
                self.deldiffs = numpy.array(
                        deldiffs * SAMPLING_RATE, dtype='int'
                    )
            self.jitter = jitter

    def __init__(self, levels, delays, border,
            jitter=None, freq_lanes=None, deldiffs=None, diffusion=None):

        if freq_lanes is None:
            freq_lanes = []

        self.freq_lanes = [Shape.from_string(l) for l in freq_lanes]

        def _canonicalize(string):
            if isinstance(string, str):
                if '|' in string:
                    left, right = string.split('|', 1)
                else:
                    left, right = string, string
                ret = { 'left': left, 'right': right }
                return ret
            else:
                return string

        levels = _canonicalize(levels)
        delays = _canonicalize(delays)
        deldiffs = _canonicalize(deldiffs)
        jitter = _canonicalize(jitter)
        self.border = Shape.from_string(border)

        for direction, shape in levels.items():
            levels[direction] = Shape.from_string(shape)

        if deldiffs is not None:
            from .score.stressor import Stressor # import here, would be circular otherwise
            for direction in ('left', 'right'):
                echoes = levels[direction].length
                dirdeldiffs = Stressor(deldiffs[direction]).tick_values()
                factor, add = divmod(echoes, len(dirdeldiffs))
                dirdeldiffs = dirdeldiffs * factor + dirdeldiffs[:add]
                for i, ddd in enumerate(dirdeldiffs):
                    dirdeldiffs[i] = self.border.length * (ddd - 0.5) / 1000
                border = numpy.array(self.border.render(echoes, is_length_factor=False))
                border -= numpy.amin(border)
                border /= numpy.amax(border)
                deldiffs[direction] = border * dirdeldiffs

        self.left = self.__class__.Side(
                levels=levels['left'],
                delays=Shape.from_string(delays['left']),
                jitter=Shape.from_string(jitter['left']) if jitter else None,
                deldiffs=deldiffs['left'] if deldiffs else None,
            )
        self.right = self.__class__.Side(
                levels=levels['right'],
                delays=Shape.from_string(delays['right']),
                jitter=Shape.from_string(jitter['right']) if jitter else None,
                deldiffs=deldiffs['right'] if deldiffs else None,
            )
        if diffusion is not None:
            self.diffusion = Diffusor(diffusion)
        else:
            self.diffusion = None

    def position(self, in_panorama, intensity):
        distance = (intensity - 1) * -1
        in_panorama = in_panorama[1] / sum(in_panorama) * 2 - 1
        sides = {'left': None, 'right': None}
        for n, side in enumerate(sides):
            side_val = in_panorama * (2*n - 1)
            sides_seq = ('right', 'left') if n else ('left', 'right')
            response = self._sndward_ear(
                sides_seq, side_val, distance
            ) if side_val > 0 else self._leeward_ear(
                sides_seq, abs(side_val), distance
            )
            equalized = self.equalize(
                    self.haas_shift(response, side_val)
                )
            sides[side] = equalized
        return Position(**sides, distance=distance)

    def _common_ear(self, weight, sndward_ear, leeward_ear, distance):

        sndward_ear = getattr(self, sndward_ear)
        leeward_ear = getattr(self, leeward_ear)

        levels = Shape.weighted_average(
                sndward_ear.levels, weight, leeward_ear.levels
            )
        levels = numpy.array(levels.render(1))
        levels[0] *= 1 - distance

        if sndward_ear.jitter is not None:
            jitter = Shape.weighted_average(
                    sndward_ear.jitter, weight, leeward_ear.jitter
                )
            jitter = log_to_linear(numpy.array(
                jitter.render(
                    levels.size, is_length_factor=False, y_scale=True
                )
            ) / 100)
            levels += jitter * (
                numpy.random.default_rng().random(levels.size) * 2 - 1
            )

        delays = (1-weight) * sndward_ear.delays + weight * leeward_ear.delays
        orig_reflection_time = delays[1] - delays[0]
        delays[1] = delays[0] + (1-distance) * orig_reflection_time
        delays[2] += distance * orig_reflection_time
        delays_cnt = delays.size
        delays = delays[ numpy.array(
              numpy.arange(levels.size)/levels.size * delays_cnt, dtype='int')
            ].cumsum()
        delays *= delays_cnt / delays[-1]

        delays = delays.astype('int')
        delays += sndward_ear.deldiffs
        mask = numpy.zeros(numpy.amax(delays)+1)
        mask[ delays ] = levels

        return mask

    def _sndward_ear(self, side, side_val, distance):
        weight = (1 + side_val) / 2
        response = self._common_ear(weight, *side, distance)
        return response * Shape.weighted_average(
                Room.closer, distance/2, self.border
            ).render(response.size, is_length_factor=False)

    def _leeward_ear(self, side, side_val, distance):
        response = self._common_ear(0.5, *side, distance)
        distance += side_val
        return response * Shape.weighted_average(
                Room.closer, distance/2, self.border
            ).render(response.size, is_length_factor=False)

    def haas_shift(self, response, side_val):

        if self.border.length == 1:
            # 1 is default shape length and not perceivable to humans at any rate
            return response

        rnz = numpy.nonzero(response)[0]
        if side_val > 0:
            samples = (SAMPLING_RATE * (numpy.array(self.border.render(
                response.size, is_length_factor=False,
            )) - 1.0) * self.border.length * side_val / 1000).astype('int')
            samples -= samples[0] + rnz[0]
        else:
            offset = int(round(
              SAMPLING_RATE * (self.border.coords[0].y - 1.0)
              * self.border.length * abs(side_val) / 1000
            ))
            samples = numpy.zeros(response.size, dtype='int') - (offset + rnz[0])

        samples += 1
        out = numpy.zeros(response.size + samples[-1])

        for i, s_orig in enumerate(rnz):
            s = s_orig + samples[i]
            out[s] = response[s_orig]

        return out

    def equalize(self, response):

        delay_positions = numpy.nonzero(response)[0]

        diffs = [i.length for i in self.freq_lanes]
        if not diffs:
            return delay_positions, log_to_linear(response), numpy.sum(delay_positions[2:])

        bands = int(diffs[0])
        diffs[0] = 0

        eq_shape_iters = []
        for fl in self.freq_lanes:
            it = fl.iterate_coords()
            next(it) # initialize
            eq_shape_iters.append(it)

        total_response = None

        if self.diffusion is None:
            diffusion = []
        else:
            diffusion = self.diffusion.tick_values()
        for delay_pos in delay_positions:
            cur_pos = 0
            coords = []
            for diff, esi in zip(diffs, eq_shape_iters):
                cur_pos += diff
                point = esi.send(delay_pos/response.size)
                point.x = cur_pos
                coords.append(point)
            maxy = max(p.y for p in coords)
            for p in coords: p.y /= maxy
            shape = Shape((1, 1), *coords).render(
                bands, is_length_factor=False
            )
            if diffusion:
                shape = numpy.convolve(shape, diffusion)
            eqt = numpy.fft.irfft(shape)
            this_response = numpy.zeros(response.size + bands + eqt.size)
            this_response[delay_pos] = log_to_linear(response[delay_pos])

            conv = numpy.convolve(this_response, eqt)
            if total_response is None:
                total_response = conv
            else:
                total_response += conv
        
        # if self.diffusion is not None:
        #     total_response = self.diffusion.diffused(total_response)

        return delay_positions, total_response, numpy.sum(delay_positions[-2:]) + eqt.size
                

class Position:

    def __init__(self, left, right, distance):
        self.left_reverb  = left
        self.right_reverb = right
        # assert intensity > 0
        self.distance     = distance
        virt_samples = 0
        for reverb in (self.left_reverb, self.right_reverb):
            length_prod = len(reverb[0]) * len(reverb[1])
            meandiv = 1 + numpy.mean(reverb[1])
            virt_samples += (
                numpy.log(length_prod) * numpy.amax(reverb[1])
              / numpy.log(meandiv)
            )
        self.virtual_samples_count = virt_samples / 2

    def total_reverb_size(self):
        return max(self.left_reverb[2], self.right_reverb[2])

    def apply_reverb_to_sound(self, soundata):

        def _convolve(sound, reverb):
            delays, reverb, total_extension = reverb
            result = numpy.zeros( sound.size + total_extension)

            lin0 = 0 # log_to_linear(0)
            last, penlast, afterdl, di = 0, 0, 0, 2
            for i, r in enumerate(reverb):
                if r == lin0: continue
                if i and di < len(delays) and i == delays[di]:
                    sound = result[
                        delays[0] : delays[0] + afterdl + sound.size
                    ]
                    afterdl = 0
                    di += 1
                else:
                    afterdl += last - penlast
                result[i:i+sound.size] += r * sound
                penlast, last = last, i

            # print()
            return result

        observe_computing_resources(self.virtual_samples_count)

        level = numpy.amax(soundata)

        left = _convolve(soundata, self.left_reverb)
        right = _convolve(soundata, self.right_reverb)

        if left.size > right.size:
            new_right = numpy.zeros( left.size )
            new_right[:right.size] += right
            right = new_right
        elif right.size > left.size:
            new_left = numpy.zeros( right.size )
            new_left[:left.size] += left
            left = new_left

        return numpy.transpose([
            normalize_amplitude(left, level),
            normalize_amplitude(right, level)
        ])


class Diffusion:

    def __init__(self, levels, delays, jitter=None, shape_lanes=None):

        if shape_lanes is None:
            shape_lanes = []

        self.shape_lanes = [Shape.from_string(l) for l in shape_lanes]

        levels=numpy.array(Shape.from_string(levels).render(1))
        delays=numpy.array(Shape.from_string(delays).render(SAMPLING_RATE))

        if jitter is not None:
            jitter = log_to_linear(numpy.array(
                Shape.from_string(jitter).render(
                    levels.size, is_length_factor=False, y_scale=True
                )
            ) / 100)
            levels += jitter * (
                numpy.random.default_rng().random(levels.size) * 2 - 1
            )

        delays_cnt = delays.size
        delays = delays[ numpy.array(
              numpy.arange(levels.size)/levels.size * delays_cnt, dtype='int')
            ].cumsum()
        delays *= delays_cnt / delays[-1]

        delays = delays.astype('int')
        mask = numpy.zeros(numpy.amax(delays)+1)
        mask[ delays ] = levels

        self.response = mask

    def shaped(self):

        delay_positions = numpy.nonzero(self.response)[0]

        diffs = [i.length for i in self.shape_lanes]
        maxydiff = [c.y for c in self.shape_lanes[0].coords]
        maxydiff = max(maxydiff) / min(maxydiff)
        if not diffs:
            while True: _ = yield self.response

        width = int(diffs[0])
        diffs[0] = 0

        shape_iters = []
        for fl in self.shape_lanes:
            it = fl.iterate_coords()
            next(it) # initialize
            shape_iters.append(it)

        total_response = None

        outer_pos = yield
        while True:
            cur_pos = 0
            coords = []
            for diff, si in zip(diffs, shape_iters):
                cur_pos += diff
                point = si.send(outer_pos)
                point.x = cur_pos
                coords.append(point)
            maxy = max(p.y for p in coords)
            for p in coords: p.y /= maxy
            outer_pos = yield self.response * numpy.array(
                Shape((1, 1), *coords).render(self.response.size, is_length_factor=False)
            )

class Diffusor(Stressor):
    def __init__(self, pattern):
        if ':' in pattern:
            first, remaining = pattern.split(":")
        else:
            first = 1
            remaining = pattern
        super().__init__(remaining)
        self.first = int(first)

    def tick_values(self):
        ticks = super().tick_values()
        ticks[0] = self.first
        for i in range(len(ticks)):
            ticks[i] /= self.first
        return ticks
