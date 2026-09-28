/* Inventory in grams; jar tare from учёт табака */
const STORAGE_STOCK = "hookahbase_stock_g_v1";
let STOCK = {};
let inventoryOnlyShelf = true;
let inventoryBound = false;

/* Взято с http://46.8.178.143:3100/api/brands — основная банка бренда */
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
  st.textContent = ".inv-title{font-size:1.05rem;margin-bottom:.25rem}.inv-toggle{display:flex;align-items:center;gap:.4rem;font-size:.88rem;white-space:nowrap}.inv-qty{width:4.6rem;text-align:center;padding:.25rem .2rem;border:1px solid var(--border);border-radius:6px;font:inherit;font-size:.9rem}.order-row-qty{display:flex;align-items:center;gap:.3rem;flex-wrap:wrap;justify-content:flex-end}.inv-on-shelf{background:#f0fdf4}#inv-list{max-height:62vh}#inv-footer{margin-top:.9rem}.inv-tare{font-size:.72rem;color:#0f766e}";
  document.head.appendChild(st);
})();

function loadStock() {
  try {
    var raw = localStorage.getItem(STORAGE_STOCK);
    STOCK = raw ? JSON.parse(raw) : {};
  } catch (e) { STOCK = {}; }
}
function saveStock() {
  try { localStorage.setItem(STORAGE_STOCK, JSON.stringify(STOCK)); } catch (e) {}
}
function stockGrams(id) {
  return Number(STOCK[id] || 0);
}
function setStockGrams(id, grams) {
  grams = Math.max(0, Math.round(Number(grams) || 0));
  if (!grams) delete STOCK[id];
  else STOCK[id] = grams;
  saveStock();
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
function inventoryTotals() {
  var grams = 0;
  var sum = 0;
  var positions = 0;
  Object.keys(STOCK).forEach(function (id) {
    var g = STOCK[id] || 0;
    if (g <= 0) return;
    var p = typeof findProduct === "function" ? findProduct(id) : null;
    if (!p) return;
    positions += 1;
    grams += g;
    sum += lineSum(p, g);
  });
  return { positions: positions, grams: grams, sum: Math.round(sum) };
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
function renderInventory() {
  var list = $("#inv-list");
  var foot = $("#inv-footer");
  if (!list) return;
  var totals = inventoryTotals();
  var rows = getInventoryFiltered();
  if (!rows.length) {
    list.innerHTML = '<p class="empty">На полке пусто. Снимите галочку «Только на полке» и введите вес с весов (с банкой).</p>';
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
        '<input class="inv-qty" type="number" min="0" step="1" value="' + shown + '" placeholder="г с весов" data-stock-scale="' + esc(p.id) + '" title="Вес с весов вместе с банкой" />' +
        '<button type="button" class="btn-sm" data-stock-plus="' + esc(p.id) + '">+5</button>' +
        "</div></div>";
    }).join("") + (rows.length > 250 ? '<p class="empty">Показано 250 из ' + rows.length + ". Уточните поиск.</p>" : "");
  }
  if (foot) {
    foot.innerHTML =
      '<div class="budget-item"><span class="budget-label">В прайсе</span><strong>' + (PRODUCTS || []).length + "</strong></div>" +
      '<div class="budget-item"><span class="budget-label">На полке (позиции)</span><strong>' + totals.positions + "</strong></div>" +
      '<div class="budget-item"><span class="budget-label">Грамм табака</span><strong>' + totals.grams + " г</strong></div>" +
      '<div class="budget-item budget-remain"><span class="budget-label">Сумма табака на полке</span><strong>' + fmt(totals.sum) + "</strong></div>";
  }
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
  loadStock();
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
    hint.textContent = "Вводите вес с весов вместе с банкой. Вес банки берётся из учёта табака: DS/Starline 52 г, большинство квадратных 37 г, стекло Бонч/Трофимофф/Антагонист/Догма — 155–179 г.";
  }
  document.addEventListener("click", function (e) {
    var tab = e.target && e.target.closest && e.target.closest(".tab");
    if (tab) {
      var view = tab.getAttribute("data-view");
      showInventoryView(view === "inventory");
    }
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var plus = t.getAttribute("data-stock-plus");
    var minus = t.getAttribute("data-stock-minus");
    if (plus) { setStockGrams(plus, stockGrams(plus) + 5); renderInventory(); return; }
    if (minus) { setStockGrams(minus, stockGrams(minus) - 5); renderInventory(); }
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var id = t.getAttribute("data-stock-scale");
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
window.loadStock = loadStock;
window.inventoryTotals = inventoryTotals;
bootInventory();
