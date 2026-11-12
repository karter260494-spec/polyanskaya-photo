/* Polyanskaya_Photo — графики на чистом SVG (без библиотек).
 * Столбцы: тап по столбцу показывает точное значение над графиком. Донат: легенда с числами и процентами. */
window.PP = window.PP || {};
PP.charts = (function () {
  const U = PP.U, esc = U.esc;
  const CAT = ["#D4607F", "#5B9BE0", "#E3AE45", "#4FB286", "#9B7BD6", "#E08A5B", "#C7CF5A", "#A9A9AF"];

  const compact = (v) => (v >= 1e6 ? (Math.round(v / 1e5) / 10).toString().replace(".", ",") + " млн" : v >= 1e4 ? Math.round(v / 1e3) + "к" : v >= 1e3 ? (Math.round(v / 100) / 10).toString().replace(".", ",") + "к" : String(Math.round(v * 10) / 10).replace(".", ","));
  function niceMax(v) {
    if (v <= 0) return 4;
    const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 4 ? 4 : f <= 5 ? 5 : 10) * p;
  }
  const fmtVal = (metric, v) => (metric === "income" ? U.money(v) : metric === "hours" ? U.hours(v * 60) : U.num(v) + " " + plural(v, ["съёмка", "съёмки", "съёмок"]));
  function plural(n, f) { n = Math.abs(n) % 100; const m = n % 10; return n > 10 && n < 20 ? f[2] : m > 1 && m < 5 ? f[1] : m === 1 ? f[0] : f[2]; }

  /* items: buckets [{label,title,value,...}] */
  function bars(items, metric, totalText) {
    const W = 340, H = 190, L = 38, R = 334, T = 10, B = 162;
    const max = niceMax(Math.max.apply(null, items.map((b) => b.value).concat([0])));
    const slot = (R - L) / Math.max(items.length, 1), bw = Math.min(30, Math.max(3, slot * 0.64));
    const y = (v) => B - (v / max) * (B - T);
    let g = "", s = "";
    [0, 0.5, 1].forEach((t) => { const yy = y(max * t); g += '<line x1="' + L + '" x2="' + R + '" y1="' + yy + '" y2="' + yy + '"/>'; s += '<text x="' + (L - 6) + '" y="' + (yy + 3.5) + '" text-anchor="end">' + compact(max * t) + "</text>"; });
    const step = Math.ceil(items.length / 9);
    items.forEach((b, i) => {
      const x = L + slot * i + (slot - bw) / 2, h = Math.max(b.value > 0 ? 2 : 0, (b.value / max) * (B - T)), r = Math.min(4, bw / 2, h);
      const read = esc(b.title) + ": <b>" + esc(fmtVal(metric, b.value)) + "</b>";
      if (h > 0) s += '<path class="bar" data-i="' + i + '" d="M' + x + " " + B + "V" + (B - h + r) + "Q" + x + " " + (B - h) + " " + (x + r) + " " + (B - h) + "H" + (x + bw - r) + "Q" + (x + bw) + " " + (B - h) + " " + (x + bw) + " " + (B - h + r) + "V" + B + 'Z"/>';
      s += '<rect class="hit" data-read="' + read + '" data-i="' + i + '" x="' + (L + slot * i) + '" y="' + T + '" width="' + slot + '" height="' + (B - T + 22) + '"/>';
      if (i % step === 0) s += '<text x="' + (x + bw / 2) + '" y="' + (B + 15) + '" text-anchor="middle">' + esc(b.label) + "</text>";
    });
    const aria = "График: " + items.map((b) => b.title + " — " + fmtVal(metric, b.value)).join("; ");
    return '<div class="chart" data-total="' + esc(totalText || "") + '"><div class="read">' + (totalText || "&nbsp;") + '</div><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(aria.slice(0, 600)) + '"><g class="grid">' + g + '</g><line class="ax" x1="' + L + '" x2="' + R + '" y1="' + B + '" y2="' + B + '"/>' + s + "</svg></div>";
  }

  /* делегирование: один раз на корневой элемент экрана */
  function bind(root) {
    root.addEventListener("click", (e) => {
      const hit = e.target.closest(".chart .hit"); if (!hit) return;
      const ch = hit.closest(".chart"), already = hit.classList.contains("sel-hit");
      ch.querySelectorAll(".sel").forEach((n) => n.classList.remove("sel")); ch.querySelectorAll(".sel-hit").forEach((n) => n.classList.remove("sel-hit"));
      const rd = ch.querySelector(".read");
      if (already) { rd.innerHTML = ch.dataset.total || "&nbsp;"; return; }
      hit.classList.add("sel-hit"); const bar = ch.querySelector('.bar[data-i="' + hit.dataset.i + '"]'); if (bar) bar.classList.add("sel");
      rd.innerHTML = hit.dataset.read;
    });
  }

  /* items: [{id,name,emoji,count,income}] */
  function donut(items) {
    const total = items.reduce((a, b) => a + b.count, 0); if (!total) return "";
    const types = PP.store.db.types, R = 42, C = 2 * Math.PI * R;
    const col = (id) => { const i = types.findIndex((t) => t.id === id); return CAT[i < 0 || i > 6 ? 7 : i]; };
    let off = 0, seg = "", leg = "";
    items.forEach((it) => {
      const len = (it.count / total) * C, gap = items.length > 1 ? 2 : 0, c = col(it.id);
      seg += '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="' + c + '" stroke-width="16" stroke-dasharray="' + Math.max(len - gap, 0.5) + " " + C + '" stroke-dashoffset="' + -off + '" transform="rotate(-90 60 60)"/>';
      off += len;
      leg += '<li style="--c:' + c + '"><i></i><span>' + esc(it.emoji + " " + it.name) + "</span><b>" + it.count + "</b><em>" + Math.round((it.count / total) * 100) + "%</em></li>";
    });
    return '<div class="donut"><svg viewBox="0 0 120 120" role="img" aria-label="Виды съёмок: ' + esc(items.map((i) => i.name + " " + i.count).join(", ")) + '">' + seg + '<text class="mid" x="60" y="62" text-anchor="middle">' + total + '</text><text class="mid2" x="60" y="76" text-anchor="middle">' + plural(total, ["съёмка", "съёмки", "съёмок"]) + "</text></svg><ul>" + leg + "</ul></div>";
  }
  return { bars, bind, donut, plural, compact, CAT };
})();
