<script lang="ts">
	import { page } from "$app/state";
	import HistoryList from "$lib/components/HistoryList.svelte";
	import SidePanel from "$lib/components/SidePanel.svelte";

	const id = $derived(page.params.id);
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		<h2 class="page-title">Игры</h2>
		<HistoryList viewerId={id} />
	</div>
</div>

<style>
	.main-content {
		padding: 24px 28px;
		gap: 18px;
	}

	.page-title {
		font-size: 19px;
		padding-bottom: 16px;
	}
</style>
