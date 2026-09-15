<script lang="ts">
	import { API_BASE_URL } from "$lib/api";
	import { importAgentCostsCsv, importEngineCostsCsv } from "$lib/api/communityCosts";
	import CommunityCostsTable from "$lib/components/CommunityCostsTable.svelte";
	import WeaponCostsTable from "$lib/components/WeaponCostsTable.svelte";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import { refreshAgentCosts } from "$lib/costData";
	import { refreshContributions } from "$lib/contributions";
	import { isAdmin } from "$lib/store";
	import { refreshEngineCosts } from "$lib/weaponData";
	import { onMount } from "svelte";

	let activeTab = $state<"agents" | "weapons">("agents");
	let importing = $state(false);
	let importStatus = $state("");
	let agentFileInput = $state<HTMLInputElement | undefined>();
	let engineFileInput = $state<HTMLInputElement | undefined>();

	onMount(() => {
		refreshAgentCosts();
		refreshEngineCosts();
		refreshContributions();
	});

	async function handleImport(file: File | undefined, kind: "agents" | "engines") {
		if (!file || importing) return;
		importing = true;
		importStatus = "";
		try {
			const csv = await file.text();
			if (kind === "agents") {
				await importAgentCostsCsv(csv);
				await refreshAgentCosts();
			} else {
				await importEngineCostsCsv(csv);
				await refreshEngineCosts();
			}
			importStatus = "Импорт выполнен.";
		} catch (error: any) {
			importStatus = error.message;
		} finally {
			importing = false;
		}
	}
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

			<div class="csv-actions">
				{#if activeTab === "agents"}
					<a class="btn-common" href="{API_BASE_URL}/api/community-costs/agents/export.csv" download>
						Экспорт CSV
					</a>
					{#if $isAdmin}
						<button class="btn-common" disabled={importing} onclick={() => agentFileInput?.click()}>
							{importing ? "Импорт…" : "Импорт CSV"}
						</button>
						<input
							bind:this={agentFileInput}
							type="file"
							accept=".csv"
							hidden
							onchange={(e) => handleImport(e.currentTarget.files?.[0], "agents")}
						/>
					{/if}
				{:else}
					<a class="btn-common" href="{API_BASE_URL}/api/community-costs/engines/export.csv" download>
						Экспорт CSV
					</a>
					{#if $isAdmin}
						<button class="btn-common" disabled={importing} onclick={() => engineFileInput?.click()}>
							{importing ? "Импорт…" : "Импорт CSV"}
						</button>
						<input
							bind:this={engineFileInput}
							type="file"
							accept=".csv"
							hidden
							onchange={(e) => handleImport(e.currentTarget.files?.[0], "engines")}
						/>
					{/if}
				{/if}
			</div>
		</div>

		{#if importStatus}
			<p class="notice">{importStatus}</p>
		{/if}

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
		gap: 20px;
	}

	.top-tabs {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}

	.top-tab {
		background: var(--surface-2);
		border: 1px solid var(--border);
		color: var(--text-muted);
		padding: 9px 16px;
		border-radius: var(--r-md);
		cursor: pointer;
		font-weight: 700;
		font-size: 12px;
		font-family: inherit;
		transition: 0.15s;
	}

	.top-tab:hover {
		border-color: var(--border-soft);
		color: var(--text);
	}

	.top-tab.active {
		border-color: var(--gold-border);
		color: var(--gold);
		background: var(--gold-dim);
	}

	.csv-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-left: auto;
	}

	.csv-actions .btn-common {
		height: 32px;
		font-size: 12px;
		padding: 0 12px;
		width: auto;
	}
</style>
