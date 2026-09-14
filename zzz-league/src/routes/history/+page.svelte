<script lang="ts">
	import HistoryList from "$lib/components/HistoryList.svelte";
	import SidePanel from "$lib/components/SidePanel.svelte";
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		<h2 class="page-title">Вся история</h2>
		<HistoryList />
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
