<script lang="ts">
	import { currentUser, isAdmin, isModerator } from "$lib/store";
	import { hasTournamentStarted } from "$lib/tournamentState";
	import { bustCache, openImagePopup } from "$lib/uiCommon";
	import type {
		PlayerListItem,
		PlayerRegistrationDetails,
		Tournament,
		TournamentRegistration,
	} from "$lib/types";

	let {
		open = $bindable(false),
		player1 = undefined,
		player2 = undefined,
		tournament = undefined,
		reg = undefined,
	}: {
		open?: boolean;
		player1?: PlayerListItem;
		player2?: PlayerListItem;
		tournament?: Tournament;
		reg?: TournamentRegistration | null;
	} = $props();

	// A team registration's two members are treated identically — either one is "the" registrant
	// for view/edit-permission purposes, same as either member being allowed to approve/cancel.
	let isOwnRegistration = $derived(
		!!$currentUser &&
			($currentUser.uid === player1?.uid || $currentUser.uid === player2?.uid),
	);
	let canViewSensitive = $derived($isAdmin || $isModerator || isOwnRegistration);
	let canViewHoyolab = $derived(
		canViewSensitive && !hasTournamentStarted(tournament?.state),
	);

	function close() {
		open = false;
	}
</script>

{#snippet screenshotBlock(label: string, url: string | null | undefined)}
	<div class="screenshot-block">
		<span class="screenshot-label">{label}</span>
		{#if url}
			<button class="screenshot-thumb" onclick={() => openImagePopup(url)}>
				<img
					src={bustCache(url)}
					alt=""
					onerror={(e) => {
						const btn = e.currentTarget.closest(".screenshot-thumb");
						if (btn) btn.outerHTML = '<div class="screenshot-placeholder">Не удалось загрузить</div>';
					}}
				/>
			</button>
		{:else}
			<div class="screenshot-placeholder">Нет скриншота</div>
		{/if}
	</div>
{/snippet}

{#snippet memberSection(
	key: string,
	label: string | null,
	discordUsername: string | null | undefined,
	details: PlayerRegistrationDetails | null | undefined,
)}
	{#if label}<h3 class="member-label">{label}</h3>{/if}
	<div class="spec-grid">
		<div class="spec">
			<span class="spec-label">Discord</span>
			<span class="spec-value">{discordUsername ?? "-"}</span>
		</div>
		{#if canViewSensitive}
			<div class="spec">
				<span class="spec-label">Игровой UID</span>
				<span class="spec-value">{details?.gameUid || "-"}</span>
			</div>
			<div class="spec">
				<span class="spec-label">Призовые</span>
				<span class="spec-value"
					>{details?.prizeAsMoney ? "Деньгами" : details?.prizeUid || "-"}</span
				>
			</div>
		{/if}
		<div class="spec">
			<span class="spec-label">Ник на Darte</span>
			<span class="spec-value">{details?.darteNickname || "-"}</span>
		</div>
		<div class="spec">
			<span class="spec-label">Пресет на Darte</span>
			<span class="spec-value">{details?.dartePresetName || "-"}</span>
		</div>
		<div class="spec">
			<span class="spec-label">Название ростера</span>
			<span class="spec-value">{details?.rosterName || "-"}</span>
		</div>
	</div>

	<div class="divider"></div>
	{@render screenshotBlock("Скриншот ростера", details?.rosterScreenshotUrl)}
	{#if canViewHoyolab}
		{@render screenshotBlock("Скриншот персонажей в Hoyolab", details?.hoyolabScreenshotUrl)}
	{/if}
{/snippet}

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="popup" onclick={close}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="card registration-card"
			class:team-card={reg?.player2}
			onclick={(e) => e.stopPropagation()}
		>
			<div class="close-row">
				<button class="icon-btn" onclick={close} aria-label="Закрыть">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			{#if reg?.player2}
				<h2 class="popup-title">Регистрация команды</h2>
				<div class="member-columns">
					<div class="member-column">
						{@render memberSection(
							"1",
							player1?.name ?? "Игрок 1",
							player1?.discordUsername,
							reg.player1,
						)}
					</div>
					<div class="member-column">
						{@render memberSection(
							"2",
							player2?.name ?? "Игрок 2",
							player2?.discordUsername,
							reg.player2,
						)}
					</div>
				</div>
			{:else}
				<h2 class="popup-title">Регистрация{player1?.name ? ` · ${player1.name}` : ""}</h2>
				{@render memberSection("1", null, player1?.discordUsername, reg?.player1)}
			{/if}
		</div>
	</div>
{/if}

<style>
	.registration-card {
		width: 440px;
		max-width: 90vw;
		padding: 16px 24px 24px;
		gap: 16px;
	}

	.team-card {
		width: 760px;
	}

	.close-row {
		display: flex;
		justify-content: flex-end;
		margin-bottom: -8px;
	}

	.popup-title {
		font-size: 18px;
		font-weight: 800;
		border: none;
		padding-bottom: 0;
		margin-bottom: 0;
	}

	.member-columns {
		display: flex;
		gap: 20px;
		width: 100%;
	}

	.member-column {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.member-label {
		font-size: 14px;
		font-weight: 700;
		color: var(--text);
	}

	.spec-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
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
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.divider {
		height: 1px;
		background: var(--border-soft);
	}

	.screenshot-block {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.screenshot-label {
		font-size: 12px;
		color: var(--text-dim);
		font-weight: 600;
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
		height: 70px;
		border-radius: var(--r-md);
		background: var(--bg-elevated);
		border: 1px dashed var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-dim);
		font-size: 11px;
	}
</style>
