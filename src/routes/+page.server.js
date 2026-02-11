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
            const conversationHistoryJson = data.get('conversationHistory');
            
            if (!userMsg || typeof userMsg !== 'string') {
                return { 
                    advice: 'Please provide a valid question.',
                    error: true 
                };
            }
            
            // Parse conversation history
            let conversationHistory = [];
            try {
                conversationHistory = JSON.parse(conversationHistoryJson || '[]');
                console.log('Parsed conversation history:', conversationHistory.length, 'messages');
            } catch (e) {
                console.error('Failed to parse conversation history', e);
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
    
            // 3. Build conversation context for AI
            let conversationContext = '';
            if (conversationHistory.length > 0) {
                conversationContext = '\n\nPrevious conversation:\n';
                conversationHistory.forEach(msg => {
                    conversationContext += `User: ${msg.question}\nAssistant: ${msg.answer}\n\n`;
                });
                conversationContext += 'Current question:\n';
            }
    
            // 4. Get AI advice with conversation context
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
            
            // Updated prompt with conversation context
            const prompt = `You are an elite Bass Pro. Location: ${city}, ${region}. Current weather: ${current.temperature}°F.${conversationContext}
    User situation: ${userMsg}
    Output in Markdown. CRITICAL: Do not indent any lines. Every line must start at the very beginning of the margin (no leading spaces). Do not use backticks or code blocks. Use only #, ##, **, and - for formatting.`;
    
            console.log('Sending prompt to AI, length:', prompt.length);
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            
            console.log('AI response received');
            
            const products = await productsPromise;
            
            return { 
                advice: response.text(),
                products: products,
                location: { city, region },
                success: true 
            };
        } catch (error) {
            console.error('Full error in askPro action:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            return {
                advice: 'Sorry, I encountered an error. Please try again.',
                error: true,
                products: []
            };
        }
    }
};