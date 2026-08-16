<script lang="ts">
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import TournamentGamePopup from "$lib/components/TournamentMatchPopup.svelte";
	import TournamentPlayerTable from "$lib/components/TournamentPlayerTable.svelte";
	import TournamentRegisterPopup from "$lib/components/TournamentRegistrationPopup.svelte";
	import TournamentAddPlayerPopup from "$lib/components/TournamentAddPlayerPopup.svelte";
	import {
		closeTournamentRegistration,
		createChallongeBracket,
		db,
		deleteTournament,
		finishTournament,
		startChallongeTournament,
		updateTournamentGames,
	} from "$lib/firebase";
	import { currentUser, isAdmin, playersByUid } from "$lib/store";
	import type {
		Player,
		RegisteredPlayer,
		Tournament,
		TournamentMatch,
		TournamentRegistration,
	} from "$lib/types";
	import {
		TOURNAMENT_STATE,
		hasTournamentStarted,
		isBracketCreated,
		isLocked,
		isRegistrationClosed,
		isRegistrationOpen,
		isRegistrationWindowOpen,
	} from "$lib/tournamentState";
	import { dateDisplayOptions, renderMarkdown } from "$lib/uiCommon";
	import { capDefaultHeight } from "$lib/actions/capDefaultHeight";
	import { onValue, ref } from "firebase/database";
	import { onMount } from "svelte";

	const id = $derived(page.params.id);

	let now = $state(Date.now());
	let tournament = $state<Tournament>();
	let userRegistration = $state<TournamentRegistration | null>();
	let userPlayer = $state<Player | null>();
	let myRegistration = $state<TournamentRegistration | null>();
	let registrations = $state<TournamentRegistration[]>([]);
	let registeredPlayers = $derived(
		registrations
			.map((registration) => {
				const player = $playersByUid.get(registration.uid);
				return player ? { player, registration } : null;
			})
			.filter(Boolean) as RegisteredPlayer[],
	);
	let searchQuery = $state("");
	let registrationOpen = $state(false);
	let matchOpen = $state(false);
	let addPlayerPopupOpen = $state(false);
	let currentMatchId = $state();
	let currentMatch = $derived(
		tournament?.matches.find((m: TournamentMatch) => m.id === currentMatchId),
	);

	let showCompleted = $state(true);
	let showOnlyMine = $state(false);
	let matchesExpanded = $state(true);
	let bracketExpanded = $state(true);
	let matchSearchQuery = $state("");

	$effect(() => {
		const currentId = id;
		if (!currentId) return;
		try {
			const raw = localStorage.getItem(`tournament-filters-${currentId}`);
			const parsed = raw ? JSON.parse(raw) : null;
			showCompleted = parsed?.showCompleted ?? true;
			showOnlyMine = parsed?.showOnlyMine ?? false;
			matchSearchQuery = parsed?.matchSearchQuery ?? "";
		} catch {
			// localStorage unavailable — ignore
		}
	});

	$effect(() => {
		const currentId = id;
		if (!currentId) return;
		try {
			localStorage.setItem(
				`tournament-filters-${currentId}`,
				JSON.stringify({ showCompleted, showOnlyMine, matchSearchQuery }),
			);
		} catch {
			// localStorage unavailable — ignore
		}
	});

	let currentUserParticipates = $derived(
		!!$currentUser &&
			registeredPlayers.some((p) => p.player.uid === $currentUser!.uid),
	);

	let filteredMatches = $derived(
		tournament?.matches.filter((m: TournamentMatch) => {
			if (m.p1 === "TBD" || m.p2 === "TBD") return false;
			if (!showCompleted && m.state === "complete") return false;
			if (
				showOnlyMine &&
				currentUserParticipates &&
				m.p1 !== $currentUser!.uid &&
				m.p2 !== $currentUser!.uid
			)
				return false;
			if (matchSearchQuery) {
				const query = matchSearchQuery.toLowerCase();
				const p1Name = getPlayerName(m.p1)?.toLowerCase() ?? "";
				const p2Name = getPlayerName(m.p2)?.toLowerCase() ?? "";
				if (!p1Name.includes(query) && !p2Name.includes(query))
					return false;
			}
			return true;
		}),
	);

	let canView = $derived(tournament?.visible !== false || $isAdmin);

	let currentUserTier = $derived(
		$currentUser?.isHighConfirmed
			? 1000
			: $currentUser?.isMidConfirmed
				? 100
				: 0,
	);
	let tierEligible = $derived(
		!!tournament &&
			currentUserTier >= tournament.minTier &&
			currentUserTier <= tournament.maxTier,
	);
	let registrationWindowOpen = $derived(
		!!tournament &&
			isRegistrationWindowOpen(
				tournament.state,
				tournament.registrationStartDate,
				tournament.registrationEndDate,
				now,
			),
	);
	let unsubRegistration: (() => void) | null = null;

	$effect(() => {
		if ($currentUser) {
			unsubRegistration?.();
			unsubRegistration = onValue(
				ref(db, `tournaments/${id}/registrations/${$currentUser.uid}`),
				(snap) => {
					const data = snap.val();
					if (!data) return;
					myRegistration = data as TournamentRegistration;
				},
			);
		} else {
			unsubRegistration?.();
			unsubRegistration = null;
			myRegistration = null;
		}
	});

	let closingRegistration = $state(false);
	async function handleCloseRegistration() {
		if (closingRegistration || !tournament) return;
		if (!confirm("Закрыть регистрацию на турнир?")) return;
		closingRegistration = true;
		try {
			await closeTournamentRegistration(tournament.id);
		} catch (error) {
			alert(error);
		} finally {
			closingRegistration = false;
		}
	}

	let creatingBracket = $state(false);
	async function handleCreateBracket() {
		if (creatingBracket || !tournament) return;
		if (
			!confirm(
				"Создать сетку Challonge? После этого список участников менять нельзя.",
			)
		)
			return;
		creatingBracket = true;
		try {
			await createChallongeBracket(tournament.id);
		} catch (error) {
			alert(error);
		} finally {
			creatingBracket = false;
		}
	}

	let startingTournament = $state(false);
	async function handleStartTournament() {
		if (startingTournament) return;
		startingTournament = true;
		try {
			await startChallongeTournament(tournament!.id);
		} catch (error) {
			alert(error);
		} finally {
			startingTournament = false;
		}
	}

	let updatingGames = $state(false);
	async function handleUpdateTournamentGames() {
		if (updatingGames) return;
		updatingGames = true;
		try {
			if (tournament) {
				await updateTournamentGames(
					tournament.id,
					tournament.challongeTournamentId,
				);
			}
		} catch (error) {
			alert(error);
		} finally {
			updatingGames = false;
		}
	}

	let finishingTournament = $state(false);
	async function handleFinishTournament() {
		if (finishingTournament) return;
		if (!confirm("Закончить турнир?")) return;
		finishingTournament = true;
		try {
			if (tournament) {
				await finishTournament(
					tournament.id,
					tournament.challongeTournamentUrl,
				);
			}
		} catch (error) {
			alert(error);
		} finally {
			finishingTournament = false;
		}
	}

	let deletingTournament = $state(false);
	async function handleDeleteTournament() {
		if (deletingTournament || !tournament) return;
		if (
			!confirm(
				`Удалить турнир "${tournament.name}"? Это действие необратимо.`,
			)
		)
			return;
		deletingTournament = true;
		try {
			await deleteTournament(tournament.id);
			await goto(resolve("/tournaments"));
		} catch (error) {
			alert(error);
			deletingTournament = false;
		}
	}

	function getPlayerName(uid: string) {
		return registeredPlayers.find((p) => p.player.uid === uid)?.player.name;
	}

	function getPlayerClass(
		player: string,
		winnerId: string,
		techLossUid?: string | null,
	) {
		if (player === techLossUid) return "match-techloss";
		if (!winnerId) return "";

		return player === winnerId ? "match-winner" : "match-loser";
	}

	function openRegistration(uid: string) {
		const found = registeredPlayers.find((p) => p.player.uid === uid);
		userRegistration = found?.registration;
		userPlayer = found?.player;
		if (userRegistration) registrationOpen = true;
	}

	function openMatch(match: TournamentMatch) {
		currentMatchId = match.id;
		matchOpen = true;
	}

	onMount(() => {
		const unsubTournament = onValue(ref(db, "tournaments/" + id), (snap) => {
			const data = snap.val();
			if (!data) return;

			const matches = data.matches ?? {};
			tournament = {
				...data,
				matches: Object.entries(matches).map(
					([, match]: [string, any]) => ({
						...match,
					}),
				),
			};
		});

		const unsubRegistrations = onValue(
			ref(db, `tournaments/${id}/registrations/`),
			(snap) => {
				const data = snap.val();
				registrations = data
					? (Object.values(data) as TournamentRegistration[])
					: [];
			},
		);

		const interval = setInterval(() => {
			now = Date.now();
		}, 1000);

		return () => {
			unsubTournament();
			unsubRegistrations();
			clearInterval(interval);
		};
	});
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		{#if tournament && !canView}
			<p class="notice">Недостаточно прав для просмотра этой страницы.</p>
		{:else if tournament}
			<h2>{tournament.name}</h2>
			<div class="description-container">
				{#if tournament.divisionIndex}
					<p>Сетка {tournament.divisionIndex}</p>
				{/if}
				<div class="description-text">
					{@html renderMarkdown(tournament.description)}
				</div>
				<p>
					Рамки коста
					<span class="value-highlight"
						>{tournament.minCost}-{tournament.maxCost}</span
					>
				</p>
				<p>
					Мин. персонажей
					<span class="value-highlight">{tournament.minCharacters}</span>
				</p>
				{#snippet tierBadge(tier: number)}
					{#if tier === 0}
						<span class="tier-badge t-newbie">NEWBIE</span>
					{:else if tier === 100}
						<span class="tier-badge t-mid">MID TIER</span>
					{:else if tier === 1000}
						<span class="tier-badge t-high">HIGH TIER</span>
					{/if}
				{/snippet}
				<p>
					Турнир по системе <span class="value-highlight"
						>{tournament.type}</span
					>
				</p>
				{#if tournament.overrideEloChange == -1}
					<p>Стандартная система начислений эло</p>
				{:else}
					<p>
						За победу поражение начисляется фиксированное эло
						<span class="value-highlight"
							>{tournament.overrideEloChange}</span
						>
					</p>
				{/if}
				{#if tournament.minTier === tournament.maxTier}
					<p>Ранг {@render tierBadge(tournament.minTier)}</p>
				{:else}
					<p>
						Ранги с {@render tierBadge(
							tournament.minTier,
						)} по {@render tierBadge(tournament.maxTier)}
					</p>
				{/if}
				<p>
					Регистрация на турнир с
					<span class="value-highlight"
						>{new Date(tournament.registrationStartDate).toLocaleString(
							"ru",
							dateDisplayOptions,
						)}</span
					>
					по
					<span class="value-highlight"
						>{new Date(tournament.registrationEndDate).toLocaleString(
							"ru",
							dateDisplayOptions,
						)}</span
					>
				</p>
				<p>
					Турнир проходит с
					<span class="value-highlight"
						>{new Date(tournament.tournamentStartDate).toLocaleString(
							"ru",
							dateDisplayOptions,
						)}</span
					>
					по
					<span class="value-highlight"
						>{new Date(tournament.tournamentEndDate).toLocaleString(
							"ru",
							dateDisplayOptions,
						)}</span
					>
				</p>

				{#if isRegistrationClosed(tournament.state)}
					<p>Регистрация закрыта</p>
				{/if}
				{#if registrationWindowOpen}
					<p>Идёт регистрация</p>
				{/if}
				{#if isBracketCreated(tournament.state)}
					<p>Сетка создана, ожидает начала</p>
				{/if}
				{#if tournament.state === TOURNAMENT_STATE.STARTED}
					<p>Турнир идёт</p>
				{/if}
				{#if tournament.state === TOURNAMENT_STATE.COMPLETE}
					<p>Турнир окончен</p>
				{/if}

				<div class="tournament-button-container">
					{#if $isAdmin}
						<button
							class="btn-common danger"
							class:btn-loading={deletingTournament}
							onclick={handleDeleteTournament}>Удалить турнир</button
						>
						{#if !isLocked(tournament.state)}
							<a
								class="btn-common"
								href={resolve(`/tournaments/${tournament.id}/edit`)}
								>Редактировать турнир</a
							>
							<button
								class="btn-common"
								onclick={() => (addPlayerPopupOpen = true)}
								>Добавить игрока</button
							>
							{#if isRegistrationOpen(tournament.state)}
								<button
									class="btn-common"
									class:btn-loading={closingRegistration}
									onclick={handleCloseRegistration}
									>Закрыть регистрацию</button
								>
							{/if}
							{#if !tournament.divisionGroupId}
								<a
									class="btn-common"
									href={resolve(`/tournaments/${tournament.id}/split`)}
									>Разделить на сетки</a
								>
							{/if}
							<button
								class="btn-common btn-play"
								class:btn-loading={creatingBracket}
								onclick={handleCreateBracket}
								>Создать сетку Challonge</button
							>
						{/if}
						{#if isBracketCreated(tournament.state)}
							<a
								class="btn-common"
								href={tournament.challongeTournamentUrl}
								target="_blank"
								rel="noopener noreferrer">Открыть в Challonge</a
							>
							<button
								class="btn-common btn-play"
								class:btn-loading={startingTournament}
								onclick={handleStartTournament}>Начать турнир</button
							>
						{/if}
						{#if tournament.state === TOURNAMENT_STATE.STARTED}
							<button
								class="btn-common btn-play"
								class:btn-loading={updatingGames}
								onclick={handleUpdateTournamentGames}
								>Принудительно обновить игры</button
							>
						{/if}
						{#if tournament.state === TOURNAMENT_STATE.AWAITING_REVIEW}
							<button
								class="btn-common btn-play"
								class:btn-loading={finishingTournament}
								onclick={handleFinishTournament}
								>Закончить турнир</button
							>
						{/if}
					{/if}
					{#if $currentUser && tierEligible && registrationWindowOpen}
						<a
							class="btn-common btn-play"
							href={resolve(`/tournaments/${tournament.id}/register`)}
							>{#if myRegistration}Обновить регистрацию{:else}Зарегистрироваться{/if}</a
						>
					{/if}
				</div>
			</div>

			{#if tournament.winnerId}
				<h2 class="winner-label">
					Победил {getPlayerName(tournament.winnerId)!}
				</h2>
			{/if}

			{#if tournament.challongeTournamentUrl && hasTournamentStarted(tournament.state)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="collapsible-header"
					onclick={() => (bracketExpanded = !bracketExpanded)}
				>
					<h2>Сетка</h2>
					<span class="collapse-arrow-wrapper">
						<span class="collapse-label"
							>{bracketExpanded ? "Свернуть" : "Развернуть"}</span
						>
						<svg
							class="collapse-arrow"
							class:collapsed={!bracketExpanded}
							width="28"
							height="28"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="6 9 12 15 18 9"></polyline>
						</svg>
					</span>
				</div>
				{#if bracketExpanded}
					<div
						class="bracket-resizable"
						use:capDefaultHeight={{
							defaultHeight: 600,
							maxHeight: 2000,
							storageKey: `tournament-bracket-height-${id}`,
						}}
					>
						<iframe
							title="challonge iframe"
							src="{tournament.challongeTournamentUrl}/module"
							width="100%"
							height="100%"
							frameborder="0"
							scrolling="auto"
							allowtransparency={true}
						></iframe>
					</div>
				{/if}
			{/if}

			{#if tournament.matches && tournament.matches.length > 0}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="collapsible-header"
					onclick={() => (matchesExpanded = !matchesExpanded)}
				>
					<h2>Игры</h2>
					<span class="collapse-arrow-wrapper">
						<span class="collapse-label"
							>{matchesExpanded ? "Свернуть" : "Развернуть"}</span
						>
						<svg
							class="collapse-arrow"
							class:collapsed={!matchesExpanded}
							width="28"
							height="28"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="6 9 12 15 18 9"></polyline>
						</svg>
					</span>
				</div>
				{#if matchesExpanded}
					<div class="match-filters">
						<label class="match-filter-toggle">
							<input type="checkbox" bind:checked={showCompleted} />
							<p>Показать завершённые матчи</p>
						</label>
						{#if currentUserParticipates}
							<label class="match-filter-toggle">
								<input type="checkbox" bind:checked={showOnlyMine} />
								<p>Показать только мои матчи</p>
							</label>
						{/if}
						<input
							class="search-input"
							placeholder="Поиск..."
							bind:value={matchSearchQuery}
						/>
					</div>
					<div class="match-list">
						{#each filteredMatches as match}
							<div class="match-item">
								<div class="match-item-content">
									<div class="match-players">
										<!-- svelte-ignore a11y_click_events_have_key_events -->
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<span
											class="match-player-name match-player-left hover-emphasis {getPlayerClass(
												match.p1,
												match.winnerId,
												match.techLossUid,
											)} {match.p1 === $currentUser?.uid
												? 'match-player-self'
												: ''}"
											onclick={() => openRegistration(match.p1)}
											>{getPlayerName(match.p1)}</span
										>
										<span class="match-vs">vs</span>
										<!-- svelte-ignore a11y_click_events_have_key_events -->
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<span
											class="match-player-name match-player-right hover-emphasis {getPlayerClass(
												match.p2,
												match.winnerId,
												match.techLossUid,
											)} {match.p2 === $currentUser?.uid
												? 'match-player-self'
												: ''}"
											onclick={() => openRegistration(match.p2)}
											>{getPlayerName(match.p2)}</span
										>
									</div>
								</div>

								<button
									onclick={() => openMatch(match)}
									class="btn-common btn-match">Игра</button
								>
							</div>
						{:else}
							<span class="no-matches">Матчи не найдены</span>
						{/each}
					</div>
				{/if}
			{/if}

			<div class="search-container">
				<h2>Участники</h2>
				<input
					class="search-input"
					placeholder="Поиск..."
					bind:value={searchQuery}
				/>
			</div>
			<div
				class="table-wrapper"
				use:capDefaultHeight={{
					trigger: registeredPlayers.length,
					storageKey: `tournament-table-height-${id}`,
				}}
			>
				<TournamentPlayerTable
					{tournament}
					{searchQuery}
					registrations={registeredPlayers}
					hideOptions={false}
					onViewRegistration={openRegistration}
				/>
			</div>
		{/if}
	</div>
</div>

{#if registrationOpen}
	<TournamentRegisterPopup
		bind:open={registrationOpen}
		{tournament}
		player={userPlayer}
		reg={userRegistration}
	></TournamentRegisterPopup>
{/if}
{#if matchOpen}
	<TournamentGamePopup
		bind:open={matchOpen}
		{tournament}
		match={currentMatch}
		{registeredPlayers}
	></TournamentGamePopup>
{/if}
{#if addPlayerPopupOpen}
	<TournamentAddPlayerPopup
		bind:open={addPlayerPopupOpen}
		{tournament}
		registeredUids={registeredPlayers.map((p) => p.player.uid)}
	></TournamentAddPlayerPopup>
{/if}

<style>
	.bracket-resizable {
		resize: vertical;
		overflow: auto;
		width: 100%;
		height: 600px;
		min-height: 200px;
		max-height: 2000px;
	}

	.bracket-resizable iframe {
		display: block;
		width: 100%;
		height: 100%;
		border: none;
	}

	.match-item {
		display: flex;
		align-items: center;
		gap: 16px;
		margin: 0 auto;
	}

	.no-matches {
		display: block;
		text-align: center;
		font-size: 20px;
		color: #888;
		padding: 0;
	}

	.match-players {
		width: 440px;
	}

	.match-player-name {
		cursor: pointer;
	}

	.match-player-name.match-player-self {
		color: #5cbddd;
	}

	.match-filters {
		display: flex;
		justify-content: flex-end;
		gap: 20px;
		width: 100%;
		border-bottom: 1px solid #333;
		padding-bottom: 10px;
		margin-bottom: 16px;
	}

	.match-filters .search-input {
		width: 160px;
	}

	.collapsible-header {
		position: relative;
		cursor: pointer;
		user-select: none;
	}

	.collapse-arrow-wrapper {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 10px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.collapse-label {
		color: #888;
		font-size: 14px;
	}

	.collapse-arrow {
		transition: transform 0.15s ease;
	}

	.collapse-arrow.collapsed {
		transform: rotate(-90deg);
	}

	.match-filter-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
		color: #ccc;
	}

	.match-filter-toggle input {
		padding: 0;
	}

	.match-filter-toggle p {
		/* font-size: 16px; */
		white-space: nowrap;
	}

	.match-item-content {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.btn-match {
		width: 72px;
		height: 28px;
		padding: 0;
	}

	.tbd {
		color: #888;
	}

	.description-container {
		display: flex;
		flex-direction: column;
		position: relative;
		border-bottom: 1px solid #333;
		padding-right: 210px;
		padding-bottom: 16px;
	}

	.tournament-button-container {
		width: auto;
		position: absolute;
		bottom: 16px;
		right: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.tournament-button-container .btn-common {
		text-align: center;
		padding: 8px 14px;
	}

	.description-container p {
		margin: 0;
		line-height: 21px;
	}

	.description-text :global(a) {
		color: var(--gold);
		text-decoration: underline;
	}

	.description-text :global(p) {
		margin: 0;
		line-height: 21px;
	}

	.winner-label {
		width: 100%;
		font-size: 32px;
		text-align: center;
		display: block;
	}
</style>
