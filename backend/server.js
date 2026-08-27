import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { seedDatabase } from './database/db.js';
import { generalLimiter } from './middleware/rateLimiter.js';

// Route modules
import authRoutes from './routes/auth.js';
import appsRoutes from './routes/apps.js';
import reviewsRoutes from './routes/reviews.js';
import developerRoutes from './routes/developer.js';
import developersRoutes from './routes/developers.js';
import adminRoutes from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Auto-seed Neon PostgreSQL database with default authentic data
(async () => {
  try {
    await seedDatabase();
  } catch (err) {
    console.error('PostgreSQL Database initialization/seed error:', err);
  }
})();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows frontend to load images/videos
}));

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production' || origin.endsWith('.netlify.app') || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    callback(new Error('Blocked by CORS policy'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all API requests
app.use('/api', generalLimiter);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/apps', appsRoutes);
app.use('/api/v1/reviews', reviewsRoutes);
app.use('/api/v1/developer', developerRoutes);
app.use('/api/v1/developers', developersRoutes);
app.use('/api/v1/admin', adminRoutes);

// Root health probe for deployment platforms (Render, Replit, Netlify, etc.)
app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'gastos-store-api' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Gastos App Store API (Neon PostgreSQL)',
    uptime: process.uptime(),
  });
});

// Root API welcome
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'Welcome to Gastos App Store API v1 (PostgreSQL)',
    docs: '/api/v1/apps',
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error Stack]:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏪 Gastos App Store Backend Server (Neon PostgreSQL)
📡 Status: Running on port ${PORT} (0.0.0.0)
🚀 Environment: ${process.env.NODE_ENV || 'development'}
☁️  Database: Neon PostgreSQL
☁️  Storage: Cloudinary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

export default app;
