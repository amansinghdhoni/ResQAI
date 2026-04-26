import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../firebase/config';
import { collection, onSnapshot, query, where, doc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { MapPin, FileText, Heart, Users, Package, ClipboardList, CheckCircle2, AlertTriangle, HandHelping, Locate } from 'lucide-react';
import Navbar from '../components/Navbar';
import TabBar from '../components/TabBar';
import MapView from '../components/Map';
import Modal from '../components/Modal';
import SeverityBar from '../components/SeverityBar';
import FloatingAlert from '../components/FloatingAlert';
import DonationForm from '../components/DonationForm';
import { submitCitizenReport, assignNGOToIncident, markSituationUnderControl, assignTask, markTaskComplete, updateInventory, createDonation, registerCitizenAsVolunteer } from '../firebase/firestoreHelpers';

export default function Dashboard() {
  const { user, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const role = userData?.role;

  const [incidents, setIncidents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [activeTab, setActiveTab] = useState('map');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [floatingAlert, setFloatingAlert] = useState(null);
  const [inventory, setInventory] = useState(userData?.inventory || { food: 0, clothes: 0, supplies: 0, medical: 0 });
  const [taskForm, setTaskForm] = useState({ volunteerId: '', incidentId: '', description: '' });
  const [myReports, setMyReports] = useState([]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/');
  }, [user, authLoading, navigate]);

  // Geolocation
  const locateUser = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
        () => console.log('Location access denied'),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => { locateUser(); }, [locateUser]);

  // Realtime incidents
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'incidents'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setIncidents(data);
      const severe = data.find(i => i.reportCount > 5 && i.severityScore > 50);
      if (severe) setFloatingAlert(`${severe.reportCount} people reporting ${severe.disasterType} in ${severe.title}!`);
      else setFloatingAlert(null);
    });
    return () => unsub();
  }, []);

  // Realtime tasks for volunteer or NGO
  useEffect(() => {
    if (!user) return;
    let q;
    if (role === 'volunteer') q = query(collection(db, 'tasks'), where('volunteerId', '==', user.uid));
    else if (role === 'ngo') q = query(collection(db, 'tasks'), where('ngoId', '==', user.uid));
    else return;
    const unsub = onSnapshot(q, (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [user, role]);

  // Volunteers for NGO
  useEffect(() => {
    if (role !== 'ngo' || !user) return;
    const q = query(collection(db, 'users'), where('role', '==', 'volunteer'));
    const unsub = onSnapshot(q, (snap) => setVolunteers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [role, user]);

  // My reports for citizen
  useEffect(() => {
    if (role !== 'citizen' || !user) return;
    const q = query(collection(db, 'reports'), where('citizenId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => setMyReports(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [role, user]);

  // Sync inventory from userData
  useEffect(() => {
    if (userData?.inventory) setInventory(userData.inventory);
  }, [userData]);

  // Refresh user doc for inventory updates
  useEffect(() => {
    if (role !== 'ngo' || !user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setInventory(snap.data().inventory || {});
    });
    return () => unsub();
  }, [role, user]);

  const handleMapClick = (latlng) => {
    if (role === 'citizen') {
      setSelectedLocation(latlng);
      setShowReportModal(true);
    }
  };

  const handleReport = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await submitCitizenReport(user.uid, fd.get('type'), { lat: selectedLocation.lat, lng: selectedLocation.lng }, fd.get('title'), incidents);
    setShowReportModal(false);
    setSelectedLocation(null);
  };

  const handleSelfAssign = async (incId) => {
    await assignNGOToIncident(incId, user.uid);
  };

  const handleResolve = async (inc) => {
    await markSituationUnderControl(inc.id, user.uid, inc.assignedNGOs?.length);
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    await assignTask(user.uid, taskForm.volunteerId, taskForm.incidentId, taskForm.description);
    setShowTaskModal(false);
    setTaskForm({ volunteerId: '', incidentId: '', description: '' });
  };

  const handleInvUpdate = async (field, delta) => {
    const newVal = Math.max(0, (inventory[field] || 0) + delta);
    setInventory(prev => ({ ...prev, [field]: newVal }));
    await updateInventory(user.uid, field, newVal);
  };

  const handleDonate = async (amount, incidentId, message) => {
    await createDonation(user.uid, userData?.name || 'Anonymous', amount, incidentId, message);
  };

  if (authLoading || !userData) return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  );

  const myAssigned = incidents.filter(i => i.assignedNGOs?.includes(user.uid));

  // Tab configs per role
  const tabConfigs = {
    citizen: [
      { id: 'map', label: 'Map', icon: <MapPin size={15} /> },
      { id: 'reports', label: 'My Reports', icon: <FileText size={15} /> },
      { id: 'donate', label: 'Donate', icon: <Heart size={15} /> },
      { id: 'volunteer', label: 'Volunteer', icon: <HandHelping size={15} /> },
    ],
    ngo: [
      { id: 'map', label: 'Map', icon: <MapPin size={15} /> },
      { id: 'inventory', label: 'Inventory', icon: <Package size={15} /> },
      { id: 'volunteers', label: 'Volunteers', icon: <Users size={15} /> },
      { id: 'assignments', label: 'Assignments', icon: <ClipboardList size={15} /> },
      { id: 'donate', label: 'Donations', icon: <Heart size={15} /> },
    ],
    volunteer: [
      { id: 'map', label: 'Map', icon: <MapPin size={15} /> },
      { id: 'tasks', label: 'My Tasks', icon: <ClipboardList size={15} /> },
      { id: 'donate', label: 'Donate', icon: <Heart size={15} /> },
    ],
  };

  return (
    <div className="app-container">
      <FloatingAlert message={floatingAlert} onClose={() => setFloatingAlert(null)} />
      <Navbar />
      <div style={{ padding: '1rem 1.25rem' }}>
        <TabBar tabs={tabConfigs[role] || tabConfigs.citizen} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      <main className="main-content" style={{ padding: '0 1.25rem 1.25rem', gap: '1.25rem', height: 'calc(100vh - 140px)' }}>

        {/* ===== MAP TAB ===== */}
        {activeTab === 'map' && (
          <div style={{ display: 'flex', gap: '1.25rem', height: '200%', width: '100%' }}>
            <aside style={{ width: 280, minWidth: 280, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
              {role === 'citizen' && (
                <div className="card fade-in">
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>📍 Report Emergency</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Click anywhere on the map to pin a disaster location.</p>
                </div>
              )}
              <div className="card fade-in" style={{ flex: 1, overflowY: 'auto' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Live Incidents ({incidents.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {incidents.length === 0 && <p className="empty-state" style={{ padding: '1rem' }}>No incidents reported</p>}
                  {incidents.map(inc => (
                    <div key={inc.id} className={`incident-item ${inc.severityScore === 0 ? 'resolved' : ''}`} style={{ borderLeftColor: inc.severityScore > 75 ? 'var(--severity-critical)' : inc.severityScore > 40 ? 'var(--severity-medium)' : 'var(--severity-low)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <strong style={{ fontSize: '0.82rem' }}>{inc.title}</strong>
                        <span style={{ fontSize: '0.7rem', color: inc.severityScore > 75 ? 'var(--severity-critical)' : 'var(--text-muted)', fontWeight: 600 }}>{inc.severityScore}%</span>
                      </div>
                      <SeverityBar value={inc.severityScore} />
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{inc.disasterType} • {inc.reportCount} reports</div>
                      {role === 'ngo' && !inc.assignedNGOs?.includes(user.uid) && inc.severityScore > 0 && (
                        <button className="btn btn-primary btn-sm w-full mt-1" onClick={() => handleSelfAssign(inc.id)}>Self-Assign</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
            <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <MapView incidents={incidents} onMapClick={handleMapClick} interactive={role === 'citizen'} userPosition={userPosition} onLocate={locateUser} />
            </section>
          </div>
        )}

        {/* ===== CITIZEN: MY REPORTS ===== */}
        {activeTab === 'reports' && role === 'citizen' && (
          <div className="fade-in" style={{ maxWidth: 700, margin: '0 auto', width: '100%' }}>
            <h3 style={{ marginBottom: '1rem' }}>My Reports ({myReports.length})</h3>
            {myReports.length === 0 && <div className="empty-state"><FileText size={40} /><p>No reports yet. Click on the map to report an incident.</p></div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {myReports.map(r => (
                <div key={r.id} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{r.disasterType}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.createdAt?.toDate?.()?.toLocaleDateString?.() || 'Just now'}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>📍 {r.location?.lat?.toFixed(4)}, {r.location?.lng?.toFixed(4)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== CITIZEN: VOLUNTEER REGISTRATION ===== */}
        {activeTab === 'volunteer' && role === 'citizen' && (
          <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <HandHelping size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ marginBottom: '0.5rem' }}>Become a Volunteer</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Help communities in crisis by joining as a volunteer.</p>
              <form onSubmit={async (e) => { e.preventDefault(); await registerCitizenAsVolunteer(user.uid, new FormData(e.target).get('skills')); window.location.reload(); }}>
                <div className="input-group">
                  <label>Your Skills</label>
                  <input type="text" name="skills" className="input-field" placeholder="Medical, Logistics, Cooking..." required />
                </div>
                <button type="submit" className="btn btn-primary w-full btn-lg">Register as Volunteer</button>
              </form>
            </div>
          </div>
        )}

        {/* ===== NGO: INVENTORY ===== */}
        {activeTab === 'inventory' && role === 'ngo' && (
          <div className="fade-in" style={{ maxWidth: 600, margin: '0 auto', width: '100%' }}>
            <h3 style={{ marginBottom: '1rem' }}>📦 Resource Inventory</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['food', 'clothes', 'supplies', 'medical'].map(field => (
                <div key={field} className="inv-control">
                  <span className="inv-label" style={{ textTransform: 'capitalize' }}>{field === 'medical' ? '🏥 Medical Kits' : field === 'food' ? '🍲 Food Packets' : field === 'clothes' ? '👕 Clothing Sets' : '📦 Supply Packs'}</span>
                  <button className="inv-btn" onClick={() => handleInvUpdate(field, -10)}>−</button>
                  <span className="inv-value">{inventory[field] || 0}</span>
                  <button className="inv-btn" onClick={() => handleInvUpdate(field, 10)}>+</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== NGO: VOLUNTEERS ===== */}
        {activeTab === 'volunteers' && role === 'ngo' && (
          <div className="fade-in" style={{ maxWidth: 700, margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>👥 Volunteers ({volunteers.length})</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowTaskModal(true)}>+ Assign Task</button>
            </div>
            {volunteers.length === 0 && <div className="empty-state"><Users size={40} /><p>No volunteers registered yet.</p></div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {volunteers.map(v => (
                <div key={v.id} className="card" style={{ padding: '1rem' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{v.name}</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>🛠 {v.skills || 'General'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>📍 {v.city || 'N/A'} • {v.availability || 'Available'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== NGO: ASSIGNMENTS ===== */}
        {activeTab === 'assignments' && role === 'ngo' && (
          <div className="fade-in" style={{ maxWidth: 700, margin: '0 auto', width: '100%' }}>
            <h3 style={{ marginBottom: '1rem' }}>📋 My Assigned Incidents ({myAssigned.length})</h3>
            {myAssigned.length === 0 && <div className="empty-state"><ClipboardList size={40} /><p>No assignments yet. Self-assign from the Map tab.</p></div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {myAssigned.map(inc => (
                <div key={inc.id} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong>{inc.title}</strong>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: inc.severityScore > 50 ? 'var(--severity-critical)' : 'var(--severity-low)' }}>{inc.severityScore}%</span>
                  </div>
                  <SeverityBar value={inc.severityScore} />
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '6px 0' }}>{inc.disasterType} • {inc.reportCount} reports • {inc.assignedNGOs?.length || 0} NGOs</div>
                  {!inc.resolvedNGOs?.includes(user.uid) ? (
                    <button className="btn btn-success btn-sm w-full" onClick={() => handleResolve(inc)}>
                      <CheckCircle2 size={14} /> Mark Situation Under Control
                    </button>
                  ) : (
                    <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={14} /> You marked this resolved</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== VOLUNTEER: MY TASKS ===== */}
        {activeTab === 'tasks' && role === 'volunteer' && (
          <div className="fade-in" style={{ maxWidth: 700, margin: '0 auto', width: '100%' }}>
            <h3 style={{ marginBottom: '1rem' }}>📋 My Tasks ({tasks.length})</h3>
            {tasks.length === 0 && <div className="empty-state"><ClipboardList size={40} /><p>No tasks assigned yet. Your NGO will assign tasks when needed.</p></div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {tasks.map(t => (
                <div key={t.id} className="task-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: '0.88rem' }}>{t.description}</strong>
                    <span className={`task-status ${t.status}`}>{t.status}</span>
                  </div>
                  {t.status === 'pending' && (
                    <button className="btn btn-success btn-sm w-full mt-1" onClick={() => markTaskComplete(t.id)}>
                      <CheckCircle2 size={14} /> Mark Complete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== DONATE TAB (all roles) ===== */}
        {activeTab === 'donate' && (
          <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Heart size={20} color="var(--danger)" /> Donate for Relief</h3>
              <DonationForm incidents={incidents} onDonate={handleDonate} />
            </div>
          </div>
        )}
      </main>

      {/* ===== REPORT MODAL ===== */}
      <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title="🚨 Report Emergency">
        <form onSubmit={handleReport}>
          <div className="input-group">
            <label>Disaster Type</label>
            <select name="type" className="input-field">
              <option value="Flood">🌊 Flood</option>
              <option value="Fire">🔥 Fire</option>
              <option value="Earthquake">🏚️ Earthquake</option>
              <option value="Cyclone">🌪️ Cyclone</option>
              <option value="Landslide">⛰️ Landslide</option>
              <option value="Medical Emergency">🏥 Medical Emergency</option>
              <option value="Hunger Crisis">🍽️ Hunger Crisis</option>
            </select>
          </div>
          <div className="input-group">
            <label>Location / Area Name</label>
            <input type="text" name="title" className="input-field" placeholder="e.g. South Chennai, Bihar Patna" required />
          </div>
          {selectedLocation && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>📍 {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</p>}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-outline w-full" onClick={() => setShowReportModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-secondary w-full">Report Now</button>
          </div>
        </form>
      </Modal>

      {/* ===== TASK ASSIGNMENT MODAL (NGO) ===== */}
      <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} title="📋 Assign Task to Volunteer">
        <form onSubmit={handleAssignTask}>
          <div className="input-group">
            <label>Select Volunteer</label>
            <select className="input-field" value={taskForm.volunteerId} onChange={e => setTaskForm(p => ({ ...p, volunteerId: e.target.value }))} required>
              <option value="">Choose...</option>
              {volunteers.map(v => <option key={v.id} value={v.id}>{v.name} ({v.skills || 'General'})</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>For Incident</label>
            <select className="input-field" value={taskForm.incidentId} onChange={e => setTaskForm(p => ({ ...p, incidentId: e.target.value }))} required>
              <option value="">Choose...</option>
              {myAssigned.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Task Description</label>
            <input type="text" className="input-field" placeholder="e.g. Distribute food at Block A" value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} required />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-outline w-full" onClick={() => setShowTaskModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary w-full">Assign Task</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
