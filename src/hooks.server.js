/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    let ip = '8.8.8.8'; // Default to a public IP (like Google's) for local testing

    try {
        ip = event.getClientAddress();
    } catch (e) {
        console.warn("Could not determine client address, using fallback IP.");
    }

    // 2. Fetch Geo Data (Approximate based on IP)
    // We only do this if we haven't already stored it (optional optimization)
    try {
        // Use a 1-second timeout so a slow Geo-API doesn't hang your site
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1000);

        const response = await fetch(`http://ip-api.com/json/${ip}`, { signal: controller.signal });
        const geo = await response.json();
        clearTimeout(timeout);

        if (geo.status === 'success') {
            // 3. Store in event.locals
            // event.locals is a "per-request" storage bucket
            event.locals.location = {
                lat: geo.lat,
                lon: geo.lon,
                city: geo.city,
                region: geo.regionName
            };
        }
    } catch (e) {
        console.error('Hooks Geo-IP Error:', e);
        // Fallback to your Apex, NC defaults
        event.locals.location = { lat: 35.72, lon: -78.85, city: 'Apex', region: 'NC' };
    }

    // 4. Continue to the rest of your app
    return await resolve(event);
}