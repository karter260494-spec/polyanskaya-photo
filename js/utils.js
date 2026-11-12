/* Polyanskaya_Photo — утилиты. Всё приложение живёт в одном пространстве имён window.PP. */
window.PP = window.PP || {};
PP.U = (function () {
  const pad = (n) => String(n).padStart(2, "0");
  const key = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const parse = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const today = () => key(new Date());
  const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return key(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const weekStart = (k) => { const d = parse(k); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return key(d); };
  const monthStart = (k) => k.slice(0, 7) + "-01";
  const monthEnd = (k) => { const d = parse(k); return key(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
  const yearStart = (k) => k.slice(0, 4) + "-01-01";
  const yearEnd = (k) => k.slice(0, 4) + "-12-31";
  const addMonths = (k, n) => { const d = parse(k); return key(new Date(d.getFullYear(), d.getMonth() + n, 1)); };

  const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
  const MON_G = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const MON_S = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const WD_L = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  const WD_S = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const dateLong = (k) => { const d = parse(k); return WD_L[d.getDay()] + ", " + d.getDate() + " " + MON_G[d.getMonth()]; };
  const dateMid = (k) => { const d = parse(k); return d.getDate() + " " + MON_G[d.getMonth()] + " " + d.getFullYear(); };
  const dateShort = (k) => { const d = parse(k); return d.getDate() + " " + MON_S[d.getMonth()]; };
  const monthTitle = (k) => { const d = parse(k); return MONTHS[d.getMonth()] + " " + d.getFullYear(); };
  const dmy = (k) => { const d = parse(k); return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear(); };

  const nf = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
  const money = (n, cur) => nf.format(Math.round(n || 0)).replace(/ | /g, " ") + " " + (cur || (PP.store && PP.store.db.settings.currency) || "₽");
  const num = (n) => nf.format(Math.round(n || 0));
  // "1 ч 30 мин" / "45 мин" / "0 ч"
  const dur = (min) => {
    min = Math.round(min || 0);
    const h = Math.floor(min / 60), m = min % 60;
    if (!h) return m + " мин";
    return m ? h + " ч " + m + " мин" : h + " ч";
  };
  const hours = (min) => { const h = (min || 0) / 60; return (Math.round(h * 10) / 10).toString().replace(".", ",") + " ч"; };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const initials = (n) => { const t = String(n || "?").trim().split(/\s+/); return ((t[0] || "?")[0] + (t[1] ? t[1][0] : "")).toUpperCase(); };
  const toNum = (v) => { const n = parseFloat(String(v == null ? "" : v).replace(/\s/g, "").replace(",", ".")); return isFinite(n) ? n : 0; };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const telHref = (p) => "tel:" + String(p || "").replace(/[^\d+]/g, "");
  const handle = (s) => String(s || "").trim().replace(/^https?:\/\/(t\.me|instagram\.com)\//i, "").replace(/^@/, "").replace(/\/.*$/, "");
  const tgHref = (s) => "https://t.me/" + handle(s);
  const igHref = (s) => "https://instagram.com/" + handle(s);
  const greeting = () => { const h = new Date().getHours(); return h < 5 ? "Доброй ночи!" : h < 12 ? "Доброе утро!" : h < 18 ? "Добрый день!" : "Добрый вечер!"; };

  function download(name, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
  }
  function csvCell(v) { v = String(v == null ? "" : v); return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  const csv = (rows) => "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n");

  return { pad, key, parse, today, addDays, diffDays, weekStart, monthStart, monthEnd, yearStart, yearEnd, addMonths,
    MONTHS, MON_G, MON_S, WD_L, WD_S, dateLong, dateMid, dateShort, monthTitle, dmy, money, num, dur, hours, esc, uid, initials,
    toNum, debounce, telHref, tgHref, igHref, handle, greeting, download, csv };
})();
