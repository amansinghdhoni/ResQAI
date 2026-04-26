import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair } from 'lucide-react';

// Fix default markers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

const getIcon = (severity) => {
  let color = '#10B981';
  if (severity > 75) color = '#EF4444';
  else if (severity > 50) color = '#F97316';
  else if (severity > 25) color = '#F59E0B';
  const pulse = severity > 75 ? 'animation:markerPulse 2s infinite;' : '';
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:3px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.4);${pulse}"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9],
  });
};

const userIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background:#3B82F6;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7],
});

function MapEvents({ onMapClick }) {
  useMapEvents({ click(e) { if (onMapClick) onMapClick(e.latlng); } });
  return null;
}

function LocateControl({ userPos }) {
  const map = useMap();
  useEffect(() => {
    if (userPos) map.flyTo(userPos, 13, { duration: 1.5 });
  }, [userPos, map]);
  return null;
}

export default function MapView({ incidents = [], onMapClick, interactive = false, userPosition, onLocate, selectedIncident }) {
  const defaultCenter = [20.5937, 78.9629];
  const center = userPosition || defaultCenter;

  return (
    <div className="map-wrapper">
      <MapContainer center={center} zoom={userPosition ? 13 : 5} style={{ height: '100%', width: '100%', zIndex: 0 }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {interactive && <MapEvents onMapClick={onMapClick} />}
        <LocateControl userPos={userPosition} />

        {userPosition && (
          <>
            <Marker position={userPosition} icon={userIcon}>
              <Popup><div style={{textAlign:'center'}}><strong>Your Location</strong></div></Popup>
            </Marker>
            <Circle center={userPosition} radius={500} pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.08, weight: 1 }} />
          </>
        )}

        {incidents.map((inc) => (
          <Marker key={inc.id} position={[inc.location.lat, inc.location.lng]} icon={getIcon(inc.severityScore)}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>{inc.title}</h4>
                <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 6 }}>{inc.disasterType}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                  <span>Severity</span><span style={{ fontWeight: 700, color: inc.severityScore > 75 ? '#EF4444' : inc.severityScore > 40 ? '#F59E0B' : '#10B981' }}>{inc.severityScore}%</span>
                </div>
                <div style={{ width: '100%', height: 4, background: '#1F2937', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ width: `${inc.severityScore}%`, height: '100%', borderRadius: 99, background: inc.severityScore > 75 ? '#EF4444' : inc.severityScore > 40 ? '#F59E0B' : '#10B981', transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                  📢 {inc.reportCount} reports • 🏢 {inc.assignedNGOs?.length || 0} NGOs assigned
                </div>
                {inc.severityScore === 0 && <div style={{ marginTop: 6, color: '#06B6D4', fontWeight: 600, fontSize: '0.78rem' }}>✅ Resolved</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {onLocate && (
        <button className="map-locate-btn" onClick={onLocate} title="Go to my location">
          <Crosshair size={20} />
        </button>
      )}
    </div>
  );
}
