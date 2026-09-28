/* Inventory: grams by date, +/- vs previous snapshot */
const STORAGE_STOCK = "hookahbase_stock_g_v1";
const STORAGE_DAYS = "hookahbase_stock_by_day_v1";
let DAYS = {};
let INV_DATE = todayISO();
let STOCK = {};
let inventoryOnlyShelf = true;
let inventoryBound = false;

const JAR_TARE_RULES = [
  { keys: ["darkside sabotage", "ds sabotage", "саботаж"], tare: 37 },
  { keys: ["darkside", "дарксайд", "ds core", "ds shot", "ds gen"], tare: 52 },
  { keys: ["база", "base tobacco"], tare: 52 },
  { keys: ["starline", "старлайн"], tare: 52 },
  { keys: ["deus", "деус"], tare: 37 },
  { keys: ["blackburn", "black burn", "блекберн"], tare: 37 },
  { keys: ["sebero", "себеро"], tare: 37 },
  { keys: ["наш", "nash"], tare: 37 },
  { keys: ["overdose", "овердоз"], tare: 37 },
  { keys: ["bliss", "блис"], tare: 37 },
  { keys: ["trofimoff", "трофимоф"], tare: 179 },
  { keys: ["bonche", "бонч"], tare: 157 },
  { keys: ["sapphire", "сапфир"], tare: 37 },
  { keys: ["antagonist", "антагонист"], tare: 155 },
  { keys: ["jent"], tare: 37 },
  { keys: ["северный", "severnyj", "severnyy"], tare: 37 },
  { keys: ["сарма", "sarma"], tare: 37 },
  { keys: ["satyr", "сатир"], tare: 40 },
  { keys: ["musthave", "must have", "мастхэв"], tare: 37 },
  { keys: ["догма", "dogma"], tare: 170 },
  { keys: ["xuligan", "huligan", "хулиган"], tare: 40 }
];

(function injectInventoryStyles() {
  if (document.getElementById("inv-style")) return;
  var st = document.createElement("style");
  st.id = "inv-style";
  st.textContent = ".inv-title{font-size:1.05rem;margin-bottom:.25rem}.inv-toggle{display:flex;align-items:center;gap:.4rem;font-size:.88rem;white-space:nowrap}.inv-qty{width:4.6rem;text-align:center;padding:.25rem .2rem;border:1px solid var(--border);border-radius:6px;font:inherit}.order-row-qty{display:flex;align-items:center;gap:.3rem}.inv-on-shelf{background:#f0fdf4}#inv-list{max-height:58vh}#inv-footer{margin-top:.9rem}.inv-tare{font-size:.72rem;color:#0f766e}.inv-daybar{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:0 0 .75rem}.inv-daybar input[type=date]{padding:.4rem .6rem;border:1px solid var(--border);border-radius:8px;font:inherit;background:var(--bg)}.inv-hist{margin-top:.9rem}.inv-hist-item{display:flex;justify-content:space-between;gap:.6rem;align-items:center;padding:.45rem 0;border-bottom:1px solid #f5f5f4;font-size:.88rem;cursor:pointer}.inv-hist-item.active{font-weight:700}.inv-delta-plus{color:#15803d}.inv-delta-minus{color:#b91c1c}.inv-delta-zero{color:var(--muted)}";
  document.head.appendChild(st);
})();

