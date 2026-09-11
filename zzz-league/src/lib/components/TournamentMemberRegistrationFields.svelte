<script lang="ts">
	import { useObjectUrlPreview } from "$lib/imagePreview.svelte.js";
	import type { MemberRegistrationForm } from "$lib/tournamentRegistrationForm";
	import { bustCache, openImagePopup, pasteImageFromClipboard } from "$lib/uiCommon";

	let {
		idPrefix,
		label = null,
		form,
	}: {
		idPrefix: string;
		label?: string | null;
		form: MemberRegistrationForm;
	} = $props();

	let rosterPreview = useObjectUrlPreview(() => form.rosterScreenshot?.[0]);
	let hoyolabPreview = useObjectUrlPreview(() => form.hoyolabScreenshot?.[0]);

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

{#if label}<h3>{label}</h3>{/if}
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
	<input
		id="{idPrefix}-darte-account"
		type="text"
		bind:value={form.darteAccount}
		placeholder="Название пресета на Darte"
	/>
</div>
<div class="form-row-wide">
	<label for="{idPrefix}-darte-preset">Название ростера</label>
	<input id="{idPrefix}-darte-preset" type="text" bind:value={form.dartePreset} placeholder="Название ростера" />
</div>

<div class="form-row-wide">
	<label for="{idPrefix}-roster-screenshot">Скриншот ростера</label>
	<input id="{idPrefix}-roster-screenshot" type="file" accept="image/*" bind:files={form.rosterScreenshot} />
	<button type="button" class="btn-common paste-btn" onclick={() => handlePasteScreenshot("roster")}
		>Вставить из буфера</button
	>
</div>
{#if form.existingRosterUrl}
	<button class="img-btn" onclick={() => openImagePopup(form.existingRosterUrl)}>
		<img src={bustCache(form.existingRosterUrl)} alt="" />
	</button>
	<p class="notice">Оставьте пустым, чтобы не менять скриншот</p>
{/if}
{#if rosterPreview.url}
	<button class="img-btn" onclick={() => openImagePopup(rosterPreview.url!)}>
		<img src={rosterPreview.url} alt="" />
	</button>
{/if}

<div class="form-row-wide">
	<label for="{idPrefix}-hoyolab-screenshot">Скриншот персонажей в Hoyolab</label>
	<input id="{idPrefix}-hoyolab-screenshot" type="file" accept="image/*" bind:files={form.hoyolabScreenshot} />
	<button type="button" class="btn-common paste-btn" onclick={() => handlePasteScreenshot("hoyolab")}
		>Вставить из буфера</button
	>
</div>
{#if form.existingHoyolabUrl}
	<button class="img-btn" onclick={() => openImagePopup(form.existingHoyolabUrl)}>
		<img src={bustCache(form.existingHoyolabUrl)} alt="" />
	</button>
	<p class="notice">Оставьте пустым, чтобы не менять скриншот</p>
{/if}
{#if hoyolabPreview.url}
	<button class="img-btn" onclick={() => openImagePopup(hoyolabPreview.url!)}>
		<img src={hoyolabPreview.url} alt="" />
	</button>
{/if}
