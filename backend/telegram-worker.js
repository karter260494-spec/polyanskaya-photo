/**
 * Polyanskaya_Photo — безопасный backend для онлайн-записи (Cloudflare Worker).
 *
 *   страница записи (GitHub Pages) ──POST /booking──▶ Worker ──▶ Telegram Bot API ──▶ личное сообщение фотографу
 *   приложение фотографа ──────────GET /bookings (Bearer ADMIN_TOKEN)──▶ Worker (список заявок из KV)
 *
 * Секреты (НЕ хранятся в репозитории, задаются в Cloudflare):
 *   BOT_TOKEN    — токен бота от @BotFather
 *   CHAT_ID      — ваш Telegram Chat ID
 *   ADMIN_TOKEN  — длинный случайный ключ, которым приложение читает список заявок
 * Переменные (не секретные):
 *   ALLOWED_ORIGIN — адрес вашего сайта на GitHub Pages без слэша на конце, например https://anna.github.io
 *                    (можно несколько через запятую)
 *   APP_URL        — (необязательно) адрес приложения: в Telegram появится кнопка «Открыть приложение»
 * Привязка KV:
 *   BOOKINGS — KV namespace для хранения заявок (90 дней) и счётчиков защиты от спама
 */

const MAX_BODY = 8 * 1024;
const TTL_DAYS = 90;
const RATE_PER_HOUR = 5;       // заявок с одного IP в час
const AUTH_FAILS_PER_HOUR = 20; // неверных ключей с одного IP в час

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dmy = (iso) => iso.split("-").reverse().join(".");

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGIN || "").split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
}
function corsHeaders(req, env) {
  const origin = req.headers.get("Origin");
  const h = { "Vary": "Origin" };
  if (origin && allowedOrigins(env).includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}
function json(body, status, cors) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, cors) });
}

async function sha(s) { return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))); }
async function safeEqual(a, b) {           // сравнение за постоянное время
  const x = await sha(a), y = await sha(b); let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

/* Счётчик попыток в KV (ключ живёт час). Возвращает true, если лимит превышен. */
async function hit(env, name, ip, limit) {
  if (!env.BOOKINGS) return false;
  const key = "rl:" + name + ":" + ip + ":" + Math.floor(Date.now() / 3600000);
  const n = parseInt((await env.BOOKINGS.get(key)) || "0", 10) + 1;
  await env.BOOKINGS.put(key, String(n), { expirationTtl: 3700 });
  return n > limit;
}

/* Проверка и очистка данных заявки. Возвращает {error} или {value}. */
function validate(b) {
  const str = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
  const v = { name: str(b.name, 80), phone: str(b.phone, 30), type: str(b.type, 60), date: str(b.date, 10), time: str(b.time, 5), location: str(b.location, 160), comment: str(b.comment, 600) };
  if (!v.name) return { error: "Введите имя" };
  if (v.phone.replace(/\D/g, "").length < 6 || v.phone.replace(/\D/g, "").length > 18) return { error: "Проверьте номер телефона" };
  if (!v.type) return { error: "Выберите вид съёмки" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || isNaN(Date.parse(v.date))) return { error: "Укажите желаемую дату" };
  const t = Date.parse(v.date), now = Date.now();
  if (t < now - 2 * 86400000) return { error: "Дата не может быть в прошлом" };
  if (t > now + 800 * 86400000) return { error: "Слишком далёкая дата" };
  if (v.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time)) v.time = "";
  return { value: v };
}

function message(b) {
  const L = ["📸 <b>Новая заявка на фотосессию!</b>", "", "👤 Клиент: " + esc(b.name), "📱 Телефон: " + esc(b.phone), "📸 Вид съёмки: " + esc(b.type), "📅 Желаемая дата: " + dmy(b.date)];
  if (b.time) L.push("⏰ Время: " + esc(b.time));
  if (b.location) L.push("📍 Локация: " + esc(b.location));
  if (b.comment) L.push("📝 Комментарий:", esc(b.comment));
  return L.join("\n");
}

async function notify(env, b) {
  if (!env.BOT_TOKEN || !env.CHAT_ID) return false;
  const body = { chat_id: env.CHAT_ID, text: message(b), parse_mode: "HTML", disable_web_page_preview: true };
  if (env.APP_URL) body.reply_markup = { inline_keyboard: [[{ text: "Открыть приложение", url: env.APP_URL }]] };
  try {
    const r = await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/sendMessage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
    return r.ok;
  } catch (e) { return false; }
}

