/* Polyanskaya_Photo — публичная страница онлайн-записи.
 * Отправляет заявку на Cloudflare Worker (адрес в ../config.js → BOOKING_ENDPOINT).
 * Токен Telegram-бота здесь НЕТ и быть не должно: его знает только Worker. */
(function () {
  "use strict";
  var cfg = window.PP_CONFIG || {};
  var endpoint = String(cfg.BOOKING_ENDPOINT || "").replace(/\/+$/, "");
  var testMode = /[?&]test=1\b/.test(location.search);
  var $ = function (id) { return document.getElementById(id); };
  var form = $("bf"), send = $("send"), notice = $("notice"), formErr = $("formErr");
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var d0 = new Date(), today = d0.getFullYear() + "-" + pad(d0.getMonth() + 1) + "-" + pad(d0.getDate());

  var ph = document.createElement("option"); ph.value = ""; ph.textContent = "Выберите вид съёмки"; $("type").appendChild(ph);
  (cfg.BOOKING_TYPES || ["Другое"]).forEach(function (t) { var o = document.createElement("option"); o.value = t; o.textContent = t; $("type").appendChild(o); });
  $("date").min = today;

  function setNotice(html) { notice.innerHTML = html; notice.hidden = !html; }
  var tg = String(cfg.CONTACT_TELEGRAM || "").replace(/^@/, "");
  if (!endpoint && !testMode) {
    setNotice("<b>Онлайн-запись сейчас недоступна.</b> " + (tg ? 'Напишите фотографу напрямую: <a style="color:#E58AA2" href="https://t.me/' + encodeURIComponent(tg) + '">@' + tg + "</a>." : "Свяжитесь с фотографом напрямую."));
    Array.prototype.forEach.call(form.elements, function (el) { el.disabled = true; });
  } else if (!endpoint && testMode) {
    setNotice("<b>Тестовый режим.</b> Заявка не уходит на сервер: она сохранится только на этом устройстве и появится в приложении фотографа.");
  }
  if (tg) { var a = $("tgLink"); a.href = "https://t.me/" + encodeURIComponent(tg); a.hidden = false; }

  function bad(name, cond) { var f = form.querySelector('[data-f="' + name + '"]'); if (f) f.classList.toggle("bad", cond); return cond; }
  function showErr(msg) { formErr.textContent = msg; formErr.hidden = !msg; }

  form.addEventListener("input", function (e) { var f = e.target.closest(".field"); if (f) f.classList.remove("bad"); showErr(""); });
  form.addEventListener("change", function (e) { var f = e.target.closest(".field"); if (f) f.classList.remove("bad"); });
  form.addEventListener("submit", function (e) {
    e.preventDefault(); showErr("");
    var v = { name: $("name").value.trim(), phone: $("phone").value.trim(), type: $("type").value, date: $("date").value, time: $("time").value, location: $("location").value.trim(), comment: $("comment").value.trim(), website: $("website").value };
    var errs = [bad("name", !v.name), bad("phone", v.phone.replace(/\D/g, "").length < 6), bad("type", !v.type), bad("date", !v.date || v.date < today)];
    if (errs.some(Boolean)) { var f = form.querySelector(".field.bad"); if (f) f.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
    if (v.website) { return done(); }                       // бот заполнил скрытое поле — делаем вид, что всё хорошо
    send.disabled = true; send.textContent = "Отправляем…";
    if (!endpoint) { saveTest(v); done(); return; }
    var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 15000);
    fetch(endpoint + "/booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v), signal: ctl.signal })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { return { s: r.status, b: b }; }); })
      .then(function (r) {
        if (r.s === 200 && r.b && r.b.ok) return done();
        if (r.s === 429) return fail("Слишком много заявок с этого устройства. Попробуйте чуть позже.");
        if (r.s === 400 && r.b && r.b.error) return fail(r.b.error);
        fail("Не удалось отправить заявку. Попробуйте ещё раз или напишите фотографу напрямую.");
      })
      .catch(function () { fail("Нет связи с сервером. Проверьте интернет и попробуйте ещё раз."); })
      .then(function () { clearTimeout(t); });
  });

  function fail(msg) { showErr(msg); send.disabled = false; send.textContent = "Отправить заявку"; }
  function done() {
    $("formBox").hidden = true; $("done").hidden = false; window.scrollTo(0, 0);
    form.reset(); send.disabled = false; send.textContent = "Отправить заявку";
  }
  $("again").addEventListener("click", function () { $("done").hidden = true; $("formBox").hidden = false; });

  // тестовый режим: приложение фотографа (тот же сайт) подхватит заявку из localStorage
  function saveTest(v) {
    try {
      var list = JSON.parse(localStorage.getItem("pp.testRequests") || "[]");
      list.push({ id: "t" + Date.now().toString(36), name: v.name, phone: v.phone, type: v.type, date: v.date, time: v.time, location: v.location, comment: v.comment, created: new Date().toISOString() });
      localStorage.setItem("pp.testRequests", JSON.stringify(list));
    } catch (e) { /* ignore */ }
  }
})();
