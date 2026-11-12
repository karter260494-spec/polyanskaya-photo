/* Polyanskaya_Photo — хранилище данных, расчёты, демо-данные, экспорт/импорт.
 *
 * АРХИТЕКТУРА ПОД БУДУЩИЙ БЭКЕНД: всё приложение читает и пишет данные только через PP.store,
 * а PP.store — только через PP.storageAdapter. Сейчас адаптер пишет в localStorage.
 * Чтобы подключить Supabase/Firebase, замените PP.storageAdapter объектом с теми же методами
 * (load / save / saveBackup) — остальной код менять не нужно. См. README, раздел «Облачная база».
 */
window.PP = window.PP || {};

/* ---------- адаптер хранилища (localStorage) ---------- */
PP.storageAdapter = {
  KEY: "polyanskayaPhoto.v1",
  load() {
    for (const k of [this.KEY, this.KEY + ".bak"]) {
      try { const raw = localStorage.getItem(k); if (raw) return JSON.parse(raw); } catch (e) { /* пробуем резервную копию */ }
    }
    return null;
  },
  save(db) {
    const raw = JSON.stringify(db);
    try {
      const prev = localStorage.getItem(this.KEY);
      if (prev) localStorage.setItem(this.KEY + ".bak", prev);   // предыдущая версия — как страховка
      localStorage.setItem(this.KEY, raw);
      return true;
    } catch (e) { return false; }
  }
};

