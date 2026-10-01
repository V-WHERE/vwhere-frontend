"""Rebuild the display geometry: pip install pyarrow shapely; python scripts/build_province_map.py.

Source is pinned and checked. M5 price data is never read or modified here.
"""
import hashlib
import json
import math
from pathlib import Path
from urllib.request import urlopen

import pyarrow.parquet as pq
from pyarrow import BufferReader
from shapely import from_wkb

COMMIT = 'dd1881663fcabc69b81393604e91ebf3a4202e9a'
URL = f'https://raw.githubusercontent.com/vuski/admdongkor/{COMMIT}/parquet/simplified/sido_20260701_light.parquet'
SHA256 = '4948905c12ffaa9e2c3d3e679f4b74185a7f1453f3b61d70e947f6655e56844d'
# Korean display labels and positions; these contain no analytical values.
LABELS = {
    '11': ('서울', 204, 153, True), '12': ('광주·전남', 286, 473, False),
    '26': ('부산', 535, 478, True), '27': ('대구', 528, 347, True),
    '28': ('인천', 162, 206, True), '30': ('대전', 228, 336, True),
    '31': ('울산', 586, 408, True), '36': ('세종', 207, 252, True),
    '41': ('경기', 351, 188, False), '43': ('충북', 378, 272, False),
    '44': ('충남', 274, 285, False), '47': ('경북', 456, 280, False),
    '48': ('경남', 412, 425, False), '50': ('제주', 263, 647, False),
    '51': ('강원', 416, 124, False), '52': ('전북', 321, 381, False),
}

def project(lon, lat):
    # Small offshore islands retain their shapes, shown in a labeled inset.
    if lon > 130:
        return (549 + (lon - 130.75) * 74, 65 + (37.6 - lat) * 74)
    return ((lon - 127.35) * math.cos(math.radians(36)) * 112 + 340,
            (38.7 - lat) * 112 + 40)


def ring_path(coords):
    points = [project(lon, lat) for lon, lat in coords]
    return 'M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in points) + 'Z'


def main():
    blob = urlopen(URL).read()
    assert hashlib.sha256(blob).hexdigest() == SHA256, 'Upstream file changed'
    rows = pq.read_table(BufferReader(blob)).to_pylist()
    assert {r['sidocd'] for r in rows} == set(LABELS), 'Unexpected province code set'
    features = []
    for row in rows:
        geometry = from_wkb(row['geometry']).simplify(0.001, preserve_topology=True)
        polygons = list(geometry.geoms) if geometry.geom_type == 'MultiPolygon' else [geometry]
        largest = max(polygons, key=lambda g: g.area).representative_point()
        anchor = project(largest.x, largest.y)
        name, x, y, callout = LABELS[row['sidocd']]
        path = ''.join(ring_path(poly.exterior.coords) + ''.join(ring_path(r.coords) for r in poly.interiors) for poly in polygons)
        features.append({'code': row['sidocd'], 'name': name, 'officialName': row['sidonm'],
                         'path': path, 'label': [x, y], 'anchor': [round(v, 1) for v in anchor], 'callout': callout})
    payload = {'boundaryDate': '2026-07-01', 'width': 680, 'height': 710,
               'sourceUrl': URL, 'sourceSha256': SHA256, 'features': features}
    out = Path(__file__).resolve().parents[1] / 'src/data/korea-provinces.json'
    out.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'{len(features)} provinces, {out.stat().st_size:,} bytes')

if __name__ == '__main__':
    main()
