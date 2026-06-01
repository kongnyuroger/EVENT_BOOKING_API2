const express         = require('express');
const bookingService  = require('../services/bookingService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/events/:id/book', authenticateToken, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) return res.status(400).json({ error: 'Invalid event id' });

  const { seats } = req.body;
  if (!Number.isInteger(seats) || seats < 1) {
    return res.status(400).json({ error: 'seats must be a positive integer' });
  }

  try {
    const result = await bookingService.bookSeats(eventId, req.user.id, seats);
    if (result.error === 'NOT_FOUND')          return res.status(404).json({ error: 'Event not found' });
    if (result.error === 'INSUFFICIENT_SEATS') return res.status(409).json({ error: 'Not enough available seats' });
    return res.status(201).json(result.booking);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/bookings', authenticateToken, async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;

  const lim = parseInt(limit, 10);
  const off = parseInt(offset, 10);
  if (isNaN(lim) || lim < 1 || lim > 100) {
    return res.status(400).json({ error: 'limit must be between 1 and 100' });
  }
  if (isNaN(off) || off < 0) {
    return res.status(400).json({ error: 'offset must be >= 0' });
  }

  try {
    const bookings = await bookingService.listOwnBookings(req.user.id, { limit: lim, offset: off });
    return res.json(bookings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/bookings/:id', authenticateToken, async (req, res) => {
  const bookingId = parseInt(req.params.id, 10);
  if (isNaN(bookingId)) return res.status(400).json({ error: 'Invalid booking id' });

  try {
    const result = await bookingService.cancelBooking(bookingId, req.user.id);
    if (result.error === 'NOT_FOUND') return res.status(404).json({ error: 'Booking not found' });
    if (result.error === 'FORBIDDEN') return res.status(403).json({ error: 'You can only cancel your own bookings' });
    return res.status(200).json({ message: 'Booking cancelled successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
