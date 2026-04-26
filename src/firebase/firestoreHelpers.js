import { db } from './config';
import {
  collection, addDoc, updateDoc, doc, arrayUnion, serverTimestamp,
  query, where, getDocs, getDoc, setDoc
} from 'firebase/firestore';

// ---- REPORTS & INCIDENTS ----
export async function submitCitizenReport(citizenId, disasterType, location, title, existingIncidents) {
  // Check if we can merge into an existing incident (within ~5km and same type)
  for (const inc of existingIncidents) {
    if (!inc.location) continue;
    const latDiff = Math.abs(inc.location.lat - location.lat);
    const lngDiff = Math.abs(inc.location.lng - location.lng);
    if (latDiff < 0.05 && lngDiff < 0.05 && inc.disasterType === disasterType) {
      await updateDoc(doc(db, 'incidents', inc.id), {
        reportCount: (inc.reportCount || 1) + 1,
        severityScore: Math.min(100, (inc.severityScore || 50) + 5),
      });
      await addDoc(collection(db, 'reports'), {
        citizenId, disasterType, location, incidentId: inc.id, createdAt: serverTimestamp(),
      });
      return inc.id;
    }
  }
  // Create new incident
  const incRef = await addDoc(collection(db, 'incidents'), {
    title, disasterType, location,
    reportCount: 1, severityScore: 100,
    assignedNGOs: [], resolvedNGOs: [],
    createdAt: serverTimestamp(),
  });
  await addDoc(collection(db, 'reports'), {
    citizenId, disasterType, location, incidentId: incRef.id, createdAt: serverTimestamp(),
  });
  return incRef.id;
}

// ---- NGO ASSIGNMENT ----
export async function assignNGOToIncident(incidentId, ngoId) {
  await updateDoc(doc(db, 'incidents', incidentId), {
    assignedNGOs: arrayUnion(ngoId),
  });
}

export async function markSituationUnderControl(incidentId, ngoId, totalAssigned) {
  const incSnap = await getDoc(doc(db, 'incidents', incidentId));
  if (!incSnap.exists()) return;
  const data = incSnap.data();
  const resolved = [...(data.resolvedNGOs || [])];
  if (!resolved.includes(ngoId)) resolved.push(ngoId);
  const total = totalAssigned || data.assignedNGOs?.length || 1;
  const newSeverity = Math.max(0, Math.floor(100 - (resolved.length / total) * 100));
  await updateDoc(doc(db, 'incidents', incidentId), {
    resolvedNGOs: resolved,
    severityScore: newSeverity,
  });
}

// ---- TASKS ----
export async function assignTask(ngoId, volunteerId, incidentId, description) {
  return await addDoc(collection(db, 'tasks'), {
    ngoId, volunteerId, incidentId, description,
    status: 'pending', createdAt: serverTimestamp(),
  });
}

export async function markTaskComplete(taskId) {
  await updateDoc(doc(db, 'tasks', taskId), { status: 'completed' });
}

// ---- INVENTORY ----
export async function updateInventory(userId, field, value) {
  const ref = doc(db, 'users', userId);
  await updateDoc(ref, { [`inventory.${field}`]: Math.max(0, value) });
}

// ---- DONATIONS ----
export async function createDonation(userId, userName, amount, incidentId, message) {
  return await addDoc(collection(db, 'donations'), {
    userId, userName, amount: Number(amount),
    incidentId: incidentId || null,
    message: message || '',
    createdAt: serverTimestamp(),
  });
}

// ---- VOLUNTEER REGISTRATION (citizen -> volunteer) ----
export async function registerCitizenAsVolunteer(uid, skills) {
  await updateDoc(doc(db, 'users', uid), {
    role: 'volunteer',
    skills: skills || 'General Support',
  });
}
