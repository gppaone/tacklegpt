// src/routes/+page.server.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY } from '$env/static/private';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const actions = {
    askPro: async ({ request }) => {
        try {
            const data = await request.formData();
            const userMsg = data.get('message');
            
            if (!userMsg || typeof userMsg !== 'string') {
                return { 
                    advice: 'Please provide a valid question.',
                    error: true 
                };
            }
            
            // 1. Fetch Weather (US-Only Free NWS API)
            const lat = "35.72"; // Replace with dynamic lat/lon later
            const lon = "-78.85";
            
            let current;
            try {
                const weatherRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
                const points = await weatherRes.json();
                const forecastRes = await fetch(points.properties.forecastHourly);
                const forecast = await forecastRes.json();
                current = forecast.properties.periods[0];
            } catch (weatherError) {
                console.error('Weather fetch error:', weatherError);
                current = { temperature: 70, windSpeed: '5 mph' };
            }

            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
            
            const prompt = `You are an elite Bass Pro. Current weather: ${current.temperature}°F. 
User situation: ${userMsg}

Please provide your fishing advice in two parts:

1. ADVICE SECTION (in Markdown):
Output your fishing advice in Markdown. CRITICAL: Do not indent any lines. Every line must start at the very beginning of the margin (no leading spaces). Do not use backticks or code blocks. Use only #, ##, **, and - for formatting.

2. PRODUCTS SECTION (in JSON):
After your advice, suggest 2 relevant fishing products. Format as JSON only:
---PRODUCTS---
[
  {
    "name": "Product Name",
    "category": "rod|reel|lure|bait|tackle|line|other",
    "price": 29.99,
    "reason": "Brief reason why this product helps"
  }
]

Example format:
[Your fishing advice here in markdown]

---PRODUCTS---
[{"name": "Rapala Shad Rap", "category": "lure", "price": 7.99, "reason": "Perfect for current water temperature"}]
`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const fullText = response.text();
            
            // Parse advice and products
            const parts = fullText.split('---PRODUCTS---');
            const advice = parts[0].trim();
            let products = [];
            
            if (parts[1]) {
                try {
                    // Clean up the JSON (remove markdown code fences if present)
                    const jsonText = parts[1].trim()
                        .replace(/```json/g, '')
                        .replace(/```/g, '')
                        .trim();
                    products = JSON.parse(jsonText);
                } catch (parseError) {
                    console.error('Error parsing products JSON:', parseError);
                    // Fallback to generic products if parsing fails
                    products = [
                        {
                            name: "Bass Pro Shops Pro Qualifier Rod",
                            category: "rod",
                            price: 49.99,
                            reason: "Versatile rod for various conditions"
                        },
                        {
                            name: "Berkley PowerBait",
                            category: "bait",
                            price: 5.99,
                            reason: "Proven bait for many species"
                        }
                    ];
                }
            }
            
            return { 
                advice,
                products,
                success: true 
            };
        } catch (error) {
            console.error('Error in askPro action:', error);
            return {
                advice: 'Sorry, I encountered an error. Please try again.',
                error: true
            };
        }
    }
};