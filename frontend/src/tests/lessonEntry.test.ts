import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LessonEntry, { type LessonEntryData } from '@/components/LessonEntry.vue'

// Mirrors src/translation.js: a message carrying {0}-style placeholders returns
// a { format } object, not a string.
const __ = (message: string) => {
	if (!/{\d+}/.test(message)) return message
	return {
		format: (...args: unknown[]) =>
			message.replace(/{(\d+)}/g, (match, number) =>
				typeof args[number] !== 'undefined' ? String(args[number]) : match
			),
	}
}

const entry = (overrides: Partial<LessonEntryData> = {}): LessonEntryData => ({
	title: 'Риск как событие',
	hook: 'Зачем это вашему проекту',
	completed: false,
	study: {
		channel: 'web',
		url: 'https://lms.example.com/chat?lesson=l-1',
		demo_left: 2,
	},
	...overrides,
})

const mountEntry = (data: LessonEntryData) =>
	mount(LessonEntry, {
		props: { entry: data, title: data.title },
		global: {
			mocks: { __ },
			stubs: { Button: { template: '<button><slot /></button>' } },
		},
	})

beforeEach(() => {
	vi.stubGlobal('__', __)
})

describe('LessonEntry', () => {
	it('leads into the web chat on this lesson while trial lessons last', () => {
		const wrapper = mountEntry(entry())

		expect(wrapper.get('[data-testid="lesson-study"]').attributes('href')).toBe(
			'https://lms.example.com/chat?lesson=l-1'
		)
		expect(wrapper.text()).toContain('Study with your mentor')
		expect(wrapper.text()).toContain('trial lessons left: 2')
		expect(wrapper.find('[data-testid="lesson-own-agent"]').exists()).toBe(true)
	})

	it('sends to the own-agent page once the trial lessons are used up', () => {
		const wrapper = mountEntry(
			entry({ study: { channel: 'agent', url: '/agent', demo_left: 0 } })
		)

		expect(wrapper.get('[data-testid="lesson-study"]').attributes('href')).toBe(
			'/agent'
		)
		expect(wrapper.text()).toContain('Connect your agent')
		// The button already goes there; a second link to it would be noise.
		expect(wrapper.find('[data-testid="lesson-own-agent"]').exists()).toBe(
			false
		)
	})

	it('shows the hook and never the material', () => {
		const wrapper = mountEntry(entry())

		expect(wrapper.get('[data-testid="lesson-hook"]').text()).toBe(
			'Зачем это вашему проекту'
		)
		expect(wrapper.find('#editor').exists()).toBe(false)
	})

	it('drops the hook paragraph when the author left it empty', () => {
		const wrapper = mountEntry(entry({ hook: null }))

		expect(wrapper.find('[data-testid="lesson-hook"]').exists()).toBe(false)
	})

	it('marks a completed lesson and offers to repeat it', () => {
		const wrapper = mountEntry(entry({ completed: true }))

		expect(wrapper.find('[data-testid="lesson-completed"]').exists()).toBe(true)
		expect(wrapper.text()).toContain('Repeat with your mentor')
	})

	it('does not count trials for a lesson already started in the chat', () => {
		const wrapper = mountEntry(
			entry({
				study: {
					channel: 'web',
					url: 'https://lms.example.com/chat?lesson=l-1',
					demo_left: 0,
				},
			})
		)

		expect(wrapper.text()).toContain('In the browser, with the platform mentor')
		expect(wrapper.text()).not.toContain('trial lessons left')
	})
})
