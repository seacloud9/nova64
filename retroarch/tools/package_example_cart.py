#!/usr/bin/env python3
"""Package examples/<cart> directories as RetroArch .nova bundles."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


ZIP_DATE = (2026, 1, 1, 0, 0, 0)


def repo_root_from_script() -> Path:
    return Path(__file__).resolve().parents[2]


def safe_package_path(name: str) -> str:
    normalized = name.replace("\\", "/").strip()
    parts = normalized.split("/")
    if (
        not normalized
        or normalized.startswith("/")
        or "\0" in normalized
        or any(part in {"", ".", ".."} for part in parts)
    ):
        raise SystemExit(f"Unsafe asset path in manifest: {name!r}")
    return normalized


def write_file(package: ZipFile, source: Path, arcname: str) -> int:
    info = ZipInfo(arcname, ZIP_DATE)
    info.compress_type = ZIP_DEFLATED
    data = source.read_bytes()
    package.writestr(info, data)
    return len(data)


def package_cart(repo_root: Path, cart_name: str, out_dir: Path) -> Path:
    cart_dir = repo_root / "examples" / cart_name
    code = cart_dir / "code.js"
    manifest_path = cart_dir / "manifest.json"
    meta_path = cart_dir / "meta.json"

    if not code.exists():
        raise SystemExit(f"Missing example cart code: {code}")
    if not manifest_path.exists():
        raise SystemExit(f"Missing example cart manifest: {manifest_path}")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
    assets = [safe_package_path(asset) for asset in manifest.get("assets", [])]

    shared_assets = []
    if any(token in code.read_text(encoding="utf-8-sig") for token in
           ("createHDRSkybox", "createImageSkybox", "assets/sky/")):
        shared_assets = [shared for shared in sorted((repo_root / "public/assets/sky").rglob("*"))
                         if shared.is_file() and not shared.name.endswith(".import")
                         and shared.relative_to(repo_root / "public").as_posix() not in assets]
    manifest["assets"] = assets + [shared.relative_to(repo_root / "public").as_posix()
                                   for shared in shared_assets]

    out_dir.mkdir(parents=True, exist_ok=True)
    package_path = out_dir / f"{cart_name}.nova"
    total_bytes = 0
    file_count = 0

    with ZipFile(package_path, "w", ZIP_DEFLATED) as package:
        total_bytes += write_file(package, code, "code.js")
        file_count += 1
        manifest_data = json.dumps(manifest, indent=2).encode("utf-8")
        manifest_info = ZipInfo("manifest.json", ZIP_DATE)
        manifest_info.compress_type = ZIP_DEFLATED
        package.writestr(manifest_info, manifest_data)
        total_bytes += len(manifest_data)
        file_count += 1
        if meta_path.exists():
            total_bytes += write_file(package, meta_path, "meta.json")
            file_count += 1

        for shared in shared_assets:
            total_bytes += write_file(package, shared, shared.relative_to(repo_root / "public").as_posix())
            file_count += 1

        for asset in assets:
            source = cart_dir / asset
            if not source.exists():
                raise SystemExit(f"Manifest asset does not exist: {source}")
            total_bytes += write_file(package, source, asset)
            file_count += 1

    size = package_path.stat().st_size
    print(
        f"packaged {package_path} "
        f"({file_count} files, {total_bytes / 1024 / 1024:.1f} MiB input, "
        f"{size / 1024 / 1024:.1f} MiB package)"
    )
    return package_path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Package examples/<cart> as RetroArch .nova bundles."
    )
    parser.add_argument("cart", nargs="+", help="Example cart slug, e.g. indie-odyssey")
    parser.add_argument("--repo-root", type=Path, default=repo_root_from_script())
    parser.add_argument("--out-dir", type=Path, default=None)
    args = parser.parse_args()

    repo_root = args.repo_root.resolve()
    out_dir = (
        args.out_dir.resolve()
        if args.out_dir is not None
        else repo_root / "retroarch" / "games"
    )

    for cart_name in args.cart:
        package_cart(repo_root, cart_name, out_dir)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
