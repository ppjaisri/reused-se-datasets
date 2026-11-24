(function () {
  "use strict";
  var D = window.REUSE_DATA;
  var DS = D.datasets, P = D.papers;
  var PAGE = 50; // rows per page; Infinity = show all

  var PERIODS = [
    { k: "<2000", lab: "Before 2000", t: function (y) { return y !== null && y < 2000; } },
    { k: "2000s", lab: "2000–09", t: function (y) { return y >= 2000 && y <= 2009; } },
    { k: "2010", lab: "2010–14", t: function (y) { return y >= 2010 && y <= 2014; } },
    { k: "2015", lab: "2015–16", t: function (y) { return y >= 2015 && y <= 2016; } },
    { k: "2017", lab: "2017–18", t: function (y) { return y >= 2017 && y <= 2018; } },
    { k: "2019", lab: "2019–20", t: function (y) { return y >= 2019 && y <= 2020; } },
    { k: "2021", lab: "2021–22", t: function (y) { return y >= 2021 && y <= 2022; } },
    { k: "2023", lab: "2023–24", t: function (y) { return y >= 2023 && y <= 2024; } },
    { k: "na", lab: "Unknown", t: function (y) { return y === null; } }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  // Precompute search text and per-dataset topic counts.
  DS.forEach(function (d, i) {
    d.i = i;
    d.s = [d.n].concat(d.al, [d.a, d.r]).join(" \u0001 ").toLowerCase();
  });

  var state = { q: "", topic: "", venue: "", pyear: "", src: "", min: 1, sort: "papers", period: "", shown: PAGE, open: {} };

  // ---- Tiles ----
  var nUses = DS.reduce(function (s, d) { return s + d.u.length; }, 0);
  var multi = DS.filter(function (d) { return d.u.length >= 2; }).length;
  [["Reused datasets", DS.length], ["Dataset uses", nUses], ["Papers reusing data", Object.keys(P).length], ["Reused by 2+ papers", multi]]
    .forEach(function (t) {
      var w = el("div", "tile");
      w.appendChild(el("dt", "", t[0]));
      w.appendChild(el("dd", "", t[1].toLocaleString("en")));
      $("tiles").appendChild(w);
    });

  // ---- Filter options ----
  function uniq(fn) {
    var seen = {};
    Object.keys(P).forEach(function (k) { seen[fn(P[k])] = (seen[fn(P[k])] || 0) + 1; });
    return Object.keys(seen);
  }
  function fill(sel, values) {
    values.forEach(function (v) { var o = el("option", "", v); o.value = v; sel.appendChild(o); });
  }
  var venueOrder = ["ASE", "FSE", "ICSE", "ICSME", "MSR", "SANER", "EMSE", "JSS", "TOSEM", "TSE"];
  fill($("f-topic"), uniq(function (p) { return p.k; }).sort());
  fill($("f-venue"), venueOrder.filter(function (v) { return uniq(function (p) { return p.v; }).indexOf(v) >= 0; }));
  fill($("f-pyear"), uniq(function (p) { return String(p.y); }).sort());
  fill($("f-src"), ["Existing dataset", "Hybrid"].filter(function (v) { return uniq(function (p) { return p.s; }).indexOf(v) >= 0; }));

  // ---- Filtering ----
  function useOk(u) {
    var p = P[u[0]];
    return (!state.topic || p.k === state.topic) &&
      (!state.venue || p.v === state.venue) &&
      (!state.pyear || String(p.y) === state.pyear) &&
      (!state.src || p.s === state.src);
  }
  function terms() { return state.q.toLowerCase().split(/\s+/).filter(Boolean); }
  function matches(withPeriod) {
    var tq = terms();
    var per = PERIODS.filter(function (p) { return p.k === state.period; })[0];
    var out = [];
    DS.forEach(function (d) {
      if (tq.length && !tq.every(function (t) { return d.s.indexOf(t) >= 0; })) return;
      if (withPeriod && per && !per.t(d.y)) return;
      var us = d.u.filter(useOk);
      if (us.length < state.min) return;
      out.push({ d: d, us: us });
    });
    return out;
  }
  function sorter(a, b) {
    var ya = a.d.y === null ? 0 : a.d.y, yb = b.d.y === null ? 0 : b.d.y;
    switch (state.sort) {
      case "name": return a.d.n.localeCompare(b.d.n, "en", { sensitivity: "base" });
      case "new": return (yb - ya) || (b.us.length - a.us.length);
      case "old": return ((a.d.y === null ? 9999 : ya) - (b.d.y === null ? 9999 : yb)) || (b.us.length - a.us.length);
      default: return (b.us.length - a.us.length) || ((yb - ya)) || a.d.n.localeCompare(b.d.n);
    }
  }

  // ---- Highlight ----
  function highlight(text, parent) {
    var tq = terms();
    if (!tq.length) { parent.appendChild(document.createTextNode(text)); return; }
    var re = new RegExp("(" + tq.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", "ig");
    var last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      parent.appendChild(el("mark", "", m[0]));
      last = re.lastIndex;
      if (m[0].length === 0) re.lastIndex++;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }
  function linkify(text, parent) {
    var re = /(https?:\/\/[^\s,;)"”]+[^\s,;)"”.])/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = el("a", "", m[1]); a.href = m[1]; a.rel = "noopener"; a.target = "_blank";
      parent.appendChild(a);
      last = re.lastIndex;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  // ---- Year chart ----
  function drawYears() {
    var rows = matches(false);
    var counts = PERIODS.map(function (p) { return rows.filter(function (r) { return p.t(r.d.y); }).length; });
    var max = Math.max.apply(null, counts.concat([1]));
    var box = $("years");
    box.style.setProperty("--n", PERIODS.length);
    box.textContent = "";
    PERIODS.forEach(function (p, i) {
      var b = el("button", "ybar");
      b.type = "button";
      b.setAttribute("aria-pressed", state.period === p.k ? "true" : "false");
      b.setAttribute("aria-label", p.lab + ": " + counts[i] + " datasets");
      b.title = p.lab + ": " + counts[i] + " datasets";
      b.appendChild(el("span", "cnt", String(counts[i])));
      var f = el("span", "fill"); f.style.height = (counts[i] / max * 78) + "%";
      b.appendChild(f);
      b.appendChild(el("span", "lab", p.lab));
      b.onclick = function () { state.period = state.period === p.k ? "" : p.k; state.shown = PAGE; render(); };
      box.appendChild(b);
    });
  }

  // ---- Table ----
  function topicChips(us) {
    var c = {};
    us.forEach(function (u) { var k = P[u[0]].k; c[k] = (c[k] || 0) + 1; });
    var w = el("div", "chips");
    Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).forEach(function (k) {
      w.appendChild(el("span", "chip", k.replace(/^Software /, "").replace(/^./, function (s) { return s.toUpperCase(); }) + (c[k] > 1 ? " · " + c[k] : "")));
    });
    return w;
  }
  function detail(r) {
    var d = r.d, td = el("td");
    td.colSpan = 4;
    if (d.al.length) { td.appendChild(el("h3", "", "Also called")); var p = el("p"); highlight(d.al.join("; "), p); td.appendChild(p); }
    if (d.a) { td.appendChild(el("h3", "", "First author")); td.appendChild(el("p", "", d.a)); }
    td.appendChild(el("h3", "", "Reference as cited"));
    var rp = el("p", "ref");
    if (d.r) linkify(d.r, rp); else rp.textContent = "Not stated in the reusing paper.";
    td.appendChild(rp);
    var filtered = r.us.length !== d.u.length;
    td.appendChild(el("h3", "", "Reusing papers" + (filtered ? " (" + r.us.length + " of " + d.u.length + " match the filters)" : " (" + d.u.length + ")")));
    var ul = el("ul", "papers");
    r.us.slice().sort(function (a, b) { return P[b[0]].y - P[a[0]].y; }).forEach(function (u) {
      var p = P[u[0]], li = el("li");
      var a = el("a", "", p.t); a.href = "https://doi.org/" + p.d; a.target = "_blank"; a.rel = "noopener";
      li.appendChild(a);
      if (u[1]) { var o = el("span", "own", "Own dataset"); o.title = "The paper's first author is also the dataset's first author"; li.appendChild(o); }
      li.appendChild(el("div", "meta", p.v + " " + p.y + " · " + p.s + " · " + p.k));
      ul.appendChild(li);
    });
    td.appendChild(ul);
    var tr = el("tr", "detail"); tr.appendChild(td);
    return tr;
  }
  function render() {
    drawYears();
    var rows = matches(true).sort(sorter);
    var body = $("rows");
    body.textContent = "";
    var nPapers = {};
    rows.forEach(function (r) { r.us.forEach(function (u) { nPapers[u[0]] = 1; }); });
    var filtered = state.q || state.topic || state.venue || state.pyear || state.src || state.min > 1 || state.period;
    $("status").textContent = filtered
      ? rows.length + " of " + DS.length + " datasets match, reused by " + Object.keys(nPapers).length + " papers."
      : DS.length + " datasets.";
    if (!rows.length) {
      var tr = el("tr"), td = el("td", "empty", "No datasets match these filters.");
      td.colSpan = 4; tr.appendChild(td); body.appendChild(tr);
    }
    rows.slice(0, state.shown).forEach(function (r) {
      var d = r.d, tr = el("tr", "row");
      tr.tabIndex = 0;
      tr.setAttribute("aria-expanded", state.open[d.i] ? "true" : "false");
      var c1 = el("td"); c1.appendChild(el("span", "caret", "›")); highlight(d.n, c1);
      var c2 = el("td", "num", d.y === null ? "–" : String(d.y));
      var c3 = el("td", "num", r.us.length === d.u.length ? String(d.u.length) : r.us.length + " / " + d.u.length);
      var c4 = el("td", "hide-sm"); c4.appendChild(topicChips(r.us));
      [c1, c2, c3, c4].forEach(function (c) { tr.appendChild(c); });
      var toggle = function () { state.open[d.i] = !state.open[d.i]; render(); };
      tr.onclick = function (e) { if (!e.target.closest("a")) toggle(); };
      tr.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } };
      body.appendChild(tr);
      if (state.open[d.i]) body.appendChild(detail(r));
    });
    var more = $("more");
    more.hidden = rows.length <= state.shown;
    if (!more.hidden) more.textContent = "Show " + Math.min(PAGE, rows.length - state.shown) + " more (" + (rows.length - state.shown) + " remaining)";
    if (rows.length && rows.length > Math.min(state.shown, rows.length)) $("status").textContent += " Showing the first " + state.shown + ".";
    saveHash();
  }

  // ---- URL state (shareable filters) ----
  var KEYS = ["q", "topic", "venue", "pyear", "src", "min", "sort", "period"];
  function saveHash() {
    var parts = [];
    KEYS.forEach(function (k) {
      var v = state[k];
      if (v && !(k === "min" && v === 1) && !(k === "sort" && v === "papers")) parts.push(k + "=" + encodeURIComponent(v));
    });
    var h = parts.length ? "#" + parts.join("&") : "";
    if (location.hash !== h) history.replaceState(null, "", h || location.pathname + location.search);
  }
  function loadHash() {
    location.hash.replace(/^#/, "").split("&").forEach(function (kv) {
      var i = kv.indexOf("="); if (i < 0) return;
      var k = kv.slice(0, i), v = decodeURIComponent(kv.slice(i + 1));
      if (KEYS.indexOf(k) >= 0) state[k] = k === "min" ? (parseInt(v, 10) || 1) : v;
    });
    $("q").value = state.q; $("f-topic").value = state.topic; $("f-venue").value = state.venue;
    $("f-pyear").value = state.pyear; $("f-src").value = state.src; $("f-min").value = String(state.min); $("sort").value = state.sort;
  }

  // ---- Wiring ----
  var tmr;
  $("q").addEventListener("input", function () {
    clearTimeout(tmr);
    tmr = setTimeout(function () { state.q = $("q").value.trim(); state.shown = PAGE; render(); }, 120);
  });
  [["f-topic", "topic"], ["f-venue", "venue"], ["f-pyear", "pyear"], ["f-src", "src"], ["sort", "sort"]].forEach(function (p) {
    $(p[0]).addEventListener("change", function () { state[p[1]] = this.value; state.shown = PAGE; render(); });
  });
  $("f-min").addEventListener("change", function () { state.min = parseInt(this.value, 10); state.shown = PAGE; render(); });
  $("more").addEventListener("click", function () { state.shown += PAGE; render(); });
  $("f-page").addEventListener("change", function () {
    PAGE = this.value === "all" ? Infinity : parseInt(this.value, 10);
    state.shown = PAGE; render();
  });

  // ---- Zenodo link ----
  var zen = (window.SITE && window.SITE.zenodoUrl) || "";
  document.querySelectorAll(".zenodo-link").forEach(function (a) {
    if (zen && zen.indexOf("XXXXXXX") < 0) { a.href = zen; }
    else { a.removeAttribute("href"); a.setAttribute("aria-disabled", "true"); a.title = "The Zenodo link will be added when the record is published"; }
  });

  // ---- Theme toggle ----
  var themeBtn = $("theme");
  function currentTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function labelTheme() {
    var next = currentTheme() === "dark" ? "light" : "dark";
    themeBtn.textContent = next === "dark" ? "\u263E Dark theme" : "\u2600 Light theme";
    themeBtn.setAttribute("aria-label", "Switch to " + next + " theme");
  }
  themeBtn.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    labelTheme();
  });
  if (window.matchMedia) { try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", labelTheme); } catch (e) {} }
  labelTheme();
  $("reset").addEventListener("click", function () {
    state = { q: "", topic: "", venue: "", pyear: "", src: "", min: 1, sort: "papers", period: "", shown: PAGE, open: {} };
    $("q").value = ""; ["f-topic", "f-venue", "f-pyear", "f-src"].forEach(function (id) { $(id).value = ""; });
    $("f-min").value = "1"; $("sort").value = "papers"; $("f-page").value = "50"; PAGE = 50; state.shown = PAGE; render();
  });

  window.addEventListener("hashchange", function () { state.shown = PAGE; loadHash(); render(); });
  loadHash();
  render();
})();
