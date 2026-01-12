<!-- src/lib/components/ProductCard.svelte -->
<script>
    let { product } = $props();
    
    // Use actual product image from Impact or fallback
    const imageUrl = product.imageUrl || '/images/products/placeholder.jpg';
    
    // Calculate savings if there's a discount
    const hasSavings = product.originalPrice && product.originalPrice > product.price;
    const savings = hasSavings ? (product.originalPrice - product.price).toFixed(2) : null;
</script>

<a 
    href={product.url}
    target="_blank"
    rel="noopener noreferrer"
    class="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-md transition-all group"
>
    <div class="w-20 h-20 bg-slate-100 rounded-md overflow-hidden shrink-0 flex items-center justify-center">
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
        {#if product.reason}
            <p class="text-xs text-slate-500 mt-1 line-clamp-1">
                {product.reason}
            </p>
        {/if}
        <div class="flex items-center gap-2 mt-1">
            <p class="text-blue-600 font-bold">
                ${product.price.toFixed(2)}
            </p>
            {#if hasSavings}
                <span class="text-xs text-slate-400 line-through">
                    ${product.originalPrice.toFixed(2)}
                </span>
                <span class="text-xs text-green-600 font-semibold">
                    Save ${savings}
                </span>
            {/if}
        </div>
        {#if product.stockStatus === 'LowStock'}
            <p class="text-xs text-orange-600 mt-1 font-medium">Only a few left!</p>
        {/if}
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