<script lang="ts">
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import {
		applyForTeamTournament,
		getTournament,
		listMyTeams,
		listRegistrations,
		type RegistrationFormInput,
	} from "$lib/backend";
	import { useObjectUrlPreview } from "$lib/imagePreview.svelte.js";
	import { currentUser, isAdmin } from "$lib/store";
	import type { Team, Tournament, TournamentRegistration } from "$lib/types";
	import { isLocked, isRegistrationWindowOpen } from "$lib/tournamentState";
	import {
		bustCache,
		dateDisplayOptions,
		isImageTooLarge,
		MAX_IMAGE_SIZE_MB,
		openImagePopup,
		pasteImageFromClipboard,
	} from "$lib/uiCommon";
	import { onMount } from "svelte";

	const id = $derived(page.params.id);

	let now = $state(Date.now());
	let tournament = $state<Tournament>();
	let myTeams = $state<Team[]>([]);
	let teamsLoaded = $state(false);
	let selectedTeamId = $state("");
	let myRegistration = $state<TournamentRegistration | null>(null);
	let regLoaded = $state(false);
	let awareness = $state(false);
	let status = $state("");
	let isRegistering = $state(false);

	type MemberForm = {
		gameUid: string;
		prizeUid: string;
		prizeAsMoney: boolean;
		darteNickname: string;
		darteAccount: string;
		dartePreset: string;
		existingRosterUrl: string;
		existingHoyolabUrl: string;
		rosterScreenshot: FileList | null;
		hoyolabScreenshot: FileList | null;
	};

	function emptyForm(): MemberForm {
		return {
			gameUid: "",
			prizeUid: "",
			prizeAsMoney: false,
			darteNickname: "",
			darteAccount: "",
			dartePreset: "",
			existingRosterUrl: "",
			existingHoyolabUrl: "",
			rosterScreenshot: null,
			hoyolabScreenshot: null,
		};
	}

	let player1Form = $state(emptyForm());
	let player2Form = $state(emptyForm());

	let player1RosterPreview = useObjectUrlPreview(() => player1Form.rosterScreenshot?.[0]);
	let player1HoyolabPreview = useObjectUrlPreview(() => player1Form.hoyolabScreenshot?.[0]);
	let player2RosterPreview = useObjectUrlPreview(() => player2Form.rosterScreenshot?.[0]);
	let player2HoyolabPreview = useObjectUrlPreview(() => player2Form.hoyolabScreenshot?.[0]);

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

	function applyDetailsToForm(form: MemberForm, details: TournamentRegistration["player1"] | null) {
		if (!details) return;
		form.gameUid = details.gameUid ?? "";
		form.prizeUid = details.prizeUid ?? "";
		form.prizeAsMoney = details.prizeAsMoney ?? false;
		form.darteNickname = details.darteNickname ?? "";
		form.darteAccount = details.dartePresetName ?? "";
		form.dartePreset = details.rosterName ?? "";
		form.existingRosterUrl = details.rosterScreenshotUrl ?? "";
		form.existingHoyolabUrl = details.hoyolabScreenshotUrl ?? "";
	}

	async function handlePasteScreenshot(form: MemberForm, target: "roster" | "hoyolab") {
		try {
			const files = await pasteImageFromClipboard();
			if (!files) {
				alert("В буфере обмена нет изображения");
				return;
			}
			if (target === "roster") form.rosterScreenshot = files;
			else form.hoyolabScreenshot = files;
		} catch {
			// clipboard read can throw (permissions, non-image content) — nothing to recover here
		}
	}

	function isFormComplete(form: MemberForm): boolean {
		const hasRoster = (form.rosterScreenshot && form.rosterScreenshot.length > 0) || !!form.existingRosterUrl;
		const hasHoyolab = (form.hoyolabScreenshot && form.hoyolabScreenshot.length > 0) || !!form.existingHoyolabUrl;
		return !!(
			form.gameUid &&
			(form.prizeAsMoney || form.prizeUid) &&
			form.darteNickname &&
			form.darteAccount &&
			form.dartePreset &&
			hasRoster &&
			hasHoyolab
		);
	}

	function toInput(form: MemberForm): RegistrationFormInput {
		return {
			gameUid: form.gameUid,
			prizeUid: form.prizeUid,
			prizeAsMoney: form.prizeAsMoney,
			darteNickname: form.darteNickname,
			darteAccount: form.darteAccount,
			dartePreset: form.dartePreset,
			rosterScreenshot: form.rosterScreenshot?.[0] ?? null,
			hoyolabScreenshot: form.hoyolabScreenshot?.[0] ?? null,
		};
	}

	async function handleRegister() {
		if (isRegistering || !tournament || !selectedTeam) return;

		if (!awareness) {
			status = "Ты не ОСОЗНАЛ.";
			return;
		}

		if (!isFormComplete(player1Form) || !isFormComplete(player2Form)) {
			status = "Заполните все поля для обоих игроков";
			return;
		}

		const files = [
			player1Form.rosterScreenshot?.[0],
			player1Form.hoyolabScreenshot?.[0],
			player2Form.rosterScreenshot?.[0],
			player2Form.hoyolabScreenshot?.[0],
		].filter((f): f is File => !!f);
		if (files.some(isImageTooLarge)) {
			status = `Файл слишком большой, максимум ${MAX_IMAGE_SIZE_MB}МБ`;
			return;
		}

		isRegistering = true;
		try {
			await applyForTeamTournament(tournament.id, selectedTeam.id, toInput(player1Form), toInput(player2Form));
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
		listMyTeams(uid).then((teams) => {
			if (cancelled) return;
			myTeams = teams;
			teamsLoaded = true;
			if (teams.length === 1) selectedTeamId = teams[0].id;
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
		player1Form = emptyForm();
		player2Form = emptyForm();

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
			applyDetailsToForm(player1Form, mine?.player1 ?? null);
			applyDetailsToForm(player2Form, mine?.player2 ?? null);
			regLoaded = true;
		});

		return () => {
			cancelled = true;
		};
	});
