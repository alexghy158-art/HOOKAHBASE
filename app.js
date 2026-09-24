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
