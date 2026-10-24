<script lang="ts">
	import { confirmDialog, notify } from "$lib/dialogs.svelte";
	import { modal } from "$lib/actions/modal";
	import type { NexusMissingDto, NexusPreviewDto } from "$lib/api/dtos";
	import { adminSetMatchResult, approveResult, previewNexusResult, type NexusSide } from "$lib/backend";
	import { ApiError } from "$lib/api";
	import NexusResultEmbed from "$lib/components/NexusResultEmbed.svelte";
	import { _ } from "$lib/i18n";
	import { useObjectUrlPreview } from "$lib/imagePreview.svelte.js";
	import { getAuthSession } from "$lib/auth.svelte";
	import {
		bustCache,
		filesFromImageFile,
		imageFileFromPasteEvent,
		isImageTooLarge,
		MAX_IMAGE_SIZE_MB,
		openImagePopup,
		pasteImageFromClipboard,
	} from "$lib/uiCommon";

	const session = getAuthSession();

	let {
		open = $bindable(false),
		tournament = $bindable(),
		match = $bindable(),
		registeredPlayers = $bindable([]),
		teamsById = new Map(),
		// Called after any successful result submit (player or admin) so the page can re-fetch
		// right away instead of relying only on the SignalR push, which anonymous/disconnected
		// clients never get and which can arrive late.
		onResultSubmitted = () => {},
	} = $props();

	let isTeamMatch = $derived(!!match.p1TeamId || !!match.p2TeamId);
	let isDeadlyAssault = $derived(tournament.gameMode === "deadly_assault");
	let defaultResult = $derived(isDeadlyAssault ? "0" : "00:00");

	function isMemberOfTeam(teamId: string | null) {
		if (!teamId || !session.user) return false;
		const team = teamsById.get(teamId);
		return (
			!!team &&
			(team.creator.uid === session.user.uid ||
				team.player2.uid === session.user.uid)
		);
	}

	let myGame = $derived(
		isTeamMatch
			? isMemberOfTeam(match.p1TeamId) || isMemberOfTeam(match.p2TeamId)
			: session.user?.uid == match.p1 || session.user?.uid == match.p2,
	);
	let canApproveOwnResult = $derived(match.state !== "complete" && myGame);
	let canAdminSetResult = $derived(
		(session.isAdmin || session.isModerator) && tournament.state !== "complete",
	);

	let inputScreenshot = $state<FileList | null>(null);
	let adminInputScreenshot = $state<FileList | null>(null);
	// Native file inputs are visually hidden — "Выбрать файл" triggers them programmatically so
	// the button can be styled like the rest of the design system instead of the OS-default input.
	let ownFileInput: HTMLInputElement | undefined = $state();
	let adminFileInput: HTMLInputElement | undefined = $state();
	let matchResultP1 = $state(match.resultP1 ?? "00:00");
	let matchResultP2 = $state(match.resultP2 ?? "00:00");

	// Solo matches take their result from a nexus-shiyu.com result link — players must paste one,
	// moderators may (it prefills their editable fields). Team matches keep typed result + screenshot.
	//
	// NEXUS_PARSING_ENABLED = false while Nexus has no stable API to read results from: solo
	// results are typed (like team matches) and the pasted link is only proof, shown as an embed
	// instead of a screenshot. Flip together with the API's Nexus:ParseResults setting.
	const NEXUS_PARSING_ENABLED = false;
	const NEXUS_LINK_PATTERN =
		/^https?:\/\/(www\.)?nexus-shiyu\.com\/results\/([a-z0-9]{10,40})(\/obs)?\/?([?#].*)?$/i;

	function nexusIdFromUrl(url: string) {
		return NEXUS_LINK_PATTERN.exec(url.trim())?.[2]?.toLowerCase() ?? null;
	}

	type NexusDraft = {
		url: string;
		// Which Nexus side is P1 — only set when the names on Nexus couldn't be matched to the players.
		p1Side: NexusSide | null;
		preview: NexusPreviewDto | null;
		error: string | null;
		loading: boolean;
	};

	const emptyNexusDraft = (): NexusDraft => ({ url: "", p1Side: null, preview: null, error: null, loading: false });
	let ownNexus = $state<NexusDraft>(emptyNexusDraft());
	let adminNexus = $state<NexusDraft>(emptyNexusDraft());

	$effect(() => {
		match;
		matchResultP1 = match.resultP1 ?? defaultResult;
		matchResultP2 = match.resultP2 ?? defaultResult;
		inputScreenshot = null;
		ownNexus = emptyNexusDraft();
		adminNexus = emptyNexusDraft();
	});

	// 502 = Nexus answered in a shape the API can't parse (Nexus changes often) — the API logs the
	// raw response, and users are asked to report it. 503 = Nexus is down. Everything else is the
	// API's own message (bad link, wrong game mode, unfinished result, …).
	function nexusErrorMessage(error: unknown) {
		if (error instanceof ApiError && error.status === 502) return $_("tournamentMatchPopup.nexusParseFailed");
		if (error instanceof ApiError && error.status === 503) return $_("tournamentMatchPopup.nexusUnavailable");
		return error instanceof Error ? error.message : String(error);
	}

	function isNexusFormatError(error: unknown) {
		return error instanceof ApiError && error.status === 502;
	}

	// Guards against an older, slower preview response overwriting a newer one while typing.
	const previewRequestIds = { own: 0, admin: 0 };

	async function loadNexusPreview(target: "own" | "admin") {
		const draft = target === "own" ? ownNexus : adminNexus;
		const url = draft.url.trim();
		draft.preview = null;
		draft.error = null;
		draft.loading = false;
		if (!url) return;
		if (!NEXUS_LINK_PATTERN.test(url)) {
			draft.error = $_("tournamentMatchPopup.nexusLinkInvalid");
			return;
		}
		if (!NEXUS_PARSING_ENABLED) return;

		const requestId = ++previewRequestIds[target];
		draft.loading = true;
		try {
			const preview = await previewNexusResult(tournament.id, match.id, url, draft.p1Side);
			if (requestId !== previewRequestIds[target]) return;
			draft.preview = preview;
			if (target === "admin" && preview.resultP1 && preview.resultP2) {
				matchResultP1 = preview.resultP1;
				matchResultP2 = preview.resultP2;
			}
		} catch (error) {
			if (requestId === previewRequestIds[target]) {
				draft.error = nexusErrorMessage(error);
				if (isNexusFormatError(error)) notify(draft.error);
			}
		} finally {
			if (requestId === previewRequestIds[target]) draft.loading = false;
		}
	}

	function handleNexusUrlInput(target: "own" | "admin", value: string) {
		const draft = target === "own" ? ownNexus : adminNexus;
		draft.url = value;
		draft.p1Side = null;
		loadNexusPreview(target);
	}

	// Players pick their own side ("I'm X"); moderators pick which side P1 is.
	let iAmP1 = $derived(session.user?.uid === match.p1);

	function pickNexusSide(target: "own" | "admin", side: NexusSide) {
		const draft = target === "own" ? ownNexus : adminNexus;
		draft.p1Side = target === "admin" || iAmP1 ? side : side === "left" ? "right" : "left";
		loadNexusPreview(target);
	}

	// "Couldn't read 2 results (game 2: A, B). Only 1 of 2 games are counted." — side is p1/p2 once
	// the mapping is known, left/right (named via the Nexus names) before that.
	function nexusWarning(
		missing: NexusMissingDto[] | null | undefined,
		counted: number | null | undefined,
		total: number | null | undefined,
		leftName?: string,
		rightName?: string,
	) {
		if (!missing?.length) return null;
		const nameOf = (side: NexusMissingDto["side"]) =>
			side === "p1"
				? getPlayerName(match.p1)
				: side === "p2"
					? getPlayerName(match.p2)
					: side === "left"
						? leftName
						: rightName;
		const byGame = new Map<number, string[]>();
		for (const value of missing) {
			byGame.set(value.game, [...(byGame.get(value.game) ?? []), nameOf(value.side) ?? value.side]);
		}
		const details = [...byGame]
			.map(([game, names]) => `${$_("tournamentMatchPopup.nexusGameLabel", { values: { game } })}: ${names.join(", ")}`)
			.join("; ");
		return $_("tournamentMatchPopup.nexusPartialWarning", {
			values: { count: missing.length, details, counted: counted ?? 0, total: total ?? 0 },
		});
	}

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
			!!adminInputScreenshot?.length ||
			!!ownNexus.url.trim() ||
			!!adminNexus.url.trim(),
	);

	async function handleClose() {
		if (
			hasUnsavedInput &&
			!(await confirmDialog($_("tournamentMatchPopup.confirmClose"), { danger: true, confirmLabel: $_("common.discard") }))
		) {
			return;
		}
		open = false;
	}

	async function handlePasteScreenshot(target: "own" | "admin") {
		try {
			const files = await pasteImageFromClipboard();
			if (!files) {
				notify($_("tournamentMatchPopup.noImageInClipboard"));
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
			// Screenshots are only still accepted for team matches.
			if (!isTeamMatch) return;
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
		if (!isTeamMatch && NEXUS_PARSING_ENABLED) {
			await handleApproveNexusResult();
			return;
		}
		if (!isValidResult(matchResultP1) || !isValidResult(matchResultP2)) {
			notify(isDeadlyAssault ? $_("tournamentMatchPopup.enterScoreAboveZero") : $_("tournamentMatchPopup.enterTimeAboveZero"));
			return;
		}
		if (!isTeamMatch) {
			await handleApproveTypedSoloResult();
			return;
		}
		const resultScreenshot = inputScreenshot?.[0];
		if (!resultScreenshot && !match.resultScreenshot) {
			notify($_("tournamentMatchPopup.screenshotRequired"));
			return;
		}
		if (resultScreenshot && isImageTooLarge(resultScreenshot)) {
			notify($_("tournamentMatchPopup.fileTooLarge", { values: { max: MAX_IMAGE_SIZE_MB } }));
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
			onResultSubmitted();
		} catch (error) {
			notify(error);
		} finally {
			isApproving = false;
		}
	}

	// Solo: submit the pasted link, or — with no new link — just confirm the result already stored.
	async function handleApproveNexusResult() {
		const url = ownNexus.url.trim();
		if (url) {
			const preview = ownNexus.preview;
			if (!preview) {
				notify(ownNexus.error ?? $_("tournamentMatchPopup.nexusLoading"));
				return;
			}
			if (preview.p1IsLeft === null) {
				notify($_("tournamentMatchPopup.nexusPickSideRequired"));
				return;
			}
			if (preview.countedGames === 0) {
				notify($_("tournamentMatchPopup.nexusNoFinishedGame"));
				return;
			}
			if (preview.isTie) {
				notify($_("tournamentMatchPopup.nexusTie"));
				return;
			}
		} else if (!match.nexusResultId) {
			notify($_("tournamentMatchPopup.nexusLinkRequired"));
			return;
		}
		try {
			isApproving = true;
			await approveResult(tournament.id, match.id, null, null, null, url || null, url ? ownNexus.p1Side : null);
			onResultSubmitted();
		} catch (error) {
			notify(nexusErrorMessage(error));
		} finally {
			isApproving = false;
		}
	}

	// Solo while Nexus parsing is off: the typed result, with the Nexus link as proof (instead of
	// a screenshot). With no new link the one already stored is kept.
	async function handleApproveTypedSoloResult() {
		const url = ownNexus.url.trim();
		if (url && ownNexus.error) {
			notify(ownNexus.error);
			return;
		}
		if (!url && !match.nexusResultId && !match.resultScreenshot) {
			notify($_("tournamentMatchPopup.nexusLinkRequired"));
			return;
		}
		try {
			isApproving = true;
			await approveResult(tournament.id, match.id, matchResultP1, matchResultP2, null, url || null, null);
			onResultSubmitted();
		} catch (error) {
			notify(nexusErrorMessage(error));
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
			notify(isDeadlyAssault ? $_("tournamentMatchPopup.enterScoreAboveZero") : $_("tournamentMatchPopup.enterTimeAboveZero"));
			return;
		}
		// Screenshots only for team matches; solo matches can attach a Nexus link instead.
		const adminScreenshot = isTeamMatch ? (adminInputScreenshot?.[0] ?? null) : null;
		if (adminScreenshot && isImageTooLarge(adminScreenshot)) {
			notify($_("tournamentMatchPopup.fileTooLarge", { values: { max: MAX_IMAGE_SIZE_MB } }));
			return;
		}
		const adminNexusUrl = isTeamMatch ? "" : adminNexus.url.trim();
		if (adminNexusUrl && adminNexus.error) {
			notify(adminNexus.error);
			return;
		}
		if (!(await confirmDialog($_("tournamentMatchPopup.confirmAdminSetResult"), { confirmLabel: $_("tournamentMatchPopup.recordResultButton") }))) return;
		try {
			adminAction = "result";
			await adminSetMatchResult(
				tournament.id,
				match.id,
				matchResultP1,
				matchResultP2,
				adminScreenshot,
				null,
				null,
				adminNexusUrl || null,
				adminNexusUrl ? adminNexus.p1Side : null,
			);
			onResultSubmitted();
		} catch (error) {
			notify(nexusErrorMessage(error));
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
			!(await confirmDialog($_("tournamentMatchPopup.confirmTechLoss", { values: { loserName } }), {
					danger: true,
					confirmLabel: $_("tournamentMatchPopup.techLossButton"),
				}))
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
			onResultSubmitted();
		} catch (error) {
			notify(error);
		} finally {
			adminAction = null;
		}
	}
</script>

{#snippet closeRow()}
	<div class="close-row">
		<button class="icon-btn" onclick={handleClose} aria-label={$_("common.close")}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
		</button>
	</div>
{/snippet}

{#snippet matchHeader()}
	<div class="tournament-label">{$_("tournamentMatchPopup.matchLabel", { values: { name: tournament.name } })}</div>
	<div class="match-players">
		<span
			class="match-player-name match-player-left {getPlayerClass(
				match.p1 ?? match.p1TeamId,
				match.winnerId ?? match.winnerTeamId,
				match.techLossUid ?? match.techLossTeamId,
			)}">{getSideLabel(match.p1, match.p1TeamId)}</span
		>
		<span class="match-vs">{$_("common.versus")}</span>
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
			>{getSideLabel(match.techLossUid, match.techLossTeamId)} {$_("tournamentMatchPopup.techLossSuffix")}</span
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
		<div class="screenshot-placeholder">{$_("tournamentMatchPopup.screenshotPlaceholder")}</div>
	{/if}
{/snippet}

{#snippet nexusWarningBlock(
	missing: NexusMissingDto[] | null | undefined,
	counted: number | null | undefined,
	total: number | null | undefined,
	leftName?: string,
	rightName?: string,
)}
	{@const warning = nexusWarning(missing, counted, total, leftName, rightName)}
	{#if warning}
		<div class="nexus-warning">{warning}</div>
	{/if}
{/snippet}

<!-- The result already stored on the match: live Nexus overlay, or a legacy screenshot. -->
{#snippet storedResult()}
	{#if match.nexusResultId}
		{@render nexusWarningBlock(match.nexusMissing, match.nexusCountedGames, match.nexusTotalGames)}
		<NexusResultEmbed resultId={match.nexusResultId} />
	{:else if match.resultScreenshot}
		{@render screenshotThumb(undefined, match.resultScreenshot)}
	{/if}
{/snippet}

{#snippet nexusInput(target: "own" | "admin")}
	{@const draft = target === "own" ? ownNexus : adminNexus}
	<div class="nexus-block">
		<label class="screenshot-label" for="{target}-nexus-link">{$_("tournamentMatchPopup.nexusLinkLabel")}</label>
		<input
			id="{target}-nexus-link"
			class="field nexus-link-field"
			type="url"
			inputmode="url"
			autocomplete="off"
			placeholder={$_("tournamentMatchPopup.nexusLinkPlaceholder")}
			value={draft.url}
			oninput={(e) => handleNexusUrlInput(target, e.currentTarget.value)}
		/>
		{#if draft.loading}
			<div class="nexus-status">{$_("tournamentMatchPopup.nexusLoading")}</div>
		{:else if draft.error}
			<div class="nexus-status nexus-error">{draft.error}</div>
		{/if}

		{#if draft.preview}
			{@const preview = draft.preview}
			{#if preview.p1IsLeft === null}
				<div class="nexus-side-picker">
					<span class="screenshot-label">
						{target === "own"
							? $_("tournamentMatchPopup.nexusPickSideLabel")
							: $_("tournamentMatchPopup.nexusPickSideAdminLabel", {
									values: { name: getSideLabel(match.p1, match.p1TeamId) },
								})}
					</span>
					<div class="screenshot-btn-row">
						{#each [["left", preview.leftName], ["right", preview.rightName]] as [side, name] (side)}
							<button
								type="button"
								class="btn-common btn-sm-action"
								onclick={() => pickNexusSide(target, side as NexusSide)}
								>{target === "own"
									? $_("tournamentMatchPopup.nexusPickSideOption", { values: { name } })
									: name}</button
							>
						{/each}
					</div>
				</div>
			{:else if target === "own" && preview.resultP1 && preview.resultP2}
				<div class="match-players result-row">
					<span class="match-player-left">{preview.resultP1}</span>
					<span></span>
					<span class="match-player-right">{preview.resultP2}</span>
				</div>
			{/if}
			{@render nexusWarningBlock(
				preview.missing,
				preview.countedGames,
				preview.totalGames,
				preview.leftName,
				preview.rightName,
			)}
			<NexusResultEmbed resultId={preview.nexusResultId} />
		{:else if !NEXUS_PARSING_ENABLED && !draft.error && nexusIdFromUrl(draft.url)}
			<NexusResultEmbed resultId={nexusIdFromUrl(draft.url)!} />
		{:else if target === "own"}
			{@render storedResult()}
		{/if}
	</div>
{/snippet}

<div class="popup">
	<div class="popup-stack" use:modal={handleClose}>
		<div class="card match-card">
			{@render closeRow()}
			{@render matchHeader()}

			{#if canApproveOwnResult}
				<div class="divider"></div>

				{#if !isTeamMatch && NEXUS_PARSING_ENABLED}
					{@render nexusInput("own")}
				{:else}
					<div class="result-input-block">
						<div class="result-fields input-labels">
							<span
								>{isDeadlyAssault ? $_("tournamentMatchPopup.enterScoreLabel") : $_("tournamentMatchPopup.enterTimeLabel")} {getSideLabel(
									match.p1,
									match.p1TeamId,
								)}</span
							>
							<span
								>{isDeadlyAssault ? $_("tournamentMatchPopup.enterScoreLabel") : $_("tournamentMatchPopup.enterTimeLabel")} {getSideLabel(
									match.p2,
									match.p2TeamId,
								)}</span
							>
						</div>
						<div class="result-fields">
							{@render resultFields("own-result-p1", "own-result-p2")}
						</div>
					</div>

					{#if !isTeamMatch}
						{@render nexusInput("own")}
					{:else}
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
									onclick={() => ownFileInput?.click()}>{$_("tournamentMatchPopup.chooseFile")}</button
								>
								<button
									type="button"
									class="btn-common btn-sm-action"
									onclick={() => handlePasteScreenshot("own")}
									>{$_("tournamentMatchPopup.pasteCtrlV")}</button
								>
							</div>
							{@render screenshotThumb(inputScreenshotPreview.url, match.resultScreenshot)}
						</div>
					{/if}
				{/if}

				<div class="approval-row">
					<span class="approval-pill {match.p1ApprovedResult ? 'approved' : 'pending'}">
						{#if match.p1ApprovedResult}
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
							{getSideLabel(match.p1, match.p1TeamId)} {$_("tournamentMatchPopup.approvedSuffix")}
						{:else}
							{getSideLabel(match.p1, match.p1TeamId)} {$_("tournamentMatchPopup.pendingSuffix")}
						{/if}
					</span>
					<span class="approval-pill {match.p2ApprovedResult ? 'approved' : 'pending'}">
						{#if match.p2ApprovedResult}
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
							{getSideLabel(match.p2, match.p2TeamId)} {$_("tournamentMatchPopup.approvedSuffix")}
						{:else}
							{getSideLabel(match.p2, match.p2TeamId)} {$_("tournamentMatchPopup.pendingSuffix")}
						{/if}
					</span>
				</div>

				<button
					class="btn-common btn-play btn-block"
					class:btn-loading={isApproving}
					onclick={handleApproveResult}>{$_("tournamentMatchPopup.confirmResultButton")}</button
				>
			{:else if match.nexusResultId || match.resultScreenshot}
				<div class="divider"></div>
				<div class="screenshot-block">
					<span class="screenshot-label">{$_("tournamentMatchPopup.resultLabel")}</span>
					{@render storedResult()}
				</div>
			{/if}
		</div>

		{#if canAdminSetResult}
			<div class="card match-card admin-card">
				{@render closeRow()}
				{@render matchHeader()}

				<div class="divider admin-divider"></div>
				<div class="admin-label">{$_("tournamentMatchPopup.adminChangeResultLabel")}</div>

				{#if !isTeamMatch && NEXUS_PARSING_ENABLED}
					{@render nexusInput("admin")}
				{/if}

				<div class="result-fields">
					{@render resultFields("admin-result-p1", "admin-result-p2")}
				</div>

				{#if !isTeamMatch && !NEXUS_PARSING_ENABLED}
					{@render nexusInput("admin")}
				{/if}

				{#if isTeamMatch}
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
								onclick={() => adminFileInput?.click()}>{$_("tournamentMatchPopup.chooseFile")}</button
							>
							<button
								type="button"
								class="btn-common btn-sm-action"
								onclick={() => handlePasteScreenshot("admin")}
								>{$_("tournamentMatchPopup.pasteFromClipboard")}</button
							>
						</div>
						{@render screenshotThumb(adminScreenshotPreview.url, match.resultScreenshot)}
					</div>
				{/if}

				<button
					class="btn-common btn-block"
					class:btn-loading={adminAction === "result"}
					onclick={handleAdminSetResult}>{$_("tournamentMatchPopup.recordResultButton")}</button
				>

				<div class="admin-techloss-row">
					<button
						class="btn-common btn-danger-ghost"
						class:btn-loading={adminAction === "techloss-p1"}
						onclick={() => handleAdminTechLoss("p1")}
						>{$_("tournamentMatchPopup.techLossButton")} {getSideLabel(match.p1, match.p1TeamId)}</button
					>
					<button
						class="btn-common btn-danger-ghost"
						class:btn-loading={adminAction === "techloss-p2"}
						onclick={() => handleAdminTechLoss("p2")}
						>{$_("tournamentMatchPopup.techLossButton")} {getSideLabel(match.p2, match.p2TeamId)}</button
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
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 16px;
		max-width: 100%;
		max-height: calc(100dvh - 24px);
		overflow-y: auto;
	}

	@media (max-width: 900px) {
		.popup-stack {
			align-items: stretch;
		}
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

	.nexus-block {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.nexus-link-field {
		text-align: left;
		font-weight: 400;
		font-size: 12px;
	}

	.nexus-status {
		font-size: 11px;
		color: var(--text-dim);
	}

	.nexus-error {
		color: var(--danger);
	}

	.nexus-side-picker {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.nexus-warning {
		padding: 8px 10px;
		border-radius: var(--r-md);
		border-left: 2px solid var(--gold);
		background: var(--surface-2);
		color: var(--text-muted);
		font-size: 11px;
		line-height: 1.4;
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
		border-radius: var(--r-pill);
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
