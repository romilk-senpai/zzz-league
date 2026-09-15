<script lang="ts">
	import { useObjectUrlPreview } from "$lib/imagePreview.svelte.js";
	import type { MemberRegistrationForm } from "$lib/tournamentRegistrationForm";
	import { bustCache, openImagePopup, pasteImageFromClipboard } from "$lib/uiCommon";

	let {
		idPrefix,
		label = null,
		form,
		showErrors = false,
	}: {
		idPrefix: string;
		label?: string | null;
		form: MemberRegistrationForm;
		showErrors?: boolean;
	} = $props();

	let hasRoster = $derived(!!form.rosterScreenshot?.length || !!form.existingRosterUrl);
	let hasHoyolab = $derived(!!form.hoyolabScreenshot?.length || !!form.existingHoyolabUrl);

	let rosterPreview = useObjectUrlPreview(() => form.rosterScreenshot?.[0]);
	let hoyolabPreview = useObjectUrlPreview(() => form.hoyolabScreenshot?.[0]);

	// Native file inputs are visually hidden — the "Выбрать файл" buttons trigger them
	// programmatically so they can be styled like the rest of the design system.
	let rosterFileInput: HTMLInputElement | undefined = $state();
	let hoyolabFileInput: HTMLInputElement | undefined = $state();

	async function handlePasteScreenshot(target: "roster" | "hoyolab") {
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
</script>

{#if label}<h3 class="member-label">{label}</h3>{/if}

<div class="form-grid">
	<div class="form-group">
		<label for="{idPrefix}-zzz-uid">Игровой UID</label>
		<input
			id="{idPrefix}-zzz-uid"
			type="text"
			class:invalid={showErrors && !form.gameUid}
			bind:value={form.gameUid}
			placeholder="Игровой UID"
		/>
	</div>
	<div class="form-group toggle-field">
		<div class="check-row">
			<span class="cb-wrap">
				<input
					id="{idPrefix}-prize-as-money"
					type="checkbox"
					class="cb-input"
					bind:checked={form.prizeAsMoney}
				/>
				{#if form.prizeAsMoney}
					<svg class="cb-check" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
				{/if}
			</span>
			<label for="{idPrefix}-prize-as-money">Взять призовые деньгами</label>
		</div>
		<input
			id="{idPrefix}-prize-uid"
			type="text"
			class:input-disabled={form.prizeAsMoney}
			class:invalid={showErrors && !form.prizeAsMoney && !form.prizeUid}
			bind:value={form.prizeUid}
			disabled={form.prizeAsMoney}
			placeholder={form.prizeAsMoney ? "Не требуется" : "UID для призовых"}
		/>
	</div>
	<div class="form-group">
		<label for="{idPrefix}-darte-nickname">Ник на Darte</label>
		<input
			id="{idPrefix}-darte-nickname"
			type="text"
			class:invalid={showErrors && !form.darteNickname}
			bind:value={form.darteNickname}
			placeholder="Ник на Darte"
		/>
	</div>
	<div class="form-group">
		<label for="{idPrefix}-darte-account">Название пресета на Darte</label>
		<input
			id="{idPrefix}-darte-account"
			type="text"
			class:invalid={showErrors && !form.darteAccount}
			bind:value={form.darteAccount}
			placeholder="Название пресета на Darte"
		/>
	</div>
	<div class="form-group">
		<label for="{idPrefix}-darte-preset">Название ростера</label>
		<input
			id="{idPrefix}-darte-preset"
			type="text"
			class:invalid={showErrors && !form.dartePreset}
			bind:value={form.dartePreset}
			placeholder="Название ростера"
		/>
	</div>
</div>

<div class="upload-grid">
	<div class="upload-card" class:invalid={showErrors && !hasRoster}>
		<div class="upload-card-label">Скриншот ростера</div>
		{#if rosterPreview.url}
			<button type="button" class="thumb has-image" onclick={() => openImagePopup(rosterPreview.url!)}>
				<img src={rosterPreview.url} alt="" />
			</button>
		{:else if form.existingRosterUrl}
			<button
				type="button"
				class="thumb has-image"
				onclick={() => openImagePopup(form.existingRosterUrl)}
			>
				<img src={bustCache(form.existingRosterUrl)} alt="" />
			</button>
		{:else}
			<div class="thumb">Превью скриншота</div>
		{/if}
		<input
			bind:this={rosterFileInput}
			class="hidden-file-input"
			type="file"
			accept="image/*"
			bind:files={form.rosterScreenshot}
		/>
		<div class="upload-box">
			<button type="button" class="btn-common upload-btn" onclick={() => rosterFileInput?.click()}
				>Выбрать файл</button
			>
			<button
				type="button"
				class="btn-common upload-btn"
				onclick={() => handlePasteScreenshot("roster")}>Вставить</button
			>
		</div>
		{#if form.existingRosterUrl && !rosterPreview.url}
			<p class="upload-hint">Оставьте пустым, чтобы не менять скриншот</p>
		{/if}
	</div>

	<div class="upload-card" class:invalid={showErrors && !hasHoyolab}>
		<div class="upload-card-label">Скриншот персонажей в Hoyolab</div>
		{#if hoyolabPreview.url}
			<button type="button" class="thumb has-image" onclick={() => openImagePopup(hoyolabPreview.url!)}>
				<img src={hoyolabPreview.url} alt="" />
			</button>
		{:else if form.existingHoyolabUrl}
			<button
				type="button"
				class="thumb has-image"
				onclick={() => openImagePopup(form.existingHoyolabUrl)}
			>
				<img src={bustCache(form.existingHoyolabUrl)} alt="" />
			</button>
		{:else}
			<div class="thumb">Превью скриншота</div>
		{/if}
		<input
			bind:this={hoyolabFileInput}
			class="hidden-file-input"
			type="file"
			accept="image/*"
			bind:files={form.hoyolabScreenshot}
		/>
		<div class="upload-box">
			<button type="button" class="btn-common upload-btn" onclick={() => hoyolabFileInput?.click()}
				>Выбрать файл</button
			>
			<button
				type="button"
				class="btn-common upload-btn"
				onclick={() => handlePasteScreenshot("hoyolab")}>Вставить</button
			>
		</div>
		{#if form.existingHoyolabUrl && !hoyolabPreview.url}
			<p class="upload-hint">Оставьте пустым, чтобы не менять скриншот</p>
		{/if}
	</div>
</div>

<style>
	.member-label {
		font-size: 14px;
		font-weight: 700;
		color: var(--gold);
		margin: 0;
	}

	.check-row {
		display: flex;
		align-items: center;
		gap: 9px;
	}

	.check-row label {
		font-size: 12px;
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

	.form-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px 16px;
		max-width: 760px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.form-group label {
		font-size: 12px;
		color: var(--text-dim);
		font-weight: 600;
	}

	.toggle-field .check-row label {
		color: var(--text-dim);
		font-weight: 600;
		white-space: nowrap;
	}

	.upload-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		max-width: 760px;
	}

	.upload-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--r-md);
	}

	.upload-card.invalid {
		border-color: var(--danger);
	}

	.form-group input.invalid {
		border-color: var(--danger);
	}

	.upload-card-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted);
	}

	.thumb {
		width: 100%;
		height: 64px;
		border-radius: var(--r-sm);
		background: var(--surface-2);
		border: 1px dashed var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-dim);
		font-size: 11px;
		text-align: center;
		padding: 0;
		font-family: inherit;
	}

	.thumb.has-image {
		height: auto;
		border-style: solid;
		overflow: hidden;
		cursor: pointer;
	}

	.thumb.has-image img {
		display: block;
		width: 100%;
		max-height: 220px;
		object-fit: contain;
	}

	.hidden-file-input {
		display: none;
	}

	.upload-box {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.upload-btn {
		flex: 1;
		height: 32px;
		font-size: 12px;
		padding: 0 12px;
	}

	.upload-hint {
		font-size: 11px;
		color: var(--text-dim);
		margin: 0;
	}
</style>
