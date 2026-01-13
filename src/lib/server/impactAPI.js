import { env } from '$env/dynamic/private';
const { IMPACT_ACCOUNT_SID, IMPACT_AUTH_TOKEN } = env;

/**
 * Search Impact catalog for fishing products
 * @param {string} keyword - Search term (e.g., "crappie rod", "bass lure")
 * @param {number} maxResults - Maximum number of products to return (default 2)
 * @returns {Promise<Array>} Array of product objects
 */
export async function searchImpactProducts(keyword, maxResults = 2) {
    try {
        console.log('🔍 Searching Impact API for:', keyword);
        console.log('📝 Using Account SID:', IMPACT_ACCOUNT_SID ? 'Set' : 'MISSING');
        console.log('🔑 Using Auth Token:', IMPACT_AUTH_TOKEN ? 'Set' : 'MISSING');
        
        // Create base64 auth header
        const auth = Buffer.from(`${IMPACT_ACCOUNT_SID}:${IMPACT_AUTH_TOKEN}`).toString('base64');
        
        // Use ItemSearch endpoint (confirmed working)
        const url = new URL(`https://api.impact.com/Mediapartners/${IMPACT_ACCOUNT_SID}/Catalogs/ItemSearch`);
        
        // Add query parameters
        url.searchParams.append('Keyword', keyword);
        url.searchParams.append('PageSize', Math.max(maxResults * 2, 10).toString()); // Get more to filter
        
        console.log('🌐 Full URL:', url.toString());

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Impact API error:', response.status, response.statusText);
            console.error('❌ Error body:', errorText);
            return getFallbackProducts(keyword);
        }

        const data = await response.json();
        console.log('✅ Impact API found', data.Items?.length || 0, 'products');
        
        // Check different possible response formats
        const items = data.Items || data.items || data.Products || data.products || [];
        
        if (items.length === 0) {
            console.log('⚠️ No products found, using fallback');
            return getFallbackProducts(keyword);
        }
        
        // Transform Impact API response to our product format
        const products = items.map(item => ({
            name: item.Name || item.name || item.ProductName || 'Unknown Product',
            price: parseFloat(item.CurrentPrice || item.Price || item.price || 0),
            imageUrl: item.ImageUrl || item.imageUrl || item.Image || null,
            url: item.Url || item.url || item.ProductUrl || `https://www.basspro.com/SearchDisplay#q=${encodeURIComponent(keyword)}`,
            category: extractCategory(item.Category || item.category || ''),
            reason: `Recommended for ${keyword}`,
            stockStatus: item.StockAvailability || item.stockStatus || 'InStock',
            originalPrice: item.OriginalPrice ? parseFloat(item.OriginalPrice) : null,
            discount: item.DiscountPercentage || null
        }));
        
        console.log('📦 Transformed products:', products.map(p => p.name).join(', '));
        
        return products;
    } catch (error) {
        console.error('💥 Exception in searchImpactProducts:', error);
        return getFallbackProducts(keyword);
    }
}

/**
 * Fallback products when API fails
 */
function getFallbackProducts(keyword) {
    console.log('🔄 Using fallback products for:', keyword);
    return [
        {
            name: `Bass Pro Shops ${keyword}`,
            price: 29.99,
            imageUrl: null,
            url: `https://www.basspro.com/SearchDisplay#q=${encodeURIComponent(keyword)}`,
            category: 'other',
            reason: `Shop for ${keyword} at Bass Pro`,
            stockStatus: 'InStock'
        },
        {
            name: `Recommended ${keyword}`,
            price: 19.99,
            imageUrl: null,
            url: `https://www.basspro.com/SearchDisplay#q=${encodeURIComponent(keyword)}`,
            category: 'other',
            reason: `Find the best ${keyword} deals`,
            stockStatus: 'InStock'
        }
    ];
}

/**
 * Extract simplified category from full category path
 * @param {string} fullCategory - Category like "Fishing > Rods > Bass Rods"
 * @returns {string} Simplified category like "rod"
 */
function extractCategory(fullCategory) {
    if (!fullCategory) return 'other';
    
    const categoryLower = fullCategory.toLowerCase();
    
    if (categoryLower.includes('rod')) return 'rod';
    if (categoryLower.includes('reel')) return 'reel';
    if (categoryLower.includes('lure') || categoryLower.includes('bait')) return 'lure';
    if (categoryLower.includes('line')) return 'line';
    if (categoryLower.includes('tackle')) return 'tackle';
    
    return 'other';
}

/**
 * Smart product search based on user's fishing question
 * Extracts key terms and searches for relevant products
 * @param {string} userQuestion - User's fishing question
 * @returns {Promise<Array>} Array of 2 relevant products
 */
