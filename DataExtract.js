import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const API_KEY = "AIzaSyCpY66bo7f-vNPQcMh7wMSXVsbK7oDWlQc"; // Replace with your actual API key

const ai = new GoogleGenAI({
    apiKey: API_KEY
});

const registerLog = (message) => {
    const entry = `[${new Date().toLocaleString()}] ${message}\n`;

    fs.appendFileSync("activity.log", entry);
    console.log(entry.trim());
};

async function runGeminiCrisisScanner() {
    registerLog(
        "AI CORE: Initializing Multi-Report Deep Search with Geolocation..."
    );

    const modelId = "gemini-2.5-flash";

    const prompt = `
Today is April 27, 2026.

Perform an extensive search for at least 10 distinct, recent natural disasters or emergency crises that occurred in India between March 27, 2026, and April 27, 2026.

Include:
- floods
- avalanches
- boat capsizes
- building collapses
- major fire incidents

Do not combine different events.

For each event, provide:

1. Title: Event name and location
2. Level: RED, ORANGE, or GREEN
3. Description: Summary of the incident
4. Confirmed_Deaths: Integer
5. Confirmed_Rescued: Integer
6. Total_People_Affected: Integer
7. Awaiting_Rescue: Integer

8. Logistics:
- Fresh_Water: (Affected * 4)
- Food_Packets: (Affected * 3)
- Medical_Kits: (Affected / 5)

9. Coordinates:
- Latitude: Float
- Longitude: Float

Return ONLY a raw JSON array.

If you cannot find 10 events with casualties, include 10 recent emergency reports and set casualty integers to 0.

Do not provide explanation, markdown, or conversational text.
`;

    try {
        const result = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const responseText = result.text;

        if (!responseText) {
            throw new Error("Empty response received from Gemini.");
        }

        // Extract JSON safely
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);

        if (!jsonMatch) {
            throw new Error("No valid JSON array found in AI response.");
        }

        const cleanJson = jsonMatch[0];
        const reports = JSON.parse(cleanJson);

        registerLog(
            `SUCCESS: ${reports.length} Geolocated Reports Extracted Successfully.`
        );

        reports.forEach((r, i) => {
            console.log(`\n========== REPORT #${i + 1} ==========\n`);

            console.log(`TITLE: ${r.Title}`);
            console.log(`STATUS: ${r.Level}`);
            console.log(
                `LAT/LONG: ${r.Coordinates?.Latitude}, ${r.Coordinates?.Longitude}`
            );
            console.log(`DESCRIPTION: ${r.Description}`);

            console.log(`\n[ DATA ]`);
            console.log(`Deaths: ${r.Confirmed_Deaths}`);
            console.log(`Rescued: ${r.Confirmed_Rescued}`);
            console.log(`Affected: ${r.Total_People_Affected}`);
            console.log(`Awaiting Rescue: ${r.Awaiting_Rescue}`);

            console.log(`\n[ LOGISTICS ]`);
            console.log(`Fresh Water: ${r.Logistics?.Fresh_Water} Liters`);
            console.log(`Food Packets: ${r.Logistics?.Food_Packets}`);
            console.log(`Medical Kits: ${r.Logistics?.Medical_Kits}`);

            console.log(`\n=====================================\n`);
        });
    } catch (error) {
        const errorMessage = error.message || String(error);

        if (errorMessage.includes("429")) {
            registerLog("QUOTA LIMIT REACHED: Please wait and try again.");
        } else if (errorMessage.includes("fetch failed")) {
            registerLog("NETWORK ERROR: Please check internet connection.");
        } else {
            registerLog(`ERROR: ${errorMessage}`);
        }
    }
}

runGeminiCrisisScanner();