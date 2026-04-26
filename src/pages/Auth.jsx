import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { auth, db } from '../firebase/config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('citizen');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.target);
    const email = fd.get('email');
    const password = fd.get('password');

    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (email === 'resqaiadmin@gmail.com') {
          navigate('/admin');
        } else {
          const snap = await getDoc(doc(db, 'users', cred.user.uid));
          if (snap.exists() && snap.data().role === 'admin') navigate('/admin');
          else navigate('/dashboard');
        }
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const userData = {
          uid: cred.user.uid, email, role,
          name: fd.get('name'), phone: fd.get('phone') || '', city: fd.get('city') || '',
          createdAt: new Date().toISOString(),
        };
        if (role === 'ngo') {
          userData.ngoId = fd.get('ngoid');
          userData.ngoAddress = fd.get('ngoaddress') || '';
          userData.contactPerson = fd.get('contactperson') || '';
          userData.inventory = { food: 0, clothes: 0, supplies: 0, medical: 0 };
        }
        if (role === 'volunteer') {
          userData.skills = fd.get('skills');
          userData.age = fd.get('age') || '';
          userData.availability = fd.get('availability') || 'Full-time';
        }
        await setDoc(doc(db, 'users', cred.user.uid), userData);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', '').replace(/\(auth\/.*\)/, ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Hero */}
      <div className="auth-hero">
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 480 }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', marginBottom: '1.5rem' }}>
            <ShieldCheck size={48} color="#3B82F6" />
          </div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', lineHeight: 1.2 }}>
            <span className="text-gradient">ResQAI</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.7 }}>
            AI-Powered Decision Intelligence ensuring the <strong style={{ color: 'var(--text-primary)' }}>right help</strong> reaches the <strong style={{ color: 'var(--text-primary)' }}>right place</strong> at the <strong style={{ color: 'var(--text-primary)' }}>right time</strong>.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Real-time Tracking', 'Smart Allocation', 'AI Severity Analysis'].map((t) => (
              <span key={t} style={{ padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', fontSize: '0.78rem', color: 'var(--primary)' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Form */}
      <div className="auth-form-side">
        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            {isLogin ? 'Sign in to access your dashboard' : 'Join the crisis response network'}
          </p>

          {/* Tab Toggle */}
          <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
            <button type="button" className={`tab-item ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)} style={{ flex: 1 }}>Login</button>
            <button type="button" className={`tab-item ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)} style={{ flex: 1 }}>Sign Up</button>
          </div>

          {error && (
            <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.8rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="input-group fade-in">
                <label>Register As</label>
                <select name="role" className="input-field" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="citizen">Citizen</option>
                  <option value="ngo">NGO</option>
                  <option value="volunteer">Volunteer</option>
                </select>
              </div>
            )}

            {!isLogin && (
              <div className="input-group fade-in">
                <label>{role === 'ngo' ? 'NGO Name' : 'Full Name'}</label>
                <input type="text" name="name" className="input-field" placeholder={role === 'ngo' ? 'e.g. Red Cross India' : 'John Doe'} required />
              </div>
            )}

            {!isLogin && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="input-group fade-in">
                  <label>Phone</label>
                  <input type="tel" name="phone" className="input-field" placeholder="+91..." required />
                </div>
                <div className="input-group fade-in">
                  <label>City</label>
                  <input type="text" name="city" className="input-field" placeholder="Mumbai" required />
                </div>
              </div>
            )}

            {!isLogin && role === 'ngo' && (
              <>
                <div className="input-group fade-in">
                  <label>NGO Registration ID</label>
                  <input type="text" name="ngoid" className="input-field" placeholder="e.g. NGO-12345" required />
                </div>
                <div className="input-group fade-in">
                  <label>NGO Address</label>
                  <input type="text" name="ngoaddress" className="input-field" placeholder="Full address" required />
                </div>
                <div className="input-group fade-in">
                  <label>Contact Person</label>
                  <input type="text" name="contactperson" className="input-field" placeholder="Contact name" required />
                </div>
              </>
            )}

            {!isLogin && role === 'volunteer' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="input-group fade-in">
                    <label>Skills / Expertise</label>
                    <input type="text" name="skills" className="input-field" placeholder="Medical, Logistics" required />
                  </div>
                  <div className="input-group fade-in">
                    <label>Age</label>
                    <input type="number" name="age" className="input-field" placeholder="25" min="16" max="80" required />
                  </div>
                </div>
                <div className="input-group fade-in">
                  <label>Availability</label>
                  <select name="availability" className="input-field">
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Weekends">Weekends Only</option>
                    <option value="On-call">On-call</option>
                  </select>
                </div>
              </>
            )}

            <div className="input-group">
              <label>Email Address</label>
              <input type="email" name="email" className="input-field" placeholder="you@example.com" required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input type="password" name="password" className="input-field" placeholder="••••••••" required minLength={6} />
            </div>

            <button type="submit" className="btn btn-primary w-full btn-lg mt-1" disabled={loading}>
              {loading ? <span className="spinner" /> : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
