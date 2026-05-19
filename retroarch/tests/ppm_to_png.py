"""Convert a binary P6 PPM file to a PNG file (no external dependencies)."""
import struct
import sys
import zlib


def convert(ppm_path: str, png_path: str) -> None:
    with open(ppm_path, "rb") as f:
        tokens: list[bytes] = []
        buf = bytearray()
        while len(tokens) < 4:
            ch = f.read(1)
            if not ch:
                raise ValueError("truncated PPM header")
            if ch == b"#":
                while ch not in (b"", b"\n", b"\r"):
                    ch = f.read(1)
                continue
            if ch in (b" ", b"\t", b"\r", b"\n"):
                if buf:
                    tokens.append(bytes(buf))
                    buf.clear()
            else:
                buf.extend(ch)
        if tokens[0] != b"P6":
            raise ValueError(f"not a P6 PPM: {tokens[0]}")
        width = int(tokens[1])
        height = int(tokens[2])
        maxval = int(tokens[3])
        if maxval != 255:
            raise ValueError(f"unsupported PPM maxval: {maxval}")
        raw = f.read()
        expected = width * height * 3
        if len(raw) < expected:
            raise ValueError(f"truncated PPM pixel data: expected {expected}, got {len(raw)}")
        raw = raw[:expected]

    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    rows = b""
    for y in range(height):
        rows += b"\x00" + raw[y * width * 3 : (y + 1) * width * 3]

    with open(png_path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)))
        f.write(chunk(b"IDAT", zlib.compress(rows, 6)))
        f.write(chunk(b"IEND", b""))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"usage: {sys.argv[0]} input.ppm output.png", file=sys.stderr)
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
