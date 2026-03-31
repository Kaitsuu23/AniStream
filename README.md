# ⚡ AniStream

Website streaming donghua subtitle Indonesia, scraping data dari [Anichin](https://anichin.moe).

## Tech Stack

- **Backend:** Node.js + Express
- **Scraper:** Axios + Cheerio
- **Frontend:** Vanilla HTML/CSS/JS
- **Deploy:** Vercel

## Fitur

- Home dengan hero slider & anime terbaru
- Daftar ongoing, completed, recent, movies, dropped
- Detail anime + daftar episode
- Player multi-server
- Download per episode
- Search real-time
- Filter by genre, season, studio, dll
- A-Z list
- Jadwal tayang
- History tontonan (localStorage)

## Instalasi Lokal

```bash
git clone https://github.com/username/anistream.git
cd anistream
npm install
npm run dev
```

Buka `http://localhost:3000`

## Deploy ke Vercel

1. Push repo ke GitHub
2. Import di [vercel.com](https://vercel.com)
3. Deploy otomatis — tidak perlu konfigurasi tambahan

## API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/home` | Data halaman utama |
| GET | `/api/ongoing?page=1` | Daftar ongoing |
| GET | `/api/completed?page=1` | Daftar completed |
| GET | `/api/recent?page=1` | Episode terbaru |
| GET | `/api/movies?page=1` | Daftar movies |
| GET | `/api/dropped?page=1` | Daftar dropped |
| GET | `/api/anime/:id` | Detail anime |
| GET | `/api/episode/:id` | Data episode + server |
| GET | `/api/search?q=keyword` | Pencarian |
| GET | `/api/filter` | Filter anime |
| GET | `/api/genres/:id?page=1` | Anime by genre |
| GET | `/api/az/:letter?page=1` | Anime A-Z |
| GET | `/api/popular` | Anime populer |
| GET | `/api/schedule` | Jadwal tayang |

## Disclaimer

Project ini dibuat untuk keperluan belajar. Semua konten milik pemiliknya masing-masing.
