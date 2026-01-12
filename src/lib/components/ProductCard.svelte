<!-- src/lib/components/ProductCard.svelte -->
<script>
    let { product } = $props();
    
    // Generate placeholder image based on category
    const categoryImages = {
        rod: '/images/products/rod-sample.png',
        reel: '/images/products/reel-sample.png',
        lure: '/images/products/lure-sample.png',
        bait: '/images/products/bait-sample.png',
        tackle: '/images/products/tackle-sample.png',
        line: '/images/products/line-sample.png',
        other: '/images/products/generic-sample.png'
    };
    
    // Fallback to a generic fishing product image
    const imageUrl = categoryImages[product.category] || categoryImages.other;
    
    // TODO: Replace with Bass Pro affiliate link when API is integrated
    const productUrl = `https://www.basspro.com/search?q=${encodeURIComponent(product.name)}`;
</script>

<a 
    href={productUrl}
    target="_blank"
    rel="noopener noreferrer"
    class="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-md transition-all group"
>
    <div class="w-20 h-20 bg-slate-100 rounded-md overflow-hidden shrink-0 flex items-center justify-center">
        <!-- Placeholder for product image -->
        <img 
            src={imageUrl}
            alt={product.name}
            class="w-full h-full object-cover"
            onerror={(e) => {
                // Fallback to icon if image doesn't load
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<svg class="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>';
            }}
        />
    </div>
    <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-slate-800 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
            {product.name}
        </h3>
        <p class="text-xs text-slate-500 mt-1 line-clamp-1">
            {product.reason}
        </p>
        <p class="text-blue-600 font-bold mt-1">
            ${product.price.toFixed(2)}
        </p>
    </div>
    <svg class="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
    </svg>
</a>

<style>
    .line-clamp-1 {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>