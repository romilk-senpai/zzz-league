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

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="popup" onclick={handleClose}>
	<div class="popup-stack">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="card" onclick={(e) => e.stopPropagation()}>
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
				{#if match.resultP1 && match.resultP2}
					<span class="match-player-left">{match.resultP1}</span>
					<span> </span>
					<span class="match-player-right">{match.resultP2}</span>
				{/if}
			</div>
			{#if match.techLossUid || match.techLossTeamId}
				<span class="techloss-label"
					>{getSideLabel(match.techLossUid, match.techLossTeamId)} тех. луз</span
				>
			{/if}
			{#if canApproveOwnResult}
				<hr style="width: 100%" />
				<div class="match-players">
					<span class="match-player-left"
						>{isDeadlyAssault ? "Введите очки" : "Введите время"} {getSideLabel(match.p1, match.p1TeamId)}</span
					>
					<span> </span>
					<span class="match-player-right"
						>{isDeadlyAssault ? "Введите очки" : "Введите время"} {getSideLabel(match.p2, match.p2TeamId)}</span
					>
					{#if isDeadlyAssault}
						<input
							class="time-input match-player-left"
							type="text"
							inputmode="numeric"
							pattern="[0-9]*"
							bind:value={matchResultP1}
						/>
						<span> </span>
						<input
							class="time-input match-player-right"
							type="text"
							inputmode="numeric"
							pattern="[0-9]*"
							bind:value={matchResultP2}
						/>
					{:else}
						<input
							class="time-input match-player-left"
							type="time"
							step="60"
							lang="en-GB"
							bind:value={matchResultP1}
						/>
						<span> </span>
						<input
							class="time-input match-player-right"
							type="time"
							step="60"
							lang="en-GB"
							bind:value={matchResultP2}
						/>
					{/if}
				</div>
			{/if}

			{#if match.resultScreenshot}
				<span>Результат</span>
				<button
					class="img-btn"
					onclick={() => openImagePopup(match.resultScreenshot)}
				>
					<img src={bustCache(match.resultScreenshot)} alt="" />
				</button>
			{/if}
			{#if canApproveOwnResult}
				<span>Загрузить скриншот результатов</span>
				<div class="input-row">
					<input
						class="input-screenshot"
						type="file"
						accept="image/*"
						bind:files={inputScreenshot}
					/>
					<button
						type="button"
						class="btn-common paste-btn"
						onclick={() => handlePasteScreenshot("own")}
						>Вставить(Ctrl+V)</button
					>
				</div>
				{#if inputScreenshotPreview.url}
					<button
						class="img-btn"
						onclick={() => openImagePopup(inputScreenshotPreview.url!)}
					>
						<img src={inputScreenshotPreview.url} alt="" />
					</button>
				{/if}
				<button
					class="btn-common"
					class:btn-loading={isApproving}
					onclick={handleApproveResult}
					>Подтвердить результат {match.p1ApprovedResult ? "✅" : "❌"}
					{match.p2ApprovedResult ? "✅" : "❌"}</button
				>
			{/if}

			<button class="btn-common back-btn" onclick={handleClose}
				>← Закрыть</button
			>
		</div>

		{#if canAdminSetResult}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="card admin-card" onclick={(e) => e.stopPropagation()}>
				<span class="admin-label">Админ: изменить результат</span>
				<div class="match-players">
					<span class="match-player-left"
						>{getSideLabel(match.p1, match.p1TeamId)}</span
					>
					<span> </span>
					<span class="match-player-right"
						>{getSideLabel(match.p2, match.p2TeamId)}</span
					>
					{#if isDeadlyAssault}
						<input
							class="time-input match-player-left"
							type="text"
							inputmode="numeric"
							pattern="[0-9]*"
							bind:value={matchResultP1}
						/>
						<span> </span>
						<input
							class="time-input match-player-right"
							type="text"
							inputmode="numeric"
							pattern="[0-9]*"
							bind:value={matchResultP2}
						/>
					{:else}
						<input
							class="time-input match-player-left"
							type="time"
							step="60"
							lang="en-GB"
							bind:value={matchResultP1}
						/>
						<span> </span>
						<input
							class="time-input match-player-right"
							type="time"
							step="60"
							lang="en-GB"
							bind:value={matchResultP2}
						/>
					{/if}
				</div>
				<div class="input-row">
					<input
						class="input-screenshot"
						type="file"
						accept="image/*"
						bind:files={adminInputScreenshot}
					/>
					<button
						type="button"
						class="btn-common paste-btn"
						onclick={() => handlePasteScreenshot("admin")}
						>Вставить из буфера</button
					>
				</div>
				{#if adminScreenshotPreview.url}
					<button
						class="img-btn"
						onclick={() => openImagePopup(adminScreenshotPreview.url!)}
					>
						<img src={adminScreenshotPreview.url} alt="" />
					</button>
				{/if}
				<button
					class="btn-common"
					class:btn-loading={adminAction === "result"}
					onclick={handleAdminSetResult}
				>
					Записать результат
				</button>
				<div class="admin-techloss-row">
					<button
						class="btn-common danger"
						class:btn-loading={adminAction === "techloss-p1"}
						onclick={() => handleAdminTechLoss("p1")}
					>
						Техлуз {getSideLabel(match.p1, match.p1TeamId)}
					</button>
					<button
						class="btn-common danger"
						class:btn-loading={adminAction === "techloss-p2"}
						onclick={() => handleAdminTechLoss("p2")}
					>
						Техлуз {getSideLabel(match.p2, match.p2TeamId)}
					</button>
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

	.card {
		width: 420px;
		justify-content: center;
		align-items: center;
		gap: 16px;
	}

	.input-screenshot {
		width: 240px;
	}

	.match-player-left {
		align-items: flex-end;
	}

	.back-btn {
		margin-top: 0px;
	}

	.admin-label {
		color: #888;
		text-transform: uppercase;
	}

	.admin-techloss-row {
		display: flex;
		gap: 8px;
		width: 100%;
	}

	.admin-techloss-row .btn-common {
		flex: 1;
	}

	.card .btn-common {
		padding: 14px;
	}
</style>
