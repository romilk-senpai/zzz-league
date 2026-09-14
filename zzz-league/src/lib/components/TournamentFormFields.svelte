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

{#snippet checkbox(id: string, checked: boolean, label: string, onToggle: () => void)}
	<div class="check-row">
		<span class="cb-wrap">
			<input {id} type="checkbox" class="cb-input" {checked} onchange={onToggle} />
			{#if checked}
				<svg class="cb-check" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
			{/if}
		</span>
		<label for={id}>{label}</label>
	</div>
{/snippet}

<div class="form-section">
	<div class="section-label">Основное</div>
	<div class="form-grid name-row">
		<div class="form-group">
			<label for="f-name">Название</label>
			<input id="f-name" type="text" bind:value={name} placeholder="NESC: Season 3 High-mid 1" />
		</div>
		{#if editableTypeAndMode}
			<div class="form-group">
				<label for="f-registration-type">Тип регистрации</label>
				<select id="f-registration-type" bind:value={registrationType}>
					<option value="solo">1x1</option>
					<option value="team">2x2</option>
				</select>
			</div>
			<div class="form-group">
				<label for="f-game-mode">Режим игры</label>
				<select id="f-game-mode" bind:value={gameMode}>
					<option value="shiyu_defense">Shiyu Defense</option>
					<option value="deadly_assault">Deadly Assault</option>
				</select>
			</div>
		{/if}
	</div>
	<div class="form-group description-group">
		<label for="f-description">Описание</label>
		<textarea
			id="f-description"
			rows="3"
			placeholder="Markdown поддерживается…"
			bind:value={description}
		></textarea>
	</div>
	{#if description.trim()}
		<div class="form-group description-group">
			<label for="f-description-preview">Превью</label>
			<div id="f-description-preview" class="description-preview">{@html descriptionPreview}</div>
		</div>
	{/if}
</div>

<div class="form-section">
	<div class="section-label">Формат</div>
	<div class="form-grid">
		<div class="form-group">
			<label for="f-type">Тип турнира</label>
			<select id="f-type" bind:value={tournamentType}>
				<option value="single elimination">Single elimination</option>
				<option value="double elimination">Double elimination</option>
			</select>
		</div>
		{@render checkbox(
			"f-break-ties",
			breakTiesEnabled,
			"Break ties with placement matches",
			() => (breakTiesEnabled = !breakTiesEnabled),
		)}
		{#if breakTiesEnabled}
			<div class="form-group">
				<label for="f-break-ties-place">Break ties through this place</label>
				<input id="f-break-ties-place" type="number" min="1" bind:value={breakTiesPlace} />
			</div>
		{/if}

		{@render checkbox(
			"f-elo-enabled",
			overrideEloEnabled,
			"Фиксированное эло за победу/поражение",
			() => (overrideEloEnabled = !overrideEloEnabled),
		)}
		{#if overrideEloEnabled}
			<div class="form-group">
				<label for="f-elo-value">Значение эло</label>
				<input id="f-elo-value" type="number" min="1" bind:value={overrideEloValue} />
			</div>
		{/if}
	</div>
</div>

<div class="form-section">
	<div class="section-label">Требования к участникам</div>
	<div class="form-grid">
		<div class="form-group">
			<label for="f-min-tier">Мин. тир</label>
			<select id="f-min-tier" bind:value={minTier}>
				<option value="0">NEWBIE</option>
				<option value="100">MID TIER</option>
				<option value="1000">HIGH TIER</option>
			</select>
		</div>
		<div class="form-group">
			<label for="f-max-tier">Макс. тир</label>
			<select id="f-max-tier" bind:value={maxTier}>
				<option value="0">NEWBIE</option>
				<option value="100">MID TIER</option>
				<option value="1000">HIGH TIER</option>
			</select>
		</div>
		<div class="form-group">
			<label for="f-min-characters">Мин. персонажей</label>
			<input id="f-min-characters" type="number" bind:value={minCharacters} />
		</div>
		<div class="form-group">
			<label for="f-min-cost">Мин. кост</label>
			<input id="f-min-cost" type="number" bind:value={minCost} />
		</div>
		<div class="form-group">
			<label for="f-max-cost">Макс. кост</label>
			<input id="f-max-cost" type="number" bind:value={maxCost} />
		</div>
		{@render checkbox("f-visible", visible, "Публичный", () => (visible = !visible))}
	</div>
</div>

<div class="form-section">
	<div class="section-label">Discord</div>
	<div class="form-grid">
		<div class="form-group">
			<label for="f-discord-role">Роль</label>
			<input
				id="f-discord-role"
				type="text"
				bind:value={discordRoleName}
				placeholder="Название роли"
			/>
		</div>
		<div class="form-group">
			<label for="f-discord-channel">Канал</label>
			<input
				id="f-discord-channel"
				type="text"
				bind:value={discordChannelName}
				placeholder="Название канала"
			/>
		</div>
	</div>
</div>

<div class="form-section">
	<div class="section-label">Расписание</div>
	<div class="form-grid">
		<div class="form-group">
			<label for="f-reg-start">Начало регистрации</label>
			<input id="f-reg-start" type="datetime-local" bind:value={registrationStartDate} />
		</div>
		<div class="form-group">
			<label for="f-reg-end">Конец регистрации</label>
			<input id="f-reg-end" type="datetime-local" bind:value={registrationEndDate} />
		</div>
	</div>
	<div class="form-grid">
		<div class="form-group">
			<label for="f-tour-start">Начало турнира</label>
			<input id="f-tour-start" type="datetime-local" bind:value={tournamentStartDate} />
		</div>
		<div class="form-group">
			<label for="f-tour-end">Конец турнира</label>
			<input id="f-tour-end" type="datetime-local" bind:value={tournamentEndDate} />
		</div>
	</div>
</div>

<style>
	.form-section {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.section-label {
		font-size: 11px;
		font-weight: 700;
		color: var(--gold);
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border-soft);
		margin-bottom: 2px;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px 16px;
		max-width: 820px;
	}

	.name-row {
		grid-template-columns: 2fr 1fr 1fr;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.form-group label {
		font-size: 11.5px;
		color: var(--text-dim);
		font-weight: 600;
	}

	.description-group {
		max-width: 820px;
	}

	.check-row {
		display: flex;
		align-items: center;
		gap: 9px;
		align-self: end;
		height: 36px;
	}

	.check-row label {
		font-size: 12.5px;
		color: var(--text-muted);
		font-weight: 500;
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

	.description-preview {
		width: 100%;
		border: 1px dashed var(--border);
		border-radius: var(--r-md);
		padding: 10px 12px;
		color: var(--text-muted);
		background: var(--bg-elevated);
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
