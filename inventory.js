/* Inventory in grams by date; jar tare from учёт табака */
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
  st.textContent = ".inv-title{font-size:1.05rem;margin-bottom:.25rem}.inv-toggle{display:flex;align-items:center;gap:.4rem;font-size:.88rem;white-space:nowrap}.inv-qty{width:4.6rem;text-align:center;padding:.25rem .2rem;border:1px solid var(--border);border-radius:6px;font:inherit;font-size:.9rem}.order-row-qty{display:flex;align-items:center;gap:.3rem;flex-wrap:wrap;justify-content:flex-end}.inv-on-shelf{background:#f0fdf4}#inv-list{max-height:58vh}#inv-footer{margin-top:.9rem}.inv-tare{font-size:.72rem;color:#0f766e}.inv-daybar{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:0 0 .75rem}.inv-daybar input[type=date]{padding:.4rem .6rem;border:1px solid var(--border);border-radius:8px;font:inherit;background:var(--bg)}.inv-hist{margin-top:.9rem}.inv-hist-item{display:flex;justify-content:space-between;gap:.6rem;align-items:center;padding:.45rem 0;border-bottom:1px solid #f5f5f4;font-size:.88rem;cursor:pointer}.inv-hist-item.active{font-weight:700}";
  document.head.appendChild(st);
})();

function todayISO() {
  var d = new Date();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}
