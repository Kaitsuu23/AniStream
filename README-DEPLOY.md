# AniStream — Deployment Guide

AniStream is split into two independent deployments:

- **Backend** — pure Express API, deploy on any VPS (Node.js required)
- **Frontend** — pure static site, deploy on Vercel

---

## Environment Variables Reference

| Variable | Used by | Description |
|---|---|---|
| `CF_WORKER_URL` | Backend & Frontend build | URL of your deployed Cloudflare Worker (proxy) |
| `PORT` | Backend | Port Express listens on (default: 3000) |
| `FRONTEND_URL` | Backend | Allowed CORS origin(s). Single URL or comma-separated list. Default: `*` |
| `BACKEND_URL` | Frontend build | Full URL of the backend API (e.g. `https://api.yourdomain.com`). Leave empty for local dev. |

---

## Backend — Deploy on VPS

The backend is a pure API server (`server.js` + `routes/api.js` + `scraper/anichin.js`).
It exposes all `/api/*` endpoints and a `/health` check.

### Steps

1. **Clone the repo** on your VPS:
   ```bash
   git clone <your-repo-url> /srv/anistream
   cd /srv/anistream
   ```

2. **Install dependencies** (no build step needed for the backend):
   ```bash
   npm install
   ```

3. **Create `.env`** in the project root:
   ```
   CF_WORKER_URL=https://anistream.andhikarafi321.workers.dev/
   PORT=3000
   FRONTEND_URL=https://your-project.vercel.app
   ```
   Set `FRONTEND_URL` to your actual Vercel deployment URL so CORS is restricted.
   You can pass a comma-separated list for multiple origins:
   `FRONTEND_URL=https://your-project.vercel.app,https://your-custom-domain.com`

4. **Start the server dengan PM2**:
   ```bash
   # Install PM2 globally kalau belum ada
   npm install -g pm2

   # Start dengan nama proses
   pm2 start server.js --name anistream-api

   # Simpan daftar proses supaya auto-start setelah reboot
   pm2 save

   # Generate & aktifkan startup script (copy-paste perintah yang dikasih)
   pm2 startup
   ```

   Perintah PM2 berguna lainnya:
   ```bash
   pm2 status              # lihat status semua proses
   pm2 logs anistream-api  # lihat log real-time
   pm2 restart anistream-api
   pm2 stop anistream-api
   pm2 delete anistream-api
   ```

5. **Health check**:
   ```bash
   curl http://localhost:3000/health
   # → {"status":"ok"}
   ```

---

### Expose ke Internet via Cloudflare Tunnel (tanpa buka port / tanpa domain sendiri)

Cloudflare Tunnel gratis dan tidak perlu domain — Cloudflare kasih subdomain `*.trycloudflare.com`.
Kalau punya domain sendiri, bisa di-bind juga.

#### Install cloudflared

```bash
# Ubuntu/Debian
curl -L https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install cloudflared
```

#### Opsi A — Quick tunnel (tanpa login, dapat subdomain random)

```bash
cloudflared tunnel --url http://localhost:3000
```

Output-nya kasih URL seperti `https://something-random.trycloudflare.com`.
Ini cocok buat testing tapi URL berubah setiap kali restart.

#### Opsi B — Tunnel permanen dengan domain (rekomendasi untuk production)

```bash
# 1. Login ke Cloudflare (buka browser, authorize)
cloudflared tunnel login

# 2. Buat tunnel baru
cloudflared tunnel create anistream-api

# 3. Buat config file di ~/.cloudflared/config.yml
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: anistream-api
credentials-file: /root/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
EOF
# Ganti <TUNNEL-ID> dengan ID yang muncul dari step 2
# Ganti api.yourdomain.com dengan subdomain kamu

# 4. Arahkan DNS — tambah CNAME di Cloudflare Dashboard:
#    api.yourdomain.com  →  <TUNNEL-ID>.cfargotunnel.com
# Atau pakai perintah:
cloudflared tunnel route dns anistream-api api.yourdomain.com

# 5. Jalankan tunnel
cloudflared tunnel run anistream-api
```

#### Jalankan cloudflared sebagai service (auto-start dengan PM2)

```bash
# Tambah cloudflared ke PM2 setelah tunnel dikonfigurasi
pm2 start "cloudflared tunnel run anistream-api" --name cloudflare-tunnel
pm2 save
```

