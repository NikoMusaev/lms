import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { LESSONS, pluralMessage, plural, STUDENTS } from '@/utils/plural'

// learning-services#325: «1 Студенты» and «4 разделов · 8 уроки» become the
// right form of the noun for the count.

const RU = {
	'{0} lesson': '{0} урок',
	'{0} lessons [few]': '{0} урока',
	'{0} lessons [many]': '{0} уроков',
	'{0} lessons': '{0} урока',
}

describe('pluralMessage', () => {
	it('picks one, few and many for Russian', () => {
		expect(pluralMessage(1, LESSONS, 'ru', RU)).toBe('{0} lesson')
		expect(pluralMessage(21, LESSONS, 'ru', RU)).toBe('{0} lesson')
		expect(pluralMessage(3, LESSONS, 'ru', RU)).toBe('{0} lessons [few]')
		expect(pluralMessage(8, LESSONS, 'ru', RU)).toBe('{0} lessons [many]')
		expect(pluralMessage(11, LESSONS, 'ru', RU)).toBe('{0} lessons [many]')
	})

	it('uses only one and other for English', () => {
		expect(pluralMessage(1, LESSONS, 'en', {})).toBe('{0} lesson')
		expect(pluralMessage(3, LESSONS, 'en', {})).toBe('{0} lessons')
		expect(pluralMessage(8, LESSONS, 'en', {})).toBe('{0} lessons')
	})

	it('falls back to other where a language has no few or many translated', () => {
		// Russian rules, but a catalogue without the extra forms: better the
		// plain plural than an English message with a [few] tag.
		expect(pluralMessage(3, STUDENTS, 'ru', {})).toBe('{0} students')
	})
})

describe('plural', () => {
	beforeEach(() => {
		vi.stubGlobal('translatedMessages', RU)
		vi.stubGlobal('__', (message: string) => ({
			format: (value: string) =>
				((RU as Record<string, string>)[message] ?? message).replace('{0}', value),
		}))
		document.documentElement.lang = 'ru'
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		document.documentElement.lang = ''
	})

	it('writes the count with its noun', () => {
		expect(plural(1, LESSONS)).toBe('1 урок')
		expect(plural(4, LESSONS)).toBe('4 урока')
		expect(plural(8, LESSONS)).toBe('8 уроков')
	})

	it('shows the display text while the count picks the form', () => {
		expect(plural(50, LESSONS, '50+')).toBe('50+ уроков')
	})
})
