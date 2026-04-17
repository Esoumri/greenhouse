const express = require('express');
const router = express.Router();
const { Greenhouse } = require('../models');
const authMiddleware = require('../middleware/auth');

// In-memory fallback
const inMemoryGreenhouses = {};

function mongoose_available() {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
}

// GET /api/greenhouses
router.get('/', async (req, res) => {
  try {
    if (mongoose_available()) {
      const greenhouses = await Greenhouse.find().sort({ lastSeen: -1 });
      return res.json(greenhouses);
    }
    return res.json(Object.values(inMemoryGreenhouses));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/greenhouses/:id — update name/location (admin only)
router.put('/:id', authMiddleware, async (req, res) => {
  const { name, location, description } = req.body;
  try {
    if (mongoose_available()) {
      const gh = await Greenhouse.findOneAndUpdate(
        { greenhouse_id: req.params.id },
        { name, location, description },
        { new: true }
      );
      return res.json(gh);
    }
    if (inMemoryGreenhouses[req.params.id]) {
      Object.assign(inMemoryGreenhouses[req.params.id], { name, location, description });
    }
    return res.json(inMemoryGreenhouses[req.params.id] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports._inMemoryGreenhouses = inMemoryGreenhouses;