Atau pakai systemd bawaan cloudflared:
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

#### Update FRONTEND_URL & BACKEND_URL setelah dapat URL tunnel

Setelah tunnel jalan dan kamu dapat URL-nya (misal `https://api.yourdomain.com`):

1. Update `.env` di VPS:
   ```
   FRONTEND_URL=https://your-project.vercel.app
   ```
2. Update env var `BACKEND_URL` di Vercel Dashboard ke URL tunnel tersebut.
3. Trigger redeploy Vercel supaya `config.js` di-generate ulang dengan URL baru.

---

### Nginx Reverse Proxy (alternatif tanpa Cloudflare Tunnel)

Kalau VPS punya IP publik dan pakai Nginx + Let's Encrypt:

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### Files used by the backend

- `server.js` — Express app entry point
- `routes/api.js` — all API route handlers
- `scraper/anichin.js` — cheerio scraper
- `cf-worker/worker.js` — Cloudflare Worker (deployed separately, unchanged)

---

## Frontend — Deploy on Vercel

The frontend is the `public/` directory. `build.js` bakes environment variables into
`public/js/config.js` at build time so the static files know where the backend lives.

### Steps

1. **Import the repo** into Vercel (or link an existing project).

2. **Set environment variables** in the Vercel project dashboard
   (Settings → Environment Variables):

   | Key | Value |
   |---|---|
   | `BACKEND_URL` | `https://api.yourdomain.com` (no trailing slash) |
   | `CF_WORKER_URL` | `https://anistream.andhikarafi321.workers.dev/` |

3. **Build & output settings** — `vercel.json` already configures these:
   - Build command: `node build.js`
   - Output directory: `public`
   - All page routes are rewritten to the correct HTML files via `rewrites`.

4. **Deploy** — push to your main branch or trigger a manual deploy.
   Vercel will run `node build.js`, which writes `public/js/config.js` with the real values,
   then serves everything in `public/` as a static site.

5. **CORS** — make sure `FRONTEND_URL` on the backend matches your Vercel domain.

### How the config works

`build.js` reads `BACKEND_URL` and `CF_WORKER_URL` from the environment and writes:

```js
// public/js/config.js (generated, not committed with real values)
window.API_BASE_URL = 'https://api.yourdomain.com';
window.CF_WORKER_URL = 'https://anistream.andhikarafi321.workers.dev/';
```

Every HTML page loads this file before `app.js` and `player.js`, so all API fetches
are prefixed with the correct backend URL.

---

## Local Development

Run both backend and frontend locally:

1. **Configure `.env`** in the project root:
   ```
   CF_WORKER_URL=https://anistream.andhikarafi321.workers.dev/
   PORT=3000
   FRONTEND_URL=http://localhost:8080
   # Leave BACKEND_URL unset — empty string means relative URLs (same origin)
   ```

2. **Generate config.js** (uses empty BACKEND_URL → relative API calls):
   ```bash
   node build.js
   ```

3. **Start the API server**:
   ```bash
   node server.js
   # Listening on http://localhost:3000
   ```

4. **Serve the static frontend** on a different port:
   ```bash
   npx serve public -p 8080
   # Open http://localhost:8080
   ```
   The frontend will call `/api/...` (relative), which won't work across origins.
   To test cross-origin locally, set `BACKEND_URL=http://localhost:3000` in `.env`
   and re-run `node build.js`:
   ```bash
   BACKEND_URL=http://localhost:3000 node build.js
   npx serve public -p 8080
   ```
   Requests will go to `http://localhost:3000/api/...` from `http://localhost:8080`.
   Make sure `FRONTEND_URL=http://localhost:8080` is set in `.env` so CORS passes.

5. **After local dev**, restore `public/js/config.js` to its placeholder form before committing:
   ```bash
   node -e "require('fs').writeFileSync('public/js/config.js', \"// Auto-generated by build.js — do not edit manually.\n// Run \`node build.js\` to substitute real values.\nwindow.API_BASE_URL = '%%BACKEND_URL%%';\nwindow.CF_WORKER_URL = '%%CF_WORKER_URL%%';\n\")"
   ```
   Or just run `git checkout public/js/config.js` if you haven't staged it.

---

## Cloudflare Worker

`cf-worker/worker.js` is deployed separately to Cloudflare Workers and is not part of the
Node.js backend. Deploy it once; the URL becomes your `CF_WORKER_URL`.
