<script lang="ts">
	import { confirmDialog, notify } from "$lib/dialogs.svelte";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { getAgentAvatar } from "$lib/agentAvatars";
	import avatarPlaceholder from "$lib/assets/avatar-placeholder.webp";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import TournamentGamePopup from "$lib/components/TournamentMatchPopup.svelte";
	import TournamentPlayerTable from "$lib/components/TournamentPlayerTable.svelte";
	import TournamentTeamTable from "$lib/components/TournamentTeamTable.svelte";
	import TournamentRegisterPopup from "$lib/components/TournamentRegistrationPopup.svelte";
	import TournamentAddEntryPopup from "$lib/components/TournamentAddEntryPopup.svelte";
	import TeamDetailsPopup from "$lib/components/TeamDetailsPopup.svelte";
	import { _, locale, formatDate } from "$lib/i18n";
	import {
		cancelTournamentRegistration,
		closeTournamentRegistration,
		createChallongeBracket,
		deleteTournament,
		finishTournament,
		getTeam,
		getTournament,
		incrementSeasonalTournamentCount,
		incrementTournamentCount,
		listMatches,
		listPlayers,
		listRegistrations,
		startChallongeTournament,
		updateTournamentGames,
	} from "$lib/backend";
	import {
		joinTournamentGroup,
		leaveTournamentGroup,
		onMatchChanged,
		onMatchesSynced,
		onRegistrationChanged,
		onTournamentChanged,
	} from "$lib/signalr";
	import { getAuthSession } from "$lib/auth.svelte";
	import type {
		PlayerListItem,
		RegisteredPlayer,
		Team,
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
		playerTierValue,
		STATUS_TONE,
		getTournamentStatus,
	} from "$lib/tournamentState";
	import TierBadge from "$lib/components/TierBadge.svelte";
	import { dateDisplayOptions, renderMarkdown } from "$lib/uiCommon";
	import { capDefaultHeight } from "$lib/actions/capDefaultHeight";
	import { onMount } from "svelte";

	const session = getAuthSession();

	let { data } = $props();

	const id = $derived(page.params.id);

	let now = $state(Date.now());
	let tournament = $state<Tournament>();
	let loadState = $state<"loading" | "ready" | "missing">("loading");
	let matches = $state<TournamentMatch[]>([]);
	let userRegistration = $state<TournamentRegistration | null>();
	let userPlayer1 = $state<PlayerListItem | undefined>();
	let userPlayer2 = $state<PlayerListItem | undefined>();
	let registrations = $state<TournamentRegistration[]>([]);
	// Re-fetches the match list and the participants table's player data (Elo/tier); assigned in
	// onMount, where the loaders live. Called by the match popup right after a result is submitted.
	let refreshMatchesAndTable = $state(() => {});
	// Batch-resolved from registrations' playerIds — this tournament's registrants only, not the
	// whole roster (see the player-list refactor: no more global players/playersByUid cache).
	let registeredPlayersData = $state<PlayerListItem[]>([]);
	let myRegistration = $derived(
		session.user
			? (registrations.find((r) => {
					if (r.playerId === session.user!.uid) return true;
					const team = r.teamId ? teamsById.get(r.teamId) : undefined;
					return (
						!!team &&
						(team.creator.uid === session.user!.uid || team.player2.uid === session.user!.uid)
					);
				}) ?? null)
			: null,
	);
	// Solo registrations only — team registrations render via TournamentTeamTable/registrations
	// directly instead (one row per team, not per player; see registeredTeamRegistrations below).
	let registeredPlayers = $derived(
		registrations
			.map((registration) => {
				const player = registration.playerId
					? registeredPlayersData.find((p) => p.uid === registration.playerId)
					: undefined;
				return player ? { player, registration } : null;
			})
			.filter(Boolean) as RegisteredPlayer[],
	);
	let registeredTeamRegistrations = $derived(registrations.filter((r) => !!r.teamId));
	let searchQuery = $state("");
	let registrationOpen = $state(false);
	let matchOpen = $state(false);
	let addPlayerPopupOpen = $state(false);
	let addTeamPopupOpen = $state(false);
	let registeredTeamIds = $derived(
		registrations.map((r) => r.teamId).filter((id): id is string => !!id),
	);
	let teamsById = $state<Map<string, Team>>(new Map());
	let teamDetailsOpen = $state(false);
	let selectedTeam = $state<Team | null>(null);
	let currentMatchId = $state<string>();
	let currentMatch = $derived(
		matches.find((m: TournamentMatch) => m.id === currentMatchId),
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
				JSON.stringify({ showCompleted, showOnlyMine }),
			);
		} catch {
			// localStorage unavailable — ignore
		}
	});

	// Shared by the matches-team-ids effect below and loadRegisteredPlayersData (registrations can
	// reference a team before any match exists yet, e.g. still in Registration state) — only
	// fetches teams not already in teamsById, so calling this repeatedly is cheap.
	async function ensureTeamsLoaded(teamIds: string[]) {
		const missing = teamIds.filter((teamId) => !teamsById.has(teamId));
		if (missing.length === 0) return;

		const loaded = await Promise.all(missing.map((teamId) => getTeam(teamId)));
		const next = new Map(teamsById);
		loaded.forEach((team, i) => {
			if (team) next.set(missing[i], team);
		});
		teamsById = next;
	}

	$effect(() => {
		const ids = new Set<string>();
		for (const m of matches) {
			if (m.p1TeamId) ids.add(m.p1TeamId);
			if (m.p2TeamId) ids.add(m.p2TeamId);
		}
		ensureTeamsLoaded([...ids]);
	});

	let currentUserParticipates = $derived(
		!!session.user &&
			registeredPlayers.some((p) => p.player.uid === session.user!.uid),
	);

	let filteredMatches = $derived(
		matches.filter((m: TournamentMatch) => {
			if (!(m.p1 && m.p2) && !(m.p1TeamId && m.p2TeamId)) return false;
			if (!showCompleted && m.state === "complete") return false;
			if (
				showOnlyMine &&
				currentUserParticipates &&
				m.p1 !== session.user!.uid &&
				m.p2 !== session.user!.uid
			)
				return false;
			if (matchSearchQuery) {
				const query = matchSearchQuery.toLowerCase();
				const p1Name =
					getMatchSideLabel(m.p1, m.p1TeamId)?.toLowerCase() ?? "";
				const p2Name =
					getMatchSideLabel(m.p2, m.p2TeamId)?.toLowerCase() ?? "";
				if (!p1Name.includes(query) && !p2Name.includes(query))
					return false;
			}
			return true;
		}),
	);

	let canView = $derived(tournament?.visible !== false || session.isModerator);

	let currentUserTier = $derived(session.user ? playerTierValue(session.user) : 0);
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
	// Same status as the tournament cards (see getTournamentStatus), labelled for the page header.
	let statusPill = $derived.by(() => {
		if (!tournament) return null;
		const status = getTournamentStatus(tournament, now);
		const text = {
			upcoming: $_("tournamentCard.registrationOpens", {
				values: { date: formatDate(new Date(tournament.registrationStartDate), dateDisplayOptions, $locale) },
			}),
			registration: $_("pageTournamentDetail.statusRegistrationOpen"),
			registration_closed: $_("pageTournamentDetail.statusRegistrationClosed"),
			bracket_created: $_("pageTournamentDetail.statusBracketCreated"),
			ongoing: $_("pageTournamentDetail.statusOngoing"),
			complete: $_("pageTournamentDetail.statusComplete"),
		}[status];
		return { text, tone: STATUS_TONE[status] };
	});
	let canCancelRegistration = $derived(
		!!tournament && !isLocked(tournament.state) && !tournament.challongeTournamentId,
	);
	// Presentational — mirrors the three conditions gating the individual buttons inside
	// .actions-user, so the wrapper (and its divider) only renders when it will have content.
	let hasUserActions = $derived(
		!!session.user &&
			!!tournament &&
			((registrationWindowOpen && (tournament.registrationType === "team" || tierEligible)) ||
				!!myRegistration),
	);

	// Shared by every admin action button below: optional confirm dialog, a loading flag toggled
	// around the call, and an error toast on failure — the only thing each handler varies is which flag,
	// which confirm message (if any), and which API call to make.
	async function runAction(
		setLoading: (loading: boolean) => void,
		action: () => Promise<unknown>,
		confirmMessage?: string,
		danger = false,
		confirmLabel?: string,
	) {
		if (confirmMessage && !(await confirmDialog(confirmMessage, { danger, confirmLabel }))) return;
		setLoading(true);
		try {
			await action();
		} catch (error) {
			notify(error);
		} finally {
			setLoading(false);
		}
	}

	let cancellingRegistration = $state(false);
	function handleCancelRegistration() {
		if (cancellingRegistration || !tournament) return;
		runAction(
			(v) => (cancellingRegistration = v),
			() => cancelTournamentRegistration(tournament!.id),
			$_("pageTournamentDetail.confirmCancelRegistration"),
			true,
			$_("pageTournamentDetail.cancelRegistrationButton"),
		);
	}

	let closingRegistration = $state(false);
	function handleCloseRegistration() {
		if (closingRegistration || !tournament) return;
		runAction(
			(v) => (closingRegistration = v),
			() => closeTournamentRegistration(tournament!.id),
			$_("pageTournamentDetail.confirmCloseRegistration"),
			false,
			$_("pageTournamentDetail.closeRegistrationButton"),
		);
	}

	let creatingBracket = $state(false);
	function handleCreateBracket() {
		if (creatingBracket || !tournament) return;
		runAction(
			(v) => (creatingBracket = v),
			() => createChallongeBracket(tournament!.id),
			$_("pageTournamentDetail.confirmCreateBracket"),
			false,
			$_("pageTournamentDetail.createBracketButton"),
		);
	}

	let startingTournament = $state(false);
	function handleStartTournament() {
		if (startingTournament) return;
		runAction((v) => (startingTournament = v), () => startChallongeTournament(tournament!.id));
	}

	let updatingGames = $state(false);
	function handleUpdateTournamentGames() {
		if (updatingGames || !tournament) return;
		runAction((v) => (updatingGames = v), () => updateTournamentGames(tournament!.id));
	}

	let finishingTournament = $state(false);
	function handleFinishTournament() {
		if (finishingTournament || !tournament) return;
		runAction(
			(v) => (finishingTournament = v),
			() => finishTournament(tournament!.id),
			$_("pageTournamentDetail.confirmFinishTournament"),
			false,
			$_("pageTournamentDetail.finishTournamentButton"),
		);
	}

	let incrementingSeasonalCount = $state(false);
	function handleIncrementSeasonalCount() {
		if (incrementingSeasonalCount || !tournament) return;
		runAction(
			(v) => (incrementingSeasonalCount = v),
			() => incrementSeasonalTournamentCount(tournament!.id),
			$_("pageTournamentDetail.confirmIncrementSeasonalCount"),
		);
	}

	let incrementingCount = $state(false);
	function handleIncrementCount() {
		if (incrementingCount || !tournament) return;
		runAction(
			(v) => (incrementingCount = v),
			() => incrementTournamentCount(tournament!.id),
			$_("pageTournamentDetail.confirmIncrementCount"),
		);
	}

	let deletingTournament = $state(false);
	function handleDeleteTournament() {
		if (deletingTournament || !tournament) return;
		runAction(
			(v) => (deletingTournament = v),
			async () => {
				await deleteTournament(tournament!.id);
				await goto(resolve("/tournaments"));
			},
			$_("pageTournamentDetail.confirmDeleteTournament", { values: { name: tournament.name } }),
			true,
			$_("common.delete"),
		);
	}

	function getPlayerName(uid: string | null) {
		if (!uid) return undefined;
		return registeredPlayers.find((p) => p.player.uid === uid)?.player.name;
	}

	// 2v2 equivalent of getPlayerName — "TEAM_NAME (P1 + P2)", per how team participants are
	// named on the Challonge bracket itself.
	function getTeamLabel(teamId: string | null) {
		if (!teamId) return undefined;
		const team = teamsById.get(teamId);
		if (!team) return undefined;
		return `${team.name} (${team.creator.name} + ${team.player2.name})`;
	}

	function getMatchSideLabel(uid: string | null, teamId: string | null) {
		return teamId ? getTeamLabel(teamId) : getPlayerName(uid);
	}

	// Team side: the team's own uploaded photo (no per-member agent avatar to pick between).
	// Solo side: the registrant's chosen agent avatar, same lookup Leaderboard/ProfilePopup use.
	function getMatchSideAvatarSrc(uid: string | null, teamId: string | null) {
		if (teamId) return teamsById.get(teamId)?.photoUrl ?? undefined;
		if (!uid) return undefined;
		const player = registeredPlayersData.find((p) => p.uid === uid);
		return player ? getAgentAvatar(player.avatar)?.src : undefined;
	}

	function getPlayerClass(
		player: string | null,
		winnerId: string | null,
		techLossUid?: string | null,
	) {
		if (player === techLossUid) return "match-techloss";
		if (!winnerId) return "";

		return player === winnerId ? "match-winner" : "match-loser";
	}

	// Shared by every "view a registration" entry point (self-view button, solo match-popup name
	// clicks, both tables' "Смотреть" buttons) — resolves the registration's player(s) so the
	// popup can render either a solo section or both team members' sections.
	function openRegistrationRecord(registration: TournamentRegistration | null | undefined) {
		if (!registration) return;
		userRegistration = registration;
		if (registration.teamId) {
			const team = teamsById.get(registration.teamId);
			userPlayer1 = team ? registeredPlayersData.find((p) => p.uid === team.creator.uid) : undefined;
			userPlayer2 = team ? registeredPlayersData.find((p) => p.uid === team.player2.uid) : undefined;
		} else {
			userPlayer1 = registration.playerId
				? registeredPlayersData.find((p) => p.uid === registration.playerId)
				: undefined;
			userPlayer2 = undefined;
		}
		registrationOpen = true;
	}

	function openRegistrationByPlayerUid(uid: string | null) {
		if (!uid) return;
		openRegistrationRecord(registrations.find((r) => r.playerId === uid));
	}

	function openRegistrationByTeamId(teamId: string | null) {
		if (!teamId) return;
		openRegistrationRecord(registrations.find((r) => r.teamId === teamId));
	}

	function openTeamDetails(teamId: string | null) {
		if (!teamId) return;
		const team = teamsById.get(teamId);
		if (!team) return;
		selectedTeam = team;
		teamDetailsOpen = true;
	}

	function openMatch(match: TournamentMatch) {
		currentMatchId = match.id;
		matchOpen = true;
	}

	onMount(() => {
		const tournamentId = id!;
		let cancelled = false;

		async function loadTournament() {
			try {
				const loaded = await getTournament(tournamentId);
				if (cancelled) return;
				tournament = loaded ?? undefined;
				loadState = loaded ? "ready" : "missing";
			} catch (error) {
				if (cancelled) return;
				if (!tournament) loadState = "missing";
				notify(error);
			}
		}

		async function loadMatches() {
			const loaded = await listMatches(tournamentId);
			if (!cancelled) matches = loaded;
		}

		// Batch-resolves just this tournament's registrants (not the whole roster — see the
		// player-list refactor) — re-run whenever match/tournament changes might have moved a
		// registrant's Elo/tier, so TournamentPlayerTable's columns stay live. Team registrations
		// contribute both members (see registeredPlayers below, which expands one team
		// registration into two table rows), so their teams need to be loaded first to know which
		// uids that even is.
		async function loadRegisteredPlayersData() {
			const soloUids = registrations.map((r) => r.playerId).filter((uid): uid is string => !!uid);
			const teamIds = registrations.map((r) => r.teamId).filter((id): id is string => !!id);
			await ensureTeamsLoaded(teamIds);

			const teamUids = teamIds.flatMap((teamId) => {
				const team = teamsById.get(teamId);
				return team ? [team.creator.uid, team.player2.uid] : [];
			});

			const uids = [...new Set([...soloUids, ...teamUids])];
			const loaded = uids.length ? await listPlayers(uids) : [];
			if (!cancelled) registeredPlayersData = loaded;
		}

		async function loadRegistrations() {
			const loaded = await listRegistrations(tournamentId);
			if (!cancelled) registrations = loaded;
			await loadRegisteredPlayersData();
		}

		refreshMatchesAndTable = () => {
			loadMatches();
			loadRegisteredPlayersData();
		};

		loadTournament();
		loadMatches();
		loadRegistrations();
		joinTournamentGroup(tournamentId);

		const unsubTournamentChanged = onTournamentChanged((changedId) => {
			if (changedId !== tournamentId) return;
			loadTournament();
			loadMatches();
			loadRegisteredPlayersData();
		});
		const unsubRegistrationChanged = onRegistrationChanged((changedId) => {
			if (changedId === tournamentId) loadRegistrations();
		});
		const unsubMatchChanged = onMatchChanged((changedId) => {
			if (changedId !== tournamentId) return;
			loadTournament();
			loadMatches();
			loadRegisteredPlayersData();
		});
		const unsubMatchesSynced = onMatchesSynced((changedId) => {
			if (changedId !== tournamentId) return;
			loadTournament();
			loadMatches();
			loadRegisteredPlayersData();
		});

		const interval = setInterval(() => {
			now = Date.now();
		}, 1000);

		return () => {
			cancelled = true;
			leaveTournamentGroup(tournamentId);
			unsubTournamentChanged();
			unsubRegistrationChanged();
			unsubMatchChanged();
			unsubMatchesSynced();
			clearInterval(interval);
		};
	});
