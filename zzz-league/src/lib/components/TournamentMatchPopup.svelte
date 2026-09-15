<script lang="ts">
	import { adminSetMatchResult, approveResult } from "$lib/backend";
	import { useObjectUrlPreview } from "$lib/imagePreview.svelte.js";
	import { currentUser, isAdmin, isModerator } from "$lib/store";
	import {
		bustCache,
		filesFromImageFile,
		imageFileFromPasteEvent,
		isImageTooLarge,
		MAX_IMAGE_SIZE_MB,
		openImagePopup,
		pasteImageFromClipboard,
	} from "$lib/uiCommon";

	let {
		open = $bindable(false),
		tournament = $bindable(),
		match = $bindable(),
		registeredPlayers = $bindable([]),
		teamsById = new Map(),
	} = $props();

	let isTeamMatch = $derived(!!match.p1TeamId || !!match.p2TeamId);
	let isDeadlyAssault = $derived(tournament.gameMode === "deadly_assault");
	let defaultResult = $derived(isDeadlyAssault ? "0" : "00:00");

	function isMemberOfTeam(teamId: string | null) {
		if (!teamId || !$currentUser) return false;
		const team = teamsById.get(teamId);
		return (
			!!team &&
			(team.creator.uid === $currentUser.uid ||
				team.player2.uid === $currentUser.uid)
		);
	}

	let myGame = $derived(
		isTeamMatch
			? isMemberOfTeam(match.p1TeamId) || isMemberOfTeam(match.p2TeamId)
			: $currentUser?.uid == match.p1 || $currentUser?.uid == match.p2,
	);
	let canApproveOwnResult = $derived(match.state !== "complete" && myGame);
	let canAdminSetResult = $derived(
		($isAdmin || $isModerator) && tournament.state !== "complete",
	);

	let inputScreenshot = $state<FileList | null>(null);
	let adminInputScreenshot = $state<FileList | null>(null);
	// Native file inputs are visually hidden — "Выбрать файл" triggers them programmatically so
	// the button can be styled like the rest of the design system instead of the OS-default input.
	let ownFileInput: HTMLInputElement | undefined = $state();
	let adminFileInput: HTMLInputElement | undefined = $state();
	let matchResultP1 = $state(match.resultP1 ?? "00:00");
	let matchResultP2 = $state(match.resultP2 ?? "00:00");

	$effect(() => {
		match;
		matchResultP1 = match.resultP1 ?? defaultResult;
		matchResultP2 = match.resultP2 ?? defaultResult;
		inputScreenshot = null;
	});

	let inputScreenshotPreview = useObjectUrlPreview(() => inputScreenshot?.[0]);
	let adminScreenshotPreview = useObjectUrlPreview(
		() => adminInputScreenshot?.[0],
	);

	function isValidTime(time: string) {
		const [h, m] = time.split(":").map(Number);
		return h * 60 + m > 0;
	}

	function isValidScore(score: string) {
		// Free-text input now (see resultP1/resultP2's string contract with the API) — digits only,
		// not just "parses as a positive integer", so things like "2e3" or "2000.0" don't sneak
		// through as a valid score and then fail to parse server-side.
		return /^[0-9]+$/.test(score) && Number(score) > 0;
	}

	function isValidResult(value: string) {
		return isDeadlyAssault ? isValidScore(value) : isValidTime(value);
	}

	let hasUnsavedInput = $derived(
		matchResultP1 !== (match.resultP1 ?? defaultResult) ||
			matchResultP2 !== (match.resultP2 ?? defaultResult) ||
			!!inputScreenshot?.length ||
			!!adminInputScreenshot?.length,
	);

	function handleClose() {
		if (
			hasUnsavedInput &&
			!confirm("Введённые данные будут потеряны. Закрыть окно?")
		) {
			return;
		}
		open = false;
	}

	async function handlePasteScreenshot(target: "own" | "admin") {
		try {
			const files = await pasteImageFromClipboard();
			if (!files) {
				alert("В буфере обмена нет изображения");
				return;
			}
			if (target === "own") {
				inputScreenshot = files;
			} else {
				adminInputScreenshot = files;
			}
		} catch (error) {}
	}

	$effect(() => {
		function onPaste(e: ClipboardEvent) {
			const file = imageFileFromPasteEvent(e);
			if (!file) return;

			const files = filesFromImageFile(file);
			if (canApproveOwnResult) {
				inputScreenshot = files;
			} else if (canAdminSetResult) {
				adminInputScreenshot = files;
			} else {
				return;
			}
			e.preventDefault();
		}

		window.addEventListener("paste", onPaste);
		return () => window.removeEventListener("paste", onPaste);
	});

	function getPlayerName(uid: string | null) {
		if (!uid) return undefined;
		return registeredPlayers.find((p) => p.player.uid === uid)?.player.name;
	}

	// "TEAM_NAME (P1 + P2)" — matches how team participants are named on the Challonge bracket.
	function getTeamLabel(teamId: string | null) {
		if (!teamId) return undefined;
		const team = teamsById.get(teamId);
		if (!team) return undefined;
		return `${team.name} (${team.creator.name} + ${team.player2.name})`;
	}

	function getSideLabel(uid: string | null, teamId: string | null) {
		return teamId ? getTeamLabel(teamId) : getPlayerName(uid);
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

	let isApproving = $state(false);
	async function handleApproveResult() {
		if (isApproving) return;
		if (!isValidResult(matchResultP1) || !isValidResult(matchResultP2)) {
			alert(isDeadlyAssault ? "Введите очки больше 0" : "Введите время больше 00:00");
			return;
		}
		const resultScreenshot = inputScreenshot?.[0];
		if (!resultScreenshot && !match.resultScreenshot) {
			alert("Необходимо загрузить скриншот результата");
			return;
		}
		if (resultScreenshot && isImageTooLarge(resultScreenshot)) {
			alert(`Файл слишком большой, максимум ${MAX_IMAGE_SIZE_MB}МБ`);
			return;
		}
		try {
			isApproving = true;
			await approveResult(
				tournament.id,
				match.id,
				matchResultP1,
				matchResultP2,
				resultScreenshot,
			);
		} catch (error) {
			alert(error);
		} finally {
			isApproving = false;
		}
	}

	let adminAction = $state<"result" | "techloss-p1" | "techloss-p2" | null>(
		null,
	);

	async function handleAdminSetResult() {
		if (adminAction) return;
		if (!isValidResult(matchResultP1) || !isValidResult(matchResultP2)) {
			alert(isDeadlyAssault ? "Введите очки больше 0" : "Введите время больше 00:00");
			return;
		}
		const adminScreenshot = adminInputScreenshot?.[0] ?? null;
		if (adminScreenshot && isImageTooLarge(adminScreenshot)) {
			alert(`Файл слишком большой, максимум ${MAX_IMAGE_SIZE_MB}МБ`);
			return;
		}
		if (!confirm("Записать результат от имени администратора?")) return;
		try {
			adminAction = "result";
			await adminSetMatchResult(
				tournament.id,
				match.id,
				matchResultP1,
				matchResultP2,
				adminScreenshot,
			);
		} catch (error) {
			alert(error);
		} finally {
			adminAction = null;
		}
	}

	async function handleAdminTechLoss(side: "p1" | "p2") {
		if (adminAction) return;
		const loserName = isTeamMatch
			? getTeamLabel(side === "p1" ? match.p1TeamId : match.p2TeamId)
			: getPlayerName(side === "p1" ? match.p1 : match.p2);
		if (
			!confirm(
				`${loserName} получает техлуз, оппонент побеждает без ELO. Продолжить?`,
			)
		)
			return;
		try {
			adminAction = side === "p1" ? "techloss-p1" : "techloss-p2";
			if (isTeamMatch) {
				await adminSetMatchResult(
					tournament.id,
					match.id,
					null,
					null,
					null,
					null,
					side === "p1" ? match.p1TeamId : match.p2TeamId,
				);
			} else {
				await adminSetMatchResult(
					tournament.id,
					match.id,
					null,
					null,
					null,
					side === "p1" ? match.p1 : match.p2,
				);
			}
		} catch (error) {
			alert(error);
		} finally {
			adminAction = null;
		}
	}
</script>

{#snippet closeRow()}
	<div class="close-row">
		<button class="icon-btn" onclick={handleClose} aria-label="Закрыть">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
		</button>
	</div>
{/snippet}

{#snippet matchHeader()}
	<div class="tournament-label">Матч · {tournament.name}</div>
	<div class="match-players">
		<span
			class="match-player-name match-player-left {getPlayerClass(
				match.p1 ?? match.p1TeamId,
				match.winnerId ?? match.winnerTeamId,
				match.techLossUid ?? match.techLossTeamId,
			)}">{getSideLabel(match.p1, match.p1TeamId)}</span
		>
		<span class="match-vs">vs</span>
		<span
			class="match-player-name match-player-right {getPlayerClass(
				match.p2 ?? match.p2TeamId,
				match.winnerId ?? match.winnerTeamId,
				match.techLossUid ?? match.techLossTeamId,
			)}">{getSideLabel(match.p2, match.p2TeamId)}</span
		>
	</div>
	{#if match.resultP1 && match.resultP2}
		<div class="match-players result-row">
			<span class="match-player-left">{match.resultP1}</span>
			<span></span>
			<span class="match-player-right">{match.resultP2}</span>
		</div>
	{/if}
	{#if match.techLossUid || match.techLossTeamId}
		<span class="techloss-label"
			>{getSideLabel(match.techLossUid, match.techLossTeamId)} тех. луз</span
		>
	{/if}
{/snippet}

{#snippet resultFields(p1id: string, p2id: string)}
	{#if isDeadlyAssault}
		<input
			id={p1id}
			class="field"
			type="text"
			inputmode="numeric"
			pattern="[0-9]*"
			bind:value={matchResultP1}
		/>
		<input
			id={p2id}
			class="field"
			type="text"
			inputmode="numeric"
			pattern="[0-9]*"
			bind:value={matchResultP2}
		/>
	{:else}
		<input id={p1id} class="field" type="time" step="60" lang="en-GB" bind:value={matchResultP1} />
		<input id={p2id} class="field" type="time" step="60" lang="en-GB" bind:value={matchResultP2} />
	{/if}
{/snippet}

{#snippet screenshotThumb(
	previewUrl: string | null | undefined,
	fallbackUrl: string | null | undefined,
)}
	{#if previewUrl || fallbackUrl}
		<button
			class="screenshot-thumb"
			onclick={() => openImagePopup(previewUrl ?? bustCache(fallbackUrl!))}
		>
			<img src={previewUrl ?? bustCache(fallbackUrl!)} alt="" />
		</button>
	{:else}
		<div class="screenshot-placeholder">Скриншот результатов</div>
	{/if}
{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="popup" onclick={handleClose}>
	<div class="popup-stack">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="card match-card" onclick={(e) => e.stopPropagation()}>
			{@render closeRow()}
			{@render matchHeader()}

			{#if canApproveOwnResult}
				<div class="divider"></div>

				<div class="result-input-block">
					<div class="result-fields input-labels">
						<span
							>{isDeadlyAssault ? "Введите очки" : "Введите время"} {getSideLabel(
								match.p1,
								match.p1TeamId,
							)}</span
						>
						<span
							>{isDeadlyAssault ? "Введите очки" : "Введите время"} {getSideLabel(
								match.p2,
								match.p2TeamId,
							)}</span
						>
					</div>
					<div class="result-fields">
						{@render resultFields("own-result-p1", "own-result-p2")}
					</div>
				</div>

				<div class="screenshot-block">
					<div class="screenshot-btn-row">
						<input
							bind:this={ownFileInput}
							class="hidden-file-input"
							type="file"
							accept="image/*"
							bind:files={inputScreenshot}
						/>
						<button
							type="button"
							class="btn-common btn-sm-action"
							onclick={() => ownFileInput?.click()}>Выбрать файл</button
						>
						<button
							type="button"
							class="btn-common btn-sm-action"
							onclick={() => handlePasteScreenshot("own")}
							>Вставить(Ctrl+V)</button
						>
					</div>
					{@render screenshotThumb(inputScreenshotPreview.url, match.resultScreenshot)}
				</div>

				<div class="approval-row">
					<span class="approval-pill {match.p1ApprovedResult ? 'approved' : 'pending'}">
						{#if match.p1ApprovedResult}
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
							{getSideLabel(match.p1, match.p1TeamId)} подтвердил
						{:else}
							{getSideLabel(match.p1, match.p1TeamId)} — ожидание
						{/if}
					</span>
					<span class="approval-pill {match.p2ApprovedResult ? 'approved' : 'pending'}">
						{#if match.p2ApprovedResult}
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
							{getSideLabel(match.p2, match.p2TeamId)} подтвердил
						{:else}
							{getSideLabel(match.p2, match.p2TeamId)} — ожидание
						{/if}
					</span>
				</div>

				<button
					class="btn-common btn-play btn-block"
					class:btn-loading={isApproving}
					onclick={handleApproveResult}>Подтвердить результат</button
				>
			{:else if match.resultScreenshot}
				<div class="divider"></div>
				<div class="screenshot-block">
					<span class="screenshot-label">Результат</span>
					{@render screenshotThumb(undefined, match.resultScreenshot)}
				</div>
			{/if}
		</div>

		{#if canAdminSetResult}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="card match-card admin-card" onclick={(e) => e.stopPropagation()}>
				{@render closeRow()}
				{@render matchHeader()}

				<div class="divider admin-divider"></div>
				<div class="admin-label">Админ: изменить результат</div>

				<div class="result-fields">
					{@render resultFields("admin-result-p1", "admin-result-p2")}
				</div>

				<div class="screenshot-block">
					<div class="screenshot-btn-row">
						<input
							bind:this={adminFileInput}
							class="hidden-file-input"
							type="file"
							accept="image/*"
							bind:files={adminInputScreenshot}
						/>
						<button
							type="button"
							class="btn-common btn-sm-action"
							onclick={() => adminFileInput?.click()}>Выбрать файл</button
						>
						<button
							type="button"
							class="btn-common btn-sm-action"
							onclick={() => handlePasteScreenshot("admin")}
							>Вставить из буфера</button
						>
					</div>
					{@render screenshotThumb(adminScreenshotPreview.url, match.resultScreenshot)}
				</div>

				<button
					class="btn-common btn-block"
					class:btn-loading={adminAction === "result"}
					onclick={handleAdminSetResult}>Записать результат</button
				>

				<div class="admin-techloss-row">
					<button
						class="btn-common btn-danger-ghost"
						class:btn-loading={adminAction === "techloss-p1"}
						onclick={() => handleAdminTechLoss("p1")}
						>Техлуз {getSideLabel(match.p1, match.p1TeamId)}</button
					>
					<button
						class="btn-common btn-danger-ghost"
						class:btn-loading={adminAction === "techloss-p2"}
						onclick={() => handleAdminTechLoss("p2")}
						>Техлуз {getSideLabel(match.p2, match.p2TeamId)}</button
					>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.popup-stack {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 16px;
	}

	.match-card {
		width: 420px;
		max-width: 90vw;
		padding: 16px 22px 22px;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 16px;
	}

	.close-row {
		display: flex;
		justify-content: flex-end;
		margin-bottom: -8px;
	}

	.tournament-label {
		text-align: center;
		font-size: 11px;
		font-weight: 700;
		color: var(--text-dim);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.match-players {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 10px;
	}

	.result-row {
		font-weight: 700;
		font-size: 14px;
	}

	.divider {
		height: 1px;
		background: var(--border-soft);
	}

	.result-input-block {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.input-labels {
		font-size: 11px;
		color: var(--text-dim);
		text-align: center;
	}

	.result-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.field {
		height: 36px;
		padding: 0 12px;
		border-radius: var(--r-md);
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		color: var(--text);
		font-size: 14px;
		font-family: inherit;
		text-align: center;
		font-weight: 700;
		width: 100%;
		min-width: 0;
	}

	/* Chromium/WebKit's native time-input chrome (clock icon, spinner) clashes with the flat
	   design here — the field is still a real editable time input, just visually normalized. */
	.field::-webkit-calendar-picker-indicator {
		display: none;
	}

	.field::-webkit-inner-spin-button {
		display: none;
	}

	.field:focus {
		outline: none;
		border-color: var(--gold);
	}

	.screenshot-block {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.screenshot-label {
		font-size: 12px;
		color: var(--text-muted);
	}

	.screenshot-btn-row {
		display: flex;
		gap: 8px;
	}

	.btn-sm-action {
		flex: 1;
		height: 32px;
		font-size: 12px;
	}

	.hidden-file-input {
		display: none;
	}

	.screenshot-thumb {
		display: block;
		width: 100%;
		border-radius: var(--r-md);
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		padding: 0;
		overflow: hidden;
		cursor: pointer;
	}

	.screenshot-thumb img {
		display: block;
		width: 100%;
		max-height: 220px;
		object-fit: contain;
	}

	.screenshot-placeholder {
		width: 100%;
		height: 64px;
		border-radius: var(--r-md);
		background: var(--bg-elevated);
		border: 1px dashed var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-dim);
		font-size: 11px;
	}

	.approval-row {
		display: flex;
		gap: 8px;
	}

	.approval-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 6px 10px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 700;
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.approval-pill.approved {
		background: var(--success-dim);
		color: var(--success);
	}

	.approval-pill.pending {
		background: var(--surface-2);
		color: var(--text-dim);
	}

	.btn-block {
		width: 100%;
	}

	.admin-card {
		width: 440px;
		background: linear-gradient(oklch(0.665 0.19 24 / 0.055), oklch(0.665 0.19 24 / 0.055)), var(--surface);
		border: 1px solid var(--danger-border);
	}

	.admin-divider {
		background: var(--danger-border);
	}

	.admin-label {
		font-size: 11px;
		font-weight: 700;
		color: var(--danger);
		text-align: center;
	}

	.admin-techloss-row {
		display: flex;
		gap: 8px;
		width: 100%;
	}

	.admin-techloss-row .btn-common {
		flex: 1;
	}
</style>