export async function getRelevantProducts(userQuestion) {
    // Extract fishing-related keywords from question
    const keywords = extractFishingKeywords(userQuestion);
    
    console.log('🎯 Extracted keywords:', keywords);
    
    if (keywords.length === 0) {
        // Default search if no specific keywords found
        return await searchImpactProducts('fishing tackle', 2);
    }
    
    // Search for first keyword, get 2 products
    const products = await searchImpactProducts(keywords[0], 2);
    
    // Filter out irrelevant products based on category/name
    const filteredProducts = products.filter(product => {
        const nameLower = product.name.toLowerCase();
        const searchLower = keywords[0].toLowerCase();
        
        // If searching for "rod", exclude parts/accessories
        if (searchLower.includes('rod') && !searchLower.includes('holder')) {
            if (nameLower.includes('holder') || 
                nameLower.includes('tip') || 
                nameLower.includes('repair') ||
                nameLower.includes('part')) {
                return false;
            }
        }
        
        // If searching for lures, exclude tackle boxes and accessories
        if (searchLower.includes('lure') || searchLower.includes('bait') || searchLower.includes('crankbait')) {
            if (nameLower.includes('box') || 
                nameLower.includes('case') ||
                nameLower.includes('storage') ||
                (nameLower.includes('jig') && !searchLower.includes('jig'))) {
                return false;
            }
        }
        
        return true;
    });
    
    // If we filtered everything out, do a fallback search
    if (filteredProducts.length === 0) {
        console.log('⚠️ All products filtered out, trying broader search');
        return await searchImpactProducts('bass pro shops ' + keywords[0].split(' ').pop(), 2);
    }
    
    return filteredProducts.slice(0, 2);
}

/**
 * Extract fishing-related keywords from user question
 * @param {string} question - User's question
 * @returns {Array<string>} Array of search keywords with priority
 */
function extractFishingKeywords(question) {
    const questionLower = question.toLowerCase();
    const keywords = [];
    
    // Priority 1: Specific gear types (most specific first)
    const specificGear = {
        'spinning rod': 'spinning rod',
        'casting rod': 'casting rod',
        'baitcasting rod': 'baitcasting rod',
        'fly rod': 'fly rod',
        'spinning reel': 'spinning reel',
        'baitcasting reel': 'baitcasting reel',
        'crankbait': 'crankbait',
        'crankbaits': 'crankbait',
        'spinnerbait': 'spinnerbait',
        'spinnerbaits': 'spinnerbait',
        'topwater': 'topwater lure',
        'jerkbait': 'jerkbait',
        'soft plastic': 'soft plastic',
        'texas rig': 'texas rig',
        'carolina rig': 'carolina rig',
        'drop shot': 'drop shot rig'
    };
    
    for (const [phrase, searchTerm] of Object.entries(specificGear)) {
        if (questionLower.includes(phrase)) {
            keywords.push(searchTerm);
            break; // Only use the first specific match
        }
    }
    
    // Priority 2: General gear categories (if no specific match)
    if (keywords.length === 0) {
        const generalGear = {
            'rod': 'fishing rod',
            'rods': 'fishing rod',
            'reel': 'fishing reel',
            'reels': 'fishing reel',
            'lure': 'fishing lure',
            'lures': 'fishing lure',
            'bait': 'fishing bait',
            'line': 'fishing line',
            'tackle': 'tackle box'
        };
        
        for (const [word, searchTerm] of Object.entries(generalGear)) {
            if (new RegExp(`\\b${word}\\b`).test(questionLower)) {
                keywords.push(searchTerm);
                break; // Only use first match
            }
        }
    }
    
    // Priority 3: Fish species modifier
    const species = ['bass', 'crappie', 'catfish', 'trout', 'walleye', 'pike', 'muskie', 'bluegill', 'perch', 'salmon'];
    for (const fish of species) {
        if (questionLower.includes(fish)) {
            // Prepend species to existing keyword
            if (keywords.length > 0) {
                keywords[0] = `${fish} ${keywords[0]}`;
            } else {
                keywords.push(`${fish} fishing`);
            }
            break;
        }
    }
    
    // Priority 4: Technique/style modifiers
    if (questionLower.includes('beginner')) {
        if (keywords.length > 0 && !keywords[0].includes('beginner')) {
            keywords[0] = `beginner ${keywords[0]}`;
        }
    }
    
    // Fallback if no keywords found
    if (keywords.length === 0) {
        keywords.push('fishing tackle');
    }
    
    return keywords;
}

/**
 * Test Impact API connection
 * Use this to debug authentication issues
 */
export async function testImpactConnection() {
    try {
        console.log('🧪 Testing Impact API connection...');
        
        const auth = Buffer.from(`${IMPACT_ACCOUNT_SID}:${IMPACT_AUTH_TOKEN}`).toString('base64');
        
        // Try to get campaigns first (simpler endpoint)
        const campaignsUrl = `https://api.impact.com/Mediapartners/${IMPACT_ACCOUNT_SID}/Campaigns`;
        
        console.log('Testing URL:', campaignsUrl);
        
        const response = await fetch(campaignsUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        const text = await response.text();
        console.log('Response body:', text);
        
        return {
            success: response.ok,
            status: response.status,
            body: text
        };
    } catch (error) {
        console.error('Test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}