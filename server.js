require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const HEROKU_URL = `https://${process.env.HEROKU_APP_NAME || 'your-app-name'}.herokuapp.com`;

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN missing in Config Vars");
}

// Telegram Bot - Webhook Mode
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

const webhookPath = `/bot${TELEGRAM_BOT_TOKEN}`;
const webhookUrl = `${HEROKU_URL}${webhookPath}`; // ✅ FIX

bot.setWebHook(webhookUrl)
  .then(() => {
    console.log(`🤖 Webhook set successfully: ${webhookUrl}`);
  })
  .catch(err => {
    console.error("Webhook set error:", err);
  });

// Bot Commands
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "✅ Welcome!\nBatch ID se live link generate karne ke liye:\n/generate <batchId>");
});

bot.onText(/\/generate (.+)/, async (msg, match) => {
  const batchId = match[1].trim();
  const chatId = msg.chat.id;

  try {
    const payload = {
      batchId,
      validTill: Date.now() + (240 * 60 * 1000),
      timestamp: Date.now()
    };

    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      ENCRYPTION_SECRET
    ).toString();

    const liveUrl = `${HEROKU_URL}/live?enc=${encodeURIComponent(encrypted)}`; // ✅ FIX

    const inlineKeyboard = {
      inline_keyboard: [[{ text: "▶️ Live Class Join Karo", url: liveUrl }]]
    };

    await bot.sendMessage(chatId, `✅ Batch: ${batchId}\n🔴 Live Class Link Ready!`, {
      reply_markup: inlineKeyboard
    });

    console.log(`✅ Link generated for batch: ${batchId}`);
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Error: Link generate nahi ho saka");
  }
});

// Webhook route
app.post(webhookPath, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Routes
app.get('/live', (req, res) => {
  const enc = req.query.enc;
  if (!enc) return res.status(400).send("<h2>❌ Invalid Link</h2>");

  try {
    const bytes = CryptoJS.AES.decrypt(enc, ENCRYPTION_SECRET);
    const data = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    if (data.validTill < Date.now()) {
      return res.send("<h2>❌ Link Expired</h2>");
    }

    res.send(`<h1>🔴 Live Class - Batch ${data.batchId}</h1><p>Player yahan aayega</p>`);
  } catch (e) {
    res.send("<h2>❌ Invalid Link</h2>");
  }
});

app.get('/', (req, res) => {
  res.json({ message: "Server + Telegram Bot Running" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
