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
		<h2>Команды</h2>

		{#if loading}
			<p class="notice">Загрузка...</p>
		{:else if teams.length === 0}
			<p class="notice">Команд пока нет</p>
		{:else}
			<div class="team-list">
				{#each teams as team (team.id)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="team-row" onclick={() => openDetails(team)}>
						{#if team.photoUrl}
							<img class="team-logo" src={bustCache(team.photoUrl)} alt="" />
						{/if}
						<span class="team-name">{team.name}</span>
						<span class="team-players"
							>{team.creator.name} & {team.player2.name}</span
						>
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
	.team-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
	}

	.team-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		background: #222;
		border-radius: 8px;
		border: 1px solid #333;
		cursor: pointer;
	}

	.team-row:hover {
		border-color: #555;
	}

	.team-logo {
		width: 32px;
		height: 32px;
		object-fit: cover;
		border-radius: 6px;
		flex-shrink: 0;
	}

	.team-name {
		font-weight: bold;
		flex-shrink: 0;
	}

	.team-players {
		flex: 1;
		color: #ccc;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.load-sentinel {
		height: 1px;
	}
</style>
