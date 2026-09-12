<script lang="ts">
	import CommunityCostsTable from "$lib/components/CommunityCostsTable.svelte";
	import WeaponCostsTable from "$lib/components/WeaponCostsTable.svelte";
	import SidePanel from "$lib/components/SidePanel.svelte";

	let activeTab = $state<"agents" | "weapons">("agents");
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="content-column">
		<div class="top-tabs">
			<button
				class="top-tab"
				class:active={activeTab === "agents"}
				onclick={() => (activeTab = "agents")}
			>
				Персонажи
			</button>
			<button
				class="top-tab"
				class:active={activeTab === "weapons"}
				onclick={() => (activeTab = "weapons")}
			>
				W-Engines
			</button>
		</div>

		{#if activeTab === "agents"}
			<CommunityCostsTable />
		{:else}
			<WeaponCostsTable />
		{/if}
	</div>
</div>

<style>
	.content-column {
		display: flex;
		flex-direction: column;
	}

	.top-tabs {
		display: flex;
		gap: 8px;
		margin-bottom: 20px;
	}

	.top-tab {
		background: #222;
		border: 1px solid #333;
		color: #aaa;
		padding: 10px 20px;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 700;
		font-size: 15px;
		transition: 0.2s;
	}

	.top-tab:hover {
		border-color: #555;
		color: #ddd;
	}

	.top-tab.active {
		border-color: var(--gold);
		color: var(--gold);
		background: rgba(255, 204, 0, 0.08);
	}
</style>
