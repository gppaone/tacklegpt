import { OpenAI } from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export const actions = {
    askPro: async ({ request }) => {
        const data = await request.formData();
        const userMsg = data.get('message');
        console.log("Users Message:", userMsg);
        // 1. Fetch Weather (US-Only Free NWS API)
        const lat = "35.72"; // Replace with dynamic lat/lon later
        const lon = "-78.85";
        const weatherRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
        const points = await weatherRes.json();
        const forecastRes = await fetch(points.properties.forecastHourly);
        const forecast = await forecastRes.json();
        const current = forecast.properties.periods[0];

        // 2. Talk to AI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { 
                    role: "system", 
                    content: `You are an elite Bass Pro. Use this weather: ${current.temperature}°F, Wind ${current.windSpeed}.
                    Logic: Cold/Still = Finesse. Warm/Windy = Power Fishing. Clear = Natural. Murky = Flashy.` 
                },
                { role: "user", content: userMsg }
            ]
        });

        return { advice: completion.choices[0].message.content };
    }
};