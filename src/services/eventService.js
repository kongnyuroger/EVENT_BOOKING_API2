const pool = require('../config/db');

async function listEvents({ start, end, limit = 20, offset = 0 }) {
  const params = [];
  const where  = [];

  if (start && end) {
    params.push(start, end);
    where.push(`date BETWEEN $1 AND $2`);
  }

  const lPos = params.length + 1;
  const oPos = params.length + 2;
  params.push(Number(limit), Number(offset));

  const sql = `
    SELECT * FROM events
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY date ASC
    LIMIT $${lPos} OFFSET $${oPos}
  `;

  const { rows } = await pool.query(sql, params);
  return rows;
}

async function getEventById(id) {
  const { rows } = await pool.query(
    `SELECT e.*,
            COUNT(b.id)                      AS total_bookings,
            COALESCE(SUM(b.seats_booked), 0) AS seats_sold
     FROM events e
     LEFT JOIN bookings b ON b.event_id = e.id
     WHERE e.id = $1
     GROUP BY e.id`,
    [id]
  );
  return rows[0] || null;
}

async function createEvent({ title, description, date, totalSeats, createdBy }) {
  const { rows } = await pool.query(
    `INSERT INTO events (title, description, date, total_seats, available_seats, created_by)
     VALUES ($1, $2, $3, $4, $4, $5)
     RETURNING *`,
    [title, description || null, date, totalSeats, createdBy]
  );
  return rows[0];
}

async function updateEvent(id, userId, fields) {
  const event = await getEventById(id);
  if (!event) return { error: 'NOT_FOUND' };
  if (event.created_by !== userId) return { error: 'FORBIDDEN' };

  if (fields.totalSeats !== undefined) {
    const { rows } = await pool.query(
      'SELECT COALESCE(SUM(seats_booked), 0) AS booked FROM bookings WHERE event_id = $1',
      [id]
    );
    if (fields.totalSeats < Number(rows[0].booked)) {
      return { error: 'BELOW_BOOKED' };
    }
  }

  const setClauses = [];
  const params = [];

  if (fields.title !== undefined)       { params.push(fields.title);       setClauses.push(`title = $${params.length}`); }
  if (fields.description !== undefined) { params.push(fields.description); setClauses.push(`description = $${params.length}`); }
  if (fields.date !== undefined)        { params.push(fields.date);        setClauses.push(`date = $${params.length}`); }
  if (fields.totalSeats !== undefined) {
    const diff = fields.totalSeats - event.total_seats;
    params.push(fields.totalSeats);
    setClauses.push(`total_seats = $${params.length}`);
    params.push(Number(event.available_seats) + diff);
    setClauses.push(`available_seats = $${params.length}`);
  }

  if (setClauses.length === 0) return { error: 'NO_FIELDS' };

  params.push(id);
  const { rows } = await pool.query(
    `UPDATE events SET ${setClauses.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return { event: rows[0] };
}

module.exports = { listEvents, getEventById, createEvent, updateEvent };
