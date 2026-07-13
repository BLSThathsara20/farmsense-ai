"""Extract embedded matplotlib PNGs from Colab .ipynb files into figures/."""
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
NB = ROOT / "notebooks"
FIG = ROOT / "figures"

TARGETS = {
    "Notebook_A": "panel_a_rf_confusion.png",
    "Notebook_B": "panel_b_price_mape.png",
    "Notebook_C": "panel_c_weather_forecast.png",
}


def extract_from_ipynb(ipynb_path: Path, out_name: str) -> bool:
    data = json.loads(ipynb_path.read_text())
    for cell in data.get("cells", []):
        for output in cell.get("outputs", []):
            if output.get("data", {}).get("image/png"):
                b64 = output["data"]["image/png"]
                FIG.mkdir(parents=True, exist_ok=True)
                (FIG / out_name).write_bytes(base64.b64decode(b64))
                print(f"Extracted {out_name} from {ipynb_path.name}")
                return True
    return False


def main():
    for ipynb in sorted(NB.glob("*.ipynb")):
        for key, fname in TARGETS.items():
            if key in ipynb.name:
                if not extract_from_ipynb(ipynb, fname):
                    print(f"No PNG in {ipynb.name}")


if __name__ == "__main__":
    main()
