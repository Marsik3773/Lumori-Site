(() => {
  const cfg = window.LUMORI_CONFIG || {};
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const toast = $("#toast");
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  // Основная конфигурация
  const ip = cfg.serverIp || "mc.lumori.su";
  $("#server-ip") && ($("#server-ip").textContent = ip);
  $("#server-ip-bottom").textContent = ip;

  async function copyIp() {
    try {
      await navigator.clipboard.writeText(ip);
      showToast(`IP ${ip} скопирован`);
    } catch {
      const area = document.createElement("textarea");
      area.value = ip;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      showToast(`IP ${ip} скопирован`);
    }
  }
  $("#copy-ip")?.addEventListener("click", copyIp);
  $("#copy-ip-bottom")?.addEventListener("click", copyIp);

  // Ссылка на магазин задаётся в config.js.
  $$('[data-link="shop"]').forEach((link) => {
    if (cfg.shopUrl) {
      link.href = cfg.shopUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    } else {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        showToast("Ссылка на магазин будет добавлена перед запуском");
      });
    }
  });

  // Соцсети
  const icons = {
    discord: "◈",
    boosty: "B",
    donation: "♡",
    twitch: "◒",
    youtube: "▶",
    telegram: "➤"
  };
  const socialGrid = $("#social-grid");
  (cfg.socials || []).forEach((social) => {
    const card = document.createElement(social.url ? "a" : "button");
    card.className = "social-card";
    if (card.tagName === "BUTTON") card.type = "button";
    if (social.url) {
      card.href = social.url;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
    } else {
      card.addEventListener("click", () => showToast(`Ссылка «${social.label}» будет добавлена позже`));
    }
    card.innerHTML = `
      <span class="social-icon" aria-hidden="true">${icons[social.id] || "·"}</span>
      <span class="social-copy"><strong>${social.label}</strong><span>${social.hint || "Lumori"}</span></span>
      <span class="social-arrow" aria-hidden="true">↗</span>`;
    socialGrid?.appendChild(card);
  });

  // Twitch live status через DecAPI — без ключей Twitch.
  // Ответ "offline" означает, что стрим сейчас не идёт.
  const streamers = cfg.streamers || {};
  function setStatus(id, state, label) {
    const el = $(id);
    if (!el) return;
    el.classList.remove("checking", "online", "offline", "error");
    el.classList.add(state);
    const text = el.querySelector("span");
    if (text) text.textContent = label;
  }

  async function checkChannel(key, statusId, cardId) {
    const streamer = streamers[key];
    if (!streamer?.channel) {
      setStatus(statusId, "error", "Нет канала");
      return;
    }
    const card = $(cardId);
    if (card && streamer.twitchUrl) card.href = streamer.twitchUrl;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`https://decapi.me/twitch/uptime/${encodeURIComponent(streamer.channel)}`, {
        signal: controller.signal,
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = (await response.text()).trim();
      const normalized = raw.toLowerCase();
      const offline = normalized.includes("offline") || normalized.includes("not live") || normalized.includes("not online");
      if (offline) {
        setStatus(statusId, "offline", "Не в эфире");
      } else {
        // DecAPI возвращает длительность аптайма, когда канал в эфире.
        setStatus(statusId, "online", "Сейчас в эфире");
      }
    } catch (error) {
      console.warn(`Не удалось проверить Twitch ${streamer.channel}:`, error);
      setStatus(statusId, "error", "Статус недоступен");
    } finally {
      clearTimeout(timeout);
    }
  }

  function refreshLiveStatus() {
    checkChannel("dami", "#dami-status", "#dami-live-card");
    checkChannel("marsik", "#marsik-status", "#marsik-live-card");
  }
  refreshLiveStatus();
  setInterval(refreshLiveStatus, 60_000);


  // Проверяем указанный Minecraft-сервер через публичный API из браузера.
  async function checkServerStatus() {
    const status = $("#server-status");
    const text = $("#server-status-text");
    if (!status || !text) return;

    const setServerStatus = (state, label) => {
      status.classList.remove("server-online", "server-offline", "server-error");
      status.classList.add(`server-${state}`);
      text.textContent = label;
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const statusIp = cfg.serverStatusIp || "mc.lumori.su";
      const response = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(statusIp)}`, {
        signal: controller.signal,
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.online === true) {
        const players = data.players?.online;
        setServerStatus("online", Number.isInteger(players) && players >= 0
          ? `Сервер онлайн · Игроков: ${players}`
          : "Сервер онлайн · Число игроков недоступно");
      } else if (data.online === false) {
        setServerStatus("offline", "Сервер офлайн");
      } else {
        throw new Error("Некорректный ответ API");
      }
    } catch (error) {
      console.warn("Не удалось проверить Minecraft-сервер:", error);
      setServerStatus("error", "Статус сервера недоступен");
    } finally {
      clearTimeout(timeout);
    }
  }

  checkServerStatus();
  setInterval(checkServerStatus, 60000);

  // Ненавязчивое появление блоков при скролле.
  const revealItems = $$(".reveal");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach((el) => observer.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add("visible"));
  }

  // Переключение между двумя отдельными лентами сайта: "О сервере" и "Правила сервера".
  const serverFeeds = $$(".server-feed");
  const rulesFeed = $("#rules-feed");
  const feedButtons = $$('[data-feed]');

  function openFeed(type) {
    const showServer = type === "server";
    serverFeeds.forEach((feed) => {
      feed.style.display = showServer ? "" : "none";
    });
    if (rulesFeed) {
      rulesFeed.style.display = showServer ? "none" : "block";
      if (!showServer) {
        rulesFeed.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
      }
    }

    if (showServer) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      rulesFeed?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  feedButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const type = button.dataset.feed;
      if (!type) return;
      event.preventDefault();
      openFeed(type);
    });
  });

  openFeed("server");

  $("#year").textContent = new Date().getFullYear();
})();


// Список изображений создаётся из содержимого папки assets/gallery при публикации.
(async () => {
  let images = [];
  const gallery = document.querySelector('.about-gallery');
  const lightbox = document.querySelector('#gallery-lightbox');
  if (!gallery || !lightbox) return;
  const preview = gallery.querySelector('#gallery-preview');
  const openButton = gallery.querySelector('.gallery-open');
  const full = lightbox.querySelector('#lightbox-image');
  const dots = gallery.querySelector('.gallery-dots');
  const indicator = document.createElement('span');
  indicator.className = 'gallery-active-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  let index = 0, timer = null, visible = false, animating = false;
  let previousFocus = null, previousOverflow = '';
  const intervalMs = 3000;
  const slideMs = 560;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Два изображения движутся одновременно внутри обрезающей рамки.
  const incoming = document.createElement('img');
  incoming.className = 'gallery-incoming';
  incoming.alt = '';
  incoming.setAttribute('aria-hidden', 'true');
  openButton.insertBefore(incoming, preview.nextSibling);

  function render() {
    if (!images.length) return;
    const src = images[index];
    preview.src = src;
    full.src = src;
    preview.alt = full.alt = `Скриншот сервера Lumori ${index + 1}`;
    gallery.querySelector('.gallery-counter').textContent = `${index + 1} / ${images.length}`;
    lightbox.querySelector('.lightbox-counter').textContent = `${index + 1} / ${images.length}`;
    dots.replaceChildren();
    images.forEach((_, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gallery-dot' + (i === index ? ' active' : '');
      button.setAttribute('aria-label', `Изображение ${i + 1}`);
      if (i === index) button.setAttribute('aria-current', 'true');
      button.addEventListener('click', () => {
        if (i === index) return;
        move(i > index ? 1 : -1, i);
        restartAuto();
      });
      dots.append(button);
    });
    dots.append(indicator);
    setIndicator(index, false);
  }
  function setIndicator(target, animate = true) {
    // Движение бегунка начинается в тот же кадр, что и движение изображения.
    indicator.style.transition = animate && !reducedMotion.matches
      ? `transform ${slideMs}ms cubic-bezier(.22,.68,.2,1)` : 'none';
    const button = dots.querySelectorAll('.gallery-dot')[target];
    if (button) indicator.style.transform = `translateX(${button.offsetLeft}px)`;
    dots.querySelectorAll('.gallery-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === target);
      if (i === target) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }
  function stopAuto() { if (timer !== null) clearInterval(timer); timer = null; }
  function startAuto() {
    stopAuto();
    if (!visible || document.hidden || !lightbox.hidden || images.length < 2) return;
    timer = window.setInterval(() => move(1), intervalMs);
  }
  function restartAuto() { startAuto(); }

  function move(direction, target = (index + direction + images.length) % images.length) {
    if (images.length < 2 || animating || target === index) return;
    if (!lightbox.hidden) {
      index = target;
      render();
      return;
    }
    if (reducedMotion.matches) { index = target; render(); return; }
    animating = true;
    const from = direction > 0 ? '100%' : '-100%';
    const to = direction > 0 ? '-100%' : '100%';
    incoming.src = images[target];
    incoming.style.transition = 'none';
    preview.style.transition = 'none';
    incoming.style.transform = `translateX(${from})`;
    preview.style.transform = 'translateX(0)';
    incoming.classList.add('gallery-incoming-visible');
    // Смена кадров запускается после раскладки начальных позиций.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      incoming.style.transition = `transform ${slideMs}ms cubic-bezier(.22,.68,.2,1)`;
      preview.style.transition = `transform ${slideMs}ms cubic-bezier(.22,.68,.2,1)`;
      incoming.style.transform = 'translateX(0)';
      preview.style.transform = `translateX(${to})`;
      setIndicator(target, true);
    }));
    window.setTimeout(() => {
      index = target;
      preview.style.transition = 'none';
      preview.style.transform = 'translateX(0)';
      incoming.classList.remove('gallery-incoming-visible');
      incoming.style.transition = 'none';
      incoming.style.transform = 'translateX(100%)';
      animating = false;
      render();
    }, slideMs + 65);
  }
  gallery.querySelector('.gallery-prev').addEventListener('click', () => { move(-1); restartAuto(); });
  gallery.querySelector('.gallery-next').addEventListener('click', () => { move(1); restartAuto(); });
  openButton.addEventListener('click', () => {
    if (!images.length || animating) return;
    previousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    stopAuto();
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    render();
    lightbox.querySelector('.lightbox-close').focus();
  });
  function close() {
    lightbox.hidden = true;
    document.body.style.overflow = previousOverflow;
    previousFocus?.focus();
    startAuto();
  }
  lightbox.querySelector('.lightbox-close').addEventListener('click', close);
  lightbox.querySelector('.lightbox-prev').addEventListener('click', () => move(-1));
  lightbox.querySelector('.lightbox-next').addEventListener('click', () => move(1));
  lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', e => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
  });
  for (const element of [gallery, lightbox]) {
    let touchX = null;
    element.addEventListener('touchstart', e => { touchX = e.changedTouches[0].screenX; }, { passive: true });
    element.addEventListener('touchend', e => {
      if (touchX === null) return;
      const delta = e.changedTouches[0].screenX - touchX;
      if (Math.abs(delta) > 45) { move(delta > 0 ? -1 : 1); if (element === gallery) restartAuto(); }
      touchX = null;
    }, { passive: true });
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) startAuto(); else stopAuto();
    }, { threshold: 0.25 });
    observer.observe(gallery);
  } else { visible = true; startAuto(); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAuto(); else startAuto(); });
  try {
    const response = await fetch('assets/gallery/index.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    if (!Array.isArray(manifest)) throw new Error('Некорректный список галереи');
    images = manifest.filter((path) => typeof path === 'string' && path.startsWith('assets/gallery/'));
    if (images.length) {
      openButton.disabled = false;
      render();
      startAuto();
    } else {
      gallery.querySelector('.gallery-counter').textContent = 'Нет изображений';
    }
  } catch (error) {
    console.warn('Не удалось загрузить галерею:', error);
    gallery.querySelector('.gallery-counter').textContent = 'Галерея недоступна';
  }
})();

// Календарный счётчик: полные годы, затем полные месяцы и оставшиеся дни.
(() => {
  const start = new Date(2026, 8, 14); // 14 сентября 2026, местная дата посетителя
  const ids = ['years', 'months', 'days'];
  const forms = [
    ['год', 'года', 'лет'],
    ['месяц', 'месяца', 'месяцев'],
    ['день', 'дня', 'дней']
  ];
  const word = (value, variants) => {
    const n = Math.abs(value) % 100, last = n % 10;
    return variants[n >= 11 && n <= 14 ? 2 : last === 1 ? 0 : last >= 2 && last <= 4 ? 1 : 2];
  };
  function renderServerAge() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let years = 0, months = 0, days = 0;
    if (today >= start) {
      let cursor = new Date(start);
      // Календарные годовщины и месяцы без приближённых 30-дневных интервалов.
      const anniversary = (year, month) => {
        const lastDay = new Date(year, month + 1, 0).getDate();
        return new Date(year, month, Math.min(start.getDate(), lastDay));
      };
      years = today.getFullYear() - start.getFullYear();
      if (anniversary(start.getFullYear() + years, start.getMonth()) > today) years--;
      cursor = anniversary(start.getFullYear() + years, start.getMonth());
      while (months < 11) {
        const next = anniversary(cursor.getFullYear(), cursor.getMonth() + 1);
        if (next > today) break;
        cursor = next;
        months++;
      }
      days = Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())) / 86400000);
    }
    [years, months, days].forEach((value, index) => {
      const number = document.getElementById('server-age-' + ids[index]);
      const label = document.getElementById('server-age-' + ids[index] + '-label');
      if (number) number.textContent = String(value);
      if (label) label.textContent = word(value, forms[index]);
    });
  }
  renderServerAge();
  window.setInterval(renderServerAge, 1000);
})();
