export type Specialty =
	| "attack"
	| "stun"
	| "anomaly"
	| "support"
	| "defense"
	| "rupture"
	| "armorer";

export interface SpecialtyInfo {
	id: Specialty;
	label: string;
}

export const specialties: SpecialtyInfo[] = [
	{ id: "attack", label: "Attack" },
	{ id: "stun", label: "Stun" },
	{ id: "anomaly", label: "Anomaly" },
	{ id: "support", label: "Support" },
	{ id: "defense", label: "Defense" },
	{ id: "rupture", label: "Rupture" },
	{ id: "armorer", label: "Armorer" },
];

export const specialtyById = new Map(specialties.map((s) => [s.id, s]));

export interface AgentCost {
	agentId: string;
	/** Proper in-game display name, from the darte.gg agent database. Falls back to the local asset name when unset (agent not found in that export). */
	name?: string;
	specialty: Specialty;
	/** Darte's raw rarity value (3/4/5, higher = rarer/stronger tier). 5s aren't in the exported agents.json snapshot yet. */
	rarity: number;
	/** Point cost at Mindscape 0 through 6. 9999 marks levels the community hasn't costed (effectively banned). */
	costs: number[];
}

export const mindscapeLabels = ["M0", "M1", "M2", "M3", "M4", "M5", "M6"];