function formatRuDate(iso) {
  if (!iso) return "—";
  var p = iso.split("-");
  return p[2] + "." + p[1] + "." + p[0];
}
function loadDays() {
  try {
    var raw = localStorage.getItem(STORAGE_DAYS);
    DAYS = raw ? JSON.parse(raw) : {};
  } catch (e) { DAYS = {}; }
  if (!DAYS || typeof DAYS !== "object") DAYS = {};
  try {
    var old = localStorage.getItem(STORAGE_STOCK);
    if (old && !Object.keys(DAYS).length) {
      var parsed = JSON.parse(old);
      if (parsed && typeof parsed === "object" && Object.keys(parsed).length) {
        DAYS[todayISO()] = parsed;
      }
    }
  } catch (e) {}
  if (!INV_DATE) INV_DATE = todayISO();
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
  var dateEl = document.getElementById("inv-date");
  if (dateEl) dateEl.value = INV_DATE;
  renderInventory();
}
function copyPrevDay() {
  var dates = Object.keys(DAYS).filter(function (d) {
    return d < INV_DATE && DAYS[d] && Object.keys(DAYS[d]).length;
  }).sort();
  if (!dates.length) { alert("Нет предыдущего съёма, чтобы скопировать"); return; }
  var prev = dates[dates.length - 1];
  if (!confirm("Подставить остатки с " + formatRuDate(prev) + " на " + formatRuDate(INV_DATE) + "?")) return;
  STOCK = JSON.parse(JSON.stringify(DAYS[prev] || {}));
  DAYS[INV_DATE] = STOCK;
  saveDays();
  renderInventory();
}
function stockGrams(id) {
  return Number(STOCK[id] || 0);
}
function setStockGrams(id, grams) {
  grams = Math.max(0, Math.round(Number(grams) || 0));
  if (!grams) delete STOCK[id];
  else STOCK[id] = grams;
  saveDays();
}
function brandKey(p) {
  return ((p && (p.brand + " " + p.line + " " + p.name)) || "").toLowerCase();
}
function jarTare(p) {
  var s = brandKey(p);
  if (!s) return 0;
  for (var i = 0; i < JAR_TARE_RULES.length; i++) {
    var rule = JAR_TARE_RULES[i];
    for (var j = 0; j < rule.keys.length; j++) {
      if (s.indexOf(rule.keys[j]) >= 0) return rule.tare;
    }
  }
  return 37;
}
function packGrams(p) {
  var m = String((p && p.weight) || "").match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return 100;
  return parseFloat(m[1].replace(",", ".")) || 100;
}
function pricePerGram(p) {
  var w = packGrams(p);
  if (!w) return 0;
  return (p.price || 0) / w;
}
function lineSum(p, grams) {
  return pricePerGram(p) * (grams || 0);
}
function netFromScale(p, scaleG) {
  return Math.max(0, Math.round((Number(scaleG) || 0) - jarTare(p)));
}
function scaleFromNet(p, net) {
  if (!net) return "";
  return net + jarTare(p);
}
function totalsForMap(map) {
  var grams = 0, sum = 0, positions = 0;
  Object.keys(map || {}).forEach(function (id) {
    var g = map[id] || 0;
    if (g <= 0) return;
    var p = typeof findProduct === "function" ? findProduct(id) : null;
    if (!p) return;
    positions += 1;
    grams += g;
    sum += lineSum(p, g);
  });
  return { positions: positions, grams: grams, sum: Math.round(sum) };
}
function inventoryTotals() {
  return totalsForMap(STOCK);
}
function getInventoryFiltered() {
  var q = (($("#inv-search") && $("#inv-search").value) || "").trim().toLowerCase();
  var brand = ($("#inv-brand") && $("#inv-brand").value) || "";
  var source = ($("#inv-source") && $("#inv-source").value) || "";
  return (PRODUCTS || []).filter(function (p) {
    var g = stockGrams(p.id);
    if (inventoryOnlyShelf && g <= 0) return false;
    if (brand && p.brand !== brand) return false;
    if (source && p.source !== source) return false;
    if (!q) return true;
    var hay = (p.name + " " + p.flavor + " " + p.brand + " " + p.sku + " " + p.line).toLowerCase();
    return hay.includes(q);
  });
}
function initInventoryFilters() {
  var brands = Array.from(new Set((PRODUCTS || []).map(function (p) { return p.brand; }).filter(Boolean))).sort();
  var sources = Array.from(new Set((PRODUCTS || []).map(function (p) { return p.source; }).filter(Boolean))).sort();
  var ib = $("#inv-brand");
  if (ib) ib.innerHTML = '<option value="">Все бренды</option>' + brands.map(function (b) {
    return '<option value="' + esc(b) + '">' + esc(b) + "</option>";
  }).join("");
  var isrc = $("#inv-source");
  if (isrc) isrc.innerHTML = '<option value="">Все прайсы</option>' + sources.map(function (s) {
    return '<option value="' + esc(s) + '">' + esc(s) + "</option>";
  }).join("");
}
function ensureDayControls() {
  var card = document.querySelector("#view-inventory .card");
  if (!card || document.getElementById("inv-date")) return;
  var bar = document.createElement("div");
  bar.className = "inv-daybar";
  bar.innerHTML =
    '<label class="inv-toggle">Дата съёма <input type="date" id="inv-date" /></label>' +
    '<button type="button" class="btn-sm" id="inv-copy-prev">Взять с прошлой недели</button>' +
    '<button type="button" class="btn-sm" id="inv-new-today">Сегодня</button>';
  var filters = card.querySelector(".order-filters");
  if (filters) card.insertBefore(bar, filters);
  else card.insertBefore(bar, card.firstChild.nextSibling);
  var hist = document.createElement("div");
  hist.id = "inv-history";
  hist.className = "inv-hist";
  card.appendChild(hist);
}
function renderDayHistory() {
  var box = document.getElementById("inv-history");
  if (!box) return;
  var dates = Object.keys(DAYS).filter(function (d) {
    return DAYS[d] && Object.keys(DAYS[d]).some(function (id) { return DAYS[d][id] > 0; });
  }).sort().reverse();
  if (!dates.length) {
    box.innerHTML = '<p class="empty" style="padding:.6rem 0">Пока нет сохранённых съёмов</p>';
    return;
  }
  box.innerHTML = "<h3 style=\"font-size:1rem;margin:0 0 .4rem\">Съёмы по дням</h3>" + dates.map(function (d) {
    var t = totalsForMap(DAYS[d]);
    var cls = d === INV_DATE ? "inv-hist-item active" : "inv-hist-item";
    return '<div class="' + cls + '" data-inv-day="' + d + '"><div>' + formatRuDate(d) +
      '<div class="order-row-meta">' + t.positions + " поз. · " + t.grams + " г</div></div><strong>" +
      fmt(t.sum) + "</strong></div>";
  }).join("");
}
function renderInventory() {
  ensureDayControls();
  var dateEl = document.getElementById("inv-date");
  if (dateEl && dateEl.value !== INV_DATE) dateEl.value = INV_DATE;
  var list = $("#inv-list");
  var foot = $("#inv-footer");
  if (!list) return;
  var totals = inventoryTotals();
  var rows = getInventoryFiltered();
  if (!rows.length) {
    list.innerHTML = '<p class="empty">На ' + formatRuDate(INV_DATE) + ' на полке пусто. Снимите галочку «Только на полке» и введите вес с весов.</p>';
  } else {
    var slice = rows.slice(0, 250);
    list.innerHTML = slice.map(function (p) {
      var g = stockGrams(p.id);
      var tare = jarTare(p);
      var line = lineSum(p, g);
      var shown = scaleFromNet(p, g);
      var tareHint = '<div class="inv-tare">банка −' + tare + ' г. Ввесили в банке → табак ' + (g || 0) + ' г</div>';
      return '<div class="order-row inv-row' + (g ? " inv-on-shelf" : "") + '">' +
        '<div class="order-row-main"><strong>' + esc(p.name) + "</strong>" +
        '<div class="order-row-meta">' + esc(p.brand) + " · " + esc(p.flavor || "") + " · фасовка " + esc(p.weight) +
        ' · <span class="badge-src">' + esc(p.source) + "</span></div>" + tareHint + "</div>" +
        '<div class="order-row-price">' + (Math.round(pricePerGram(p) * 100) / 100) + " ₽/г" +
        (g ? '<div class="order-row-meta">' + g + " г = " + fmt(Math.round(line)) + "</div>" : "") + "</div>" +
        '<div class="order-row-qty">' +
        '<button type="button" class="btn-sm" data-stock-minus="' + esc(p.id) + '">-5</button>' +
        '<input class="inv-qty" type="number" min="0" step="1" value="' + shown + '" placeholder="г с весов" data-stock-scale="' + esc(p.id) + '" />' +
        '<button type="button" class="btn-sm" data-stock-plus="' + esc(p.id) + '">+5</button>' +
        "</div></div>";
    }).join("") + (rows.length > 250 ? '<p class="empty">Показано 250 из ' + rows.length + ". Уточните поиск.</p>" : "");
  }
  if (foot) {
    foot.innerHTML =
      '<div class="budget-item"><span class="budget-label">Съём</span><strong>' + formatRuDate(INV_DATE) + "</strong></div>" +
      '<div class="budget-item"><span class="budget-label">На полке (позиции)</span><strong>' + totals.positions + "</strong></div>" +
      '<div class="budget-item"><span class="budget-label">Грамм табака</span><strong>' + totals.grams + " г</strong></div>" +
      '<div class="budget-item budget-remain"><span class="budget-label">Сумма табака на этот день</span><strong>' + fmt(totals.sum) + "</strong></div>";
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
function applyScaleInput(id, raw) {
  var p = typeof findProduct === "function" ? findProduct(id) : null;
  if (raw === "" || raw == null) { setStockGrams(id, 0); return; }
  setStockGrams(id, netFromScale(p, raw));
}
function initInventoryUI() {
  loadDays();
  initInventoryFilters();
  if (inventoryBound) { renderInventory(); return; }
  inventoryBound = true;
  var search = $("#inv-search");
  if (search) search.addEventListener("input", renderInventory);
  var brand = $("#inv-brand");
  if (brand) brand.addEventListener("change", renderInventory);
  var source = $("#inv-source");
  if (source) source.addEventListener("change", renderInventory);
  var only = $("#inv-only-shelf");
  if (only) {
    only.checked = inventoryOnlyShelf;
    only.addEventListener("change", function () {
      inventoryOnlyShelf = !!only.checked;
      renderInventory();
    });
  }
  var hint = document.querySelector("#view-inventory .other-hint");
  if (hint) {
    hint.textContent = "Съём раз в неделю: выберите дату и введите вес с весов с банкой. Каждый день хранится отдельно. Внизу — история съёмов и сумма на выбранную дату.";
  }
  document.addEventListener("click", function (e) {
    var tab = e.target && e.target.closest && e.target.closest(".tab");
    if (tab) showInventoryView(tab.getAttribute("data-view") === "inventory");
    var t = e.target;
    if (!t) return;
    if (t.id === "inv-copy-prev") { copyPrevDay(); return; }
    if (t.id === "inv-new-today") { switchDay(todayISO()); return; }
    var dayBtn = t.closest && t.closest("[data-inv-day]");
    if (dayBtn) { switchDay(dayBtn.getAttribute("data-inv-day")); return; }
    if (!t.getAttribute) return;
    var plus = t.getAttribute("data-stock-plus");
    var minus = t.getAttribute("data-stock-minus");
    if (plus) { setStockGrams(plus, stockGrams(plus) + 5); renderInventory(); return; }
    if (minus) { setStockGrams(minus, stockGrams(minus) - 5); renderInventory(); }
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (!t) return;
    if (t.id === "inv-date") { switchDay(t.value || todayISO()); return; }
    var id = t.getAttribute && t.getAttribute("data-stock-scale");
    if (id) { applyScaleInput(id, t.value); renderInventory(); }
  });
  renderInventory();
}
function bootInventory() {
  if (typeof $ !== "function" || typeof PRODUCTS === "undefined") {
    setTimeout(bootInventory, 150);
    return;
  }
  if (!PRODUCTS.length) {
    setTimeout(bootInventory, 200);
    return;
  }
  initInventoryUI();
}
window.renderInventory = renderInventory;
window.initInventoryUI = initInventoryUI;
window.inventoryTotals = inventoryTotals;
bootInventory();
