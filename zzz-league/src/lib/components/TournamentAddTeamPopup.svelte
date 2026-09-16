<script lang="ts">
	import { adminAddTeamRegistration, listTeamsPage } from "$lib/backend";
	import { _ } from "$lib/i18n";
	import type { Team } from "$lib/types";

	let {
		open = $bindable(false),
		tournament = undefined,
		registeredTeamIds = [],
	}: {
		open?: boolean;
		tournament?: any;
		registeredTeamIds: string[];
	} = $props();

	let searchQuery = $state("");
	let selectedTeamId = $state("");
	let status = $state("");
	let teams = $state<Team[]>([]);

	$effect(() => {
		if (open) {
			// Every team, not just the admin's own — mirrors TournamentAddPlayerPopup's
			// fetch-everyone-once-then-filter-client-side approach.
			listTeamsPage(null, 500).then((page) => (teams = page.teams));
		}
	});

	let availableTeams = $derived(
		teams.filter(
			(t) =>
				!registeredTeamIds.includes(t.id) &&
				t.name.toLowerCase().includes(searchQuery.toLowerCase()),
		),
	);

	let isAdding = $state(false);
	async function handleAdd() {
		if (isAdding || !selectedTeamId) return;

		isAdding = true;
		try {
			await adminAddTeamRegistration(tournament.id, selectedTeamId);
			status = "";
			open = false;
		} catch (error: any) {
			status = error.message;
		} finally {
			isAdding = false;
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="popup" onclick={() => (open = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="card add-team-card" onclick={(e) => e.stopPropagation()}>
			<div class="close-row">
				<button class="icon-btn" onclick={() => (open = false)} aria-label={$_("common.close")}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<h2 class="popup-title">{$_("tournamentAddTeamPopup.title")}</h2>

			<div class="form-group">
				<label for="add-team-search">{$_("tournamentAddTeamPopup.searchLabel")}</label>
				<span class="search-wrap">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="search-icon"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
					<input
						id="add-team-search"
						type="text"
						class="search-input"
						placeholder={$_("tournamentAddTeamPopup.searchPlaceholder")}
						bind:value={searchQuery}
					/>
				</span>
			</div>

			<div class="form-group">
				<label for="add-team-select">{$_("tournamentAddTeamPopup.teamLabel")}</label>
				<span class="select-wrap">
					<select id="add-team-select" bind:value={selectedTeamId}>
						<option value="">{$_("tournamentAddTeamPopup.selectTeamOption")}</option>
						{#each availableTeams as team}
							<option value={team.id}>{team.name} ({team.creator.name} + {team.player2.name})</option>
						{/each}
					</select>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="select-arrow"><polyline points="6 9 12 15 18 9"/></svg>
				</span>
			</div>

			{#if status}<p class="status error">{status}</p>{/if}
			<button
				class="btn-common btn-play"
				class:btn-loading={isAdding}
				disabled={!selectedTeamId}
				onclick={handleAdd}>{$_("common.add")}</button
			>
		</div>
	</div>
{/if}

<style>
	.add-team-card {
		width: 420px;
		max-width: 90vw;
		padding: 20px 26px 26px;
		gap: 14px;
	}

	.close-row {
		display: flex;
		justify-content: flex-end;
		margin-bottom: -8px;
	}

	.popup-title {
		font-size: 16px;
		font-weight: 800;
		border: none;
		padding-bottom: 0;
		margin-bottom: 0;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form-group label {
		font-size: 12px;
		color: var(--text-dim);
		font-weight: 600;
	}

	.search-wrap {
		position: relative;
		display: block;
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
		padding-left: 28px;
	}

	.select-wrap {
		position: relative;
		display: block;
	}

	.select-wrap select {
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
		width: 100%;
		padding-right: 32px;
	}

	.select-arrow {
		position: absolute;
		right: 11px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-dim);
		pointer-events: none;
	}
</style>
