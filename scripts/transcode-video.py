#!/usr/bin/env python3
"""Transcode a source video into Nova64 cart-ready assets.

Nova64 plays video on three backends, each wanting a different container:

  web        <video> tag        .mp4  (H.264/AAC) — served from public/ or a cart URL
  Godot      VideoStreamPlayer   .ogv  (Theora/Vorbis) — the only format Godot decodes natively
  RetroArch  pl_mpeg in-core     .mpg  (MPEG1/MP2) — the libretro core has no other codec

This helper produces the .ogv and .mpg from one source (and can copy the .mp4),
all sized to the Nova64 framebuffer, so a single `nova64.video.playFullscreen`
call works everywhere. See docs/VIDEO_GUIDE.md and examples/story-video-demo.

Usage:
    python3 scripts/transcode-video.py INPUT OUTDIR [options]

    INPUT     source video (any format ffmpeg reads; ideally with an audio track)
    OUTDIR    cart asset dir, e.g. examples/mycart/assets/video

Options:
    --name NAME     output basename (default: sample) -> NAME.mpg / NAME.ogv
    --start SEC     clip start time in the source (default: 0)
    --duration SEC  clip length (default: whole file)
    --size WxH      target size (default: 640x360, the Nova64 framebuffer)
    --fps N         output frame rate (default: 24)
    --mp4           also write NAME.mp4 (H.264/AAC) for the web backend
    --no-ogv        skip the Godot .ogv
    --no-mpg        skip the RetroArch .mpg

ffmpeg is required. Override the binary with the FFMPEG env var (e.g. a static
build): FFMPEG=/tmp/ffmpeg python3 scripts/transcode-video.py in.mp4 out/
"""
import argparse
import os
import shutil
import subprocess
import sys

FFMPEG = os.environ.get("FFMPEG", "ffmpeg")
# 44100 matches the RetroArch core's mixer (NOVA64_SAMPLE_RATE) so MP2 audio is
# mixed 1:1 with no resampling. Keep this in sync with the core if it changes.
SAMPLE_RATE = 44100


def run(cmd):
    print("  $ " + " ".join(cmd))
    proc = subprocess.run(cmd, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr[-2000:] + "\n")
        sys.exit(f"ffmpeg failed (exit {proc.returncode})")


def has_audio(path):
    """True if the source has at least one audio stream (so output won't be silent)."""
    out = subprocess.run([FFMPEG, "-hide_banner", "-i", path],
                         stderr=subprocess.PIPE, text=True).stderr
    return "Audio:" in out


def clip_args(start, duration):
    a = []
    if start:
        a += ["-ss", str(start)]
    if duration:
        a += ["-t", str(duration)]
    return a


def main():
    ap = argparse.ArgumentParser(add_help=True, description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("outdir")
    ap.add_argument("--name", default="sample")
    ap.add_argument("--start", type=float, default=0)
    ap.add_argument("--duration", type=float, default=0)
    ap.add_argument("--size", default="640x360")
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--mp4", action="store_true")
    ap.add_argument("--no-ogv", action="store_true")
    ap.add_argument("--no-mpg", action="store_true")
    args = ap.parse_args()

    if not shutil.which(FFMPEG) and not os.path.exists(FFMPEG):
        sys.exit(f"ffmpeg not found ('{FFMPEG}'). Install it or set FFMPEG=/path/to/ffmpeg.")
    if not os.path.isfile(args.input):
        sys.exit(f"input not found: {args.input}")
    os.makedirs(args.outdir, exist_ok=True)

    try:
        w, h = (int(x) for x in args.size.lower().split("x"))
    except ValueError:
        sys.exit(f"--size must be WxH, got {args.size!r}")

    # Letterbox-fit into WxH so any source aspect lands cleanly on the framebuffer.
    vf = (f"scale={w}:{h}:force_original_aspect_ratio=decrease,"
          f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:black")
    clip = clip_args(args.start, args.duration)
    audio = has_audio(args.input)
    if not audio:
        print("! source has no audio track — output will be SILENT.")

    out = lambda ext: os.path.join(args.outdir, f"{args.name}.{ext}")

    if not args.no_mpg:
        print(f"-> RetroArch MPEG1: {out('mpg')}")
        a = ["-c:a", "mp2", "-ar", str(SAMPLE_RATE), "-ac", "2", "-b:a", "160k"] if audio else ["-an"]
        run([FFMPEG, "-y", "-hide_banner", "-loglevel", "warning", *clip, "-i", args.input,
             "-vf", vf, "-c:v", "mpeg1video", "-g", "15", "-bf", "0", "-b:v", "1500k",
             "-r", str(args.fps), *a, "-f", "mpeg", out("mpg")])

    if not args.no_ogv:
        print(f"-> Godot Theora:    {out('ogv')}")
        a = ["-c:a", "libvorbis", "-ar", str(SAMPLE_RATE), "-ac", "2"] if audio else ["-an"]
        run([FFMPEG, "-y", "-hide_banner", "-loglevel", "warning", *clip, "-i", args.input,
             "-vf", vf, "-c:v", "libtheora", "-q:v", "7", "-r", str(args.fps), *a, out("ogv")])

    if args.mp4:
        print(f"-> Web H.264:       {out('mp4')}")
        a = ["-c:a", "aac", "-b:a", "160k"] if audio else ["-an"]
        run([FFMPEG, "-y", "-hide_banner", "-loglevel", "warning", *clip, "-i", args.input,
             "-vf", vf, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(args.fps),
             "-movflags", "+faststart", *a, out("mp4")])

    print("\nDone. Wire it into your cart's nova64.video.playFullscreen call:")
    print("  nova64.video.playFullscreen('/assets/your.mp4', {")
    if not args.no_ogv:
        print(f"    nativeUrl: 'assets/video/{args.name}.ogv',  // Godot")
    if not args.no_mpg:
        print(f"    mpgUrl:    'assets/video/{args.name}.mpg',  // RetroArch")
    print("    muted: false, onFinish: () => {/* next screen */},")
    print("  });")
    if not args.no_mpg:
        print(f"\nAdd 'assets/video/{args.name}.mpg' to the cart manifest.json so it lands in the .nova,")
        print("then repackage: python3 retroarch/tools/package_example_cart.py <cart> --out-dir retroarch/games")


if __name__ == "__main__":
    main()
