<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import TopHeader from '$lib/components/TopHeader.svelte';
	import KeyboardShortcuts from '$lib/components/KeyboardShortcuts.svelte';
	import { page } from '$app/stores';

	let { children } = $props();
	let sidebarCollapsed = $state(false);

	let isLoginPage = $derived($page.url.pathname === '/login');
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if isLoginPage}
	<div class="h-screen w-screen bg-[var(--color-page-void)] overflow-hidden font-[var(--font-general-sans)] text-[var(--color-ink-primary)]">
		{@render children()}
	</div>
{:else}
	<KeyboardShortcuts />

	<div class="h-screen w-screen flex bg-[var(--color-page-void)] overflow-hidden font-[var(--font-general-sans)] text-[var(--color-ink-primary)]">
		<!-- Left Collapsible Sidebar -->
		<Sidebar bind:collapsed={sidebarCollapsed} />

		<!-- Main Workbench Container -->
		<div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
			<!-- Top Context Header -->
			<TopHeader 
				{sidebarCollapsed} 
				onToggleSidebar={() => sidebarCollapsed = !sidebarCollapsed} 
			/>

			<!-- Scrollable Page Content -->
			<main class="flex-1 relative overflow-y-auto">
				{#key $page.url.pathname}
					<div class="h-full">
						{@render children()}
					</div>
				{/key}
			</main>
		</div>
	</div>
{/if}
