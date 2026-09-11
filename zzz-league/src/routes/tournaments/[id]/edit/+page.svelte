<script lang="ts">
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { getTournament, updateTournament } from "$lib/backend";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import TournamentFormFields from "$lib/components/TournamentFormFields.svelte";
	import { isAdmin } from "$lib/store";
	import { isLocked } from "$lib/tournamentState";
	import type { TournamentGameMode, TournamentRegistrationKind } from "$lib/types";
	import { parseAndValidateTournamentForm, toDateTimeLocal } from "$lib/tournamentForm";
	import { onMount } from "svelte";

	const id = $derived(page.params.id!);

	let loaded = $state(false);
	let loadError = $state("");
	let editable = $state(true);

	let name = $state("");
	let description = $state("");
	// Registration type and game mode are fixed at creation — carried through unchanged, not
	// user-editable here (TournamentFormFields hides their selects when editableTypeAndMode=false).
	let registrationType = $state<TournamentRegistrationKind>("solo");
	let gameMode = $state<TournamentGameMode>("shiyu_defense");

	let registrationStartDate = $state("");
	let registrationEndDate = $state("");
	let tournamentStartDate = $state("");
	let tournamentEndDate = $state("");
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
	let savingTournament = $state(false);

	onMount(async () => {
		try {
			const tournament = await getTournament(id);
			if (!tournament) {
				loadError = "Турнир не найден.";
				return;
			}
			if (isLocked(tournament.state)) {
				editable = false;
				loadError = "Турнир уже начался, редактирование недоступно.";
				return;
			}

			name = tournament.name;
			description = tournament.description ?? "";
			registrationStartDate = toDateTimeLocal(
				new Date(tournament.registrationStartDate),
			);
			registrationEndDate = toDateTimeLocal(
				new Date(tournament.registrationEndDate),
			);
			tournamentStartDate = toDateTimeLocal(
				new Date(tournament.tournamentStartDate),
			);
			tournamentEndDate = toDateTimeLocal(
				new Date(tournament.tournamentEndDate),
			);
			tournamentType = tournament.type ?? "double elimination";
			registrationType = tournament.registrationType;
			gameMode = tournament.gameMode;
			breakTiesEnabled = tournament.consolationMatchesTargetRank != null;
			breakTiesPlace = tournament.consolationMatchesTargetRank ?? 3;
			overrideEloEnabled = (tournament.overrideEloChange ?? -1) !== -1;
			overrideEloValue = overrideEloEnabled ? tournament.overrideEloChange! : 5;
			minCost = tournament.minCost;
			maxCost = tournament.maxCost;
			minCharacters = tournament.minCharacters;
			minTier = String(tournament.minTier);
			maxTier = String(tournament.maxTier);
			visible = tournament.visible ?? true;
			discordRoleName = tournament.discordRoleName ?? "";
			discordChannelName = tournament.discordChannelName ?? "";
		} catch (e: any) {
			loadError = e.message;
		} finally {
			loaded = true;
		}
	});

	async function handleSaveTournament() {
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
			if (savingTournament) return;
			savingTournament = true;
			await updateTournament(id, {
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
			await goto(resolve(`/tournaments/${id}`));
		} catch (e: any) {
			status = e.message;
		} finally {
			savingTournament = false;
		}
	}
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		{#if $isAdmin}
			<h2>Редактировать турнир</h2>

			{#if !loaded}
				<p class="notice">Загрузка...</p>
			{:else if loadError}
				<p class="notice">{loadError}</p>
			{:else if editable}
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
					editableTypeAndMode={false}
				/>

				{#if status}<p class="status error">{status}</p>{/if}

				<div class="btn-col">
					<button
						class="btn-common btn-play"
						class:btn-loading={savingTournament}
						onclick={handleSaveTournament}>Сохранить</button
					>
				</div>
			{/if}
		{:else}
			<p class="notice">Недостаточно прав для просмотра этой страницы.</p>
		{/if}
	</div>
</div>
