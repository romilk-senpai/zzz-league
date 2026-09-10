<script lang="ts">
	import { listMyTeams } from "$lib/backend";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import TeamDetailsPopup from "$lib/components/TeamDetailsPopup.svelte";
	import TeamFormPopup from "$lib/components/TeamFormPopup.svelte";
	import { currentUser, isAdmin } from "$lib/store";
	import type { Team } from "$lib/types";
	import { bustCache } from "$lib/uiCommon";

	// Defensive, even though listMyTeams() should only ever return teams the caller belongs to —
	// mirrors TeamDetailsPopup's membership-or-admin check so the edit button can't show for a
	// team the viewer isn't actually part of.
	function canEdit(team: Team): boolean {
		return (
			$isAdmin ||
			team.creator.uid === $currentUser?.uid ||
			team.player2.uid === $currentUser?.uid
		);
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
		<h2>Мои команды</h2>
		<button class="btn-common btn-play create-btn" onclick={openCreate}
			>+ Создать команду</button
		>

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
							<img class="team-logo" src={bustCache(team.photoUrl)} alt="" />
						{/if}
						<span class="team-name">{team.name}</span>
						<span class="team-players"
							>{team.creator.name} & {team.player2.name}</span
						>
						{#if canEdit(team)}
							<button
								class="btn-common edit-btn"
								onclick={(e) => {
									e.stopPropagation();
									openEdit(team);
								}}>Изменить</button
							>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<TeamDetailsPopup bind:open={detailsOpen} team={selectedTeam} onEdit={openEdit} onDeleted={handleDeleted} />
<TeamFormPopup bind:open={formOpen} team={editingTeam} onSaved={handleSaved} />

<style>
	.create-btn {
		width: auto;
		padding: 10px 20px;
		margin-bottom: 16px;
	}

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

	.edit-btn {
		width: auto;
		padding: 6px 12px;
		flex-shrink: 0;
	}
</style>
