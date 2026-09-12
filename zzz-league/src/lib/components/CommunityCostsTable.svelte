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
		contributionScore,
		contributions,
		type Contribution,
	} from "$lib/mockContributions";
	import ContributionMenu from "./ContributionMenu.svelte";
	import ContributionProposalPopup from "./ContributionProposalPopup.svelte";
	import ContributionReviewPopup from "./ContributionReviewPopup.svelte";

	let activeSpecialty = $state<Specialty>("attack");

	const activeInfo = $derived(specialties.find((s) => s.id === activeSpecialty)!);

	const rows = $derived(
		agentCosts
			.filter((a) => a.specialty === activeSpecialty)
			.map((a) => {
				const agentContribs = $contributions.filter((c) => c.agentId === a.agentId);
				const pending = agentContribs.filter((c) => c.status === "pending");
				const pendingScore = pending.length
					? Math.max(...pending.map((c) => contributionScore(c.reviews)))
					: null;
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
		const data = agentCosts.find((a) => a.agentId === agentId);
		const avatar = getAgentAvatar(agentId);
		return { name: data?.name ?? avatar?.name ?? agentId, avatarSrc: avatar?.src, costs: data?.costs ?? [] };
	}

	const pendingCountBySpecialty = $derived.by(() => {
		const counts: Partial<Record<Specialty, number>> = {};
		for (const c of $contributions) {
			if (c.status !== "pending") continue;
			const agent = agentCosts.find((a) => a.agentId === c.agentId);
			if (!agent) continue;
			counts[agent.specialty] = (counts[agent.specialty] ?? 0) + 1;
		}
		return counts;
	});

	const approvedLog = $derived(
		[...$contributions]
			.filter((c) => c.status === "approved")
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
	);

	const rejectedLog = $derived(
		[...$contributions]
			.filter((c) => c.status === "rejected")
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
	);

	let menuOpen = $state(false);
	let menuAgentId = $state("");
	let menuAgentName = $state("");
	let menuCosts = $state<number[]>([]);
	let menuItems = $state<Contribution[]>([]);

	let proposalOpen = $state(false);
	let proposalAgentId = $state("");
	let proposalAgentName = $state("");
	let proposalCosts = $state<number[]>([]);

	let reviewOpen = $state(false);
	let reviewAgentName = $state("");
	let reviewCosts = $state<number[]>([]);
	let selectedContributionId = $state<string | null>(null);

	const selectedContribution = $derived(
		$contributions.find((c) => c.id === selectedContributionId) ?? null,
	);

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

	function handleMenuSelect(c: Contribution) {
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

	function openLogEntry(c: Contribution) {
		const info = agentInfo(c.agentId);
		selectedContributionId = c.id;
		reviewAgentName = info.name;
		reviewCosts = info.costs;
		reviewOpen = true;
	}
</script>

<div class="card">
	<h2>Коммунити кост</h2>

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
								title="Есть предложение по изменению стоимости"
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
		<h2>❌ Отклонённые изменения</h2>
		{#if rejectedLog.length === 0}
			<p class="notice">Пока нет отклонённых предложений.</p>
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
		<h2>✅ Принятые изменения</h2>
		{#if approvedLog.length === 0}
			<p class="notice">Пока нет принятых предложений.</p>
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
	contribution={selectedContribution}
	agentName={reviewAgentName}
	currentCosts={reviewCosts}
/>

<style>
	.specialty-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.specialty-tab {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
		background: #222;
		border: 1px solid #333;
		color: #aaa;
		padding: 8px 14px;
		border-radius: 8px;
		cursor: pointer;
		transition: 0.2s;
	}

	.specialty-tab:hover {
		border-color: #555;
		color: #ddd;
	}

	.specialty-tab.active {
		border-color: var(--gold);
		color: var(--gold);
		background: rgba(255, 204, 0, 0.08);
	}

	.tab-badge {
		position: absolute;
		top: -7px;
		left: -7px;
		min-width: 18px;
		height: 18px;
		padding: 0 4px;
		border-radius: 9px;
		background: var(--loss);
		color: #fff;
		font-size: 11px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 0 0 2px #1a1a1a;
	}

	.specialty-heading {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--gold);
		text-shadow: 0 0 15px rgba(255, 204, 0, 0.3);
	}

	.specialty-heading h3 {
		margin: 0;
		font-size: 22px;
	}

	.cost-scroll {
		overflow-x: auto;
		overflow-y: hidden;
	}

	.cost-grid {
		display: flex;
		flex-direction: column;
		gap: 6px;
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
		font-size: 12px;
		font-weight: 600;
		color: #888;
	}

	.cost-agent {
		all: unset;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
		cursor: pointer;
		border-radius: 6px;
		padding: 4px;
		margin: -4px;
	}

	.cost-agent:hover {
		background: rgba(255, 255, 255, 0.05);
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
		font-size: 13px;
		line-height: 1;
		color: #fff;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.4);
	}

	.cost-avatar {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		object-fit: cover;
		flex-shrink: 0;
		border: 1px solid #333;
	}

	.cost-agent-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 600;
		font-size: 13px;
	}

	.cost-cell {
		text-align: center;
		padding: 10px 4px;
		border-radius: 6px;
		font-weight: 700;
		font-size: 14px;
	}

	.cost-cell.col-0 {
		background: #163a3d;
		color: #7fd8cf;
	}

	.cost-cell.col-1 {
		background: #163a52;
		color: #74c0e8;
	}

	.cost-cell.col-2 {
		background: #24325c;
		color: #93a6f2;
	}

	.cost-cell.col-3 {
		background: #3a2c63;
		color: #c2a4f5;
	}

	.cost-cell.col-4 {
		background: #55295c;
		color: #e2a0e0;
	}

	.cost-cell.col-5 {
		background: #742d4c;
		color: #f5a3b8;
	}

	.cost-cell.col-6 {
		background: #8f2a34;
		color: #ff9a92;
	}

	.cost-cell.empty {
		color: rgba(255, 255, 255, 0.3);
		filter: saturate(0.4) brightness(0.75);
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
		background: #222;
		border: 1px solid #333;
		border-radius: 8px;
		padding: 10px;
		cursor: pointer;
	}

	.log-item:hover {
		border-color: #555;
	}

	.log-avatar {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		object-fit: cover;
		flex-shrink: 0;
		border: 1px solid #333;
	}

	.log-body {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.log-title {
		font-weight: 600;
		font-size: 13px;
	}

	.log-msg {
		font-size: 12px;
		color: #aaa;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.log-columns {
		display: flex;
		gap: 20px;
	}

	.log-columns .log-card {
		flex: 1;
		min-width: 0;
	}

	@media (max-width: 700px) {
		.log-columns {
			flex-direction: column;
		}
	}
</style>
