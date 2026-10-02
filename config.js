/*
  Lumori — настройки сайта.
  Здесь можно менять IP, Twitch-каналы и ссылки без правок HTML.
*/
window.LUMORI_CONFIG = {
  serverIp: "mc.lumori.su",
  serverStatusIp: "mc.lumori.su",
  version: "26.3",
  shopUrl: "https://lumori.millida.trade/",

  streamers: {
    dami: {
      channel: "dami_aria",
      twitchUrl: "https://www.twitch.tv/dami_aria"
    },
    marsik: {
      channel: "marsik3773",
      twitchUrl: "https://www.twitch.tv/marsik3773"
    }
  },

  socials: [
    { id: "discord", label: "Discord", url: "", hint: "сообщество" },
    { id: "boosty", label: "Boosty", url: "", hint: "поддержка" },
    { id: "donation", label: "Donation Alerts", url: "", hint: "донаты" },
    { id: "twitch", label: "Twitch", url: "https://www.twitch.tv/dami_aria", hint: "Dami_Aria" },
    { id: "youtube", label: "YouTube", url: "https://www.youtube.com/@marsik3773", hint: "Marsik3773" },
    { id: "telegram", label: "Telegram", url: "", hint: "новости" }
  ]
};
