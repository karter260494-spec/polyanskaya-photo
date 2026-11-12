/* Polyanskaya_Photo — формы в нижних шторках: фотосессия, клиент, заявка. */
window.PP = window.PP || {};
PP.forms = (function () {
  const U = PP.U, S = PP.store, UI = PP.UI, esc = U.esc;
  const DURS = [[30, "30 мин"], [60, "1 ч"], [90, "1,5 ч"], [120, "2 ч"], [180, "3 ч"]];
  const $ = (root, sel) => root.querySelector(sel);

  const field = (label, inner, id, err) => '<div class="field" data-f="' + (id || "") + '"><label' + (id ? ' for="' + id + '"' : "") + ">" + label + "</label>" + inner + (err ? '<div class="err">' + err + "</div>" : "") + "</div>";
  const input = (id, val, attrs) => '<input id="' + id + '" value="' + esc(val || "") + '" ' + (attrs || "") + ">";

  /* ---------- фотосессия ---------- */
  function session(o) {
    o = o || {};
    const ex = o.id ? S.session(o.id) : null, pre = o.prefill || {};
    const c0 = ex && ex.clientId ? S.client(ex.clientId) : null;
    const v = ex ? { date: ex.date, time: ex.time, title: ex.title, clientName: S.clientName(ex), phone: c0 ? c0.phone : "", telegram: c0 ? c0.telegram : "", instagram: c0 ? c0.instagram : "",
      typeId: ex.typeId, duration: ex.duration, price: ex.price || "", pay: ex.pay, received: ex.received || "", location: ex.location, comment: ex.comment, status: ex.status === "cancelled" ? "cancelled" : ex.status === "done" ? "done" : "planned" }
      : Object.assign({ date: o.date || U.today(), time: "", title: "", clientName: "", phone: "", telegram: "", instagram: "", typeId: "solo", duration: 60, price: "", pay: "unpaid", received: "", location: "", comment: "", status: "planned" }, pre);
    const st = { typeId: v.typeId, duration: v.duration, pay: v.pay, status: v.status, custom: !DURS.some((d) => d[0] === v.duration) };

    const typeBtns = () => S.db.types.map((t) => '<button type="button" data-type="' + esc(t.id) + '" aria-pressed="' + (st.typeId === t.id) + '">' + t.emoji + " " + esc(t.name) + "</button>").join("") + '<button type="button" data-addtype>＋ Своя</button>';
    const durBtns = () => DURS.map((d) => '<button type="button" data-dur="' + d[0] + '" aria-pressed="' + (!st.custom && st.duration === d[0]) + '">' + d[1] + "</button>").join("") + '<button type="button" data-dur="custom" aria-pressed="' + st.custom + '">Другое</button>';

    const body =
      '<form id="sf" novalidate autocomplete="off">' +
      '<div class="grid2">' + field("Дата", input("sf-date", v.date, 'type="date" required'), "sf-date", "Укажите дату") + field("Время", input("sf-time", v.time, 'type="time"'), "sf-time") + "</div>" +
      field("Название или описание", input("sf-title", v.title, 'placeholder="Например, Love Story на закате" maxlength="120"'), "sf-title") +
      field("Клиент", input("sf-client", v.clientName, 'placeholder="Имя клиента" maxlength="80" autocapitalize="words"') + '<div class="suggest" id="sf-sug"></div>', "sf-client") +
      field("Телефон", input("sf-phone", v.phone, 'type="tel" inputmode="tel" placeholder="+7 900 000-00-00" maxlength="30"'), "sf-phone") +
      '<div class="grid2">' + field("Telegram", input("sf-tg", v.telegram, 'placeholder="@username" autocapitalize="none" maxlength="60"'), "sf-tg") + field("Instagram", input("sf-ig", v.instagram, 'placeholder="@username" autocapitalize="none" maxlength="60"'), "sf-ig") + "</div>" +
      '<div class="field"><span class="lb">Вид съёмки</span><div class="seg" id="sf-types">' + typeBtns() + "</div></div>" +
      '<div class="field"><span class="lb">Продолжительность</span><div class="seg" id="sf-durs">' + durBtns() + '</div><div class="reveal ' + (st.custom ? "open" : "") + '" id="sf-cust" style="margin-top:' + (st.custom ? 10 : 0) + 'px"><input id="sf-mins" inputmode="numeric" placeholder="Минут, например 45" value="' + (st.custom ? v.duration : "") + '" aria-label="Продолжительность в минутах"></div><div class="err" style="display:none;color:#F08A84;font-size:13px;margin-top:5px" id="sf-dur-err">Укажите минуты числом</div></div>' +
      field("Стоимость, " + esc(S.db.settings.currency), input("sf-price", v.price, 'inputmode="decimal" placeholder="15000"'), "sf-price") +
      '<div class="field"><span class="lb">Статус оплаты</span><div class="seg pay" id="sf-pay"><button type="button" data-v="paid" aria-pressed="' + (st.pay === "paid") + '">🟢 Оплачено</button><button type="button" data-v="partial" aria-pressed="' + (st.pay === "partial") + '">🟡 Частично</button><button type="button" data-v="unpaid" aria-pressed="' + (st.pay === "unpaid") + '">🔴 Не оплачено</button></div>' +
      '<div class="reveal ' + (st.pay === "partial" ? "open" : "") + '" id="sf-part"><div style="padding-top:12px">' + field("Получено, " + esc(S.db.settings.currency), input("sf-rec", v.received, 'inputmode="decimal" placeholder="5000"'), "sf-rec", "Получено не может быть больше стоимости") +
      '<div class="sumline"><span>Общая стоимость</span><b id="sf-tot">—</b></div><div class="sumline"><span>Остаток</span><b id="sf-rest">—</b></div></div></div></div>' +
      field("Локация", input("sf-loc", v.location, 'placeholder="Студия, парк, адрес…" maxlength="160"'), "sf-loc") +
      field("Комментарий", '<textarea id="sf-com" maxlength="1000" placeholder="Пожелания, детали, реквизиты…">' + esc(v.comment) + "</textarea>", "sf-com") +
      '<div class="field"><span class="lb">Статус съёмки</span><div class="seg" id="sf-st"><button type="button" data-v="planned" aria-pressed="' + (st.status === "planned") + '">Запланирована</button><button type="button" data-v="done" aria-pressed="' + (st.status === "done") + '">Проведена</button><button type="button" data-v="cancelled" aria-pressed="' + (st.status === "cancelled") + '">Отменена</button></div></div></form>';
    const footer = (ex ? '<button class="btn danger" id="sf-del" style="flex:0 0 auto" aria-label="Удалить">' + UI.icon("trash") + "</button>" : "") + '<button class="btn" id="sf-save">' + (ex ? "Сохранить" : "Добавить фотосессию") + "</button>";

    UI.sheet({ title: ex ? "Фотосессия" : o.requestId ? "Подтвердить заявку" : "Новая фотосессия", body, footer, onOpen(h) {
      const el = h.el, g = (id) => $(el, "#" + id);
      const refreshPart = () => {
        const p = U.toNum(g("sf-price").value), r = U.toNum(g("sf-rec").value);
        g("sf-tot").textContent = U.money(p); g("sf-rest").textContent = U.money(Math.max(0, p - r));
      };
      const pressed = (box, attr, val) => box.querySelectorAll("button[" + attr + "]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute(attr) === String(val))));
      refreshPart();
      g("sf-price").addEventListener("input", refreshPart); g("sf-rec").addEventListener("input", refreshPart);

      // подсказки клиентов
      const sug = g("sf-sug");
      const renderSug = () => {
        const q = g("sf-client").value.trim().toLowerCase();
        const list = S.db.clients.filter((c) => c.name && (!q || c.name.toLowerCase().includes(q)) && c.name.toLowerCase() !== q).slice(0, 5);
        sug.innerHTML = list.map((c) => '<button type="button" data-cid="' + esc(c.id) + '">' + esc(c.name) + "</button>").join("");
      };
      g("sf-client").addEventListener("input", renderSug); g("sf-client").addEventListener("focus", renderSug);
      sug.addEventListener("click", (e) => {
        const b = e.target.closest("[data-cid]"); if (!b) return; const c = S.client(b.dataset.cid); if (!c) return;
        g("sf-client").value = c.name; g("sf-phone").value = c.phone; g("sf-tg").value = c.telegram; g("sf-ig").value = c.instagram; sug.innerHTML = "";
      });

      el.addEventListener("click", async (e) => {
        const t = e.target.closest("button"); if (!t) return;
        if (t.dataset.type) { st.typeId = t.dataset.type; pressed(g("sf-types"), "data-type", st.typeId); }
        else if (t.hasAttribute("data-addtype")) {
          const wrap = g("sf-types"); if (wrap.querySelector("input")) return;
          t.outerHTML = '<input id="sf-newtype" placeholder="Название вида" maxlength="40" style="min-height:42px;border-radius:12px;border:1px solid var(--line);background:var(--bg2);padding:0 12px;font-size:16px;width:150px"><button type="button" data-savetype class="btn sm">OK</button>';
          g("sf-newtype").focus();
        } else if (t.hasAttribute("data-savetype")) {
          const n = g("sf-newtype").value.trim(); if (!n) return;
          const nt = S.addType(n); st.typeId = nt.id; g("sf-types").innerHTML = typeBtns();
        } else if (t.dataset.dur) {
          if (t.dataset.dur === "custom") { st.custom = true; g("sf-cust").classList.add("open"); g("sf-cust").style.marginTop = "10px"; g("sf-mins").focus(); }
          else { st.custom = false; st.duration = +t.dataset.dur; g("sf-cust").classList.remove("open"); g("sf-cust").style.marginTop = "0"; }
          g("sf-durs").innerHTML = durBtns();
        } else if (t.closest("#sf-pay")) { st.pay = t.dataset.v; pressed(g("sf-pay"), "data-v", st.pay); g("sf-part").classList.toggle("open", st.pay === "partial"); refreshPart(); }
        else if (t.closest("#sf-st")) { st.status = t.dataset.v; pressed(g("sf-st"), "data-v", st.status); }
        else if (t.id === "sf-del") {
          if (!(await UI.confirm({ title: "Удалить фотосессию?", text: "Её можно будет вернуть сразу после удаления.", ok: "Удалить", danger: true }))) return;
          const snap = S.removeSession(ex.id); h.close();
          UI.toast("Фотосессия удалена", { action: "Отменить", onAction: () => { S.restoreSession(snap); UI.toast("Фотосессия возвращена"); } });
        } else if (t.id === "sf-save") save(h);
      });
      el.addEventListener("submit", (e) => e.preventDefault());

      function save(h) {
        let ok = true;
        const bad = (id, cond) => { const f = el.querySelector('[data-f="' + id + '"]'); if (f) f.classList.toggle("bad", cond); if (cond) ok = false; };
        bad("sf-date", !g("sf-date").value);
        const price = U.toNum(g("sf-price").value), rec = U.toNum(g("sf-rec").value);
        bad("sf-rec", st.pay === "partial" && rec > price);
        let dur = st.duration;
        if (st.custom) { dur = Math.round(U.toNum(g("sf-mins").value)); g("sf-dur-err").style.display = dur > 0 ? "none" : "block"; if (!(dur > 0)) ok = false; }
        if (!ok) { const f = el.querySelector(".field.bad, #sf-dur-err[style*=block]"); if (f) f.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
        const r = S.saveSession({ date: g("sf-date").value, time: g("sf-time").value, title: g("sf-title").value, clientName: g("sf-client").value, clientId: ex && ex.clientId, phone: g("sf-phone").value,
          telegram: g("sf-tg").value, instagram: g("sf-ig").value, typeId: st.typeId, duration: dur, price, received: rec, pay: st.pay, location: g("sf-loc").value, comment: g("sf-com").value, status: st.status }, ex && ex.id);
        if (o.requestId) S.patchRequest(o.requestId, { status: "confirmed", sessionId: r.session.id });
        h.close(); UI.toast(o.requestId ? "Заявка подтверждена — съёмка в календаре" : ex ? "Изменения сохранены" : "Фотосессия добавлена");
        if (o.onSaved) o.onSaved(r.session);
      }
    } });
  }

  /* ---------- клиент ---------- */
  function clientForm(o) {
    o = o || {}; const ex = o.id ? S.client(o.id) : null, v = ex || { name: "", phone: "", telegram: "", instagram: "", notes: "" };
    const body = '<form id="cf" novalidate autocomplete="off">' + field("Имя", input("cf-name", v.name, 'maxlength="80" autocapitalize="words" placeholder="Имя клиента"'), "cf-name", "Введите имя клиента") +
      field("Телефон", input("cf-phone", v.phone, 'type="tel" inputmode="tel" maxlength="30"'), "cf-phone") +
      '<div class="grid2">' + field("Telegram", input("cf-tg", v.telegram, 'placeholder="@username" autocapitalize="none"'), "cf-tg") + field("Instagram", input("cf-ig", v.instagram, 'placeholder="@username" autocapitalize="none"'), "cf-ig") + "</div>" +
      field("Заметки", '<textarea id="cf-notes" maxlength="2000" placeholder="Предпочтения, важные детали…">' + esc(v.notes) + "</textarea>", "cf-notes") + "</form>";
    UI.sheet({ title: ex ? "Клиент" : "Новый клиент", body, footer: (ex ? '<button class="btn danger" id="cf-del" style="flex:0 0 auto" aria-label="Удалить">' + UI.icon("trash") + "</button>" : "") + '<button class="btn" id="cf-save">Сохранить</button>', onOpen(h) {
      const el = h.el, g = (id) => $(el, "#" + id);
      el.addEventListener("click", async (e) => {
        const t = e.target.closest("button"); if (!t) return;
        if (t.id === "cf-save") {
          const name = g("cf-name").value.trim(), dup = S.clientByName(name);
          el.querySelector('[data-f="cf-name"]').classList.toggle("bad", !name); if (!name) return;
          if (dup && (!ex || dup.id !== ex.id)) { UI.toast("Клиент с таким именем уже есть"); return; }
          const c = S.saveClient({ name, phone: g("cf-phone").value, telegram: g("cf-tg").value, instagram: g("cf-ig").value, notes: g("cf-notes").value }, ex && ex.id);
          h.close(); UI.toast("Клиент сохранён"); if (o.onSaved) o.onSaved(c);
        } else if (t.id === "cf-del") {
          if (!(await UI.confirm({ title: "Удалить клиента?", text: "Фотосессии останутся в журнале, но без привязки к карточке клиента.", ok: "Удалить", danger: true }))) return;
          const snap = S.removeClient(ex.id); h.close(); if (o.onDeleted) o.onDeleted();
          UI.toast("Клиент удалён", { action: "Отменить", onAction: () => { S.restoreClient(snap); UI.toast("Клиент возвращён"); } });
        }
      });
    } });
  }

  /* ---------- заявка (ручная запись или правка) ---------- */
  function requestForm(o) {
    o = o || {}; const ex = o.id ? S.request(o.id) : null, v = ex || { name: "", phone: "", typeName: "", date: "", time: "", location: "", comment: "" };
    const names = S.db.types.map((t) => t.name); if (v.typeName && !names.includes(v.typeName)) names.unshift(v.typeName);
    const body = '<form id="rf" novalidate autocomplete="off">' + field("Имя клиента", input("rf-name", v.name, 'maxlength="80" autocapitalize="words"'), "rf-name", "Введите имя") +
      field("Телефон", input("rf-phone", v.phone, 'type="tel" inputmode="tel" maxlength="30"'), "rf-phone") +
      field("Вид съёмки", '<select id="rf-type"><option value="">Не выбран</option>' + names.map((n) => '<option' + (n === v.typeName ? " selected" : "") + ">" + esc(n) + "</option>").join("") + "</select>", "rf-type") +
      '<div class="grid2">' + field("Желаемая дата", input("rf-date", v.date, 'type="date"'), "rf-date") + field("Время", input("rf-time", v.time, 'type="time"'), "rf-time") + "</div>" +
      field("Локация", input("rf-loc", v.location, 'maxlength="160"'), "rf-loc") + field("Комментарий", '<textarea id="rf-com" maxlength="600">' + esc(v.comment) + "</textarea>", "rf-com") + "</form>";
    UI.sheet({ title: ex ? "Изменить заявку" : "Новая запись", body, footer: '<button class="btn" id="rf-save">Сохранить</button>', onOpen(h) {
      const el = h.el, g = (id) => $(el, "#" + id);
      g("rf-save").addEventListener("click", () => {
        const name = g("rf-name").value.trim(); el.querySelector('[data-f="rf-name"]').classList.toggle("bad", !name); if (!name) return;
        S.saveRequest({ name, phone: g("rf-phone").value, typeName: g("rf-type").value, date: g("rf-date").value, time: g("rf-time").value, location: g("rf-loc").value, comment: g("rf-com").value }, ex && ex.id);
        h.close(); UI.toast(ex ? "Заявка изменена" : "Запись добавлена в заявки"); if (o.onSaved) o.onSaved();
      });
    } });
  }

  /* Подтвердить заявку = открыть форму фотосессии с данными заявки */
  function confirmRequest(id) {
    const r = S.request(id); if (!r) return;
    const t = S.typeByName(r.typeName);
    session({ requestId: id, prefill: { date: r.date || U.today(), time: r.time, clientName: r.name, phone: r.phone, typeId: t ? t.id : "other", title: t ? "" : r.typeName, location: r.location, comment: r.comment } });
  }

  return { session, clientForm, requestForm, confirmRequest };
})();
