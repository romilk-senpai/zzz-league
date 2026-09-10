<script lang="ts">
	import { currentUser, isAdmin } from "$lib/store";
	import { hasTournamentStarted } from "$lib/tournamentState";
	import { bustCache, openImagePopup } from "$lib/uiCommon";

	let {
		open = $bindable(false),
		player = undefined,
		tournament = undefined,
		reg = undefined,
	} = $props();

	let isOwnRegistration = $derived($currentUser?.uid === player?.uid);
	let canViewHoyolab = $derived(
		($isAdmin || isOwnRegistration) &&
			!hasTournamentStarted(tournament?.state),
	);
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="popup" onclick={() => (open = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="card" onclick={(e) => e.stopPropagation()}>
			<h2>Регистрация</h2>
			<p>Discord: {player?.discordUsername ?? "-"}</p>
			{#if $isAdmin || isOwnRegistration}
				<div class="form-row">
					<label for="reg-zzz-uid">Игровой UID</label>
					<input
						id="reg-zzz-uid"
						type="text"
						class="input-disabled"
						value={reg?.player1?.gameUid ?? ""}
						placeholder="Игровой UID"
						disabled
					/>
				</div>
				<div class="form-row">
					<label for="reg-prize-uid">UID для призовых</label>
					{#if reg?.player1?.prizeAsMoney}
						<p id="reg-prize-uid">Выбран призовой деньгами</p>
					{:else}
						<input
							id="reg-prize-uid"
							type="text"
							class="input-disabled"
							value={reg?.player1?.prizeUid ?? ""}
							placeholder="UID для призовых"
							disabled
						/>
					{/if}
				</div>
			{/if}
			<div class="form-row">
				<label for="reg-darte-nickname">Ник на Darte</label>
				<input
					id="reg-darte-nickname"
					class="input-disabled"
					type="text"
					value={reg?.player1?.darteNickname ?? ""}
					placeholder="Ник на Darte"
					disabled
				/>
			</div>
			<div class="form-row">
				<label for="reg-darte-account">Название пресета на Darte</label>
				<input
					id="reg-darte-account"
					class="input-disabled"
					type="text"
					value={reg?.player1?.dartePresetName ?? ""}
					placeholder="Название аккаунта на Darte"
					disabled
				/>
			</div>
			<div class="form-row">
				<label for="reg-darte-preset">Название пресета</label>
				<input
					id="reg-darte-preset"
					class="input-disabled"
					type="text"
					value={reg?.player1?.rosterName ?? ""}
					placeholder="Название пресета"
					disabled
				/>
			</div>
			<hr style="width: 100%" />
			<span>Скриншот ростера</span>
			{#if reg?.player1?.rosterScreenshotUrl}
				<button
					class="img-btn"
					onclick={() => openImagePopup(reg.player1.rosterScreenshotUrl)}
				>
					<img src={bustCache(reg.player1.rosterScreenshotUrl)} alt="" />
				</button>
			{/if}
			{#if canViewHoyolab}
				<hr style="width: 100%" />
				<span>Скриншот персонажей в Hoyolab</span>
				{#if reg?.player1?.hoyolabScreenshotUrl}
					<button
						class="img-btn"
						onclick={() => openImagePopup(reg.player1.hoyolabScreenshotUrl)}
					>
						<img src={bustCache(reg.player1.hoyolabScreenshotUrl)} alt="" />
					</button>
				{/if}
			{/if}

			<div class="btn-row">
				<button class="btn-common" onclick={() => (open = false)}
					>Закрыть</button
				>
			</div>
		</div>
	</div>
{/if}
