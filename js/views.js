/* Polyanskaya_Photo — экраны: главная, фотосессии, календарь, заявки, статистика, клиенты, настройки.
 * Каждый экран — функция, возвращающая HTML. События обрабатываются одним делегированным обработчиком (см. ACT). */
window.PP = window.PP || {};
PP.views = (function () {
  const U = PP.U, S = PP.store, C = PP.calc, UI = PP.UI, F = PP.forms, ic = UI.icon, esc = U.esc;
  const view = () => document.getElementById("view");

  /* состояние экранов (хранится, пока открыто приложение) */
  const st = {
    s: { q: "", range: "all", from: "", to: "", type: "", pay: "" },
    cal: { month: U.monthStart(U.today()), sel: U.today() },
    stats: { range: "month", from: "", to: "", metric: "income", group: null },
    rq: "new"
  };
  const ST_COLOR = { planned: "var(--info)", done: "var(--ok)", cancelled: "var(--bad)", new: "var(--warn)" };
  const PAYTAG = (s) => s.pay === "paid" ? '<span class="tag ok">🟢 Оплачено</span>' : s.pay === "partial" ? '<span class="tag warn">🟡 Частично: ' + U.money(C.received(s)) + " из " + U.money(s.price) + "</span>" : '<span class="tag bad">🔴 Не оплачено</span>';
  const STTAG = { planned: '<span class="tag info">🔵 Запланирована</span>', done: '<span class="tag ok">🟢 Проведена</span>', cancelled: '<span class="tag bad">🔴 Отменена</span>' };

  function sessionCard(s) {
    const t = S.typeById(s.typeId), e = C.eff(s), cn = S.clientName(s);
    return '<button class="sc fade" data-act="openSession" data-id="' + esc(s.id) + '" style="--st:' + ST_COLOR[e] + '">' +
      '<div class="l1"><span class="d">' + esc(U.dateLong(s.date)) + (s.time ? ", " + esc(s.time) : "") + '</span><span class="p num">' + U.money(s.price) + "</span></div>" +
      '<div class="t">' + t.emoji + " " + esc(t.name) + (s.title && s.title.trim().toLowerCase() !== t.name.toLowerCase() ? '<span class="muted" style="font-weight:400"> — ' + esc(s.title) + "</span>" : "") + "</div>" +
      '<div class="m"><span>👤 ' + (cn ? esc(cn) : "Без клиента") + "</span><span>⏱ " + U.dur(s.duration) + "</span>" + (s.location ? "<span>📍 " + esc(s.location) + "</span>" : "") + "</div>" +
      '<div class="l3">' + PAYTAG(s) + STTAG[e] + "</div></button>";
  }
  const empty = (icon, title, text, btn) => '<div class="empty fade">' + ic(icon) + "<b>" + title + "</b><p>" + text + "</p>" + (btn || "") + "</div>";
  const chips = (list, cur, act, extra) => '<div class="chips">' + list.map((c) => '<button class="chip" data-act="' + act + '" data-v="' + c[0] + '" ' + (extra || "") + ' aria-pressed="' + (cur === c[0]) + '">' + c[1] + "</button>").join("") + "</div>";
  const standalone = () => window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  /* ================= ГЛАВНАЯ ================= */
  function home() {
    const t = U.today(), sm = (k) => C.summary(C.list(C.range(k))), d = sm("today"), m = sm("month"), y = sm("year");
    const nReq = S.newRequests().length;
    const up = S.db.sessions.filter((s) => C.eff(s) === "planned" && s.date >= t).sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1)).slice(0, 3);
    const hint = !standalone() && isIOS() && !S.db.settings.installHintHidden ? '<div class="hint">' + ic("share") + '<div>Чтобы установить приложение: нажмите «Поделиться» в Safari и выберите «На экран Домой». Данные лучше вводить уже в установленном приложении.</div><button data-act="hideHint">Скрыть</button></div>' : "";
    return {
      brand: true,
      html: '<div class="hello"><h2>' + U.greeting() + ' 👋</h2><p>' + esc(U.dateLong(t)) + "</p></div>" + hint +
        (nReq ? '<button class="banner" data-act="go" data-to="#/requests">' + ic("inbox") + "<div><b>Новых заявок: " + nReq + "</b>Нажмите, чтобы ответить клиентам</div>" + ic("next") + "</button>" : "") +
        '<section class="hero fade" aria-label="Доход"><div class="lbl">Доход сегодня</div><div class="big num">' + U.money(d.income) + '</div><div class="row"><div>В этом месяце<b class="num">' + U.money(m.income) + '</b></div><div>В этом году<b class="num">' + U.money(y.income) + "</b></div></div></section>" +
        '<div class="pair"><section class="card stat fade"><div class="lbl">' + ic("camera") + 'Фотосессии</div><div class="v num">' + d.count + '</div><div class="sub"><span>Месяц</span><b class="num">' + m.count + '</b></div><div class="sub"><span>Год</span><b class="num">' + y.count + "</b></div></section>" +
        '<section class="card stat fade"><div class="lbl">' + ic("clock") + 'Рабочее время</div><div class="v num">' + (d.minutes ? U.dur(d.minutes) : "0 ч") + '</div><div class="sub"><span>Месяц</span><b class="num">' + U.hours(m.minutes) + '</b></div><div class="sub"><span>Год</span><b class="num">' + U.hours(y.minutes) + "</b></div></section></div>" +
        '<div class="sec"><h2>Быстрые действия</h2></div><div class="quick"><button class="main" data-act="newSession">' + ic("plus") + 'Добавить фотосессию</button><button data-act="newRequest">' + ic("cal") + 'Новая запись</button><button data-act="go" data-to="#/stats">' + ic("chart") + 'Статистика</button><button data-act="go" data-to="#/clients">' + ic("users") + "Клиенты</button></div>" +
        '<div class="sec"><h2>Ближайшие съёмки</h2><a href="#/calendar">Календарь</a></div>' +
        (up.length ? '<div class="list">' + up.map(sessionCard).join("") + "</div>" : '<div class="card muted small" style="text-align:center">Запланированных съёмок пока нет.</div>')
    };
  }

  /* ================= ФОТОСЕССИИ ================= */
  function sessionsFiltered() {
    const f = st.s, q = f.q.trim().toLowerCase();
    const r = f.range === "all" ? null : C.range(f.range, { from: f.from, to: f.to });
    return S.db.sessions.filter((s) => (!r || C.inRange(s, r)) && (!f.type || s.typeId === f.type) && (!f.pay || s.pay === f.pay) &&
      (!q || (S.clientName(s) + " " + s.title).toLowerCase().includes(q))).sort((a, b) => ((b.date + (b.time || "")) > (a.date + (a.time || "")) ? 1 : -1));
  }
  function sessionsList() {
    const arr = sessionsFiltered(), cnt = arr.filter(C.counted), sm = C.summary(cnt), f = st.s;
    const filtering = f.q || f.range !== "all" || f.type || f.pay;
    return {
      count: arr.length ? arr.length + " " + PP.charts.plural(arr.length, ["съёмка", "съёмки", "съёмок"]) + " · получено " + U.money(sm.income) : "",
      list: arr.length ? arr.map(sessionCard).join("") : filtering ? empty("search", "Ничего не найдено", "Измените поиск или фильтры.", '<button class="btn ghost" data-act="resetFilters">Сбросить фильтры</button>')
        : empty("camera", "Журнал пока пуст", "Добавьте первую фотосессию — она сразу попадёт в статистику.", '<button class="btn" data-act="newSession">Добавить фотосессию</button>')
    };
  }
  function sessions() {
    const f = st.s, l = sessionsList();
    return { title: "Фотосессии", html: '<div class="search">' + ic("search") + '<input id="sq" type="search" placeholder="Поиск по клиенту" value="' + esc(f.q) + '" enterkeyhint="search" autocomplete="off" aria-label="Поиск по клиенту"></div>' +
      chips([["all", "Все"], ["today", "Сегодня"], ["week", "Неделя"], ["month", "Месяц"], ["year", "Год"], ["custom", "Период"]], f.range, "sRange") +
      (f.range === "custom" ? '<div class="periodbox field"><input type="date" id="sfrom" value="' + esc(f.from) + '" aria-label="С даты"><input type="date" id="sto" value="' + esc(f.to) + '" aria-label="По дату"></div>' : "") +
      '<div class="filters"><select id="stype" aria-label="Вид съёмки"><option value="">Все виды</option>' + S.db.types.map((t) => '<option value="' + esc(t.id) + '"' + (f.type === t.id ? " selected" : "") + ">" + t.emoji + " " + esc(t.name) + "</option>").join("") + '</select>' +
      '<select id="spay" aria-label="Оплата"><option value="">Любая оплата</option><option value="paid"' + (f.pay === "paid" ? " selected" : "") + '>🟢 Оплачено</option><option value="partial"' + (f.pay === "partial" ? " selected" : "") + '>🟡 Частично</option><option value="unpaid"' + (f.pay === "unpaid" ? " selected" : "") + ">🔴 Не оплачено</option></select></div>" +
      '<div class="count" id="scount">' + l.count + '</div><div class="list" id="slist">' + l.list + "</div>" };
  }
  function redrawSessionsList() { const l = sessionsList(), a = document.getElementById("slist"), c = document.getElementById("scount"); if (a) { a.innerHTML = l.list; c.textContent = l.count; } }

  /* ================= КАЛЕНДАРЬ ================= */
  function dayEvents(k) {
    const ev = S.db.sessions.filter((s) => s.date === k).map((s) => ({ kind: "s", st: C.eff(s), s })).concat(S.db.requests.filter((r) => r.status === "new" && r.date === k).map((r) => ({ kind: "r", st: "new", r })));
    return ev.sort((a, b) => ((a.s ? a.s.time : a.r.time) || "") > ((b.s ? b.s.time : b.r.time) || "") ? 1 : -1);
  }
  function calendar() {
    const c = st.cal, first = U.parse(c.month), lead = (first.getDay() + 6) % 7, days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(), t = U.today();
    let cells = "";
    for (let i = 0; i < lead; i++) cells += '<div></div>';
    for (let d = 1; d <= days; d++) {
      const k = c.month.slice(0, 8) + U.pad(d), ev = dayEvents(k), kinds = [];
      ["new", "planned", "done", "cancelled"].forEach((x) => { if (ev.some((e) => e.st === x)) kinds.push(x); });
      const dots = kinds.slice(0, 3).map((x) => '<i style="--c:' + ST_COLOR[x] + '"></i>').join("") + (kinds.length > 3 ? "<em>+</em>" : "");
      cells += '<button class="day' + (k === t ? " today" : "") + (k === c.sel ? " sel" : "") + '" data-act="calDay" data-k="' + k + '" aria-label="' + esc(U.dateLong(k)) + (ev.length ? ", событий: " + ev.length : ", свободно") + '" aria-pressed="' + (k === c.sel) + '">' + d + '<span class="dots">' + dots + "</span></button>";
    }
    const ev = dayEvents(c.sel);
    const evHtml = ev.length ? '<div class="list">' + ev.map((e) => e.kind === "s" ? sessionCard(e.s) : requestCard(e.r, true)).join("") + "</div>"
      : '<div class="card" style="text-align:center"><b style="font:600 17px var(--serif)">Свободный день</b><p class="muted small" style="margin:4px 0 12px">На эту дату нет съёмок и заявок.</p><button class="btn" data-act="newSession" data-date="' + c.sel + '">' + ic("plus") + "Добавить фотосессию</button></div>";
    return { title: "Календарь", html: '<div class="cal"><div class="nav"><button class="iconbtn" data-act="calMonth" data-n="-1" aria-label="Предыдущий месяц">' + ic("back") + "</button><h2>" + esc(U.monthTitle(c.month)) + '</h2><button class="iconbtn" data-act="calMonth" data-n="1" aria-label="Следующий месяц">' + ic("next") + '</button></div><div class="wd">' + U.WD_S.map((w) => "<span>" + w + "</span>").join("") + '</div><div class="grid">' + cells + "</div></div>" +
      '<div class="legend"><span style="--c:var(--warn)"><i></i>Новая заявка</span><span style="--c:var(--info)"><i></i>Подтверждено</span><span style="--c:var(--ok)"><i></i>Проведено</span><span style="--c:var(--bad)"><i></i>Отменено</span></div>' +
      '<div class="sec"><h2>' + esc(U.dateLong(c.sel)) + '</h2><button data-act="calToday">Сегодня</button></div>' + evHtml };
  }

  /* ================= СТАТИСТИКА ================= */
  function stats() {
    const f = st.stats, r = C.range(f.range, { from: f.from, to: f.to }), arr = C.list(r), sm = C.summary(arr);
    const span = U.diffDays(r.from, r.to) + 1;
    let group = f.group || C.autoGroup(r);
    if (group === "day" && span > 92) group = "week"; if (group === "week" && span > 800) group = "month";
    const bk = C.buckets(r, group, f.metric), tot = f.metric === "income" ? sm.income : f.metric === "count" ? sm.count : sm.minutes / 60;
    const totTxt = "Всего: <b>" + (f.metric === "income" ? U.money(tot) : f.metric === "count" ? tot + " " + PP.charts.plural(tot, ["съёмка", "съёмки", "съёмок"]) : U.hours(tot * 60)) + "</b>";
    const cnt = (k) => C.list(C.range(k)).length;
    const types = C.byType(arr);
    const none = !arr.length;
    const periodLabel = r.from === r.to ? U.dateMid(r.from) : U.dateShort(r.from) + " — " + U.dateMid(r.to);
    return { title: "Статистика", html: chips([["week", "Неделя"], ["month", "Месяц"], ["year", "Год"], ["all", "Всё время"], ["custom", "Период"]], f.range, "stRange") +
      (f.range === "custom" ? '<div class="periodbox field"><input type="date" id="stfrom" value="' + esc(f.from || r.from) + '" aria-label="С даты"><input type="date" id="stto" value="' + esc(f.to || r.to) + '" aria-label="По дату"></div>' : "") +
      '<p class="muted small" style="margin:4px 2px 12px">' + esc(periodLabel) + ". В расчёт идут проведённые съёмки и съёмки на сегодня.</p>" +
      '<div class="kpis"><div class="kpi wide"><div class="lbl">Общий доход</div><div class="v num" style="font-size:30px">' + U.money(sm.income) + '</div></div>' +
      '<div class="kpi"><div class="lbl">Средний чек</div><div class="v num">' + U.money(sm.avgCheck) + '</div></div><div class="kpi"><div class="lbl">Доход за час</div><div class="v num">' + (sm.minutes ? U.money(sm.perHour) : "—") + "</div></div>" +
      '<div class="kpi"><div class="lbl">Фотосессий</div><div class="v num">' + sm.count + '</div></div><div class="kpi"><div class="lbl">Рабочее время</div><div class="v num">' + U.hours(sm.minutes) + "</div></div>" +
      (sm.debt > 0 ? '<div class="kpi wide"><div class="lbl">Ещё не получено по этим съёмкам</div><div class="v num">' + U.money(sm.debt) + "</div></div>" : "") + "</div>" +
      '<div class="sec"><h2>Количество съёмок</h2></div><div class="kpis" style="grid-template-columns:repeat(4,1fr)">' + [["today", "День"], ["week", "Неделя"], ["month", "Месяц"], ["year", "Год"]].map((x) => '<div class="kpi" style="padding:12px 8px;text-align:center"><div class="lbl">' + x[1] + '</div><div class="v num">' + cnt(x[0]) + "</div></div>").join("") + "</div>" +
      '<div class="sec"><h2>Динамика</h2></div><div class="card">' + chips([["income", "Доход"], ["count", "Съёмки"], ["hours", "Часы"]], f.metric, "stMetric") + chips([["day", "Дни"], ["week", "Недели"], ["month", "Месяцы"]], group, "stGroup") +
      (none ? '<p class="muted small" style="padding:16px 0;text-align:center">В выбранном периоде нет проведённых съёмок.</p>' : PP.charts.bars(bk, f.metric, totTxt)) + "</div>" +
      '<div class="sec"><h2>Виды съёмок</h2></div><div class="card">' + (none ? '<p class="muted small" style="text-align:center">Пока нет данных.</p>' : PP.charts.donut(types)) + "</div>" +
      '<div class="sec"><h2>Рабочее время</h2></div><div class="kpis"><div class="kpi"><div class="lbl">Всего часов</div><div class="v num">' + U.hours(sm.minutes) + '</div></div><div class="kpi"><div class="lbl">Средняя съёмка</div><div class="v num">' + (sm.count ? U.dur(sm.avgDur) : "—") + '</div></div><div class="kpi"><div class="lbl">Рабочих дней</div><div class="v num">' + sm.workDays + '</div></div><div class="kpi"><div class="lbl">Самый загруженный день</div><div class="v" style="font-size:16px">' + (sm.busiest ? esc(U.dateShort(sm.busiest.date)) + '<span class="muted small" style="display:block">' + sm.busiest.count + " " + PP.charts.plural(sm.busiest.count, ["съёмка", "съёмки", "съёмок"]) + ", " + U.hours(sm.busiest.minutes) + "</span>" : "—") + "</div></div></div>" };
  }

  /* ================= КЛИЕНТЫ ================= */
  const clientsState = { q: "" };
  function clientRows() {
    const q = clientsState.q.trim().toLowerCase();
    const rows = S.db.clients.filter((c) => !q || (c.name + " " + c.phone + " " + c.telegram).toLowerCase().includes(q)).map((c) => ({ c, s: C.clientStats(c.id) }))
      .sort((a, b) => (b.s.last || "").localeCompare(a.s.last || "") || a.c.name.localeCompare(b.c.name, "ru"));
    return rows.length ? rows.map(({ c, s }) => '<button class="cl fade" data-act="openClient" data-id="' + esc(c.id) + '"><span class="avatar">' + esc(U.initials(c.name)) + '</span><span class="in"><div class="nm">' + esc(c.name) + '</div><div class="s">Фотосессий: ' + s.count + (s.last ? " · последняя " + U.dmy(s.last) : s.next ? " · ближайшая " + U.dmy(s.next) : "") + '</div></span><span class="rt num">' + U.money(s.income) + "</span></button>").join("")
      : q ? empty("search", "Никого не нашли", "Проверьте имя или номер телефона.") : empty("users", "Клиентов пока нет", "Клиенты добавляются сами, когда вы вносите фотосессию, или вручную.", '<button class="btn" data-act="newClient">Добавить клиента</button>');
  }
  function clients() {
    return { title: "Клиенты", right: '<button class="iconbtn" data-act="newClient" aria-label="Новый клиент">' + ic("plus") + "</button>",
      html: '<div class="search">' + ic("search") + '<input id="cq" type="search" placeholder="Поиск клиента" value="' + esc(clientsState.q) + '" autocomplete="off" aria-label="Поиск клиента"></div><div class="count">' + S.db.clients.length + " " + PP.charts.plural(S.db.clients.length, ["клиент", "клиента", "клиентов"]) + '</div><div class="list" id="clist">' + clientRows() + "</div>" };
  }
  function client(id) {
    const c = S.client(id); if (!c) return { title: "Клиент", html: empty("users", "Клиент не найден", "Возможно, его удалили.", '<a class="btn" href="#/clients">К списку клиентов</a>') };
    const s = C.clientStats(id), contacts = (c.phone ? '<a class="btn ghost sm" href="' + esc(U.telHref(c.phone)) + '">' + ic("phone") + "Позвонить</a>" : "") + (c.telegram ? '<a class="btn ghost sm" target="_blank" rel="noopener" href="' + esc(U.tgHref(c.telegram)) + '">' + ic("send") + "Telegram</a>" : "") + (c.instagram ? '<a class="btn ghost sm" target="_blank" rel="noopener" href="' + esc(U.igHref(c.instagram)) + '">' + ic("insta") + "Instagram</a>" : "");
    return { title: "Клиент", html: '<a class="back" href="#/clients">' + ic("back") + "Клиенты</a>" +
      '<div class="card" style="display:flex;gap:14px;align-items:center"><span class="avatar" style="width:56px;height:56px;font-size:22px">' + esc(U.initials(c.name)) + '</span><div style="min-width:0"><h2 style="font:600 22px var(--serif);overflow-wrap:anywhere">' + esc(c.name) + '</h2><div class="muted small">' + esc([c.phone, c.telegram && "@" + U.handle(c.telegram), c.instagram && "ig: " + U.handle(c.instagram)].filter(Boolean).join(" · ") || "Контакты не указаны") + "</div></div></div>" +
      (contacts ? '<div class="btns" style="margin-top:12px">' + contacts + "</div>" : "") +
      '<div class="info-grid"><div><b class="num">' + s.count + "</b><span>Фотосессий</span></div><div><b class='num'>" + U.money(s.income) + "</b><span>Общий доход</span></div><div><b class='num'>" + (s.last ? U.dmy(s.last) : "—") + "</b><span>Последняя</span></div></div>" +
      (s.debt > 0 ? '<div class="hint" style="border-color:#4d3f1d">🟡 Не доплачено клиентом: <b style="color:var(--tx)">' + U.money(s.debt) + "</b></div>" : "") +
      (c.notes ? '<div class="card"><div class="muted small" style="margin-bottom:4px">Заметки</div><div style="white-space:pre-wrap;overflow-wrap:anywhere">' + esc(c.notes) + "</div></div>" : "") +
      '<div class="btns" style="margin:14px 0 0"><button class="btn" data-act="newSessionFor" data-id="' + esc(c.id) + '">' + ic("plus") + 'Новая съёмка</button><button class="btn ghost" data-act="editClient" data-id="' + esc(c.id) + '">' + ic("edit") + "Изменить</button></div>" +
      '<div class="sec"><h2>История съёмок</h2></div>' + (s.sessions.length ? '<div class="list">' + s.sessions.map(sessionCard).join("") + "</div>" : '<div class="card muted small" style="text-align:center">С этим клиентом пока нет съёмок.</div>') };
  }

  /* ================= ЗАЯВКИ ================= */
  const RQ_ST = { new: '<span class="tag warn">🟡 Новая</span>', confirmed: '<span class="tag info">🔵 Подтверждена</span>', cancelled: '<span class="tag bad">🔴 Отменена</span>' };
  function requestCard(r, compact) {
    const t = U.parse(r.created.slice(0, 10)); const when = r.created ? new Date(r.created) : null;
    const dl = [["Телефон", r.phone && '<a href="' + esc(U.telHref(r.phone)) + '">' + esc(r.phone) + "</a>"], ["Вид", esc(r.typeName)], ["Дата", r.date ? esc(U.dateLong(r.date)) : ""], ["Время", esc(r.time)], ["Локация", esc(r.location)], ["Комментарий", esc(r.comment)]].filter((x) => x[1]).map((x) => "<dt>" + x[0] + "</dt><dd>" + x[1] + "</dd>").join("");
    let acts;
    if (r.status === "new") acts = '<button class="go" data-act="rqConfirm" data-id="' + esc(r.id) + '">' + ic("check") + "Подтвердить</button><button data-act=\"rqEdit\" data-id=\"" + esc(r.id) + '">' + ic("edit") + "Изменить</button><button data-act=\"rqContact\" data-id=\"" + esc(r.id) + '">' + ic("mail") + 'Связаться</button><button class="no" data-act="rqCancel" data-id="' + esc(r.id) + '">' + ic("x") + "Отменить</button>";
    else if (r.status === "confirmed") acts = r.sessionId && S.session(r.sessionId) ? '<button class="go" style="grid-column:1/-1" data-act="openSession" data-id="' + esc(r.sessionId) + '">Открыть съёмку</button>' : '<button data-act="rqReopen" data-id="' + esc(r.id) + '" style="grid-column:1/-1">Вернуть в новые</button>';
    else acts = '<button data-act="rqReopen" data-id="' + esc(r.id) + '" style="grid-column:1/3">Вернуть в новые</button><button class="no" data-act="rqDelete" data-id="' + esc(r.id) + '" style="grid-column:3/5">' + ic("trash") + "Удалить</button>";
    return '<div class="rq fade' + (r.status === "cancelled" ? " dim" : "") + '"><div class="h"><span class="nm">' + esc(r.name || "Без имени") + "</span>" + RQ_ST[r.status] + "</div>" +
      '<div class="muted small">' + (r.source === "online" ? "Онлайн-запись" : "Добавлено вручную") + (when && !isNaN(when) ? ", " + esc(U.dateShort(U.key(when))) + " " + U.pad(when.getHours()) + ":" + U.pad(when.getMinutes()) : "") + "</div><dl>" + dl + '</dl><div class="acts">' + acts + "</div></div>";
  }
  function requests() {
    const f = st.rq, all = S.db.requests.slice().sort((a, b) => (a.created < b.created ? 1 : -1)), list = f === "all" ? all : all.filter((r) => r.status === f);
    const n = (x) => all.filter((r) => r.status === x).length;
    const synced = PP.sync.configured();
    return { title: "Заявки", right: '<button class="iconbtn" data-act="newRequest" aria-label="Новая запись">' + ic("plus") + "</button>",
      html: (synced ? "" : '<div class="hint">' + ic("link") + '<div>Онлайн-запись ещё не подключена: заявки клиентов не будут приходить сюда сами. Как подключить — в Настройках.</div><button data-act="go" data-to="#/settings">Открыть</button></div>') +
        chips([["new", "Новые " + n("new")], ["confirmed", "Подтверждённые"], ["cancelled", "Отменённые"], ["all", "Все"]], f, "rqFilter") +
        (synced ? '<button class="btn ghost sm" data-act="rqPull" style="margin:4px 0 12px">' + ic("down") + "Проверить новые заявки</button>" : "") +
        '<div class="list">' + (list.length ? list.map((r) => requestCard(r)).join("") : empty("inbox", f === "new" ? "Новых заявок нет" : "Здесь пока пусто", "Ссылка на страницу записи лежит в Настройках — отправьте её клиентам.", '<button class="btn ghost" data-act="newRequest">Добавить запись вручную</button>')) + "</div>" };
  }
  function contactSheet(r) {
    const d = String(r.phone || "").replace(/\D/g, ""), p = r.phone ? '<a href="' + esc(U.telHref(r.phone)) + '">' + ic("phone") + '<span class="g">Позвонить<small>' + esc(r.phone) + "</small></span></a>" +
      '<a target="_blank" rel="noopener" href="https://t.me/+' + d + '">' + ic("send") + '<span class="g">Написать в Telegram</span></a><a target="_blank" rel="noopener" href="https://wa.me/' + d + '">' + ic("mail") + '<span class="g">Написать в WhatsApp</span></a><a href="sms:' + esc(r.phone.replace(/[^\d+]/g, "")) + '">' + ic("note") + '<span class="g">Отправить SMS</span></a>' : "";
    UI.sheet({ title: "Связаться: " + (r.name || ""), body: p ? '<div class="row-list">' + p + "</div>" : '<p class="muted">В заявке нет номера телефона. Нажмите «Изменить» и добавьте его.</p>' });
  }

  /* ================= НАСТРОЙКИ ================= */
  const bookingUrl = () => { try { return new URL("booking/", location.href.split("#")[0]).href; } catch (e) { return "booking/"; } };
  function settings() {
    const set = S.db.settings, ep = PP.sync.endpoint(), tok = PP.local.get("adminToken"), last = set.lastBackup ? U.dmy(U.key(new Date(set.lastBackup))) : "ещё не сохраняли";
    const custom = S.db.types.filter((t) => t.custom);
    return { title: "Настройки", html: '<a class="back" href="#/home">' + ic("back") + "Главная</a>" +
      '<div class="sec" style="margin-top:6px"><h2>Онлайн-запись</h2></div><div class="card"><div class="muted small">Ссылка для клиентов — отправьте её в Instagram или Telegram:</div><div class="linkbox">' + esc(bookingUrl()) + '</div><div class="btns"><button class="btn ghost sm" data-act="copyLink">' + ic("copy") + 'Скопировать</button><button class="btn ghost sm" data-act="shareLink">' + ic("share") + "Отправить</button></div>" +
      '<div class="note">' + (ep ? "Сервер заявок подключён." : "Сервер заявок не подключён: впишите адрес Worker в config.js (см. README).") + "</div>" +
      '<div class="field" style="margin:14px 0 8px"><label for="admtok">Ключ доступа (ADMIN_TOKEN)</label><input id="admtok" type="password" autocomplete="off" autocapitalize="none" value="' + esc(tok) + '" placeholder="Вставьте ключ из Cloudflare"></div><div class="btns"><button class="btn sm" data-act="saveTok">Сохранить ключ</button><button class="btn ghost sm" data-act="checkConn">Проверить связь</button></div></div>' +
      '<div class="sec"><h2>Данные</h2></div><div class="row-list"><button data-act="expJson">' + ic("down") + '<span class="g">Сохранить копию (JSON)<small>Последняя копия: ' + last + '</small></span></button><button data-act="expCsv">' + ic("note") + '<span class="g">Таблица съёмок для Excel (CSV)</span></button><button data-act="expClients">' + ic("users") + '<span class="g">Список клиентов (CSV)</span></button><button data-act="impJson">' + ic("up") + '<span class="g">Загрузить копию<small>Заменит текущие данные</small></span></button></div><input type="file" id="impfile" accept=".json,application/json" hidden>' +
      '<div class="note">Данные хранятся только на этом устройстве. Сохраняйте копию раз в неделю.</div>' +
      '<div class="sec"><h2>Виды съёмок</h2></div><div class="card"><div class="seg">' + S.db.types.map((t) => '<span class="tag' + (t.custom ? " wine" : "") + '" style="height:32px;font-size:13.5px">' + t.emoji + " " + esc(t.name) + (t.custom ? ' <button data-act="delType" data-id="' + esc(t.id) + '" aria-label="Удалить вид ' + esc(t.name) + '" style="color:var(--tx2);margin-left:4px">✕</button>' : "") + "</span>").join("") + '</div><div class="grid2" style="margin-top:12px;grid-template-columns:1fr auto"><input id="newtype" class="inp" placeholder="Новый вид съёмки" maxlength="40" aria-label="Новый вид съёмки"><button class="btn sm" style="min-height:48px" data-act="addType">Добавить</button></div></div>' +
      '<div class="sec"><h2>Валюта</h2></div><div class="field"><select id="cur" aria-label="Валюта">' + ["₽", "$", "€", "₸", "₴", "֏", "Br", "£"].map((c) => "<option" + (set.currency === c ? " selected" : "") + ">" + c + "</option>").join("") + "</select></div>" +
      '<div class="sec"><h2>Тестовые данные</h2></div><div class="row-list">' + (S.hasDemo() ? '<button data-act="clearDemo">' + ic("trash") + '<span class="g">Очистить тестовые данные<small>Ваши настоящие записи останутся</small></span></button>' : '<button data-act="seedDemo">' + ic("plus") + '<span class="g">Добавить тестовые данные<small>Чтобы посмотреть, как выглядит статистика</small></span></button>') + '<button class="red" data-act="wipe">' + ic("trash") + '<span class="g">Удалить все данные<small>Сначала сохраните копию</small></span></button></div>' +
      '<p class="note" style="text-align:center;margin:24px 0 0">Polyanskaya_Photo · версия 1.0</p>' };
  }

  /* ================= ДЕЙСТВИЯ ================= */
  async function saveFile(name, text, mime) {
    try {
      const f = new File([text], name, { type: mime });
      if (navigator.canShare && navigator.canShare({ files: [f] }) && isIOS()) { await navigator.share({ files: [f], title: name }); return true; }
    } catch (e) { if (e && e.name === "AbortError") return false; }
    U.download(name, text, mime); return true;
  }
  const stamp = () => U.today();
  const ACT = {
    go: (el) => { location.hash = el.dataset.to; },
    hideHint: () => { S.db.settings.installHintHidden = true; S.commit(); },
    newSession: (el) => F.session({ date: el.dataset.date }),
    newSessionFor: (el) => { const c = S.client(el.dataset.id); F.session({ prefill: c ? { clientName: c.name, phone: c.phone, telegram: c.telegram, instagram: c.instagram } : {} }); },
    openSession: (el) => F.session({ id: el.dataset.id }),
    newRequest: () => F.requestForm(),
    sRange: (el) => { st.s.range = el.dataset.v; if (st.s.range === "custom" && !st.s.from) { st.s.from = U.monthStart(U.today()); st.s.to = U.today(); } PP.app.render(); },
    resetFilters: () => { st.s = { q: "", range: "all", from: "", to: "", type: "", pay: "" }; PP.app.render(); },
    calDay: (el) => { st.cal.sel = el.dataset.k; PP.app.render(); },
    calMonth: (el) => { st.cal.month = U.addMonths(st.cal.month, +el.dataset.n); st.cal.sel = st.cal.month.slice(0, 7) === U.today().slice(0, 7) ? U.today() : st.cal.month; PP.app.render(); },
    calToday: () => { st.cal.month = U.monthStart(U.today()); st.cal.sel = U.today(); PP.app.render(); },
    stRange: (el) => { st.stats.range = el.dataset.v; st.stats.group = null; if (el.dataset.v === "custom" && !st.stats.from) { st.stats.from = U.monthStart(U.today()); st.stats.to = U.today(); } PP.app.render(); },
    stMetric: (el) => { st.stats.metric = el.dataset.v; PP.app.render(); },
    stGroup: (el) => { st.stats.group = el.dataset.v; PP.app.render(); },
    newClient: () => F.clientForm(),
    editClient: (el) => F.clientForm({ id: el.dataset.id }),
    openClient: (el) => { location.hash = "#/client/" + el.dataset.id; },
    rqFilter: (el) => { st.rq = el.dataset.v; PP.app.render(); },
    rqConfirm: (el) => F.confirmRequest(el.dataset.id),
    rqEdit: (el) => F.requestForm({ id: el.dataset.id }),
    rqContact: (el) => { const r = S.request(el.dataset.id); if (r) contactSheet(r); },
    rqCancel: async (el) => {
      if (!(await UI.confirm({ title: "Отменить заявку?", text: "Заявка перейдёт в «Отменённые». Клиенту ничего не отправляется — напишите ему сами.", ok: "Отменить заявку", cancel: "Назад", danger: true }))) return;
      const id = el.dataset.id; S.patchRequest(id, { status: "cancelled" }); UI.toast("Заявка отменена", { action: "Вернуть", onAction: () => S.patchRequest(id, { status: "new" }) });
    },
    rqReopen: (el) => { S.patchRequest(el.dataset.id, { status: "new", sessionId: null }); UI.toast("Заявка снова в новых"); },
    rqDelete: async (el) => { if (!(await UI.confirm({ title: "Удалить заявку?", ok: "Удалить", danger: true }))) return; const snap = S.removeRequest(el.dataset.id); UI.toast("Заявка удалена", { action: "Вернуть", onAction: () => S.restoreRequest(snap) }); },
    rqPull: async () => { const r = await PP.sync.pull(); UI.toast(r.ok ? (r.added ? "Новых заявок: " + r.added : "Новых заявок нет") : PP.sync.MSG[r.error] || "Не получилось"); },
    copyLink: async () => { try { await navigator.clipboard.writeText(bookingUrl()); UI.toast("Ссылка скопирована"); } catch (e) { const b = document.querySelector(".linkbox"); if (b) { const rg = document.createRange(); rg.selectNodeContents(b); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg); } UI.toast("Выделено — нажмите «Скопировать» в меню"); } },
    shareLink: async () => { try { if (navigator.share) await navigator.share({ title: "Polyanskaya_Photo — запись на фотосессию", url: bookingUrl() }); else ACT.copyLink(); } catch (e) { /* отмена */ } },
    saveTok: () => { PP.local.set("adminToken", document.getElementById("admtok").value.trim()); UI.toast("Ключ сохранён"); PP.sync.pull().then((r) => { if (r.ok && r.added) UI.toast("Новых заявок: " + r.added); }); },
    checkConn: async () => {
      PP.local.set("adminToken", document.getElementById("admtok").value.trim());
      const r = await PP.sync.check();
      UI.toast(r.ok ? (r.authed ? "Всё работает: сервер и ключ в порядке" : r.error ? PP.sync.MSG[r.error] : "Сервер отвечает. Введите ключ доступа.") : PP.sync.MSG[r.error] || "Не получилось", { ms: 4200 });
    },
    expJson: async () => { if (await saveFile("Polyanskaya_Photo_" + stamp() + ".json", S.exportJSON(), "application/json")) { UI.toast("Копия сохранена"); PP.app.render(); } },
    expCsv: async () => { if (await saveFile("Polyanskaya_Photo_sessions_" + stamp() + ".csv", S.sessionsCsv(), "text/csv")) UI.toast("Таблица сохранена"); },
    expClients: async () => { if (await saveFile("Polyanskaya_Photo_clients_" + stamp() + ".csv", S.clientsCsv(), "text/csv")) UI.toast("Список клиентов сохранён"); },
    impJson: () => document.getElementById("impfile").click(),
    delType: async (el) => { const t = S.db.types.find((x) => x.id === el.dataset.id); if (!t) return; if (await UI.confirm({ title: "Удалить вид «" + t.name + "»?", text: "Съёмки этого вида станут «Другое».", ok: "Удалить", danger: true })) S.removeType(t.id); },
    addType: () => { const i = document.getElementById("newtype"), n = i.value.trim(); if (!n) { UI.toast("Введите название вида"); return; } S.addType(n); UI.toast("Вид добавлен"); },
    clearDemo: async () => { if (await UI.confirm({ title: "Очистить тестовые данные?", text: "Удалятся только примеры. Ваши съёмки, клиенты и заявки останутся.", ok: "Очистить", danger: true })) { S.clearDemo(); UI.toast("Тестовые данные удалены"); } },
    seedDemo: () => { S.seedDemo(); S.commit(); UI.toast("Тестовые данные добавлены"); },
    wipe: async () => { if (await UI.confirm({ title: "Удалить все данные?", text: "Съёмки, клиенты и заявки будут стёрты с этого устройства. Это нельзя отменить.", ok: "Удалить всё", danger: true })) { S.resetAll(); UI.toast("Данные удалены"); } }
  };

  function bind() {
    const v = view();
    const onClick = (e) => { const el = e.target.closest("[data-act]"); if (el && ACT[el.dataset.act]) { e.preventDefault(); ACT[el.dataset.act](el, e); } };
    v.addEventListener("click", onClick); document.getElementById("top").addEventListener("click", onClick);   // кнопки в шапке тоже
    v.addEventListener("input", (e) => {
      const id = e.target.id;
      if (id === "sq") { st.s.q = e.target.value; redrawSessionsList(); }
      else if (id === "cq") { clientsState.q = e.target.value; document.getElementById("clist").innerHTML = clientRows(); }
    });
    v.addEventListener("change", (e) => {
      const id = e.target.id, val = e.target.value;
      if (id === "stype") { st.s.type = val; redrawSessionsList(); } else if (id === "spay") { st.s.pay = val; redrawSessionsList(); }
      else if (id === "sfrom") { st.s.from = val; redrawSessionsList(); } else if (id === "sto") { st.s.to = val; redrawSessionsList(); }
      else if (id === "stfrom") { st.stats.from = val; st.stats.group = null; PP.app.render(); } else if (id === "stto") { st.stats.to = val; st.stats.group = null; PP.app.render(); }
      else if (id === "cur") { S.db.settings.currency = val; S.commit(); UI.toast("Валюта изменена"); }
      else if (id === "impfile") {
        const file = e.target.files && e.target.files[0]; e.target.value = ""; if (!file) return;
        file.text().then(async (txt) => {
          let o; try { o = JSON.parse(txt); } catch (er) { UI.toast("Это не файл резервной копии: не удалось прочитать JSON.", { ms: 4200 }); return; }
          const d = o && o.data ? o.data : o, ns = Array.isArray(d && d.sessions) ? d.sessions.length : 0, nc = Array.isArray(d && d.clients) ? d.clients.length : 0;
          if (!ns && !nc) { UI.toast("В файле нет фотосессий и клиентов.", { ms: 4200 }); return; }
          if (!(await UI.confirm({ title: "Загрузить копию?", text: "В файле: съёмок — " + ns + ", клиентов — " + nc + ". Текущие данные будут заменены.", ok: "Загрузить" }))) return;
          try { const r = S.importJSON(txt); UI.toast("Копия загружена", { action: "Отменить", onAction: () => { S.restoreDb(r.prev); UI.toast("Возвращены прежние данные"); } }); } catch (er) { UI.toast(er.message, { ms: 4200 }); }
        });
      }
    });
  }

  const routes = { home, sessions, calendar, stats, clients, requests, settings };
  return { routes, client, bind, st };
})();
