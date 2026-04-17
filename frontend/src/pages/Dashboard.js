import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import GreenhouseCard from '../components/GreenhouseCard';
import HistoryChart from '../components/HistoryChart';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [greenhouses, setGreenhouses] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/data/latest`);
      const newData = {};
      res.data.forEach(d => { newData[d.greenhouse_id] = d; });
      setGreenhouses(prev => ({ ...prev, ...newData }));
      setLastFetch(new Date());
      if (res.data.length > 0 && !selectedId) {
        setSelectedId(res.data[0].greenhouse_id);
      }
    } catch (e) {
      console.error('Fetch failed:', e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  // WebSocket handler
  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'sensor_update') {
      const d = msg.data;
      setGreenhouses(prev => ({ ...prev, [d.greenhouse_id]: d }));
      if (!selectedId) setSelectedId(d.greenhouse_id);
    }
    if (msg.type === 'intrusion_alert') {
      const alert = {
        id: Date.now(),
        greenhouse_id: msg.data.greenhouse_id,
        time: new Date(msg.data.timestamp).toLocaleTimeString()
      };
      setAlerts(prev => [alert, ...prev].slice(0, 5));
    }
  }, [selectedId]);

  const { connected } = useWebSocket(handleWsMessage);

  useEffect(() => {
    setWsConnected(connected);
  }, [connected]);

  // Polling fallback (every 10s)
  useEffect(() => {
    fetchLatest();
    const interval = setInterval(fetchLatest, 10000);
    return () => clearInterval(interval);
  }, [fetchLatest]);

  const dismissAlert = (id) => setAlerts(prev => prev.filter(a => a.id !== id));

  const filteredGreenhouses = Object.values(greenhouses).filter(gh =>
    !filter || gh.greenhouse_id.toLowerCase().includes(filter.toLowerCase())
  );

  const totalGreenhouses = filteredGreenhouses.length;
  const alertCount = filteredGreenhouses.filter(g => g.intrusion && g.night).length;
  const avgTemp = filteredGreenhouses.length
    ? (filteredGreenhouses.reduce((s, g) => s + g.temp, 0) / filteredGreenhouses.length).toFixed(1)
    : '--';
  const avgHum = filteredGreenhouses.length
    ? (filteredGreenhouses.reduce((s, g) => s + g.hum, 0) / filteredGreenhouses.length).toFixed(1)
    : '--';

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="header-logo">🌿</div>
          <div>
            <h1>GreenWatch</h1>
            <span className="header-sub">IoT Monitoring Dashboard</span>
          </div>
        </div>
        <div className="header-right">
          <div className={`ws-badge ${wsConnected ? 'ws-badge--live' : 'ws-badge--offline'}`}>
            <span className="ws-dot" />
            {wsConnected ? 'LIVE' : 'POLLING'}
          </div>
          <div className="user-menu">
            <span className="user-name">👤 {user?.username}</span>
            <button className="btn-logout" onClick={logout}>Sign Out</button>
          </div>
        </div>
      </header>

      {/* Intrusion Alerts */}
      {alerts.length > 0 && (
        <div className="alert-strip">
          {alerts.map(a => (
            <div key={a.id} className="alert-item">
              <span className="alert-item__icon">🚨</span>
              <span>Intrusion detected in <strong>{a.greenhouse_id}</strong> at {a.time}</span>
              <button onClick={() => dismissAlert(a.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <main className="dashboard-main">
        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat-pill">
            <span className="stat-pill__icon">🏠</span>
            <div>
              <div className="stat-pill__value">{totalGreenhouses}</div>
              <div className="stat-pill__label">Greenhouses</div>
            </div>
          </div>
          <div className={`stat-pill ${alertCount > 0 ? 'stat-pill--alert' : ''}`}>
            <span className="stat-pill__icon">{alertCount > 0 ? '🚨' : '✅'}</span>
            <div>
              <div className="stat-pill__value">{alertCount}</div>
              <div className="stat-pill__label">Active Alerts</div>
            </div>
          </div>
          <div className="stat-pill">
            <span className="stat-pill__icon">🌡️</span>
            <div>
              <div className="stat-pill__value">{avgTemp}°C</div>
              <div className="stat-pill__label">Avg Temperature</div>
            </div>
          </div>
          <div className="stat-pill">
            <span className="stat-pill__icon">💧</span>
            <div>
              <div className="stat-pill__value">{avgHum}%</div>
              <div className="stat-pill__label">Avg Humidity</div>
            </div>
          </div>
          {lastFetch && (
            <div className="stat-pill stat-pill--time">
              <span className="stat-pill__icon">🕒</span>
              <div>
                <div className="stat-pill__value">{lastFetch.toLocaleTimeString()}</div>
                <div className="stat-pill__label">Last Update</div>
              </div>
            </div>
          )}
        </div>

        <div className="dashboard-body">
          {/* Left: Greenhouse Grid */}
          <div className="greenhouse-section">
            <div className="section-header">
              <h2>Greenhouses</h2>
              <input
                className="filter-input"
                type="text"
                placeholder="Filter by ID..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="loading-grid">
                {[...Array(4)].map((_, i) => <div key={i} className="card-skeleton" />)}
              </div>
            ) : filteredGreenhouses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🌱</div>
                <h3>No greenhouses yet</h3>
                <p>Send data from your ESP32 to <code>POST /api/data</code> to get started.</p>
                <div className="empty-example">
                  <pre>{`{
  "greenhouse_id": "GH-001",
  "temp": 24.5,
  "hum": 65.0,
  "open": false,
  "intrusion": false,
  "night": false
}`}</pre>
                </div>
              </div>
            ) : (
              <div className="greenhouse-grid">
                {filteredGreenhouses.map(gh => (
                  <GreenhouseCard
                    key={gh.greenhouse_id}
                    data={gh}
                    isSelected={selectedId === gh.greenhouse_id}
                    onClick={() => setSelectedId(gh.greenhouse_id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Detail Panel */}
          {selectedId && greenhouses[selectedId] && (
            <div className="detail-panel">
              <div className="detail-panel__header">
                <h2>📊 {selectedId} History</h2>
                <button className="btn-close" onClick={() => setSelectedId(null)}>✕</button>
              </div>

              <div className="detail-stats">
                {[
                  { label: 'Current Temp', value: `${greenhouses[selectedId].temp?.toFixed(1)}°C`, icon: '🌡️' },
                  { label: 'Current Humidity', value: `${greenhouses[selectedId].hum?.toFixed(1)}%`, icon: '💧' },
                  { label: 'Vent Status', value: greenhouses[selectedId].open ? 'OPEN' : 'CLOSED', icon: greenhouses[selectedId].open ? '🔓' : '🔒' },
                  { label: 'Light Mode', value: greenhouses[selectedId].night ? 'NIGHT' : 'DAY', icon: greenhouses[selectedId].night ? '🌙' : '☀️' },
                ].map(s => (
                  <div key={s.label} className="detail-stat">
                    <span>{s.icon}</span>
                    <div>
                      <div className="detail-stat__value">{s.value}</div>
                      <div className="detail-stat__label">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <HistoryChart greenhouseId={selectedId} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