/* Локальные настройки устройства (не попадают в экспорт): токен для чтения заявок из Worker */
PP.local = {
  KEY: "polyanskayaPhoto.local",
  get(k) { try { return (JSON.parse(localStorage.getItem(this.KEY)) || {})[k] || ""; } catch (e) { return ""; } },
  set(k, v) { try { const o = JSON.parse(localStorage.getItem(this.KEY)) || {}; o[k] = v; localStorage.setItem(this.KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } }
};

/* ---------- хранилище ---------- */
PP.store = (function () {
  const U = PP.U;
  const DEFAULT_TYPES = [
    { id: "love", emoji: "❤️", name: "Love Story" },
    { id: "family", emoji: "👨‍👩‍👧", name: "Семейная" },
    { id: "portrait", emoji: "👤", name: "Портретная" },
    { id: "solo", emoji: "🧍", name: "Индивидуальная" },
    { id: "wedding", emoji: "💍", name: "Свадебная" },
    { id: "kids", emoji: "👶", name: "Детская" },
    { id: "commercial", emoji: "🏢", name: "Коммерческая" },
    { id: "event", emoji: "🎉", name: "Мероприятие" },
    { id: "other", emoji: "📸", name: "Другое" }
  ];
  const listeners = [];
  let db = null;
  let saveFailed = false;

  const blank = () => ({
    v: 1, types: DEFAULT_TYPES.map((t) => ({ ...t })), clients: [], sessions: [], requests: [],
    settings: { currency: "₽", lastBackup: "", demoSeeded: false, installHintHidden: false }, syncedIds: []
  });

  function normalize(x) {
    const b = blank();
    x = x && typeof x === "object" ? x : {};
    const arr = (a) => (Array.isArray(a) ? a.filter((i) => i && typeof i === "object") : []);
    const out = {
      v: 1,
      types: arr(x.types).length ? arr(x.types).map((t) => ({ id: String(t.id || U.uid()), emoji: t.emoji || "📸", name: String(t.name || "Без названия"), custom: !!t.custom })) : b.types,
      clients: arr(x.clients).map((c) => ({ id: String(c.id || U.uid()), name: String(c.name || ""), phone: c.phone || "", telegram: c.telegram || "", instagram: c.instagram || "", notes: c.notes || "", created: c.created || U.today(), demo: !!c.demo })),
      sessions: arr(x.sessions).map((s) => ({
        id: String(s.id || U.uid()), date: /^\d{4}-\d\d-\d\d$/.test(s.date) ? s.date : U.today(), time: s.time || "", title: s.title || "",
        clientId: s.clientId || null, clientName: s.clientName || "", typeId: s.typeId || "other", duration: Math.max(0, U.toNum(s.duration)) || 60,
        price: Math.max(0, U.toNum(s.price)), received: Math.max(0, U.toNum(s.received)), pay: ["paid", "partial", "unpaid"].includes(s.pay) ? s.pay : "unpaid",
        status: ["planned", "done", "cancelled"].includes(s.status) ? s.status : "planned", location: s.location || "", comment: s.comment || "", demo: !!s.demo
      })),
      requests: arr(x.requests).map((r) => ({
        id: String(r.id || U.uid()), name: r.name || "", phone: r.phone || "", typeName: r.typeName || "", date: r.date || "", time: r.time || "",
        location: r.location || "", comment: r.comment || "", created: r.created || new Date().toISOString(),
        status: ["new", "confirmed", "cancelled"].includes(r.status) ? r.status : "new", sessionId: r.sessionId || null, source: r.source || "manual", demo: !!r.demo
      })),
      settings: { ...b.settings, ...(x.settings && typeof x.settings === "object" ? x.settings : {}) },
      syncedIds: Array.isArray(x.syncedIds) ? x.syncedIds.map(String).slice(-500) : []
    };
    return out;
  }

  function init() {
    db = normalize(PP.storageAdapter.load() || blank());
    if (!db.settings.demoSeeded && !db.sessions.length && !db.clients.length) { seedDemo(); }
    db.settings.demoSeeded = true;
    commit(true);
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
    return db;
  }
  function commit(silent) {
    saveFailed = !PP.storageAdapter.save(db);
    if (saveFailed && PP.UI) PP.UI.toast("Не удалось сохранить данные. Освободите место или выключите приватный режим.");
    if (!silent) listeners.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
  }
  const on = (f) => listeners.push(f);

  /* ---------- справочники ---------- */
  const typeById = (id) => db.types.find((t) => t.id === id) || db.types.find((t) => t.id === "other") || { id: "other", emoji: "📸", name: "Другое" };
  const typeByName = (n) => db.types.find((t) => t.name.toLowerCase() === String(n || "").trim().toLowerCase());
  const client = (id) => db.clients.find((c) => c.id === id) || null;
  const clientByName = (n) => { n = String(n || "").trim().toLowerCase(); return n ? db.clients.find((c) => c.name.trim().toLowerCase() === n) || null : null; };
  const session = (id) => db.sessions.find((s) => s.id === id) || null;
  const request = (id) => db.requests.find((r) => r.id === id) || null;
  const clientName = (s) => { const c = s.clientId && client(s.clientId); return c ? c.name : s.clientName || ""; };

  function addType(name, emoji) {
    name = String(name || "").trim(); if (!name) return null;
    const ex = typeByName(name); if (ex) return ex;
    const t = { id: "c" + U.uid(), emoji: emoji || "📸", name, custom: true };
    db.types.push(t); commit(); return t;
  }
  function removeType(id) {
    const t = db.types.find((x) => x.id === id); if (!t || !t.custom) return;
    db.types = db.types.filter((x) => x.id !== id);
    db.sessions.forEach((s) => { if (s.typeId === id) s.typeId = "other"; });
    commit();
  }

  /* ---------- клиенты ---------- */
  function saveClient(d, id) {
    let c = id && client(id);
    if (!c) { c = { id: U.uid(), created: U.today(), demo: false }; db.clients.push(c); }
    const oldName = c.name;
    Object.assign(c, { name: String(d.name || "").trim(), phone: (d.phone || "").trim(), telegram: (d.telegram || "").trim(), instagram: (d.instagram || "").trim(), notes: d.notes || "" });
    c.demo = false;
    if (oldName !== c.name) db.sessions.forEach((s) => { if (s.clientId === c.id) s.clientName = c.name; });
    commit(); return c;
  }
  function removeClient(id) {
    const c = client(id); if (!c) return null;
    const keep = db.sessions.filter((s) => s.clientId === id).map((s) => s.id);
    db.sessions.forEach((s) => { if (s.clientId === id) { s.clientName = c.name; s.clientId = null; } });
    db.clients = db.clients.filter((x) => x.id !== id);
    commit(); return { client: c, sessionIds: keep };
  }
  function restoreClient(snap) {
    if (!snap) return;
    db.clients.push(snap.client);
    snap.sessionIds.forEach((sid) => { const s = session(sid); if (s) s.clientId = snap.client.id; });
    commit();
  }

  /* ---------- съёмки ---------- */
  function saveSession(d, id) {
    let s = id && session(id);
    const isNew = !s;
    if (!s) { s = { id: U.uid(), status: "planned", demo: false }; db.sessions.push(s); }
    const name = String(d.clientName || "").trim();
    let c = null;
    if (name) {
      c = (d.clientId && client(d.clientId) && client(d.clientId).name.toLowerCase() === name.toLowerCase() ? client(d.clientId) : null) || clientByName(name);
      if (!c) { c = { id: U.uid(), name, phone: "", telegram: "", instagram: "", notes: "", created: U.today(), demo: false }; db.clients.push(c); }
      ["phone", "telegram", "instagram"].forEach((k) => { if (d[k] != null && String(d[k]).trim()) c[k] = String(d[k]).trim(); });
      c.demo = false;
    }
    const price = Math.max(0, U.toNum(d.price));
    let received = Math.max(0, U.toNum(d.received));
    if (d.pay === "paid") received = price;
    if (d.pay === "unpaid") received = 0;
    if (d.pay === "partial") received = Math.min(received, price);
    Object.assign(s, {
      date: d.date || U.today(), time: d.time || "", title: String(d.title || "").trim(), clientId: c ? c.id : null, clientName: c ? c.name : "",
      typeId: d.typeId || "other", duration: Math.max(1, Math.round(U.toNum(d.duration)) || 60), price, received, pay: d.pay || "unpaid",
      location: String(d.location || "").trim(), comment: String(d.comment || "").trim()
    });
    if (d.status) s.status = d.status;
    s.demo = false;
    commit(); return { session: s, isNew };
  }
  function removeSession(id) {
    const i = db.sessions.findIndex((s) => s.id === id); if (i < 0) return null;
    const [s] = db.sessions.splice(i, 1);
    // заявка, из которой создана съёмка, снова становится «новой»
    const reqs = db.requests.filter((r) => r.sessionId === id).map((r) => ({ id: r.id, status: r.status }));
    db.requests.forEach((r) => { if (r.sessionId === id) { r.sessionId = null; r.status = "new"; } });
    commit(); return { s, i, reqs };
  }
  function restoreSession(snap) {
    if (!snap) return;
    db.sessions.splice(Math.min(snap.i, db.sessions.length), 0, snap.s);
    snap.reqs.forEach((q) => { const r = request(q.id); if (r) { r.status = q.status; r.sessionId = snap.s.id; } });
    commit();
  }
  function setSessionStatus(id, status) { const s = session(id); if (s) { s.status = status; commit(); } }

  /* ---------- заявки ---------- */
  function saveRequest(d, id) {
    let r = id && request(id);
    if (!r) { r = { id: d.id || U.uid(), created: new Date().toISOString(), status: "new", sessionId: null, source: "manual", demo: false }; db.requests.push(r); }
    Object.assign(r, { name: String(d.name || "").trim(), phone: String(d.phone || "").trim(), typeName: String(d.typeName || "").trim(), date: d.date || "", time: d.time || "", location: String(d.location || "").trim(), comment: String(d.comment || "").trim() });
    r.demo = false;
    commit(); return r;
  }
  function patchRequest(id, patch) { const r = request(id); if (r) { Object.assign(r, patch); commit(); } return r; }
  function removeRequest(id) {
    const i = db.requests.findIndex((r) => r.id === id); if (i < 0) return null;
    const [r] = db.requests.splice(i, 1); commit(); return { r, i };
  }
  function restoreRequest(snap) { if (snap) { db.requests.splice(Math.min(snap.i, db.requests.length), 0, snap.r); commit(); } }
  /* Принять заявки, пришедшие из Worker. Уже виденные id пропускаются, даже если заявку удалили локально. */
  function importRequests(list) {
    let added = 0;
    list.forEach((b) => {
      const id = String(b.id || ""); if (!id || db.syncedIds.includes(id) || request(id)) return;
      db.syncedIds.push(id);
      db.requests.push({ id, name: String(b.name || "").slice(0, 120), phone: String(b.phone || "").slice(0, 40), typeName: String(b.type || b.typeName || "").slice(0, 60),
        date: /^\d{4}-\d\d-\d\d$/.test(b.date) ? b.date : "", time: /^\d\d:\d\d$/.test(b.time) ? b.time : "", location: String(b.location || "").slice(0, 160),
        comment: String(b.comment || "").slice(0, 600), created: b.created || new Date().toISOString(), status: "new", sessionId: null, source: "online", demo: false });
      added++;
    });
    if (db.syncedIds.length > 500) db.syncedIds = db.syncedIds.slice(-500);
    if (added) commit();
    return added;
  }
  const newRequests = () => db.requests.filter((r) => r.status === "new");

  /* ---------- демо-данные ---------- */
  function seedDemo() {
    const t = U.today(), D = (n) => U.addDays(t, n);
    const mk = (name, phone, tg) => ({ id: "d" + U.uid(), name, phone, telegram: tg || "", instagram: "", notes: "", created: D(-60), demo: true });
    const cA = mk("Анна Иванова", "+7 900 111-22-33", "anna_iv"), cM = mk("Мария и Дмитрий", "+7 900 222-33-44", ""), cF = mk("Семья Петровых", "+7 900 333-44-55", ""),
      cE = mk("Елена Соколова", "+7 900 444-55-66", "elena_sk"), cO = mk("Ольга Смирнова", "+7 900 555-66-77", "olga_sm");
    db.clients.push(cA, cM, cF, cE, cO);
    const S = (c, typeId, off, time, dur, price, pay, rec, title, loc, status) => db.sessions.push({
      id: "d" + U.uid(), date: D(off), time, title, clientId: c.id, clientName: c.name, typeId, duration: dur, price, received: pay === "paid" ? price : rec, pay,
      status: status || "planned", location: loc, comment: "", demo: true });
    S(cA, "solo", 0, "12:00", 120, 15000, "paid", 0, "Студийный портрет", "Студия на Арбате");
    S(cM, "love", -9, "17:30", 150, 22000, "paid", 0, "Прогулка в парке", "Парк Горького");
    S(cF, "family", -21, "11:00", 90, 12000, "partial", 6000, "Домашняя съёмка", "Дом клиента");
    S(cE, "portrait", -40, "15:00", 60, 8000, "paid", 0, "Портрет для личного бренда", "Студия");
    S(cO, "love", 5, "16:00", 120, 18000, "unpaid", 0, "Закат на набережной", "Набережная");
    db.requests.push({ id: "d" + U.uid(), name: "Иван Кузнецов", phone: "+7 900 777-88-99", typeName: "Семейная", date: D(10), time: "18:00", location: "Центр города", comment: "Это пример заявки. Подтвердите её, чтобы увидеть, как заявка становится съёмкой.", created: new Date().toISOString(), status: "new", sessionId: null, source: "manual", demo: true });
  }
  const hasDemo = () => db.sessions.some((s) => s.demo) || db.clients.some((c) => c.demo) || db.requests.some((r) => r.demo);
  function clearDemo() {
    db.sessions = db.sessions.filter((s) => !s.demo);
    db.requests = db.requests.filter((r) => !r.demo);
    db.clients = db.clients.filter((c) => !c.demo || db.sessions.some((s) => s.clientId === c.id));
    commit();
  }

  /* ---------- экспорт / импорт ---------- */
  function exportJSON() {
    db.settings.lastBackup = new Date().toISOString(); commit(true);
    return JSON.stringify({ app: "Polyanskaya_Photo", version: 1, exported: new Date().toISOString(), data: db }, null, 2);
  }
  function importJSON(text) {
    let o; try { o = JSON.parse(text); } catch (e) { throw new Error("Файл не похож на резервную копию: это не JSON."); }
    const data = o && o.data ? o.data : o;
    if (!data || (!Array.isArray(data.sessions) && !Array.isArray(data.clients))) throw new Error("В файле нет фотосессий или клиентов. Выберите файл, сохранённый кнопкой «Сохранить копию».");
    const prev = db;
    db = normalize(data); db.settings.demoSeeded = true;
    commit(); return { sessions: db.sessions.length, clients: db.clients.length, prev };
  }
  function restoreDb(prev) { if (prev) { db = prev; commit(); } }
  function resetAll() { db = blank(); db.settings.demoSeeded = true; commit(); }

  const PAYL = { paid: "Оплачено", partial: "Частично", unpaid: "Не оплачено" };
  const STL = { planned: "Запланирована", done: "Проведена", cancelled: "Отменена" };
  function sessionsCsv() {
    const rows = [["Дата", "Время", "Название", "Клиент", "Вид съёмки", "Длительность (мин)", "Стоимость", "Получено", "Остаток", "Оплата", "Статус", "Локация", "Телефон", "Telegram", "Instagram", "Комментарий"]];
    db.sessions.slice().sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""))).forEach((s) => {
      const c = s.clientId && client(s.clientId) || {}, rec = PP.calc.received(s), e = PP.calc.eff(s);
      rows.push([U.dmy(s.date), s.time, s.title, clientName(s), typeById(s.typeId).name, s.duration, s.price, rec, e === "cancelled" ? 0 : s.price - rec, PAYL[s.pay], STL[e], s.location, c.phone || "", c.telegram || "", c.instagram || "", s.comment]);
    });
    return U.csv(rows);
  }
  function clientsCsv() {
    const rows = [["Имя", "Телефон", "Telegram", "Instagram", "Фотосессий", "Общий доход", "Последняя съёмка", "Заметки"]];
    db.clients.forEach((c) => { const st = PP.calc.clientStats(c.id); rows.push([c.name, c.phone, c.telegram, c.instagram, st.count, st.income, st.last ? U.dmy(st.last) : "", c.notes]); });
    return U.csv(rows);
  }

  return { get db() { return db; }, init, commit, on, typeById, typeByName, client, clientByName, session, request, clientName, addType, removeType,
    saveClient, removeClient, restoreClient, saveSession, removeSession, restoreSession, setSessionStatus, saveRequest, patchRequest, removeRequest, restoreRequest,
    importRequests, newRequests, seedDemo, hasDemo, clearDemo, exportJSON, importJSON, restoreDb, resetAll, sessionsCsv, clientsCsv, PAYL, STL,
    get saveFailed() { return saveFailed; } };
})();