function todayISO() {
  var d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function formatRuDate(iso) {
  if (!iso) return "—";
  var p = iso.split("-");
  return p[2] + "." + p[1] + "." + p[0];
}
function loadDays() {
  try { DAYS = JSON.parse(localStorage.getItem(STORAGE_DAYS) || "{}") || {}; } catch (e) { DAYS = {}; }
  try {
    var old = localStorage.getItem(STORAGE_STOCK);
    if (old && !Object.keys(DAYS).length) {
      var parsed = JSON.parse(old);
      if (parsed && Object.keys(parsed).length) DAYS[todayISO()] = parsed;
    }
  } catch (e) {}
  if (!DAYS[INV_DATE]) DAYS[INV_DATE] = {};
  STOCK = DAYS[INV_DATE];
}
function saveDays() {
  DAYS[INV_DATE] = STOCK;
  try { localStorage.setItem(STORAGE_DAYS, JSON.stringify(DAYS)); } catch (e) {}
}
function switchDay(iso) {
  if (!iso) return;
  DAYS[INV_DATE] = STOCK;
  INV_DATE = iso;
  if (!DAYS[INV_DATE]) DAYS[INV_DATE] = {};
  STOCK = DAYS[INV_DATE];
  saveDays();
  var el = document.getElementById("inv-date");
  if (el) el.value = INV_DATE;
  renderInventory();
}
function copyPrevDay() {
  var prev = prevDateBefore(INV_DATE);
  if (!prev) { alert("Нет предыдущего съёма"); return; }
  if (!confirm("Подставить остатки с " + formatRuDate(prev) + "?")) return;
  STOCK = JSON.parse(JSON.stringify(DAYS[prev] || {}));
  DAYS[INV_DATE] = STOCK;
  saveDays();
  renderInventory();
}
function stockGrams(id) { return Number(STOCK[id] || 0); }
function setStockGrams(id, grams) {
  grams = Math.max(0, Math.round(Number(grams) || 0));
  if (!grams) delete STOCK[id];
  else STOCK[id] = grams;
  saveDays();
}
function brandKey(p) { return ((p && (p.brand + " " + p.line + " " + p.name)) || "").toLowerCase(); }
function jarTare(p) {
  var s = brandKey(p);
  for (var i = 0; i < JAR_TARE_RULES.length; i++) {
    for (var j = 0; j < JAR_TARE_RULES[i].keys.length; j++) {
      if (s.indexOf(JAR_TARE_RULES[i].keys[j]) >= 0) return JAR_TARE_RULES[i].tare;
    }
  }
  return 37;
}
function netFromScale(p, scaleG) { return Math.max(0, Math.round((Number(scaleG) || 0) - jarTare(p))); }
function scaleFromNet(p, net) { return net ? net + jarTare(p) : ""; }
function dayHasStock(d) {
  return DAYS[d] && Object.keys(DAYS[d]).some(function (id) { return DAYS[d][id] > 0; });
}
function prevDateBefore(iso) {
  return Object.keys(DAYS).filter(function (d) { return d < iso && dayHasStock(d); }).sort().pop() || "";
}
function gramsOf(map, id) { return Number((map || {})[id] || 0); }
function formatDelta(n) { return n ? ((n > 0 ? "+" : "") + n + " г") : "0 г"; }
function deltaClass(n) { return n > 0 ? "inv-delta-plus" : n < 0 ? "inv-delta-minus" : "inv-delta-zero"; }
function totalsForMap(map) {
  var grams = 0, positions = 0;
  Object.keys(map || {}).forEach(function (id) {
    var g = map[id] || 0;
    if (g <= 0) return;
    positions += 1;
    grams += g;
  });
  return { positions: positions, grams: grams };
}
function inventoryTotals() { return totalsForMap(STOCK); }
function getInventoryFiltered() {
  var q = (($("#inv-search") && $("#inv-search").value) || "").trim().toLowerCase();
  var brand = ($("#inv-brand") && $("#inv-brand").value) || "";
  var source = ($("#inv-source") && $("#inv-source").value) || "";
  var prev = prevDateBefore(INV_DATE);
  return (PRODUCTS || []).filter(function (p) {
    var g = stockGrams(p.id);
    var pg = prev ? gramsOf(DAYS[prev], p.id) : 0;
    if (inventoryOnlyShelf && g <= 0 && pg <= 0) return false;
    if (brand && p.brand !== brand) return false;
    if (source && p.source !== source) return false;
    if (!q) return true;
    return (p.name + " " + p.flavor + " " + p.brand + " " + p.sku + " " + p.line).toLowerCase().includes(q);
  });
}
function initInventoryFilters() {
  var brands = Array.from(new Set((PRODUCTS || []).map(function (p) { return p.brand; }).filter(Boolean))).sort();
  var sources = Array.from(new Set((PRODUCTS || []).map(function (p) { return p.source; }).filter(Boolean))).sort();
  var ib = $("#inv-brand");
  if (ib) ib.innerHTML = '<option value="">Все бренды</option>' + brands.map(function (b) { return '<option value="' + esc(b) + '">' + esc(b) + "</option>"; }).join("");
  var isrc = $("#inv-source");
  if (isrc) isrc.innerHTML = '<option value="">Все прайсы</option>' + sources.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + "</option>"; }).join("");
}
function ensureDayControls() {
  var card = document.querySelector("#view-inventory .card");
  if (!card || document.getElementById("inv-date")) return;
  var bar = document.createElement("div");
  bar.className = "inv-daybar";
  bar.innerHTML = '<label class="inv-toggle">Дата съёма <input type="date" id="inv-date" /></label><button type="button" class="btn-sm" id="inv-copy-prev">Взять с прошлой недели</button><button type="button" class="btn-sm" id="inv-new-today">Сегодня</button>';
  var filters = card.querySelector(".order-filters");
  card.insertBefore(bar, filters || card.firstChild.nextSibling);
  var hist = document.createElement("div");
  hist.id = "inv-history";
  hist.className = "inv-hist";
  card.appendChild(hist);
}
function renderDayHistory() {
  var box = document.getElementById("inv-history");
  if (!box) return;
  var dates = Object.keys(DAYS).filter(dayHasStock).sort().reverse();
  if (!dates.length) {
    box.innerHTML = '<p class="empty" style="padding:.6rem 0">Пока нет сохранённых съёмов</p>';
    return;
  }
  box.innerHTML = "<h3 style=\"font-size:1rem;margin:0 0 .4rem\">Съёмы по дням</h3>" + dates.map(function (d) {
    var t = totalsForMap(DAYS[d]);
    var prev = prevDateBefore(d);
    var dg = t.grams - (prev ? totalsForMap(DAYS[prev]).grams : 0);
    return '<div class="inv-hist-item' + (d === INV_DATE ? " active" : "") + '" data-inv-day="' + d + '"><div>' +
      formatRuDate(d) + '<div class="order-row-meta">' + t.positions + " поз. · " + t.grams + " г</div></div><strong class=\"" +
      deltaClass(prev ? dg : 0) + '">' + (prev ? formatDelta(dg) : "старт") + "</strong></div>";
  }).join("");
}
function renderInventory() {
  ensureDayControls();
  var dateEl = document.getElementById("inv-date");
  if (dateEl) dateEl.value = INV_DATE;
  var list = $("#inv-list");
  var foot = $("#inv-footer");
  if (!list) return;
  var totals = inventoryTotals();
  var prev = prevDateBefore(INV_DATE);
  var rows = getInventoryFiltered();
  if (!rows.length) {
    list.innerHTML = '<p class="empty">На ' + formatRuDate(INV_DATE) + " пусто. Снимите «Только на полке» и внесите вес с весов.</p>";
  } else {
    list.innerHTML = rows.slice(0, 250).map(function (p) {
      var g = stockGrams(p.id);
      var pg = prev ? gramsOf(DAYS[prev], p.id) : 0;
      var dg = g - pg;
      return '<div class="order-row inv-row' + (g ? " inv-on-shelf" : "") + '">' +
        '<div class="order-row-main"><strong>' + esc(p.name) + "</strong>" +
        '<div class="order-row-meta">' + esc(p.brand) + " · " + esc(p.flavor || "") + " · " + esc(p.weight) + "</div>" +
        '<div class="inv-tare">банка −' + jarTare(p) + " г</div></div>" +
        '<div class="order-row-price">' + g + " г" +
        (prev ? '<div class="' + deltaClass(dg) + '">' + formatDelta(dg) + "</div>" : '<div class="order-row-meta">первый съём</div>') +
        "</div>" +
        '<div class="order-row-qty"><button type="button" class="btn-sm" data-stock-minus="' + esc(p.id) + '">-5</button>' +
        '<input class="inv-qty" type="number" min="0" step="1" value="' + scaleFromNet(p, g) + '" placeholder="г с весов" data-stock-scale="' + esc(p.id) + '" />' +
        '<button type="button" class="btn-sm" data-stock-plus="' + esc(p.id) + '">+5</button></div></div>';
    }).join("") + (rows.length > 250 ? '<p class="empty">Показано 250 из ' + rows.length + "</p>" : "");
  }
  if (foot) {
    var dg = totals.grams - (prev ? totalsForMap(DAYS[prev]).grams : 0);
    foot.innerHTML =
      '<div class="budget-item"><span class="budget-label">Съём</span><strong>' + formatRuDate(INV_DATE) + "</strong></div>" +
      '<div class="budget-item"><span class="budget-label">Позиции</span><strong>' + totals.positions + "</strong></div>" +
      '<div class="budget-item"><span class="budget-label">Табак</span><strong>' + totals.grams + " г</strong></div>" +
      '<div class="budget-item budget-remain"><span class="budget-label">' + (prev ? ("К " + formatRuDate(prev)) : "Первый съём") +
      '</span><strong class="' + deltaClass(prev ? dg : 0) + '">' + (prev ? formatDelta(dg) : "—") + "</strong></div>";
  }
  renderDayHistory();
}
function showInventoryView(on) {
  var el = document.getElementById("view-inventory");
  if (el) el.hidden = !on;
  var mf = document.getElementById("matrix-filters");
  if (on && mf) mf.hidden = true;
  if (on) renderInventory();
}
function initInventoryUI() {
  loadDays();
  initInventoryFilters();
  if (inventoryBound) { renderInventory(); return; }
  inventoryBound = true;
  ["#inv-search", "#inv-brand", "#inv-source"].forEach(function (sel) {
    var el = $(sel);
    if (el) el.addEventListener(sel === "#inv-search" ? "input" : "change", renderInventory);
  });
  var only = $("#inv-only-shelf");
  if (only) only.addEventListener("change", function () { inventoryOnlyShelf = !!only.checked; renderInventory(); });
  var hint = document.querySelector("#view-inventory .other-hint");
  if (hint) hint.textContent = "Только граммы. Каждый съём — свой день. Плюс или минус считается к предыдущей дате.";
  document.addEventListener("click", function (e) {
    var tab = e.target && e.target.closest && e.target.closest(".tab");
    if (tab) showInventoryView(tab.getAttribute("data-view") === "inventory");
    var t = e.target;
    if (!t) return;
    if (t.id === "inv-copy-prev") return copyPrevDay();
    if (t.id === "inv-new-today") return switchDay(todayISO());
    var dayBtn = t.closest && t.closest("[data-inv-day]");
    if (dayBtn) return switchDay(dayBtn.getAttribute("data-inv-day"));
    var plus = t.getAttribute && t.getAttribute("data-stock-plus");
    var minus = t.getAttribute && t.getAttribute("data-stock-minus");
    if (plus) { setStockGrams(plus, stockGrams(plus) + 5); renderInventory(); }
    if (minus) { setStockGrams(minus, stockGrams(minus) - 5); renderInventory(); }
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (!t) return;
    if (t.id === "inv-date") return switchDay(t.value || todayISO());
    var id = t.getAttribute && t.getAttribute("data-stock-scale");
    if (id) {
      var p = typeof findProduct === "function" ? findProduct(id) : null;
      if (t.value === "" || t.value == null) setStockGrams(id, 0);
      else setStockGrams(id, netFromScale(p, t.value));
      renderInventory();
    }
  });
  renderInventory();
}
function bootInventory() {
  if (typeof $ !== "function" || typeof PRODUCTS === "undefined" || !PRODUCTS.length) {
    setTimeout(bootInventory, 180);
    return;
  }
  initInventoryUI();
}
window.renderInventory = renderInventory;
window.initInventoryUI = initInventoryUI;
window.inventoryTotals = inventoryTotals;
bootInventory();
