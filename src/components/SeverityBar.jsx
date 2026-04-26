import React from 'react';

export default function SeverityBar({ value }) {
  const getColor = (v) => {
    if (v > 75) return '#EF4444';
    if (v > 50) return '#F97316';
    if (v > 25) return '#F59E0B';
    return '#10B981';
  };
  return (
    <div className="severity-bar-wrap">
      <div className="severity-bar-fill" style={{ width: `${value}%`, background: getColor(value) }} />
    </div>
  );
}
