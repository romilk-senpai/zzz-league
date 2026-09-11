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
</script>

{#snippet memberSection(
	key: string,
	label: string | null,
	discordUsername: string | null | undefined,
	details: PlayerRegistrationDetails | null | undefined,
)}
	{#if label}<h3>{label}</h3>{/if}
	<p>Discord: {discordUsername ?? "-"}</p>
	{#if canViewSensitive}
		<div class="form-row">
			<label for="reg-zzz-uid-{key}">Игровой UID</label>
			<input
				id="reg-zzz-uid-{key}"
				type="text"
				class="input-disabled"
				value={details?.gameUid ?? ""}
				placeholder="Игровой UID"
				disabled
			/>
		</div>
		<div class="form-row">
			<label for="reg-prize-uid-{key}">UID для призовых</label>
			{#if details?.prizeAsMoney}
				<p id="reg-prize-uid-{key}">Выбран призовой деньгами</p>
			{:else}
				<input
					id="reg-prize-uid-{key}"
					type="text"
					class="input-disabled"
					value={details?.prizeUid ?? ""}
					placeholder="UID для призовых"
					disabled
				/>
			{/if}
		</div>
	{/if}
	<div class="form-row">
		<label for="reg-darte-nickname-{key}">Ник на Darte</label>
		<input
			id="reg-darte-nickname-{key}"
			class="input-disabled"
			type="text"
			value={details?.darteNickname ?? ""}
			placeholder="Ник на Darte"
			disabled
		/>
	</div>
	<div class="form-row">
		<label for="reg-darte-account-{key}">Название пресета на Darte</label>
		<input
			id="reg-darte-account-{key}"
			class="input-disabled"
			type="text"
			value={details?.dartePresetName ?? ""}
			placeholder="Название аккаунта на Darte"
			disabled
		/>
	</div>
	<div class="form-row">
		<label for="reg-darte-preset-{key}">Название пресета</label>
		<input
			id="reg-darte-preset-{key}"
			class="input-disabled"
			type="text"
			value={details?.rosterName ?? ""}
			placeholder="Название пресета"
			disabled
		/>
	</div>
	<hr style="width: 100%" />
	<span>Скриншот ростера</span>
	{#if details?.rosterScreenshotUrl}
		<button
			class="img-btn"
			onclick={() => openImagePopup(details.rosterScreenshotUrl!)}
		>
			<img src={bustCache(details.rosterScreenshotUrl)} alt="" />
		</button>
	{/if}
	{#if canViewHoyolab}
		<hr style="width: 100%" />
		<span>Скриншот персонажей в Hoyolab</span>
		{#if details?.hoyolabScreenshotUrl}
			<button
				class="img-btn"
				onclick={() => openImagePopup(details.hoyolabScreenshotUrl!)}
			>
				<img src={bustCache(details.hoyolabScreenshotUrl)} alt="" />
			</button>
		{/if}
	{/if}
{/snippet}

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="popup" onclick={() => (open = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="card" class:team-card={reg?.player2} onclick={(e) => e.stopPropagation()}>
			<h2>Регистрация</h2>
			{#if reg?.player2}
				<div class="member-columns">
					<div class="member-column">
						{@render memberSection("1", "Игрок 1", player1?.discordUsername, reg.player1)}
					</div>
					<div class="member-column">
						{@render memberSection("2", "Игрок 2", player2?.discordUsername, reg.player2)}
					</div>
				</div>
			{:else}
				{@render memberSection("1", null, player1?.discordUsername, reg?.player1)}
			{/if}

			<div class="btn-row">
				<button class="btn-common" onclick={() => (open = false)}
					>Закрыть</button
				>
			</div>
		</div>
	</div>
{/if}

<style>
	.team-card {
		width: 640px;
		max-width: 90vw;
	}

	.member-columns {
		display: flex;
		gap: 16px;
		width: 100%;
	}

	.member-column {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
</style>
