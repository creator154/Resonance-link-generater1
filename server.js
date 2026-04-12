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

const HEROKU_URL = `https://${process.env.HEROKU_APP_NAME || 'your-app-name'}.herokuapp.com`; // Heroku app name daal do

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN missing in Config Vars");
}

// Telegram Bot - Webhook Mode (Heroku ke liye best)
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);
const webhookPath = `/bot${TELEGRAM_BOT_TOKEN}`;
const webhookUrl = `\( {HEROKU_URL} \){webhookPath}`;

bot.setWebHook(webhookUrl).then(() => {
  console.log(`🤖 Webhook set successfully: ${webhookUrl}`);
}).catch(err => {
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
      validTill: Date.now() + (240 * 60 * 1000), // 4 hours
      timestamp: Date.now()
    };

    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), ENCRYPTION_SECRET).toString();
    const liveUrl = `\( {HEROKU_URL}/live?enc= \){encodeURIComponent(encrypted)}`;

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

// Webhook route for Telegram
app.post(webhookPath, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ====================== Old Routes (JWT + Live Player) ======================
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: "Token required" });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid token" });
  }
};

app.post('/login', (req, res) => { /* purana login code same rakh sakte ho */ });

app.post('/generate-link', authenticateJWT, (req, res) => { /* purana generate-link */ });

app.get('/live', (req, res) => {
  const enc = req.query.enc;
  if (!enc) return res.status(400).send("<h2>❌ Invalid Link</h2>");

  try {
    const bytes = CryptoJS.AES.decrypt(enc, ENCRYPTION_SECRET);
    const data = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    if (data.validTill < Date.now()) {
      return res.send("<h2>❌ Link Expired</h2>");
    }

    res.send(`<h1>🔴 Live Class - Batch ${data.batchId}</h1><p>Player yahan aayega (abhi basic)</p>`);
  } catch (e) {
    res.send("<h2>❌ Invalid Link</h2>");
  }
});

app.get('/', (req, res) => {
  res.json({ message: "Server + Telegram Bot (Webhook) Running" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 Webhook active`);
});  res.json({ message: "Server + Telegram Bot (Webhook) Running" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 Webhook active`);
});        </div>
        <script>
          // Basic anti-download protection
          document.addEventListener('contextmenu', e => e.preventDefault());
        </script>
      </body>
      </html>
    `);
  } catch (e) {
    res.status(403).send("<h2>❌ Invalid or Tampered Link</h2>");
  }
});

// Root check
app.get('/', (req, res) => {
  res.json({
    message: "PW Live Class Server is Running",
    endpoints: {
      login: "POST /login",
      generate: "POST /generate-link (with JWT)",
      live: "GET /live?enc=..."
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Test: http://localhost:${PORT}`);
});
