<template>
	<div>
		<PageHeader
			:breadcrumbs="[
				{ label: __('My documents'), route: { name: 'Documents' } },
			]"
		/>

		<div v-if="!isLoggedIn" class="p-5 text-p-base text-ink-gray-7">
			{{
				__(
					'Course documents are built as you study and are visible only to you.'
				)
			}}
			<a href="/login?redirect-to=/lms/documents" class="underline">{{
				__('Log in')
			}}</a>
		</div>

		<div
			v-else-if="progress.loading && !courses.length"
			class="flex justify-center p-10"
		>
			<LoadingIndicator class="size-5 text-ink-gray-5" />
		</div>

		<div v-else class="mx-auto max-w-3xl space-y-6 p-4 sm:p-5">
			<p v-if="!courses.length" class="text-p-base text-ink-gray-6">
				{{
					__(
						'None of your courses builds a document yet. It will appear here once the course has one.'
					)
				}}
			</p>
			<section v-for="course in shown" :key="course.id" class="space-y-2">
				<h2 class="text-lg-semibold text-ink-gray-9">{{ course.title }}</h2>
				<router-link
					v-for="doc in course.documents"
					:key="doc.artifact"
					:to="{
						name: 'Document',
						params: { courseName: course.id, artifact: doc.artifact },
					}"
					class="flex items-center gap-4 rounded-lg border border-outline-gray-2 bg-surface-base p-4 hover:border-outline-gray-4"
					:data-testid="`document-${doc.artifact}`"
				>
					<span
						class="lucide-file-text size-5 shrink-0 text-ink-gray-5"
						aria-hidden="true"
					/>
					<span class="min-w-0 flex-1">
						<span class="block text-p-base font-medium text-ink-gray-9">{{
							doc.title
						}}</span>
						<span class="mt-1 block text-p-sm text-ink-gray-6">
							{{
								__('Filled {0} of {1}').format(
									String(doc.blocks_filled),
									String(doc.blocks_total)
								)
							}}
						</span>
					</span>
					<span class="w-24 shrink-0">
						<ProgressBar :progress="percent(doc)" />
					</span>
				</router-link>
			</section>
			<p v-if="filtered" class="text-p-sm">
				<router-link
					:to="{ name: 'Documents' }"
					class="text-ink-gray-7 underline"
				>
					{{ __('All documents') }}
				</router-link>
			</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { createResource, LoadingIndicator, usePageMeta } from 'frappe-ui'
import PageHeader from '@/components/Layouts/PageHeader.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import { sessionStore } from '@/stores/session'

interface DocumentSummary {
	artifact: string
	title: string
	blocks_total: number
	blocks_filled: number
}

interface CourseDocuments {
	id: string
	title: string
	documents: DocumentSummary[]
}

const { isLoggedIn } = sessionStore()
const route = useRoute()

// The student's courses with their documents — the same summary the agent
// reads, so the counts agree.
const progress = createResource({
	url: 'lms_frappe_app.api.student.get_my_progress',
	method: 'GET',
	auto: Boolean(isLoggedIn),
})

const courses = computed<CourseDocuments[]>(() => {
	const answer = progress.data as {
		ok?: boolean
		data?: { courses?: CourseDocuments[] }
	} | null
	return (answer?.data?.courses ?? []).filter((c) => c.documents?.length)
})

// «Мои документы» from a lesson's chat opens on that course (#303); a course
// that is not the student's, or has no documents, shows them all instead.
const filtered = computed(() => {
	const course = route.query.course
	return typeof course === 'string' &&
		courses.value.some((c) => c.id === course)
		? course
		: null
})
const shown = computed(() =>
	filtered.value
		? courses.value.filter((c) => c.id === filtered.value)
		: courses.value
)

const percent = (doc: DocumentSummary) =>
	doc.blocks_total
		? Math.round((doc.blocks_filled / doc.blocks_total) * 100)
		: 0

usePageMeta(() => ({ title: __('My documents') }))
</script>