/* ---------- расчёты ---------- */
PP.calc = (function () {
  const U = PP.U;
  const eff = (s) => (s.status === "cancelled" ? "cancelled" : s.status === "done" ? "done" : s.date < U.today() ? "done" : "planned");
  // в статистику идут проведённые съёмки и съёмки на сегодня; будущие и отменённые — нет
  const counted = (s) => { const e = eff(s); return e !== "cancelled" && (e === "done" || s.date <= U.today()); };
  const received = (s) => (s.pay === "paid" ? s.price : s.pay === "partial" ? Math.min(s.received, s.price) : 0);
  const debt = (s) => Math.max(0, s.price - received(s));

  function range(kind, custom) {
    const t = U.today();
    switch (kind) {
      case "today": return { kind, from: t, to: t };
      case "week": { const f = U.weekStart(t); return { kind, from: f, to: U.addDays(f, 6) }; }
      case "month": return { kind, from: U.monthStart(t), to: U.monthEnd(t) };
      case "year": return { kind, from: U.yearStart(t), to: U.yearEnd(t) };
      case "all": { const ds = PP.store.db.sessions.filter(counted).map((s) => s.date).sort(); return { kind, from: ds[0] || U.monthStart(t), to: t }; }
      default: { let f = (custom && custom.from) || U.monthStart(t), e = (custom && custom.to) || t; if (f > e) [f, e] = [e, f]; return { kind: "custom", from: f, to: e }; }
    }
  }
  const inRange = (s, r) => s.date >= r.from && s.date <= r.to;
  const list = (r) => PP.store.db.sessions.filter((s) => counted(s) && inRange(s, r));

  function summary(arr) {
    const income = arr.reduce((a, s) => a + received(s), 0), minutes = arr.reduce((a, s) => a + s.duration, 0), count = arr.length;
    const byDay = {};
    arr.forEach((s) => { const d = byDay[s.date] || (byDay[s.date] = { date: s.date, count: 0, minutes: 0 }); d.count++; d.minutes += s.duration; });
    const days = Object.values(byDay);
    const busiest = days.sort((a, b) => b.count - a.count || b.minutes - a.minutes || (a.date < b.date ? 1 : -1))[0] || null;
    return { income, count, minutes, avgCheck: count ? income / count : 0, perHour: minutes ? income / (minutes / 60) : 0, avgDur: count ? minutes / count : 0,
      workDays: days.length, busiest, debt: arr.reduce((a, s) => a + debt(s), 0) };
  }
  const autoGroup = (r) => { const n = U.diffDays(r.from, r.to) + 1; return n <= 31 ? "day" : n <= 120 ? "week" : "month"; };

  function buckets(r, group, metric) {
    const keys = []; let k;
    if (group === "day") for (k = r.from; k <= r.to; k = U.addDays(k, 1)) keys.push(k);
    else if (group === "week") for (k = U.weekStart(r.from); k <= r.to; k = U.addDays(k, 7)) keys.push(k);
    else for (k = U.monthStart(r.from); k <= r.to; k = U.addMonths(k, 1)) keys.push(k);
    const idx = {}; keys.forEach((x, i) => (idx[x] = i));
    const out = keys.map((x) => ({ key: x, income: 0, count: 0, minutes: 0 }));
    list(r).forEach((s) => {
      const bk = group === "day" ? s.date : group === "week" ? U.weekStart(s.date) : U.monthStart(s.date);
      const b = out[idx[bk]]; if (!b) return; b.income += received(s); b.count++; b.minutes += s.duration;
    });
    const multiYear = r.from.slice(0, 4) !== r.to.slice(0, 4);
    out.forEach((b) => {
      const d = U.parse(b.key);
      b.label = group === "day" ? String(d.getDate()) : group === "week" ? U.pad(d.getDate()) + "." + U.pad(d.getMonth() + 1) : U.MON_S[d.getMonth()] + (multiYear ? " " + String(d.getFullYear()).slice(2) : "");
      b.title = group === "day" ? U.dateLong(b.key) : group === "week" ? "неделя с " + U.dateShort(b.key) : U.monthTitle(b.key);
      b.value = metric === "count" ? b.count : metric === "hours" ? b.minutes / 60 : b.income;
    });
    return out;
  }
  function byType(arr) {
    const m = {};
    arr.forEach((s) => { const t = PP.store.typeById(s.typeId); const o = m[t.id] || (m[t.id] = { id: t.id, name: t.name, emoji: t.emoji, count: 0, income: 0 }); o.count++; o.income += received(s); });
    return Object.values(m).sort((a, b) => b.count - a.count || b.income - a.income);
  }
  function clientStats(id) {
    const ss = PP.store.db.sessions.filter((s) => s.clientId === id && eff(s) !== "cancelled").sort((a, b) => (a.date < b.date ? 1 : -1));
    const done = ss.filter(counted), t = U.today();
    const next = ss.filter((s) => s.date >= t && !done.includes(s)).sort((a, b) => (a.date > b.date ? 1 : -1))[0];
    return { sessions: ss, count: done.length, income: done.reduce((a, s) => a + received(s), 0), debt: done.reduce((a, s) => a + debt(s), 0), last: done[0] ? done[0].date : "", next: next ? next.date : "" };
  }
  return { eff, counted, received, debt, range, inRange, list, summary, autoGroup, buckets, byType, clientStats };
})();
