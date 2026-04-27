import { GoogleGenAI } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Level → numeric severity score
const LEVEL_SEVERITY = {
  RED: 90,
  ORANGE: 60,
  GREEN: 30,
};

// Level → disaster type heuristic fallback
const LEVEL_DISASTER_MAP = {
  RED: 'Flood',
  ORANGE: 'Fire',
  GREEN: 'Landslide',
};

function normalizeDisasterType(raw) {
  if (!raw) return 'Flood';
  const lower = String(raw).toLowerCase();
  if (lower.includes('flood')) return 'Flood';
  if (lower.includes('fire') || lower.includes('blaze')) return 'Fire';
  if (lower.includes('earthquake') || lower.includes('quake')) return 'Earthquake';
  if (lower.includes('cyclone') || lower.includes('storm') || lower.includes('hurricane')) return 'Cyclone';
  if (lower.includes('landslide') || lower.includes('mudslide')) return 'Landslide';
  if (lower.includes('medical') || lower.includes('health') || lower.includes('hospital')) return 'Medical Emergency';
  if (lower.includes('hunger') || lower.includes('food') || lower.includes('famine')) return 'Hunger Crisis';
  if (lower.includes('avalanche') || lower.includes('snow')) return 'Landslide';
  if (lower.includes('boat') || lower.includes('drown') || lower.includes('capsize')) return 'Flood';
  if (lower.includes('collapse') || lower.includes('building')) return 'Earthquake';
  return 'Flood';
}

