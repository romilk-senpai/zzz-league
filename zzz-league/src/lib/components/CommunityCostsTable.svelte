<script lang="ts">
	import { getAgentAvatar } from "$lib/agentAvatars";
	import {
		agentCosts,
		mindscapeLabels,
		specialties,
		type Specialty,
	} from "$lib/costData";
	import {
		contributionColor,
		contributions,
		type ContributionListItem,
	} from "$lib/contributions";
	import ContributionMenu from "./ContributionMenu.svelte";
	import ContributionProposalPopup from "./ContributionProposalPopup.svelte";
	import ContributionReviewPopup from "./ContributionReviewPopup.svelte";
	import { _ } from "$lib/i18n";

	let activeSpecialty = $state<Specialty>("attack");

	const activeInfo = $derived(specialties.find((s) => s.id === activeSpecialty)!);

	const rows = $derived(
		$agentCosts
			.filter((a) => a.specialty === activeSpecialty)
			.map((a) => {
				const agentContribs = $contributions.filter((c) => c.agentId === a.agentId);
				const pending = agentContribs.filter((c) => c.status === "pending");
				const pendingScore = pending.length ? Math.max(...pending.map((c) => c.score)) : null;
				return {
					...a,
					avatar: getAgentAvatar(a.agentId),
					name: a.name ?? getAgentAvatar(a.agentId)?.name,
					contribs: agentContribs,
					pendingScore,
				};
			})
			.filter((a) => a.avatar)
			.sort((a, b) => b.rarity - a.rarity || b.costs[0] - a.costs[0]),
	);

	function agentInfo(agentId: string) {
		const data = $agentCosts.find((a) => a.agentId === agentId);
		const avatar = getAgentAvatar(agentId);
		return { name: data?.name ?? avatar?.name ?? agentId, avatarSrc: avatar?.src, costs: data?.costs ?? [] };
	}

	const pendingCountBySpecialty = $derived.by(() => {
		const counts: Partial<Record<Specialty, number>> = {};
		for (const c of $contributions) {
			if (c.status !== "pending" || !c.agentId) continue;
			const agent = $agentCosts.find((a) => a.agentId === c.agentId);
			if (!agent) continue;
			counts[agent.specialty] = (counts[agent.specialty] ?? 0) + 1;
		}
		return counts;
	});

	const approvedLog = $derived(
		[...$contributions]
			.filter((c): c is ContributionListItem & { agentId: string } => !!c.agentId && c.status === "approved")
			.sort((a, b) => b.createdAt - a.createdAt),
	);

	const rejectedLog = $derived(
		[...$contributions]
			.filter((c): c is ContributionListItem & { agentId: string } => !!c.agentId && c.status === "rejected")
			.sort((a, b) => b.createdAt - a.createdAt),
	);

	let menuOpen = $state(false);
	let menuAgentId = $state("");
	let menuAgentName = $state("");
	let menuCosts = $state<number[]>([]);
	let menuItems = $state<ContributionListItem[]>([]);

	let proposalOpen = $state(false);
	let proposalAgentId = $state("");
	let proposalAgentName = $state("");
	let proposalCosts = $state<number[]>([]);

	let reviewOpen = $state(false);
	let reviewAgentName = $state("");
	let reviewCosts = $state<number[]>([]);
	let selectedContributionId = $state<string | null>(null);

	function openFlow(row: (typeof rows)[number]) {
		if (row.contribs.length === 0) {
			proposalAgentId = row.agentId;
			proposalAgentName = row.name ?? "";
			proposalCosts = [...row.costs];
			proposalOpen = true;
			return;
		}
		menuAgentId = row.agentId;
		menuAgentName = row.name ?? "";
		menuCosts = row.costs;
		menuItems = row.contribs;
		menuOpen = true;
	}

	function handleMenuSelect(c: ContributionListItem) {
		menuOpen = false;
		selectedContributionId = c.id;
		reviewAgentName = menuAgentName;
		reviewCosts = menuCosts;
		reviewOpen = true;
	}

	function handleMenuPropose() {
		menuOpen = false;
		proposalAgentId = menuAgentId;
		proposalAgentName = menuAgentName;
		proposalCosts = [...menuCosts];
		proposalOpen = true;
	}

	function openLogEntry(c: ContributionListItem) {
		if (!c.agentId) return;
		const info = agentInfo(c.agentId);
		selectedContributionId = c.id;
		reviewAgentName = info.name;
		reviewCosts = info.costs;
		reviewOpen = true;
	}
