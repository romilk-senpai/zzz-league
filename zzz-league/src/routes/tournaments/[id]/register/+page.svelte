<script lang="ts">
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import TournamentMemberRegistrationFields from "$lib/components/TournamentMemberRegistrationFields.svelte";
	import { applyForTournament, getTournament, listRegistrations } from "$lib/backend";
	import { currentUser, isAdmin } from "$lib/store";
	import type { Tournament, TournamentRegistration } from "$lib/types";
	import { isLocked, isRegistrationWindowOpen, playerTierValue } from "$lib/tournamentState";
	import {
		applyDetailsToMemberForm,
		emptyMemberRegistrationForm,
		isMemberRegistrationFormComplete,
		memberRegistrationFormToInput,
		memberRegistrationScreenshotFiles,
	} from "$lib/tournamentRegistrationForm";
	import {
		dateDisplayOptions,
		filesFromImageFile,
		imageFileFromPasteEvent,
		isImageTooLarge,
		MAX_IMAGE_SIZE_MB,
	} from "$lib/uiCommon";
	import { onMount } from "svelte";

	const id = $derived(page.params.id);

	let now = $state(Date.now());
	let tournament = $state<Tournament>();
	let myRegistration = $state<TournamentRegistration | null>(null);
	let regLoaded = $state(false);

	let form = $state(emptyMemberRegistrationForm());
	let awareness = $state(false);
	let status = $state("");

	let fieldsInitialized = false;
	function applyRegistrationData(reg: TournamentRegistration | null) {
		regLoaded = true;
		if (!reg || fieldsInitialized) return;
		fieldsInitialized = true;
		applyDetailsToMemberForm(form, reg.player1);
	}

	let currentUserTier = $derived($currentUser ? playerTierValue($currentUser) : 0);
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

	$effect(() => {
		function onPaste(e: ClipboardEvent) {
			if (!regLoaded) return;
			const file = imageFileFromPasteEvent(e);
			if (!file) return;

			const files = filesFromImageFile(file);
			if (!form.rosterScreenshot || form.rosterScreenshot.length === 0) {
				form.rosterScreenshot = files;
			} else {
				form.hoyolabScreenshot = files;
			}
			e.preventDefault();
		}

		window.addEventListener("paste", onPaste);
		return () => window.removeEventListener("paste", onPaste);
	});

	function handlePrefillFromLastRegistration() {
		const last = $currentUser?.lastRegistration;
		if (!last) return;
		applyDetailsToMemberForm(form, last);
	}

	let isRegistering = $state(false);
	async function handleRegister() {
		if (isRegistering || !tournament) return;

		if (!awareness) {
			status = "Ты не ОСОЗНАЛ.";
			return;
		}

		if (!isMemberRegistrationFormComplete(form)) {
			status = "Заполните все поля";
			return;
		}

		if (memberRegistrationScreenshotFiles(form).some(isImageTooLarge)) {
			status = `Файл слишком большой, максимум ${MAX_IMAGE_SIZE_MB}МБ`;
			return;
		}

		if (!$currentUser) return;

		isRegistering = true;
		try {
			await applyForTournament(tournament.id, $currentUser.uid, memberRegistrationFormToInput(form));
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

	$effect(() => {
		const uid = $currentUser?.uid;
		const tournamentId = id;
		if (!uid || !tournamentId) {
			myRegistration = null;
			regLoaded = true;
			return;
		}

		let cancelled = false;
		listRegistrations(tournamentId).then((registrations) => {
			if (cancelled) return;
			const mine = registrations.find((r) => r.playerId === uid) ?? null;
			myRegistration = mine;
			applyRegistrationData(mine);
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
			<h2 class="page-title">Регистрация: {tournament.name}</h2>

			{#if tournament.visible === false && !$isAdmin}
				<p class="notice">Недостаточно прав для просмотра этой страницы.</p>
			{:else if !$currentUser}
				<p class="notice">Войдите, чтобы зарегистрироваться на турнир.</p>
			{:else if !tierEligible}
				<p class="notice">Ваш тир не подходит для этого турнира.</p>
			{:else if isLocked(tournament.state) || tournament.challongeTournamentId}
				<p class="notice">Турнир уже начался, регистрация закрыта.</p>
			{:else if !registrationWindowOpen}
				<p class="notice">Регистрация на турнир закрыта.</p>
			{:else if regLoaded}
				{#if $currentUser?.lastRegistration}
					<button
						type="button"
						class="btn-common prefill-btn"
						onclick={handlePrefillFromLastRegistration}
						>Заполнить из прошлой регистрации</button
					>
				{/if}

				<TournamentMemberRegistrationFields idPrefix="reg" {form} />

				<div class="divider"></div>

				<div class="check-row">
					<span class="cb-wrap">
						<input id="awareness" type="checkbox" class="cb-input" bind:checked={awareness} />
						{#if awareness}
							<svg class="cb-check" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
						{/if}
					</span>
					<label for="awareness"
						>Конечно, я полностью прочитал регламент, и осознаю, что
						турнир проходит с <span class="value-highlight"
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
					<a
						class="btn-common"
						href={resolve(`/tournaments/${tournament.id}`)}>Отмена</a
					>
				</div>
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
		font-size: 19px;
		padding-bottom: 16px;
	}

	.prefill-btn {
		align-self: flex-start;
		padding: 0 14px;
		height: 32px;
		font-size: 11.5px;
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
		font-size: 12.5px;
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
