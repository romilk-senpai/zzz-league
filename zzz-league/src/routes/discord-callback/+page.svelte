<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { handleDiscordCallback } from "$lib/discord";
	import { _ } from "$lib/i18n";

	let error = $state(false);
	let errorText = $state("");

	onMount(() => {
		async function init() {
			try {
				await handleDiscordCallback();
				goto("/zzz-league");
			} catch (e: any) {
				error = true;
				errorText = e.message;
				setTimeout(function () {
					goto("/zzz-league");
				}, 3000);
			}
		}
		init();
	});
</script>

{#if error}
	<p class="error">{$_("pageDiscordCallback.errorLabel", { values: { error: errorText } })}</p>
	<p>{$_("pageDiscordCallback.redirecting")}</p>
{:else}
	<p>{$_("pageDiscordCallback.connecting")}</p>
{/if}
