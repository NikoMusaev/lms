import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { ProgramData } from '@/utils/courseProgram'

// learning-services#322: the program's map, slide and slider as the student
// meets them.

vi.mock('frappe-ui', () => ({
	Button: {
		props: ['label', 'disabled'],
		template:
			'<button :aria-label="label" :disabled="disabled" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
	},
}))
vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: (to: { params: { chapterNumber: number; lessonNumber: number } }) => ({
			href: `/lms/courses/course-1/learn/${to.params.chapterNumber}-${to.params.lessonNumber}`,
		}),
	}),
}))
vi.mock('@/utils/composables', () => ({ useScreenSize: () => ({ isMobile: false }) }))

import ProgramMap from '@/components/CourseProgram/ProgramMap.vue'
import LessonSlide from '@/components/CourseProgram/LessonSlide.vue'
import CourseProgram from '@/components/CourseProgram/CourseProgram.vue'

const __ = (message: string) => {
	if (!/{\d+}/.test(message)) return message
	return {
		format: (...args: unknown[]) =>
			message.replace(/{(\d+)}/g, (match, number) =>
				typeof args[number] !== 'undefined' ? String(args[number]) : match
			),
	}
}

const enrolled: ProgramData = {
	course: 'course-1',
	title: 'Риски проекта',
	next_lesson: 'l-3',
	chapters: [
		{
			title: 'Рамка',
			lessons: [
				{
					id: 'l-1',
					number: 1,
					title: 'Риск как событие',
					hook: 'Зачем это вам',
					completed: true,
					objectives: [{ text: 'a', status: 'covered' }],
				},
			],
		},
		{
			title: 'Выявление',
			lessons: [
				{
					id: 'l-2',
					number: 2,
					title: 'Цели и источники',
					hook: null,
					completed: false,
					objectives: [
						{ text: 'a', status: 'covered' },
						{ text: 'b', status: 'touched' },
						{ text: 'c' },
					],
				},
				{
					id: 'l-3',
					number: 3,
					title: 'Оценка и порог',
					hook: null,
					completed: false,
					objectives: [{ text: 'a' }, { text: 'b' }],
				},
			],
		},
	],
}

const guest: ProgramData = {
	...enrolled,
	next_lesson: undefined,
	chapters: enrolled.chapters.map((chapter) => ({
		...chapter,
		lessons: chapter.lessons.map(({ completed, ...lesson }) => ({
			...lesson,
			objectives: lesson.objectives.map(({ text }) => ({ text })),
		})),
	})),
}

const global = { mocks: { __ } }

beforeEach(() => {
	vi.stubGlobal('__', __)
})

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('ProgramMap', () => {
	it('draws each lesson with its status and says it in words', () => {
		const wrapper = mount(ProgramMap, {
			props: { chapters: enrolled.chapters, nextLesson: 'l-3', current: 2 },
			global,
		})
		const dots = wrapper.findAll('button')

		expect(dots.map((dot) => dot.attributes('data-status'))).toEqual([
			'completed',
			'in-progress',
			'next',
		])
		expect(dots[1].attributes('aria-label')).toBe(
			'Lesson 2. Цели и источники — in progress — 1 of 3 topics'
		)
		expect(dots[2].attributes('aria-current')).toBe('step')
		expect(dots[2].attributes('data-next')).toBe('')
	})

	it('groups the dots under the chapter titles', () => {
		const wrapper = mount(ProgramMap, {
			props: { chapters: enrolled.chapters, nextLesson: 'l-3', current: 0 },
			global,
		})
		expect(wrapper.findAll('[data-testid="map-chapter"]').map((c) => c.text())).toEqual([
			'Рамка',
			'Выявление',
		])
	})

	it('reports the slide a dot stands for', async () => {
		const wrapper = mount(ProgramMap, {
			props: { chapters: enrolled.chapters, nextLesson: 'l-3', current: 0 },
			global,
		})
		await wrapper.findAll('button')[1].trigger('click')
		expect(wrapper.emitted('select')?.[0]).toEqual([1])
	})

	it('shows a visitor no progress', () => {
		const wrapper = mount(ProgramMap, {
			props: { chapters: guest.chapters, current: 0 },
			global,
		})
		const dot = wrapper.findAll('button')[1]
		expect(dot.attributes('data-status')).toBe('none')
		expect(dot.attributes('aria-label')).toBe('Lesson 2. Цели и источники')
	})
})