</script>

{#snippet memberFields(
	idPrefix: string,
	label: string,
	form: MemberForm,
	rosterPreviewUrl: string | null,
	hoyolabPreviewUrl: string | null,
)}
	<h3>{label}</h3>
	<div class="form-row-wide">
		<label for="{idPrefix}-zzz-uid">Игровой UID</label>
		<input id="{idPrefix}-zzz-uid" type="text" bind:value={form.gameUid} placeholder="Игровой UID" />
	</div>
	<div class="form-row-wide">
		<label for="{idPrefix}-prize-as-money">Взять призовые деньгами</label>
		<input id="{idPrefix}-prize-as-money" type="checkbox" bind:checked={form.prizeAsMoney} />
	</div>
	{#if !form.prizeAsMoney}
		<div class="form-row-wide">
			<label for="{idPrefix}-prize-uid">UID для призовых</label>
			<input id="{idPrefix}-prize-uid" type="text" bind:value={form.prizeUid} placeholder="UID для призовых" />
		</div>
	{/if}
	<div class="form-row-wide">
		<label for="{idPrefix}-darte-nickname">Ник на Darte</label>
		<input id="{idPrefix}-darte-nickname" type="text" bind:value={form.darteNickname} placeholder="Ник на Darte" />
	</div>
	<div class="form-row-wide">
		<label for="{idPrefix}-darte-account">Название пресета на Darte</label>
		<input id="{idPrefix}-darte-account" type="text" bind:value={form.darteAccount} placeholder="Название пресета на Darte" />
	</div>
	<div class="form-row-wide">
		<label for="{idPrefix}-darte-preset">Название ростера</label>
		<input id="{idPrefix}-darte-preset" type="text" bind:value={form.dartePreset} placeholder="Название ростера" />
	</div>

	<div class="form-row-wide">
		<label for="{idPrefix}-roster-screenshot">Скриншот ростера</label>
		<input id="{idPrefix}-roster-screenshot" type="file" accept="image/*" bind:files={form.rosterScreenshot} />
		<button type="button" class="btn-common paste-btn" onclick={() => handlePasteScreenshot(form, "roster")}
			>Вставить из буфера</button
		>
	</div>
	{#if form.existingRosterUrl}
		<button class="img-btn" onclick={() => openImagePopup(form.existingRosterUrl)}>
			<img src={bustCache(form.existingRosterUrl)} alt="" />
		</button>
		<p class="notice">Оставьте пустым, чтобы не менять скриншот</p>
	{/if}
	{#if rosterPreviewUrl}
		<button class="img-btn" onclick={() => openImagePopup(rosterPreviewUrl)}>
			<img src={rosterPreviewUrl} alt="" />
		</button>
	{/if}

	<div class="form-row-wide">
		<label for="{idPrefix}-hoyolab-screenshot">Скриншот персонажей в Hoyolab</label>
		<input id="{idPrefix}-hoyolab-screenshot" type="file" accept="image/*" bind:files={form.hoyolabScreenshot} />
		<button type="button" class="btn-common paste-btn" onclick={() => handlePasteScreenshot(form, "hoyolab")}
			>Вставить из буфера</button
		>
	</div>
	{#if form.existingHoyolabUrl}
		<button class="img-btn" onclick={() => openImagePopup(form.existingHoyolabUrl)}>
			<img src={bustCache(form.existingHoyolabUrl)} alt="" />
		</button>
		<p class="notice">Оставьте пустым, чтобы не менять скриншот</p>
	{/if}
	{#if hoyolabPreviewUrl}
		<button class="img-btn" onclick={() => openImagePopup(hoyolabPreviewUrl)}>
			<img src={hoyolabPreviewUrl} alt="" />
		</button>
	{/if}
{/snippet}

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		{#if tournament}
			<h2>Регистрация команды: {tournament.name}</h2>

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
				<div class="form-row-wide">
					<label for="team-select">Команда</label>
					<select id="team-select" bind:value={selectedTeamId}>
						<option value="">Выберите команду</option>
						{#each myTeams as team (team.id)}
							<option value={team.id}>{team.name} ({team.creator.name} & {team.player2.name})</option>
						{/each}
					</select>
				</div>

				{#if selectedTeam && regLoaded}
					<hr style="width: 100%" />
					{@render memberFields(
						"p1",
						`Игрок 1 (${selectedTeam.creator.name})`,
						player1Form,
						player1RosterPreview.url,
						player1HoyolabPreview.url,
					)}

					<hr style="width: 100%" />
					{@render memberFields(
						"p2",
						`Игрок 2 (${selectedTeam.player2.name})`,
						player2Form,
						player2RosterPreview.url,
						player2HoyolabPreview.url,
					)}

					<hr style="width: 100%" />

					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="awareness" onclick={() => (awareness = !awareness)}>
						<input type="checkbox" bind:checked={awareness} onclick={(e) => e.stopPropagation()} />
						<span
							>Конечно, мы полностью прочитали регламент, и осознаём, что
							турнир проходит с <span class="value-highlight"
								>{new Date(tournament.tournamentStartDate).toLocaleString("ru", dateDisplayOptions)}</span
							>
							по
							<span class="value-highlight"
								>{new Date(tournament.tournamentEndDate).toLocaleString("ru", dateDisplayOptions)}</span
							>
						</span>
					</div>

					{#if status}<p class="status error">{status}</p>{/if}
					<div class="btn-col">
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
	.awareness {
		display: flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
	}

	.awareness input[type="checkbox"] {
		width: 16px;
		height: 16px;
		min-width: 16px;
		cursor: pointer;
		accent-color: var(--gold);
	}

	.awareness span {
		color: #aaa;
	}
</style>
