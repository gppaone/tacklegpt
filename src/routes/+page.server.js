// src/routes/+page.server.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from '$env/dynamic/private';
const { GEMINI_API_KEY } = env;
import { getRelevantProducts } from '$lib/server/impactAPI';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const actions = {
    testImpact: async () => {
        const result = await testImpactConnection();
        return result;
    },
    // Destructure 'locals' from the action event
    askPro: async ({ request, locals }) => {
        try {
            const data = await request.formData();
            const userMsg = data.get('message');
            
            if (!userMsg || typeof userMsg !== 'string') {
                return { 
                    advice: 'Please provide a valid question.',
                    error: true 
                };
            }
            
            // 1. Get dynamic location from locals (populated by hooks.server.js)
            // Fallback included just in case geo-lookup fails
            const { lat, lon, city, region } = locals.location || { lat: "35.72", lon: "-78.85", city: "Apex", region: "NC" };
            
            let current;
            try {
                // Using the dynamic coordinates
                const weatherRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
                const points = await weatherRes.json();
                const forecastRes = await fetch(points.properties.forecastHourly);
                const forecast = await forecastRes.json();
                current = forecast.properties.periods[0];
            } catch (weatherError) {
                console.error('Weather fetch error:', weatherError);
                current = { temperature: 70, windSpeed: '5 mph' };
            }

            // 2. Get relevant products from Impact API
            const productsPromise = getRelevantProducts(userMsg);

            // 3. Get AI advice
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
            
            // Added location context to the prompt for better AI advice
            const prompt = `You are an elite Bass Pro. Location: ${city}, ${region}. Current weather: ${current.temperature}°F. 
User situation: ${userMsg}
Output in Markdown. CRITICAL: Do not indent any lines. Every line must start at the very beginning of the margin (no leading spaces). Do not use backticks or code blocks. Use only #, ##, **, and - for formatting.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            
            const products = await productsPromise;
            
            return { 
                advice: response.text(),
                products: products,
                location: { city, region }, // Passing this back so the UI can show "Weather for Apex, NC"
                success: true 
            };
        } catch (error) {
            console.error('Error in askPro action:', error);
            return {
                advice: 'Sorry, I encountered an error. Please try again.',
                error: true,
                products: []
            };
        }
    }
};