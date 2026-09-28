/* Inventory / stock on shelf */
const STORAGE_STOCK = "hookahbase_stock_v1";
let STOCK = {};
let inventoryOnlyShelf = true;
let inventoryBound = false;

(function injectInventoryStyles() {
  if (document.getElementById("inv-style")) return;
  var st = document.createElement("style");
  st.id = "inv-style";
  st.textContent = ".inv-title{font-size:1.05rem;margin-bottom:.25rem}.inv-toggle{display:flex;align-items:center;gap:.4rem;font-size:.88rem;white-space:nowrap}.inv-qty{width:3.2rem;text-align:center;padding:.25rem .2rem;border:1px solid var(--border);border-radius:6px;font:inherit;font-size:.9rem}.order-row-qty{display:flex;align-items:center;gap:.3rem}.inv-on-shelf{background:#f0fdf4}#inv-list{max-height:62vh}#inv-footer{margin-top:.9rem}";
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
function stockQty(id) {
  return STOCK[id] || 0;
}
function setStock(id, qty) {
  qty = Math.max(0, parseInt(qty, 10) || 0);
  if (!qty) delete STOCK[id];
  else STOCK[id] = qty;
  saveStock();
}
function inventoryTotals() {
  var packs = 0;
  var sum = 0;
  var positions = 0;
  Object.keys(STOCK).forEach(function (id) {
    var q = STOCK[id] || 0;
    if (q <= 0) return;
    var p = typeof findProduct === "function" ? findProduct(id) : null;
    if (!p) return;
    positions += 1;
    packs += q;
    sum += (p.price || 0) * q;
  });
  return { positions: positions, packs: packs, sum: sum };
}
function getInventoryFiltered() {
  var q = (($("#inv-search") && $("#inv-search").value) || "").trim().toLowerCase();
  var brand = ($("#inv-brand") && $("#inv-brand").value) || "";
  var source = ($("#inv-source") && $("#inv-source").value) || "";
  return (PRODUCTS || []).filter(function (p) {
    var qty = stockQty(p.id);
    if (inventoryOnlyShelf && qty <= 0) return false;
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
    list.innerHTML = '<p class="empty">На полке пусто. Снимите галочку «Только на полке», чтобы проставить остатки из прайса.</p>';
  } else {
    var slice = rows.slice(0, 250);
    list.innerHTML = slice.map(function (p) {
      var qty = stockQty(p.id);
      var line = (p.price || 0) * qty;
      return '<div class="order-row inv-row' + (qty ? " inv-on-shelf" : "") + '">' +
        '<div class="order-row-main"><strong>' + esc(p.name) + "</strong>" +
        '<div class="order-row-meta">' + esc(p.brand) + " · " + esc(p.flavor || "") + " · " + esc(p.weight) +
        ' · <span class="badge-src">' + esc(p.source) + "</span></div></div>" +
        '<div class="order-row-price">' + fmt(p.price) +
        (qty ? '<div class="order-row-meta">на полке: ' + fmt(line) + "</div>" : "") + "</div>" +
        '<div class="order-row-qty">' +
        '<button type="button" class="btn-sm" data-stock-minus="' + esc(p.id) + '">-</button>' +
        '<input class="inv-qty" type="number" min="0" step="1" value="' + qty + '" data-stock-input="' + esc(p.id) + '" />' +
        '<button type="button" class="btn-sm" data-stock-plus="' + esc(p.id) + '">+</button>' +
        "</div></div>";
    }).join("") + (rows.length > 250 ? '<p class="empty">Показано 250 из ' + rows.length + ". Уточните поиск.</p>" : "");
  }
  if (foot) {
    foot.innerHTML =
      '<div class="budget-item"><span class="budget-label">В прайсе</span><strong>' + (PRODUCTS || []).length + "</strong></div>" +
      '<div class="budget-item"><span class="budget-label">На полке (позиции)</span><strong>' + totals.positions + "</strong></div>" +
      '<div class="budget-item"><span class="budget-label">Пачек на полке</span><strong>' + totals.packs + "</strong></div>" +
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
    if (plus) { setStock(plus, stockQty(plus) + 1); renderInventory(); return; }
    if (minus) { setStock(minus, stockQty(minus) - 1); renderInventory(); }
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var id = t.getAttribute("data-stock-input");
    if (id) { setStock(id, t.value); renderInventory(); }
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
