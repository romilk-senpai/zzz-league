<script lang="ts">
	import { listTeamsPage } from "$lib/backend";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import TeamDetailsPopup from "$lib/components/TeamDetailsPopup.svelte";
	import TeamFormPopup from "$lib/components/TeamFormPopup.svelte";
	import type { Team, TeamCursor } from "$lib/types";
	import { bustCache } from "$lib/uiCommon";
	import { onMount } from "svelte";

	const PAGE_SIZE = 20;

	let teams = $state<Team[]>([]);
	let cursor = $state<TeamCursor | null>(null);
	let hasMore = $state(true);
	let loading = $state(true);
	let loadingMore = $state(false);
	let sentinel = $state<HTMLDivElement | undefined>();

	let detailsOpen = $state(false);
	let selectedTeam = $state<Team | null>(null);
	let formOpen = $state(false);
	let editingTeam = $state<Team | null>(null);
	let searchQuery = $state("");

	let filteredTeams = $derived(
		teams.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase())),
	);

	function teamInitials(name: string): string {
		const words = name.trim().split(/\s+/).filter(Boolean);
		if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
		return name.slice(0, 2).toUpperCase();
	}

	function cursorOf(team: Team): TeamCursor {
		return { createdAt: team.createdAt, id: team.id };
	}

	async function loadMore() {
		// `loading` guards against the IntersectionObserver's initial "already intersecting"
		// callback firing before the first page resolves (see HistoryList.svelte for the same fix).
		if (!hasMore || loadingMore || loading) return;
		loadingMore = true;
		try {
			const page = await listTeamsPage(cursor, PAGE_SIZE);
			teams = [...teams, ...page.teams];
			hasMore = page.hasMore;
			if (page.teams.length) cursor = cursorOf(page.teams[page.teams.length - 1]);
		} finally {
			loadingMore = false;
		}
	}

	onMount(async () => {
		loading = true;
		try {
			const page = await listTeamsPage(null, PAGE_SIZE);
			teams = page.teams;
			hasMore = page.hasMore;
			if (page.teams.length) cursor = cursorOf(page.teams[page.teams.length - 1]);
		} finally {
			loading = false;
		}
	});

	$effect(() => {
		if (!sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) loadMore();
			},
			{ rootMargin: "200px" },
		);
		observer.observe(sentinel);

		return () => observer.disconnect();
	});

	function openDetails(team: Team) {
		selectedTeam = team;
		detailsOpen = true;
	}

	function openEdit(team: Team) {
		detailsOpen = false;
		editingTeam = team;
		formOpen = true;
	}

	function handleSaved(updated: Team) {
		formOpen = false;
		teams = teams.map((t) => (t.id === updated.id ? updated : t));
	}

	function handleDeleted(teamId: string) {
		teams = teams.filter((t) => t.id !== teamId);
	}
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		<div class="page-header">
			<h2 class="page-title">Команды</h2>
			<span class="search-wrap">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="search-icon"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
				<input
					class="search-input"
					placeholder="Поиск..."
					bind:value={searchQuery}
				/>
			</span>
		</div>

		{#if loading}
			<p class="notice">Загрузка...</p>
		{:else if teams.length === 0}
			<p class="notice">Команд пока нет</p>
		{:else}
			<div class="team-list">
				{#each filteredTeams as team (team.id)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="team-row" onclick={() => openDetails(team)}>
						{#if team.photoUrl}
							<img class="team-logo" src={bustCache(team.photoUrl)} alt="" />
						{:else}
							<span class="team-logo placeholder">{teamInitials(team.name)}</span>
						{/if}
						<span class="team-name">{team.name}</span>
						<span class="team-players"
							>{team.creator.name} & {team.player2.name}</span
						>
						<svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
					</div>
				{/each}
			</div>
		{/if}

		{#if hasMore}
			<div class="load-sentinel" bind:this={sentinel}></div>
		{/if}
	</div>
</div>

<TeamDetailsPopup bind:open={detailsOpen} team={selectedTeam} onEdit={openEdit} onDeleted={handleDeleted} />
<TeamFormPopup bind:open={formOpen} team={editingTeam} onSaved={handleSaved} />

<style>
	.main-content {
		padding: 24px 28px;
		gap: 16px;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border-soft);
	}

	.page-title {
		font-size: 19px;
		border: none;
		padding: 0;
		margin: 0;
	}

	.search-wrap {
		position: relative;
		display: block;
		width: 160px;
	}

	.search-icon {
		position: absolute;
		left: 10px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-dim);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		height: 32px;
		font-size: 12px;
		padding-left: 28px;
	}

	.team-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
	}

	.team-row {
		display: flex;
		align-items: center;
		gap: 11px;
		height: 40px;
		padding: 0 12px;
		background: var(--surface-2);
		border: 1px solid var(--border-soft);
		border-radius: var(--r-sm);
		cursor: pointer;
		transition: border-color 0.12s ease;
	}

	.team-row:hover {
		border-color: var(--gold-border);
	}

	.team-logo {
		width: 26px;
		height: 26px;
		object-fit: cover;
		border-radius: 5px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 10px;
	}

	.team-logo.placeholder {
		background: var(--surface-hover);
		color: var(--text-muted);
	}

	.team-name {
		font-weight: 700;
		font-size: 12.5px;
		flex-shrink: 0;
		width: 130px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.team-players {
		flex: 1;
		color: var(--text-muted);
		font-size: 12px;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chevron {
		color: var(--text-dim);
		flex-shrink: 0;
	}

	.load-sentinel {
		height: 1px;
	}
</style>
