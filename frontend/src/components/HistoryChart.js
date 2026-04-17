import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip__time">{label}</p>
        {payload.map(p => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: <strong>{p.value?.toFixed(1)}{p.dataKey === 'temp' ? '°C' : '%'}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function HistoryChart({ greenhouseId, hours = 24 }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('both'); // 'temp', 'hum', 'both'
  const [timeRange, setTimeRange] = useState(24);

  const fetchHistory = async () => {
    if (!greenhouseId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/data/history/${greenhouseId}?hours=${timeRange}&limit=200`);
      const formatted = res.data.map(d => ({
        time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temp: parseFloat(d.temp?.toFixed(1)),
        hum: parseFloat(d.hum?.toFixed(1)),
        night: d.night ? 1 : 0,
      }));
      setData(formatted);
    } catch (e) {
      console.error('Failed to fetch history:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, [greenhouseId, timeRange]);

  if (loading && data.length === 0) {
    return (
      <div className="chart-container chart-loading">
        <div className="loading-pulse">Loading history data...</div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="chart-container chart-empty">
        <p>No historical data available for this greenhouse yet.</p>
        <p className="chart-empty__sub">Data will appear once the ESP32 starts sending readings.</p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-controls">
        <div className="chart-controls__views">
          {['both', 'temp', 'hum'].map(v => (
            <button
              key={v}
              className={`chart-btn ${view === v ? 'active' : ''}`}
              onClick={() => setView(v)}
            >
              {v === 'both' ? 'All' : v === 'temp' ? '🌡️ Temp' : '💧 Humidity'}
            </button>
          ))}
        </div>
        <div className="chart-controls__time">
          {[6, 24, 48].map(h => (
            <button
              key={h}
              className={`chart-btn ${timeRange === h ? 'active' : ''}`}
              onClick={() => setTimeRange(h)}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="temp"
            orientation="left"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
            hide={view === 'hum'}
          />
          <YAxis
            yAxisId="hum"
            orientation="right"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            hide={view === 'temp'}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: '#9ca3af', fontSize: '12px', paddingTop: '12px' }}
          />
          {(view === 'both' || view === 'temp') && (
            <>
              <ReferenceLine yAxisId="temp" y={35} stroke="#f87171" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="temp"
                name="Temperature (°C)"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#f97316' }}
              />
            </>
          )}
          {(view === 'both' || view === 'hum') && (
            <Line
              yAxisId="hum"
              type="monotone"
              dataKey="hum"
              name="Humidity (%)"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#38bdf8' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
