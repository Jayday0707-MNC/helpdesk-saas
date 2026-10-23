const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function makeToken(user) {
  return jwt.sign(
    { id: user.id, orgId: user.org_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Create an organisation and its first admin
router.post('/register', async (req, res) => {
  const { orgName, email, password } = req.body;
  if (!orgName || !email || !password) {
    return res.status(400).json({ error: 'orgName, email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const org = await client.query(
      'INSERT INTO organisations (name) VALUES ($1) RETURNING id',
      [orgName]
    );

    const hash = await bcrypt.hash(password, 10);
    const user = await client.query(
      `INSERT INTO users (org_id, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin') RETURNING id, org_id, email, role`,
      [org.rows[0].id, email.toLowerCase(), hash]
    );

    await client.query('COMMIT');
    res.status(201).json({ token: makeToken(user.rows[0]), user: user.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That email is already registered' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, org_id, email, role, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) return res.status(401).json({ error: 'Wrong email or password' });

    delete user.password_hash;
    res.json({ token: makeToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Quick test that a token works
router.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.email, u.role, o.id AS org_id, o.name AS org_name
     FROM users u JOIN organisations o ON o.id = u.org_id
     WHERE u.id = $1 AND u.org_id = $2`,
    [req.user.id, req.user.orgId]
  );
  res.json(result.rows[0]);
});

module.exports = router;