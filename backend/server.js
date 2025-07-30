const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Import routes
const fundsRoutes = require('./routes/funds');
const performanceRoutes = require('./routes/performance');
const complianceRoutes = require('./routes/compliance');
const dashboardRoutes = require('./routes/dashboard');
const alternativeInvestmentsRoutes = require('./routes/alternativeInvestments');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database initialization
const dbPath = path.join(__dirname, 'data', 'mutual_funds.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initDatabase = require('./utils/initDatabase');
initDatabase(db);

// Routes
app.use('/api/funds', fundsRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alternative-investments', alternativeInvestmentsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Mutual Fund Analysis Backend running on port ${PORT}`);
  console.log(`📊 API Documentation: http://localhost:${PORT}/api/health`);
});

module.exports = app; 