import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { DocumentData, DocTable } from '@/utils/documentTable'

// learning-services#331: the cell, the table and a block as the student meets
// them on «Мои документы».

vi.mock('frappe-ui', () => ({
	Button: {
		props: ['label', 'variant', 'theme', 'size'],
		emits: ['click'],
		template:
			'<button type="button" :aria-label="label" @click="$emit(\'click\')"><slot name="prefix" /><slot name="icon" />{{ label }}</button>',
	},
}))
vi.mock('@/utils/composables', () => ({
	useScreenSize: () => ({ isMobile: false }),
}))

import TableCell from '@/components/Documents/TableCell.vue'
import DocTableEditor from '@/components/Documents/DocTableEditor.vue'
import DocumentBlock from '@/components/Documents/DocumentBlock.vue'

const __ = (message: string) => {
	if (!/{\d+}/.test(message)) return message
	return {
		format: (...args: unknown[]) =>
			message.replace(/{(\d+)}/g, (match, n) =>
				args[Number(n)] === undefined ? match : String(args[Number(n)])
			),
	}
}

const global = {
	mocks: { __ },
	stubs: { 'router-link': { template: '<a><slot /></a>' } },
}

beforeEach(() => {
	vi.stubGlobal('__', __)
})

const register: DocTable = {
	name: 'register',
	title: 'Реестр',
	owner: 'risks',
	prefix: 'R',
	markdown: '',
	views: [],
	columns: [
		{
			key: 'event',
			title: 'Событие',
			type: 'text',
			block: 'risks',
			required: true,
		},
		{
			key: 'probability',
			title: 'Вероятность',
			type: 'scale',
			block: 'assessment',
			min: 1,
			max: 5,
			required: true,
		},
		{ key: 'rank', title: 'Ранг', type: 'formula', block: 'assessment' },
		{ key: 'in_work', title: 'В работе', type: 'formula', block: 'assessment' },
	],
	rows: [
		{
			id: 'R1',
			event: 'Подрядчик уйдёт',
			probability: 4,
			rank: 16,
			in_work: true,
		},
		{ id: 'R2', event: 'уточнить у Анны', in_work: null },
	],
}

const blocks = [
	{
		key: 'risks',
		title: 'Риски',
		hint: '',
		lesson: null,
		span: 1,
		kind: 'text',
		accept: [],
		content: '',
		file: null,
		url: null,
		preview: null,
		table: 'register',
		columns: register.columns.slice(0, 1),
		fields: [],
		filled: true,
		empty_cells: [],
	},
	{
		key: 'assessment',
		title: 'Оценка',
		hint: 'Готов, когда…',
		lesson: null,
		span: 1,
		kind: 'text',
		accept: [],
		content: '',
		file: null,
		url: null,
		preview: null,
		table: 'register',
		columns: register.columns.slice(1),
		fields: [
			{
				key: 'threshold',
				title: 'Порог внимания',
				type: 'number',
				required: true,
			},
		],
		filled: false,
		empty_cells: [{ row: 'R2', column: 'probability' }],
	},
] as DocumentData['blocks']

describe('TableCell', () => {
	it('shows a formula read-only and a blank required cell as one to fill', () => {
		const rank = mount(TableCell, {
			props: { row: register.rows[0], column: register.columns[2], tables: {} },
			global,
		})
		expect(rank.text()).toBe('16')
		expect(rank.find('button').exists()).toBe(false)

		const blank = mount(TableCell, {
			props: { row: register.rows[1], column: register.columns[1], tables: {} },
			global,
		})
		expect(blank.classes()).toContain('is-missing')
	})

	it('saves a scale as a number, and nothing when unchanged', async () => {
		const cell = mount(TableCell, {
			props: { row: register.rows[0], column: register.columns[1], tables: {} },
			global,
		})
		await cell.get('button').trigger('click')
		const select = cell.get('select')
		await select.setValue('4')
		expect(cell.emitted('save')).toBeUndefined()
		await cell.get('button').trigger('click')
		await cell.get('select').setValue('5')
		expect(cell.emitted('save')?.[0]).toEqual([5])
	})

	it('marks «уточнить у …»', () => {
		const cell = mount(TableCell, {
			props: { row: register.rows[1], column: register.columns[0], tables: {} },
			global,
		})
		expect(cell.classes()).toContain('is-clarify')
	})
})

