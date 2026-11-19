# WibeMusic — Telegram Mini App

WibeMusic — стартовый full-stack проект музыкального Mini App для Telegram. Интерфейс на React/Vite, API-прокси на Express, каталог и потоковое аудио из Jamendo API.

## Что уже реализовано

- Telegram WebApp SDK: `ready`, `expand`, цвета интерфейса.
- Поиск по каталогу Jamendo и подборка популярных треков.
- HTML5-плеер: play/pause, следующий/предыдущий, прогресс, громкость, shuffle и repeat.
- Избранное и пользовательские плейлисты (сохранение в localStorage).
- Адаптивный тёмный интерфейс WibeMusic.

## 1. Требования

- Node.js 20+
- Telegram-бот, созданный через [@BotFather](https://t.me/BotFather)
- Jamendo API Client ID: [devportal.jamendo.com](https://devportal.jamendo.com/)

## 2. Установка

```bash
npm install
cp .env.example .env
```

Открой `.env` и укажи свой ключ:

```env
JAMENDO_CLIENT_ID=твой_client_id
PORT=3000
```

Получить Client ID: зарегистрируй приложение на портале Jamendo. В проекте не оставляй тестовый ключ из документации — используй собственные учётные данные и соблюдай актуальные условия Jamendo API.

## 3. Запуск локально

```bash
npm run dev
```

- Frontend: Vite (обычно `http://localhost:5173`)
- Backend: `http://localhost:3000`
- Проверка backend: `http://localhost:3000/api/health`

## 4. Публикация и подключение к Telegram

Telegram Mini App должен открываться по HTTPS адресу. Разверни проект на VPS или платформе, поддерживающей Node.js (например, Render, Railway или свой сервер), добавь переменную `JAMENDO_CLIENT_ID`, собери frontend и запусти сервер:

```bash
npm run build
npm start
```

В Telegram:
1. Открой [@BotFather](https://t.me/BotFather) и создай бота командой `/newbot`.
2. Открой настройки бота → **Bot Settings → Configure Mini App** (или меню Mini App в актуальном интерфейсе BotFather).
3. Укажи HTTPS URL опубликованного приложения.
4. Добавь кнопку меню через `/setmenubutton`, если доступно, и укажи URL Mini App.
5. Открой бота и запусти приложение.

## 5. Музыкальные права и лицензии

Каталог подключён к Jamendo API. API возвращает ссылку на поток `audio` и URL лицензии `license_ccurl`. У разных треков могут быть разные условия Creative Commons. Перед публичным запуском:
- прочитай [Jamendo API Terms of Use](https://developer.jamendo.com/v3.0/docs);
- проверь, допускают ли условия выбранной лицензии именно твой сценарий (публичный сервис, монетизация, реклама, территория, атрибуция);
- не считай трек автоматически разрешённым для коммерческого использования;
- не добавляй скачивание: API отдельно сообщает `audiodownload_allowed`, а разрешение на stream не тождественно разрешению на download.

Текущая реализация предназначена как технический MVP. Перед коммерческим запуском проверь требования Jamendo и при необходимости получи отдельные разрешения правообладателей.

## 6. Что стоит добавить перед production

- Проверку `initData` Telegram на backend (сейчас SDK подключён на клиенте, но серверная авторизация ещё не реализована).
- Хранение профилей, лайков и плейлистов в БД вместо localStorage.
- Rate limiting, логирование, мониторинг и политику конфиденциальности.
- Обработку ошибок аудиопотока и тестирование на iOS/Android Telegram.
- Серверную проверку лицензий/прав для каждого сценария использования.

## Структура

```text
wibemusic/
├── server/index.js
├── src/main.jsx
├── src/style.css
├── vite.config.js
├── .env.example
├── package.json
└── README.md
```
