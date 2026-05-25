#!/usr/bin/env python3
"""Refresh the Windows RetroArch Nova64 playlist from retroarch/games/*.js."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path


CORE_NAME = "nova64_libretro.dll"

# Web carts that depend on browser-only APIs (WebXR, getUserMedia, Babylon,
# web crypto). These load through the compat layer but either crash or run
# without their intended visual, so they stay out of the RetroArch playlist.
WEB_SKIP = {
    "ar-hand-demo",
    "vr-demo",
    "vr-sword-combat",
    "babylon-demo",
    "nft-art-generator",
    "nft-worlds",
}


def default_retroarch_root() -> Path:
    if os.name == "nt":
        return Path("C:/RetroArch-Win64")
    return Path("/mnt/c/RetroArch-Win64")


def repo_root_from_script() -> Path:
    return Path(__file__).resolve().parents[2]


def to_windows_path(path: Path) -> str:
    resolved = path.resolve()
    text = resolved.as_posix()
    if os.name == "nt":
        return str(resolved)
    if text.startswith("/mnt/") and len(text) > 6:
        drive = text[5].upper()
        rest = text[7:].replace("/", "\\")
        return f"{drive}:\\{rest}" if rest else f"{drive}:\\"
    return str(resolved).replace("/", "\\")


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def old_value(old: dict, name: str, fallback):
    return old[name] if name in old else fallback


def build_playlist(
    repo_root: Path,
    games_dir: Path,
    retroarch_root: Path,
    old: dict,
    include_web: bool = True,
) -> dict:
    core_path = to_windows_path(retroarch_root / "cores" / CORE_NAME)
    items = []
    seen_labels: set[str] = set()
    for cart in sorted(games_dir.glob("*.js")):
        seen_labels.add(cart.stem)
        items.append(
            {
                "path": to_windows_path(cart),
                "label": cart.stem,
                "core_path": core_path,
                "core_name": CORE_NAME,
                "crc32": "00000000|crc",
                "db_name": "games.lpl",
            }
        )

    if include_web:
        examples_dir = repo_root / "examples"
        if examples_dir.exists():
            for cart in sorted(examples_dir.glob("*/code.js")):
                slug = cart.parent.name
                if slug in WEB_SKIP:
                    continue
                # Suffix web ports so they sort under their RA siblings and
                # the user can tell which is which without opening the cart.
                label = f"{slug} [web]" if slug in seen_labels else f"{slug}"
                items.append(
                    {
                        "path": to_windows_path(cart),
                        "label": label,
                        "core_path": core_path,
                        "core_name": CORE_NAME,
                        "crc32": "00000000|crc",
                        "db_name": "games.lpl",
                    }
                )

    if not items:
        raise SystemExit(f"No .js carts found in {games_dir}")

    items.sort(key=lambda it: it["label"].lower())

    return {
        "version": old_value(old, "version", "1.5"),
        "default_core_path": core_path,
        "default_core_name": CORE_NAME,
        "label_display_mode": old_value(old, "label_display_mode", 0),
        "right_thumbnail_mode": old_value(old, "right_thumbnail_mode", 0),
        "left_thumbnail_mode": old_value(old, "left_thumbnail_mode", 0),
        "thumbnail_match_mode": old_value(old, "thumbnail_match_mode", 0),
        "sort_mode": old_value(old, "sort_mode", 0),
        "scan_content_dir": to_windows_path(games_dir),
        "scan_file_exts": old_value(old, "scan_file_exts", ""),
        "scan_dat_file_path": old_value(old, "scan_dat_file_path", ""),
        "scan_search_recursively": old_value(old, "scan_search_recursively", True),
        "scan_search_archives": old_value(old, "scan_search_archives", False),
        "scan_filter_dat_content": old_value(old, "scan_filter_dat_content", False),
        "scan_overwrite_playlist": old_value(old, "scan_overwrite_playlist", False),
        "items": items,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Refresh C:/RetroArch-Win64/playlists/games.lpl from retroarch/games/*.js."
    )
    parser.add_argument("--repo-root", type=Path, default=repo_root_from_script())
    parser.add_argument("--retroarch-root", type=Path, default=default_retroarch_root())
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--no-web",
        action="store_true",
        help="Skip examples/*/code.js carts; ship only retroarch/games/*.js",
    )
    args = parser.parse_args()

    repo_root = args.repo_root.resolve()
    games_dir = repo_root / "retroarch" / "games"
    retroarch_root = args.retroarch_root.resolve()
    playlist = retroarch_root / "playlists" / "games.lpl"
    backup = playlist.with_suffix(".lpl.bak")

    if not games_dir.exists():
        raise SystemExit(f"Missing games directory: {games_dir}")
    if not playlist.parent.exists():
        raise SystemExit(f"Missing RetroArch playlist directory: {playlist.parent}")

    old = load_json(playlist)
    data = build_playlist(
        repo_root, games_dir, retroarch_root, old, include_web=not args.no_web
    )
    labels = [item["label"] for item in data["items"]]
    had_playlist = playlist.exists()

    if args.dry_run:
        print(f"Would refresh {playlist}")
    else:
        if had_playlist:
            backup.write_text(json.dumps(old, indent=2) + "\n", encoding="utf-8")
        playlist.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        print(f"Refreshed {playlist}")
        if had_playlist:
            print(f"Backed up previous playlist to {backup}")

    web_count = sum(1 for item in data["items"] if "examples/" in item["path"].replace("\\", "/"))
    ra_count = len(labels) - web_count
    if web_count:
        print(f"Imported {len(labels)} carts: {ra_count} from {games_dir} + {web_count} from examples/*/code.js")
    else:
        print(f"Imported {len(labels)} carts from {games_dir}")
    for label in labels:
        print(label)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
