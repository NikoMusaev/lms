/**
 * CourseMap.vue: what the honeycomb shows and what a click reveals.
 *
 * The map is a projection of data that already exists — chapters, lessons and
 * objective coverage — so the component's whole job is reading it correctly.
 * Pinned here: one cell per lesson, a cell's fill state, the objectives panel
 * that a click opens, and the label a screen reader gets, since colour alone
 * carries no meaning for it.
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CourseMap from '@/components/CourseMap.vue'

// main.js puts `__` on the app instance; a bare mount() has none, and the
// template's translated strings would render as a warning instead of text.
const global = { mocks: { __: (message: string) => message } }

const chapters = [
	{
		title: 'Launch',
		lessons: [
			{
				id: 'lesson-1',
				number: 1,
				title: 'Starting a project',
				icon: 'rocket',
				objectives: [
					{ text: 'Name the sponsor', status: 'covered' },
					{ text: 'Tell a project from operations', status: 'touched' },
				],
			},
			{
				id: 'lesson-2',
				number: 2,
				title: 'Daily rituals',
				icon: null,
				objectives: [{ text: 'Run a daily check', status: 'covered' }],
			},
		],
	},
]

const guestChapters = [
	{
		title: 'Launch',
		lessons: [
			{
				id: 'lesson-1',
				number: 1,
				title: 'Starting a project',
				icon: 'rocket',
				objectives: [{ text: 'Name the sponsor' }],
			},
		],
	},
]

describe('CourseMap', () => {
	it('draws one cell per lesson', () => {
		const map = mount(CourseMap, { props: { chapters }, global })

		expect(map.findAll('[data-lesson]')).toHaveLength(2)
	})

	it('fills a cell by its covered objectives', () => {
		const map = mount(CourseMap, { props: { chapters }, global })

		const cells = map.findAll('[data-lesson]')
		expect(cells[0].attributes('data-state')).toBe('partial')
		expect(cells[1].attributes('data-state')).toBe('full')
	})

	it('shows a guest every cell empty, because coverage is not theirs to see', () => {
		const map = mount(CourseMap, { props: { chapters: guestChapters }, global })

		expect(map.find('[data-lesson]').attributes('data-state')).toBe('empty')
	})

	it('opens the lesson objectives on click and closes them on a second one', async () => {
		const map = mount(CourseMap, { props: { chapters }, global })

		expect(map.find('[data-objectives]').exists()).toBe(false)

		await map.find('[data-lesson="lesson-1"]').trigger('click')
		expect(map.find('[data-objectives]').text()).toContain('Name the sponsor')
		expect(map.find('[data-objectives]').text()).toContain('Starting a project')

		await map.find('[data-lesson="lesson-1"]').trigger('click')
		expect(map.find('[data-objectives]').exists()).toBe(false)
	})

	it('labels a cell with the lesson and its progress, not with colour alone', () => {
		const map = mount(CourseMap, { props: { chapters }, global })

		const label = map.find('[data-lesson="lesson-1"]').attributes('aria-label')
		expect(label).toContain('Starting a project')
		expect(label).toContain('1')
		expect(label).toContain('2')
	})

	it('never draws a cell with a border, which clip-path would cut to pieces', () => {
		// The hexagon is a clip-path, and it clips the border too: what is left
		// on screen are two vertical slivers where the sides ran, not an
		// outline. Every state has to carry its own background instead. This
		// only showed on the stand — jsdom has no clip-path.
		const map = mount(CourseMap, { props: { chapters }, global })
		const guest = mount(CourseMap, {
			props: { chapters: guestChapters },
			global,
		})

		const classes = [
			...map.findAll('[data-lesson]'),
			...guest.findAll('[data-lesson]'),
		].map((cell) => cell.attributes('class') || '')

		expect(classes.filter((cls) => /\bborder\b/.test(cls))).toEqual([])
		// Either a background utility or `hex-partial`, whose stripes are a
		// background too — what matters is that the shape is painted, not outlined.
		expect(classes.every((cls) => /\bbg-|hex-partial/.test(cls))).toBe(true)
	})

	it('falls back to the lesson number when the curator set no icon', () => {
		const map = mount(CourseMap, { props: { chapters }, global })

		expect(map.find('[data-lesson="lesson-2"]').text()).toContain('2')
	})
})
