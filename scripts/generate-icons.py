#!/usr/bin/env python3
"""Generate Goetia PWA icons.

Pure stdlib (zlib + struct) PNG encoder — no Pillow/native deps required.
Renders a binding-ring + pentagram sigil in the game's accent purple on the
dark ritual background, supersampled 4x for anti-aliasing.

Run from the repo root:  python3 scripts/generate-icons.py
"""

import math
import os
import struct
import zlib

BG = (10, 10, 10)        # #0a0a0a ritual background
FG = (187, 136, 238)     # #bb88ee accent purple
SS = 4                   # supersample factor

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")


def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy
    if l2 == 0:
        return math.hypot(px - ax, py - ay)
    t = ((px - ax) * dx + (py - ay) * dy) / l2
    t = 0.0 if t < 0 else (1.0 if t > 1 else t)
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def render(size, content_scale):
    """Return a list of (r,g,b) rows for a `size`x`size` icon."""
    W = size * SS
    c = W / 2.0
    base = W * 0.40 * content_scale          # outer ring radius
    ring_r = base
    ring_half = max(W * 0.020 * content_scale, 1.0) / 2.0
    star_r = base * 0.86                      # pentagram circumscribed radius
    star_half = max(W * 0.018 * content_scale, 1.0) / 2.0

    # Pentagram vertices (point up), drawn in star order 0-2-4-1-3-0.
    pts = []
    for k in range(5):
        a = math.radians(-90 + 72 * k)
        pts.append((c + star_r * math.cos(a), c + star_r * math.sin(a)))
    order = [0, 2, 4, 1, 3, 0]
    segs = [(pts[order[i]], pts[order[i + 1]]) for i in range(5)]

    hi_buf = bytearray(W * W * 3)
    for y in range(W):
        for x in range(W):
            d_ring = abs(math.hypot(x - c, y - c) - ring_r)
            on = d_ring <= ring_half
            if not on:
                for (ax, ay), (bx, by) in segs:
                    if seg_dist(x, y, ax, ay, bx, by) <= star_half:
                        on = True
                        break
            r, g, b = FG if on else BG
            o = (y * W + x) * 3
            hi_buf[o] = r
            hi_buf[o + 1] = g
            hi_buf[o + 2] = b

    # Box-downsample SSxSS -> 1.
    rows = []
    n = SS * SS
    for y in range(size):
        row = bytearray(size * 3)
        for x in range(size):
            r = g = b = 0
            for dy in range(SS):
                base_o = ((y * SS + dy) * W + x * SS) * 3
                for dx in range(SS):
                    o = base_o + dx * 3
                    r += hi_buf[o]
                    g += hi_buf[o + 1]
                    b += hi_buf[o + 2]
            xo = x * 3
            row[xo] = r // n
            row[xo + 1] = g // n
            row[xo + 2] = b // n
        rows.append(row)
    return rows


def write_png(path, size, rows):
    raw = bytearray()
    for row in rows:
        raw.append(0)          # filter type 0 (none)
        raw.extend(row)

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
           + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)


TARGETS = [
    ("icon-192x192.png", 192, 1.0),
    ("icon-512x512.png", 512, 1.0),
    ("maskable-512x512.png", 512, 0.78),   # content within maskable safe zone
    ("apple-touch-icon-180x180.png", 180, 0.92),
]


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, size, scale in TARGETS:
        path = os.path.normpath(os.path.join(OUT_DIR, name))
        write_png(path, size, render(size, scale))
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
