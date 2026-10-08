LUMORI — сайт сервера
=====================

Готовый статический сайт. Для GitHub Pages выберите Settings → Pages → Source: GitHub Actions.
Workflow .github/workflows/pages.yml собирает список галереи и публикует статические файлы.
Серверная часть не требуется. Статусы запрашиваются браузером у внешних API.
Адрес https://lumori.su/ds перенаправляет на приглашение Discord через статическую страницу ds/index.html.

Быстрые настройки:
1. Откройте config.js.
2. serverIp — IP сервера, который показывают и копируют кнопки (mc.lumori.su).
3. serverStatusIp — адрес Minecraft-сервера для проверки онлайна (сейчас mc.lumori.su).
4. shopUrl — ссылка на магазин.
5. socials — ссылки Discord / Boosty / Donation Alerts / Twitch / YouTube / Telegram.
6. streamers.dami.channel и streamers.marsik.channel — Twitch-логины для live-статуса.

Live-статус:
- Проверяется в браузере примерно раз в 60 секунд через DecAPI.
- Twitch Client ID / Secret не требуются.
- Если сторонний сервис временно недоступен, сайт покажет «Статус недоступен».

Статус Minecraft-сервера:
- Проверяется в браузере через api.mcstatus.io примерно раз в минуту; ответ API может быть кэширован.
- Показывает онлайн и число игроков, офлайн либо недоступность проверки.

Правила:
- В index.html найдите section id="rules".
- Сейчас там стоит готовый дизайн-заполнитель. Его можно заменить полным сводом правил позже.

Изображения:
- assets/site/ — иллюстрации, фоны, иконки и другие изображения оформления сайта.
- assets/site/lumori-planet.png — исходный символ сервера, скопирован без изменения.
- assets/gallery/ — все изображения галереи. Допустимы PNG, JPG, JPEG, WebP, AVIF, GIF, SVG и BMP.
- При публикации GitHub Actions автоматически создаёт assets/gallery/index.json из файлов этой папки в алфавитном порядке. Имена файлов могут быть любыми.
- Для локального просмотра после добавления или удаления изображений выполните node scripts/generate-gallery-manifest.mjs, затем запустите локальный HTTP-сервер.
