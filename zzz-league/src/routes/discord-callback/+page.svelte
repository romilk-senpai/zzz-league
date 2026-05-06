<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { handleDiscordCallback } from "$lib/discord";

	onMount(() => {
		async function init() {
			await handleDiscordCallback();
			goto("/zzz-league");
		}
		init();
	});
</script>

<p>Подключение Discord...</p>
