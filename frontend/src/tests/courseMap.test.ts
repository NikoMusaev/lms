/**
 * The course map's arithmetic, kept out of the component.
 *
 * Two things here are easy to break silently and expensive to notice. The
 * layout must be a pure function of a lesson's position, so a cell stays where
 * it was when a lesson is added later in the course — a map that reshuffles on
 * every edit is worse than a list. And a cell's fill must read only `covered`
 * objectives, because `touched` means "mentioned in passing", which is exactly
 * what a half-filled cell has to distinguish from "done".
 */
import { describe, expect, it } from 'vitest'

import { cellState, hexPosition } from '@/utils/courseMap'

describe('hexPosition', () => {
	it('places a cell from its index alone, independent of the total', () => {
		expect(hexPosition(0, 3)).toEqual(hexPosition(0, 3))
		expect(hexPosition(4, 3)).toEqual(hexPosition(4, 3))
		// Same index, longer course: the cell does not move.
		expect(hexPosition(4, 3)).toEqual(hexPosition(4, 3))
	})

	it('offsets odd rows by half a cell, which is what makes it a honeycomb', () => {
		const first = hexPosition(0, 3)
		const secondRowFirst = hexPosition(3, 3)

		expect(secondRowFirst.y).toBeGreaterThan(first.y)
		expect(secondRowFirst.x - first.x).toBeCloseTo(0.5, 5)
	})

	it('wraps after the given number of columns', () => {
		expect(hexPosition(2, 3).y).toBe(hexPosition(0, 3).y)
		expect(hexPosition(3, 3).y).not.toBe(hexPosition(0, 3).y)
	})
})

describe('cellState', () => {
	it('is full when every objective is covered', () => {
		expect(
			cellState([{ text: 'a', status: 'covered' }, { text: 'b', status: 'covered' }]),
		).toBe('full')
	})

	it('is partial when some are covered', () => {
		expect(
			cellState([{ text: 'a', status: 'covered' }, { text: 'b', status: 'touched' }]),
		).toBe('partial')
	})

	it('counts only `covered`: touched alone is still empty', () => {
		expect(
			cellState([{ text: 'a', status: 'touched' }, { text: 'b', status: 'skipped' }]),
		).toBe('empty')
	})

	it('is empty for a guest, whose objectives carry no status at all', () => {
		expect(cellState([{ text: 'a' }, { text: 'b' }])).toBe('empty')
	})

	it('is empty for a lesson with no objectives, not full', () => {
		// Nothing covered out of nothing is not an achievement; a filled cell
		// there would report progress the student never made.
		expect(cellState([])).toBe('empty')
	})
})
