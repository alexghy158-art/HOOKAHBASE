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
    '<div class="stat"><strong>' + DATA.length + "</strong> вкусов</div>' +
    '<div class="stat"><strong>' + brands.size + "</strong> брендов</div>' +
    '<div class="stat"><strong>' + PRODUCTS.length + "</strong> в прайсе</div>' +
    (cartCount ? '<div class="stat"><strong>' + cartCount + "</strong> в заказе</div>' : "") +
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
    html += '<div class="matrix-block"><div class="matrix-cat">' + esc(cat) + "</div>';
    html += '<table class="matrix-table"><thead><tr><th>Вкус</th><th class="col-light">Лёгкий</th><th class="col-medium">Средний</th><th class="col-strong">Крепкий</th></tr></thead><tbody>';
    tastes.forEach(function (cols, taste) {
      html += "<tr><td class=\"taste-cell\">" + esc(taste) + "</td>";
      ["Лёгкий", "Средний", "Крепкий"].forEach(function (s) {
        var cls = s === "Лёгкий" ? "cell-light" : s === "Средний" ? "cell-medium" : "cell-strong";
        html += '<td class="' + cls + '">' + (cols[s].map(function (n) {
          return '<span class="matrix-item">' + esc(n) + "</span>';
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
  var sorted = Array.from(byBrand.entries()).sort(function (a, b) { return b[1].length - a[1].length; });
  cont.innerHTML = sorted.map(function (entry) {
    var brand = entry[0], items = entry[1];
    var c = { "Лёгкий": 0, "Средний": 0, "Крепкий": 0 };
    items.forEach(function (i) { if (c[i.strength] !== undefined) c[i.strength]++; });
    return '<div class="brand-card"><div class="brand-head"><div><h3>' + esc(brand) +
      '</h3><span class="brand-count">' + items.length + ' позиций</span></div><div class="brand-strengths">' +
      (c["Лёгкий"] ? '<span class="badge badge-light">' + c["Лёгкий"] + " лёгких</span>' : "") +
      (c["Средний"] ? '<span class="badge badge-medium">' + c["Средний"] + " средних</span>' : "") +
      (c["Крепкий"] ? '<span class="badge badge-strong">' + c["Крепкий"] + " крепких</span>' : "") +
      '</div></div><div class="brand-list">' +
      items.map(function (d) {
        return '<div class="brand-item"><div><strong>' + esc(d.taste) + "</strong></div><div>" +
          esc(d.name) + '</div><div><span class="' + badgeClass(d.strength) + '">' +
          esc(d.strength || "—") + '</span></div><div class="cat-tag">' + esc(d.category) + "</div></div>';
      }).join("") + "</div></div>";
  }).join("");
}
function refresh() {
  var rows = getFiltered();
  renderStats(rows);
  if (currentView === "list") renderList(rows);
  else if (currentView === "matrix") renderMatrix(rows);
  else if (currentView === "brands") renderBrands(rows);
  else if (currentView === "order") { renderOrderList(); renderCart(); renderHistory(); renderBudget(); }
  else if (currentView === "other") { renderOtherList(); renderBudget(); }
}
function initFilters() {
  var cats = Array.from(new Set(DATA.map(function (d) { return d.category; }).filter(Boolean))).sort();
  var brands = Array.from(new Set(DATA.map(function (d) { return d.brand; }).filter(Boolean))).sort();
  cats.forEach(function (c) {
    var o = document.createElement("option"); o.value = c; o.textContent = c; $("#filter-category").appendChild(o);
  });
  brands.forEach(function (b) {
    var o = document.createElement("option"); o.value = b; o.textContent = b; $("#filter-brand").appendChild(o);
  });
}
function initOrderFilters() {
  var brands = Array.from(new Set(PRODUCTS.map(function (p) { return p.brand; }).filter(Boolean))).sort();
  var sources = Array.from(new Set(PRODUCTS.map(function (p) { return p.source; }).filter(Boolean))).sort();
  brands.forEach(function (b) {
    var o = document.createElement("option"); o.value = b; o.textContent = b; $("#order-brand").appendChild(o);
  });
  sources.forEach(function (s) {
    var o = document.createElement("option"); o.value = s; o.textContent = s; $("#order-source").appendChild(o);
  });
}
function getProduct(id) {
  for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
  return null;
}
function filteredProducts() {
  var q = ($("#order-search").value || "").trim().toLowerCase();
  var brand = $("#order-brand").value;
  var source = $("#order-source").value;
  return PRODUCTS.filter(function (p) {
    if (brand && p.brand !== brand) return false;
    if (source && p.source !== source) return false;
    if (!q) return true;
    var hay = (p.name + " " + p.flavor + " " + p.brand + " " + (p.sku || "") + " " + p.line).toLowerCase();
    return hay.includes(q);
  });
}
function renderOrderList() {
  var list = $("#order-list");
  if (!list) return;
  var rows = filteredProducts();
  if (!rows.length) { list.innerHTML = '<p class="empty">Ничего не найдено в прайсе</p>'; return; }
  var max = 300;
  var slice = rows.slice(0, max);
  list.innerHTML = slice.map(function (p) {
    return '<div class="order-row"><div><div class="order-row-name">' + esc(p.flavor || p.name) +
      '</div><div class="order-row-meta">' + esc(p.brand) + (p.weight ? " · " + esc(p.weight) : "") +
      (p.sku ? " · " + esc(p.sku) : "") + (p.rating ? " · " + esc(p.rating) : "") +
      ' <span class="badge-src">' + esc(p.source) + '</span></div></div><div class="order-row-price">' +
      fmt(p.price) + '</div><button type="button" class="btn btn-add" data-add="' + esc(p.id) + '">+</button></div>';
  }).join("") +
  (rows.length > max ? '<p class="empty">Показано ' + max + ' из ' + rows.length + '</p>' : "");
}
function saveCart() { try { localStorage.setItem(STORAGE_CART, JSON.stringify(CART)); } catch (e) {} }
function loadCart() {
  try { var raw = localStorage.getItem(STORAGE_CART); if (raw) CART = JSON.parse(raw) || {}; } catch (e) { CART = {}; }
}
function addToCart(id) { CART[id] = (CART[id] || 0) + 1; saveCart(); renderCart(); refresh(); }
function setQty(id, qty) {
  if (qty <= 0) delete CART[id]; else CART[id] = qty;
  saveCart(); renderCart(); refresh();
}
function cartTotal() {
  var total = 0;
  Object.keys(CART).forEach(function (id) {
    var p = getProduct(id); if (p) total += p.price * CART[id];
  });
  return total;
}
function renderCart() {
  var box = $("#cart-items"); var totalEl = $("#cart-total");
  if (!box) return;
  var ids = Object.keys(CART);
  if (!ids.length) {
    box.innerHTML = '<p class="empty" style="padding:1rem 0">Корзина пуста — добавьте позиции из прайса</p>';
    totalEl.textContent = fmt(0); return;
  }
  box.innerHTML = ids.map(function (id) {
    var p = getProduct(id); if (!p) return "";
    var q = CART[id];
    return '<div class="cart-line"><div><strong>' + esc(p.flavor || p.name) +
      '</strong><div class="order-row-meta">' + esc(p.brand) + " · " + fmt(p.price) +
      '</div></div><div class="cart-qty"><button type="button" data-dec="' + esc(id) +
      '">−</button><span>' + q + '</span><button type="button" data-inc="' + esc(id) +
      '">+</button></div><div><strong>' + fmt(p.price * q) + '</strong></div></div>';
  }).join("");
  totalEl.textContent = fmt(cartTotal());
}
function loadOrders() {
  try { var raw = localStorage.getItem(STORAGE_ORDERS); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
}
function saveOrders(list) { try { localStorage.setItem(STORAGE_ORDERS, JSON.stringify(list)); } catch (e) {} }
function saveCurrentOrder() {
  var ids = Object.keys(CART);
  if (!ids.length) { alert("Корзина пуста"); return; }
  var items = [];
  ids.forEach(function (id) {
    var p = getProduct(id); if (!p) return;
    items.push({ id: p.id, name: p.name, flavor: p.flavor, brand: p.brand, price: p.price, qty: CART[id], sku: p.sku || "", weight: p.weight || "", source: p.source });
  });
  var order = { id: "ord-" + Date.now(), createdAt: new Date().toISOString(), note: ($("#order-note").value || "").trim(), total: cartTotal(), items: items };
  var list = loadOrders(); list.unshift(order); saveOrders(list);
  CART = {}; saveCart(); renderCart(); renderHistory(); renderBudget();
  alert("Заказ сохранён · " + fmt(order.total) + "\nОстаток бюджета: " + fmt(MONTHLY_BUDGET - ordersSpentThisMonth() - otherSpentThisMonth()));
}
function renderHistory() {
  var box = $("#order-history"); if (!box) return;
  var list = loadOrders();
  if (!list.length) { box.innerHTML = '<p class="empty" style="padding:0.5rem 0">Пока нет сохранённых заказов</p>'; return; }
  box.innerHTML = list.map(function (o) {
    var dateStr = new Date(o.createdAt).toLocaleString("ru-RU");
    return '<div class="history-item"><header><span>' + esc(dateStr) + '</span><span class="hist-total">' +
      fmt(o.total) + '</span></header>' + (o.note ? '<div class="order-row-meta">' + esc(o.note) + '</div>' : '') +
      '<ul>' + o.items.map(function (it) {
        return '<li>' + esc(it.qty) + '× ' + esc(it.flavor || it.name) + ' (' + esc(it.brand) + ') — ' + fmt(it.price * it.qty) + '</li>';
      }).join('') + '</ul><div class="hist-actions">' +
      '<button type="button" class="btn-sm" data-reload="' + esc(o.id) + '">Повторить</button>' +
      '<button type="button" class="btn-sm" data-delete="' + esc(o.id) + '">Удалить</button></div></div>';
  }).join('');
}
function reloadOrder(oid) {
  var list = loadOrders(); var o = null;
  for (var i = 0; i < list.length; i++) if (list[i].id === oid) { o = list[i]; break; }
  if (!o) return;
  CART = {}; o.items.forEach(function (it) { CART[it.id] = (CART[it.id] || 0) + it.qty; });
  saveCart(); renderCart(); refresh();
}
function deleteOrder(oid) {
  saveOrders(loadOrders().filter(function (o) { return o.id !== oid; }));
  renderHistory();
}
function isSameMonth(iso) {
  if (!iso) return true;
  try {
    var d = new Date(iso);
    var now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  } catch (e) { return true; }
}
function loadOther() {
  try {
    var raw = localStorage.getItem(STORAGE_OTHER);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveOther(list) {
  try { localStorage.setItem(STORAGE_OTHER, JSON.stringify(list)); } catch (e) {}
}
function ordersSpentThisMonth() {
  var list = loadOrders();
  var sum = 0;
  list.forEach(function (o) { if (isSameMonth(o.createdAt)) sum += (o.total || 0); });
  return sum;
}
function otherSpentThisMonth() {
  var list = loadOther();
  var sum = 0;
  list.forEach(function (o) { if (isSameMonth(o.createdAt)) sum += (o.amount || 0); });
  return sum;
}
function renderBudget() {
  var orders = ordersSpentThisMonth();
  var other = otherSpentThisMonth();
  var cart = cartTotal();
  var remain = MONTHLY_BUDGET - orders - other - cart;
  function set(id, val, warn) {
    var el = $(id);
    if (!el) return;
    el.textContent = fmt(val);
    if (warn !== undefined) {
      el.classList.toggle("budget-neg", val < 0);
      el.classList.toggle("budget-ok", val >= 0);
    }
  }
  set("#budget-total", MONTHLY_BUDGET);
  set("#budget-orders", orders);
  set("#budget-other", other);
  set("#budget-cart", cart);
  set("#budget-remain", remain, true);
  set("#budget-total-o", MONTHLY_BUDGET);
  set("#budget-spent-o", orders + other + cart);
  set("#budget-remain-o", remain, true);
}
function renderOtherList() {
  var box = $("#other-list");
  if (!box) return;
  var list = loadOther().slice().sort(function (a, b) {
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
  if (!list.length) {
    box.innerHTML = '<p class="empty" style="padding:0.5rem 0">Пока нет прочих расходов</p>';
    return;
  }
  box.innerHTML = list.map(function (o) {
    var dateStr = o.createdAt ? new Date(o.createdAt).toLocaleString("ru-RU") : "—";
    var monthTag = isSameMonth(o.createdAt)
      ? '<span class="badge-src">этот месяц</span>'
      : '<span class="badge-src">прошлый</span>';
    return '<div class="other-item"><div><strong>' + esc(o.name) + '</strong>' +
      '<div class="order-row-meta">' + esc(dateStr) + " " + monthTag + "</div></div>" +
      "<div><strong>" + fmt(o.amount) + "</strong></div>" +
      '<button type="button" class="btn-sm" data-del-other="' + esc(o.id) + '">Удалить</button></div>';
  }).join("");
}
function addOtherExpense() {
  var nameEl = $("#other-name");
  var amtEl = $("#other-amount");
  var name = ((nameEl && nameEl.value) || "").trim();
  var amount = parseFloat(amtEl && amtEl.value);
  if (!name) { alert("Укажите название расхода"); return; }
  if (!amount || amount <= 0 || isNaN(amount)) { alert("Укажите сумму больше 0"); return; }
  var list = loadOther();
  list.unshift({ id: "oth-" + Date.now(), name: name, amount: Math.round(amount), createdAt: new Date().toISOString() });
  saveOther(list);
  if (nameEl) nameEl.value = "";
  if (amtEl) amtEl.value = "";
  renderOtherList();
  renderBudget();
}
function deleteOther(oid) {
  saveOther(loadOther().filter(function (o) { return o.id !== oid; }));
  renderOtherList();
  renderBudget();
}
function bind() {
  $("#search").addEventListener("input", refresh);
  $("#filter-category").addEventListener("change", refresh);
  $("#filter-brand").addEventListener("change", refresh);
  $$("#filter-strength .chip").forEach(function (btn) {
    btn.addEventListener("click", function () {
      $$("#filter-strength .chip").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      strengthFilter = btn.getAttribute("data-value") || "";
      refresh();
    });
  });
  $$(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      $$(".tab").forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      currentView = tab.getAttribute("data-view");
      $("#view-list").hidden = currentView !== "list";
      $("#view-matrix").hidden = currentView !== "matrix";
      $("#view-brands").hidden = currentView !== "brands";
      $("#view-order").hidden = currentView !== "order";
      var vo = $("#view-other"); if (vo) vo.hidden = currentView !== "other";
      var mf = $("#matrix-filters"); if (mf) mf.hidden = currentView === "order" || currentView === "other";
      refresh();
    });
  });
  document.addEventListener("click", function (e) {
    var t = e.target; if (!t || !t.getAttribute) return;
    var add = t.getAttribute("data-add"); if (add) { addToCart(add); return; }
    var inc = t.getAttribute("data-inc"); if (inc) { setQty(inc, (CART[inc] || 0) + 1); return; }
    var dec = t.getAttribute("data-dec"); if (dec) { setQty(dec, (CART[dec] || 0) - 1); return; }
    var rel = t.getAttribute("data-reload"); if (rel) { reloadOrder(rel); return; }
    var del = t.getAttribute("data-delete");
    if (del) { if (confirm("Удалить заказ из истории?")) { deleteOrder(del); renderBudget(); } return; }
    var delO = t.getAttribute("data-del-other");
    if (delO) { if (confirm("Удалить расход?")) deleteOther(delO); }
  });
  var os = $("#order-search"); if (os) os.addEventListener("input", renderOrderList);
  var ob = $("#order-brand"); if (ob) ob.addEventListener("change", renderOrderList);
  var osrc = $("#order-source"); if (osrc) osrc.addEventListener("change", renderOrderList);
  var saveBtn = $("#btn-save-order"); if (saveBtn) saveBtn.addEventListener("click", saveCurrentOrder);
  var clearBtn = $("#btn-clear-cart");
  if (clearBtn) clearBtn.addEventListener("click", function () { CART = {}; saveCart(); renderCart(); renderBudget(); refresh(); });
  var addOther = $("#btn-add-other");
  if (addOther) addOther.addEventListener("click", addOtherExpense);
  var otherAmt = $("#other-amount");
  if (otherAmt) otherAmt.addEventListener("keydown", function (e) { if (e.key === "Enter") addOtherExpense(); });
}
async function loadJSON(url) {
  try {
    var r = await fetch(url);
    if (!r.ok) return [];
    return await r.json();
  } catch (e) {
    return [];
  }
}
async function main() {
  loadCart();
  try {
    var urls = ["data/0.json", "data/1.json", "data/2.json", "data/3.json", "data.json"];
    var parts = await Promise.all(urls.map(loadJSON));
    var seen = new Set();
    DATA = [];
    parts.forEach(function (part) {
      part.forEach(function (d) {
        var key = d.name + "|" + d.brand + "|" + d.strength;
        if (seen.has(key)) return;
        seen.add(key);
        DATA.push(d);
      });
    });
  } catch (e) {
    DATA = [];
  }
  try {
    var parts = await Promise.all(Array.from({length:20},function(_,i){return i}).map(function (i) {
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
          id: p.id,
          name: p.n,
          flavor: p.f,
          brand: p.b,
          weight: p.w || "",
          price: p.p,
          source: p.s,
          sku: p.k || "",
          rating: p.r || "",
          line: p.l || ""
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
