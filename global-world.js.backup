(() => {
  "use strict";

  const SAVE_KEY = "cozy_global_world_v1";
  const countries = [
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
  let currentCountry = "Bangladesh";
  let selectedPlot = null;
  let mode = "globe";
  let rotation = 0;

  const game = () => window.__game;
  const money = () => Number(game()?.coins ?? 0);
  const totalOwned = () =>
    Object.values(save.land).reduce((sum, plots) => sum + plots.length, 0);

  function persist() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
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
        position:fixed; inset:0; z-index:999999;
        display:none; align-items:center; justify-content:center;
        padding:16px; background:rgba(3,8,22,.94);
        color:#f4f7ff; font-family:inherit;
      }
      #gwOverlay.gw-open { display:flex; }
      #gwWindow {
        width:min(1050px,100%); max-height:94vh; overflow:auto;
        background:linear-gradient(145deg,#111d36,#080f20);
        border:1px solid #34476d; border-radius:22px;
        padding:20px; box-shadow:0 20px 80px #0009;
      }
      .gw-top {display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .gw-title {font-size:25px;font-weight:900}
      .gw-sub {color:#a9bad5;font-size:13px;margin-top:5px}
      .gw-btn {
        border:1px solid #435b83;background:#1b2c4b;color:white;
        border-radius:11px;padding:10px 14px;cursor:pointer;font-weight:700;
      }
      .gw-btn:hover {background:#29446f}
      .gw-primary {background:#2563eb;border-color:#3b82f6}
      .gw-green {background:#126b45;border-color:#27c17a}
      .gw-content {margin-top:18px}
      .gw-globe-layout {display:grid;grid-template-columns:1.1fr .9fr;gap:22px;align-items:center}
      .gw-globe-wrap {display:grid;place-items:center;min-height:340px}
      .gw-globe {
        width:min(310px,75vw);aspect-ratio:1;border-radius:50%;
        position:relative;overflow:hidden;cursor:grab;touch-action:pan-y;
        background:
          radial-gradient(ellipse at 30% 25%,#4fc8d8 0 2%,transparent 40%),
          radial-gradient(ellipse at 60% 70%,#087e9e,#075078 55%,#061c45 78%);
        box-shadow:inset -30px -12px 55px #02091d,0 0 45px #1688df55;
        border:2px solid #4c9dc9;
      }
      .gw-globe:before {
        content:"";position:absolute;inset:0;border-radius:50%;
        background:
          radial-gradient(ellipse at 30% 30%,#8bcf78 0 8%,transparent 9%),
          radial-gradient(ellipse at 65% 38%,#9acb72 0 12%,transparent 13%),
          radial-gradient(ellipse at 48% 67%,#7dbb69 0 10%,transparent 11%),
          radial-gradient(ellipse at 80% 75%,#8acb77 0 7%,transparent 8%);
        transform:rotate(var(--gw-rotation,0deg)) scale(1.2);
        transition:transform .12s linear;
      }
      .gw-globe:after {
        content:"";position:absolute;inset:0;border-radius:50%;
        background:repeating-linear-gradient(90deg,transparent 0 48px,#ffffff20 49px 50px),
          repeating-linear-gradient(0deg,transparent 0 48px,#ffffff20 49px 50px);
        box-shadow:inset 20px 0 30px #ffffff12,inset -35px 0 50px #0008;
      }
      .gw-country-list {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .gw-country {text-align:left;min-width:0}
      .gw-country.active {background:#174d48;border-color:#31c78b}
      .gw-stats {display:flex;gap:10px;flex-wrap:wrap;margin:15px 0}
      .gw-stat {background:#172744;border:1px solid #2c4165;border-radius:12px;padding:10px 13px}
      .gw-stat small {display:block;color:#9db1d0}
      .gw-stat strong {font-size:18px}
      .gw-grid {display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:7px;max-width:650px;margin:18px auto}
      .gw-plot {
        aspect-ratio:1;border-radius:8px;border:1px solid #465779;
        background:#18243a;color:#aabbd4;cursor:pointer;font-size:clamp(10px,2vw,16px);
      }
      .gw-plot.owned {background:#147849;border-color:#42d995;color:white}
      .gw-plot.selected {outline:3px solid #facc15;outline-offset:1px}
      .gw-plot:disabled {opacity:.9}
      .gw-panel {background:#14233e;border:1px solid #344a70;border-radius:15px;padding:15px;margin-top:12px}
      .gw-row {display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
      .gw-note {font-size:13px;color:#a9bad5;line-height:1.5}
      .gw-merge-list {display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
      @media(max-width:650px) {
        .gw-globe-layout {grid-template-columns:1fr}
        .gw-globe-wrap {min-height:270px}
        #gwWindow {padding:14px}
        .gw-grid {gap:4px}
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
            <div class="gw-sub">Explore countries, purchase land and build your global garden.</div>
          </div>
          <button class="gw-btn" id="gwClose">✕ Close</button>
        </div>
        <div class="gw-stats">
          <div class="gw-stat"><small>Your coins</small><strong id="gwCoins">0</strong></div>
          <div class="gw-stat"><small>Owned plots</small><strong id="gwOwned">0</strong></div>
        </div>
        <div id="gwContent" class="gw-content"></div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", e => {
      if (e.target === overlay) close();
    });
    document.getElementById("gwClose").onclick = close;

    const menu = document.getElementById("menuPanel");
    const entry = document.createElement("div");
    entry.innerHTML = `
      <div style="padding:10px 12px;color:#9db8e8;font-weight:900">GLOBAL</div>
      <button class="gw-btn" id="gwOpen" style="width:100%;text-align:left;margin-bottom:7px">🌍 Globe World</button>
      <button class="gw-btn" id="gwMerge" style="width:100%;text-align:left">🌐 Merge</button>`;
    if (menu) {
      menu.appendChild(entry);
    } else {
      const fallback = document.createElement("div");
      fallback.style.cssText = "position:fixed;right:15px;bottom:85px;z-index:99998;display:flex;gap:6px";
      fallback.innerHTML = `
        <button class="gw-btn" id="gwOpen">🌍 Global</button>
        <button class="gw-btn" id="gwMerge">Merge</button>`;
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

  function renderGlobe(root) {
    root.innerHTML = `
      <div class="gw-globe-layout">
        <div>
          <div class="gw-globe-wrap">
            <div class="gw-globe" id="gwGlobe" aria-label="Rotatable globe"></div>
          </div>
          <p class="gw-note" style="text-align:center">Drag the globe to rotate it. Choose a country to explore its land.</p>
        </div>
        <div>
          <h3>Choose a country</h3>
          <div class="gw-country-list">
            ${countries.map(c => `
              <button class="gw-btn gw-country ${c === currentCountry ? "active" : ""}"
                data-country="${esc(c)}">${esc(c)} ${save.land[c]?.length ? "🟢" : "🔒"}</button>
            `).join("")}
          </div>
        </div>
      </div>`;
    const globe = document.getElementById("gwGlobe");
    let startX = null;
    globe.addEventListener("pointerdown", e => {
      startX = e.clientX;
      globe.setPointerCapture(e.pointerId);
    });
    globe.addEventListener("pointermove", e => {
      if (startX === null) return;
      rotation += (e.clientX - startX) * .6;
      startX = e.clientX;
      globe.style.setProperty("--gw-rotation", rotation + "deg");
    });
    globe.addEventListener("pointerup", () => startX = null);
    globe.addEventListener("pointercancel", () => startX = null);

    root.querySelectorAll("[data-country]").forEach(btn => {
      btn.onclick = () => {
        currentCountry = btn.dataset.country;
        mode = "country";
        render();
      };
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
          <span>🟩 Owned land</span><strong>${plots.length} / 64 plots</strong>
          <span>🔒 Available land</span>
        </div>
      </div>
      <div class="gw-grid" id="gwGrid">
        ${Array.from({length:64},(_,i) => `
          <button class="gw-plot ${owned(currentCountry,i) ? "owned" : ""} ${selectedPlot === i ? "selected" : ""}"
            data-plot="${i}" title="Plot ${i+1}">
            ${owned(currentCountry,i) ? "✓" : "🔒"}
          </button>`).join("")}
      </div>
      <div class="gw-panel" id="gwPlotPanel">
        <h3 style="margin-top:0">Select a plot</h3>
        <p class="gw-note">Green plots belong to you. Locked plots can be purchased with your game coins.</p>
        <button class="gw-btn" id="gwBuy">Purchase a plot · ${price} coins</button>
      </div>`;
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
      const isOwned = owned(currentCountry,selectedPlot);
      const decoration = save.decor[currentCountry]?.[selectedPlot];
      const items = getItems();
      panel.innerHTML = `
        <h3 style="margin-top:0">Plot ${selectedPlot + 1}</h3>
        ${isOwned ? `
          <p class="gw-note">🟢 You own this land.</p>
          ${decoration ? `<p>Placed: ${esc(decoration.icon)} ${esc(decoration.name)}</p>` : ""}
          <div class="gw-row">
            <select id="gwItem" class="gw-btn" style="flex:1;min-width:180px">
              ${items.length ? items.map((item,i) =>
                `<option value="${i}">${esc(itemIcon(item))} ${esc(itemName(item))}</option>`
              ).join("") : `<option value="">No game items found</option>`}
            </select>
            <button class="gw-btn gw-green" id="gwPlace" ${items.length ? "" : "disabled"}>Place item</button>
          </div>
          <p class="gw-note">This first version saves a building marker on your global land plan. It does not yet spawn the object in the 3D garden.</p>
        ` : `
          <p class="gw-note">This plot is locked. Purchase it to make it yours.</p>
          <button class="gw-btn gw-primary" id="gwBuy">Buy for ${price} coins</button>
        `}`;
      const buy = document.getElementById("gwBuy");
      if (buy) buy.onclick = purchase;
      const place = document.getElementById("gwPlace");
      if (place) place.onclick = () => {
        const index = Number(document.getElementById("gwItem").value);
        const item = items[index];
        if (!item || !owned(currentCountry,selectedPlot)) return;
        save.decor[currentCountry] ||= {};
        save.decor[currentCountry][selectedPlot] = {
          name: itemName(item),
          icon: itemIcon(item)
        };
        persist();
        render();
      };
    } else {
      document.getElementById("gwBuy").onclick = () => {
        alert("Select a locked plot first.");
      };
    }
  }

  function purchase() {
    if (selectedPlot === null || owned(currentCountry,selectedPlot)) return;
    const price = cost();
    if (money() < price) {
      alert("You don't have enough coins. You need " + price + " coins.");
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
    const ownedCountries = countries.filter(c => (save.land[c] || []).length);
    root.innerHTML = `
      <div class="gw-row">
        <div>
          <h2 style="margin:0">🌐 Global Merge</h2>
          <p class="gw-note">Visit the land plans you have purchased around the world.</p>
        </div>
        <button class="gw-btn" id="gwBack">← Globe World</button>
      </div>
      ${ownedCountries.length ? `
        <div class="gw-merge-list">
          ${ownedCountries.map(c => `
            <div class="gw-panel">
              <h3>${esc(c)}</h3>
              <p class="gw-note">🟩 ${save.land[c].length} owned plots</p>
              <button class="gw-btn gw-green" data-visit="${esc(c)}">Visit land plan →</button>
            </div>`).join("")}
        </div>
      ` : `<div class="gw-panel"><h3>No land purchased yet</h3><p class="gw-note">Open Globe World, choose a country and buy your first plot.</p></div>`}
      <p class="gw-note">Merge currently brings your owned country plans together in one global overview. A continuous walkable world is a future 3D integration.</p>`;
    document.getElementById("gwBack").onclick = () => {
      mode = "globe";
      render();
    };
    root.querySelectorAll("[data-visit]").forEach(btn => {
      btn.onclick = () => {
        currentCountry = btn.dataset.visit;
        selectedPlot = null;
        mode = "country";
        render();
      };
    });
  }

  function start() {
    ensureUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {once:true});
  } else {
    start();
  }
})();
