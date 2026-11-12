/* Настройки Polyanskaya_Photo. Здесь НЕТ секретов: токен бота хранится только в Cloudflare Worker. */
window.PP_CONFIG = {
  // Адрес вашего Cloudflare Worker, например "https://polyanskaya-booking.ИМЯ.workers.dev"
  // Пока пусто — онлайн-запись выключена (форма покажет подсказку), приложение работает как обычно.
  BOOKING_ENDPOINT: "polyanskaya-booking.karter260494.workers.dev",

  // Виды съёмок, которые видит клиент на странице записи
  BOOKING_TYPES: ["Love Story", "Семейная", "Портретная", "Индивидуальная", "Свадебная", "Коммерческая", "Мероприятие"],

  // Необязательно: ваш Telegram для кнопки «Написать фотографу» на странице записи (без @)
  CONTACT_TELEGRAM: "https://t.me/polyanskaya_ph"
};