/* Сохраняем заявку в KV. Для списка используем metadata (до 1024 байт), чтобы читать заявки одним запросом. */
async function store(env, b) {
  if (!env.BOOKINGS) return false;
  const enc = new TextEncoder(), meta = { id: b.id, name: b.name, phone: b.phone, type: b.type, date: b.date, time: b.time, location: b.location.slice(0, 80), comment: b.comment, created: b.created };
  while (enc.encode(JSON.stringify(meta)).length > 950 && meta.comment.length > 0) meta.comment = meta.comment.slice(0, Math.max(0, meta.comment.length - 20));
  while (enc.encode(JSON.stringify(meta)).length > 950 && meta.location.length > 0) meta.location = meta.location.slice(0, Math.max(0, meta.location.length - 10));
  try {
    const key = "b:" + String(9e15 - Date.now()).padStart(16, "0") + ":" + b.id;   // новые заявки идут первыми
    await env.BOOKINGS.put(key, JSON.stringify(b), { expirationTtl: TTL_DAYS * 86400, metadata: meta });
    return true;
  } catch (e) { return false; }
}

async function listBookings(env) {
  if (!env.BOOKINGS) return [];
  const out = []; let cursor;
  do {
    const r = await env.BOOKINGS.list({ prefix: "b:", limit: 200, cursor });
    r.keys.forEach((k) => { if (k.metadata) out.push(k.metadata); });
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor && out.length < 200);
  return out;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), cors = corsHeaders(req, env), ip = req.headers.get("CF-Connecting-IP") || "unknown";
    const origin = req.headers.get("Origin");
    const originOk = !origin || allowedOrigins(env).includes(origin);

    if (req.method === "OPTIONS") return new Response(null, { status: originOk ? 204 : 403, headers: cors });
    if (url.pathname === "/health") return json({ ok: true, telegram: !!(env.BOT_TOKEN && env.CHAT_ID), storage: !!env.BOOKINGS }, 200, cors);
    if (!originOk) return json({ ok: false, error: "Этот сайт не разрешён" }, 403, cors);

    /* --- клиент отправляет заявку --- */
    if (url.pathname === "/booking" && req.method === "POST") {
      const raw = await req.text();
      if (raw.length > MAX_BODY) return json({ ok: false, error: "Слишком большой запрос" }, 413, cors);
      let body; try { body = JSON.parse(raw); } catch (e) { return json({ ok: false, error: "Некорректный запрос" }, 400, cors); }
      if (!body || typeof body !== "object") return json({ ok: false, error: "Некорректный запрос" }, 400, cors);
      if (body.website) return json({ ok: true }, 200, cors);                 // ловушка для ботов: молча «успех»
      const v = validate(body); if (v.error) return json({ ok: false, error: v.error }, 400, cors);
      if (await hit(env, "book", ip, RATE_PER_HOUR)) return json({ ok: false, error: "Слишком много заявок" }, 429, cors);
      const b = Object.assign({ id: crypto.randomUUID(), created: new Date().toISOString() }, v.value);
      const [saved, sent] = await Promise.all([store(env, b), notify(env, b)]);
      if (!saved && !sent) return json({ ok: false, error: "Не удалось отправить заявку" }, 502, cors);
      return json({ ok: true }, 200, cors);
    }

    /* --- приложение фотографа забирает заявки --- */
    if (url.pathname === "/bookings" && req.method === "GET") {
      if (!env.ADMIN_TOKEN) return json({ ok: false, error: "ADMIN_TOKEN не задан" }, 503, cors);
      const m = /^Bearer (.+)$/.exec(req.headers.get("Authorization") || "");
      if (!m || !(await safeEqual(m[1], env.ADMIN_TOKEN))) {
        if (await hit(env, "auth", ip, AUTH_FAILS_PER_HOUR)) return json({ ok: false, error: "Слишком много попыток" }, 429, cors);
        return json({ ok: false, error: "Неверный ключ" }, 401, cors);
      }
      return json({ ok: true, bookings: await listBookings(env) }, 200, cors);
    }

    return json({ ok: false, error: "Не найдено" }, 404, cors);
  }
};
