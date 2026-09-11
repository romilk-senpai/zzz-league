<script lang="ts">
	import { adminAddTeamRegistration, listTeamsPage } from "$lib/backend";
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
		<div class="card" onclick={(e) => e.stopPropagation()}>
			<h2>Добавить команду</h2>
			<div class="form-row">
				<label for="add-team-search">Поиск команды</label>
				<input
					id="add-team-search"
					type="text"
					class="search-input"
					placeholder="Поиск команды..."
					bind:value={searchQuery}
				/>
			</div>
			<div class="form-row">
				<label for="add-team-select">Команда</label>
				<select id="add-team-select" bind:value={selectedTeamId}>
					<option value="">Выберите команду</option>
					{#each availableTeams as team}
						<option value={team.id}>{team.name} ({team.creator.name} + {team.player2.name})</option>
					{/each}
				</select>
			</div>

			{#if status}<p class="status error">{status}</p>{/if}
			<div class="btn-row">
				<button
					class="btn-common btn-play"
					class:btn-loading={isAdding}
					disabled={!selectedTeamId}
					onclick={handleAdd}>Добавить</button
				>
				<button class="btn-common" onclick={() => (open = false)}
					>Закрыть</button
				>
			</div>
		</div>
	</div>
{/if}
