/* Polyanskaya_Photo — интерфейсные примитивы: иконки, шторки, подтверждения, toast. */
window.PP = window.PP || {};
PP.UI = (function () {
  const P = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13.5" r="3.6"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.7a3.5 3.5 0 010 6.6M18.5 14.8c1.7.7 2.8 2.3 3 4.7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    inbox: '<path d="M3 13l3-8h12l3 8v6a1 1 0 01-1 1H4a1 1 0 01-1-1z"/><path d="M3 13h5l1 2.5h6l1-2.5h5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
    send: '<path d="M21 3L3 10.5l6.5 2.5L12 20l3-5.5z"/><path d="M9.5 13L21 3"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', coin: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.8-2.5 1.9 0 2.7 5.2 1.3 5.2 4 0 1.1-1.1 2-2.7 2-1.2 0-2.2-.5-2.7-1.4M12 6.3V8m0 8v1.7"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    down: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', up: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>',
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    share: '<path d="M12 15V3M8 7l4-4 4 4M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
    insta: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.8" cy="7.2" r=".6"/>',
    note: '<path d="M6 3h9l4 4v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M9 12h6M9 16h4"/>'
  };
  const icon = (n, cls) => '<svg class="i ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || "") + "</svg>";
  const logo = (sz) => '<svg width="' + (sz || 26) + '" height="' + (sz || 26) + '" viewBox="0 0 32 32" aria-hidden="true"><defs><radialGradient id="lg" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#A8324F"/><stop offset=".7" stop-color="#800020"/><stop offset="1" stop-color="#5C0016"/></radialGradient></defs><circle cx="16" cy="16" r="14" fill="none" stroke="#800020" stroke-width="2.4"/><circle cx="16" cy="16" r="10" fill="url(#lg)"/><circle cx="16" cy="16" r="3.6" fill="#0F0F10"/><ellipse cx="11.6" cy="11.4" rx="3.2" ry="1.7" fill="#fff" opacity=".3" transform="rotate(-30 11.6 11.4)"/></svg>';

  const $layer = () => document.getElementById("layer");
  const stack = [];

  /* Шторка снизу. opts: {title, body, footer, onOpen, onClose} → {el, close} */
  function sheet(o) {
    const layer = $layer();
    const scrim = document.createElement("div"); scrim.className = "scrim";
    const el = document.createElement("div"); el.className = "sheet"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", o.title || "");
    el.innerHTML = '<div class="grab"></div><div class="hd"><h3>' + PP.U.esc(o.title || "") + '</h3><button class="iconbtn" data-close aria-label="Закрыть">' + icon("x") + '</button></div><div class="bd">' + (o.body || "") + "</div>" + (o.footer ? '<div class="ft">' + o.footer + "</div>" : "");
    layer.append(scrim, el); layer.style.pointerEvents = "auto";
    const h = { el, closed: false, close(res) {
      if (h.closed) return; h.closed = true; stack.splice(stack.indexOf(h), 1);
      scrim.classList.remove("in"); el.classList.remove("in");
      setTimeout(() => { scrim.remove(); el.remove(); if (!layer.children.length) layer.style.pointerEvents = "none"; }, 280);
      if (o.onClose) o.onClose(res);
    } };
    scrim.addEventListener("click", () => h.close());
    el.querySelector("[data-close]").addEventListener("click", () => h.close());
    stack.push(h);
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add("in"); el.classList.add("in"); }));
    if (o.onOpen) o.onOpen(h);
    return h;
  }
  const closeTop = () => { const t = stack[stack.length - 1]; if (t) { t.close(); return true; } return false; };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeTop(); });

  /* Подтверждение. Возвращает Promise<boolean> */
  function confirm(o) {
    return new Promise((resolve) => {
      const layer = $layer(), scrim = document.createElement("div"); scrim.className = "scrim";
      const el = document.createElement("div"); el.className = "dlg"; el.setAttribute("role", "alertdialog"); el.setAttribute("aria-modal", "true");
      el.innerHTML = "<h3>" + PP.U.esc(o.title) + "</h3>" + (o.text ? "<p>" + PP.U.esc(o.text) + "</p>" : "") + '<div class="btns"><button class="btn ghost" data-v="0">' + PP.U.esc(o.cancel || "Отмена") + '</button><button class="btn' + (o.danger ? " danger" : "") + '" data-v="1">' + PP.U.esc(o.ok || "Да") + "</button></div>";
      layer.append(scrim, el); layer.style.pointerEvents = "auto";
      const done = (v) => { scrim.classList.remove("in"); el.classList.remove("in"); setTimeout(() => { scrim.remove(); el.remove(); if (!layer.children.length) layer.style.pointerEvents = "none"; }, 220); resolve(v); };
      el.addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (b) done(b.dataset.v === "1"); });
      scrim.addEventListener("click", () => done(false));
      requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add("in"); el.classList.add("in"); }));
    });
  }

  /* Toast. opts: {action:"Отменить", onAction:fn, ms} */
  function toast(msg, o) {
    o = o || {};
    const box = document.getElementById("toasts"), el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status");
    el.innerHTML = "<span>" + PP.U.esc(msg) + "</span>" + (o.action ? '<button type="button">' + PP.U.esc(o.action) + "</button>" : "");
    box.appendChild(el);
    const kill = () => { el.classList.add("out"); setTimeout(() => el.remove(), 200); };
    if (o.action) el.querySelector("button").addEventListener("click", () => { if (o.onAction) o.onAction(); kill(); });
    setTimeout(kill, o.ms || (o.action ? 6000 : 2800));
  }

  return { icon, logo, sheet, closeTop, confirm, toast };
})();
