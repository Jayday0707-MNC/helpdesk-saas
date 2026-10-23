const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

const isStaff = (role) => role === 'admin' || role === 'agent';

// Confirm the ticket is in my org (and mine, if I'm a customer)
async function loadTicket(req) {
  const ticketId = parseInt(req.params.ticketId, 10);
  if (Number.isNaN(ticketId)) return null;

  const params = [ticketId, req.user.orgId];
  let sql = 'SELECT id FROM tickets WHERE id = $1 AND org_id = $2';
  if (!isStaff(req.user.role)) {
    params.push(req.user.id);
    sql += ' AND created_by = $3';
  }
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

// List comments on a ticket
router.get('/', async (req, res) => {
  try {
    const ticket = await loadTicket(req);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const result = await pool.query(
      `SELECT c.id, c.body, c.created_at, u.email AS author_email, u.role AS author_role
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.ticket_id = $1 AND c.org_id = $2
       ORDER BY c.created_at`,
      [ticket.id, req.user.orgId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a comment
router.post('/', async (req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) {
    return res.status(400).json({ error: 'body is required' });
  }

  try {
    const ticket = await loadTicket(req);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const result = await pool.query(
      `INSERT INTO comments (org_id, ticket_id, user_id, body)
       VALUES ($1, $2, $3, $4) RETURNING id, body, created_at`,
      [req.user.orgId, ticket.id, req.user.id, body.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;