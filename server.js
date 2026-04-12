require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// ENV
const JWT_SECRET = process.env.JWT_SECRET;
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const HEROKU_URL = process.env.HEROKU_URL;

// BOT (Polling)
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

console.log("🤖 Bot Started");

// ================= BOT =================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Use /generate <token>");
});

bot.onText(/\/generate (.+)/, async (msg, match) => {
  const token = match[1].trim();
  const chatId = msg.chat.id;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const batchId = decoded.batchId;

    const payload = {
      batchId,
      validTill: Date.now() + (240 * 60 * 1000)
    };

    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      ENCRYPTION_SECRET
    ).toString();

    const liveUrl = `${HEROKU_URL}/live?enc=${encodeURIComponent(encrypted)}`;

    bot.sendMessage(chatId, `✅ Batch: ${batchId}`, {
      reply_markup: {
        inline_keyboard: [[{ text: "▶️ Join Live", url: liveUrl }]]
      }
    });

  } catch (err) {
    bot.sendMessage(chatId, "❌ Invalid Token");
  }
});

// ================= TOKEN API =================
app.post('/create-token', (req, res) => {
  const { batchId } = req.body;

  if (!batchId) {
    return res.status(400).json({ message: "batchId required" });
  }

  const token = jwt.sign({ batchId }, JWT_SECRET, { expiresIn: "1h" });

  res.json({ token });
});

// ================= PANEL =================
app.get('/panel', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ================= LIVE =================
app.get('/live', (req, res) => {
  const enc = req.query.enc;

  if (!enc) return res.send("Invalid");

  try {
    const bytes = CryptoJS.AES.decrypt(enc, ENCRYPTION_SECRET);
    const data = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    if (data.validTill < Date.now()) {
      return res.send("Link Expired");
    }

    res.send(`<h1>🔴 Live Class - ${data.batchId}</h1>`);
  } catch {
    res.send("Invalid Link");
  }
});

// ================= HOME =================
app.get('/', (req, res) => {
  res.send("Server Running 🚀");
});

// ================= START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});
