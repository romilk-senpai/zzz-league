<script lang="ts">
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import TournamentMemberRegistrationFields from "$lib/components/TournamentMemberRegistrationFields.svelte";
	import { applyForTeamTournament, getTournament, listMyTeams, listRegistrations } from "$lib/backend";
	import { currentUser, isAdmin } from "$lib/store";
	import type { Team, Tournament, TournamentRegistration } from "$lib/types";
	import { isLocked, isRegistrationWindowOpen } from "$lib/tournamentState";
	import {
		applyDetailsToMemberForm,
		emptyMemberRegistrationForm,
		isMemberRegistrationFormComplete,
		memberRegistrationFormToInput,
		memberRegistrationScreenshotFiles,
	} from "$lib/tournamentRegistrationForm";
	import { dateDisplayOptions, isImageTooLarge, MAX_IMAGE_SIZE_MB } from "$lib/uiCommon";
	import { onMount } from "svelte";

	const id = $derived(page.params.id);

	let now = $state(Date.now());
	let tournament = $state<Tournament>();
	let myTeams = $state<Team[]>([]);
	let teamsLoaded = $state(false);
	let selectedTeamId = $state("");
	// Set once we know one of myTeams already has a registration here — the picker then locks to
	// it instead of allowing a switch, since picking a *different* team is exactly how a player
	// ends up registered under two teams for the same tournament.
	let lockedTeamId = $state<string | null>(null);
	let myRegistration = $state<TournamentRegistration | null>(null);
	let regLoaded = $state(false);
	let awareness = $state(false);
	let status = $state("");
	let showErrors = $state(false);
	let isRegistering = $state(false);

	let player1Form = $state(emptyMemberRegistrationForm());
	let player2Form = $state(emptyMemberRegistrationForm());

	let selectedTeam = $derived(myTeams.find((t) => t.id === selectedTeamId) ?? null);

	let registrationWindowOpen = $derived(
		!!tournament &&
			isRegistrationWindowOpen(
				tournament.state,
				tournament.registrationStartDate,
				tournament.registrationEndDate,
				now,
			),
	);

	async function handleRegister() {
		if (isRegistering || !tournament || !selectedTeam) return;

		if (!awareness) {
			showErrors = true;
			status = "Ты не ОСОЗНАЛ.";
			return;
		}

		if (!isMemberRegistrationFormComplete(player1Form) || !isMemberRegistrationFormComplete(player2Form)) {
			showErrors = true;
			status = "Заполните все поля для обоих игроков";
			return;
		}

		const files = [
			...memberRegistrationScreenshotFiles(player1Form),
			...memberRegistrationScreenshotFiles(player2Form),
		];
		if (files.some(isImageTooLarge)) {
			status = `Файл слишком большой, максимум ${MAX_IMAGE_SIZE_MB}МБ`;
			return;
		}

		showErrors = false;
		isRegistering = true;
		try {
			await applyForTeamTournament(
				tournament.id,
				selectedTeam.id,
				memberRegistrationFormToInput(player1Form),
				memberRegistrationFormToInput(player2Form),
			);
			await goto(resolve(`/tournaments/${tournament.id}`));
		} catch (error: any) {
			status = error.message;
		} finally {
			isRegistering = false;
		}
	}

	onMount(() => {
		let cancelled = false;

		getTournament(id!).then((loaded) => {
			if (!cancelled) tournament = loaded ?? undefined;
		});

		const interval = setInterval(() => {
			now = Date.now();
		}, 1000);

		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	});

	// Reactive rather than a one-shot onMount check: on a full page reload, Firebase auth hasn't
	// resolved yet on first render, so $currentUser starts out null regardless of whether the
	// visitor is actually logged in. A one-shot check here would permanently show "no teams" for
	// a logged-in user just because auth settled a moment too late (same bug as teams/mine).
	$effect(() => {
		const uid = $currentUser?.uid;
		if (!uid) {
			myTeams = [];
			teamsLoaded = true;
			return;
		}

		let cancelled = false;
		teamsLoaded = false;
		listMyTeams(uid).then(async (teams) => {
			if (cancelled) return;
			myTeams = teams;

			const tournamentId = id;
			if (tournamentId && teams.length > 0) {
				const regs = await listRegistrations(tournamentId);
				if (cancelled) return;
				lockedTeamId = teams.find((t) => regs.some((r) => r.teamId === t.id))?.id ?? null;
			} else {
				lockedTeamId = null;
			}

			teamsLoaded = true;
			if (lockedTeamId) {
				selectedTeamId = lockedTeamId;
			} else if (teams.length === 1) {
				selectedTeamId = teams[0].id;
			}
		});

		return () => {
			cancelled = true;
		};
	});

	// Re-runs whenever the selected team changes — deliberately no "already initialized" guard
	// (unlike the solo register page) since switching teams should load *that* team's existing
	// registration data, overwriting whatever was in the forms before.
	$effect(() => {
		const teamId = selectedTeamId;
		const tournamentId = id;
		player1Form = emptyMemberRegistrationForm();
		player2Form = emptyMemberRegistrationForm();

		if (!teamId || !tournamentId) {
			myRegistration = null;
			regLoaded = true;
			return;
		}

		regLoaded = false;
		let cancelled = false;
		listRegistrations(tournamentId).then((registrations) => {
			if (cancelled) return;
			const mine = registrations.find((r) => r.teamId === teamId) ?? null;
			myRegistration = mine;
			applyDetailsToMemberForm(player1Form, mine?.player1 ?? null);
			applyDetailsToMemberForm(player2Form, mine?.player2 ?? null);
			regLoaded = true;
		});

		return () => {
			cancelled = true;
		};
	});
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		{#if tournament}
			<h2 class="page-title">Регистрация команды: {tournament.name}</h2>

			{#if tournament.visible === false && !$isAdmin}
				<p class="notice">Недостаточно прав для просмотра этой страницы.</p>
			{:else if !$currentUser}
				<p class="notice">Войдите, чтобы зарегистрироваться на турнир.</p>
			{:else if isLocked(tournament.state) || tournament.challongeTournamentId}
				<p class="notice">Турнир уже начался, регистрация закрыта.</p>
			{:else if !registrationWindowOpen}
				<p class="notice">Регистрация на турнир закрыта.</p>
			{:else if !teamsLoaded}
				<p class="notice">Загрузка...</p>
			{:else if myTeams.length === 0}
				<p class="notice">
					У вас пока нет команд. <a href={resolve("/teams/mine")}>Создайте команду</a>, чтобы зарегистрироваться.
				</p>
			{:else}
				<div class="form-group team-select-group">
					<label for="team-select">Команда</label>
					{#if lockedTeamId}
						<p id="team-select" class="value-highlight">
							{selectedTeam?.name} ({selectedTeam?.creator.name} & {selectedTeam?.player2.name})
						</p>
					{:else}
						<span class="select-wrap">
							<select id="team-select" bind:value={selectedTeamId}>
								<option value="">Выберите команду</option>
								{#each myTeams as team (team.id)}
									<option value={team.id}>{team.name} ({team.creator.name} & {team.player2.name})</option>
								{/each}
							</select>
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="select-arrow"><polyline points="6 9 12 15 18 9"/></svg>
						</span>
					{/if}
				</div>

				{#if selectedTeam && regLoaded}
					<div class="divider"></div>
					<TournamentMemberRegistrationFields
						idPrefix="p1"
						label={`Игрок 1 (${selectedTeam.creator.name})`}
						form={player1Form}
						{showErrors}
					/>

					<div class="divider"></div>
					<TournamentMemberRegistrationFields
						idPrefix="p2"
						label={`Игрок 2 (${selectedTeam.player2.name})`}
						form={player2Form}
						{showErrors}
					/>

					<div class="divider"></div>

					<div class="check-row">
						<span class="cb-wrap">
							<input
								id="awareness"
								type="checkbox"
								class="cb-input"
								class:invalid={showErrors && !awareness}
								bind:checked={awareness}
							/>
							{#if awareness}
								<svg class="cb-check" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
							{/if}
						</span>
						<label for="awareness"
							>Конечно, мы полностью прочитали регламент, и осознаём, что
							турнир проходит с <span class="value-highlight"
								>{new Date(tournament.tournamentStartDate).toLocaleString("ru", dateDisplayOptions)}</span
							>
							по
							<span class="value-highlight"
								>{new Date(tournament.tournamentEndDate).toLocaleString("ru", dateDisplayOptions)}</span
							>
						</label>
					</div>

					{#if status}<p class="status error">{status}</p>{/if}
					<div class="btn-row-form">
						<button
							class="btn-common btn-play"
							class:btn-loading={isRegistering}
							onclick={handleRegister}
							>{#if myRegistration}Обновить регистрацию{:else}Зарегистрироваться{/if}</button
						>
						<a class="btn-common" href={resolve(`/tournaments/${tournament.id}`)}>Отмена</a>
					</div>
				{/if}
			{/if}
		{/if}
	</div>
</div>

<style>
	.main-content {
		padding: 24px 28px;
		gap: 18px;
	}

	.page-title {
		font-size: 20px;
		padding-bottom: 16px;
	}

	.team-select-group {
		max-width: 420px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.form-group label {
		font-size: 12px;
		color: var(--text-dim);
		font-weight: 600;
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

	.divider {
		height: 1px;
		background: var(--border-soft);
		width: 100%;
	}

	.check-row {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		max-width: 760px;
	}

	.check-row .cb-wrap {
		margin-top: 2px;
	}

	.check-row label {
		font-size: 12px;
		color: var(--text-muted);
		line-height: 1.6;
		cursor: pointer;
	}

	.cb-wrap {
		position: relative;
		display: inline-flex;
		flex-shrink: 0;
		width: 15px;
		height: 15px;
	}

	.cb-input {
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
		box-sizing: border-box;
		flex: 0 0 15px;
		min-width: 15px;
		max-width: 15px;
		width: 15px;
		height: 15px;
		margin: 0;
		padding: 0;
		border-radius: 4px;
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		cursor: pointer;
	}

	.cb-input:checked {
		background: var(--gold);
		border-color: var(--gold);
	}

	.cb-input.invalid {
		border-color: var(--danger);
	}

	.cb-check {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: oklch(0.2 0.03 80);
		pointer-events: none;
	}

	.btn-row-form {
		display: flex;
		gap: 10px;
		max-width: 420px;
	}

	.btn-row-form .btn-common {
		flex: 1;
	}
</style>
