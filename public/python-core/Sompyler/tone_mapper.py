import yaml
import codecs
import re
from os import path
from math import floor

def get_mapper_from(source_file=None):

    if source_file is None:
        source_file = path.join(
                path.dirname(__file__),
                "../lib/tones_euro_de+en.splt"
            )

    def tone_to_frequence(base_freq, substract, denominator):
        base_freq = float(base_freq)
        substract = int(substract)
        try:
            denominator = int(denominator)
            calc_rels = [ 2 ** (1/denominator) ] * denominator
            offset = 0
        except AttributeError:
            offset, *rels = re.match(
                    r"\[([\d,./]+)\]", denominator
                ).group(1).split(",")
            calc_rels = []
            for r in rels:
                if '/' in r:
                    n1, n2 = [ int(x) for x in r.split("/", 1) ]
                    if not n1 > n2:
                        raise ValueError(
                                "{}/{} in frequency factor sequence"
                                " must be > 1"
                            )
                    calc_rels.append(n1/n2)
                elif r == str(int(r)):
                    calc_rels.append(int(r))
                else:
                    raise ValueError(r +
                            " is neither int nor 'int/int' string"
                        )
                calc_rels = [
                        2 ** (
                            (100 + x) / (len(calc_rels)*100)
                        ) if isinstance(x, int) else x
                        for x in calc_rels
                    ]
        tones_per_octave = len(calc_rels) + 1
        octave_factor = 1
        for r in calc_rels:
            octave_factor *= r
        if octave_factor != int(octave_factor):
            raise ValueError("Tone scale must multiply to an integer")

        def frequency_at_pos(n):
            n -= substract
            base = (substract-1) % tones_per_octave + offset
            nbase = n % tones_per_octave + offset
            ff = octave_factor ** floor(n/tones_per_octave)
            direction = int(nbase > base or -1)
            corr = (None,0,-1)[direction]
            base -= corr
            nbase -= corr
            for i in calc_rels[base:nbase:direction]:
                ff *= i ** direction
            return base_freq * ff

        return frequency_at_pos
    
    def get_mapping (mapper, num):
        freqmap = [None]

        for n in range(num):
            freq = mapper(n+1)
            freqmap.append(freq)

        return freqmap

    tone_names_to_num_map = {}

    with codecs.open(source_file, encoding="utf-8") as tones:
        scale = re.match(
            r'^# SOMPYLER TONE SCALE: (\d+)D(\d+)/(\d+)',
            next(tones)
        )
        if not scale: raise Exception(
           "{} not recognized as a sompyler tone scale".format(source_file)
           + """
             Prepend it with following line:
             SOMPYLER TONE SCALE: 440D49/12
             The values can be difference, to adapt for other cultures.
             See documentation to learn what they mean.
             """
        )
        for num, names in enumerate(tones):
            for name in names.strip().split(" "):
                tone_names_to_num_map[name] = num+1 
        TOTAL_KEYS_NUM = tone_names_to_num_map[name]

        std_freqmap = get_mapping(
            tone_to_frequence(*scale.groups()), TOTAL_KEYS_NUM
        )
        
    def get_cache (deviant_base_freq=base_freq, *tuning):

        if tuning:
            offset = tuning[0]
            tunes = [ i*100+c for i, c in enumerate(tuning[1:]) ]
            tune0 = tunes[ -offset % octave_intervals ]
            modop = octave_intervals * 100
            for n in range(TOTAL_KEYS_NUM):
                i = (n - offset) % octave_intervals
                freqmap[n] = deviant_base_freq * 2 ** (
                    ( int( (n-substract) / octave_intervals ) * modop
                      + ( tunes[i] - tune0 ) % modop
                    ) / modop
                )
            
        elif not ( deviant_base_freq == base_freq ):
            freqmap = get_mapping( tone_to_frequence(
                deviant_base_freq, *scale[1:]
            ), TOTAL_KEYS_NUM) 

        else: freqmap = std_freqmap
        
        def tone_resolver(n):
            try:
                num = float(n)
                if str(n) == str(int(num)):
                    return freqmap[ int(n) ]
                else:
                    return num
            except ValueError:        
                return freqmap[ tone_names_to_num_map[n] ]

        return tone_resolver

    return get_cache

