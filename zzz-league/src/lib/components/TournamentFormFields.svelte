<script lang="ts">
	import type { TournamentGameMode, TournamentRegistrationKind } from "$lib/types";
	import { renderMarkdown } from "$lib/uiCommon";

	let {
		name = $bindable(),
		description = $bindable(),
		registrationType = $bindable(),
		gameMode = $bindable(),
		tournamentType = $bindable(),
		breakTiesEnabled = $bindable(),
		breakTiesPlace = $bindable(),
		overrideEloEnabled = $bindable(),
		overrideEloValue = $bindable(),
		minTier = $bindable(),
		maxTier = $bindable(),
		minCost = $bindable(),
		maxCost = $bindable(),
		minCharacters = $bindable(),
		discordRoleName = $bindable(),
		discordChannelName = $bindable(),
		visible = $bindable(),
		registrationStartDate = $bindable(),
		registrationEndDate = $bindable(),
		tournamentStartDate = $bindable(),
		tournamentEndDate = $bindable(),
		editableTypeAndMode = true,
	}: {
		name: string;
		description: string;
		registrationType: TournamentRegistrationKind;
		gameMode: TournamentGameMode;
		tournamentType: string;
		breakTiesEnabled: boolean;
		breakTiesPlace: number;
		overrideEloEnabled: boolean;
		overrideEloValue: number;
		minTier: string;
		maxTier: string;
		minCost: number;
		maxCost: number;
		minCharacters: number;
		discordRoleName: string;
		discordChannelName: string;
		visible: boolean;
		registrationStartDate: string;
		registrationEndDate: string;
		tournamentStartDate: string;
		tournamentEndDate: string;
		editableTypeAndMode?: boolean;
	} = $props();

	let descriptionPreview = $derived(renderMarkdown(description));
</script>

<div class="form-row-wide">
	<label for="f-name">Название</label>
	<input id="f-name" type="text" bind:value={name} />
</div>
{#if editableTypeAndMode}
	<div class="form-row-wide">
		<label for="f-registration-type">Тип регистрации</label>
		<select id="f-registration-type" bind:value={registrationType}>
			<option value="solo">1x1</option>
			<option value="team">2x2</option>
		</select>
	</div>
	<div class="form-row-wide">
		<label for="f-game-mode">Режим игры</label>
		<select id="f-game-mode" bind:value={gameMode}>
			<option value="shiyu_defense">Shiyu Defense</option>
			<option value="deadly_assault">Deadly Assault</option>
		</select>
	</div>
{/if}
<div class="form-row-wide">
	<label for="f-description">Описание</label>
	<textarea id="f-description" rows="4" bind:value={description}></textarea>
</div>
{#if description.trim()}
	<div class="form-row-wide preview-row">
		<span>Превью</span>
		<div class="description-preview">{@html descriptionPreview}</div>
	</div>
{/if}
<div class="form-row-wide">
	<label for="f-type">Тип турнира</label>
	<select id="f-type" bind:value={tournamentType}>
		<option value="single elimination">Single elimination</option>
		<option value="double elimination">Double elimination</option>
	</select>
</div>
<div class="form-row-wide">
	<label for="f-break-ties">Break ties with placement matches</label>
	<input id="f-break-ties" type="checkbox" bind:checked={breakTiesEnabled} />
</div>
{#if breakTiesEnabled}
	<div class="form-row-wide">
		<label for="f-break-ties-place">Break ties through this place</label>
		<input id="f-break-ties-place" type="number" min="1" bind:value={breakTiesPlace} />
	</div>
{/if}
<div class="form-row-wide">
	<label for="f-elo-enabled">Фиксированное эло за победу/поражение</label>
	<input id="f-elo-enabled" type="checkbox" bind:checked={overrideEloEnabled} />
</div>
{#if overrideEloEnabled}
	<div class="form-row-wide">
		<label for="f-elo-value">Значение эло</label>
		<input id="f-elo-value" type="number" min="1" bind:value={overrideEloValue} />
	</div>
{/if}
<div class="form-row-wide">
	<label for="f-min-tier">Мин. тир игроков</label>
	<select id="f-min-tier" bind:value={minTier}>
		<option value="0">NEWBIE</option>
		<option value="100">MID TIER</option>
		<option value="1000">HIGH TIER</option>
	</select>
</div>
<div class="form-row-wide">
	<label for="f-max-tier">Макс. тир игроков</label>
	<select id="f-max-tier" bind:value={maxTier}>
		<option value="0">NEWBIE</option>
		<option value="100">MID TIER</option>
		<option value="1000">HIGH TIER</option>
	</select>
</div>
<div class="form-row-wide">
	<label for="f-min-cost">Мин. кост</label>
	<input id="f-min-cost" type="number" bind:value={minCost} />
</div>
<div class="form-row-wide">
	<label for="f-max-cost">Макс. кост</label>
	<input id="f-max-cost" type="number" bind:value={maxCost} />
</div>
<div class="form-row-wide">
	<label for="f-min-characters">Мин. персонажей</label>
	<input id="f-min-characters" type="number" bind:value={minCharacters} />
</div>
<div class="form-row-wide">
	<label for="f-discord-role">Называние дискорд роли</label>
	<input
		id="f-discord-role"
		type="text"
		bind:value={discordRoleName}
		placeholder="Название роли"
	/>
</div>
<div class="form-row-wide">
	<label for="f-discord-channel">Название дискорд канала</label>
	<input
		id="f-discord-channel"
		type="text"
		bind:value={discordChannelName}
		placeholder="Название канала"
	/>
</div>
<div class="form-row-wide">
	<label for="f-visible">Публичный</label>
	<input id="f-visible" type="checkbox" bind:checked={visible} />
</div>

<hr style="width: 100%" />

<div class="form-row-wide">
	<label for="f-reg-start">Начало регистрации</label>
	<input id="f-reg-start" type="datetime-local" bind:value={registrationStartDate} />
</div>
<div class="form-row-wide">
	<label for="f-reg-end">Конец регистрации</label>
	<input id="f-reg-end" type="datetime-local" bind:value={registrationEndDate} />
</div>

<hr style="width: 100%" />

<div class="form-row-wide">
	<label for="f-tour-start">Начало турнира</label>
	<input id="f-tour-start" type="datetime-local" bind:value={tournamentStartDate} />
</div>
<div class="form-row-wide">
	<label for="f-tour-end">Конец турнира</label>
	<input id="f-tour-end" type="datetime-local" bind:value={tournamentEndDate} />
</div>

<style>
	.preview-row {
		align-items: flex-start;
	}

	.preview-row span {
		flex: 0 0 200px;
		color: #888;
	}

	.description-preview {
		width: 100%;
		border: 1px dashed #444;
		border-radius: 8px;
		padding: 8px 10px;
		color: #ccc;
	}

	.description-preview :global(a) {
		color: var(--gold);
		text-decoration: underline;
	}

	.description-preview :global(p) {
		margin: 0;
		line-height: 21px;
	}
</style>
