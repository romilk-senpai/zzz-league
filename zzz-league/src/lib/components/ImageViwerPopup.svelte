<script lang="ts">
	import { bustCache, closeImagePopup } from "$lib/uiCommon";
	import { _ } from "$lib/i18n";

	let { src = "", alt = "" } = $props();
	let loaded = $state(false);

	function close() {
		loaded = false;
		closeImagePopup();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="popup" onclick={close}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="image-popup-frame" onclick={(e) => e.stopPropagation()}>
		<button class="close-btn" onclick={close} aria-label={$_("common.close")}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
		</button>

		{#if !loaded}
			<div class="loader">
				<div class="spinner"></div>
			</div>
		{/if}

		<img
			src={bustCache(src)}
			{alt}
			class:hidden={!loaded}
			onload={() => (loaded = true)}
		/>
	</div>
</div>

<style>
	.popup {
		background: oklch(0.08 0.004 95 / 0.92);
	}

	.image-popup-frame {
		position: relative;
		max-width: 70vw;
		max-height: 70vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn {
		position: absolute;
		top: -14px;
		right: -14px;
		z-index: 2;
		width: 32px;
		height: 32px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--r-md);
		background: oklch(0.10 0.005 95 / 0.55);
		border: none;
		padding: 0;
		color: #fff;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.close-btn:hover {
		background: oklch(0.10 0.005 95 / 0.8);
	}

	img {
		max-width: 100%;
		max-height: 70vh;
		object-fit: contain;
		border-radius: var(--r-lg);
		border: 1px solid var(--border);
	}

	img.hidden {
		display: none;
	}

	.loader {
		width: 200px;
		height: 200px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #333;
		border-top-color: var(--gold);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
