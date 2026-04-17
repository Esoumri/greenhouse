const express = require('express');
const router = express.Router();
const { SensorData, Greenhouse } = require('../models');
const { sendIntrusionAlert } = require('../services/emailService');

// In-memory fallback store
const inMemoryData = [];
const MAX_MEMORY_RECORDS = 10000;

function mongoose_available() {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
}

// POST /api/data — ESP32 sends sensor readings
router.post('/', async (req, res) => {
  const { temp, hum, open, intrusion, night, greenhouse_id } = req.body;

  if (temp === undefined || hum === undefined || !greenhouse_id) {
    return res.status(400).json({ error: 'temp, hum, and greenhouse_id are required' });
  }

  const payload = {
    greenhouse_id,
    temp: parseFloat(temp),
    hum: parseFloat(hum),
    open: Boolean(open),
    intrusion: Boolean(intrusion),
    night: Boolean(night),
    timestamp: new Date()
  };

  try {
    let savedData;

    if (mongoose_available()) {
      savedData = await SensorData.create(payload);
      // Upsert greenhouse metadata
      await Greenhouse.findOneAndUpdate(
        { greenhouse_id },
        { greenhouse_id, lastSeen: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else {
      // In-memory store with ID
      savedData = { ...payload, _id: Date.now().toString() };
      inMemoryData.push(savedData);
      if (inMemoryData.length > MAX_MEMORY_RECORDS) inMemoryData.shift();
    }

    // Broadcast to WebSocket clients
    const broadcast = req.app.get('broadcast');
    if (broadcast) {
      broadcast({ type: 'sensor_update', data: savedData });
    }

    // 🚨 Intrusion alert
    if (intrusion && night) {
      sendIntrusionAlert(payload).catch(console.error);
      broadcast && broadcast({ type: 'intrusion_alert', data: { greenhouse_id, timestamp: payload.timestamp } });
    }

    res.status(201).json({ success: true, data: savedData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/data/latest — latest reading per greenhouse
router.get('/latest', async (req, res) => {
  try {
    if (mongoose_available()) {
      const latest = await SensorData.aggregate([
        { $sort: { timestamp: -1 } },
        { $group: { _id: '$greenhouse_id', latest: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$latest' } }
      ]);
      return res.json(latest);
    } else {
      // In-memory: group by greenhouse_id and get latest
      const grouped = {};
      inMemoryData.forEach(d => {
        if (!grouped[d.greenhouse_id] || d.timestamp > grouped[d.greenhouse_id].timestamp) {
          grouped[d.greenhouse_id] = d;
        }
      });
      return res.json(Object.values(grouped));
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/data/history/:greenhouse_id — history for graphs
router.get('/history/:greenhouse_id', async (req, res) => {
  const { greenhouse_id } = req.params;
  const { limit = 100, hours = 24 } = req.query;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  try {
    if (mongoose_available()) {
      const data = await SensorData.find({
        greenhouse_id,
        timestamp: { $gte: since }
      })
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .lean();
      return res.json(data.reverse());
    } else {
      const data = inMemoryData
        .filter(d => d.greenhouse_id === greenhouse_id && new Date(d.timestamp) >= since)
        .slice(-parseInt(limit));
      return res.json(data);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/data/greenhouses — list of unique greenhouse IDs
router.get('/greenhouses', async (req, res) => {
  try {
    if (mongoose_available()) {
      const ids = await SensorData.distinct('greenhouse_id');
      return res.json(ids);
    } else {
      const ids = [...new Set(inMemoryData.map(d => d.greenhouse_id))];
      return res.json(ids);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports._inMemoryData = inMemoryData; // for testing/demo
