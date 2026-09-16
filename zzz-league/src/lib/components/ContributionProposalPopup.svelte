<script lang="ts">
	import { mindscapeLabels } from "$lib/costData";
	import { createContribution, createEngineContribution } from "$lib/contributions";
	import { _ } from "$lib/i18n";
	import { currentUser } from "$lib/store";

	type Mode = "agent" | "engine-base" | "engine-agent";

	let {
		open = $bindable(false),
		mode = "agent" as Mode,
		agentId = "",
		agentName = "",
		engineId = "",
		weaponName = "",
		currentCosts = [] as number[],
		rankLabels = mindscapeLabels,
		agentOptions = [] as { id: string; name: string }[],
	}: {
		open?: boolean;
		mode?: Mode;
		agentId?: string;
		agentName?: string;
		engineId?: string;
		weaponName?: string;
		currentCosts?: number[];
		rankLabels?: string[];
		agentOptions?: { id: string; name: string }[];
	} = $props();

	let costs = $state<number[]>([]);
	let message = $state("");
	let selectedAgentId = $state("");
	let submitting = $state(false);
	let status = $state("");

	$effect(() => {
		if (open) {
			costs = [...currentCosts];
			message = "";
			selectedAgentId = agentId || agentOptions[0]?.id || "";
			submitting = false;
			status = "";
		}
	});

	const title = $derived(
		mode === "agent"
			? $_("contributionProposalPopup.titleAgent", { values: { agentName } })
			: mode === "engine-base"
				? $_("contributionProposalPopup.titleEngineBase", { values: { weaponName } })
				: $_("contributionProposalPopup.titleEngineAgent", { values: { weaponName } }),
	);

	async function submit() {
		if (submitting || !$currentUser) return;
		const finalMessage = message.trim() || $_("contributionProposalPopup.noComment");
		if (mode === "engine-agent" && !selectedAgentId) return;

		submitting = true;
		status = "";
		try {
			if (mode === "agent") {
				await createContribution(agentId, finalMessage, costs);
			} else if (mode === "engine-base") {
				await createEngineContribution(engineId, undefined, finalMessage, costs);
			} else {
				await createEngineContribution(engineId, selectedAgentId, finalMessage, costs);
			}
			open = false;
		} catch (error: any) {
			status = error.message;
		} finally {
			submitting = false;
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="popup" onclick={() => (open = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="card proposal-card" onclick={(e) => e.stopPropagation()}>
			<div class="close-row">
				<button class="icon-btn" onclick={() => (open = false)} aria-label={$_("common.close")}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<h2 class="popup-title">{title}</h2>
			{#if mode === "engine-agent" && agentOptions.length > 0 && !agentId}
				<div class="form-group">
					<label for="agent-picker">{$_("contributionProposalPopup.characterLabel")}</label>
					<span class="select-wrap">
						<select id="agent-picker" bind:value={selectedAgentId}>
							{#each agentOptions as a (a.id)}
								<option value={a.id}>{a.name}</option>
							{/each}
						</select>
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="select-arrow"><polyline points="6 9 12 15 18 9"/></svg>
					</span>
				</div>
			{/if}
			<div class="cost-inputs" style="grid-template-columns: repeat({rankLabels.length}, 1fr);">
				{#each rankLabels as label, i (i)}
					<div class="cost-input-row">
						<label for="cost-input-{i}">{label || `#${i + 1}`}</label>
						<input id="cost-input-{i}" class="cost-field" type="number" bind:value={costs[i]} />
					</div>
				{/each}
			</div>
			<textarea rows="3" placeholder={$_("contributionProposalPopup.reasonPlaceholder")} bind:value={message}></textarea>
			{#if !$currentUser}
				<p class="notice">{$_("contributionProposalPopup.loginRequired")}</p>
			{:else if status}
				<p class="notice error">{status}</p>
			{/if}
			<div class="btn-row">
				<button class="btn-common btn-play" onclick={submit} disabled={submitting || !$currentUser}>
					{submitting ? $_("contributionProposalPopup.submitting") : $_("contributionProposalPopup.submitProposal")}
				</button>
				<button class="btn-common" onclick={() => (open = false)}>{$_("common.cancel")}</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.proposal-card {
		width: 480px;
		max-width: 90vw;
		padding: 20px 26px 26px;
		gap: 14px;
	}

	.close-row {
		display: flex;
		justify-content: flex-end;
		margin-bottom: -8px;
	}

	.popup-title {
		font-size: 16px;
		font-weight: 800;
		border: none;
		padding-bottom: 0;
		margin-bottom: 0;
	}

	.notice.error {
		color: var(--danger);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form-group label {
		font-size: 12px;
		color: var(--text-dim);
		font-weight: 600;
	}

	.select-wrap {
		position: relative;
		display: block;
	}

	.select-wrap select {
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
		width: 100%;
		padding-right: 32px;
	}

	.select-arrow {
		position: absolute;
		right: 11px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-dim);
		pointer-events: none;
	}

	.cost-inputs {
		display: grid;
		gap: 7px;
	}

	.cost-input-row {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.cost-input-row label {
		font-size: 10px;
		font-weight: 700;
		color: var(--text-dim);
		text-align: center;
	}

	.cost-field {
		height: 32px;
		padding: 0 10px;
		border-radius: var(--r-sm);
		font-size: 12px;
		font-weight: 700;
		text-align: center;
	}
</style>