describe('DocTableEditor', () => {
	const editor = () =>
		mount(DocTableEditor, {
			props: {
				table: register,
				tables: { register },
				blocks,
				canEditRows: true,
			},
			global,
		})

	it('heads columns by the block that adds them', () => {
		const heads = editor()
			.findAll('thead tr:first-child th')
			.map((th) => th.text())
		expect(heads).toEqual(['ID', 'Риски', 'Оценка', 'Row actions'])
	})

	it('narrows to rows in work and to rows with empty cells', async () => {
		const wrapper = editor()
		const [inWork, empty] = wrapper.findAll('button.chip')
		await inWork.trigger('click')
		expect(
			wrapper.findAll('tbody tr[data-row]').map((r) => r.attributes('data-row'))
		).toEqual(['R1'])
		await inWork.trigger('click')
		await empty.trigger('click')
		expect(
			wrapper.findAll('tbody tr[data-row]').map((r) => r.attributes('data-row'))
		).toEqual(['R2'])
	})

	it('asks before deleting a row', async () => {
		const wrapper = editor()
		const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
		await wrapper.get('button[aria-label="Delete R1"]').trigger('click')
		expect(confirm).toHaveBeenCalled()
		expect(wrapper.emitted('deleteRow')?.[0]).toEqual(['R1'])
	})
})

describe('DocumentBlock', () => {
	const document = {
		course: 'c1',
		artifact: 'risk_register',
		title: 'Реестр',
		layout: 'sections',
		blocks,
		tables: { register },
		fields: {},
	} as DocumentData
	const api = {
		setField: vi.fn(),
		setCell: vi.fn(),
		addRow: vi.fn(),
		deleteRow: vi.fn(),
		write: vi.fn(),
		upload: vi.fn(),
	}

	it('draws the whole table at the block that starts its rows, the own columns elsewhere', () => {
		const owner = mount(DocumentBlock, {
			props: { block: blocks[0], document, api: api as never },
			global,
		})
		const other = mount(DocumentBlock, {
			props: { block: blocks[1], document, api: api as never },
			global,
		})
		const heads = (w: typeof owner) =>
			w.findAll('thead tr:first-child th').map((th) => th.text())
		expect(heads(owner)).toEqual(['ID', 'Риски', 'Оценка', 'Row actions'])
		// Another lesson's block: the row's name and its own columns, no rows to add.
		expect(heads(other)).toEqual(['ID', 'Реестр', 'Оценка'])
		expect(other.find('button[aria-label="Delete R1"]').exists()).toBe(false)
		expect(other.text()).toContain('The whole table «Реестр»')
		// Its empty cells are its own: R2 lacks a probability, nothing else counts.
		expect(other.findAll('button.chip')[1].text()).toContain('1')
	})

	it('saves a field through the document api', async () => {
		const wrapper = mount(DocumentBlock, {
			props: { block: blocks[1], document, api: api as never },
			global,
		})
		const input = wrapper.get('[data-testid="block-fields"] input')
		await input.setValue('12')
		await input.trigger('change')
		await flushPromises()
		expect(api.setField).toHaveBeenCalledWith('assessment', 'threshold', '12')
	})

	it('says what the block lacks', () => {
		const wrapper = mount(DocumentBlock, {
			props: { block: blocks[1], document, api: api as never },
			global,
		})
		expect(wrapper.get('[data-testid="block-status"]').text()).toBe('1 to fill')
	})
})
