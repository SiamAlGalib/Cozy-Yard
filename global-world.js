
(() => {
  "use strict";

  const SAVE_KEY = "cozy_global_world_v1";
  let countries = [
    "Bangladesh", "United States", "Canada", "Brazil",
    "United Kingdom", "France", "Germany", "Egypt",
    "Nigeria", "South Africa", "India", "China",
    "Japan", "Indonesia", "Australia", "Mexico"
  ];

  let save = {};
  try {
    save = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
  } catch (_) {
    save = {};
  }

  save.land ||= {};
  save.decor ||= {};

  // Norway Plot 1 is the permanent free home plot.
  save.land.Norway ||= [];
  if (!save.land.Norway.includes(0)) {
    save.land.Norway.push(0);
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (error) {
    console.error("Could not save the free Norway home plot:", error);
  }
  let currentCountry = "Bangladesh";
  let selectedPlot = null;
  let mode = "globe";
  let rotation = 0;
  let globeTilt = -15;
  let worldTopology = null;
  let worldFeatures = [];
  let worldDataPromise = null;
  let dragMoved = false;
  let zoomLevel = 1;

  const game = () => window.__game;
  const money = () => Number(game()?.coins ?? 0);
  const totalOwned = () =>
    Object.values(save.land).reduce((sum, plots) => sum + plots.length, 0);

  function persist() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  // Independent storage for every purchased plot.
  const WORLD_STORAGE_KEYS = [
    "cozy_garden_save_v2",
    "cozy_garden_vx",
    "cozy_garden_vil"
  ];

  const ORIGINAL_WORLD_KEY = "cozy_global_original_world_v1";
  const ACTIVE_PLOT_KEY = "cozy_global_active_plot_v1";
  const PLOT_WORLD_PREFIX = "cozy_global_plot_world_v1:";

  function plotWorldKey(country, plot) {
    return PLOT_WORLD_PREFIX + encodeURIComponent(country) + ":" + Number(plot);
  }

  function readWorldSnapshot() {
    const snapshot = {};
    WORLD_STORAGE_KEYS.forEach(key => {
      snapshot[key] = localStorage.getItem(key);
    });
    return snapshot;
  }

  function writeWorldSnapshot(snapshot) {
    WORLD_STORAGE_KEYS.forEach(key => {
      const value = snapshot && Object.prototype.hasOwnProperty.call(snapshot, key)
        ? snapshot[key] : null;

      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    });
  }

  // Enter an individually saved garden.
  function enterOwnedPlot(country, plot) {
    if (!owned(country, plot)) {
      alert("You must purchase this plot before entering it.");
      return;
    }

    if (localStorage.getItem(ACTIVE_PLOT_KEY)) {
      alert("A land workspace is already open. Exit the current plot first.");
      return;
    }

    try {
      if (!localStorage.getItem(ORIGINAL_WORLD_KEY)) {
        localStorage.setItem(
          ORIGINAL_WORLD_KEY,
          JSON.stringify(readWorldSnapshot())
        );
      }

      const stored = localStorage.getItem(plotWorldKey(country, plot));
      const plotSnapshot = stored ? JSON.parse(stored) : null;

      // New plots start empty.
      writeWorldSnapshot(plotSnapshot || {});

      localStorage.setItem(
        ACTIVE_PLOT_KEY,
        JSON.stringify({ country, plot: Number(plot) })
      );

      location.reload();
    } catch (error) {
      console.error("Could not open isolated land:", error);
      alert(
        "Could not open this land. Check available browser storage and try again."
      );
    }
  }

  // Save the plot and restore the original garden.
  function saveAndReturnToGlobe() {
    let active;

    try {
      active = JSON.parse(
        localStorage.getItem(ACTIVE_PLOT_KEY) || "null"
      );

      if (!active || !owned(active.country, active.plot)) return;

      localStorage.setItem(
        plotWorldKey(active.country, active.plot),
        JSON.stringify(readWorldSnapshot())
      );

      const original = JSON.parse(
        localStorage.getItem(ORIGINAL_WORLD_KEY) || "null"
      );

      if (!original) {
        throw new Error("Original garden backup is missing");
      }

      writeWorldSnapshot(original);

      localStorage.removeItem(ACTIVE_PLOT_KEY);
      document.getElementById("gwPlotBarToggle")?.remove();
      localStorage.removeItem(ORIGINAL_WORLD_KEY);

      location.reload();
    } catch (error) {
      console.error("Could not save/restore land workspace:", error);
      alert(
        "The land could not be safely closed. Your current design is still in this browser. Please do not clear site data; try again."
      );
    }
  }

  // Return button shown while designing a purchased plot.
  function showActivePlotBar() {
    let active;

    try {
      active = JSON.parse(
        localStorage.getItem(ACTIVE_PLOT_KEY) || "null"
      );
    } catch (_) {
      active = null;
    }

    if (!active || document.getElementById("gwPlotReturnBar")) return;

    const bar = document.createElement("div");
    bar.id = "gwPlotReturnBar";

    bar.style.cssText = `
      position:fixed;
      top:calc(14px + env(safe-area-inset-top));
      right:12px;
      z-index:1000005;
      display:flex;
      align-items:center;
      gap:12px;
      max-width:calc(100vw - 54px);
      padding:7px 8px 7px 13px;
      border:1px solid rgba(110,231,163,.65);
      border-radius:17px;
      background:linear-gradient(135deg,rgba(8,35,34,.97),rgba(8,23,32,.96));
      color:#eafff1;
      font:700 12px system-ui,sans-serif;
      box-shadow:0 8px 30px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.08);
      backdrop-filter:blur(14px);
      -webkit-backdrop-filter:blur(14px);
      transition:transform .25s ease,opacity .25s ease;
    `;

    const label = document.createElement("span");
    label.textContent =
      "🌿  " + active.country + "  ·  Plot " + (Number(active.plot) + 1);
    label.style.cssText = "min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:.15px";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Exit Plot";

    button.style.cssText =
      `border:1px solid rgba(255,255,255,.15);
      border-radius:11px;
      padding:10px 14px;
      background:linear-gradient(135deg,#39c47b,#21965d);
      color:#fff;
      font:900 12px system-ui,sans-serif;
      cursor:pointer;
      white-space:nowrap;
      box-shadow:0 3px 10px #0003;
      transition:transform .18s ease,filter .18s ease;
    `;

    button.onmouseenter = () => button.style.filter = "brightness(1.12)";
    button.onmouseleave = () => button.style.filter = "";
    button.onpointerdown = () => button.style.transform = "scale(.96)";
    button.onpointerup = () => button.style.transform = "";
    button.onclick = saveAndReturnToGlobe;

    bar.append(label, button);

    const toggle = document.createElement("button");
    toggle.id = "gwPlotBarToggle";
    toggle.type = "button";
    toggle.textContent = "‹";
    toggle.title = "Hide plot bar";
    toggle.setAttribute("aria-label", "Hide or show plot bar");

    toggle.style.cssText = `
      position:fixed;
      top:calc(14px + env(safe-area-inset-top));
      left:0;
      right:auto;
      z-index:1000006;
      width:27px;
      height:42px;
      border:1px solid rgba(110,231,163,.7);
      border-left:0;
      border-radius:0 12px 12px 0;
      background:linear-gradient(135deg,#103d35,#091c25);
      color:#eafff1;
      font:900 22px system-ui;
      cursor:pointer;
      box-shadow:0 5px 18px #0006;
      display:grid;
      place-items:center;
    `;

    let plotBarHidden = false;

    toggle.onclick = () => {
      plotBarHidden = !plotBarHidden;
      bar.style.display = plotBarHidden ? "none" : "flex";
      toggle.textContent = plotBarHidden ? "›" : "‹";
      toggle.title = plotBarHidden ? "Show plot bar" : "Hide plot bar";
      toggle.setAttribute(
        "aria-label",
        plotBarHidden ? "Show plot bar" : "Hide plot bar"
      );
    };

    toggle.style.display = "none";
    bar.style.display = "none";
    document.body.appendChild(toggle);
    document.body.appendChild(bar);
  }

  // Automatically save the active plot while the player is building.
  function saveActivePlotSnapshot() {
    try {
      const active = JSON.parse(localStorage.getItem(ACTIVE_PLOT_KEY) || "null");
      if (!active || !owned(active.country, active.plot)) return;
      localStorage.setItem(
        plotWorldKey(active.country, active.plot),
        JSON.stringify(readWorldSnapshot())
      );
    } catch (error) {
      console.error("Automatic plot save failed:", error);
    }
  }

  function startPlotAutoSave() {
    if (window.__cozyPlotAutoSaveStarted) return;
    window.__cozyPlotAutoSaveStarted = true;

    // Save periodically while the plot is open.
    window.setInterval(saveActivePlotSnapshot, 2000);

    // Save again when the page is hidden or closed.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveActivePlotSnapshot();
    });
    window.addEventListener("pagehide", saveActivePlotSnapshot);
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
  }

  function owned(country, plot) {
    return (save.land[country] || []).includes(plot);
  }

  function cost() {
    return 100 + totalOwned() * 35;
  }

  function getItems() {
    const items = game()?.items;
    if (Array.isArray(items)) return items;
    return [];
  }

  function itemName(item) {
    return item?.name || item?.title || item?.id || "Garden item";
  }

  function itemIcon(item) {
    return item?.icon || item?.emoji || "🌱";
  }

  function ensureUI() {
    if (document.getElementById("gwOverlay")) return;

    const style = document.createElement("style");

    style.textContent = `
      #gwOverlay {
        position:fixed;
        inset:0;
        z-index:999999;
        display:none;
        align-items:center;
        justify-content:center;
        padding:16px;
        background:rgba(3,8,22,.94);
        color:#f4f7ff;
        font-family:inherit;
      }

      #gwOverlay.gw-open {
        display:flex;
      }

      #gwWindow {
        width:min(1050px,100%);
        max-height:94vh;
        overflow:auto;
        background:linear-gradient(145deg,#111d36,#080f20);
        border:1px solid #34476d;
        border-radius:22px;
        padding:20px;
        box-shadow:0 20px 80px #0009;
      }

      .gw-top {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        flex-wrap:wrap;
      }

      .gw-title {
        font-size:25px;
        font-weight:900;
      }

      .gw-sub {
        color:#a9bad5;
        font-size:13px;
        margin-top:5px;
      }

      .gw-btn {
        border:1px solid #435b83;
        background:#1b2c4b;
        color:white;
        border-radius:11px;
        padding:10px 14px;
        cursor:pointer;
        font-weight:700;
      }

      .gw-btn:hover {
        background:#29446f;
      }

      .gw-primary {
        background:#2563eb;
        border-color:#3b82f6;
      }

      .gw-green {
        background:#126b45;
        border-color:#27c17a;
      }

      .gw-content {
        margin-top:18px;
      }

      .gw-globe-layout {
        display:grid;
        grid-template-columns:1.1fr .9fr;
        gap:22px;
        align-items:center;
      }

      .gw-globe-wrap {
        display:grid;
        place-items:center;
        min-height:340px;
      }

      .gw-globe {
        width:min(310px,75vw);
        aspect-ratio:1;
        border-radius:50%;
        position:relative;
        overflow:hidden;
        cursor:grab;
        touch-action:pan-y;
        background:
          radial-gradient(ellipse at 30% 25%,#4fc8d8 0 2%,transparent 40%),
          radial-gradient(ellipse at 60% 70%,#087e9e,#075078 55%,#061c45 78%);
        box-shadow:inset -30px -12px 55px #02091d,0 0 45px #1688df55;
        border:2px solid #4c9dc9;
      }

      .gw-globe:before {
        content:"";
        position:absolute;
        inset:0;
        border-radius:50%;
        background:
          radial-gradient(ellipse at 30% 30%,#8bcf78 0 8%,transparent 9%),
          radial-gradient(ellipse at 65% 38%,#9acb72 0 12%,transparent 13%),
          radial-gradient(ellipse at 48% 67%,#7dbb69 0 10%,transparent 11%),
          radial-gradient(ellipse at 80% 75%,#8acb77 0 7%,transparent 8%);
        transform:rotate(var(--gw-rotation,0deg)) scale(1.2);
        transition:transform .12s linear;
      }

      .gw-globe:after {
        content:"";
        position:absolute;
        inset:0;
        border-radius:50%;
        background:
          repeating-linear-gradient(90deg,transparent 0 48px,#ffffff20 49px 50px),
          repeating-linear-gradient(0deg,transparent 0 48px,#ffffff20 49px 50px);
        box-shadow:inset 20px 0 30px #ffffff12,inset -35px 0 50px #0008;
      }

      .gw-country-list {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:8px;
      }

      .gw-country {
        text-align:left;
        min-width:0;
      }

      .gw-country.active {
        background:#174d48;
        border-color:#31c78b;
      }

      .gw-stats {
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        margin:15px 0;
      }

      .gw-stat {
        background:#172744;
        border:1px solid #2c4165;
        border-radius:12px;
        padding:10px 13px;
      }

      .gw-stat small {
        display:block;
        color:#9db1d0;
      }

      .gw-stat strong {
        font-size:18px;
      }

      .gw-grid {
        display:grid;
        grid-template-columns:repeat(8,minmax(0,1fr));
        gap:7px;
        max-width:650px;
        margin:18px auto;
      }

      .gw-plot {
        aspect-ratio:1;
        border-radius:8px;
        border:1px solid #465779;
        background:#18243a;
        color:#aabbd4;
        cursor:pointer;
        font-size:clamp(10px,2vw,16px);
      }

      .gw-plot.owned {
        background:#147849;
        border-color:#42d995;
        color:white;
      }

      .gw-plot.selected {
        outline:3px solid #facc15;
        outline-offset:1px;
      }

      .gw-plot:disabled {
        opacity:.9;
      }

      .gw-panel {
        background:#14233e;
        border:1px solid #344a70;
        border-radius:15px;
        padding:15px;
        margin-top:12px;
      }

      .gw-row {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        flex-wrap:wrap;
      }

      .gw-note {
        font-size:13px;
        color:#a9bad5;
        line-height:1.5;
      }

      .gw-merge-list {
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
        gap:10px;
      }

      .gw-map-shell {
        width:100%;
        max-width:620px;
        margin:auto;
        aspect-ratio:1;
        position:relative;
        border-radius:50%;
        overflow:hidden;
        background:radial-gradient(circle at 35% 28%,#164b79,#06152d 68%,#020817);
        box-shadow:0 0 55px #1688df35,inset 0 0 55px #0009;
      }

      #gwMap {
        width:100%;
        height:100%;
        display:block;
        touch-action:none;
        cursor:grab;
      }

      .gw-zoom-controls {
        position:absolute;
        right:14px;
        bottom:14px;
        z-index:5;
        display:flex;
        flex-direction:column;
        gap:7px;
      }

      .gw-zoom-btn {
        width:40px;
        height:40px;
        border-radius:11px;
        border:1px solid #83bce6;
        background:#102b4cdd;
        color:white;
        font-size:23px;
        font-weight:800;
        cursor:pointer;
        box-shadow:0 4px 15px #0007;
      }

      .gw-zoom-btn:hover {
        background:#2563a0;
      }

      .gw-zoom-btn:active {
        transform:scale(.94);
      }

      .gw-zoom-label {
        position:absolute;
        left:12px;
        bottom:16px;
        z-index:5;
        background:#07172cbb;
        color:#d7edff;
        border:1px solid #46769b;
        border-radius:8px;
        padding:6px 9px;
        font-size:12px;
      }

      #gwMap:active {
        cursor:grabbing;
      }

      #gwMap .gw-ocean {
        stroke:#7edbff;
        stroke-width:1.5;
        fill:url(#gwOcean);
      }

      #gwMap .gw-graticule {
        fill:none;
        stroke:#9bdfff;
        stroke-opacity:.15;
        stroke-width:.65;
      }

      #gwMap .gw-country-shape {
        stroke:#d7edc9;
        stroke-width:.65;
        cursor:pointer;
        transition:fill .15s;
      }

      #gwMap .gw-country-shape:hover {
        fill:#f3d36b!important;
        stroke:#fff;
        stroke-width:1.5;
      }

      #gwMap .gw-borders {
        fill:none;
        stroke:#e4f3d8;
        stroke-opacity:.72;
        stroke-width:.65;
        pointer-events:none;
      }

      .gw-map-legend {
        display:flex;
        gap:14px;
        justify-content:center;
        flex-wrap:wrap;
        margin-top:10px;
        color:#a9bad5;
        font-size:12px;
      }

      .gw-map-dot {
        display:inline-block;
        width:9px;
        height:9px;
        border-radius:50%;
        margin-right:5px;
      }

      .gw-country-select {
        width:100%;
        padding:12px;
        background:#172744;
        color:white;
        border:1px solid #435b83;
        border-radius:11px;
        margin:10px 0;
      }

      .gw-map-status {
        color:#a9bad5;
        font-size:12px;
        text-align:center;
        margin-top:8px;
      }

      @media(max-width:650px) {
        .gw-globe-layout {
          grid-template-columns:1fr;
        }

        .gw-globe-wrap {
          min-height:270px;
        }

        #gwWindow {
          padding:14px;
        }

        .gw-grid {
          gap:4px;
        }
      }
    `;

    document.head.appendChild(style);

    const overlay = document.createElement("div");
    overlay.id = "gwOverlay";

    overlay.innerHTML = `
      <div id="gwWindow">
        <div class="gw-top">
          <div>
            <div class="gw-title">🌍 Global World</div>
            <div class="gw-sub">
              Explore countries, purchase land and build your global garden.
            </div>
          </div>
          <button class="gw-btn" id="gwClose">✕ Close</button>
        </div>

        <div class="gw-stats">
          <div class="gw-stat">
            <small>Your coins</small>
            <strong id="gwCoins">0</strong>
          </div>
          <div class="gw-stat">
            <small>Owned plots</small>
            <strong id="gwOwned">0</strong>
          </div>
        </div>

        <div id="gwContent" class="gw-content"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", e => {
      if (e.target === overlay) close();
    });

    document.getElementById("gwClose").onclick = close;

    const menu = document.getElementById("menuPanel");
    const entry = document.createElement("div");

    entry.innerHTML = `
      <div style="padding:10px 12px;color:#9db8e8;font-weight:900">
        GLOBAL
      </div>
      <button class="gw-btn" id="gwOpen"
        style="width:100%;text-align:left;margin-bottom:7px">
        🌍 Globe World
      </button>
      <button class="gw-btn" id="gwMerge"
        style="width:100%;text-align:left">
        🌐 Merge
      </button>
    `;

    if (menu) {
      menu.appendChild(entry);
    } else {
      const fallback = document.createElement("div");

      fallback.style.cssText =
        "position:fixed;right:15px;bottom:85px;z-index:99998;display:flex;gap:6px";

      fallback.innerHTML = `
        <button class="gw-btn" id="gwOpen">🌍 Global</button>
        <button class="gw-btn" id="gwMerge">Merge</button>
      `;

      document.body.appendChild(fallback);
    }

    document.getElementById("gwOpen").onclick = () => open("globe");
    document.getElementById("gwMerge").onclick = () => open("merge");
  }

  function close() {
    document.getElementById("gwOverlay")?.classList.remove("gw-open");
  }

  function open(nextMode) {
    mode = nextMode;
    ensureUI();
    document.getElementById("gwOverlay").classList.add("gw-open");
    render();
  }

  function stats() {
    document.getElementById("gwCoins").textContent = money();
    document.getElementById("gwOwned").textContent = totalOwned();
  }

  function render() {
    stats();

    const root = document.getElementById("gwContent");

    if (mode === "globe") renderGlobe(root);
    else if (mode === "country") renderCountry(root);
    else renderMerge(root);
  }

  function loadWorldData() {
    if (worldDataPromise) return worldDataPromise;

    function loadScript(src, ready) {
      if (ready()) return Promise.resolve();

      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(
          new Error("Could not load map library: " + src)
        );

        document.head.appendChild(script);
      });
    }

    worldDataPromise = Promise.all([
      loadScript(
        "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js",
        () => !!window.d3
      ),
      loadScript(
        "https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js",
        () => !!window.topojson
      )
    ]).then(async () => {
      const response = await fetch(
        "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
      );

      if (!response.ok) {
        throw new Error("World map data could not be downloaded.");
      }

      worldTopology = await response.json();

      worldFeatures = window.topojson.feature(
        worldTopology,
        worldTopology.objects.countries
      ).features;

      countries = worldFeatures
        .map(feature => feature.properties && feature.properties.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

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

            <div class="gw-zoom-controls">
              <button class="gw-zoom-btn" id="gwZoomIn" title="Zoom in">+</button>
              <button class="gw-zoom-btn" id="gwZoomOut" title="Zoom out">−</button>
              <button class="gw-zoom-btn" id="gwZoomReset"
                title="Reset zoom" style="font-size:17px">↺</button>
            </div>

            <div class="gw-zoom-label" id="gwZoomLabel">100%</div>
          </div>

          <div class="gw-map-legend">
            <span>
              <i class="gw-map-dot" style="background:#75ad75"></i>Land
            </span>
            <span>
              <i class="gw-map-dot" style="background:#147849"></i>Your owned country
            </span>
            <span>
              <i class="gw-map-dot" style="background:#f6c453"></i>Selected country
            </span>
          </div>

          <p class="gw-map-status" id="gwMapStatus">
            Loading geographic country boundaries…
          </p>

          <p class="gw-note" style="text-align:center">
            Drag to rotate · Select a country on the globe to open its land plan
          </p>
        </div>

        <div>
          <h3>Explore the world</h3>

          <select class="gw-country-select" id="gwCountrySelect">
            <option>Loading countries…</option>
          </select>

          <button class="gw-btn gw-primary" id="gwOpenCountry"
            style="width:100%">
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
      </div>
    `;

    loadWorldData().then(() => {
      if (mode !== "globe" || !document.getElementById("gwMap")) return;

      const d3 = window.d3;
      const svg = d3.select("#gwMap");
      const status = document.getElementById("gwMapStatus");

      const select = document.getElementById("gwCountrySelect");

      select.innerHTML = countries.map(country =>
        `<option value="${esc(country)}">${esc(country)}</option>`
      ).join("");

      if (!countries.includes(currentCountry)) {
        currentCountry = countries[0];
      }

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
        .translate([320, 320])
        .scale(298 * zoomLevel)
        .clipAngle(90)
        .rotate([rotation, globeTilt]);

      const path = d3.geoPath(projection);
      const sphere = { type: "Sphere" };
      const graticule = d3.geoGraticule10();

      const ocean = svg.append("path")
        .datum(sphere)
        .attr("class", "gw-ocean");

      const mapGroup = svg.append("g")
        .attr("clip-path", "url(#gwGlobeClip)");

      const grid = mapGroup.append("path")
        .datum(graticule)
        .attr("class", "gw-graticule");

      mapGroup.selectAll(".gw-country-shape")
        .data(worldFeatures)
        .join("path")
        .attr("class", "gw-country-shape")
        .attr("data-country", d => d.properties.name)
        .on("click", (event, d) => {
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
          (a, b) => a !== b
        ))
        .attr("class", "gw-borders");

      let redrawFrame = 0;

      function scheduleRedraw() {
        if (redrawFrame) return;
        redrawFrame = requestAnimationFrame(() => {
          redrawFrame = 0;
          redrawMap();
        });
      }

      function redrawMap() {
        projection
          .rotate([rotation, globeTilt])
          .scale(298 * zoomLevel);

        ocean.attr("d", path);
        grid.attr("d", path);

        shapes
          .attr("d", path)
          .attr("fill", d => {
            const name = d.properties.name;

            if (name === currentCountry) return "#f6c453";
            if (save.land[name]?.length) return "#147849";

            return "#75ad75";
          });

        borders.attr("d", path);
      }

      function updateZoom() {
        zoomLevel = Math.max(1, Math.min(4, zoomLevel));
        scheduleRedraw();

        const label = document.getElementById("gwZoomLabel");

        if (label) {
          label.textContent = Math.round(zoomLevel * 100) + "%";
        }
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
      }, { passive: false });

      let pointer = null;
      let startRotation = 0;
      let startTilt = 0;

      dragMoved = false;

      svg
        .on("pointerdown", event => {
          pointer = [event.clientX, event.clientY];
          startRotation = rotation;
          startTilt = globeTilt;
          dragMoved = false;
          svg.node().setPointerCapture(event.pointerId);
        })
        .on("pointermove", event => {
          if (!pointer) return;

          const dx = event.clientX - pointer[0];
          const dy = event.clientY - pointer[1];

          if (Math.abs(dx) + Math.abs(dy) > 5) {
            dragMoved = true;
          }

          rotation = startRotation + dx * 0.35;
          globeTilt = Math.max(
            -85,
            Math.min(85, startTilt - dy * 0.35)
          );

          scheduleRedraw();
        })
        .on("pointerup pointercancel lostpointercapture", () => {
          pointer = null;
        });

      redrawMap();

      status.textContent =
        worldFeatures.length +
        " geographic country and territory shapes loaded.";

    }).catch(error => {
      console.error("Global World map error:", error);

      const status = document.getElementById("gwMapStatus");

      if (status) {
        status.textContent =
          "Map data could not load. Check your internet connection and refresh.";
      }
    });
  }

  function renderCountry(root) {
    const plots = save.land[currentCountry] || [];
    const price = cost();

    root.innerHTML = `
      <div class="gw-row">
        <div>
          <h2 style="margin:0">${esc(currentCountry)}</h2>
          <p class="gw-note">Your country land plan · 8 × 8 plots</p>
        </div>

        <button class="gw-btn" id="gwBack">← Back to globe</button>
      </div>

      <div class="gw-panel">
        <div class="gw-row">
          <span>🟩 Owned land</span>
          <strong>${plots.length} / 64 plots</strong>
          <span>🔒 Available land</span>
        </div>
      </div>

      <div class="gw-grid" id="gwGrid">
        ${Array.from({ length: 64 }, (_, i) => `
          <button class="gw-plot ${
            owned(currentCountry, i) ? "owned" : ""
          } ${selectedPlot === i ? "selected" : ""}"
            data-plot="${i}" title="Plot ${i + 1}">
            ${owned(currentCountry, i) ? "✓" : "🔒"}
          </button>
        `).join("")}
      </div>

      <div class="gw-panel" id="gwPlotPanel">
        <h3 style="margin-top:0">Select a plot</h3>
        <p class="gw-note">
          Green plots belong to you. Locked plots can be purchased with your game coins.
        </p>
        <button class="gw-btn" id="gwBuy">
          Purchase a plot · ${price} coins
        </button>
      </div>
    `;

    document.getElementById("gwBack").onclick = () => {
      mode = "globe";
      selectedPlot = null;
      render();
    };

    root.querySelectorAll("[data-plot]").forEach(btn => {
      btn.onclick = () => {
        selectedPlot = Number(btn.dataset.plot);
        renderCountry(root);
      };
    });

    const panel = document.getElementById("gwPlotPanel");

    if (selectedPlot !== null) {
      const isOwned = owned(currentCountry, selectedPlot);
      const decoration = save.decor[currentCountry]?.[selectedPlot];

      panel.innerHTML = `
        <h3 style="margin-top:0">Plot ${selectedPlot + 1}</h3>

        ${isOwned ? `
          <p class="gw-note">🟢 You own this land.</p>

          ${decoration ? `
            <p>
              Previous marker:
              ${esc(decoration.icon)} ${esc(decoration.name)}
            </p>
          ` : ""}

          <p class="gw-note">
            Open this plot in its own 3D Cozy Garden Builder.
            Its buildings, paths, trees, blocks and villagers are saved
            separately from your original garden and every other plot.
          </p>

          <button class="gw-btn gw-green" id="gwEnterPlot"
            style="width:100%;padding:13px">
            🌿 Enter & Design This Land
          </button>
        ` : `
          <p class="gw-note">
            This plot is locked. Purchase it to make it yours.
          </p>

          <button class="gw-btn gw-primary" id="gwBuy">
            Buy for ${price} coins
          </button>
        `}
      `;

      const buy = document.getElementById("gwBuy");

      if (buy) {
        buy.onclick = purchase;
      }

      const enter = document.getElementById("gwEnterPlot");

      if (enter) {
        enter.onclick = () =>
          enterOwnedPlot(currentCountry, selectedPlot);
      }

    } else {
      document.getElementById("gwBuy").onclick = () => {
        alert("Select a locked plot first.");
      };
    }
  }

  function purchase() {
    if (
      selectedPlot === null ||
      owned(currentCountry, selectedPlot)
    ) {
      return;
    }

    const price = cost();

    if (money() < price) {
      alert(
        "You don't have enough coins. You need " +
        price + " coins."
      );
      return;
    }

    if (!game()) {
      alert("The game economy is not ready yet.");
      return;
    }

    game().coins = money() - price;

    save.land[currentCountry] ||= [];
    save.land[currentCountry].push(selectedPlot);

    persist();
    render();
  }

  function renderMerge(root) {
    const ownedCountries = countries.filter(
      c => (save.land[c] || []).length
    );

    root.innerHTML = `
      <div class="gw-row">
        <div>
          <h2 style="margin:0">🌐 My Lands</h2>
          <p class="gw-note">
            Every purchased plot has its own independent 3D garden and saved design.
          </p>
        </div>

        <button class="gw-btn" id="gwBack">← Globe World</button>
      </div>

      ${ownedCountries.length ? `
        <div class="gw-merge-list">
          ${ownedCountries.map(c => `
            <div class="gw-panel">
              <h3>${esc(c)}</h3>

              <p class="gw-note">
                🟩 ${save.land[c].length} owned plots
              </p>

              <div class="gw-row" style="flex-wrap:wrap">
                ${save.land[c].map(plot => `
                  <button class="gw-btn gw-green"
                    data-enter-country="${esc(c)}"
                    data-enter-plot="${plot}">
                    🌿 Plot ${plot + 1} · Enter Land
                  </button>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="gw-panel">
          <h3>No land purchased yet</h3>
          <p class="gw-note">
            Open Globe World, choose a country and buy your first plot.
          </p>
        </div>
      `}

      <p class="gw-note">
        Your original garden remains separate.
        Designs are stored locally in this browser, one save per purchased plot.
      </p>
    `;

    document.getElementById("gwBack").onclick = () => {
      mode = "globe";
      render();
    };

    root.querySelectorAll("[data-enter-country]").forEach(btn => {
      btn.onclick = () => {
        enterOwnedPlot(
          btn.dataset.enterCountry,
          Number(btn.dataset.enterPlot)
        );
      };
    });
  }

  function start() {
    ensureUI();
    showActivePlotBar();
    startPlotAutoSave();

    // Permanent Global World shortcut.
    if (!document.getElementById("gwQuickAccess")) {
      const button = document.createElement("button");

      button.id = "gwQuickAccess";
      button.type = "button";
      button.textContent = "🌍 Global World";

      button.style.cssText = `
        position:fixed;
        right:18px;
        bottom:18px;
        z-index:1000001;
        padding:12px 17px;
        border:1px solid #55a8e8;
        border-radius:14px;
        background:linear-gradient(135deg,#1263b5,#4236a5);
        color:white;
        font-weight:900;
        font-size:14px;
        cursor:pointer;
        box-shadow:0 5px 22px #0008;
      `;

      button.style.display = "none";
      button.onclick = () => open("globe");

      document.body.appendChild(button);

      // Keep both floating controls hidden during the opening splash.
      function revealAfterSplash() {
        const splash = document.getElementById("splash");
        if (splash) {
          const style = getComputedStyle(splash);
          if (style.display !== "none" &&
              style.visibility !== "hidden" &&
              Number(style.opacity) > 0.02) {
            requestAnimationFrame(revealAfterSplash);
            return;
          }
        }

        const bar = document.getElementById("gwPlotReturnBar");
        const arrow = document.getElementById("gwPlotBarToggle");
        const shortcut = document.getElementById("gwQuickAccess");

        if (bar) bar.style.display = "flex";
        if (arrow) arrow.style.display = "grid";
        if (shortcut) shortcut.style.display = "block";
      }

      const bar = document.getElementById("gwPlotReturnBar");
      const arrow = document.getElementById("gwPlotBarToggle");

      if (bar) bar.style.display = "none";
      if (arrow) arrow.style.display = "none";
      button.style.display = "none";

      requestAnimationFrame(revealAfterSplash);

    }
  }

  function waitForIntroToFinish() {
    const ids = ["splash", "introSky"];
    const introVisible = ids.some(id => {
      const el = document.getElementById(id);
      if (!el) return false;
      const cs = getComputedStyle(el);
      return cs.display !== "none" &&
             cs.visibility !== "hidden" &&
             Number(cs.opacity) > 0.01;
    });

    if (introVisible) {
      requestAnimationFrame(waitForIntroToFinish);
      return;
    }

    const bar = document.getElementById("gwPlotReturnBar");
    const arrow = document.getElementById("gwPlotBarToggle");
    const shortcut = document.getElementById("gwQuickAccess");

    if (bar) bar.style.display = "flex";
    if (arrow) arrow.style.display = "";
    if (shortcut) shortcut.style.display = "";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      start();
      requestAnimationFrame(waitForIntroToFinish);
    }, { once: true });
  } else {
    start();
    requestAnimationFrame(waitForIntroToFinish);
  }
})();
