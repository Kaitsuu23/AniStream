const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS — allow a single origin or a comma-separated list; fallback to '*'
const FRONTEND_URL = process.env.FRONTEND_URL || '*';
const corsOrigins = FRONTEND_URL === '*'
  ? '*'
  : FRONTEND_URL.split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
