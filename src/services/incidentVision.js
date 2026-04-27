const fallbackTemplates = {
  Flood: [
    { resource: 'Food packets', quantity: 120, priority: 'high' },
    { resource: 'Clean water liters', quantity: 1000, priority: 'critical' },
    { resource: 'Medical kits', quantity: 25, priority: 'high' },
    { resource: 'Temporary shelter kits', quantity: 40, priority: 'high' },
  ],
  Fire: [
    { resource: 'Burn treatment kits', quantity: 30, priority: 'critical' },
    { resource: 'Medical kits', quantity: 20, priority: 'high' },
    { resource: 'Rescue team members', quantity: 18, priority: 'high' },
    { resource: 'Protective masks', quantity: 150, priority: 'medium' },
  ],
  Earthquake: [
    { resource: 'Search and rescue team members', quantity: 30, priority: 'critical' },
    { resource: 'Medical kits', quantity: 40, priority: 'high' },
    { resource: 'Temporary shelter kits', quantity: 70, priority: 'high' },
    { resource: 'Blankets', quantity: 220, priority: 'medium' },
  ],
  Cyclone: [
    { resource: 'Food packets', quantity: 180, priority: 'high' },
    { resource: 'Clean water liters', quantity: 1300, priority: 'critical' },
    { resource: 'Emergency shelter kits', quantity: 80, priority: 'high' },
    { resource: 'Medical kits', quantity: 35, priority: 'high' },
  ],
  Landslide: [
    { resource: 'Rescue team members', quantity: 20, priority: 'critical' },
    { resource: 'Medical kits', quantity: 25, priority: 'high' },
    { resource: 'Excavation support units', quantity: 6, priority: 'high' },
    { resource: 'Food packets', quantity: 90, priority: 'medium' },
  ],
  'Medical Emergency': [
    { resource: 'Medical kits', quantity: 50, priority: 'critical' },
    { resource: 'Ambulance units', quantity: 8, priority: 'high' },
    { resource: 'Health workers', quantity: 25, priority: 'high' },
    { resource: 'Blood units', quantity: 60, priority: 'medium' },
  ],
  'Hunger Crisis': [
    { resource: 'Food packets', quantity: 250, priority: 'critical' },
    { resource: 'Nutrition kits', quantity: 120, priority: 'high' },
    { resource: 'Water liters', quantity: 1500, priority: 'high' },
    { resource: 'Community kitchen volunteers', quantity: 25, priority: 'medium' },
  ],
};

function sanitizeResourceItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const resource = String(item?.resource || item?.name || '').trim();
      const quantity = Number(item?.quantity || item?.count || 0);
      const priority = String(item?.priority || 'medium').toLowerCase();
      if (!resource || !Number.isFinite(quantity) || quantity <= 0) return null;
      return { resource, quantity: Math.round(quantity), priority };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function parseModelOutput(rawContent) {
  try {
    if (!rawContent) return null;
    const cleaned = typeof rawContent === 'string'
      ? rawContent.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
      : rawContent;
    const parsed = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
    const requiredResources = sanitizeResourceItems(parsed?.requiredResources || parsed?.resources);
    return {
      summary: String(parsed?.summary || 'AI analysis completed').trim(),
      urgency: String(parsed?.urgency || 'medium').toLowerCase(),
      confidence: Number(parsed?.confidence || 0.6),
      requiredResources,
    };
  } catch {
    return null;
  }
}

