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
    let lastAddedQuestion = $state('');
    let lastAddedAdvice = $state('');

    // Access form data from SvelteKit page store
    let form = $derived($page.form);

    // Load history from localStorage on mount
    $effect(() => {
        if (form?.advice && submittedQuestion && 
            (submittedQuestion !== lastAddedQuestion || form.advice !== lastAddedAdvice)) {
            chatHistory = [...chatHistory, {
                question: submittedQuestion,
                answer: form.advice,
                products: form.products || [],
                timestamp: new Date()
            }];
            lastAddedQuestion = submittedQuestion;
            lastAddedAdvice = form.advice;
            
            if (chatContainer) {
                setTimeout(() => {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }, 100);
            }
        }
    });

    // Save to localStorage whenever chatHistory changes
    $effect(() => {
        if (browser && chatHistory.length > 0) {
            // Keep only last 5 conversations
            const recentHistory = chatHistory.slice(-5);
            localStorage.setItem('fishingChatHistory', JSON.stringify(recentHistory));
            // Update chatHistory if we trimmed it
            if (recentHistory.length !== chatHistory.length) {
                chatHistory = recentHistory;
            }
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
        // Close the modal
        showHistory = false;
        
        // Set the question and submitted question to show it in the chat
        question = chat.question;
        submittedQuestion = chat.question;
        
        // Manually trigger the form with the selected question
        // This will send it to the API again
        setTimeout(() => {
            if (formElement) {
                formElement.requestSubmit();
            }
        }, 100);
    }

    // Add messages to history when form updates
    $effect(() => {
        if (form?.advice && submittedQuestion && 
            (submittedQuestion !== lastAddedQuestion || form.advice !== lastAddedAdvice)) {
            chatHistory = [...chatHistory, {
                question: submittedQuestion,
                answer: form.advice,
                timestamp: new Date()
            }];
            lastAddedQuestion = submittedQuestion;
            lastAddedAdvice = form.advice;
            
            // Scroll to bottom when new message arrives
            if (chatContainer) {
                setTimeout(() => {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }, 100);
            }
        }
    });

    // Scroll to bottom on mount or when chat updates
    $effect(() => {
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    });

    let isCurrentResponseInHistory = $derived.by(() => {
        if (!form?.advice || !submittedQuestion) return false;
        const lastHistoryItem = chatHistory[chatHistory.length - 1];
        return lastHistoryItem?.question === submittedQuestion && 
            lastHistoryItem?.answer === form.advice;
    });

    let isCurrentQuestionInHistory = $derived.by(() => {
        if (!submittedQuestion) return false;
        return chatHistory.some(chat => chat.question === submittedQuestion);
    });

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
        <button
            onclick={toggleHistory}
            class="px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-lg text-sm font-medium transition-colors"
        >
            History ({chatHistory.length})
        </button>
    </header>

    <!-- Chat Area -->
    <div 
        bind:this={chatContainer}
        class="flex-1 overflow-y-auto px-4 py-6 bg-white"
    >
        <div class="max-w-3xl mx-auto space-y-4">
            {#if chatHistory.length === 0 && !form?.advice && !isLoading}
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

            <!-- Chat History -->
            {#each chatHistory as chat}
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

            <!-- Current Conversation -->
            {#if submittedQuestion && !isCurrentQuestionInHistory}
                <!-- User Message -->
                <div class="flex justify-end">
                    <div class="bg-blue-500 text-white rounded-lg px-4 py-3 shadow-sm max-w-[80%]">
                        <p class="text-sm">{submittedQuestion}</p>
                    </div>
                </div>
            {/if}

            {#if form?.advice && !isCurrentResponseInHistory}
                <!-- Bot Response -->
                <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
                        <img src="/images/fish-logo.png" alt="Catch Pro" class="w-full h-full object-contain p-0.5" />
                    </div>
                    <div class="bg-slate-100 rounded-lg px-4 py-3 shadow-sm max-w-[80%]">
                        <div class="pro-response text-slate-800 text-sm">
                            {@html htmlAdvice}
                        </div>
                        <!-- Product Recommendations for Current Response -->
                        {#if form.products && form.products.length > 0}
                            <div class="mt-4 pt-4 border-t border-slate-200">
                                <p class="text-xs font-semibold text-slate-600 mb-3">Recommended Products:</p>
                                <div class="space-y-2">
                                    {#each form.products as product}
                                        <ProductCard {product} />
                                    {/each}
                                </div>
                                <p class="text-xs text-slate-500 mt-2 text-center">Products are affiliate links. If you buy something, I get a commission.</p>
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}

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
                    lastAddedQuestion = '';
                    lastAddedAdvice = '';
                    return async ({ update }) => {
                        await update();
                        isLoading = false;
                        question = '';
                    };
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
                                    class="w-full text-left bg-slate-50 hover:bg-slate-100 rounded-lg p-4 transition-colors border border-slate-200 hover:border-blue-300"
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

<style>
    /* Styling for markdown content in chat bubbles */
    :global(.pro-response h1) {
        font-size: 1.2em;
        font-weight: bold;
        margin-top: 0.5em;
        margin-bottom: 0.5em;
    }
    
    :global(.pro-response h2) {
        font-size: 1.1em;
        font-weight: bold;
        margin-top: 0.5em;
        margin-bottom: 0.5em;
    }
    
    :global(.pro-response h3) {
        font-size: 1em;
        font-weight: bold;
        margin-top: 0.5em;
        margin-bottom: 0.5em;
    }
    
    :global(.pro-response p) {
        margin-bottom: 0.75em;
        line-height: 1.5;
    }
    
    :global(.pro-response p:last-child) {
        margin-bottom: 0;
    }
    
    :global(.pro-response ul, .pro-response ol) {
        margin-left: 1.25em;
        margin-bottom: 0.75em;
    }
    
    :global(.pro-response li) {
        margin-bottom: 0.25em;
    }
    
    :global(.pro-response strong) {
        font-weight: 600;
    }
    
    :global(.pro-response em) {
        font-style: italic;
    }
    
    :global(.pro-response code) {
        background-color: rgba(0, 0, 0, 0.05);
        padding: 0.15em 0.3em;
        border-radius: 0.25em;
        font-family: monospace;
        font-size: 0.9em;
    }
    
    :global(.pro-response pre) {
        background-color: rgba(0, 0, 0, 0.05);
        padding: 0.75em;
        border-radius: 0.5em;
        overflow-x: auto;
        margin-bottom: 0.75em;
    }
    
    :global(.pro-response pre code) {
        background-color: transparent;
        padding: 0;
    }
    
    :global(.pro-response blockquote) {
        border-left: 3px solid #94a3b8;
        padding-left: 0.75em;
        margin-left: 0;
        margin-bottom: 0.75em;
        font-style: italic;
        color: #64748b;
    }

    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>