import React from 'react';

export default function SeverityBar({ value }) {
  // Use a bright continuous gradient that shifts based on severity value
  const getGradient = (v) => {
    if (v > 75) return 'linear-gradient(90deg, #F97316, #F43F5E)';
    if (v > 50) return 'linear-gradient(90deg, #F59E0B, #F97316)';
    if (v > 25) return 'linear-gradient(90deg, #10B981, #F59E0B)';
    return 'linear-gradient(90deg, #10B981, #34D399)';
  };
  return (
    <div className="severity-bar-wrap">
      <div className="severity-bar-fill" style={{ width: `${value}%`, background: getGradient(value) }} />
    </div>
  );
}
