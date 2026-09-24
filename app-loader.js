(async function () {
  var parts = await Promise.all([0, 1].map(function (i) {
    return fetch("app" + i + ".b64").then(function (r) { return r.ok ? r.text() : ""; });
  }));
  var b64 = parts.join("").replace(/\n/g, "");
  var code = atob(b64);
  var s = document.createElement("script");
  s.textContent = code;
  document.head.appendChild(s);
  var b = document.createElement("script");
  b.src = "budget.js";
  document.head.appendChild(b);
})();