describe('LessonSlide', () => {
	const slide = (props: Record<string, unknown>) =>
		mount(LessonSlide, {
			props: {
				lesson: { ...enrolled.chapters[1].lessons[0], chapter: 'Выявление' },
				status: 'in-progress',
				position: 2,
				total: 3,
				fallbackUrl: '/lms/courses/course-1/learn/2-1',
				...props,
			},
			global,
		})

	it('counts covered topics and marks each one', () => {
		const wrapper = slide({})
		expect(wrapper.get('[data-testid="slide-count"]').text()).toContain('1 of 3 covered')
		expect(wrapper.findAll('li').map((li) => li.attributes('data-status'))).toEqual([
			'covered',
			'touched',
			'none',
		])
	})

	it('goes to the lesson page until lesson_entry answers, then into the session', () => {
		expect(slide({}).get('[data-testid="slide-action"]').attributes('href')).toBe(
			'/lms/courses/course-1/learn/2-1'
		)
		const wrapper = slide({
			study: { channel: 'web', url: 'https://lms.example.com/chat?lesson=l-2' },
		})
		expect(wrapper.get('[data-testid="slide-action"]').attributes('href')).toBe(
			'https://lms.example.com/chat?lesson=l-2'
		)
		expect(wrapper.text()).toContain('Continue with your mentor')
	})

	it('sends to the own-agent page once trial lessons are used up', () => {
		const wrapper = slide({ study: { channel: 'agent', url: '/agent' } })
		expect(wrapper.text()).toContain('Connect your agent')
	})

	it('offers a completed lesson for repeating', () => {
		expect(slide({ status: 'completed' }).text()).toContain('Repeat with your mentor')
	})

	it('hides topics past six behind a count', async () => {
		const many = Array.from({ length: 8 }, (_, i) => ({ text: `t${i}` }))
		const wrapper = slide({
			lesson: { ...enrolled.chapters[1].lessons[0], objectives: many, chapter: 'Выявление' },
		})
		expect(wrapper.findAll('li')).toHaveLength(6)
		await wrapper.get('button').trigger('click')
		expect(wrapper.findAll('li')).toHaveLength(8)
	})

	it('gives a visitor no count and the way in instead of a session', () => {
		const wrapper = slide({ status: 'none' })
		expect(wrapper.find('[data-testid="slide-count"]').exists()).toBe(false)
		expect(wrapper.text()).toContain('Enroll to study')
	})
})

describe('CourseProgram', () => {
	const fetchMock = vi.fn()

	beforeEach(() => {
		fetchMock.mockReset()
		fetchMock.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					message: { data: { study: { channel: 'web', url: '/chat?lesson=l-3' } } },
				}),
		})
		vi.stubGlobal('fetch', fetchMock)
	})

	it('opens on the next lesson and asks where to study it', async () => {
		const wrapper = mount(CourseProgram, {
			props: { program: enrolled, courseName: 'course-1', enrolled: true },
			global,
		})
		await flushPromises()

		expect(wrapper.get('[aria-current="step"]').attributes('aria-label')).toContain('Lesson 3')
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(String(fetchMock.mock.calls[0][0])).toContain('lesson_entry?lesson=l-3')
		expect(wrapper.get('.slide.is-current [data-testid="slide-action"]').attributes('href')).toBe(
			'/chat?lesson=l-3'
		)
	})

	it('moves to the lesson picked on the map, and asks only once per lesson', async () => {
		const wrapper = mount(CourseProgram, {
			props: { program: enrolled, courseName: 'course-1', enrolled: true },
			global,
		})
		await flushPromises()
		await wrapper.findAll('nav button')[0].trigger('click')
		await flushPromises()
		await wrapper.findAll('nav button')[2].trigger('click')
		await flushPromises()

		expect(wrapper.get('.slide.is-current').attributes('data-index')).toBe('2')
		expect(fetchMock).toHaveBeenCalledTimes(2)
	})

	it('asks nothing for a visitor and points at the lesson page', async () => {
		const wrapper = mount(CourseProgram, {
			props: { program: guest, courseName: 'course-1', enrolled: false },
			global,
		})
		await flushPromises()

		expect(fetchMock).not.toHaveBeenCalled()
		expect(wrapper.get('.slide.is-current [data-testid="slide-action"]').attributes('href')).toBe(
			'/lms/courses/course-1/learn/1-1'
		)
	})
})
