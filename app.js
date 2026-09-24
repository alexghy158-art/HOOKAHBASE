let DATA = [];
let strengthFilter = "";
let currentView = "list";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function badgeClass(s) {
  if (s === "Лёгкий") return "badge badge-light";
  if (s === "Средний") return "badge badge-medium";
  if (s === "Крепкий") return "badge badge-strong";
  return "badge badge-none";
}

function getFiltered() {
  const q = ($("#search").value || "").trim().toLowerCase();
  const cat = $("#filter-category").value;
  const brand = $("#filter-brand").value;
  return DATA.filter((d) => {
    if (cat && d.category !== cat) return false;
    if (brand && d.brand !== brand) return false;
    if (strengthFilter && d.strength !== strengthFilter) return false;
    if (!q) return true;
    const hay = (d.taste + " " + d.name + " " + d.brand + " " + d.category).toLowerCase();
    return hay.includes(q);
  });
}

function renderStats(filtered) {
  const brands = new Set(DATA.map((d) => d.brand).filter(Boolean));
  const cats = new Set(DATA.map((d) => d.category).filter(Boolean));
  $("#stats").innerHTML =
    '<div class="stat"><strong>' + DATA.length + "</strong> вкусов</div>" +
    '<div class="stat"><strong>' + brands.size + "</strong> брендов</div>" +
    '<div class="stat"><strong>' + cats.size + "</strong> категорий</div>" +
    '<div class="stat">показано <strong>' + filtered.length + "</strong></div>";
}

