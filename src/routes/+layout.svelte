<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.ico';

	let { children } = $props();
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    <title>TackleGPT - Your Fishing Advisor</title>
    <meta name="description" content="Get a tactical audible when the bite is slow. Ask me anything about fishing!">
    <meta name="keywords" content="fishing, advice, tackle, gear, weather, tactics">
    <meta name="author" content="TackleGPT">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</svelte:head>
{@render children()}
