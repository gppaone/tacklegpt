// src/routes/+page.server.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY } from '$env/static/private';
import { getRelevantProducts } from '$lib/server/impactAPI';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const actions = {
    testImpact: async () => {
        const result = await testImpactConnection();
        return result;
    },
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

            // 2. Get relevant products from Impact API (parallel with AI response)
            const productsPromise = getRelevantProducts(userMsg);

            // 3. Get AI advice
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
            
            const prompt = `You are an elite Bass Pro. Current weather: ${current.temperature}°F. 
User situation: ${userMsg}
Output in Markdown. CRITICAL: Do not indent any lines. Every line must start at the very beginning of the margin (no leading spaces). Do not use backticks or code blocks. Use only #, ##, **, and - for formatting.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            
            // 4. Wait for products to load
            const products = await productsPromise;
            
            return { 
                advice: response.text(),
                products: products,
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