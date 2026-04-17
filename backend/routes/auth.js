const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const authMiddleware = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'greenhouse_dev_secret_2024';

// In-memory fallback when MongoDB not available
let inMemoryUsers = [];

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    if (mongoose_available()) {
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) return res.status(409).json({ error: 'User already exists' });
      const user = await User.create({ username, email, password: hashedPassword, role: role || 'viewer' });
      const token = jwt.sign({ id: user._id, username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({ token, user: { id: user._id, username, email, role: user.role } });
    } else {
      // In-memory fallback
      if (inMemoryUsers.find(u => u.email === email || u.username === username)) {
        return res.status(409).json({ error: 'User already exists' });
      }
      const user = { id: Date.now().toString(), username, email, password: hashedPassword, role: role || 'admin' };
      inMemoryUsers.push(user);
      const token = jwt.sign({ id: user.id, username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({ token, user: { id: user.id, username, email, role: user.role } });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    let user = null;
    if (mongoose_available()) {
      user = await User.findOne({ email });
    } else {
      user = inMemoryUsers.find(u => u.email === email);
      // Auto-create demo admin account
      if (!user && email === 'admin@greenhouse.com' && password === 'admin123') {
        const hashedPassword = await bcrypt.hash(password, 12);
        user = { id: '1', username: 'admin', email, password: hashedPassword, role: 'admin' };
        inMemoryUsers.push(user);
      }
    }

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id || user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user._id || user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

// Helper
function mongoose_available() {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
}

module.exports = router;