function renderList(rows) {
  const tbody = $("#table-body");
  const empty = $("#empty-list");
  if (!rows.length) {
    tbody.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  tbody.innerHTML = rows
    .map(function (d) {
      return (
        "<tr>" +
        "<td><strong>" + esc(d.taste) + "</strong></td>" +
        "<td>" + esc(d.name) + "</td>" +
        '<td><span class="brand-pill">' + esc(d.brand) + "</span></td>" +
        '<td><span class="' + badgeClass(d.strength) + '">' + esc(d.strength || "—") + "</span></td>" +
        '<td><span class="cat-tag">' + esc(d.category) + "</span></td>" +
        "</tr>"
      );
    })
    .join("");
}

function renderMatrix(rows) {
  const cont = $("#matrix-container");
  const empty = $("#empty-matrix");
  if (!rows.length) {
    cont.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  const byCat = new Map();
  for (let i = 0; i < rows.length; i++) {
    const d = rows[i];
    if (!byCat.has(d.category)) byCat.set(d.category, new Map());
    const byTaste = byCat.get(d.category);
    if (!byTaste.has(d.taste)) {
      byTaste.set(d.taste, { "Лёгкий": [], "Средний": [], "Крепкий": [] });
    }
    const bucket = byTaste.get(d.taste);
    if (bucket[d.strength]) bucket[d.strength].push(d.name);
  }
  let html = "";
  byCat.forEach(function (tastes, cat) {
    html += '<div class="matrix-block"><div class="matrix-cat">' + esc(cat) + "</div>";
    html +=
      '<table class="matrix-table"><thead><tr>' +
      "<th>Вкус</th>" +
      '<th class="col-light">Лёгкий</th>' +
      '<th class="col-medium">Средний</th>' +
      '<th class="col-strong">Крепкий</th>' +
      "</tr></thead><tbody>";
    tastes.forEach(function (cols, taste) {
      html +=
        "<tr>" +
        '<td class="taste-cell">' + esc(taste) + "</td>" +
        '<td class="cell-light">' +
        (cols["Лёгкий"].map(function (n) {
          return '<span class="matrix-item">' + esc(n) + "</span>";
        }).join("") || "—") +
        "</td>" +
        '<td class="cell-medium">' +
        (cols["Средний"].map(function (n) {
          return '<span class="matrix-item">' + esc(n) + "</span>";
        }).join("") || "—") +
        "</td>" +
        '<td class="cell-strong">' +
        (cols["Крепкий"].map(function (n) {
          return '<span class="matrix-item">' + esc(n) + "</span>";
        }).join("") || "—") +
        "</td>" +
        "</tr>";
    });
    html += "</tbody></table></div>";
  });
  cont.innerHTML = html;
}

function renderBrands(rows) {
  const cont = $("#brands-container");
  const byBrand = new Map();
  for (let i = 0; i < rows.length; i++) {
    const d = rows[i];
    const b = d.brand || "—";
    if (!byBrand.has(b)) byBrand.set(b, []);
    byBrand.get(b).push(d);
  }
  const sorted = Array.from(byBrand.entries()).sort(function (a, b) {
    return b[1].length - a[1].length;
  });
  cont.innerHTML = sorted
    .map(function (entry) {
      const brand = entry[0];
      const items = entry[1];
      const c = { "Лёгкий": 0, "Средний": 0, "Крепкий": 0 };
      items.forEach(function (i) {
        if (c[i.strength] !== undefined) c[i.strength]++;
      });
      return (
        '<div class="brand-card">' +
        '<div class="brand-head">' +
        "<div><h3>" +
        esc(brand) +
        '</h3><span class="brand-count">' +
        items.length +
        " позиций</span></div>" +
        '<div class="brand-strengths">' +
        (c["Лёгкий"] ? '<span class="badge badge-light">' + c["Лёгкий"] + " лёгких</span>" : "") +
        (c["Средний"] ? '<span class="badge badge-medium">' + c["Средний"] + " средних</span>" : "") +
        (c["Крепкий"] ? '<span class="badge badge-strong">' + c["Крепкий"] + " крепких</span>" : "") +
        "</div></div>" +
        '<div class="brand-list">' +
        items
          .map(function (d) {
            return (
              '<div class="brand-item">' +
              "<div><strong>" +
              esc(d.taste) +
              "</strong></div>" +
              "<div>" +
              esc(d.name) +
              "</div>" +
              '<div><span class="' +
              badgeClass(d.strength) +
              '">' +
              esc(d.strength || "—") +
              "</span></div>" +
              '<div class="cat-tag">' +
              esc(d.category) +
              "</div></div>"
            );
          })
          .join("") +
        "</div></div>"
      );
    })
    .join("");
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

function refresh() {
  const rows = getFiltered();
  renderStats(rows);
  if (currentView === "list") renderList(rows);
  else if (currentView === "matrix") renderMatrix(rows);
  else renderBrands(rows);
}

function initFilters() {
  const cats = Array.from(new Set(DATA.map(function (d) { return d.category; }).filter(Boolean))).sort();
  const brands = Array.from(new Set(DATA.map(function (d) { return d.brand; }).filter(Boolean))).sort();
  const catSel = $("#filter-category");
  const brandSel = $("#filter-brand");
  cats.forEach(function (c) {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    catSel.appendChild(o);
  });
  brands.forEach(function (b) {
    const o = document.createElement("option");
    o.value = b;
    o.textContent = b;
    brandSel.appendChild(o);
  });
}

function bind() {
  $("#search").addEventListener("input", refresh);
  $("#filter-category").addEventListener("change", refresh);
  $("#filter-brand").addEventListener("change", refresh);
  $$("#filter-strength .chip").forEach(function (btn) {
    btn.addEventListener("click", function () {
      $$("#filter-strength .chip").forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      strengthFilter = btn.getAttribute("data-value") || "";
      refresh();
    });
  });
  $$(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      $$(".tab").forEach(function (t) {
        t.classList.remove("active");
      });
      tab.classList.add("active");
      currentView = tab.getAttribute("data-view");
      $("#view-list").hidden = currentView !== "list";
      $("#view-matrix").hidden = currentView !== "matrix";
      $("#view-brands").hidden = currentView !== "brands";
      refresh();
    });
  });
}

async function main() {
  try {
    const urls = ["data/0.json", "data/1.json", "data/2.json", "data/3.json", "data.json"];
    const parts = await Promise.all(
      urls.map(function (u) {
        return fetch(u)
          .then(function (r) {
            return r.ok ? r.json() : [];
          })
          .catch(function () {
            return [];
          });
      })
    );
    const seen = new Set();
    DATA = [];
    for (let p = 0; p < parts.length; p++) {
      const part = parts[p];
      for (let i = 0; i < part.length; i++) {
        const d = part[i];
        const key = d.name + "|" + d.brand + "|" + d.strength;
        if (seen.has(key)) continue;
        seen.add(key);
        DATA.push(d);
      }
    }
  } catch (e) {
    console.error(e);
    DATA = [];
  }
  initFilters();
  bind();
  refresh();
}

main();
