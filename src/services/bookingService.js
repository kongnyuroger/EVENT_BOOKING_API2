const pool = require('../config/db');

async function bookSeats(eventId, userId, seatsRequested) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT id, available_seats FROM events WHERE id = $1 FOR UPDATE',
      [eventId]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return { error: 'NOT_FOUND' };
    }

    if (rows[0].available_seats < seatsRequested) {
      await client.query('ROLLBACK');
      return { error: 'INSUFFICIENT_SEATS' };
    }

    await client.query(
      'UPDATE events SET available_seats = available_seats - $1 WHERE id = $2',
      [seatsRequested, eventId]
    );

    const booking = await client.query(
      `INSERT INTO bookings (event_id, user_id, seats_booked)
       VALUES ($1, $2, $3) RETURNING *`,
      [eventId, userId, seatsRequested]
    );

    await client.query('COMMIT');
    return { booking: booking.rows[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listOwnBookings(userId, { limit = 20, offset = 0 }) {
  const { rows } = await pool.query(
    `SELECT b.*, e.title AS event_title, e.date AS event_date
     FROM bookings b
     JOIN events e ON e.id = b.event_id
     WHERE b.user_id = $1
     ORDER BY b.booked_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, Number(limit), Number(offset)]
  );
  return rows;
}

async function cancelBooking(bookingId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT * FROM bookings WHERE id = $1 FOR UPDATE',
      [bookingId]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return { error: 'NOT_FOUND' };
    }

    const booking = rows[0];
    if (booking.user_id !== userId) {
      await client.query('ROLLBACK');
      return { error: 'FORBIDDEN' };
    }

    await client.query('DELETE FROM bookings WHERE id = $1', [bookingId]);

    await client.query(
      'UPDATE events SET available_seats = available_seats + $1 WHERE id = $2',
      [booking.seats_booked, booking.event_id]
    );

    await client.query('COMMIT');
    return { cancelled: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { bookSeats, listOwnBookings, cancelBooking };
