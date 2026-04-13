require('dotenv').config();
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const activeLinks = new Map();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const HEROKU_URL = process.env.HEROKU_URL; // ✅ FIXED
const JWT_SECRET = process.env.JWT_SECRET;

// ===== BOT =====
const bot = new TelegramBot(TOKEN);

bot.onText(/\/generate (.+)/, (msg, match) => {
  const batchId = match[1].trim();

  const token = jwt.sign(
    { batchId, time: Date.now() },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  activeLinks.set(token, {
    validTill: Date.now() + 3600000,
    ip: null
  });

  const url = `${HEROKU_URL}/live?token=${token}`;

  bot.sendMessage(msg.chat.id, `✅ Batch: ${batchId}`, {
    reply_markup: {
      inline_keyboard: [[{ text: "▶️ Join Class", url }]]
    }
  });
});

// ===== LIVE =====
app.get('/live', (req, res) => {
  const { token } = req.query;

  if (!token || !activeLinks.has(token)) {
    return res.send("❌ Invalid Link");
  }

  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    return res.send("❌ Token Expired");
  }

  const data = activeLinks.get(token);

  if (Date.now() > data.validTill) {
    return res.send("❌ Link Expired");
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

// ===== STREAM =====
app.get('/stream', async (req, res) => {
  const { token } = req.query;

  if (!token || !activeLinks.has(token)) {
    return res.sendStatus(403);
  }

  try {
    const response = await axios({
      url: "https://your-video.m3u8", // 🔥 apna video link daal
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

// ===== AUTO CLEAN =====
setInterval(() => {
  const now = Date.now();
  for (let [token, data] of activeLinks) {
    if (data.validTill < now) {
      activeLinks.delete(token);
    }
  }
}, 60000);

// ===== START =====
app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server Started");
});
