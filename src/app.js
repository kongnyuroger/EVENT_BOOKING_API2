require('dotenv').config();
const express       = require('express');
const authRoutes    = require('./routes/auth');
const eventRoutes   = require('./routes/events');
const bookingRoutes = require('./routes/bookings');

const app = express();

app.use(express.json());

// Health route at root
app.get('/', (req, res) => {
  res.status(200).json({ status: 'up', message: 'API is healthy' });
});

app.use('/', authRoutes);
app.use('/', eventRoutes);
app.use('/', bookingRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
