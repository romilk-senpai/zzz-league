<script lang="ts">
	import { listMyTeams } from "$lib/backend";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import TeamDetailsPopup from "$lib/components/TeamDetailsPopup.svelte";
	import TeamFormPopup from "$lib/components/TeamFormPopup.svelte";
	import { currentUser, isAdmin } from "$lib/store";
	import type { Team } from "$lib/types";
	import { bustCache } from "$lib/uiCommon";

	function teamInitials(name: string): string {
		const words = name.trim().split(/\s+/).filter(Boolean);
		if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
		return name.slice(0, 2).toUpperCase();
	}

	let teams = $state<Team[]>([]);
	let loading = $state(true);
	let formOpen = $state(false);
	let editingTeam = $state<Team | null>(null);
	let detailsOpen = $state(false);
	let selectedTeam = $state<Team | null>(null);

	async function load() {
		if (!$currentUser) {
			// On a full page reload, Firebase auth hasn't resolved yet on first render — this
			// isn't "logged out", it's "don't know yet". The $effect below re-runs load() once
			// $currentUser actually settles (to a user or to null), so this just clears the
			// spinner instead of leaving it stuck forever waiting for a retry that never comes.
			teams = [];
			loading = false;
			return;
		}
		loading = true;
		teams = await listMyTeams($currentUser.uid);
		loading = false;
	}

	$effect(() => {
		$currentUser;
		load();
	});

	function openCreate() {
		editingTeam = null;
		formOpen = true;
	}

	function openEdit(team: Team) {
		detailsOpen = false;
		editingTeam = team;
		formOpen = true;
	}

	function openDetails(team: Team) {
		selectedTeam = team;
		detailsOpen = true;
	}

	function handleSaved() {
		formOpen = false;
		load();
	}

	function handleDeleted() {
		load();
	}
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		<div class="page-header">
			<h2 class="page-title">Мои команды</h2>
			<button class="btn-common btn-play create-btn" onclick={openCreate}
				>+ Создать команду</button
			>
		</div>

		{#if !$currentUser}
			<p class="notice">Войдите, чтобы увидеть свои команды.</p>
		{:else if loading}
			<p class="notice">Загрузка...</p>
		{:else if teams.length === 0}
			<p class="notice">У вас пока нет команд</p>
		{:else}
			<div class="team-list">
				{#each teams as team (team.id)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="team-row" onclick={() => openDetails(team)}>
						{#if team.photoUrl}
							<img
								class="team-logo"
								src={bustCache(team.photoUrl)}
								alt=""
							/>
						{:else}
							<span class="team-logo placeholder"
								>{teamInitials(team.name)}</span
							>
						{/if}
						<span class="team-name">{team.name}</span>
						<span class="team-players"
							>{team.creator.name} & {team.player2.name}</span
						>
						<svg
							class="chevron"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><polyline points="9 18 15 12 9 6" /></svg
						>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<TeamDetailsPopup
	bind:open={detailsOpen}
	team={selectedTeam}
	onEdit={openEdit}
	onDeleted={handleDeleted}
/>
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

	.create-btn {
		width: auto;
		height: 32px;
		font-size: 11.5px;
		padding: 0 14px;
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
</style>
