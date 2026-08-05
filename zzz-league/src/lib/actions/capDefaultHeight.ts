type Params = { maxHeight?: number; trigger?: unknown };

export function capDefaultHeight(node: HTMLElement, params: Params = {}) {
	let userResized = false;

	function applyDefault(maxHeight: number) {
		if (userResized) return;
		node.style.height = "";
		const natural = node.scrollHeight;
		node.style.height = Math.min(natural, maxHeight) + "px";
	}

	function handlePointerDown(e: PointerEvent) {
		const rect = node.getBoundingClientRect();
		const nearRightEdge = rect.right - e.clientX < 20;
		const nearBottomEdge = rect.bottom - e.clientY < 20;
		if (nearRightEdge && nearBottomEdge) {
			userResized = true;
		}
	}

	node.addEventListener("pointerdown", handlePointerDown);
	applyDefault(params.maxHeight ?? 598);

	return {
		update(newParams: Params) {
			applyDefault(newParams.maxHeight ?? 598);
		},
		destroy() {
			node.removeEventListener("pointerdown", handlePointerDown);
		},
	};
}
