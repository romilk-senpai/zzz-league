<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { handleDiscordCallback } from "$lib/discord";

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
				}, 2000);
			}
		}
		init();
	});
</script>

{#if error}
	<p class="error">Ошибка {errorText}</p>
	<p>Возврат на главую страницу...</p>
{:else}
	<p>Подключение Discord...</p>
{/if}