function buildPrompt() {
  const today = new Date();
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const fmt = (d) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
Today is ${fmt(today)}.

Perform an extensive search for at least 10 distinct, recent natural disasters or emergency crises that occurred in India between ${fmt(oneMonthAgo)} and ${fmt(today)}.

Include:
- floods
- avalanches
- boat capsizes
- building collapses
- major fire incidents
- cyclones
- earthquakes
- landslides
- medical emergencies
- hunger crises

Do not combine different events. Each event must have a unique location.

For each event, provide strictly:

1. Title: Event name and specific location (district/state)
2. Level: RED, ORANGE, or GREEN
3. DisasterType: One of — Flood, Fire, Earthquake, Cyclone, Landslide, Medical Emergency, Hunger Crisis
4. Description: 1-2 sentence summary of the incident
5. Confirmed_Deaths: Integer (0 if unknown)
6. Confirmed_Rescued: Integer (0 if unknown)
7. Total_People_Affected: Integer (0 if unknown)
8. Awaiting_Rescue: Integer (0 if unknown)

9. Logistics:
   - Fresh_Water: litres needed (Affected * 4)
   - Food_Packets: packets needed (Affected * 3)
   - Medical_Kits: kits needed (floor of Affected / 5)

10. Coordinates:
    - Latitude: Float (accurate for the reported location)
    - Longitude: Float (accurate for the reported location)

11. AI_Urgency: one of — low, medium, high, critical
12. AI_Confidence: a float between 0.0 and 1.0
13. AI_Summary: 1-2 sentence description of the situation severity and immediate actions needed

14. RequiredResources: array of 4-8 objects, each with:
    - resource: string (name of the resource)
    - quantity: integer
    - priority: one of — low, medium, high, critical
    Base resources on DisasterType and Level:
    Flood: Rescue boats, Life vests, Water pumps, Medical personnel, Food packets, Water purification units
    Fire: Firefighting personnel, Fire engines, Water tankers, PPE, Medical personnel, Hoses
    Earthquake: Search & rescue teams, Cranes/heavy equipment, Medical personnel, Tents, Blankets, Food
    Cyclone: Emergency shelters, Food packets, Clean water, Medical personnel, Communication equipment
    Landslide: Excavators, Rescue teams, Medical personnel, Food, Tents, Blankets
    Medical Emergency: Ambulances, Medical staff, Medicines, ICU beds, Medical supplies
    Hunger Crisis: Food packets, Nutrition supplements, Medical staff, Clean water, Distribution volunteers

Return ONLY a raw JSON array. No markdown. No explanation. No code fences.

Example element shape:
{"Title":"Flood in Patna, Bihar","Level":"RED","DisasterType":"Flood","Description":"Heavy rains caused severe flooding.","Confirmed_Deaths":5,"Confirmed_Rescued":120,"Total_People_Affected":3000,"Awaiting_Rescue":200,"Logistics":{"Fresh_Water":12000,"Food_Packets":9000,"Medical_Kits":600},"Coordinates":{"Latitude":25.594,"Longitude":85.137},"AI_Urgency":"high","AI_Confidence":0.85,"AI_Summary":"Critical flooding with hundreds stranded; immediate rescue and medical deployment required.","RequiredResources":[{"resource":"Rescue boats","quantity":20,"priority":"critical"},{"resource":"Life vests","quantity":200,"priority":"critical"},{"resource":"Medical personnel","quantity":15,"priority":"high"},{"resource":"Food packets","quantity":9000,"priority":"high"},{"resource":"Water purification units","quantity":5,"priority":"medium"}]}

If fewer than 10 real events exist, include the most recent emergency reports and set integer fields to 0.
`;
}

async function tryModel(modelId) {
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const result = await ai.models.generateContent({
    model: modelId,
    contents: buildPrompt(),
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = result.text;
  if (!text) throw new Error('Empty response from Gemini.');

  // Strip any accidental markdown fences
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonMatch = stripped.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No valid JSON array in AI response.');

  return JSON.parse(jsonMatch[0]);
}

/**
 * Run the AI crisis scanner. Tries gemini-2.5-flash, falls back to VITE_GEMINI_MODEL.
 * Returns normalized incident objects ready for Firestore + Map.
 */
export async function runCrisisScanner(onLog) {
  const log = (msg) => {
    if (typeof onLog === 'function') onLog(msg);
  };

  const primaryModel = 'gemini-2.5-flash';
  const fallbackModel = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';

  log(`🔍 Querying Gemini AI (${primaryModel}) with Google Search...`);

  let rawReports;
  try {
    rawReports = await tryModel(primaryModel);
    log(`✅ Got response from ${primaryModel}`);
  } catch (primaryErr) {
    const msg = String(primaryErr.message || primaryErr);
    if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('overloaded')) {
      log(`⚠️ ${primaryModel} is overloaded. Retrying with ${fallbackModel}...`);
      rawReports = await tryModel(fallbackModel);
      log(`✅ Got response from ${fallbackModel}`);
    } else {
      throw primaryErr;
    }
  }

  if (!Array.isArray(rawReports) || rawReports.length === 0) {
    throw new Error('AI returned no crisis reports.');
  }

  log(`📊 Parsing ${rawReports.length} crisis reports...`);

  const scannedAt = new Date().toISOString();

  const normalized = rawReports
    .filter((r) => r?.Coordinates?.Latitude && r?.Coordinates?.Longitude)
    .map((r, i) => {
      const level = String(r.Level || 'ORANGE').toUpperCase().trim();
      const severityScore = LEVEL_SEVERITY[level] ?? 60;
      const disasterType = r.DisasterType
        ? normalizeDisasterType(r.DisasterType)
        : normalizeDisasterType(r.Title) || LEVEL_DISASTER_MAP[level] || 'Flood';

      return {
        // Firestore will assign real id on save; use temp client id for now
        _clientId: `ai-${Date.now()}-${i}`,
        title: String(r.Title || `Crisis Report #${i + 1}`).trim(),
        disasterType,
        severityScore,
        level,
        description: String(r.Description || '').trim(),
        location: {
          lat: Number(r.Coordinates.Latitude),
          lng: Number(r.Coordinates.Longitude),
        },
        reportCount: 1,
        assignedNGOs: [],
        resolvedNGOs: [],
        // AI-specific fields
        aiGenerated: true,
        confirmedDeaths: Number(r.Confirmed_Deaths) || 0,
        confirmedRescued: Number(r.Confirmed_Rescued) || 0,
        totalAffected: Number(r.Total_People_Affected) || 0,
        awaitingRescue: Number(r.Awaiting_Rescue) || 0,
        logistics: {
          freshWater: Number(r.Logistics?.Fresh_Water) || 0,
          foodPackets: Number(r.Logistics?.Food_Packets) || 0,
          medicalKits: Number(r.Logistics?.Medical_Kits) || 0,
        },
        // Resource prediction — matches the format used by citizen reports in AdminDashboard
        aiAnalysis: {
          summary: String(r.AI_Summary || r.Description || '').trim(),
          urgency: String(r.AI_Urgency || 'medium').toLowerCase(),
          confidence: Math.min(1, Math.max(0, Number(r.AI_Confidence) || 0.7)),
          source: 'AI Deep Search',
          analyzedAt: scannedAt,
        },
        requiredResources: Array.isArray(r.RequiredResources)
          ? r.RequiredResources.map((res) => ({
              resource: String(res.resource || res.name || '').trim(),
              quantity: Number(res.quantity) || 1,
              priority: String(res.priority || 'medium').toLowerCase(),
            })).filter((res) => res.resource)
          : [],
        source: 'AI Deep Search',
        scannedAt,
      };
    });

  if (normalized.length === 0) {
    throw new Error('AI reports had invalid coordinates and could not be plotted.');
  }

  log(`✅ ${normalized.length} verified crisis reports ready.`);
  return normalized;
}