</script>

<div class="card cost-card">
	<h2>{$_("communityCostsTable.title")}</h2>

	<div class="specialty-tabs">
		{#each specialties as s (s.id)}
			<button
				class="specialty-tab"
				class:active={activeSpecialty === s.id}
				onclick={() => (activeSpecialty = s.id)}
			>
				{#if pendingCountBySpecialty[s.id]}
					<span class="tab-badge">{pendingCountBySpecialty[s.id]}</span>
				{/if}
				{s.label}
			</button>
		{/each}
	</div>

	<div class="specialty-heading">
		<h3>{activeInfo.label}</h3>
	</div>

	<div class="cost-scroll">
		<div class="cost-grid">
			<div class="cost-header-row">
				<div class="cost-name-col"></div>
				{#each mindscapeLabels as m (m)}
					<div class="cost-col-label">{m}</div>
				{/each}
			</div>

			{#each rows as row (row.agentId)}
				<div class="cost-row">
					<button type="button" class="cost-agent" onclick={() => openFlow(row)}>
						<img class="cost-avatar" src={row.avatar!.src} alt="" />
						<span class="cost-agent-name">{row.name}</span>
						{#if row.pendingScore !== null}
							<span
								class="contrib-alert"
								style="background:{contributionColor(row.pendingScore)}"
								title={$_("communityCostsTable.pendingChangeTooltip")}
							>!</span>
						{/if}
					</button>
					{#each row.costs as value, i (i)}
						<div class="cost-cell col-{i}" class:empty={value >= 9999}>
							{value}
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>

<div class="log-columns">
	<div class="card log-card">
		<h2 class="log-heading rejected">{$_("communityCostsTable.rejectedHeading")}</h2>
		{#if rejectedLog.length === 0}
			<p class="notice">{$_("communityCostsTable.noRejected")}</p>
		{:else}
			<div class="log-list">
				{#each rejectedLog as c (c.id)}
					{@const info = agentInfo(c.agentId)}
					<button type="button" class="log-item" onclick={() => openLogEntry(c)}>
						<img class="log-avatar" src={info.avatarSrc} alt="" />
						<span class="log-body">
							<span class="log-title">{info.name} — {c.authorName}</span>
							<span class="log-msg">{c.message}</span>
						</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<div class="card log-card">
		<h2 class="log-heading approved">{$_("communityCostsTable.approvedHeading")}</h2>
		{#if approvedLog.length === 0}
			<p class="notice">{$_("communityCostsTable.noApproved")}</p>
		{:else}
			<div class="log-list">
				{#each approvedLog as c (c.id)}
					{@const info = agentInfo(c.agentId)}
					<button type="button" class="log-item" onclick={() => openLogEntry(c)}>
						<img class="log-avatar" src={info.avatarSrc} alt="" />
						<span class="log-body">
							<span class="log-title">{info.name} — {c.authorName}</span>
							<span class="log-msg">{c.message}</span>
						</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<ContributionMenu
	bind:open={menuOpen}
	agentName={menuAgentName}
	items={menuItems}
	onSelect={handleMenuSelect}
	onPropose={handleMenuPropose}
/>

<ContributionProposalPopup
	bind:open={proposalOpen}
	agentId={proposalAgentId}
	agentName={proposalAgentName}
	currentCosts={proposalCosts}
/>

<ContributionReviewPopup
	bind:open={reviewOpen}
	contributionId={selectedContributionId}
	agentName={reviewAgentName}
	currentCosts={reviewCosts}
/>

<style>
	.cost-card {
		padding: 24px 28px;
		gap: 16px;
	}

	.specialty-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.specialty-tab {
		position: relative;
		display: flex;
		align-items: center;
		gap: 6px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		color: var(--text-muted);
		padding: 6px 13px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: 0.15s;
	}

	.specialty-tab:hover {
		border-color: var(--border-soft);
		color: var(--text);
	}

	.specialty-tab.active {
		border-color: var(--gold-border);
		color: var(--gold);
		background: var(--gold-dim);
		font-weight: 700;
	}

	.tab-badge {
		position: absolute;
		top: -7px;
		left: -7px;
		min-width: 18px;
		height: 18px;
		padding: 0 4px;
		border-radius: 9px;
		background: var(--danger);
		color: #fff;
		font-size: 11px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 0 0 2px var(--surface);
	}

	.specialty-heading {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.specialty-heading h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
		color: var(--gold);
	}

	.cost-scroll {
		overflow-x: auto;
		overflow-y: hidden;
	}

	.cost-grid {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 720px;
	}

	.cost-header-row,
	.cost-row {
		display: grid;
		grid-template-columns: minmax(160px, 220px) repeat(7, minmax(64px, 1fr));
		gap: 8px;
		align-items: center;
	}

	.cost-header-row {
		padding: 0 2px 4px;
	}

	.cost-col-label {
		text-align: center;
		font-size: 11px;
		font-weight: 700;
		color: var(--text-dim);
	}

	.cost-agent {
		all: unset;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
		cursor: pointer;
		border-radius: var(--r-sm);
		padding: 4px;
		margin: -4px;
	}

	.cost-agent:hover {
		background: var(--surface-hover);
	}

	.contrib-alert {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 900;
		font-size: 14px;
		line-height: 1;
		color: #fff;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.4);
	}

	.cost-avatar {
		width: 36px;
		height: 36px;
		border-radius: var(--r-sm);
		object-fit: cover;
		flex-shrink: 0;
		border: 1px solid var(--border);
	}

	.cost-agent-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 600;
		font-size: 14px;
	}

	.cost-cell {
		text-align: center;
		padding: 9px 4px;
		border-radius: var(--r-sm);
		font-weight: 700;
		font-size: 14px;
	}

	.cost-cell.col-0 {
		background: oklch(0.32 0.06 190);
		color: oklch(0.8 0.1 190);
	}

	.cost-cell.col-1 {
		background: oklch(0.32 0.06 220);
		color: oklch(0.8 0.1 220);
	}

	.cost-cell.col-2 {
		background: oklch(0.32 0.06 250);
		color: oklch(0.8 0.1 250);
	}

	.cost-cell.col-3 {
		background: oklch(0.32 0.06 280);
		color: oklch(0.8 0.1 280);
	}

	.cost-cell.col-4 {
		background: oklch(0.32 0.06 320);
		color: oklch(0.8 0.1 320);
	}

	.cost-cell.col-5 {
		background: oklch(0.32 0.06 350);
		color: oklch(0.8 0.1 350);
	}

	.cost-cell.col-6 {
		background: oklch(0.32 0.06 20);
		color: oklch(0.8 0.1 20);
	}

	.cost-cell.empty {
		background: var(--surface-hover);
		color: var(--text-dim);
	}

	.log-heading {
		border: none;
		padding-bottom: 0;
		margin-bottom: 0;
		font-size: 14px;
	}

	.log-heading.rejected {
		color: var(--danger);
	}

	.log-heading.approved {
		color: var(--success);
	}

	.log-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	}

	.log-item {
		all: unset;
		box-sizing: border-box;
		display: flex;
		gap: 10px;
		align-items: center;
		width: 100%;
		min-width: 0;
		background: var(--surface-2);
		border: 1px solid var(--border-soft);
		border-radius: var(--r-md);
		padding: 9px 11px;
		cursor: pointer;
		transition: border-color 0.15s;
	}

	.log-item:hover {
		border-color: var(--gold-border);
	}

	.log-avatar {
		width: 32px;
		height: 32px;
		border-radius: var(--r-sm);
		object-fit: cover;
		flex-shrink: 0;
		border: 1px solid var(--border);
	}

	.log-body {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.log-title {
		font-weight: 600;
		font-size: 12px;
	}

	.log-msg {
		font-size: 12px;
		color: var(--text-dim);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.log-columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 18px;
	}

	.log-columns .log-card {
		min-width: 0;
		padding: 20px;
		gap: 10px;
	}

	@media (max-width: 700px) {
		.log-columns {
			grid-template-columns: 1fr;
		}
	}
</style>
