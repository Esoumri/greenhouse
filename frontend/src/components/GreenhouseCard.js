import React from 'react';

const getTempColor = (temp) => {
  if (temp < 15) return '#60a5fa';
  if (temp < 25) return '#34d399';
  if (temp < 35) return '#fbbf24';
  return '#f87171';
};

const getHumColor = (hum) => {
  if (hum < 30) return '#fbbf24';
  if (hum < 70) return '#34d399';
  return '#60a5fa';
};

export default function GreenhouseCard({ data, name, onClick, isSelected }) {
  const { greenhouse_id, temp, hum, open, intrusion, night, timestamp } = data;
  const hasAlert = intrusion && night;
  const lastUpdate = timestamp ? new Date(timestamp) : null;
  const isStale = lastUpdate && (Date.now() - lastUpdate.getTime()) > 5 * 60 * 1000;

  return (
    <div
      className={`gh-card ${hasAlert ? 'gh-card--alert' : ''} ${isSelected ? 'gh-card--selected' : ''} ${isStale ? 'gh-card--stale' : ''}`}
      onClick={onClick}
    >
      {hasAlert && (
        <div className="alert-banner">
          <span className="alert-icon">🚨</span>
          <span>INTRUSION DETECTED</span>
        </div>
      )}

      <div className="gh-card__header">
        <div className="gh-card__title">
          <span className="gh-id-badge">{greenhouse_id}</span>
          <span className="gh-name">{name || `Greenhouse ${greenhouse_id}`}</span>
        </div>
        <div className="gh-card__badges">
          <span className={`badge badge--${night ? 'night' : 'day'}`}>
            {night ? '🌙 NIGHT' : '☀️ DAY'}
          </span>
          <span className={`badge badge--${open ? 'open' : 'closed'}`}>
            {open ? '🔓 OPEN' : '🔒 CLOSED'}
          </span>
        </div>
      </div>

      <div className="gh-card__metrics">
        <div className="metric">
          <div className="metric__icon" style={{ color: getTempColor(temp) }}>🌡️</div>
          <div className="metric__value" style={{ color: getTempColor(temp) }}>
            {typeof temp === 'number' ? temp.toFixed(1) : '--'}°C
          </div>
          <div className="metric__label">Temperature</div>
          <div className="metric__bar">
            <div
              className="metric__bar-fill"
              style={{
                width: `${Math.min(100, (temp / 50) * 100)}%`,
                background: getTempColor(temp)
              }}
            />
          </div>
        </div>

        <div className="metric">
          <div className="metric__icon" style={{ color: getHumColor(hum) }}>💧</div>
          <div className="metric__value" style={{ color: getHumColor(hum) }}>
            {typeof hum === 'number' ? hum.toFixed(1) : '--'}%
          </div>
          <div className="metric__label">Humidity</div>
          <div className="metric__bar">
            <div
              className="metric__bar-fill"
              style={{
                width: `${Math.min(100, hum)}%`,
                background: getHumColor(hum)
              }}
            />
          </div>
        </div>
      </div>

      <div className="gh-card__footer">
        <div className={`status-dot ${isStale ? 'status-dot--stale' : 'status-dot--live'}`} />
        <span className="gh-card__timestamp">
          {lastUpdate
            ? isStale
              ? `Last seen ${Math.floor((Date.now() - lastUpdate.getTime()) / 60000)}m ago`
              : `Updated ${lastUpdate.toLocaleTimeString()}`
            : 'No data'}
        </span>
        {intrusion && !night && (
          <span className="warning-tag">⚠️ Motion detected</span>
        )}
      </div>
    </div>
  );
}
