import { writable } from "svelte/store";
import { listEngineCosts } from "./api/communityCosts";
import type { Specialty } from "./costData";

export interface WeaponAgentOverride {
	agentId: string;
	costs: number[];
}

export interface WeaponCost {
	engineId: string;
	name: string;
	specialty: Specialty;
	/** Darte's raw rarity value: 2 = B-rank, 3 = A-rank, 4 = S-rank. */
	rarity: number;
	/** Base point cost at refinement R1 through R5, plus a 6th value from the source data whose meaning isn't documented. */
	baseCosts: number[];
	/** Explicit per-agent cost overrides for this engine (R1-R5 only) — falls back to baseCosts when an agent isn't listed. */
	agentOverrides: WeaponAgentOverride[];
}

export const engineRankLabels = ["R1", "R2", "R3", "R4", "R5"];
export const engineBaseRankLabels = [...engineRankLabels, ""];

// Backed by ZenlessLeague.Api's /api/community-costs/engines — refreshEngineCosts() is called
// once from the /costs route on mount.
export const weaponCosts = writable<WeaponCost[]>([]);

export async function refreshEngineCosts(): Promise<void> {
	weaponCosts.set(await listEngineCosts());
}