</script>

<svelte:head>
	{#if data.preview}
		<meta property="og:title" content={data.preview.name} />
		<meta property="og:url" content={page.url.href} />
		{#if data.preview.description}
			<meta name="description" content={data.preview.description} />
			<meta property="og:description" content={data.preview.description} />
		{/if}
	{/if}
</svelte:head>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		{#if tournament && !canView}
			<p class="notice">{$_("pageTournamentDetail.noViewPermission")}</p>
		{:else if tournament}
			<div class="tournament-header">
				<div class="tournament-title-row">
					<h2>{tournament.name}</h2>
					<TierBadge tier={tournament.minTier} max={tournament.maxTier} />
					{#if statusPill}
						<span class="status-pill tone-{statusPill.tone}">{statusPill.text}</span>
					{/if}
				</div>

				{#if tournament.divisionIndex}
					<p class="division-note">
						{$_("pageTournamentDetail.divisionLabel", {
							values: { index: tournament.divisionIndex },
						})}
					</p>
				{/if}

				{#if tournament.winnerId || tournament.winnerTeamId}
					<div class="winner-banner">
						<div class="winner-badge-info">
							<div class="winner-icon">
								<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5H4a1 1 0 0 0-1 1 5 5 0 0 0 4 4.9"/><path d="M17 5h3a1 1 0 0 1 1 1 5 5 0 0 1-4 4.9"/></svg>
							</div>
							<div class="winner-eyebrow">{$_("pageTournamentDetail.championLabel")}</div>
						</div>
						<div class="winner-who">
							{#if getMatchSideAvatarSrc(tournament.winnerId, tournament.winnerTeamId)}
								<img class="winner-avatar" src={getMatchSideAvatarSrc(tournament.winnerId, tournament.winnerTeamId)} alt="" />
							{/if}
							<div class="winner-name">
								{tournament.winnerId ? getPlayerName(tournament.winnerId) : getTeamLabel(tournament.winnerTeamId)}
							</div>
						</div>
					</div>
				{/if}

				{#if tournament.description}
					<div class="description-text">
						{@html renderMarkdown(tournament.description)}
					</div>
				{/if}

				<div class="spec-grid">
					<div class="spec">
						<span class="spec-label">{$_("pageTournamentDetail.specTournamentType")}</span>
						<span class="spec-value"
							>{tournament.registrationType === "team" ? "2x2" : "1x1"}</span
						>
					</div>
					<div class="spec">
						<span class="spec-label">{$_("pageTournamentDetail.specGameMode")}</span>
						<span class="spec-value"
							>{tournament.gameMode === "deadly_assault"
								? "Deadly Assault"
								: "Shiyu Defense"}</span
						>
					</div>
					<div class="spec">
						<span class="spec-label">{$_("pageTournamentDetail.specSystem")}</span>
						<span class="spec-value"
							>{tournament.type === "double elimination"
								? $_("common.doubleElimination")
								: $_("common.singleElimination")}</span
						>
					</div>
					<div class="spec">
						<span class="spec-label">{$_("pageTournamentDetail.specCostRange")}</span>
						<span class="spec-value">{tournament.minCost}–{tournament.maxCost}</span>
					</div>
					<div class="spec">
						<span class="spec-label">{$_("pageTournamentDetail.specMinCharacters")}</span>
						<span class="spec-value">{tournament.minCharacters}</span>
					</div>
					<div class="spec">
						<span class="spec-label">{$_("pageTournamentDetail.specEloChange")}</span>
						<span class="spec-value"
							>{tournament.overrideEloChange == -1
								? $_("pageTournamentDetail.standardElo")
								: tournament.overrideEloChange}</span
						>
					</div>
				</div>

				<div class="date-grid">
					<span class="date-label">{$_("pageTournamentDetail.dateLabelRegistration")}</span>
					<span class="date-value"
						>{formatDate(new Date(tournament.registrationStartDate), dateDisplayOptions, $locale)} – {formatDate(new Date(tournament.registrationEndDate), dateDisplayOptions, $locale)}</span
					>
					<span class="date-label">{$_("pageTournamentDetail.dateLabelTournament")}</span>
					<span class="date-value"
						>{formatDate(new Date(tournament.tournamentStartDate), dateDisplayOptions, $locale)} – {formatDate(new Date(tournament.tournamentEndDate), dateDisplayOptions, $locale)}</span
					>
				</div>
			</div>

			{#if session.isAdmin || hasUserActions}
				<div class="tournament-actions">
					{#if session.isAdmin}
						<div class="actions-admin">
							<button
								class="btn-common btn-danger-ghost"
								class:btn-loading={deletingTournament}
								onclick={handleDeleteTournament}
								>{$_("pageTournamentDetail.deleteTournamentButton")}</button
							>
							{#if !isLocked(tournament.state)}
								<a
									class="btn-common"
									href={resolve(`/tournaments/${tournament.id}/edit`)}
									>{$_("pageTournamentDetail.editTournamentButton")}</a
								>
								{#if tournament.registrationType === "team"}
									<button
										class="btn-common"
										onclick={() => (addTeamPopupOpen = true)}
										>{$_("pageTournamentDetail.addTeamButton")}</button
									>
								{:else}
									<button
										class="btn-common"
										onclick={() => (addPlayerPopupOpen = true)}
										>{$_("pageTournamentDetail.addPlayerButton")}</button
									>
								{/if}
								{#if isRegistrationOpen(tournament.state)}
									<button
										class="btn-common"
										class:btn-loading={closingRegistration}
										onclick={handleCloseRegistration}
										>{$_("pageTournamentDetail.closeRegistrationButton")}</button
									>
								{/if}
								{#if !tournament.divisionGroupId}
									<a
										class="btn-common"
										href={resolve(`/tournaments/${tournament.id}/split`)}
										>{$_("pageTournamentDetail.splitIntoGroupsButton")}</a
									>
								{/if}
								<button
									class="btn-common btn-play"
									class:btn-loading={creatingBracket}
									onclick={handleCreateBracket}
									>{$_("pageTournamentDetail.createBracketButton")}</button
								>
							{/if}
							{#if isBracketCreated(tournament.state)}
								<a
									class="btn-common"
									href={tournament.challongeTournamentUrl}
									target="_blank"
									rel="noopener noreferrer">{$_("pageTournamentDetail.openInChallongeButton")}</a
								>
								<button
									class="btn-common btn-play"
									class:btn-loading={startingTournament}
									onclick={handleStartTournament}
									>{$_("pageTournamentDetail.startTournamentButton")}</button
								>
							{/if}
							{#if tournament.state === TOURNAMENT_STATE.STARTED}
								<button
									class="btn-common btn-play"
									class:btn-loading={updatingGames}
									onclick={handleUpdateTournamentGames}
									>{$_("pageTournamentDetail.forceUpdateGamesButton")}</button
								>
							{/if}
							{#if tournament.state === TOURNAMENT_STATE.AWAITING_REVIEW}
								<button
									class="btn-common btn-play"
									class:btn-loading={finishingTournament}
									onclick={handleFinishTournament}
									>{$_("pageTournamentDetail.finishTournamentButton")}</button
								>
							{/if}
						</div>
					{/if}
					{#if hasUserActions}
						<div class="actions-user">
							{#if registrationWindowOpen && (tournament.registrationType === "team" || tierEligible)}
								<a
									class="btn-common btn-play"
									href={resolve(
										tournament.registrationType === "team"
											? `/tournaments/${tournament.id}/register-team`
											: `/tournaments/${tournament.id}/register`,
									)}
									>{#if myRegistration}{$_(
											"pageTournamentDetail.updateRegistrationButton",
										)}{:else}{$_("pageTournamentDetail.registerButton")}{/if}</a
								>
							{/if}
							{#if myRegistration}
								<button
									class="btn-common"
									onclick={() => openRegistrationRecord(myRegistration)}
									>{$_("pageTournamentDetail.myRegistrationButton")}</button
								>
							{/if}
							{#if myRegistration && canCancelRegistration}
								<button
									class="btn-common btn-danger-ghost"
									class:btn-loading={cancellingRegistration}
									onclick={handleCancelRegistration}
									>{$_("pageTournamentDetail.cancelRegistrationButton")}</button
								>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			{#if tournament.challongeTournamentUrl && hasTournamentStarted(tournament.state)}
				<h2 class="collapsible-heading">
					<button type="button" class="collapsible-header" aria-expanded={bracketExpanded} onclick={() => (bracketExpanded = !bracketExpanded)}>
						<span>{$_("pageTournamentDetail.bracketHeading")}</span>
						<svg class="collapse-arrow" class:collapsed={!bracketExpanded} aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
					</button>
				</h2>
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

			{#if matches.length > 0}
				<h2 class="collapsible-heading">
					<button type="button" class="collapsible-header" aria-expanded={matchesExpanded} onclick={() => (matchesExpanded = !matchesExpanded)}>
						<span>{$_("pageTournamentDetail.gamesHeading")}</span>
						<svg class="collapse-arrow" class:collapsed={!matchesExpanded} aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
					</button>
				</h2>
				{#if matchesExpanded}
					<div class="match-filters">
						<label class="match-filter-toggle">
							<span class="cb-wrap">
								<input type="checkbox" bind:checked={showCompleted} class="cb-input" />
								{#if showCompleted}
									<svg
										class="cb-check"
										width="10"
										height="10"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="3.2"
										stroke-linecap="round"
										stroke-linejoin="round"><polyline points="20 6 9 17 4 12"
										/></svg
									>
								{/if}
							</span>
							<p>{$_("pageTournamentDetail.showCompletedMatchesLabel")}</p>
						</label>
						{#if currentUserParticipates}
							<label class="match-filter-toggle">
								<span class="cb-wrap">
									<input type="checkbox" bind:checked={showOnlyMine} class="cb-input" />
									{#if showOnlyMine}
										<svg
											class="cb-check"
											width="10"
											height="10"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="3.2"
											stroke-linecap="round"
											stroke-linejoin="round"><polyline points="20 6 9 17 4 12"
											/></svg
										>
									{/if}
								</span>
								<p>{$_("pageTournamentDetail.showOnlyMyMatchesLabel")}</p>
							</label>
						{/if}
						<input
							class="search-input"
							placeholder={$_("pageTournamentDetail.searchPlaceholder")}
							bind:value={matchSearchQuery}
						/>
					</div>
					<div class="match-list">
						{#each filteredMatches as match}
							{@const p1Class = getPlayerClass(
								match.p1 ?? match.p1TeamId,
								match.winnerId ?? match.winnerTeamId,
								match.techLossUid ?? match.techLossTeamId,
							)}
							{@const p2Class = getPlayerClass(
								match.p2 ?? match.p2TeamId,
								match.winnerId ?? match.winnerTeamId,
								match.techLossUid ?? match.techLossTeamId,
							)}
							{@const hasResult =
								!!(match.winnerId || match.winnerTeamId) &&
								!!match.resultP1 &&
								!!match.resultP2}
							{@const p1Avatar = getMatchSideAvatarSrc(match.p1, match.p1TeamId)}
							{@const p2Avatar = getMatchSideAvatarSrc(match.p2, match.p2TeamId)}
							<div class="match-item">
								<button
									type="button"
									class="match-open"
									aria-label={$_("pageTournamentDetail.openMatchLabel", {
										values: {
											p1: getMatchSideLabel(match.p1, match.p1TeamId),
											p2: getMatchSideLabel(match.p2, match.p2TeamId),
										},
									})}
									onclick={() => openMatch(match)}
								></button>
								<div class="match-side">
									<span
										class="match-avatar {p1Class}"
										style="background-image: {p1Avatar
											? `url(${p1Avatar})`
											: `url(${avatarPlaceholder})`}"
									></span>
									<button
										type="button"
										class="match-player-name hover-emphasis {p1Class} {match.p1 === session.user?.uid
											? 'match-player-self'
											: ''}"
										onclick={(e) => {
											e.stopPropagation();
											match.p1TeamId
												? openTeamDetails(match.p1TeamId)
												: openRegistrationByPlayerUid(match.p1);
										}}
										>{getMatchSideLabel(
											match.p1,
											match.p1TeamId,
										)}</button
									>
								</div>
								{#if hasResult}
									<span class="match-score-pair">
										<span class="match-score {p1Class === 'match-winner' ? 'match-score-win' : ''}"
											>{match.resultP1}</span
										><span class="match-vs">—</span><span
											class="match-score {p2Class === 'match-winner' ? 'match-score-win' : ''}"
											>{match.resultP2}</span
										>
									</span>
								{:else}
									<span class="match-vs">{$_("common.versus")}</span>
								{/if}
								<div class="match-side match-side-right">
									<button
										type="button"
										class="match-player-name hover-emphasis {p2Class} {match.p2 === session.user?.uid
											? 'match-player-self'
											: ''}"
										onclick={(e) => {
											e.stopPropagation();
											match.p2TeamId
												? openTeamDetails(match.p2TeamId)
												: openRegistrationByPlayerUid(match.p2);
										}}
										>{getMatchSideLabel(
											match.p2,
											match.p2TeamId,
										)}</button
									>
									<span
										class="match-avatar {p2Class}"
										style="background-image: {p2Avatar
											? `url(${p2Avatar})`
											: `url(${avatarPlaceholder})`}"
									></span>
								</div>
							</div>
						{:else}
							<span class="no-matches">{$_("pageTournamentDetail.noMatchesFound")}</span>
						{/each}
					</div>
				{/if}
			{/if}

			<div class="search-container">
				<h2>{$_("pageTournamentDetail.participantsHeading")}</h2>
				<input
					class="search-input"
					placeholder={$_("pageTournamentDetail.searchPlaceholder")}
					bind:value={searchQuery}
				/>
			</div>
			<div
				class="table-wrapper"
				use:capDefaultHeight={{
					trigger: tournament.registrationType === "team" ? registeredTeamRegistrations.length : registeredPlayers.length,
					// header (33.5px) + 12 full rows (51px each) — keeps the capped height from
					// ever stopping mid-row (matches the leaderboard's table-wrapper sizing).
					maxHeight: 33.5 + 12 * 51,
					storageKey: `tournament-table-height-${id}`,
				}}
			>
				{#if tournament.registrationType === "team"}
					<TournamentTeamTable
						{tournament}
						{searchQuery}
						{teamsById}
						registrations={registeredTeamRegistrations}
						playersData={registeredPlayersData}
						hideOptions={false}
						onViewTeam={openTeamDetails}
						onViewRegistration={openRegistrationByTeamId}
					/>
				{:else}
					<TournamentPlayerTable
						{tournament}
						{searchQuery}
						registrations={registeredPlayers}
						hideOptions={false}
						onViewRegistration={openRegistrationByPlayerUid}
					/>
				{/if}
			</div>
		{:else if loadState === "missing"}
			<p class="notice">{$_("pageTournamentDetail.notFound")}</p>
		{:else}
			<p class="notice">{$_("common.loading")}</p>
		{/if}
	</div>
</div>

{#if registrationOpen}
	<TournamentRegisterPopup
		bind:open={registrationOpen}
		{tournament}
		player1={userPlayer1}
		player2={userPlayer2}
		reg={userRegistration}
	></TournamentRegisterPopup>
{/if}
{#if matchOpen}
	<TournamentGamePopup
		bind:open={matchOpen}
		{tournament}
		match={currentMatch}
		{registeredPlayers}
		{teamsById}
		onResultSubmitted={refreshMatchesAndTable}
	></TournamentGamePopup>
{/if}
{#if addPlayerPopupOpen}
	<TournamentAddEntryPopup
		kind="player"
		bind:open={addPlayerPopupOpen}
		{tournament}
		excludeIds={registeredPlayers.map((p) => p.player.uid)}
	/>
{/if}
{#if addTeamPopupOpen}
	<TournamentAddEntryPopup kind="team" bind:open={addTeamPopupOpen} {tournament} excludeIds={registeredTeamIds} />
{/if}
<TeamDetailsPopup bind:open={teamDetailsOpen} team={selectedTeam} />

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

	/* The whole row opens the match (an invisible full-size button underneath); player names
	   sit above it as their own buttons. */
	.match-item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 10px 16px;
		background: var(--surface-2);
		border: 1px solid var(--border-soft);
		border-radius: var(--r-md);
		transition: 0.15s;
	}

	.match-item:hover {
		border-color: var(--gold-border);
	}

	.match-open {
		position: absolute;
		inset: 0;
		z-index: 0;
		padding: 0;
		background: none;
		border: none;
		border-radius: inherit;
		cursor: pointer;
	}

	.match-item .match-side {
		position: relative;
		z-index: 1;
		pointer-events: none;
	}

	button.match-player-name {
		pointer-events: auto;
		padding: 0;
		background: none;
		border: none;
		font: inherit;
		font-weight: bold;
		text-align: inherit;
		cursor: pointer;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.no-matches {
		display: block;
		text-align: center;
		color: var(--text-muted);
		padding: 12px 0;
	}

	.match-side {
		display: flex;
		align-items: center;
		gap: 9px;
		flex: 1;
		min-width: 0;
	}

	.match-side-right {
		flex-direction: row-reverse;
	}

	.match-avatar {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background-color: var(--surface-hover);
		background-size: cover;
		background-position: center;
		border: 1.5px solid var(--border);
	}

	.match-avatar.match-winner {
		border-color: var(--success);
	}

	.match-avatar.match-loser {
		border-color: var(--danger);
	}

	.match-avatar.match-techloss {
		border-color: var(--text-dim);
	}

	/* mockup's .match-side-name inherits the body's 14px/normal weight — the shared global
	   .match-player-name (16px/700) is sized for TournamentMatchPopup's bigger header context. */
	.match-player-name {
		cursor: pointer;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 14px;
		font-weight: 600;
	}

	.match-player-name.match-player-self {
		color: var(--info);
	}

	.match-score-pair {
		display: flex;
		align-items: baseline;
		gap: 6px;
		flex-shrink: 0;
	}

	.match-item .match-vs {
		flex-shrink: 0;
	}

	.match-score {
		font-size: 14px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: var(--text-dim);
	}

	.match-score-win {
		color: var(--success);
	}

	.match-filters {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		align-items: center;
		gap: 10px 20px;
		width: 100%;
		margin-bottom: 16px;
	}

	.match-filters .search-input {
		width: 160px;
	}

	@media (max-width: 640px) {
		.match-filters {
			justify-content: flex-start;
		}

		.match-filters .search-input {
			width: 100%;
		}

		.spec-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		/* names need the room more than the avatars do */
		.match-item {
			gap: 8px;
			padding: 10px 12px;
		}

		.match-avatar {
			display: none;
		}
	}

	.collapsible-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-soft);
		padding: 0 0 10px;
		color: inherit;
		text-align: left;
		cursor: pointer;
		user-select: none;
	}

	.collapsible-heading {
		border: none;
		padding: 0;
		margin: 0;
	}

	button.collapsible-header {
		font: inherit;
	}

	.collapse-arrow {
		flex-shrink: 0;
		color: var(--text-muted);
		transition: transform 0.15s ease;
	}

	.collapse-arrow.collapsed {
		transform: rotate(-90deg);
	}

	.match-filter-toggle {
		display: flex;
		align-items: center;
		gap: 7px;
		cursor: pointer;
		font-size: 12px;
		color: var(--text-muted);
	}

	.match-filter-toggle p {
		white-space: nowrap;
	}

	.tournament-header {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding-bottom: 18px;
		border-bottom: 1px solid var(--border-soft);
	}

	.tournament-title-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.tournament-title-row h2 {
		font-size: 20px;
		border: none;
		padding: 0;
		margin: 0;
	}

	.division-note {
		color: var(--text-dim);
		font-size: 12px;
		margin: 0;
	}

	.spec-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px 20px;
	}

	.spec {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	.spec-label {
		font-size: 10px;
		font-weight: 700;
		color: var(--text-dim);
	}

	.spec-value {
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
	}

	.date-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		column-gap: 14px;
		row-gap: 6px;
		font-size: 12px;
		width: fit-content;
	}

	.date-label {
		color: var(--text-dim);
	}

	.date-value {
		color: var(--text-muted);
	}

	.tournament-actions {
		display: flex;
		align-items: stretch;
		gap: 28px;
		flex-wrap: wrap;
		padding-bottom: 20px;
		border-bottom: 1px solid var(--border-soft);
	}

	.actions-admin {
		display: grid;
		grid-template-columns: repeat(2, minmax(150px, 1fr));
		gap: 8px;
	}

	.actions-user {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-left: auto;
	}

	.actions-admin + .actions-user {
		padding-left: 28px;
		border-left: 1px solid var(--border-soft);
	}

	.description-text :global(a) {
		color: var(--gold);
		text-decoration: underline;
	}

	.description-text :global(p) {
		margin: 0;
		line-height: 21px;
	}

	.winner-banner {
		background: var(--surface);
		border: 1px solid var(--border-soft);
		border-left: 4px solid var(--gold);
		border-radius: var(--r-lg);
		padding: 16px 24px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
	}

	.winner-badge-info {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.winner-icon {
		flex-shrink: 0;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--gold-dim);
		color: var(--gold);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.winner-eyebrow {
		font-size: var(--fs-md);
		font-weight: 600;
		color: var(--text-muted);
	}

	.winner-who {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.winner-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid var(--gold);
		background: var(--surface-hover);
	}

	.winner-name {
		font-size: 22px;
		font-weight: 800;
		color: var(--gold);
	}
</style>
