// src/app.js
const express = require('express');
const app = express();
const authRoutes = require('./routes/authRoutes');
const certificateRoutes = require('./routes/certificateRoutes');

// Parse JSON bodies
app.use(express.json());

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/certificate', certificateRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
