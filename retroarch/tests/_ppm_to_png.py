#!/usr/bin/env python3
"""Convert all PPM files in a directory to PNG using only stdlib."""
import struct, zlib, pathlib, sys, os

def write_png(rgba_rows, width, height, out_path):
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    raw = b''
    for row in rgba_rows:
        raw += b'\x00' + row
    compressed = zlib.compress(raw, 9)
    with open(out_path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', compressed))
        f.write(chunk(b'IEND', b''))

def ppm_to_png(ppm_path, png_path):
    with open(ppm_path, 'rb') as f:
        data = f.read()
    # Parse PPM P6 header
    assert data[:2] == b'P6', f'Not P6: {ppm_path}'
    pos = 2
    tokens = []
    while len(tokens) < 3:
        while pos < len(data) and data[pos:pos+1] in (b' ', b'\t', b'\n', b'\r'):
            pos += 1
        if data[pos:pos+1] == b'#':
            while pos < len(data) and data[pos:pos+1] != b'\n':
                pos += 1
            continue
        end = pos
        while end < len(data) and data[end:end+1] not in (b' ', b'\t', b'\n', b'\r'):
            end += 1
        tokens.append(int(data[pos:end]))
        pos = end
    # skip one whitespace byte after header
    pos += 1
    width, height, maxval = tokens
    pixels = data[pos:]
    rows = []
    for y in range(height):
        row = b''
        for x in range(width):
            idx = (y * width + x) * 3
            r, g, b = pixels[idx], pixels[idx+1], pixels[idx+2]
            row += struct.pack('BBB', r, g, b)
        rows.append(row)
    write_png(rows, width, height, png_path)

src_dir = pathlib.Path('/mnt/c/Users/brend/exp/nova64/retroarch/screenshots')
for ppm in sorted(src_dir.glob('*.ppm')):
    png = ppm.with_suffix('.png')
    ppm_to_png(str(ppm), str(png))
    print(f'  {ppm.name} -> {png.name}')
print('done')
