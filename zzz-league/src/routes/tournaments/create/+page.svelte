<script lang="ts">
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { createTournament } from "$lib/backend";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import TournamentFormFields from "$lib/components/TournamentFormFields.svelte";
	import { isAdmin } from "$lib/store";
	import type { TournamentGameMode, TournamentRegistrationKind } from "$lib/types";
	import { parseAndValidateTournamentForm, toDateTimeLocal } from "$lib/tournamentForm";

	let name = $state("");
	let description = $state("");
	let registrationType = $state<TournamentRegistrationKind>("solo");
	let gameMode = $state<TournamentGameMode>("shiyu_defense");

	const now = new Date();
	let registrationStartDate = $state(toDateTimeLocal(now));
	let registrationEndDate = $state(toDateTimeLocal(now));
	let tournamentStartDate = $state(toDateTimeLocal(now));
	let tournamentEndDate = $state(toDateTimeLocal(now));
	let tournamentType = $state("double elimination");
	let breakTiesEnabled = $state(false);
	let breakTiesPlace = $state(3);
	let overrideEloEnabled = $state(false);
	let overrideEloValue = $state(5);
	let minCost = $state(2100);
	let maxCost = $state(2200);
	let minCharacters = $state(14);
	let minTier = $state("0");
	let maxTier = $state("1000");
	let visible = $state(true);
	let discordRoleName = $state("");
	let discordChannelName = $state("");

	let status = $state("");
	let creatingTournament = $state(false);

	async function handleCreateTournament() {
		const result = parseAndValidateTournamentForm({
			name,
			registrationStartDate,
			registrationEndDate,
			tournamentStartDate,
			tournamentEndDate,
			tournamentType,
			overrideEloEnabled,
			overrideEloValue,
		});
		if (result.error !== null) {
			status = result.error;
			return;
		}

		try {
			if (creatingTournament) return;
			creatingTournament = true;
			const created = await createTournament({
				name,
				description,
				registrationType,
				gameMode,
				registrationStartDate: result.regStart,
				registrationEndDate: result.regEnd,
				tournamentStartDate: result.tourStart,
				tournamentEndDate: result.tourEnd,
				minCost,
				maxCost,
				minCharacters,
				minTier: parseInt(minTier),
				maxTier: parseInt(maxTier),
				overrideEloChange: overrideEloEnabled ? overrideEloValue : -1,
				bracketType: tournamentType,
				consolationMatchesTargetRank: breakTiesEnabled
					? breakTiesPlace
					: null,
				visible,
				discordRoleName,
				discordChannelName,
			});
			await goto(resolve(`/tournaments/${created.id}`));
		} catch (e: any) {
			status = e.message;
		} finally {
			creatingTournament = false;
		}
	}
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		{#if $isAdmin}
			<h2>Создать турнир</h2>

			<TournamentFormFields
				bind:name
				bind:description
				bind:registrationType
				bind:gameMode
				bind:tournamentType
				bind:breakTiesEnabled
				bind:breakTiesPlace
				bind:overrideEloEnabled
				bind:overrideEloValue
				bind:minTier
				bind:maxTier
				bind:minCost
				bind:maxCost
				bind:minCharacters
				bind:discordRoleName
				bind:discordChannelName
				bind:visible
				bind:registrationStartDate
				bind:registrationEndDate
				bind:tournamentStartDate
				bind:tournamentEndDate
			/>

			{#if status}<p class="status error">{status}</p>{/if}

			<div class="btn-col">
				<button
					class="btn-common btn-play"
					class:btn-loading={creatingTournament}
					onclick={handleCreateTournament}>Создать</button
				>
			</div>
		{:else}
			<p class="notice">Недостаточно прав для просмотра этой страницы.</p>
		{/if}
	</div>
</div>
