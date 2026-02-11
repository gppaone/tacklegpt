<script>
    import { marked } from 'marked';
    import Arrow from '$lib/images/arrow.svelte';
    import FishLogo from '$lib/images/fish-logo.svelte';
    import ProductCard from '$lib/components/ProductCard.svelte';
    import { enhance } from '$app/forms';
    import { page } from '$app/stores';
    import { browser } from '$app/environment';

    // Svelte 5 runes
    let isLoading = $state(false);
    let question = $state('');
    let submittedQuestion = $state('');
    let formElement = $state();
    let showHistory = $state(false);
    let chatHistory = $state([]);
    let chatContainer = $state();
    let currentConversation = $state([]);
    let activeConversationId = $state(null);

    // Access form data from SvelteKit page store
    let form = $derived($page.form);

    // Load history from localStorage on mount
    $effect(() => {
        if (browser) {
            const saved = localStorage.getItem('fishingChatHistory');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    chatHistory = parsed.map(chat => ({
                        ...chat,
                        id: chat.id || crypto.randomUUID(),
                        timestamp: new Date(chat.timestamp)
                    }));
                } catch (e) { console.error("History load error", e); }
            }
        }
    });
    
    // Save history to localStorage
    $effect(() => {
        if (browser && chatHistory.length > 0) {
            localStorage.setItem('fishingChatHistory', JSON.stringify(chatHistory.slice(-5)));
        }
    });

    // Scroll to bottom when chat updates
    $effect(() => {
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    });

    function handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            formElement.requestSubmit(); 
            isLoading = true;
        }
    }

    function toggleHistory() {
        showHistory = !showHistory;
    }

    function loadConversation(chat) {
        // Don't reload if it's already the active conversation
        if (activeConversationId === chat.id) {
            showHistory = false;
            return;
        }
        
        // Close the modal
        showHistory = false;
        
        // Set as active conversation
        activeConversationId = chat.id;
        
        // Replace current conversation with this one
        currentConversation = [chat];
        
        // Clear the inputs
        question = '';
        submittedQuestion = '';
    }

    function startNewConversation() {
        activeConversationId = null;
        currentConversation = [];
        submittedQuestion = '';
        question = '';
    }

    function handleFormSubmit() {
        return async ({ result, update }) => {
            await update();
            isLoading = false;
            question = '';
            
            // Add the new message after the form response is received
            if (result.type === 'success' && result.data?.advice) {
                const newMessage = {
                    id: crypto.randomUUID(),
                    question: submittedQuestion,
                    answer: result.data.advice,
                    products: result.data.products || [],
                    location: result.data.location,
                    timestamp: new Date()
                };
                
                // Add to current conversation
                currentConversation = [...currentConversation, newMessage];
                
                // If this is a new conversation (not loaded from history), add to history
                if (!activeConversationId) {
                    chatHistory = [...chatHistory, newMessage];
                }
            }
        };
    }

    let htmlAdvice = $derived.by(() => {
        if (!form?.advice) return '';
        
        let cleanText = form.advice
            .replace(/```[a-z]*\n?/gi, '')
            .split('\n')
            .map(line => line.trimStart())
            .join('\n');

        return marked.parse(cleanText);
    });

    function clearHistory() {
        if (confirm('Are you sure you want to clear all chat history?')) {
            chatHistory = [];
            if (browser) {
                localStorage.removeItem('fishingChatHistory');
            }
            showHistory = false;
            startNewConversation();
        }
    }
</script>

<div class="flex flex-col h-screen bg-white overflow-hidden">
    <!-- Header -->
    <header class="bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                <img src="/images/fish-logo.png" alt="TackleGPT Logo" class="w-full h-full object-contain p-1" />
            </div>
            <h1 class="text-lg font-semibold">TackleGPT</h1>
        </div>
        <div class="flex items-center gap-2">
            {#if currentConversation.length > 0 || submittedQuestion}
                <button
                    onclick={startNewConversation}
                    class="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
                >
                    New Chat
                </button>
            {/if}
            <button
                onclick={toggleHistory}
                class="px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-lg text-sm font-medium transition-colors"
            >
                History ({chatHistory.length})
            </button>
        </div>
    </header>

    <!-- Chat Area -->
    <div 
        bind:this={chatContainer}
        class="flex-1 overflow-y-auto px-4 py-6 bg-white"
    >
        <div class="max-w-3xl mx-auto space-y-4">
            {#if currentConversation.length === 0 && !isLoading}
                <!-- Welcome Message -->
                <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
                        <img src="/images/fish-logo.png" alt="Catch Pro" class="w-full h-full object-contain p-0.5" />
                    </div>
                    <div class="bg-slate-100 rounded-lg px-4 py-3 shadow-sm max-w-[80%]">
                        <p class="text-slate-800">Get a tactical audible when the bite is slow. Ask me anything about fishing!</p>
                    </div>
                </div>
            {/if}

            <!-- Display Current Conversation -->
            {#each currentConversation as chat}
                <!-- User Message -->
                <div class="flex justify-end">
                    <div class="bg-blue-500 text-white rounded-lg px-4 py-3 shadow-sm max-w-[80%]">
                        <p class="text-sm">{chat.question}</p>
                    </div>
                </div>

                <!-- Bot Response -->
                <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
                        <img src="/images/fish-logo.png" alt="Catch Pro" class="w-full h-full object-contain p-0.5" />
                    </div>
                    <div class="bg-slate-100 rounded-lg px-4 py-3 shadow-sm max-w-[80%]">
                        <div class="pro-response text-slate-800 text-sm">
                            {#if chat.location}
                                <p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                                    📍 {chat.location.city}, {chat.location.region}
                                </p>
                            {/if}
                            {@html marked.parse(chat.answer.replace(/```[a-z]*\n?/gi, '').split('\n').map(line => line.trimStart()).join('\n'))}
                        </div>
                        <!-- Product Recommendations -->
                        {#if chat.products && chat.products.length > 0}
                            <div class="mt-4 pt-4 border-t border-slate-200">
                                <p class="text-xs font-semibold text-slate-600 mb-3">Recommended Products:</p>
                                <div class="space-y-2">
                                    {#each chat.products as product}
                                        <ProductCard {product} />
                                    {/each}
                                </div>
                                <p class="text-xs text-slate-500 mt-2 text-center">Products are affiliate links. If you buy something, I get a commission.</p>
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}

            {#if isLoading}
                <!-- Loading Indicator -->
                <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
                        <img src="/images/fish-logo.png" alt="Catch Pro" class="w-full h-full object-contain p-0.5" />
                    </div>
                    <div class="bg-slate-100 rounded-lg px-4 py-3 shadow-sm">
                        <div class="flex gap-1">
                            <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                            <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                            <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <!-- Input Area -->
    <div class="border-t border-slate-200 bg-white px-4 py-3">
        <div class="max-w-3xl mx-auto">
            <form 
                bind:this={formElement}
                method="POST" 
                action="?/askPro" 
                use:enhance={() => {
                    isLoading = true;
                    submittedQuestion = question;
                    return handleFormSubmit();
                }}
                class="flex items-end gap-2"
            >
                <textarea
                    bind:value={question}
                    name="message"
                    oninput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onkeydown={handleKeydown}
                    placeholder="Write a message"
                    rows="1"
                    class="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 resize-none overflow-hidden min-h-[44px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-slate-400"
                ></textarea>
                <!-- Hidden input to send conversation history -->
                <input type="hidden" name="conversationHistory" value={JSON.stringify(currentConversation)} />
                <button
                    type="submit"
                    disabled={isLoading || !question.trim()}
                    class="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors shrink-0"
                >
                    {#if isLoading}
                        <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {:else}
                        <Arrow class="w-5 h-5" />
                    {/if}
                </button>
            </form>
        </div>
    </div>

    <!-- History Modal -->
    {#if showHistory}
        <div 
            class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            role="dialog"
        >
            <div 
                class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
            >
                <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 class="text-xl font-semibold text-slate-800">Recent Conversations</h2>
                    <button
                        onclick={toggleHistory}
                        class="text-slate-500 hover:text-slate-700 text-2xl leading-none"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                <div class="flex-1 overflow-y-auto p-6">
                    {#if chatHistory.length === 0}
                        <p class="text-slate-500 text-center py-8">No chat history yet. Start a conversation!</p>
                    {:else}
                        <div class="space-y-3">
                            {#each chatHistory.slice().reverse() as chat, index}
                                <button
                                    onclick={() => loadConversation(chat)}
                                    class="w-full text-left bg-slate-50 hover:bg-slate-100 rounded-lg p-4 transition-colors border border-slate-200 hover:border-blue-300 {activeConversationId === chat.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''}"
                                >
                                    <div class="flex items-start justify-between gap-3 mb-2">
                                        <p class="font-medium text-slate-800 text-sm line-clamp-2 flex-1">
                                            {chat.question}
                                        </p>
                                        <span class="text-xs text-slate-500 whitespace-nowrap">
                                            {chat.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <p class="text-xs text-slate-600 line-clamp-2">
                                        {chat.answer.replace(/[#*`]/g, '').substring(0, 100)}...
                                    </p>
                                    {#if activeConversationId === chat.id}
                                        <span class="text-xs text-blue-600 font-medium mt-2 inline-block">Active</span>
                                    {/if}
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>
                {#if chatHistory.length > 0}
                    <div class="px-6 py-4 border-t border-slate-200">
                        <button
                            onclick={clearHistory}
                            class="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            Clear All History
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>