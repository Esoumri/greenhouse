const mongoose = require('mongoose');

// Sensor Data Schema
const sensorDataSchema = new mongoose.Schema({
  greenhouse_id: {
    type: String,
    required: true,
    index: true
  },
  temp: {
    type: Number,
    required: true
  },
  hum: {
    type: Number,
    required: true
  },
  open: {
    type: Boolean,
    default: false
  },
  intrusion: {
    type: Boolean,
    default: false
  },
  night: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

// User Schema (Admin Auth)
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'viewer'],
    default: 'viewer'
  }
}, { timestamps: true });

// Greenhouse Meta Schema
const greenhouseSchema = new mongoose.Schema({
  greenhouse_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    default: function() { return `Greenhouse ${this.greenhouse_id}`; }
  },
  location: String,
  description: String,
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const SensorData = mongoose.model('SensorData', sensorDataSchema);
const User = mongoose.model('User', userSchema);
const Greenhouse = mongoose.model('Greenhouse', greenhouseSchema);

module.exports = { SensorData, User, Greenhouse };