// Baseline placeholder costs — not sourced from real community data yet.
// Specialty/rarity/name are sourced from the darte.gg agent database where available.
export const agentCosts: AgentCost[] = [
	{ agentId: "evelyn-chevalier", name: "Evelyn", specialty: "attack", rarity: 4, costs: [325, 475, 690, 1005, 1460, 9999, 9999] },
	{ agentId: "cissia", name: "Cissia", specialty: "attack", rarity: 4, costs: [320, 465, 680, 990, 1440, 9999, 9999] },
	{ agentId: "sigrid-de-lazur", name: "Sigrid", specialty: "attack", rarity: 4, costs: [275, 380, 530, 740, 9999, 9999, 9999] },
	{ agentId: "soldier-0-anby", name: "Soldier 0 - Anby", specialty: "attack", rarity: 4, costs: [270, 375, 520, 725, 9999, 9999, 9999] },
	{ agentId: "pyrois", name: "Pyrois", specialty: "attack", rarity: 4, costs: [265, 370, 510, 710, 9999, 9999, 9999] },
	{ agentId: "asaba-harumasa", name: "Harumasa", specialty: "attack", rarity: 4, costs: [260, 360, 495, 685, 9999, 9999, 9999] },
	{ agentId: "orphie-magnusson-magus", name: "Orphie & Magus", specialty: "attack", rarity: 4, costs: [250, 340, 465, 9999, 9999, 9999, 9999] },
	{ agentId: "ellen-joe", name: "Ellen", specialty: "attack", rarity: 4, costs: [200, 260, 340, 445, 585, 760, 995] },
	{ agentId: "hugo-vlad", name: "Hugo", specialty: "attack", rarity: 4, costs: [180, 230, 295, 380, 485, 620, 795] },
	{ agentId: "nekomiya-mana", name: "Nekomata", specialty: "attack", rarity: 4, costs: [100, 135, 180, 240, 320, 9999, 9999] },
	{ agentId: "soldier-11", name: "Soldier 11", specialty: "attack", rarity: 4, costs: [70, 90, 110, 140, 9999, 9999, 9999] },
	{ agentId: "seed", name: "Seed", specialty: "attack", rarity: 4, costs: [65, 80, 100, 130, 160, 200, 255] },
	{ agentId: "billy-kid", name: "Billy", specialty: "attack", rarity: 3, costs: [135, 185, 260, 365, 515, 720, 9999] },
	{ agentId: "anton-ivanov", name: "Anton", specialty: "attack", rarity: 3, costs: [120, 170, 230, 320, 440, 610, 9999] },
	{ agentId: "corin-wickes", name: "Corin", specialty: "attack", rarity: 3, costs: [55, 65, 80, 100, 120, 150, 185] },
	{ agentId: "zhu-yuan", name: "Zhu Yuan", specialty: "attack", rarity: 4, costs: [335, 490, 720, 1055, 1550, 9999, 9999] },
	{ agentId: "ye-shunguang", name: "Ye Shunguang", specialty: "attack", rarity: 4, costs: [265, 365, 505, 695, 9999, 9999, 9999] },
	{ agentId: "roxy-ifrita-pryce", specialty: "stun", rarity: 4, costs: [200, 265, 345, 455, 595, 780, 1020] },
	{ agentId: "von-lycaon", name: "Lycaon", specialty: "stun", rarity: 4, costs: [245, 340, 460, 9999, 9999, 9999, 9999] },
	{ agentId: "trigger", name: "Trigger", specialty: "stun", rarity: 4, costs: [355, 530, 790, 1175, 1755, 9999, 9999] },
	{ agentId: "qingyi", name: "Qingyi", specialty: "stun", rarity: 4, costs: [335, 490, 715, 1050, 1535, 9999, 9999] },
	{ agentId: "lighter", name: "Lighter", specialty: "stun", rarity: 4, costs: [195, 255, 330, 430, 560, 730, 945] },
	{ agentId: "koleda-belobog", name: "Koleda", specialty: "stun", rarity: 4, costs: [185, 235, 300, 385, 495, 630, 810] },
	{ agentId: "nangong-yu", name: "Nangong Yu", specialty: "stun", rarity: 4, costs: [105, 140, 185, 250, 335, 9999, 9999] },
	{ agentId: "ju-fufu", name: "Ju Fufu", specialty: "stun", rarity: 4, costs: [100, 130, 170, 225, 300, 9999, 9999] },
	{ agentId: "dialyn", name: "Dialyn", specialty: "stun", rarity: 4, costs: [85, 110, 145, 185, 9999, 9999, 9999] },
	{ agentId: "norma-hollowell", name: "Norma", specialty: "stun", rarity: 4, costs: [75, 100, 125, 160, 9999, 9999, 9999] },
	{ agentId: "pulchra-fellini", name: "Pulchra", specialty: "stun", rarity: 3, costs: [255, 345, 475, 9999, 9999, 9999, 9999] },
	{ agentId: "anby-demara", name: "Anby", specialty: "stun", rarity: 3, costs: [110, 150, 205, 280, 380, 9999, 9999] },
	{ agentId: "hoshimi-miyabi", name: "Miyabi", specialty: "anomaly", rarity: 4, costs: [320, 465, 670, 970, 1405, 9999, 9999] },
	{ agentId: "jane-doe", name: "Jane", specialty: "anomaly", rarity: 4, costs: [295, 425, 600, 855, 9999, 9999, 9999] },
	{ agentId: "promeia", name: "Promeia", specialty: "anomaly", rarity: 4, costs: [290, 410, 585, 825, 9999, 9999, 9999] },
	{ agentId: "burnice-white", name: "Burnice", specialty: "anomaly", rarity: 4, costs: [280, 390, 545, 760, 9999, 9999, 9999] },
	{ agentId: "remielle-dan", name: "Remielle", specialty: "anomaly", rarity: 4, costs: [275, 380, 530, 735, 9999, 9999, 9999] },
	{ agentId: "grace-howard", name: "Grace", specialty: "anomaly", rarity: 4, costs: [230, 315, 420, 9999, 9999, 9999, 9999] },
	{ agentId: "aria", name: "Aria", specialty: "anomaly", rarity: 4, costs: [230, 310, 420, 9999, 9999, 9999, 9999] },
	{ agentId: "alice-thymefield", name: "Alice", specialty: "anomaly", rarity: 4, costs: [215, 285, 375, 9999, 9999, 9999, 9999] },
	{ agentId: "piper-wheel", name: "Piper", specialty: "anomaly", rarity: 3, costs: [100, 135, 185, 245, 325, 9999, 9999] },
	{ agentId: "tsukishiro-yanagi", name: "Yanagi", specialty: "anomaly", rarity: 4, costs: [345, 505, 750, 1110, 1645, 9999, 9999] },
	{ agentId: "vivian-banshee", name: "Vivian", specialty: "anomaly", rarity: 4, costs: [305, 440, 630, 905, 9999, 9999, 9999] },
	{ agentId: "velina-airgid", name: "Velina", specialty: "anomaly", rarity: 4, costs: [240, 325, 440, 9999, 9999, 9999, 9999] },
	{ agentId: "sunna", name: "Sunna", specialty: "support", rarity: 4, costs: [350, 520, 775, 1155, 1725, 9999, 9999] },
	{ agentId: "astra-yao", name: "Astra Yao", specialty: "support", rarity: 4, costs: [285, 400, 565, 800, 9999, 9999, 9999] },
	{ agentId: "alexandrina-sebastiane", name: "Rina", specialty: "support", rarity: 4, costs: [285, 400, 560, 790, 9999, 9999, 9999] },
	{ agentId: "ukinami-yuzuha", name: "Yuzuha", specialty: "support", rarity: 4, costs: [215, 285, 380, 9999, 9999, 9999, 9999] },
	{ agentId: "lucia-elowen", name: "Lucia", specialty: "support", rarity: 4, costs: [80, 105, 135, 170, 9999, 9999, 9999] },
	{ agentId: "nicole-demara", name: "Nicole", specialty: "support", rarity: 3, costs: [140, 195, 280, 395, 560, 795, 9999] },
	{ agentId: "soukaku", name: "Soukaku", specialty: "support", rarity: 3, costs: [90, 120, 155, 205, 270, 9999, 9999] },
	{ agentId: "luciana-de-montefio", name: "Lucy", specialty: "support", rarity: 3, costs: [135, 185, 260, 365, 510, 715, 9999] },
	{ agentId: "caesar-king", name: "Caesar", specialty: "defense", rarity: 4, costs: [350, 520, 770, 1145, 1700, 9999, 9999] },
	{ agentId: "zhao", name: "Zhao", specialty: "defense", rarity: 4, costs: [250, 345, 470, 9999, 9999, 9999, 9999] },
	{ agentId: "seth-lowell", name: "Seth", specialty: "defense", rarity: 3, costs: [140, 195, 275, 390, 555, 785, 9999] },
	{ agentId: "pan-yinhu", name: "Pan Yinhu", specialty: "defense", rarity: 3, costs: [115, 160, 215, 295, 400, 9999, 9999] },
	{ agentId: "ben-bigger", name: "Ben", specialty: "defense", rarity: 3, costs: [85, 110, 145, 185, 9999, 9999, 9999] },
	{ agentId: "banyue", name: "Banyue", specialty: "rupture", rarity: 4, costs: [325, 475, 690, 1010, 1470, 9999, 9999] },
	{ agentId: "starlight-billy-kid", name: "Starlight - Billy", specialty: "rupture", rarity: 4, costs: [125, 170, 235, 325, 450, 620, 9999] },
	{ agentId: "yixuan", name: "Yixuan", specialty: "rupture", rarity: 4, costs: [275, 385, 540, 750, 9999, 9999, 9999] },
	{ agentId: "yidhari-murphy", name: "Yidhari", specialty: "rupture", rarity: 4, costs: [200, 260, 335, 440, 575, 745, 975] },
	{ agentId: "komano-manato", name: "Manato", specialty: "rupture", rarity: 3, costs: [125, 175, 245, 345, 475, 665, 9999] },
	{ agentId: "claret-flint", specialty: "armorer", rarity: 5, costs: [120, 170, 230, 320, 440, 605, 9999] },
];
