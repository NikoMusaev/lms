/**
 * Arithmetic behind the course map's honeycomb.
 *
 * Kept out of the component so the two rules that matter can be pinned by
 * tests: a cell's place comes from its index alone (add a lesson and the
 * earlier cells stay put), and a cell's fill counts only fully covered
 * objectives.
 */

export type MapObjective = {
	text: string
	/** Absent for a guest and for an objective never reported on. */
	status?: 'covered' | 'touched' | 'skipped'
}

export type CellState = 'full' | 'partial' | 'empty'

/** Horizontal offset of odd rows, in cell widths. This is what makes it a honeycomb. */
const ROW_OFFSET = 0.5

/** Vertical step between rows, in cell heights: hexagons interlock rather than stack. */
const ROW_STEP = 0.75

/**
 * Where a cell sits, in cell-sized units — the caller scales them to pixels.
 *
 * A pure function of `index` and `columns`: the number of lessons is
 * deliberately not an argument, so a course that grows does not move the cells
 * that were already there.
 */
export function hexPosition(
	index: number,
	columns: number,
): { x: number; y: number } {
	const row = Math.floor(index / columns)
	const column = index % columns
	return {
		x: column + (row % 2 === 1 ? ROW_OFFSET : 0),
		y: row * ROW_STEP,
	}
}

/**
 * How full a cell is drawn.
 *
 * Only `covered` counts. `touched` means the topic was mentioned in passing,
 * and `skipped` that it was not taken — neither is progress, and a fill that
 * treated them as such would show a course further along than it is.
 */
export function cellState(objectives: MapObjective[]): CellState {
	if (!objectives.length) return 'empty'
	const covered = objectives.filter(
		(objective) => objective.status === 'covered',
	).length
	if (covered === objectives.length) return 'full'
	return covered ? 'partial' : 'empty'
}
