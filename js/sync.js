/* Polyanskaya_Photo — получение онлайн-заявок из Cloudflare Worker.
 * Worker хранит заявки клиентов (страница booking/) и отдаёт их только по секретному ADMIN_TOKEN,
 * который фотограф один раз вводит в Настройках приложения. Токен лежит только в этом браузере. */
window.PP = window.PP || {};
PP.sync = (function () {
  let busy = false;
  const endpoint = () => String((window.PP_CONFIG && PP_CONFIG.BOOKING_ENDPOINT) || "").replace(/\/+$/, "");
  const configured = () => !!endpoint() && !!PP.local.get("adminToken");

  async function call(path, opts) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000);
    try {
      const res = await fetch(endpoint() + path, Object.assign({ signal: ctl.signal, headers: { Authorization: "Bearer " + PP.local.get("adminToken") } }, opts));
      let body = null; try { body = await res.json(); } catch (e) { /* не JSON */ }
      return { status: res.status, body };
    } finally { clearTimeout(t); }
  }

  /* Забрать новые заявки. Возвращает {ok, added, error?} */
  async function pull() {
    if (!endpoint()) return { ok: false, error: "no-endpoint" };
    if (!PP.local.get("adminToken")) return { ok: false, error: "no-token" };
    if (busy) return { ok: false, error: "busy" };
    busy = true;
    try {
      const r = await call("/bookings");
      if (r.status === 401 || r.status === 403) return { ok: false, error: "bad-token" };
      if (r.status !== 200 || !r.body || !Array.isArray(r.body.bookings)) return { ok: false, error: "server" };
      return { ok: true, added: PP.store.importRequests(r.body.bookings), total: r.body.bookings.length };
    } catch (e) { return { ok: false, error: "network" }; } finally { busy = false; }
  }
  /* Проверка соединения (кнопка в настройках) */
  async function check() {
    if (!endpoint()) return { ok: false, error: "no-endpoint" };
    try {
      const h = await fetch(endpoint() + "/health"); if (!h.ok) return { ok: false, error: "server" };
      if (!PP.local.get("adminToken")) return { ok: true, authed: false };
      const r = await call("/bookings");
      return { ok: true, authed: r.status === 200, error: r.status === 200 ? "" : "bad-token" };
    } catch (e) { return { ok: false, error: "network" }; }
  }
  /* Заявки из тестового режима страницы записи (booking/?test=1) лежат в localStorage этого же сайта */
  function localTest() {
    try {
      const raw = localStorage.getItem("pp.testRequests"); if (!raw) return 0;
      const n = PP.store.importRequests(JSON.parse(raw)); localStorage.removeItem("pp.testRequests"); return n;
    } catch (e) { return 0; }
  }
  const MSG = { "no-endpoint": "Онлайн-запись не подключена: впишите адрес Worker в config.js.", "no-token": "Введите ключ доступа в Настройках.", "bad-token": "Ключ доступа не подходит. Проверьте ADMIN_TOKEN.", network: "Нет связи с сервером заявок.", server: "Сервер заявок ответил ошибкой." , busy: ""};
  return { pull, check, localTest, configured, endpoint, MSG };
})();
