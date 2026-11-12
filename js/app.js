/* Polyanskaya_Photo — запуск, маршрутизация (#/home, #/sessions …), шапка, нижняя навигация, PWA. */
window.PP = window.PP || {};
PP.app = (function () {
  const U = PP.U, S = PP.store, UI = PP.UI, ic = UI.icon;
  const TABS = [["home", "Главная", "home"], ["sessions", "Съёмки", "camera"], ["calendar", "Календарь", "cal"], null, ["requests", "Заявки", "inbox"], ["stats", "Статистика", "chart"], ["clients", "Клиенты", "users"]];
  const ROUTE_TAB = { home: "home", sessions: "sessions", calendar: "calendar", requests: "requests", stats: "stats", clients: "clients", client: "clients" };
  let last = { route: "", day: U.today() };

  function parse() {
    const h = (location.hash || "").replace(/^#\/?/, "").split("/");
    return { name: h[0] || "home", param: h[1] ? decodeURIComponent(h[1]) : "" };
  }

  function renderTabbar(active) {
    const nReq = S.newRequests().length;
    document.getElementById("tabbar").innerHTML = '<div class="in">' + TABS.map((t) => t === null
      ? '<button class="fab" data-new aria-label="Добавить фотосессию">' + ic("plus") + "</button>"
      : '<a class="tab" href="#/' + t[0] + '"' + (ROUTE_TAB[active] === t[0] ? ' aria-current="page"' : "") + ">" + ic(t[2]) + "<span>" + t[1] + "</span>" + (t[0] === "requests" && nReq ? '<b class="dot" aria-label="Новых заявок: ' + nReq + '">' + nReq + "</b>" : "") + "</a>").join("") + "</div>";
  }

  function render() {
    const { name, param } = parse();
    const r = name === "client" ? PP.views.client(param) : (PP.views.routes[name] || PP.views.routes.home)();
    const known = name === "client" || PP.views.routes[name], key = name + "/" + param;
    const y = last.route === key ? window.scrollY : 0;
    const top = document.getElementById("top");
    const gear = name === "settings" ? "" : '<a class="iconbtn" href="#/settings" aria-label="Настройки">' + ic("gear") + "</a>";
    top.innerHTML = (r.brand ? '<div class="brand">' + UI.logo(28) + "<b>Polyanskaya_Photo</b></div>" : "<h1>" + U.esc(r.title || "Polyanskaya_Photo") + "</h1>") + (r.right || "") + gear;
    const v = document.getElementById("view");
    v.innerHTML = r.html;
    renderTabbar(known ? name : "home");
    window.scrollTo(0, y);
    last.route = key;
  }

  function init() {
    S.init();
    PP.views.bind(); PP.charts.bind(document.getElementById("view"));
    S.on(render);
    window.addEventListener("hashchange", () => { render(); });
    document.getElementById("tabbar").addEventListener("click", (e) => { if (e.target.closest("[data-new]")) PP.forms.session(); });
    render();
    pull(true);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      if (last.day !== U.today()) { last.day = U.today(); render(); }
      pull(false);
      if (window.__sw) window.__sw.update().catch(() => {});
    });
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register("service-worker.js").then((reg) => { window.__sw = reg; }).catch(() => {});
    }
  }
  async function pull(first) {
    const lt = PP.sync.localTest(); if (lt) UI.toast("Тестовая заявка получена");
    if (!PP.sync.configured()) return;
    const r = await PP.sync.pull();
    if (r.ok && r.added) UI.toast(r.added === 1 ? "Новая заявка на съёмку" : "Новых заявок: " + r.added);
    else if (!r.ok && !first && r.error === "bad-token") UI.toast(PP.sync.MSG["bad-token"]);
  }

  document.addEventListener("DOMContentLoaded", init);
  return { render, init };
})();
