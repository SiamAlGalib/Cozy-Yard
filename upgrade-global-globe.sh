#!/usr/bin/env bash
set -e

FILE="global-world.js"

if [ ! -f "$FILE" ]; then
  echo "ERROR: global-world.js not found. Run this in your game project folder."
  exit 1
fi

cp "$FILE" "$FILE.backup"

python3 - <<'PY'
from pathlib import Path

p = Path("global-world.js")
s = p.read_text(encoding="utf-8")

if "worldFeatures" in s and "gwMap" in s:
    print("Detailed globe upgrade already appears to be installed.")
    raise SystemExit(0)

s = s.replace("const countries = [", "let countries = [", 1)

s = s.replace(
    "let rotation = 0;",
    """let rotation = 0;
  let globeTilt = -15;
  let worldTopology = null;
  let worldFeatures = [];
  let worldDataPromise = null;""",
    1
)

css = r"""
      .gw-map-shell {
        width:100%; max-width:620px; margin:auto;
        aspect-ratio:1; position:relative; border-radius:50%;
        overflow:hidden;
        background:radial-gradient(circle at 35% 28%,#164b79,#06152d 68%,#020817);
        box-shadow:0 0 55px #1688df35, inset 0 0 55px #0009;
      }
      #gwMap {width:100%;height:100%;display:block;touch-action:none;cursor:grab}
      #gwMap:active {cursor:grabbing}
      #gwMap .gw-ocean {stroke:#7edbff;stroke-width:1.5;fill:url(#gwOcean)}
      #gwMap .gw-graticule {fill:none;stroke:#9bdfff;stroke-opacity:.15;stroke-width:.65}
      #gwMap .gw-country-shape {stroke:#d7edc9;stroke-width:.65;cursor:pointer;transition:fill .15s}
      #gwMap .gw-country-shape:hover {fill:#f3d36b!important;stroke:#fff;stroke-width:1.5}
      #gwMap .gw-borders {fill:none;stroke:#e4f3d8;stroke-opacity:.72;stroke-width:.65;pointer-events:none}
      .gw-map-legend {display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:10px;color:#a9bad5;font-size:12px}
      .gw-map-dot {display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px}
      .gw-country-select {width:100%;padding:12px;background:#172744;color:white;border:1px solid #435b83;border-radius:11px;margin:10px 0}
      .gw-map-status {color:#a9bad5;font-size:12px;text-align:center;margin-top:8px}
"""

if "@media(max-width:650px)" in s:
    s = s.replace("@media(max-width:650px)", css + "\n      @media(max-width:650px)", 1)
else:
    s = s.replace("</style>", css + "\n    </style>", 1)

start = s.index("  function renderGlobe(root) {")
end = s.index("\n  function renderCountry(root) {", start)

