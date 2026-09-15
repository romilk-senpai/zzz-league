<script lang="ts">
	import { onMount } from "svelte";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import TournamentCard from "$lib/components/TournamentCard.svelte";
	import { isAdmin, tournaments } from "$lib/store";

	let now = $state(Date.now());

	let sortedTournaments = $derived(
		[...$tournaments]
			.filter((t) => t.visible !== false || $isAdmin)
			.sort((a, b) => b.tournamentStartDate - a.tournamentStartDate),
	);

	onMount(() => {
		const interval = setInterval(() => {
			now = Date.now();
		}, 1000);

		return () => {
			clearInterval(interval);
		};
	});
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		<h2 class="archive-title">Архив турниров</h2>
		{#if sortedTournaments.length > 0}
			<div class="archive-grid">
				{#each sortedTournaments as tournament}
					<TournamentCard {tournament} {now} compact />
				{/each}
			</div>
		{:else}
			<p class="empty-label">Турниров пока нет</p>
		{/if}
	</div>
</div>

<style>
	.main-content {
		padding: 24px 28px;
		gap: 20px;
	}

	.archive-title {
		font-size: 20px;
		padding-bottom: 16px;
		/* border-box min-height includes the padding-bottom/border below, so this is
		   32px (the shared control-row height) + 16px + 1px border, to match teams pages'
		   header row exactly */
		min-height: 49px;
		display: flex;
		align-items: center;
	}

	.archive-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 14px;
	}

	.empty-label {
		color: var(--text-dim);
	}
</style>
