#!/usr/bin/env bash
set -e

FILE="global-world.js"

if [ ! -f "$FILE" ]; then
  echo "ERROR: global-world.js not found."
  exit 1
fi

cp "$FILE" "$FILE.zoom-backup"

python3 - <<'PY'
from pathlib import Path

p = Path("global-world.js")
s = p.read_text(encoding="utf-8")

if "gwZoomIn" in s:
    print("Zoom controls already exist. No changes made.")
    raise SystemExit(0)

s = s.replace(
    "let dragMoved = false;",
    "let dragMoved = false;\n  let zoomLevel = 1;",
    1
)

s = s.replace(
    ".gw-map-shell {",
    """.gw-map-shell {""",
    1
)

s = s.replace(
    "#gwMap {width:100%;height:100%;display:block;touch-action:none;cursor:grab}",
    """#gwMap {width:100%;height:100%;display:block;touch-action:none;cursor:grab}
      .gw-zoom-controls {
        position:absolute;right:14px;bottom:14px;z-index:5;
        display:flex;flex-direction:column;gap:7px;
      }
      .gw-zoom-btn {
        width:40px;height:40px;border-radius:11px;
        border:1px solid #83bce6;background:#102b4cdd;
        color:white;font-size:23px;font-weight:800;cursor:pointer;
        box-shadow:0 4px 15px #0007;
      }
      .gw-zoom-btn:hover {background:#2563a0}
      .gw-zoom-btn:active {transform:scale(.94)}
      .gw-zoom-label {
        position:absolute;left:12px;bottom:16px;z-index:5;
        background:#07172cbb;color:#d7edff;
        border:1px solid #46769b;border-radius:8px;
        padding:6px 9px;font-size:12px;
      }""",
    1
)

old = """            <svg id="gwMap" viewBox="0 0 640 640"
              role="img" aria-label="Interactive geographic world globe">
            </svg>
          </div>"""

new = """            <svg id="gwMap" viewBox="0 0 640 640"
              role="img" aria-label="Interactive geographic world globe">
            </svg>
            <div class="gw-zoom-controls">
              <button class="gw-zoom-btn" id="gwZoomIn" title="Zoom in">+</button>
              <button class="gw-zoom-btn" id="gwZoomOut" title="Zoom out">−</button>
              <button class="gw-zoom-btn" id="gwZoomReset" title="Reset zoom"
                style="font-size:17px">↺</button>
            </div>
            <div class="gw-zoom-label" id="gwZoomLabel">100%</div>
          </div>"""

if old not in s:
    raise SystemExit("Could not find the globe SVG markup. No changes made.")

s = s.replace(old, new, 1)

old = """      const projection = d3.geoOrthographic()
        .translate([320,320])
        .scale(298)
        .clipAngle(90)"""

new = """      const projection = d3.geoOrthographic()
        .translate([320,320])
        .scale(298 * zoomLevel)
        .clipAngle(90)"""

if old not in s:
    raise SystemExit("Could not find globe projection. No changes made.")

s = s.replace(old, new, 1)

old = """      function redrawMap() {
        projection.rotate([rotation,globeTilt]);
        ocean.attr("d",path);"""

new = """      function redrawMap() {
        projection
          .rotate([rotation,globeTilt])
          .scale(298 * zoomLevel);

        ocean.attr("d",path);"""

if old not in s:
    raise SystemExit("Could not find redrawMap function. No changes made.")

s = s.replace(old, new, 1)

old = """      let pointer = null;
      let startRotation = 0;"""

new = """      function updateZoom() {
        zoomLevel = Math.max(1, Math.min(4, zoomLevel));
        redrawMap();

        const label = document.getElementById("gwZoomLabel");
        if (label) label.textContent = Math.round(zoomLevel * 100) + "%";
      }

      document.getElementById("gwZoomIn").onclick = () => {
        zoomLevel = Math.min(4, zoomLevel + 0.25);
        updateZoom();
      };

      document.getElementById("gwZoomOut").onclick = () => {
        zoomLevel = Math.max(1, zoomLevel - 0.25);
        updateZoom();
      };

      document.getElementById("gwZoomReset").onclick = () => {
        zoomLevel = 1;
        updateZoom();
      };

      svg.node().addEventListener("wheel", event => {
        event.preventDefault();
        zoomLevel += event.deltaY < 0 ? 0.15 : -0.15;
        updateZoom();
      }, {passive:false});

      let pointer = null;
      let startRotation = 0;"""

if old not in s:
    raise SystemExit("Could not find pointer controls. No changes made.")

s = s.replace(old, new, 1)

p.write_text(s, encoding="utf-8")
print("Globe zoom system successfully installed.")
PY

echo "Done! Refresh your game and open Global > Globe World."
echo "Backup: global-world.js.zoom-backup"
