import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair } from 'lucide-react';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

L.Marker.prototype.options.icon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

const getIcon = (severity) => {
  let color = '#10B981';
  if (severity > 75) color = '#F43F5E';
  else if (severity > 50) color = '#F97316';
  else if (severity > 25) color = '#F59E0B';
  const pulse = severity > 75 ? 'animation:markerPulse 2s infinite;' : '';
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background:${color};width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);${pulse}"></div>`,
    iconSize: [20, 20], iconAnchor: [10, 10],
  });
};

const userIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background:#2563EB;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(37,99,235,0.4);"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

function MapEvents({ onMapClick }) {
  useMapEvents({ click(e) { if (onMapClick) onMapClick(e.latlng); } });
  return null;
}

function LocateControl({ userPos }) {
  const map = useMap();
  useEffect(() => { if (userPos) map.flyTo(userPos, 13, { duration: 1.5 }); }, [userPos, map]);
  return null;
}

export default function MapView({ incidents = [], onMapClick, interactive = false, userPosition, onLocate }) {
  const defaultCenter = [20.5937, 78.9629];
  const center = userPosition || defaultCenter;

  return (
    <div className="map-wrapper">
      <MapContainer center={center} zoom={userPosition ? 13 : 5} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        {/* Bright Voyager tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {interactive && <MapEvents onMapClick={onMapClick} />}
        <LocateControl userPos={userPosition} />

        {userPosition && (
          <>
            <Marker position={userPosition} icon={userIcon}>
              <Popup><strong>Your Location</strong></Popup>
            </Marker>
            <Circle center={userPosition} radius={500} pathOptions={{ color: '#2563EB', fillColor: '#2563EB', fillOpacity: 0.08, weight: 1.5 }} />
          </>
        )}

        {incidents.map((inc) => (
          <Marker key={inc.id} position={[inc.location.lat, inc.location.lng]} icon={getIcon(inc.severityScore)}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>{inc.title}</h4>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 6 }}>{inc.disasterType}</div>
                <div style={{ fontWeight: 700, color: inc.severityScore > 75 ? '#F43F5E' : '#10B981', marginBottom: 6 }}>
                  Severity: {inc.severityScore}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                  📢 {inc.reportCount} reports • 🏢 {inc.assignedNGOs?.length || 0} NGOs
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {onLocate && (
        <button className="map-locate-btn" onClick={onLocate} title="Locate me" style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 999, padding: '10px', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'var(--transition)' }}>
          <Crosshair size={20} color="#2563EB" />
        </button>
      )}
    </div>
  );
}