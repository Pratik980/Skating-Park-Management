import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes imports
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import branchRoutes from './routes/branches.js';
import ticketRoutes from './routes/tickets.js';
import salesRoutes from './routes/sales.js';
import expenseRoutes from './routes/expenses.js';
import settingsRoutes from './routes/settings.js';
import summaryRoutes from './routes/summary.js';
import backupRoutes from './routes/backup.js';
import pdfRoutes from './routes/pdf.js';

// Config
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
// CORS configuration - allow all origins in development, specific origins in production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, check allowed origins
    const allowedOrigins = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/+$/, ''))
      : ['*'];
    
    // If '*' is in allowed origins, allow all
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    // Check if origin is allowed
    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      console.log('✅ Allowed origins:', allowedOrigins);
      // Still allow for now, but log it
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Log CORS configuration on startup
console.log('🌐 CORS Configuration:');
console.log('   Environment:', process.env.NODE_ENV || 'development');
console.log('   Frontend URL:', process.env.FRONTEND_URL || 'Not set (allowing all origins)');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware (for debugging) - must be before routes
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.originalUrl || req.path}`);
  next();
});

// Database connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.log('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/pdf', pdfRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: '🏒 Skating Park Management System API',
    version: '6.0',
    status: 'Running ✅'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.originalUrl);
  console.log('   Available routes: /api/auth/login, /api/auth/register, etc.');
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
});