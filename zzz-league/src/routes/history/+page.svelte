<script lang="ts">
	import HistoryList from "$lib/components/HistoryList.svelte";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import { backfillHistoryByPlayer } from "$lib/firebase";
	import { isAdmin } from "$lib/store";

	let backfilling = $state(false);

	async function handleBackfill() {
		backfilling = true;
		try {
			const { count } = await backfillHistoryByPlayer();
			alert(`Индекс истории по игрокам обновлён: ${count} записей.`);
		} catch (error) {
			alert(error);
		} finally {
			backfilling = false;
		}
	}
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		<h2>Вся история</h2>
		{#if $isAdmin}
			<button onclick={handleBackfill} disabled={backfilling}>
				{backfilling ? "Обновление..." : "Обновить индекс истории по игрокам"}
			</button>
		{/if}
		<HistoryList />
	</div>
</div>
