<script lang="ts">
	import { mindscapeLabels } from "$lib/costData";
	import { createContribution, createEngineContribution } from "$lib/contributions";
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
			? `Предложить изменение — ${agentName}`
			: mode === "engine-base"
				? `Предложить изменение базовой стоимости — ${weaponName}`
				: `Предложить стоимость для агента — ${weaponName}`,
	);

	async function submit() {
		if (submitting || !$currentUser) return;
		const finalMessage = message.trim() || "Без комментария";
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
			<h2>{title}</h2>
			{#if mode === "engine-agent" && agentOptions.length > 0 && !agentId}
				<div class="cost-input-row">
					<label for="agent-picker">Персонаж</label>
					<select id="agent-picker" bind:value={selectedAgentId}>
						{#each agentOptions as a (a.id)}
							<option value={a.id}>{a.name}</option>
						{/each}
					</select>
				</div>
			{/if}
			<div class="cost-inputs">
				{#each rankLabels as label, i (i)}
					<div class="cost-input-row">
						<label for="cost-input-{i}">{label || `#${i + 1}`}</label>
						<input id="cost-input-{i}" type="number" bind:value={costs[i]} />
					</div>
				{/each}
			</div>
			<textarea rows="3" placeholder="Почему стоит изменить стоимость?" bind:value={message}></textarea>
			{#if !$currentUser}
				<p class="notice">Войдите, чтобы предложить изменение.</p>
			{:else if status}
				<p class="notice error">{status}</p>
			{/if}
			<div class="btn-row">
				<button class="btn-common btn-play" onclick={submit} disabled={submitting || !$currentUser}>
					{submitting ? "Отправка…" : "Отправить предложение"}
				</button>
				<button class="btn-common" onclick={() => (open = false)}>Отмена</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.proposal-card {
		width: 480px;
		max-width: 90vw;
	}

	.notice.error {
		color: var(--loss);
	}

	.cost-inputs {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
	}

	.cost-input-row {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.cost-input-row label {
		font-size: 11px;
		color: #888;
	}

	.cost-input-row input,
	.cost-input-row select {
		padding: 6px;
	}
</style>
