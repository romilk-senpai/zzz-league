<script lang="ts">
	import CommunityCostsTable from "$lib/components/CommunityCostsTable.svelte";
	import SidePanel from "$lib/components/SidePanel.svelte";
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="content-column">
		<CommunityCostsTable />
	</div>
</div>

<style>
	.content-column {
		display: flex;
		flex-direction: column;
	}
</style>
