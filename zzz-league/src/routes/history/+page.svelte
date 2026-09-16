<script lang="ts">
	import HistoryList from "$lib/components/HistoryList.svelte";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import { _ } from "$lib/i18n";
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		<h2 class="page-title">{$_("pageHistory.title")}</h2>
		<HistoryList />
	</div>
</div>

<style>
	.main-content {
		padding: 24px 28px;
		gap: 18px;
	}

	.page-title {
		font-size: 20px;
		padding-bottom: 16px;
		/* border-box min-height includes the padding-bottom/border below, so this is
		   32px (the shared control-row height) + 16px + 1px border, to match teams pages'
		   header row exactly */
		min-height: 49px;
		display: flex;
		align-items: center;
	}
</style>
