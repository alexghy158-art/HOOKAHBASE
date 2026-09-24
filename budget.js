/* Budget & Other expenses */
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
function initOtherUI() {
  var addOther = $("#btn-add-other");
  if (addOther) addOther.addEventListener("click", addOtherExpense);
  var otherAmt = $("#other-amount");
  if (otherAmt) otherAmt.addEventListener("keydown", function (e) {
    if (e.key === "Enter") addOtherExpense();
  });
}
window.renderBudget = renderBudget;
window.renderOtherList = renderOtherList;
window.deleteOther = deleteOther;
window.ordersSpentThisMonth = ordersSpentThisMonth;
window.otherSpentThisMonth = otherSpentThisMonth;
window.initOtherUI = initOtherUI;
