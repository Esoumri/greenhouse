# 🌿 GreenWatch — IoT Smart Greenhouse Monitoring System

A professional, full-stack IoT dashboard for monitoring multiple greenhouses in real time. Built with Node.js, React, MongoDB, WebSockets, and designed for ESP32-based sensor nodes.

---

## 📁 Project Structure

```
greenhouse/
├── backend/                  # Node.js + Express API
│   ├── server.js             # Main server + WebSocket
│   ├── models/index.js       # Mongoose schemas
│   ├── routes/
│   │   ├── auth.js           # Login / Register / JWT
│   │   ├── data.js           # POST /api/data + history
│   │   └── greenhouse.js     # Greenhouse metadata
│   ├── middleware/auth.js    # JWT middleware
│   ├── services/emailService.js  # Nodemailer intrusion alerts
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                 # React dashboard
│   ├── src/
│   │   ├── App.js / App.css  # Root + all styles
│   │   ├── context/AuthContext.js
│   │   ├── hooks/useWebSocket.js
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   └── Dashboard.js
│   │   └── components/
│   │       ├── GreenhouseCard.js
│   │       └── HistoryChart.js
│   ├── Dockerfile
│   └── .env.example
│
├── esp32_firmware/
│   └── greenhouse_sensor.ino  # Arduino sketch for ESP32
│
└── docker-compose.yml
```

---

## 🚀 Quick Start

### Option A — Docker (Recommended)

```bash
# 1. Clone and enter the project
cd greenhouse

# 2. Copy and configure environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your email credentials

# 3. Launch everything
docker-compose up -d

# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
```

### Option B — Local Development

**Backend:**
```bash
cd backend
cp .env.example .env        # fill in your values
npm install
npm run dev                 # starts on port 5000 with nodemon
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
npm install
npm start                   # starts on port 3000
```

**MongoDB:**  
Make sure MongoDB is running locally:
```bash
mongod --dbpath /data/db
```
Or use MongoDB Atlas — just set `MONGODB_URI` in backend `.env`.

---

## 🔑 Authentication

The app uses JWT authentication. On first run:

1. Go to `http://localhost:3000`
2. Click **Register** and create your admin account
3. Or use the demo credentials: `admin@greenhouse.com` / `admin123`

> **Note:** The demo account is auto-created only when MongoDB is unavailable (in-memory fallback mode).

---

## 📡 API Reference

### POST /api/data
Receives sensor readings from ESP32 nodes.

```bash
curl -X POST http://localhost:5000/api/data \
  -H "Content-Type: application/json" \
  -d '{
    "greenhouse_id": "GH-001",
    "temp": 24.5,
    "hum": 65.2,
    "open": false,
    "intrusion": false,
    "night": false
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `greenhouse_id` | string | ✅ | Unique ID for the greenhouse unit |
| `temp` | number | ✅ | Temperature in Celsius |
| `hum` | number | ✅ | Relative humidity (0–100) |
| `open` | boolean | | Vent/door is open |
| `intrusion` | boolean | | Motion/intrusion detected |
| `night` | boolean | | Nighttime mode active |

### GET /api/data/latest
Returns the most recent reading per greenhouse.

### GET /api/data/history/:greenhouse_id?hours=24&limit=100
Returns historical data for charts.

### POST /api/auth/login
```json
{ "email": "admin@greenhouse.com", "password": "admin123" }
```
Returns `{ token, user }`.

---

## 🔌 WebSocket

Connect to `ws://localhost:5000/ws` for real-time updates.

**Messages you'll receive:**

```json
// New sensor reading
{ "type": "sensor_update", "data": { "greenhouse_id": "GH-001", "temp": 24.5, ... } }

// Intrusion alert (night + intrusion both true)
{ "type": "intrusion_alert", "data": { "greenhouse_id": "GH-001", "timestamp": "..." } }
```

---

## 🚨 Email Alerts

When `intrusion = true` AND `night = true`, an email is sent automatically.

Configure in `backend/.env`:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password    # Gmail: use App Password, not account password
EMAIL_TO=alerts@yourcompany.com
```

> **Gmail setup:** Enable 2FA → Google Account → Security → App Passwords → Generate one for "Mail"

Alert emails have a **5-minute cooldown per greenhouse** to prevent spam.

---

## 🔧 ESP32 Setup

1. Open `esp32_firmware/greenhouse_sensor.ino` in Arduino IDE
2. Install libraries:
   - `DHT sensor library` by Adafruit
   - `ArduinoJson` by Benoit Blanchon
   - `HTTPClient` (built into ESP32 core)
3. Edit the config section:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   const char* API_URL       = "http://YOUR_SERVER_IP:5000/api/data";
   const char* GREENHOUSE_ID = "GH-001";
   ```
4. Flash to your ESP32

**Wiring:**
| Component | ESP32 Pin |
|-----------|-----------|
| DHT22 data | GPIO 4 |
| Door sensor | GPIO 14 |
| PIR sensor | GPIO 27 |
| LDR (analog) | GPIO 34 |

---

## 🌡️ Dashboard Features

- **Multi-greenhouse grid** — all units visible at a glance
- **Real-time updates** via WebSocket (falls back to 10s polling)
- **Color-coded metrics** — green/yellow/red by temperature range
- **Status badges** — DAY/NIGHT, OPEN/CLOSED
- **Intrusion alerts** — red pulsing card + banner notification
- **History chart** — 6h / 24h / 48h temperature & humidity graphs
- **Filter** greenhouses by ID
- **Stale detection** — cards dim if no data for 5+ minutes
- **Responsive design** — works on mobile

---

## 📊 Simulating Data (Testing)

Test without hardware using curl:

```bash
# Normal daytime reading
curl -X POST http://localhost:5000/api/data \
  -H "Content-Type: application/json" \
  -d '{"greenhouse_id":"GH-001","temp":23.4,"hum":58.0,"open":false,"intrusion":false,"night":false}'

# Trigger an intrusion alert!
curl -X POST http://localhost:5000/api/data \
  -H "Content-Type: application/json" \
  -d '{"greenhouse_id":"GH-001","temp":22.1,"hum":60.0,"open":true,"intrusion":true,"night":true}'

# Second greenhouse
curl -X POST http://localhost:5000/api/data \
  -H "Content-Type: application/json" \
  -d '{"greenhouse_id":"GH-002","temp":31.2,"hum":72.5,"open":true,"intrusion":false,"night":false}'
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Recharts, Axios |
| Backend | Node.js, Express 4 |
| Database | MongoDB + Mongoose (in-memory fallback) |
| Real-time | WebSocket (ws library) |
| Auth | JWT + bcryptjs |
| Email | Nodemailer |
| Hardware | ESP32 + DHT22 + PIR + LDR |
| Deploy | Docker + Docker Compose + Nginx |

---

## 📄 License
MIT
