const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['low', 'medium', 'high'];
const isStaff = (role) => role === 'admin' || role === 'agent';

// List tickets (optional ?status= and ?priority= filters)
router.get('/', async (req, res) => {
  const { status, priority } = req.query;
  const params = [req.user.orgId];
  let sql = `SELECT t.*, u.email AS created_by_email
             FROM tickets t JOIN users u ON u.id = t.created_by
             WHERE t.org_id = $1`;

  if (!isStaff(req.user.role)) {
    params.push(req.user.id);
    sql += ` AND t.created_by = $${params.length}`;
  }
  if (status) {
    params.push(status);
    sql += ` AND t.status = $${params.length}`;
  }
  if (priority) {
    params.push(priority);
    sql += ` AND t.priority = $${params.length}`;
  }
  sql += ' ORDER BY t.created_at DESC';

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a ticket
router.post('/', async (req, res) => {
  const { title, description, priority = 'medium' } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (!PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: 'priority must be low, medium or high' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tickets (org_id, title, description, priority, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.orgId, title, description || null, priority, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get one ticket
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const params = [id, req.user.orgId];
  let sql = 'SELECT * FROM tickets WHERE id = $1 AND org_id = $2';
  if (!isStaff(req.user.role)) {
    params.push(req.user.id);
    sql += ' AND created_by = $3';
  }

  try {
    const result = await pool.query(sql, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'Ticket not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update status, priority or assignee (admin and agent only)
router.patch('/:id', async (req, res) => {
  if (!isStaff(req.user.role)) {
    return res.status(403).json({ error: 'Only staff can update tickets' });
  }
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const { status, priority, assigned_to } = req.body;
  if (status !== undefined && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
  }
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: 'priority must be low, medium or high' });
  }

  try {
    // The assignee must be staff in the SAME organisation
    if (assigned_to) {
      const check = await pool.query(
        `SELECT id FROM users
         WHERE id = $1 AND org_id = $2 AND role IN ('admin', 'agent')`,
        [assigned_to, req.user.orgId]
      );
      if (!check.rows[0]) {
        return res.status(400).json({ error: 'assigned_to must be a staff member in your organisation' });
      }
    }

    const fields = [];
    const values = [];
    const add = (col, val) => {
      values.push(val);
      fields.push(`${col} = $${values.length}`);
    };
    if (status !== undefined) add('status', status);
    if (priority !== undefined) add('priority', priority);
    if ('assigned_to' in req.body) add('assigned_to', assigned_to || null);
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    values.push(id, req.user.orgId);
    const result = await pool.query(
      `UPDATE tickets SET ${fields.join(', ')}
       WHERE id = $${values.length - 1} AND org_id = $${values.length}
       RETURNING *`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Ticket not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a ticket (admin only)
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete tickets' });
  }
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    const result = await pool.query(
      'DELETE FROM tickets WHERE id = $1 AND org_id = $2 RETURNING id',
      [id, req.user.orgId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ deleted: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// Counts by status and priority (customers only see their own tickets)
router.get('/stats/summary', async (req, res) => {
  const params = [req.user.orgId];
  let sql = 'SELECT status, priority, assigned_to FROM tickets WHERE org_id = $1';
  if (!isStaff(req.user.role)) {
    params.push(req.user.id);
    sql += ' AND created_by = $2';
  }

  try {
    const { rows } = await pool.query(sql, params);
    const byStatus = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    const byPriority = { high: 0, medium: 0, low: 0 };
    let unassigned = 0;

    for (const t of rows) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      if (!t.assigned_to && t.status !== 'closed') unassigned++;
    }
    res.json({ total: rows.length, unassigned, byStatus, byPriority });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
module.exports = router;