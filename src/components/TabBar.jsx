import React from 'react';

export default function TabBar({ tabs, activeTab, onTabChange }) {
  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
