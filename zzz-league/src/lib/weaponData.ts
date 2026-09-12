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

// Sourced from the live NESC system config (example-darte/w-engines.json costs.engines,
// joined with the engine catalog in w-engines-2.json for name/rarity/specialty).
export const weaponCosts: WeaponCost[] = [
	{ engineId: "12001", name: "[Lunar] Pleniluna", specialty: "attack", rarity: 2, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "12002", name: "[Lunar] Decrescent", specialty: "attack", rarity: 2, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "12003", name: "[Lunar] Noviluna", specialty: "attack", rarity: 2, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "12004", name: "[Reverb] Mark I", specialty: "support", rarity: 2, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "12005", name: "[Reverb] Mark II", specialty: "support", rarity: 2, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "12006", name: "[Reverb] Mark III", specialty: "support", rarity: 2, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "12007", name: "[Vortex] Revolver", specialty: "stun", rarity: 2, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "12008", name: "[Vortex] Arrow", specialty: "stun", rarity: 2, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "12009", name: "[Vortex] Hatchet", specialty: "stun", rarity: 2, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "12010", name: "[Magnetic Storm] Alpha", specialty: "anomaly", rarity: 2, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "12011", name: "[Magnetic Storm] Bravo", specialty: "anomaly", rarity: 2, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "12012", name: "[Magnetic Storm] Charlie", specialty: "anomaly", rarity: 2, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "12013", name: "[Identity] Base", specialty: "defense", rarity: 2, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "12014", name: "[Identity] Inflection", specialty: "defense", rarity: 2, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13001", name: "Street Superstar", specialty: "attack", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13002", name: "Slice of Time", specialty: "support", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13003", name: "Rainforest Gourmet", specialty: "anomaly", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13004", name: "Starlight Engine", specialty: "attack", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13005", name: "Steam Oven", specialty: "stun", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [{ agentId: "velina-airgid", costs: [10, 10, 10, 10, 10] }] },
	{ engineId: "13006", name: "Precious Fossilized Core", specialty: "stun", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13007", name: "Original Transmorpher", specialty: "defense", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13008", name: "Weeping Gemini", specialty: "anomaly", rarity: 3, baseCosts: [5, 5, 5, 5, 5, 0], agentOverrides: [] },
	{ engineId: "13009", name: "Electro-Lip Gloss", specialty: "anomaly", rarity: 3, baseCosts: [5, 5, 5, 5, 5, 0], agentOverrides: [] },
	{ engineId: "13010", name: "Bunny Band", specialty: "defense", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13011", name: "Spring Embrace", specialty: "defense", rarity: 3, baseCosts: [5, 5, 5, 5, 5, 0], agentOverrides: [] },
	{ engineId: "13013", name: "Gilded Blossom", specialty: "attack", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13015", name: "Marcato Desire", specialty: "attack", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13101", name: "Demara Battery Mark II", specialty: "stun", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13103", name: "The Vault", specialty: "support", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [{ agentId: "velina-airgid", costs: [5, 5, 5, 5, 5] }] },
	{ engineId: "13106", name: "Housekeeper", specialty: "attack", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13108", name: "Starlight Engine Replica", specialty: "attack", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13111", name: "Drill Rig - Red Axis", specialty: "attack", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [{ agentId: "cissia", costs: [5, 5, 5, 5, 5] }, { agentId: "velina-airgid", costs: [10, 10, 10, 10, 10] }] },
	{ engineId: "13112", name: "Big Cylinder", specialty: "defense", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13113", name: "Bashful Demon", specialty: "support", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13115", name: "Kaboom the Cannon", specialty: "support", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [{ agentId: "velina-airgid", costs: [5, 5, 5, 5, 5] }] },
	{ engineId: "13127", name: "Peacekeeper - Specialized", specialty: "defense", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13128", name: "Roaring Ride", specialty: "anomaly", rarity: 3, baseCosts: [5, 5, 5, 5, 5, 0], agentOverrides: [] },
	{ engineId: "14001", name: "Cannon Rotor", specialty: "attack", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "14002", name: "Unfettered Game Ball", specialty: "support", rarity: 3, baseCosts: [5, 5, 5, 5, 5, 0], agentOverrides: [{ agentId: "velina-airgid", costs: [5, 5, 5, 5, 5] }] },
	{ engineId: "14003", name: "Six Shooter", specialty: "stun", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "14102", name: "Steel Cushion", specialty: "attack", rarity: 4, baseCosts: [10, 12, 15, 17, 20, 0], agentOverrides: [{ agentId: "nekomiya-mana", costs: [25, 27, 30, 32, 35] }, { agentId: "corin-wickes", costs: [10, 15, 20, 25, 30] }, { agentId: "billy-kid", costs: [10, 15, 20, 25, 30] }] },
	{ engineId: "14104", name: "The Brimstone", specialty: "attack", rarity: 4, baseCosts: [10, 12, 15, 18, 24, 0], agentOverrides: [{ agentId: "soldier-11", costs: [10, 15, 20, 25, 30] }, { agentId: "zhu-yuan", costs: [15, 18, 21, 24, 30] }, { agentId: "asaba-harumasa", costs: [15, 19, 22, 26, 30] }, { agentId: "sigrid-de-lazur", costs: [15, 17, 20, 23, 29] }] },
	{ engineId: "14107", name: "Tusks of Fury", specialty: "defense", rarity: 4, baseCosts: [5, 5, 5, 5, 5, 0], agentOverrides: [{ agentId: "caesar-king", costs: [15, 17, 9999, 9999, 9999] }, { agentId: "seth-lowell", costs: [15, 17, 9999, 9999, 9999] }, { agentId: "zhao", costs: [15, 17, 9999, 9999, 9999] }, { agentId: "pan-yinhu", costs: [15, 17, 9999, 9999, 9999] }] },
	{ engineId: "14109", name: "Hailstorm Shrine", specialty: "anomaly", rarity: 4, baseCosts: [5, 7, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "burnice-white", costs: [20, 22, 9999, 9999, 9999] }, { agentId: "hoshimi-miyabi", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "grace-howard", costs: [20, 22, 9999, 9999, 9999] }] },
	{ engineId: "14110", name: "Hellfire Gears", specialty: "stun", rarity: 4, baseCosts: [4, 5, 7, 9, 11, 0], agentOverrides: [] },
	{ engineId: "14114", name: "The Restrained", specialty: "stun", rarity: 4, baseCosts: [4, 5, 6, 7, 8, 0], agentOverrides: [] },
	{ engineId: "14116", name: "Blazing Laurel", specialty: "stun", rarity: 4, baseCosts: [10, 12, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "lighter", costs: [15, 17, 9999, 9999, 9999] }, { agentId: "von-lycaon", costs: [15, 17, 9999, 9999, 9999] }, { agentId: "qingyi", costs: [15, 17, 9999, 9999, 9999] }, { agentId: "ju-fufu", costs: [10, 12, 9999, 9999, 9999] }, { agentId: "trigger", costs: [15, 17, 9999, 9999, 9999] }] },
	{ engineId: "14117", name: "Flamemaker Shaker", specialty: "anomaly", rarity: 4, baseCosts: [5, 7, 11, 9999, 9999, 0], agentOverrides: [{ agentId: "burnice-white", costs: [20, 22, 25, 9999, 9999] }, { agentId: "velina-airgid", costs: [20, 22, 9999, 9999, 9999] }] },
	{ engineId: "14118", name: "Fusion Compiler", specialty: "anomaly", rarity: 4, baseCosts: [5, 9, 13, 17, 21, 0], agentOverrides: [{ agentId: "tsukishiro-yanagi", costs: [15, 17, 21, 25, 27] }, { agentId: "grace-howard", costs: [15, 19, 23, 27, 31] }, { agentId: "hoshimi-miyabi", costs: [15, 17, 20, 23, 26] }] },
	{ engineId: "14119", name: "Deep Sea Visitor", specialty: "attack", rarity: 4, baseCosts: [10, 12, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "ellen-joe", costs: [20, 22, 9999, 9999, 9999] }, { agentId: "hugo-vlad", costs: [20, 22, 9999, 9999, 9999] }] },
	{ engineId: "14120", name: "Zanshin Herb Case", specialty: "attack", rarity: 4, baseCosts: [10, 12, 14, 9999, 9999, 0], agentOverrides: [{ agentId: "asaba-harumasa", costs: [20, 22, 30, 9999, 9999] }, { agentId: "soldier-11", costs: [15, 17, 19, 9999, 9999] }, { agentId: "nekomiya-mana", costs: [5, 7, 9, 9999, 9999] }] },
	{ engineId: "14121", name: "Weeping Cradle", specialty: "support", rarity: 4, baseCosts: [5, 7, 10, 12, 15, 5], agentOverrides: [{ agentId: "alexandrina-sebastiane", costs: [10, 12, 15, 17, 20] }] },
	{ engineId: "14122", name: "Timeweaver", specialty: "anomaly", rarity: 4, baseCosts: [15, 17, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "tsukishiro-yanagi", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "piper-wheel", costs: [15, 17, 9999, 9999, 9999] }, { agentId: "grace-howard", costs: [15, 17, 9999, 9999, 9999] }] },
	{ engineId: "14124", name: "Riot Suppressor Mark VI", specialty: "attack", rarity: 4, baseCosts: [10, 12, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "zhu-yuan", costs: [15, 17, 9999, 9999, 9999] }] },
	{ engineId: "14125", name: "Ice-Jade Teapot", specialty: "stun", rarity: 4, baseCosts: [10, 12, 9999, 9999, 9999, 0], agentOverrides: [] },
	{ engineId: "14126", name: "Sharpened Stinger", specialty: "anomaly", rarity: 4, baseCosts: [5, 7, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "jane-doe", costs: [20, 22, 9999, 9999, 9999] }] },
	{ engineId: "14131", name: "Elegant Vanity", specialty: "support", rarity: 4, baseCosts: [5, 7, 9999, 9999, 9999, 5], agentOverrides: [{ agentId: "velina-airgid", costs: [10, 10, 10, 10, 10] }] },
	{ engineId: "14132", name: "Heartstring Nocturne", specialty: "attack", rarity: 4, baseCosts: [10, 12, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "evelyn-chevalier", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "soldier-11", costs: [25, 27, 9999, 9999, 9999] }] },
	{ engineId: "13135", name: "Box Cutter", specialty: "stun", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "14136", name: "Spectral Gaze", specialty: "stun", rarity: 4, baseCosts: [0, 0, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "trigger", costs: [15, 17, 9999, 9999, 9999] }] },
	{ engineId: "14138", name: "Severed Innocence", specialty: "attack", rarity: 4, baseCosts: [10, 12, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "soldier-11", costs: [20, 22, 9999, 9999, 9999] }] },
	{ engineId: "14129", name: "Myriad Eclipse", specialty: "attack", rarity: 4, baseCosts: [10, 12, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "ellen-joe", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "hugo-vlad", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "soldier-11", costs: [20, 22, 9999, 9999, 9999] }] },
	{ engineId: "14133", name: "Flight of Fancy", specialty: "anomaly", rarity: 4, baseCosts: [5, 7, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "vivian-banshee", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "aria", costs: [20, 22, 9999, 9999, 9999] }] },
	{ engineId: "12015", name: "[Cinder] Cobalt", specialty: "rupture", rarity: 2, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13012", name: "Puzzle Sphere", specialty: "rupture", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13014", name: "Radiowave Journey", specialty: "rupture", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13016", name: "Reel Projector", specialty: "defense", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "13142", name: "Tremor Trigram Vessel", specialty: "defense", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "14137", name: "Qingming Birdcage", specialty: "rupture", rarity: 4, baseCosts: [15, 17, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "yixuan", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "yidhari-murphy", costs: [15, 22, 9999, 9999, 9999] }] },
	{ engineId: "14139", name: "Roaring Fur-nace", specialty: "stun", rarity: 4, baseCosts: [10, 10, 9999, 9999, 9999, 5], agentOverrides: [{ agentId: "ju-fufu", costs: [15, 17, 9999, 9999, 9999] }] },
	{ engineId: "14141", name: "Metanukimorphosis", specialty: "support", rarity: 4, baseCosts: [5, 7, 9999, 9999, 9999, 5], agentOverrides: [{ agentId: "ukinami-yuzuha", costs: [20, 22, 9999, 9999, 9999] }, { agentId: "velina-airgid", costs: [10, 10, 10, 10, 10] }] },
	{ engineId: "14140", name: "Practiced Perfection", specialty: "anomaly", rarity: 4, baseCosts: [5, 7, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "piper-wheel", costs: [20, 22, 9999, 9999, 9999] }, { agentId: "alice-thymefield", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "jane-doe", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "burnice-white", costs: [10, 12, 9999, 9999, 9999] }] },
	{ engineId: "14146", name: "Cordis Germina", specialty: "attack", rarity: 4, baseCosts: [10, 12, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "seed", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "asaba-harumasa", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "soldier-11", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "soldier-0-anby", costs: [20, 22, 9999, 9999, 9999] }, { agentId: "ye-shunguang", costs: [20, 22, 9999, 9999, 9999] }, { agentId: "zhu-yuan", costs: [20, 22, 9999, 9999, 9999] }, { agentId: "cissia", costs: [20, 22, 9999, 9999, 9999] }] },
	{ engineId: "14130", name: "Bellicose Blaze", specialty: "attack", rarity: 4, baseCosts: [10, 12, 9999, 9999, 9999, 5], agentOverrides: [{ agentId: "orphie-magnusson-magus", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "pan-yinhu", costs: [5, 5, 5, 5, 5] }, { agentId: "cissia", costs: [15, 17, 9999, 9999, 9999] }, { agentId: "velina-airgid", costs: [20, 20, 20, 20, 20] }] },
	{ engineId: "14145", name: "Dreamlit Hearth", specialty: "support", rarity: 4, baseCosts: [5, 5, 5, 5, 5, 0], agentOverrides: [{ agentId: "lucia-elowen", costs: [20, 22, 9999, 9999, 9999] }, { agentId: "sunna", costs: [10, 12, 9999, 9999, 9999] }] },
	{ engineId: "13144", name: "Grill O'Wisp", specialty: "rupture", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "14105", name: "Kraken's Cradle", specialty: "rupture", rarity: 4, baseCosts: [5, 5, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "yidhari-murphy", costs: [25, 27, 9999, 9999, 9999] }] },
	{ engineId: "14148", name: "Yesterday Calls", specialty: "stun", rarity: 4, baseCosts: [0, 0, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "dialyn", costs: [15, 17, 9999, 9999, 9999] }] },
	{ engineId: "14147", name: "Wrathful Vajra", specialty: "rupture", rarity: 4, baseCosts: [15, 17, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "banyue", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "yixuan", costs: [15, 17, 9999, 9999, 9999] }, { agentId: "yidhari-murphy", costs: [15, 17, 9999, 9999, 9999] }] },
	{ engineId: "14134", name: "Half-Sugar Bunny", specialty: "defense", rarity: 4, baseCosts: [5, 5, 5, 5, 5, 0], agentOverrides: [{ agentId: "zhao", costs: [20, 22, 9999, 9999, 9999] }, { agentId: "caesar-king", costs: [15, 17, 9999, 9999, 9999] }, { agentId: "seth-lowell", costs: [15, 17, 9999, 9999, 9999] }, { agentId: "pan-yinhu", costs: [15, 17, 9999, 9999, 9999] }] },
	{ engineId: "14143", name: "Cloudcleave Radiance", specialty: "attack", rarity: 4, baseCosts: [10, 12, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "ye-shunguang", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "nekomiya-mana", costs: [15, 17, 9999, 9999, 9999] }] },
	{ engineId: "13019", name: "Cauldron of Clarity", specialty: "rupture", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "14149", name: "Thoughtbop", specialty: "support", rarity: 4, baseCosts: [5, 7, 9999, 9999, 9999, 5], agentOverrides: [{ agentId: "ukinami-yuzuha", costs: [20, 22, 9999, 9999, 9999] }, { agentId: "sunna", costs: [20, 22, 9999, 9999, 9999] }, { agentId: "velina-airgid", costs: [10, 10, 10, 10, 10] }] },
	{ engineId: "14150", name: "Angel in the Shell", specialty: "anomaly", rarity: 4, baseCosts: [5, 7, 9999, 9999, 9999, 5], agentOverrides: [{ agentId: "aria", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "vivian-banshee", costs: [15, 17, 9999, 9999, 9999] }, { agentId: "nangong-yu", costs: [10, 10, 9999, 9999, 9999] }] },
	{ engineId: "1511", name: "Neon Fantasies", specialty: "stun", rarity: 4, baseCosts: [5, 7, 9999, 9999, 9999, 5], agentOverrides: [{ agentId: "nangong-yu", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "von-lycaon", costs: [10, 12, 9999, 9999, 9999] }, { agentId: "qingyi", costs: [10, 12, 9999, 9999, 9999] }] },
	{ engineId: "13020", name: "The Simmering Pot", specialty: "stun", rarity: 3, baseCosts: [0, 0, 0, 0, 0, 0], agentOverrides: [] },
	{ engineId: "1521", name: "Serpentine Seeker", specialty: "attack", rarity: 4, baseCosts: [10, 12, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "cissia", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "velina-airgid", costs: [20, 22, 9999, 9999, 9999] }, { agentId: "pan-yinhu", costs: [5, 5, 5, 5, 5] }] },
	{ engineId: "14154", name: "Frostfall Sickle", specialty: "anomaly", rarity: 4, baseCosts: [5, 7, 9999, 9999, 9999, 5], agentOverrides: [{ agentId: "nangong-yu", costs: [10, 12, 9999, 9999, 9999] }, { agentId: "promeia", costs: [25, 27, 9999, 9999, 9999] }] },
	{ engineId: "14153", name: "Starlight Rider Faceplate", specialty: "rupture", rarity: 4, baseCosts: [15, 17, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "starlight-billy-kid", costs: [25, 27, 9999, 9999, 9999] }] },
	{ engineId: "14155", name: "Sol Exuvia", specialty: "attack", rarity: 4, baseCosts: [10, 10, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "pyrois", costs: [23, 25, 9999, 9999, 9999] }] },
	{ engineId: "14156", name: "Joyau Dore", specialty: "anomaly", rarity: 4, baseCosts: [5, 7, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "velina-airgid", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "pan-yinhu", costs: [5, 5, 5, 5, 5] }] },
	{ engineId: "14157", name: "Chief Sidekick", specialty: "stun", rarity: 4, baseCosts: [5, 7, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "norma-hollowell", costs: [25, 27, 9999, 9999, 9999] }, { agentId: "lighter", costs: [15, 17, 9999, 9999, 9999] }, { agentId: "dialyn", costs: [15, 17, 9999, 9999, 9999] }, { agentId: "ju-fufu", costs: [15, 17, 9999, 9999, 9999] }, { agentId: "koleda-belobog", costs: [10, 12, 9999, 9999, 9999] }, { agentId: "trigger", costs: [5, 7, 9999, 9999, 9999] }] },
	{ engineId: "14158", name: "Ode of Resurrected Wings", specialty: "anomaly", rarity: 4, baseCosts: [10, 12, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "remielle-dan", costs: [25, 27, 9999, 9999, 9999] }] },
	{ engineId: "13018", name: "Boisterous Echoes", specialty: "anomaly", rarity: 3, baseCosts: [5, 5, 5, 5, 5, 0], agentOverrides: [] },
	{ engineId: "14159", name: "Knight's Extolment", specialty: "attack", rarity: 4, baseCosts: [10, 12, 9999, 9999, 9999, 0], agentOverrides: [{ agentId: "sigrid-de-lazur", costs: [25, 27, 9999, 9999, 9999] }] },
];
