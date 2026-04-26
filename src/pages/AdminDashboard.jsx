import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { MapPin, AlertCircle, Users, Package, BarChart3, Shield } from 'lucide-react';
import Navbar from '../components/Navbar';
import TabBar from '../components/TabBar';
import MapView from '../components/Map';
import SeverityBar from '../components/SeverityBar';
import FloatingAlert from '../components/FloatingAlert';
import StatCard from '../components/StatCard';
import { assignNGOToIncident } from '../firebase/firestoreHelpers';

export default function AdminDashboard() {
  const { user, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [allVolunteers, setAllVolunteers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [floatingAlert, setFloatingAlert] = useState(null);
  const [userPosition, setUserPosition] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || (user.email !== 'resqaiadmin@gmail.com' && userData?.role !== 'admin'))) navigate('/');
  }, [user, userData, authLoading, navigate]);

  const locateUser = useCallback(() => {
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {}, { enableHighAccuracy: true }
    );
  }, []);
  useEffect(() => { locateUser(); }, [locateUser]);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'incidents'), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setIncidents(data);
      const severe = data.find(i => i.reportCount > 5 && i.severityScore > 50);
      if (severe) setFloatingAlert(`${severe.reportCount} reports: ${severe.disasterType} in ${severe.title}`);
      else setFloatingAlert(null);
    });
    const u2 = onSnapshot(query(collection(db, 'users'), where('role', '==', 'ngo')), (s) => setNgos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(query(collection(db, 'users'), where('role', '==', 'volunteer')), (s) => setAllVolunteers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u4 = onSnapshot(collection(db, 'donations'), (s) => setDonations(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const handleAssign = async (ngoId) => {
    if (!selectedIncident) return;
    await assignNGOToIncident(selectedIncident.id, ngoId);
  };

  const totalDonations = donations.reduce((s, d) => s + (d.amount || 0), 0);
  const activeIncidents = incidents.filter(i => i.severityScore > 0);
  const resolvedIncidents = incidents.filter(i => i.severityScore === 0);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={15} /> },
    { id: 'map', label: 'Command Map', icon: <MapPin size={15} /> },
    { id: 'incidents', label: 'Incidents', icon: <AlertCircle size={15} /> },
    { id: 'ngos', label: 'NGOs', icon: <Shield size={15} /> },
    { id: 'volunteers', label: 'Volunteers', icon: <Users size={15} /> },
  ];

  if (authLoading) return <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>;

  return (
    <div className="app-container">
      <FloatingAlert message={floatingAlert} onClose={() => setFloatingAlert(null)} />
      <Navbar />
      <div style={{ padding: '1rem 1.25rem' }}>
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      <main style={{ padding: '0 1.25rem 1.25rem', flex: 1, overflow: 'auto' }}>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="fade-in">
            <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
              <StatCard icon={<AlertCircle size={36} />} value={incidents.length} label="Total Incidents" />
              <StatCard icon={<AlertCircle size={36} />} value={activeIncidents.length} label="Active Crises" color="#EF4444" />
              <StatCard icon={<Shield size={36} />} value={ngos.length} label="Registered NGOs" />
              <StatCard icon={<Users size={36} />} value={allVolunteers.length} label="Volunteers" />
            </div>
            <div className="grid-3">
              <StatCard icon={<BarChart3 size={36} />} value={resolvedIncidents.length} label="Resolved" color="#10B981" />
              <StatCard icon={<Package size={36} />} value={`₹${totalDonations.toLocaleString()}`} label="Total Donations" color="#8B5CF6" />
              <StatCard icon={<BarChart3 size={36} />} value={incidents.reduce((s, i) => s + (i.reportCount || 0), 0)} label="Total Reports" />
            </div>
          </div>
        )}

        {/* COMMAND MAP */}
        {activeTab === 'map' && (
          <div style={{ height: 'calc(100vh - 180px)' }} className="fade-in">
            <MapView incidents={incidents} interactive={false} userPosition={userPosition} onLocate={locateUser} />
          </div>
        )}

        {/* INCIDENTS */}
        {activeTab === 'incidents' && (
          <div className="fade-in" style={{ display: 'flex', gap: '1.25rem', height: 'calc(100vh - 180px)' }}>
            <div style={{ width: 340, minWidth: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>All Incidents ({incidents.length})</h4>
              {incidents.map(inc => (
                <div key={inc.id} className={`incident-item ${selectedIncident?.id === inc.id ? 'selected' : ''} ${inc.severityScore === 0 ? 'resolved' : ''}`} onClick={() => setSelectedIncident(inc)} style={{ borderLeftColor: inc.severityScore > 75 ? 'var(--severity-critical)' : inc.severityScore > 40 ? 'var(--severity-medium)' : inc.severityScore > 0 ? 'var(--severity-low)' : 'var(--severity-resolved)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ fontSize: '0.82rem' }}>{inc.title}</strong>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: inc.severityScore > 75 ? 'var(--severity-critical)' : 'var(--text-muted)' }}>{inc.severityScore}%</span>
                  </div>
                  <SeverityBar value={inc.severityScore} />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{inc.disasterType} • {inc.reportCount} reports • {inc.assignedNGOs?.length || 0} NGOs</div>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {selectedIncident ? (
                <div className="card fade-in" style={{ padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '0.5rem' }}>{selectedIncident.title}</h3>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🌪 {selectedIncident.disasterType}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📢 {selectedIncident.reportCount} reports</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: selectedIncident.severityScore > 50 ? 'var(--severity-critical)' : 'var(--severity-low)' }}>Severity: {selectedIncident.severityScore}%</span>
                  </div>
                  <SeverityBar value={selectedIncident.severityScore} />
                  <h4 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>Assign NGOs ({selectedIncident.assignedNGOs?.length || 0} assigned)</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {ngos.map(ngo => {
                      const assigned = selectedIncident.assignedNGOs?.includes(ngo.id);
                      const resolved = selectedIncident.resolvedNGOs?.includes(ngo.id);
                      return (
                        <div key={ngo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                          <div>
                            <strong style={{ fontSize: '0.82rem' }}>{ngo.name}</strong>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {ngo.ngoId} • 🍲{ngo.inventory?.food || 0} 👕{ngo.inventory?.clothes || 0} 📦{ngo.inventory?.supplies || 0}</div>
                          </div>
                          {resolved ? (
                            <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600 }}>✅ Resolved</span>
                          ) : assigned ? (
                            <span style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 600 }}>⏳ Assigned</span>
                          ) : (
                            <button className="btn btn-primary btn-sm" onClick={() => handleAssign(ngo.id)}>Assign</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="empty-state" style={{ height: '100%' }}><AlertCircle size={48} /><p>Select an incident to view details and assign NGOs</p></div>
              )}
            </div>
          </div>
        )}

        {/* NGOs */}
        {activeTab === 'ngos' && (
          <div className="fade-in">
            <h3 style={{ marginBottom: '1rem' }}>🏢 Registered NGOs ({ngos.length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {ngos.map(ngo => (
                <div key={ngo.id} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <strong>{ngo.name}</strong>
                    <span className="role-badge" style={{ fontSize: '0.65rem' }}>{ngo.ngoId}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.78rem' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>🍲 Food: <strong>{ngo.inventory?.food || 0}</strong></div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>👕 Clothes: <strong>{ngo.inventory?.clothes || 0}</strong></div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>📦 Supplies: <strong>{ngo.inventory?.supplies || 0}</strong></div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>🏥 Medical: <strong>{ngo.inventory?.medical || 0}</strong></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                    📞 {ngo.phone || 'N/A'} • 📍 {ngo.city || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VOLUNTEERS */}
        {activeTab === 'volunteers' && (
          <div className="fade-in">
            <h3 style={{ marginBottom: '1rem' }}>👥 All Volunteers ({allVolunteers.length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {allVolunteers.map(v => (
                <div key={v.id} className="card" style={{ padding: '1rem' }}>
                  <strong style={{ fontSize: '0.88rem' }}>{v.name}</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>🛠 {v.skills || 'General'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>📍 {v.city || 'N/A'} • 📞 {v.phone || 'N/A'} • {v.availability || 'Available'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
