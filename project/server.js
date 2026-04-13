require('dotenv').config();
const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const activeLinks = new Map();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const HEROKU_URL = `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`;

// ===== TELEGRAM BOT =====
const bot = new TelegramBot(TOKEN);

// Generate link
bot.onText(/\/generate (.+)/, (msg, match) => {
  const token = Math.random().toString(36).substring(2);

  activeLinks.set(token, {
    validTill: Date.now() + 3600000,
    ip: null
  });

  const url = `${HEROKU_URL}/live?token=${token}`;

  bot.sendMessage(msg.chat.id, "✅ Link Ready", {
    reply_markup: {
      inline_keyboard: [[{ text: "▶️ Join Class", url }]]
    }
  });
});

// ===== LIVE ROUTE =====
app.get('/live', (req, res) => {
  const { token } = req.query;

  if (!token || !activeLinks.has(token)) {
    return res.send("❌ Invalid Link");
  }

  const data = activeLinks.get(token);

  if (Date.now() > data.validTill) {
    return res.send("❌ Expired");
  }

  if (!data.ip) data.ip = req.ip;

  if (data.ip !== req.ip) {
    return res.send("❌ Link Shared");
  }

  res.send(`
    <h2>🔴 Live Class</h2>
    <video controls width="100%" src="/stream?token=${token}"></video>
  `);
});

// ===== STREAM ROUTE =====
app.get('/stream', async (req, res) => {
  const { token } = req.query;

  if (!token || !activeLinks.has(token)) {
    return res.sendStatus(403);
  }

  try {
    const response = await axios({
      url: "https://your-video.m3u8",
      method: "GET",
      responseType: "stream"
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    response.data.pipe(res);

  } catch (err) {
    res.send("Stream error");
  }
});

// ===== HOME =====
app.get('/', (req, res) => {
  res.send("✅ Server Running");
});

// ===== START =====
app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server Started");
});
