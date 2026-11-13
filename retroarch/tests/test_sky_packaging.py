"""The alternate packager must declare shared skies, not merely add ZIP entries."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("package_example_cart", ROOT / "retroarch/tools/package_example_cart.py")
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)


class SkyPackagingTests(unittest.TestCase):
    def test_shared_sky_assets_are_in_manifest_and_archive(self):
        with tempfile.TemporaryDirectory() as temporary:
            repo = Path(temporary)
            cart = repo / "examples/sky-test"
            cart.mkdir(parents=True)
            source = "export function init(){ nova64.light.createHDRSkybox('/assets/sky/hdr/test.hdr'); }"
            (cart / "code.js").write_text(source)
            (cart / "manifest.json").write_text(json.dumps({"main": "code.js", "assets": []}))
            assets = repo / "public/assets/sky/hdr"
            assets.mkdir(parents=True)
            (assets / "test.hdr").write_bytes(b"test HDR asset")
            (assets / "CREDITS.md").write_text("test attribution")
            archive = packager.package_cart(repo, "sky-test", repo / "out")
            with ZipFile(archive) as package:
                manifest = json.loads(package.read("manifest.json"))
                for name in ["assets/sky/hdr/test.hdr", "assets/sky/hdr/CREDITS.md"]:
                    self.assertIn(name, manifest["assets"])
                    self.assertIn(name, package.namelist())
                self.assertEqual(package.read("code.js").decode(), source)
            self.assertEqual(json.loads((cart / "manifest.json").read_text())["assets"], [])


if __name__ == "__main__":
    unittest.main()
