type Params = {
	maxHeight?: number;
	defaultHeight?: number;
	trigger?: unknown;
	storageKey?: string;
};

export function capDefaultHeight(node: HTMLElement, params: Params = {}) {
	let userResized = false;
	let currentStorageKey = params.storageKey;

	function saveHeight() {
		if (!currentStorageKey) return;
		try {
			localStorage.setItem(currentStorageKey, node.style.height);
		} catch {
			// localStorage unavailable — ignore
		}
	}

	function computeNaturalDefault(maxHeight: number, defaultHeight?: number) {
		if (defaultHeight != null) return Math.min(defaultHeight, maxHeight);
		node.style.height = "";
		return Math.min(node.scrollHeight, maxHeight);
	}

	function applyDefault(maxHeight: number, defaultHeight?: number) {
		if (userResized) return;

		if (currentStorageKey) {
			try {
				const saved = localStorage.getItem(currentStorageKey);
				if (saved) {
					node.style.height = saved;
					userResized = true;
					return;
				}
			} catch {
				// localStorage unavailable — ignore
			}
		}

		node.style.height = computeNaturalDefault(maxHeight, defaultHeight) + "px";
	}

	function handlePointerUp() {
		saveHeight();
	}

	function handlePointerDown(e: PointerEvent) {
		const rect = node.getBoundingClientRect();
		const nearRightEdge = rect.right - e.clientX < 20;
		const nearBottomEdge = rect.bottom - e.clientY < 20;
		if (nearRightEdge && nearBottomEdge) {
			userResized = true;
			window.addEventListener("pointerup", handlePointerUp, { once: true });
		}
	}

	node.addEventListener("pointerdown", handlePointerDown);
	applyDefault(params.maxHeight ?? 598, params.defaultHeight);

	return {
		update(newParams: Params) {
			if (newParams.storageKey !== currentStorageKey) {
				currentStorageKey = newParams.storageKey;
				userResized = false;
			}
			applyDefault(newParams.maxHeight ?? 598, newParams.defaultHeight);
		},
		destroy() {
			node.removeEventListener("pointerdown", handlePointerDown);
		},
	};
}
