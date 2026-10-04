# Loop Logic Technologies website

Front end: `public/` (static HTML/CSS/JS, three.js from CDN).
Back end: `server.js` (Node + Express) serving the site and a `POST /api/contact` endpoint
with validation, honeypot spam trap, rate limiting (5 per 15 min per IP) and optional SMTP email.

## Run
    npm install
    cp .env.example .env    # add SMTP details to receive emails
    npm start               # http://localhost:3000

Messages are always saved to `data/messages.jsonl`. Deploy to any Node host (Render, Railway, Fly.io, a VPS).
