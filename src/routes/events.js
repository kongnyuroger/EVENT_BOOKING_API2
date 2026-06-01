const express      = require('express');
const eventService = require('../services/eventService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/events', async (req, res) => {
  const { start, end, limit = 20, offset = 0 } = req.query;

  if ((start && !end) || (!start && end)) {
    return res.status(400).json({ error: 'Provide both start and end for date filtering' });
  }
  if (start && end) {
    if (isNaN(Date.parse(start)) || isNaN(Date.parse(end))) {
      return res.status(400).json({ error: 'Invalid date format for start or end' });
    }
    if (new Date(start) > new Date(end)) {
      return res.status(400).json({ error: 'start must be before end' });
    }
  }

  const lim = parseInt(limit, 10);
  const off = parseInt(offset, 10);
  if (isNaN(lim) || lim < 1 || lim > 100) {
    return res.status(400).json({ error: 'limit must be between 1 and 100' });
  }
  if (isNaN(off) || off < 0) {
    return res.status(400).json({ error: 'offset must be >= 0' });
  }

  try {
    const events = await eventService.listEvents({ start, end, limit: lim, offset: off });
    return res.json(events);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/events/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid event id' });

  try {
    const event = await eventService.getEventById(id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    return res.json(event);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/events', authenticateToken, async (req, res) => {
  const { title, description, date, total_seats } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!date || isNaN(Date.parse(date))) {
    return res.status(400).json({ error: 'Valid date is required' });
  }
  if (new Date(date) <= new Date()) {
    return res.status(400).json({ error: 'Event date must be in the future' });
  }
  if (!Number.isInteger(total_seats) || total_seats < 1) {
    return res.status(400).json({ error: 'total_seats must be a positive integer' });
  }

  try {
    const event = await eventService.createEvent({
      title: title.trim(),
      description,
      date,
      totalSeats: total_seats,
      createdBy: req.user.id,
    });
    return res.status(201).json(event);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/events/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid event id' });

  const { title, description, date, total_seats } = req.body;

  if (date !== undefined) {
    if (isNaN(Date.parse(date))) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    if (new Date(date) <= new Date()) {
      return res.status(400).json({ error: 'Event date must be in the future' });
    }
  }
  if (total_seats !== undefined && (!Number.isInteger(total_seats) || total_seats < 1)) {
    return res.status(400).json({ error: 'total_seats must be a positive integer' });
  }

  const fields = {};
  if (title       !== undefined) fields.title       = title.trim();
  if (description !== undefined) fields.description = description;
  if (date        !== undefined) fields.date        = date;
  if (total_seats !== undefined) fields.totalSeats  = total_seats;

  try {
    const result = await eventService.updateEvent(id, req.user.id, fields);
    if (result.error === 'NOT_FOUND')    return res.status(404).json({ error: 'Event not found' });
    if (result.error === 'FORBIDDEN')    return res.status(403).json({ error: 'Only the event owner can update this event' });
    if (result.error === 'BELOW_BOOKED') return res.status(409).json({ error: 'Cannot reduce total_seats below already-booked seats' });
    if (result.error === 'NO_FIELDS')    return res.status(400).json({ error: 'No fields provided to update' });
    return res.json(result.event);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