function toBase64FromArrayBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function normalizeModelId(modelName) {
  return String(modelName || '').replace(/^models\//, '').trim();
}

function parseJsonBlock(rawContent) {
  if (!rawContent) return null;
  const cleaned = typeof rawContent === 'string'
    ? rawContent.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    : rawContent;
  return typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildMetadataSignals(imageFile) {
  if (!(imageFile instanceof File)) {
    return {
      fileName: null,
      mimeType: null,
      sizeKb: 0,
      ageDays: null,
      flags: ['No file metadata available.'],
      metadataRiskScore: 50,
    };
  }

  const sizeKb = Math.round(imageFile.size / 1024);
  const ageDays = Number.isFinite(imageFile.lastModified)
    ? Math.floor((Date.now() - imageFile.lastModified) / (1000 * 60 * 60 * 24))
    : null;

  let metadataRiskScore = 0;
  const flags = [];

  const name = String(imageFile.name || '').toLowerCase();
  const mimeType = String(imageFile.type || '').toLowerCase();

  if (!mimeType.startsWith('image/')) {
    metadataRiskScore += 45;
    flags.push('Uploaded file is not a standard image mime type.');
  }

  if (/screenshot|screen-shot|screen shot|capture|whatsapp image/i.test(name)) {
    metadataRiskScore += 20;
    flags.push('Filename suggests screenshot/re-shared content.');
  }

  if (sizeKb < 40) {
    metadataRiskScore += 18;
    flags.push('Image file size is very small.');
  }

  if (ageDays != null && ageDays > 30) {
    metadataRiskScore += 30;
    flags.push(`Image appears older (${ageDays} days).`);
  } else if (ageDays != null && ageDays > 7) {
    metadataRiskScore += 12;
    flags.push(`Image may be old (${ageDays} days).`);
  }

  return {
    fileName: imageFile.name,
    mimeType: imageFile.type,
    sizeKb,
    ageDays,
    flags,
    metadataRiskScore: clamp(metadataRiskScore, 0, 100),
  };
}

function parseVerificationOutput(rawContent) {
  try {
    const parsed = parseJsonBlock(rawContent);
    const relevanceScore = clamp(Number(parsed?.relevanceScore ?? 0.5), 0, 1);
    const confidence = clamp(Number(parsed?.confidence ?? 0.5), 0, 1);
    const modelRisk = clamp(Number(parsed?.modelRiskScore ?? 50), 0, 100);
    return {
      relevanceScore,
      confidence,
      matchesCategory: Boolean(parsed?.matchesCategory),
      modelRiskScore: modelRisk,
      reason: String(parsed?.reason || 'Model provided no reason.').trim(),
      detectedCategory: String(parsed?.detectedCategory || '').trim() || null,
    };
  } catch {
    return null;
  }
}

async function runGeminiJsonGeneration({ apiKey, preferredModelCandidates, imagePart, prompt }) {
  const availableModels = await listGenerateContentModels(apiKey);
  const availableSet = new Set(availableModels);

  const modelCandidates = availableModels.length > 0
    ? [
        ...preferredModelCandidates.filter((m) => availableSet.has(m)),
        ...availableModels.filter((m) => !preferredModelCandidates.includes(m)),
      ]
    : preferredModelCandidates;

  if (modelCandidates.length === 0) {
    throw new Error('No generateContent model available for this API key/project.');
  }

  let lastError = null;

  for (const modelName of modelCandidates) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                imagePart,
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });
      clearTimeout(timer);

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`AI request failed (${response.status}) for ${modelName}: ${errText?.slice(0, 220) || 'No details'}`);
        if (response.status === 404 || response.status === 400) continue;
        throw lastError;
      }

      const data = await response.json();
      const firstCandidate = data?.candidates?.[0];
      const finishReason = firstCandidate?.finishReason;
      if (finishReason && finishReason !== 'STOP') {
        lastError = new Error(`AI response stopped with reason: ${finishReason} (${modelName})`);
        continue;
      }

      const rawContent = (data?.candidates || [])
        .flatMap((candidate) => candidate?.content?.parts || [])
        .map((part) => part?.text)
        .filter(Boolean)
        .join('\n');

      return { rawContent, modelName };
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
    }
  }

  throw lastError || new Error(`No compatible Gemini model succeeded. Tried: ${modelCandidates.join(', ')}`);
}

async function listGenerateContentModels(apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) return [];
    const data = await response.json();
    const models = Array.isArray(data?.models) ? data.models : [];
    return models
      .filter((m) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => normalizeModelId(m?.name))
      .filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function toGeminiImagePart({ imageFile, imageUrl }) {
  let blob = imageFile;
  if (!(blob instanceof Blob)) {
    if (!imageUrl) throw new Error('No image source available for analysis');
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Unable to fetch incident image for analysis');
    blob = await response.blob();
  }

  const arrayBuffer = await blob.arrayBuffer();
  return {
    inlineData: {
      mimeType: blob.type || 'image/jpeg',
      data: toBase64FromArrayBuffer(arrayBuffer),
    },
  };
}

export async function analyzeIncidentPhoto({ imageUrl, imageFile, disasterType, title }) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_INCIDENT_AI_API_KEY;
  const configuredModel = import.meta.env.VITE_GEMINI_MODEL;
  const preferredModelCandidates = [
    configuredModel,
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
  ]
    .map(normalizeModelId)
    .filter(Boolean);

  if (!apiKey || (!imageUrl && !(imageFile instanceof Blob))) {
    const fallbackResources = fallbackTemplates[disasterType] || fallbackTemplates.Flood;
    return {
      source: 'fallback',
      summary: `Fallback estimate for ${disasterType} at ${title}. Configure Gemini API env vars for live model analysis.`,
      urgency: 'high',
      confidence: 0.45,
      requiredResources: fallbackResources,
    };
  }

  const prompt = `You are an emergency response AI. Analyze the incident image and generate resource demand prediction. Return strict JSON only, no markdown.
Schema:
{
  "summary": "one short paragraph",
  "urgency": "low|medium|high|critical",
  "confidence": number between 0 and 1,
  "requiredResources": [
    {"resource": "string", "quantity": number, "priority": "low|medium|high|critical"}
  ]
}`;

  try {
    const imagePart = await toGeminiImagePart({ imageFile, imageUrl });
    const { rawContent, modelName } = await runGeminiJsonGeneration({
      apiKey,
      preferredModelCandidates,
      imagePart,
      prompt: `${prompt}\nDisaster Type: ${disasterType}\nArea: ${title}`,
    });
    const parsed = parseModelOutput(rawContent);
    if (!parsed || parsed.requiredResources.length === 0) {
      throw new Error(`Invalid AI output from ${modelName}`);
    }

    return {
      source: `model:${modelName}`,
      summary: parsed.summary,
      urgency: parsed.urgency,
      confidence: parsed.confidence,
      requiredResources: parsed.requiredResources,
    };
  } catch (err) {
    const reason = String(err?.message || 'Unknown error');
    console.error('Gemini analysis failed:', reason);
    const fallbackResources = fallbackTemplates[disasterType] || fallbackTemplates.Flood;
    return {
      source: 'fallback',
      summary: `Model analysis unavailable for ${disasterType}. Reason: ${reason}`,
      urgency: 'high',
      confidence: 0.4,
      requiredResources: fallbackResources,
    };
  }
}

