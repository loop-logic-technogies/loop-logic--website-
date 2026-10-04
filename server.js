require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });

app.set('trust proxy', 1);

// Security headers (CSP allows only the fonts and three.js the site uses)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ['https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
    },
  },
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

// 5 messages per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Email is optional: only enabled when SMTP_HOST is set in .env
const mailer = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const clean = (v, max) => String(v || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
const esc = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

app.post('/api/contact', limiter, async (req, res) => {
  const { name, email, message, website } = req.body || {};

  // Honeypot: real visitors never fill the hidden "website" field
  if (website) return res.json({ ok: true });

  const n = clean(name, 100);
  const e = clean(email, 150);
  const m = String(message || '').trim().slice(0, 2000);

  if (!n || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || m.length < 10) {
    return res.status(400).json({
      error: 'Please enter your name, a valid email and a message of at least 10 characters.',
    });
  }

  const entry = { at: new Date().toISOString(), name: n, email: e, message: m };

  try {
    // Always save a copy
    fs.appendFileSync(path.join(DATA, 'messages.jsonl'), JSON.stringify(entry) + '\n');

    // Email it if SMTP is configured
    if (mailer) {
      await mailer.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: process.env.MAIL_TO,
        replyTo: e,
        subject: `New project enquiry from ${n}`,
        text: `${n} <${e}>\n\n${m}`,
        html: `<p><b>${esc(n)}</b> &lt;${esc(e)}&gt;</p><p>${esc(m).replace(/\n/g, '<br>')}</p>`,
      });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Contact error:', err.message);
    res.status(500).json({ error: 'Could not send your message. Please email us directly.' });
  }
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Loop Logic running on http://localhost:${PORT}`));