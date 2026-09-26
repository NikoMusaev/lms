<template>
	<div class="report-page">
		<div class="print:hidden">
			<PageHeader :breadcrumbs="breadcrumbs">
				<template #actions>
					<Button variant="solid" :label="__('Print or save as PDF')" @click="print">
						<template #prefix>
							<span class="lucide-printer size-4" />
						</template>
					</Button>
				</template>
			</PageHeader>
		</div>

		<div v-if="api.resource.loading && !doc" class="flex justify-center p-10">
			<LoadingIndicator class="size-5 text-ink-gray-5" />
		</div>

		<article v-else-if="doc && report" class="mx-auto max-w-4xl space-y-5 p-5 print:p-0">
			<header class="space-y-1">
				<p class="text-p-sm text-ink-gray-5">{{ courseTitle }} · {{ today }}</p>
				<h1 class="text-2xl-semibold text-ink-gray-9">{{ report.title }}</h1>
			</header>

			<p v-if="!report.rows.length" class="text-p-base text-ink-gray-6">
				{{ __('No rows are ticked for the report yet. Tick them in the table.') }}
			</p>

			<ol v-else class="space-y-4">
				<li
					v-for="row in report.rows"
					:key="row.id"
					class="break-inside-avoid rounded-lg border border-outline-gray-2 p-4"
				>
					<div class="text-p-xs font-medium text-ink-gray-5">{{ row.id }}</div>
					<dl class="mt-1 grid gap-x-4 gap-y-2 sm:grid-cols-[10rem_1fr]">
						<template v-for="column in report.columns" :key="column.key">
							<dt class="text-p-sm text-ink-gray-5">{{ column.title }}</dt>
							<dd class="text-p-base text-ink-gray-9">
								{{ cell(column, row) || '—' }}
							</dd>
						</template>
					</dl>
				</li>
			</ol>

			<p v-if="report.dateLabel" class="text-p-base text-ink-gray-8">
				{{ report.dateLabel }}: <strong>{{ report.date || '—' }}</strong>
			</p>
		</article>

		<p v-else-if="doc" class="p-5 text-p-base text-ink-gray-6">
			{{ __('This document has no report.') }}
		</p>
	</div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { Button, createResource, LoadingIndicator, usePageMeta } from 'frappe-ui'
import PageHeader from '@/components/Layouts/PageHeader.vue'
import { useDocument } from '@/composables/useDocument'
import {
	cellOptions,
	formatCell,
	reportRows,
	type DocColumn,
	type DocRow,
	type ReportView,
} from '@/utils/documentTable'

const props = defineProps<{ courseName: string; artifact: string; table: string }>()

const api = useDocument(toRef(props, 'courseName'), toRef(props, 'artifact'))
const doc = api.document

const courseMap = createResource({
	url: 'lms_frappe_app.api.public.course_map',
	method: 'GET',
	makeParams: () => ({ course: props.courseName }),
	auto: true,
})
const courseTitle = computed(
	() => (courseMap.data as { data?: { title?: string } } | null)?.data?.title ?? ''
)

const today = new Date().toLocaleDateString('ru-RU')

const report = computed(() => {
	const table = doc.value?.tables[props.table]
	const view = table?.views.find((v) => v.type === 'report') as ReportView | undefined
	if (!table || !view) return null
	const { columns, rows } = reportRows(table, view)
	const field = view.field
		? doc.value?.blocks.flatMap((b) => b.fields ?? []).find((f) => f.key === view.field)
		: undefined
	return {
		title: view.title || __('Report for the sponsor'),
		columns,
		rows,
		dateLabel: field?.title ?? '',
		date: field ? formatCell(field, doc.value?.fields[field.key]) : '',
	}
})

// A scale or a reference reads better by its label than by its number.
function cell(column: DocColumn, row: DocRow): string {
	const option = cellOptions(column, doc.value?.tables ?? {}).find(
		(o) => String(o.value) === String(row[column.key])
	)
	return option && column.type !== 'select' ? option.label : formatCell(column, row[column.key])
}

const breadcrumbs = computed(() => [
	{ label: __('My documents'), route: { name: 'Documents' } },
	{
		label: doc.value?.title ?? __('Document'),
		route: {
			name: 'Document',
			params: { courseName: props.courseName, artifact: props.artifact },
		},
	},
	{ label: report.value?.title ?? __('Report') },
])

const print = () => window.print()

usePageMeta(() => ({ title: report.value?.title ?? __('Report') }))
</script>

<style>
/* The report prints alone: the app's sidebar and header stay on screen. */
@media print {
	body * {
		visibility: hidden;
	}
	.report-page,
	.report-page * {
		visibility: visible;
	}
	.report-page {
		position: absolute;
		inset: 0;
	}
	.report-page .print\:hidden {
		display: none;
	}
}
</style>
