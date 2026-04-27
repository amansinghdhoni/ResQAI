import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair } from 'lucide-react';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

L.Marker.prototype.options.icon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

const getIcon = (severity, isAI = false) => {
  let color;
  if (isAI) {
    if (severity > 75) color = '#7C3AED';
    else if (severity > 50) color = '#8B5CF6';
    else color = '#A78BFA';
  } else {
    if (severity > 75) color = '#F43F5E';
    else if (severity > 50) color = '#F97316';
    else if (severity > 25) color = '#F59E0B';
    else color = '#10B981';
  }
  const pulse = severity > 75 ? 'animation:markerPulse 2s infinite;' : '';
  const ring = isAI
    ? 'box-shadow:0 0 0 3px rgba(139,92,246,0.35),0 2px 8px rgba(0,0,0,0.25);'
    : 'box-shadow:0 2px 8px rgba(0,0,0,0.25);';
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background:${color};width:20px;height:20px;border-radius:50%;border:3px solid white;${ring}${pulse}"></div>`,
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

function fmt(n) {
  if (n == null || n === 0) return '—';
  return Number(n).toLocaleString('en-IN');
}

function getIncidentSeverity(incident) {
  const model = Number(incident?.modelSeverityScore);
  if (Number.isFinite(model)) return model;
  const fallback = Number(incident?.severityScore);
  return Number.isFinite(fallback) ? fallback : 0;
}

function getHelpStatus(incident) {
  const assigned = incident?.assignedNGOs?.length || 0;
  const resolved = incident?.resolvedNGOs?.length || 0;
  if ((incident?.severityScore || 0) === 0 || (assigned > 0 && resolved >= assigned)) {
    return { label: 'Situation under control', color: '#059669' };
  }
  if (assigned > 0) {
    return { label: 'Help is coming', color: '#D97706' };
  }
  return { label: 'Awaiting help assignment', color: '#DC2626' };
}

export default function MapView({ incidents = [], onMapClick, interactive = false, userPosition, onLocate }) {
  const defaultCenter = [20.5937, 78.9629];
  const center = userPosition || defaultCenter;

  return (
    <div className="map-wrapper">
      <MapContainer center={center} zoom={userPosition ? 13 : 5} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
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
          (() => {
            const severity = getIncidentSeverity(inc);
            return (
          <Marker
            key={inc.id || inc._clientId || `${inc.location?.lat}-${inc.location?.lng}`}
            position={[inc.location.lat, inc.location.lng]}
            icon={getIcon(severity, inc.aiGenerated)}
          >
            <Popup>
              {(() => {
                const helpStatus = getHelpStatus(inc);
                return (
              <div style={{ minWidth: 200, maxWidth: 260, fontFamily: 'inherit' }}>
                {inc.aiGenerated && (
                  <div style={{ display: 'inline-block', background: '#7C3AED', color: '#fff', fontSize: '0.65rem', fontWeight: 700, borderRadius: 4, padding: '2px 7px', marginBottom: 6, letterSpacing: '0.04em' }}>
                    🤖 AI REPORT
                  </div>
                )}
                <h4 style={{ margin: '0 0 4px', fontSize: '0.92rem', lineHeight: 1.3 }}>{inc.title}</h4>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 5 }}>{inc.disasterType}</div>

                {inc.description && (
                  <p style={{ fontSize: '0.73rem', color: '#475569', margin: '0 0 7px', lineHeight: 1.4 }}>{inc.description}</p>
                )}

                <div style={{ fontWeight: 700, color: severity > 75 ? '#F43F5E' : inc.aiGenerated ? '#7C3AED' : '#10B981', marginBottom: 7, fontSize: '0.82rem' }}>
                  Severity: {severity}%{inc.level ? ` (${inc.level})` : ''}
                </div>

                {inc.aiGenerated ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 10px', fontSize: '0.72rem', color: '#374151', marginBottom: 7 }}>
                      <span>💀 Deaths</span><span style={{ fontWeight: 600 }}>{fmt(inc.confirmedDeaths)}</span>
                      <span>🟢 Rescued</span><span style={{ fontWeight: 600 }}>{fmt(inc.confirmedRescued)}</span>
                      <span>🔴 Awaiting</span><span style={{ fontWeight: 600 }}>{fmt(inc.awaitingRescue)}</span>
                      <span>👥 Affected</span><span style={{ fontWeight: 600 }}>{fmt(inc.totalAffected)}</span>
                    </div>
                    {inc.logistics && (
                      <div style={{ background: '#F1F5F9', borderRadius: 5, padding: '5px 8px', fontSize: '0.7rem', color: '#374151' }}>
                        <div style={{ fontWeight: 700, marginBottom: 3, color: '#1E293B' }}>📦 Logistics Needed</div>
                        <div>💧 Water: {fmt(inc.logistics.freshWater)} L</div>
                        <div>🍱 Food: {fmt(inc.logistics.foodPackets)} pkts</div>
                        <div>🏥 Med Kits: {fmt(inc.logistics.medicalKits)}</div>
                      </div>
                    )}
                    <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: 6 }}>
                      Source: {inc.source || 'AI Deep Search'}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                    📢 {inc.reportCount} reports • 🏢 {inc.assignedNGOs?.length || 0} NGOs
                  </div>
                )}

                <div style={{ marginTop: 7, fontSize: '0.73rem', fontWeight: 700, color: helpStatus.color }}>
                  🚑 {helpStatus.label}
                </div>
              </div>
                );
              })()}
            </Popup>
          </Marker>
            );
          })()
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