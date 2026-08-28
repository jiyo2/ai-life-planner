const axios = require('axios');

module.exports = async (req, res) => {
    // Enable CORS to prevent browser domain blocking issues
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { destination, days, budget, travelers, interests, notes } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    // Using official Google Gemini API Endpoint
    const GEMINI_URL = `https://googleapis.com{GEMINI_API_KEY}`;

    const prompt = `You are an expert travel planner. Create an optimized trip strategy in English for ${days} days in ${destination} with a maximum spending cap of $${budget} for ${travelers} traveler(s). 
    The user's core interests are: ${interests}. Special guidelines: ${notes}.

    CRITICAL ACCOMMODATION RULES:
    In the "stay" section, suggest real hotel options matching the budget. For each hotel option, you MUST explicitly include:
    1. The official Star Rating (e.g., ⭐⭐⭐ Airport Hotel).
    2. Specific Room Details (Explicitly state if it features Free High-Speed Wi-Fi, Private Bathroom, AC, or Breakfast options).
    3. A clean hyperlink to check real-time availability on Booking.com using this exact structured search URL format: 
       <a href="https://booking.com{encodeURIComponent(destination)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 8px; padding: 6px 12px; background-color: #003580; color: #ffffff; font-weight: bold; border-radius: 6px; text-decoration: none; font-size: 13px;">Book on Booking.com ↗</a>

    Return EXACTLY this structured JSON format:
    {
      "stay": "HTML markup containing styled list items of hotels with star ratings, room amenities, and their custom Booking.com links.",
      "transport": "HTML markup summarizing public transit cards, taxis, and structural routing costs.",
      "experiences": "HTML markup with curated daily lists of attractions and local food venues.",
      "money": "HTML breakdown explaining daily cash tracking and budget splits.",
      "daysPlan": "HTML markup detailing a clear day-by-day vacation itinerary structure."
    }`;

    try {
        const response = await axios.post(GEMINI_URL, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        // 🛠️ THE ABSOLUTE FIX: Safely parse Google's deep nested array payload structure 🛠️
        if (response.data && response.data.candidates && response.data.candidates[0] && response.data.candidates[0].content && response.data.candidates[0].content.parts && response.data.candidates[0].content.parts[0]) {
            
            const rawText = response.data.candidates[0].content.parts[0].text.trim();
            const travelData = JSON.parse(rawText);
            return res.status(200).json(travelData);
            
        } else {
            throw new Error("Gemini response returned empty or structural candidates array was blocked.");
        }

    } catch (error) {
        console.error("Vercel Backend Error:", error.message);
        return res.status(500).json({ 
            error: "Internal Server Error during data execution.",
            details: error.message 
        });
    }
};