export async function verifyIncidentEvidence({ imageUrl, imageFile, disasterType, title }) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_INCIDENT_AI_API_KEY;
  const configuredModel = import.meta.env.VITE_GEMINI_MODEL;
  const preferredModelCandidates = [
    configuredModel,
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
  ]
    .map(normalizeModelId)
    .filter(Boolean);

  const metadata = buildMetadataSignals(imageFile);

  if (!apiKey || (!imageUrl && !(imageFile instanceof Blob))) {
    const verdict = metadata.metadataRiskScore >= 70 ? 'fake' : metadata.metadataRiskScore >= 45 ? 'suspicious' : 'genuine';
    return {
      source: 'metadata-fallback',
      verdict,
      isLikelyGenuine: verdict !== 'fake',
      riskScore: metadata.metadataRiskScore,
      relevanceScore: 0.5,
      confidence: 0.45,
      reason: 'Model unavailable. Verification based on file metadata heuristics only.',
      detectedCategory: null,
      metadata,
      flags: metadata.flags,
    };
  }

  const prompt = `You are a disaster evidence verification model.
Given an uploaded incident image and report details, check if image likely matches the incident type and described area context.
Return strict JSON only.
Schema:
{
  "matchesCategory": boolean,
  "relevanceScore": number,
  "confidence": number,
  "modelRiskScore": number,
  "detectedCategory": string,
  "reason": string
}
Rules:
- relevanceScore, confidence are in [0,1]
- modelRiskScore is in [0,100], higher = more likely fake/mismatch.
- Be strict against clearly unrelated images.`;

  try {
    const imagePart = await toGeminiImagePart({ imageFile, imageUrl });
    const { rawContent, modelName } = await runGeminiJsonGeneration({
      apiKey,
      preferredModelCandidates,
      imagePart,
      prompt: `${prompt}\nReported disaster type: ${disasterType}\nReported location/title: ${title}\nMetadata: ${JSON.stringify(metadata)}`,
    });

    const parsed = parseVerificationOutput(rawContent);
    if (!parsed) throw new Error(`Invalid verification output from ${modelName}`);

    const combinedRisk = clamp(Math.round(parsed.modelRiskScore * 0.7 + metadata.metadataRiskScore * 0.3), 0, 100);
    const lowRelevance = parsed.relevanceScore < 0.45;
    const mismatch = parsed.matchesCategory === false;

    const verdict = (combinedRisk >= 75 || (mismatch && lowRelevance))
      ? 'fake'
      : (combinedRisk >= 45 || lowRelevance)
        ? 'suspicious'
        : 'genuine';

    return {
      source: `model:${modelName}`,
      verdict,
      isLikelyGenuine: verdict !== 'fake',
      riskScore: combinedRisk,
      relevanceScore: parsed.relevanceScore,
      confidence: parsed.confidence,
      reason: parsed.reason,
      detectedCategory: parsed.detectedCategory,
      metadata,
      flags: metadata.flags,
    };
  } catch (err) {
    const reason = String(err?.message || 'Unknown verification error');
    console.error('Evidence verification failed:', reason);
    const heuristicVerdict = metadata.metadataRiskScore >= 70 ? 'fake' : metadata.metadataRiskScore >= 45 ? 'suspicious' : 'genuine';
    return {
      source: 'metadata-fallback',
      verdict: heuristicVerdict,
      isLikelyGenuine: heuristicVerdict !== 'fake',
      riskScore: metadata.metadataRiskScore,
      relevanceScore: 0.5,
      confidence: 0.4,
      reason: `Model verification unavailable. ${reason}`,
      detectedCategory: null,
      metadata,
      flags: metadata.flags,
    };
  }
}