new_function = r'''
  function loadWorldData() {
    if (worldDataPromise) return worldDataPromise;

    function loadScript(src, ready) {
      if (ready()) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Could not load map library: " + src));
        document.head.appendChild(script);
      });
    }

    worldDataPromise = Promise.all([
      loadScript("https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js", () => !!window.d3),
      loadScript("https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js", () => !!window.topojson)
    ]).then(async () => {
      const response = await fetch(
        "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"
      );
      if (!response.ok) throw new Error("World map data could not be downloaded.");
      worldTopology = await response.json();

      worldFeatures = window.topojson.feature(
        worldTopology,
        worldTopology.objects.countries
      ).features;

      countries = worldFeatures
        .map(feature => feature.properties && feature.properties.name)
        .filter(Boolean)
        .sort((a,b) => a.localeCompare(b));

      return worldFeatures;
    });

    return worldDataPromise;
  }

  function renderGlobe(root) {
    root.innerHTML = `
      <div class="gw-globe-layout">
        <div>
          <div class="gw-map-shell">
            <svg id="gwMap" viewBox="0 0 640 640"
              role="img" aria-label="Interactive geographic world globe">
            </svg>
          </div>
          <div class="gw-map-legend">
            <span><i class="gw-map-dot" style="background:#75ad75"></i>Land</span>
            <span><i class="gw-map-dot" style="background:#147849"></i>Your owned country</span>
            <span><i class="gw-map-dot" style="background:#f6c453"></i>Selected country</span>
          </div>
          <p class="gw-map-status" id="gwMapStatus">Loading geographic country boundaries…</p>
          <p class="gw-note" style="text-align:center">
            Drag to rotate · Select a country on the globe to open its land plan
          </p>
        </div>
        <div>
          <h3>Explore the world</h3>
          <select class="gw-country-select" id="gwCountrySelect">
            <option>Loading countries…</option>
          </select>
          <button class="gw-btn gw-primary" id="gwOpenCountry" style="width:100%">
            Open selected country →
          </button>
          <div class="gw-panel">
            <strong>Real world geography</strong>
            <p class="gw-note">
              Country outlines and coastlines are drawn from geographic boundary data.
              Rotate the globe to explore continents, islands and countries.
            </p>
          </div>
        </div>
      </div>`;

    loadWorldData().then(() => {
      if (mode !== "globe" || !document.getElementById("gwMap")) return;

      const d3 = window.d3;
      const svg = d3.select("#gwMap");
      const status = document.getElementById("gwMapStatus");

      const select = document.getElementById("gwCountrySelect");
      select.innerHTML = countries.map(country =>
        `<option value="${esc(country)}">${esc(country)}</option>`
      ).join("");

      if (!countries.includes(currentCountry)) currentCountry = countries[0];
      select.value = currentCountry;

      document.getElementById("gwOpenCountry").onclick = () => {
        currentCountry = select.value;
        selectedPlot = null;
        mode = "country";
        render();
      };

      svg.selectAll("*").remove();

      svg.append("defs").html(`
        <radialGradient id="gwOcean" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stop-color="#247eae"/>
          <stop offset="48%" stop-color="#07517e"/>
          <stop offset="82%" stop-color="#06315b"/>
          <stop offset="100%" stop-color="#03152f"/>
        </radialGradient>
        <filter id="gwLandTexture">
          <feTurbulence type="fractalNoise" baseFrequency=".045"
            numOctaves="2" seed="8"/>
          <feColorMatrix values="
            .25 0 0 0 .35
            0 .35 0 0 .4
            0 0 .2 0 .15
            0 0 0 .12 0"/>
        </filter>
        <clipPath id="gwGlobeClip">
          <circle cx="320" cy="320" r="300"/>
        </clipPath>
      `);

      const projection = d3.geoOrthographic()
        .translate([320,320])
        .scale(298)
        .clipAngle(90)
        .rotate([rotation, globeTilt]);

      const path = d3.geoPath(projection);
      const sphere = {type:"Sphere"};
      const graticule = d3.geoGraticule10();

      const ocean = svg.append("path")
        .datum(sphere)
        .attr("class","gw-ocean");

      const mapGroup = svg.append("g")
        .attr("clip-path","url(#gwGlobeClip)");

      const grid = mapGroup.append("path")
        .datum(graticule)
        .attr("class","gw-graticule");

      const countryPaths = mapGroup.selectAll(".gw-country-shape")
        .data(worldFeatures)
        .join("path")
        .attr("class","gw-country-shape")
        .attr("data-country",d => d.properties.name)
        .on("click",(event,d) => {
          if (dragMoved) return;
          const name = d.properties.name;
          if (!name) return;
          currentCountry = name;
          selectedPlot = null;
          mode = "country";
          render();
        })
        .append("title")
        .text(d => d.properties.name || "Country");

      const shapes = mapGroup.selectAll(".gw-country-shape");

      const borders = mapGroup.append("path")
        .datum(window.topojson.mesh(
          worldTopology,
          worldTopology.objects.countries,
          (a,b) => a !== b
        ))
        .attr("class","gw-borders");

      function redrawMap() {
        projection.rotate([rotation,globeTilt]);
        ocean.attr("d",path);
        grid.attr("d",path);
        shapes
          .attr("d",path)
          .attr("fill",d => {
            const name = d.properties.name;
            if (name === currentCountry) return "#f6c453";
            if (save.land[name]?.length) return "#147849";
            return "#75ad75";
          });
        borders.attr("d",path);
      }

      let pointer = null;
      let startRotation = 0;
      let startTilt = 0;
      dragMoved = false;

      svg
        .on("pointerdown",event => {
          pointer = [event.clientX,event.clientY];
          startRotation = rotation;
          startTilt = globeTilt;
          dragMoved = false;
          svg.node().setPointerCapture(event.pointerId);
        })
        .on("pointermove",event => {
          if (!pointer) return;
          const dx = event.clientX-pointer[0];
          const dy = event.clientY-pointer[1];
          if (Math.abs(dx)+Math.abs(dy)>5) dragMoved = true;
          rotation = startRotation + dx*.35;
          globeTilt = Math.max(-85,Math.min(85,startTilt-dy*.35));
          redrawMap();
        })
        .on("pointerup pointercancel",() => {
          pointer = null;
        });

      redrawMap();
      status.textContent =
        worldFeatures.length + " geographic country and territory shapes loaded.";
    }).catch(error => {
      console.error("Global World map error:",error);
      const status = document.getElementById("gwMapStatus");
      if (status) status.textContent =
        "Map data could not load. Check your internet connection and refresh.";
    });
  }
'''

# Add a drag flag used to prevent accidental country selection after rotating.
s = s.replace(
    "let worldDataPromise = null;",
    "let worldDataPromise = null;\n  let dragMoved = false;",
    1
)

s = s[:start] + new_function + s[end:]
p.write_text(s, encoding="utf-8")
print("Detailed geographic globe installed.")
PY

echo
echo "SUCCESS: Detailed globe upgrade installed."
echo "Backup: global-world.js.backup"
echo "Refresh your game and open Global > Globe World."
