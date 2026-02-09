#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

SCHENGEN_ISO_A2 = {
    "AT", "BE", "CH", "CZ", "DE", "DK", "EE", "ES", "FI", "FR",
    "GR", "HR", "HU", "IS", "IT", "LI", "LT", "LU", "LV", "MT",
    "NL", "NO", "PL", "PT", "SE", "SI", "SK", "BG", "RO",
}

# Some datasets use ISO_A2 as "-99" and store codes in ISO_A3 or ADM0_A3
ISO_A3_TO_A2 = {
    "AUT": "AT", "BEL": "BE", "CHE": "CH", "CZE": "CZ", "DEU": "DE", "DNK": "DK",
    "EST": "EE", "ESP": "ES", "FIN": "FI", "FRA": "FR", "GRC": "GR", "HRV": "HR",
    "HUN": "HU", "ISL": "IS", "ITA": "IT", "LIE": "LI", "LTU": "LT", "LUX": "LU",
    "LVA": "LV", "MLT": "MT", "NLD": "NL", "NOR": "NO", "POL": "PL", "PRT": "PT",
    "SWE": "SE", "SVN": "SI", "SVK": "SK", "BGR": "BG", "ROU": "RO",
}


def detect_iso_a2(props: dict) -> str | None:
    for key in ("ISO_A2", "iso_a2", "ISO2", "iso2", "ISO3166-1-Alpha-2"):
        val = props.get(key)
        if isinstance(val, str) and val != "-99":
            return val.upper()
    for key in ("ISO_A3", "iso_a3", "ADM0_A3", "adm0_a3", "ISO3166-1-Alpha-3"):
        val = props.get(key)
        if isinstance(val, str):
            return ISO_A3_TO_A2.get(val.upper())
    return None


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Filter countries GeoJSON into Schengen-only FeatureCollection."
    )
    parser.add_argument("input", help="Path to countries.geojson")
    parser.add_argument(
        "-o",
        "--output",
        default=str(Path("data") / "schengen.geojson"),
        help="Output path (default: data/schengen.geojson)",
    )
    parser.add_argument(
        "--include",
        nargs="*",
        default=[],
        help="Extra ISO A2 codes to include (space-separated)",
    )
    parser.add_argument(
        "--exclude",
        nargs="*",
        default=[],
        help="ISO A2 codes to exclude (space-separated)",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    data = json.loads(input_path.read_text())
    if data.get("type") != "FeatureCollection":
        raise SystemExit("Input GeoJSON must be a FeatureCollection")

    include = {c.upper() for c in args.include}
    exclude = {c.upper() for c in args.exclude}

    target = (SCHENGEN_ISO_A2 | include) - exclude
    features = []

    for feature in data.get("features", []):
        props = feature.get("properties") or {}
        iso_a2 = detect_iso_a2(props)
        if not iso_a2:
            continue
        if iso_a2 in target:
            features.append(
                {
                    "type": "Feature",
                    "properties": {"iso_a2": iso_a2},
                    "geometry": feature.get("geometry"),
                }
            )

    if not features:
        raise SystemExit("No Schengen features matched. Check input schema.")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output = {"type": "FeatureCollection", "features": features}
    output_path.write_text(json.dumps(output))

    print(f"Wrote {len(features)} features to {output_path}")


if __name__ == "__main__":
    main()
