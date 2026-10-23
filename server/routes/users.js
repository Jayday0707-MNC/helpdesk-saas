const express = require('express');
const bcrypt = require('bcrypt'); // use 'bcryptjs' if that is what you installed
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const isStaff = (role) => role === 'admin' || role === 'agent';

// List everyone in my organisation (staff only)
router.get('/', async (req, res) => {
  if (!isStaff(req.user.role)) {
    return res.status(403).json({ error: 'Only staff can list users' });
  }
  try {
    const result = await pool.query(
      `SELECT id, email, role, created_at FROM users
       WHERE org_id = $1 ORDER BY created_at`,
      [req.user.orgId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add an agent or customer to my organisation (admin only)
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can add users' });
  }
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'email, password and role are required' });
  }
  if (!['agent', 'customer'].includes(role)) {
    return res.status(400).json({ error: 'role must be agent or customer' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (org_id, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id, email, role`,
      [req.user.orgId, email.toLowerCase(), hash, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That email is already registered' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;