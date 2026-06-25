from dataclasses import dataclass

CUR_POSITION = {}
SLOTS = (
    "measure", "item", "voice", "line", "bar", "offset", "motif",
    "stem", "chainparen", "cluster", "position", "article"
)

def getinstance():
    return PositionPath(**{
        key: value for key, value in CUR_POSITION.items()
                   if value is not None
        })

sentinel = object()
def measure(name_or_id=sentinel):
    if name_or_id is sentinel:
        return CUR_POSITION["measure"]
    else:
        CUR_POSITION["measure"] = name_or_id
        for slot in SLOTS[1:]:
            CUR_POSITION[slot] = None

def item(num):
    if num is sentinel:
        return CUR_POSITION["item"]
    else:
        CUR_POSITION["item"] = name
        for slot in SLOTS[2:]:
            CUR_POSITION[slot] = None

def voice(name):
    if name is sentinel:
        return CUR_POSITION["voice"]
    else:
        CUR_POSITION["voice"] = name
        for slot in SLOTS[3:]:
            CUR_POSITION[slot] = None

def line(num):
    if CUR_POSITION["offset"] is not None:
        CUR_POSITION["bar"] = None
    if num is sentinel:
        return CUR_POSITION["line"]
    else:
        CUR_POSITION["line"] = num
        for slot in SLOTS[6:]:
            CUR_POSITION[slot] = None

def bar(num):
    if CUR_POSITION["line"] is not None:
        CUR_POSITION["offset"] = None
    if num is sentinel:
        return CUR_POSITION["bar"]
    else:
        CUR_POSITION["bar"] = name
        for slot in SLOTS[6:]:
            CUR_POSITION[slot] = None

def offset(num):
    if num is sentinel:
        return CUR_POSITION["offset"]
    else:
        CUR_POSITION["offset"] = num
        for slot in SLOTS[6:]:
            CUR_POSITION[slot] = None

def motif(name):
    if name is sentinel:
        return CUR_POSITION["motif"]
    else:
        CUR_POSITION["motif"] = name
        for slot in SLOTS[7:]:
            CUR_POSITION[slot] = None

def stem(num=sentinel):
    if num is sentinel:
        return CUR_POSITION["stem"]
    else:
        CUR_POSITION["stem"] = num
        for slot in SLOTS[8:]:
            CUR_POSITION[slot] = None

def chainparen(num):
    if num is sentinel:
        return CUR_POSITION["chainparen"]
    else:
        CUR_POSITION["chainparen"] = num
        for slot in SLOTS[9:]:
            CUR_POSITION[slot] = None

def cluster(num=sentinel):
    if num is sentinel:
        return CUR_POSITION["cluster"]
    else:
        CUR_POSITION["cluster"] = num
        for slot in SLOTS[10:]:
            CUR_POSITION[slot] = None

def position(num=sentinel):
    if num is sentinel:
        return CUR_POSITION["position"]
    else:
        CUR_POSITION["position"] = num
        for slot in SLOTS[11:]:
            CUR_POSITION[slot] = None

def article(num):
    if num is sentinel:
        return CUR_POSITION["article"]
    else:
        CUR_POSITION["article"] = num

@dataclass
class PositionPath:
    measure: str           # measure identifier: number or name
    voice: str             # voice label
    stem: int = None       # stem note at the beginning or after , or < or
    item: int = None       # list item in a multimeasure
    bar: int = None        # in multi-bar items of a multimeasure
    offset: int = None     # chord offset or string if in a named motif
    line: int = None       # list item in a chord or under an offset
    motif: str = None
    chainparen: int = None # last opened parenthesis
    cluster: int = None    # prepended by space or open paren and/or
                           #   followed by space or * for repetition
    position: int = None   # position in that cluster or in the simple chain
    article: str = None    # article letter used with any extensions

    def __str__(self):
        return ".".join([
                self.measure,
                self.voice,
                *self.location(),
                *self.stem_with_chain()
            ])

    def location(self):
        location = []
        if self.item is not None:
            location.append(f"i{self.item}")

        if self.bar is not None:
            if self.line is not None:
                location.append(f"L{self.line}")
            location.append(f"b{self.bar}")
        else:
            if isinstance(self.offset, int):
                location.append(f"o{self.offset}")
            elif self.offset is not None:
                location.append(f"{self.offset}")
            if self.line is not None:
                location.append(f"L{self.line}")

        return location

    def stem_with_chain(self):
        segm = []

        if self.stem is not None:
            segm.append(f"s{self.stem}")

        if self.motif is None:
            if self.chainparen is not None:
                segm.append(f"p{self.chainparen}")

            if self.cluster is not None:
                segm.append(f"c{self.cluster}")

            if self.position is not None:
                pos = str(self.position)
            else:
                pos = ''

            if self.article is None:
                if pos: segm.append(pos)
            else:
                segm.append(f"{self.position}={self.article}")

        else:
            motif, subposition = self.motif
            if isinstance(subposition, PositionPath):
                subposition = ".".join(subposition.stem_with_chain())
            segm.append(f'{motif}<{subposition}')

        return segm
