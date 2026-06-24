from math import sqrt
from ...syntaxtracer import default_noop

syntracer = default_noop()

class Point:
    __slots__ = ['x', 'y', 'z']
    def __init__(self, x, y, z=1):
        self.x = x
        self.y = y
        self.z = z

    @staticmethod
    def distance(a, b):
        return sqrt( (b.x - a.x)**2 + (b.y - a.y)**2 + (b.z - a.z)**2 )

    @staticmethod
    def _weighted_average(a, dist, b):
        x = (1 - dist) * a.x + dist * b.x
        y = (1 - dist) * a.y + dist * b.y
        z = (1 - dist) * a.z + dist * b.z
        return (x, y, z)

    @classmethod
    def weighted_average(cls, *args):
        return cls(*Point._weighted_average(*args))

    def new_alike(self, x=None, y=None, z=None, *further):
        if x is None:
            x = self.x
        if y is None:
            y = self.y
        if z is None:
            z = self.z
        return self.__class__(x, y, z, *further)

    def __getitem__(self, n):
        if n > 2: return IndexError
        else:
            return getattr(self, Point.__slots__[0:3][n])

    def __len__(self): return 3

    def __repr__(self):
        try:
            ext = self.is_sharp
        except:
            ext = self.symp
        return "{}({},{},{},{})".format(
                type(self).__name__,
                self.x, self.y, self.z,
                repr(ext)
            )

class BezierEdgePoint(Point):
    __slots__ = ['is_sharp']
    def __init__(self, x, y, z, is_sharp):
        if is_sharp is None:
            raise AttributeError("Missing is_sharp boolean flag")
        super(BezierEdgePoint, self).__init__(x, y, z)
        self.is_sharp = is_sharp

    def ext(self): return self.is_sharp

    def new_alike(self, x=None, y=None, z=None, is_sharp=None):
        if is_sharp is None:
            is_sharp = self.is_sharp
        return super(BezierEdgePoint, self).new_alike(x, y, z, is_sharp)

    def __getitem__(self, n):
        return self.is_sharp if n == 3 else Point.__getitem__(self, n)

    def __len__(self): return 4

    @classmethod
    def weighted_average(cls, a, dist, b):
        if not isinstance(b, BezierEdgePoint):
            raise TypeError(
                "Points are not compatible: {} vs. {}".format(
                    repr(a), repr(b)
                )
            )
        x, y, z = super(BezierEdgePoint, cls)._weighted_average(a, dist, b)
        if a.is_sharp == b.is_sharp:
            is_sharp = a.is_sharp
        elif a.is_sharp:
            is_sharp = dist
        elif b.is_sharp:
            is_sharp = 1 - dist
        else:
            raise RuntimeError("Impossible else entered")
        return cls(x, y, z, is_sharp)

class SympartialPoint(Point):
    __slots__ = ['symp']
    def __init__(self, x, y, z, symp=None):
        if symp is None:
            raise AttributeError("Missing a sympartial for SympartialPoint instance")
        super(SympartialPoint, self).__init__(x, y, z)
        self.symp = symp

    def ext(self): return self.symp

    def new_alike(self, x=None, y=None, symp=None):
        if symp is None:
            symp = self.symp
        return super(SympartialPoint, self).new_alike(x, y, 1, symp)

    def __getitem__(self, n):
        return self.symp if n == 3 else Point.__getitem__(self, n)

    def __len__(self): return 4

    @classmethod
    def weighted_average(cls, a, dist, b):
        if not isinstance(b, SympartialPoint):
            raise TypeError("Points are not compatible")
        x, y, z = super(SympartialPoint, cls)._weighted_average(a, dist, b)
        if a.symp == b.symp:
            symp = a.symp
        else:
            symp = a.symp.weighted_average( a.symp, dist, b.symp )
        return cls(x, y, z, symp)

