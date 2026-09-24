let DATA = [];
let PRODUCTS = [];
let CART = {};
let strengthFilter = "";
let currentView = "list";
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const STORAGE_ORDERS = "hookahbase_orders_v1";
const STORAGE_CART = "hookahbase_cart_v1";
const STORAGE_OTHER = "hookahbase_other_v1";
const MONTHLY_BUDGET = 240000;
function badgeClass(s) {
  if (s === "Лёгкий") return "badge badge-light";
  if (s === "Средний") return "badge badge-medium";
  if (s === "Крепкий") return "badge badge-strong";
  return "badge badge-none";
}
function esc(s) {
  var d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}
function fmt(n) {
  return (n || 0).toLocaleString("ru-RU") + " ₽";
}
function getFiltered() {
  const q = ($("#search").value || "").trim().toLowerCase();
  const cat = $("#filter-category").value;
  const brand = $("#filter-brand").value;
  return DATA.filter(function (d) {
    if (cat && d.category !== cat) return false;
    if (brand && d.brand !== brand) return false;
    if (strengthFilter && d.strength !== strengthFilter) return false;
    if (!q) return true;
    const hay = (d.taste + " " + d.name + " " + d.brand + " " + d.category).toLowerCase();
    return hay.includes(q);
  });
}
function renderStats(filtered) {
  const brands = new Set(DATA.map(function (d) { return d.brand; }).filter(Boolean));
  var cartCount = 0;
  Object.keys(CART).forEach(function (k) { cartCount += CART[k]; });
  $("#stats").innerHTML =
    '<div class="stat"><strong>' + DATA.length + "</strong> вкусов</div>" +
    '<div class="stat"><strong>' + brands.size + "</strong> брендов</div>" +
    '<div class="stat"><strong>' + PRODUCTS.length + "</strong> в прайсе</div>" +
    (cartCount ? '<div class="stat"><strong>' + cartCount + "</strong> в заказе</div>" : "") +
    '<div class="stat">показано <strong>' + filtered.length + "</strong></div>';
}
function renderList(rows) {
  const tbody = $("#table-body");
  const empty = $("#empty-list");
  if (!rows.length) { tbody.innerHTML = ""; empty.hidden = false; return; }
  empty.hidden = true;
  tbody.innerHTML = rows.map(function (d) {
    return "<tr><td><strong>" + esc(d.taste) + "</strong></td><td>" + esc(d.name) +
      "</td><td><span class=\"brand-pill\">" + esc(d.brand) + "</span></td><td><span class=\"" +
      badgeClass(d.strength) + "\">" + esc(d.strength || "—") + "</span></td><td><span class=\"cat-tag\">" +
      esc(d.category) + "</span></td></tr>";
  }).join("");
}
function refresh() {
  var rows = getFiltered();
  renderStats(rows);
  if (currentView === "list") renderList(rows);
  else if (currentView === "matrix") renderMatrix(rows);
  else if (currentView === "brands") renderBrands(rows);
  else if (currentView === "order") {
    renderOrderList(); renderCart(); renderHistory();
    if (typeof renderBudget === "function") renderBudget();
  } else if (currentView === "other") {
    if (typeof renderOtherList === "function") renderOtherList();
    if (typeof renderBudget === "function") renderBudget();
  }
}
function renderMatrix(rows) {
  const cont = $("#matrix-container");
  const empty = $("#empty-matrix");
  if (!rows.length) { cont.innerHTML = ""; empty.hidden = false; return; }
  empty.hidden = true;
  const byCat = new Map();
  for (var i = 0; i < rows.length; i++) {
    var d = rows[i];
    if (!byCat.has(d.category)) byCat.set(d.category, new Map());
    var byTaste = byCat.get(d.category);
    if (!byTaste.has(d.taste)) byTaste.set(d.taste, { "Лёгкий": [], "Средний": [], "Крепкий": [] });
    var bucket = byTaste.get(d.taste);
    if (bucket[d.strength]) bucket[d.strength].push(d.name);
  }
  var html = "";
  byCat.forEach(function (tastes, cat) {
    html += '<div class="matrix-block"><div class="matrix-cat">' + esc(cat) + "</div>";
    html += '<table class="matrix-table"><thead><tr><th>Вкус</th><th class="col-light">Лёгкий</th><th class="col-medium">Средний</th><th class="col-strong">Крепкий</th></tr></thead><tbody>';
    tastes.forEach(function (cols, taste) {
      html += "<tr><td class=\"taste-cell\">" + esc(taste) + "</td>";
      ["Лёгкий", "Средний", "Крепкий"].forEach(function (s) {
        var cls = s === "Лёгкий" ? "cell-light" : s === "Средний" ? "cell-medium" : "cell-strong";
        html += '<td class="' + cls + '">' + (cols[s].map(function (n) {
          return '<span class="matrix-item">' + esc(n) + "</span>";
        }).join("") || "—") + "</td>";
      });
      html += "</tr>";
    });
    html += "</tbody></table></div>";
  });
  cont.innerHTML = html;
}
function renderBrands(rows) {
  const cont = $("#brands-container");
  const byBrand = new Map();
  for (var i = 0; i < rows.length; i++) {
    var d = rows[i];
    var b = d.brand || "—";
    if (!byBrand.has(b)) byBrand.set(b, []);
    byBrand.get(b).push(d);
  }
  var sorted = Array.from(byBrand.entries()).sort(function (a, b) { return a[0].localeCompare(b[0], "ru"); });
  cont.innerHTML = sorted.map(function (entry) {
    var brand = entry[0], items = entry[1];
    var strengths = {};
    items.forEach(function (d) { strengths[d.strength || "—"] = (strengths[d.strength || "—"] || 0) + 1; });
    var strHtml = Object.keys(strengths).map(function (s) {
      return '<span class="' + badgeClass(s) + '">' + esc(s) + " " + strengths[s] + "</span>";
    }).join(" ");
    return '<div class="brand-block card"><div class="brand-head"><h3>' + esc(brand) +
      '</h3><span class="brand-count">' + items.length + ' позиций</span></div><div class="brand-strengths">' +
      strHtml + '</div><div class="brand-list">' +
      items.map(function (d) {
        return '<div class="brand-item"><div><strong>' + esc(d.taste) + "</strong></div><div>" +
          esc(d.name) + '</div><div><span class="' + badgeClass(d.strength) + '">' +
          esc(d.strength || "—") + '</span></div><div class="cat-tag">' + esc(d.category) + "</div></div>";
      }).join("") + "</div></div>";
  }).join("");
}
function loadCart() {
  try { var raw = localStorage.getItem(STORAGE_CART); CART = raw ? JSON.parse(raw) : {}; } catch (e) { CART = {}; }
}
function saveCart() {
  try { localStorage.setItem(STORAGE_CART, JSON.stringify(CART)); } catch (e) {}
}
function loadOrders() {
  try { var raw = localStorage.getItem(STORAGE_ORDERS); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
}
function saveOrders(list) {
  try { localStorage.setItem(STORAGE_ORDERS, JSON.stringify(list)); } catch (e) {}
}
function cartTotal() {
  var sum = 0;
  Object.keys(CART).forEach(function (id) {
    var p = findProduct(id);
    if (p) sum += (p.price || 0) * CART[id];
  });
  return sum;
}
function findProduct(id) {
  for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
  return null;
}
function initOrderFilters() {
  var brands = Array.from(new Set(PRODUCTS.map(function (p) { return p.brand; }).filter(Boolean))).sort();
  var sources = Array.from(new Set(PRODUCTS.map(function (p) { return p.source; }).filter(Boolean))).sort();
  var ob = $("#order-brand");
  if (ob) ob.innerHTML = '<option value="">Все бренды</option>' + brands.map(function (b) {
    return '<option value="' + esc(b) + '">' + esc(b) + "</option>";
  }).join("");
  var os = $("#order-source");
  if (os) os.innerHTML = '<option value="">Все прайсы</option>' + sources.map(function (s) {
    return '<option value="' + esc(s) + '">' + esc(s) + "</option>";
  }).join("");
}
function getOrderFiltered() {
  var q = (($("#order-search") && $("#order-search").value) || "").trim().toLowerCase();
  var brand = ($("#order-brand") && $("#order-brand").value) || "";
  var source = ($("#order-source") && $("#order-source").value) || "";
  return PRODUCTS.filter(function (p) {
    if (brand && p.brand !== brand) return false;
    if (source && p.source !== source) return false;
    if (!q) return true;
    var hay = (p.name + " " + p.flavor + " " + p.brand + " " + p.sku + " " + p.line).toLowerCase();
    return hay.includes(q);
  });
}
function renderOrderList() {
  var list = $("#order-list");
  if (!list) return;
  var rows = getOrderFiltered();
  if (!rows.length) { list.innerHTML = '<p class="empty">Ничего не найдено в прайсе</p>'; return; }
  var slice = rows.slice(0, 200);
  list.innerHTML = slice.map(function (p) {
    var qty = CART[p.id] || 0;
    return '<div class="order-row"><div class="order-row-main"><strong>' + esc(p.name) + "</strong>" +
      '<div class="order-row-meta">' + esc(p.brand) + " · " + esc(p.flavor || "") + " · " + esc(p.weight) +
      ' · <span class="badge-src">' + esc(p.source) + "</span></div></div>" +
      '<div class="order-row-price">' + fmt(p.price) + "</div>" +
      '<div class="order-row-qty"><button type="button" class="btn-sm" data-minus="' + esc(p.id) + '">−</button>' +
      "<span>" + qty + '</span><button type="button" class="btn-sm" data-plus="' + esc(p.id) + '">+</button></div></div>';
  }).join("") + (rows.length > 200 ? '<p class="empty">Показано 200 из ' + rows.length + ". Уточните поиск.</p>" : "");
}
function renderCart() {
  var box = $("#cart-items");
  var totalEl = $("#cart-total");
  if (!box) return;
  var ids = Object.keys(CART).filter(function (id) { return CART[id] > 0; });
  if (!ids.length) {
    box.innerHTML = '<p class="empty">Корзина пуста</p>';
    if (totalEl) totalEl.textContent = fmt(0);
    if (typeof renderBudget === "function") renderBudget();
    return;
  }
  box.innerHTML = ids.map(function (id) {
    var p = findProduct(id);
    if (!p) return "";
    var q = CART[id];
    return '<div class="cart-item"><div><strong>' + esc(p.name) + "</strong><div class=\"order-row-meta\">" +
      esc(p.brand) + " × " + q + "</div></div><div>" + fmt((p.price || 0) * q) +
      ' <button type="button" class="btn-sm" data-minus="' + esc(id) + '">−</button></div></div>';
  }).join("");
  if (totalEl) totalEl.textContent = fmt(cartTotal());
  if (typeof renderBudget === "function") renderBudget();
}
function renderHistory() {
  var box = $("#order-history");
  if (!box) return;
  var list = loadOrders().slice().sort(function (a, b) {
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
  if (!list.length) { box.innerHTML = '<p class="empty">Нет сохранённых заказов</p>'; return; }
  box.innerHTML = list.map(function (o) {
    var dateStr = o.createdAt ? new Date(o.createdAt).toLocaleString("ru-RU") : "—";
    var items = (o.items || []).map(function (it) {
      return esc(it.name) + " × " + it.qty;
    }).join(", ");
    return '<div class="history-item"><div><strong>' + fmt(o.total) + "</strong>" +
      '<div class="order-row-meta">' + esc(dateStr) + (o.note ? " · " + esc(o.note) : "") + "</div>" +
      '<div class="order-row-meta">' + items + "</div></div>" +
      '<button type="button" class="btn-sm" data-del-order="' + esc(o.id) + '">Удалить</button></div>';
  }).join("");
}
function saveCurrentOrder() {
  var ids = Object.keys(CART).filter(function (id) { return CART[id] > 0; });
  if (!ids.length) { alert("Корзина пуста"); return; }
  var items = ids.map(function (id) {
    var p = findProduct(id);
    return { id: id, name: p ? p.name : id, qty: CART[id], price: p ? p.price : 0 };
  });
  var total = cartTotal();
  var note = (($("#order-note") && $("#order-note").value) || "").trim();
  var list = loadOrders();
  list.unshift({ id: "ord-" + Date.now(), items: items, total: total, note: note, createdAt: new Date().toISOString() });
  saveOrders(list);
  CART = {};
  saveCart();
  if ($("#order-note")) $("#order-note").value = "";
  renderCart();
  renderHistory();
  renderOrderList();
  if (typeof renderBudget === "function") renderBudget();
  alert("Заказ сохранён на " + fmt(total));
}
function deleteOrder(oid) {
  saveOrders(loadOrders().filter(function (o) { return o.id !== oid; }));
  renderHistory();
  if (typeof renderBudget === "function") renderBudget();
}
function initFilters() {
  var cats = Array.from(new Set(DATA.map(function (d) { return d.category; }).filter(Boolean))).sort();
  var brands = Array.from(new Set(DATA.map(function (d) { return d.brand; }).filter(Boolean))).sort();
  var fc = $("#filter-category");
  if (fc) fc.innerHTML = '<option value="">Все</option>' + cats.map(function (c) {
    return '<option value="' + esc(c) + '">' + esc(c) + "</option>";
  }).join("");
  var fb = $("#filter-brand");
  if (fb) fb.innerHTML = '<option value="">Все</option>' + brands.map(function (b) {
    return '<option value="' + esc(b) + '">' + esc(b) + "</option>";
  }).join("");
}
function bind() {
  $$(".tab").forEach(function (btn) {
    btn.addEventListener("click", function () {
      currentView = btn.getAttribute("data-view");
      $$(".tab").forEach(function (t) { t.classList.toggle("active", t === btn); });
      ["list", "matrix", "brands", "order", "other"].forEach(function (v) {
        var el = $("#view-" + v);
        if (el) el.hidden = currentView !== v;
      });
      var mf = $("#matrix-filters");
      if (mf) mf.hidden = (currentView === "order" || currentView === "other");
      refresh();
    });
  });
  var search = $("#search");
  if (search) search.addEventListener("input", refresh);
  var fc = $("#filter-category");
  if (fc) fc.addEventListener("change", refresh);
  var fb = $("#filter-brand");
  if (fb) fb.addEventListener("change", refresh);
  $$("#filter-strength .chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      $$("#filter-strength .chip").forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
      strengthFilter = chip.getAttribute("data-value") || "";
      refresh();
    });
  });
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var plus = t.getAttribute("data-plus");
    var minus = t.getAttribute("data-minus");
    var del = t.getAttribute("data-del-order");
    var delO = t.getAttribute("data-del-other");
    if (plus) { CART[plus] = (CART[plus] || 0) + 1; saveCart(); renderOrderList(); renderCart(); refresh(); return; }
    if (minus) {
      CART[minus] = Math.max(0, (CART[minus] || 0) - 1);
      if (!CART[minus]) delete CART[minus];
      saveCart(); renderOrderList(); renderCart(); refresh(); return;
    }
    if (del) { if (confirm("Удалить заказ из истории?")) deleteOrder(del); return; }
    if (delO && typeof deleteOther === "function") { if (confirm("Удалить расход?")) deleteOther(delO); }
  });
  var os = $("#order-search"); if (os) os.addEventListener("input", renderOrderList);
  var ob = $("#order-brand"); if (ob) ob.addEventListener("change", renderOrderList);
  var osrc = $("#order-source"); if (osrc) osrc.addEventListener("change", renderOrderList);
  var saveBtn = $("#btn-save-order"); if (saveBtn) saveBtn.addEventListener("click", saveCurrentOrder);
  var clearBtn = $("#btn-clear-cart");
  if (clearBtn) clearBtn.addEventListener("click", function () {
    CART = {}; saveCart(); renderCart(); if (typeof renderBudget === "function") renderBudget(); refresh();
  });
  if (typeof initOtherUI === "function") initOtherUI();
}
async function loadJSON(url) {
  try {
    var r = await fetch(url);
    if (!r.ok) return [];
    return await r.json();
  } catch (e) { return []; }
}
async function main() {
  loadCart();
  try {
    var urls = ["data/0.json", "data/1.json", "data/2.json", "data/3.json", "data.json"];
    var parts = await Promise.all(urls.map(loadJSON));
    var seen = new Set();
    DATA = [];
    parts.forEach(function (part) {
      (part || []).forEach(function (d) {
        var key = d.name + "|" + d.brand + "|" + d.strength;
        if (seen.has(key)) return;
        seen.add(key);
        DATA.push(d);
      });
    });
  } catch (e) { DATA = []; }
  try {
    var parts = await Promise.all(Array.from({ length: 20 }, function (_, i) { return i; }).map(function (i) {
      return fetch("cat" + i + ".b64").then(function (r) { return r.ok ? r.text() : ""; });
    }));
    var b64 = parts.join("").replace(/\n/g, "");
    if (!b64) { PRODUCTS = []; }
    else {
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var ds = new DecompressionStream("gzip");
      var stream = new Blob([bytes]).stream().pipeThrough(ds);
      var buf = await new Response(stream).arrayBuffer();
      var raw = JSON.parse(new TextDecoder().decode(buf));
      PRODUCTS = raw.map(function (p) {
        return {
          id: p.id, name: p.n, flavor: p.f, brand: p.b, weight: p.w || "",
          price: p.p, source: p.s, sku: p.k || "", rating: p.r || "", line: p.l || ""
        };
      });
    }
  } catch (e) {
    console.error("products load failed", e);
    PRODUCTS = [];
  }
  initFilters();
  initOrderFilters();
  bind();
  refresh();
}
main();
