#!/usr/bin/env python3
"""Generate a 6-face cube-map PNG set for the Nova64 PBR showcase."""

import struct, zlib, os, math

def write_png(path, pixels, w, h):
    """Write a 24-bit RGB PNG using only Python stdlib. pixels: bytes, RGB packed."""
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    # Build scanlines with filter byte 0 (None) per row
    raw_rows = bytearray()
    stride = w * 3
    for row in range(h):
        raw_rows += b'\x00'
        raw_rows += pixels[row * stride: (row + 1) * stride]

    png  = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw_rows), 6))
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)

def lerp(a, b, t):
    return int(a + (b - a) * max(0.0, min(1.0, t)))

def lerp3(ca, cb, t):
    return (lerp(ca[0], cb[0], t), lerp(ca[1], cb[1], t), lerp(ca[2], cb[2], t))

def add3(ca, cb):
    return (min(255, ca[0] + cb[0]), min(255, ca[1] + cb[1]), min(255, ca[2] + cb[2]))

W, H = 256, 256
OUT  = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'sky', 'studio')
os.makedirs(OUT, exist_ok=True)

# ── Palette ──────────────────────────────────────────────────────────────────
TOP    = (220, 232, 255)   # cool-white ceiling / key light
BOTTOM = (10,  12,  22)    # near-black floor
SIDE_A = (28,  38,  78)    # deep-indigo default wall
SIDE_B = (18,  28,  58)    # darker indigo for variety
WARM   = (120, 78,  38)    # warm amber accent (right/+X)
COOL   = (38,  80,  165)   # electric-blue accent (left/-X)

def star(x, y, seed):
    """Sparse, soft sparkle highlights to simulate distant light sources."""
    gx = int(x * 64)
    gy = int(y * 64)
    h  = (gx * 1013 + gy * 3127 + seed * 7919) % 32768
    if h < 40:
        fx = (x * 64) - gx - 0.5
        fy = (y * 64) - gy - 0.5
        dist   = math.sqrt(fx*fx + fy*fy)
        bloom  = max(0.0, 1.0 - dist * 5.5)
        bright = (h / 40.0) * bloom * (0.6 + (h % 3) * 0.2)
        sv = int(bright * 220)
        return (sv, sv, sv)
    return (0, 0, 0)

def make_face(name, base_fn, seed):
    buf = bytearray(W * H * 3)
    for row in range(H):
        v = row / (H - 1)
        for col in range(W):
            u = col / (W - 1)
            r, g, b = base_fn(u, v)
            sp = star(u, v, seed)
            idx = (row * W + col) * 3
            buf[idx    ] = min(255, r + sp[0])
            buf[idx + 1] = min(255, g + sp[1])
            buf[idx + 2] = min(255, b + sp[2])
    dest = os.path.join(OUT, name + '.png')
    write_png(dest, bytes(buf), W, H)
    print(f'  wrote {dest}')

# ── Face definitions ─────────────────────────────────────────────────────────

def face_px(u, v):   # +X  right  — warm amber gradient
    base = lerp3(SIDE_A, WARM, u * 0.65)
    return lerp3(base, TOP, max(0.0, 1.0 - v * 1.25))

def face_nx(u, v):   # -X  left   — cool electric-blue accent
    base = lerp3(COOL, SIDE_A, u * 0.75)
    return lerp3(base, TOP, max(0.0, 1.0 - v * 1.25))

def face_py(u, v):   # +Y  top    — bright radial ceiling light
    cx, cy = u - 0.5, v - 0.5
    d = math.sqrt(cx*cx + cy*cy)
    return lerp3(TOP, SIDE_A, min(1.0, d * 1.9))

def face_ny(u, v):   # -Y  bottom — almost-black floor
    return lerp3(BOTTOM, SIDE_A, (1.0 - v) * 0.3)

def face_pz(u, v):   # +Z  front  — neutral indigo
    base = lerp3(SIDE_B, SIDE_A, u)
    return lerp3(base, TOP, max(0.0, 1.0 - v * 1.35))

def face_nz(u, v):   # -Z  back   — cool-shifted
    base = lerp3(SIDE_A, COOL, (1.0 - u) * 0.42)
    return lerp3(base, TOP, max(0.0, 1.0 - v * 1.35))

print('Generating studio cube map — 512x512 per face ...')
make_face('px', face_px, 11)
make_face('nx', face_nx, 23)
make_face('py', face_py, 37)
make_face('ny', face_ny, 53)
make_face('pz', face_pz, 67)
make_face('nz', face_nz, 79)
print('Done! 6 faces written to', os.path.abspath(OUT))
