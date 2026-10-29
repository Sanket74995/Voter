const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/auth.routes');
const electionRoutes = require('./src/routes/election.routes');
const partyRoutes = require('./src/routes/party.routes');
const eligibilityRoutes = require('./src/routes/eligibility.routes');
const ballotRoutes = require('./src/routes/ballot.routes');
const resultsRoutes = require('./src/routes/results.routes');

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Root and Health check endpoints
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'UP',
    message: 'Civic Voting Backend API is running live 24/7 on Render',
    health: '/health',
    version: '1.0.0',
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'Blockchain-Based Voting Backend API',
    version: '1.0.0',
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/eligibility', eligibilityRoutes);
app.use('/api/ballots', ballotRoutes);
app.use('/api/results', resultsRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server if not imported by test suite
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(env.PORT, () => {
      console.log(`[Backend Server] Running on http://127.0.0.1:${env.PORT} in ${env.NODE_ENV} mode`);
    });
  });
}

module.exports = app;
