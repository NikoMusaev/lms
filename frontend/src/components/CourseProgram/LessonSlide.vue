<template>
	<article
		class="flex h-full flex-col rounded-lg border bg-surface-base p-5"
		:aria-label="
			__('Lesson {0} of {1}').format(String(position), String(total))
		"
	>
		<div
			class="flex items-center justify-between gap-3 text-p-sm text-ink-gray-5"
		>
			<span class="truncate">
				{{ lesson.chapter }} ·
				{{ __('lesson {0} of {1}').format(String(position), String(total)) }}
			</span>
			<span
				v-if="statusLabel"
				data-testid="slide-status"
				class="shrink-0 rounded-full px-2 py-0.5 text-p-xs font-medium"
				:class="statusClass"
				>{{ statusLabel }}</span
			>
		</div>

		<h3 class="mt-2 text-xl-semibold text-ink-gray-9">
			{{ lesson.title }}
		</h3>

		<p
			v-if="lesson.hook"
			data-testid="slide-hook"
			class="mt-2 text-p-base text-ink-gray-7 whitespace-pre-line"
		>
			{{ lesson.hook }}
		</p>

		<section v-if="lesson.objectives.length" class="mt-5">
			<h4 class="text-p-sm font-medium text-ink-gray-8">
				{{ __('Topics') }}
				<span
					v-if="status !== 'none'"
					data-testid="slide-count"
					class="font-normal text-ink-gray-5"
				>
					·
					{{
						__('{0} of {1} covered').format(
							String(count.covered),
							String(count.total)
						)
					}}
				</span>
			</h4>
			<ul class="mt-2 space-y-1.5">
				<li
					v-for="objective in visibleObjectives"
					:key="objective.text"
					class="flex items-start gap-2 text-p-sm text-ink-gray-8"
					:data-status="objective.status || 'none'"
				>
					<span
						class="mt-px w-4 shrink-0 text-center"
						:class="markerClass(objective)"
						aria-hidden="true"
						>{{ marker(objective) }}</span
					>
					<span>
						{{ objective.text }}
						<span v-if="status !== 'none'" class="sr-only">
							— {{ statusWord(objective) }}</span
						>
					</span>
				</li>
			</ul>
			<button
				v-if="hiddenCount"
				type="button"
				class="mt-2 text-p-sm text-ink-gray-6 underline underline-offset-2"
				@click="showAll = true"
			>
				{{ __('{0} more').format(String(hiddenCount)) }}
			</button>
		</section>

		<div class="mt-auto pt-6">
			<a
				:href="safeUrl(action.url)"
				data-testid="slide-action"
				class="inline-block"
			>
				<Button variant="solid" size="md">
					{{ action.label }}
				</Button>
			</a>
		</div>
	</article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from 'frappe-ui'
import { safeUrl } from '@/utils/safeUrl'
import {
	topicCount,
	type LessonStatus,
	type ProgramLesson,
	type ProgramObjective,
} from '@/utils/courseProgram'

const props = defineProps<{
	lesson: ProgramLesson & { chapter: string }
	status: LessonStatus
	position: number
	total: number
	/** Where studying this lesson leads, from lesson_entry; absent until asked. */
	study?: { channel: 'web' | 'agent'; url: string } | null
	/**
	 * The lesson page. The button goes there until `study` answers, and for a
	 * visitor or a student not enrolled — the page offers to log in or enrol.
	 */
	fallbackUrl: string
}>()

// Six fit a slide without pushing the button off a laptop screen.
const FIRST_TOPICS = 6
const showAll = ref(false)

const count = computed(() => topicCount(props.lesson.objectives))
const visibleObjectives = computed(() =>
	showAll.value
		? props.lesson.objectives
		: props.lesson.objectives.slice(0, FIRST_TOPICS)
)
const hiddenCount = computed(
	() => props.lesson.objectives.length - visibleObjectives.value.length
)

const statusLabel = computed(() => {
	switch (props.status) {
		case 'completed':
			return __('Lesson passed')
		case 'in-progress':
			return __('In progress')
		case 'next':
			return __('Up next')
		default:
			return ''
	}
})

const statusClass = computed(() =>
	props.status === 'completed' || props.status === 'next'
		? 'bg-surface-green-2 text-ink-green-8'
		: 'bg-surface-gray-2 text-ink-gray-7'
)

const action = computed(() => {
	if (props.status === 'none')
		return { label: __('Enroll to study'), url: props.fallbackUrl }
	const url = props.study?.url || props.fallbackUrl
	if (props.study?.channel === 'agent')
		return { label: __('Connect your agent'), url }
	if (props.status === 'completed')
		return { label: __('Repeat with your mentor'), url }
	if (props.status === 'in-progress')
		return { label: __('Continue with your mentor'), url }
	return { label: __('Study with your mentor'), url }
})

function marker(objective: ProgramObjective): string {
	if (objective.status === 'covered') return '●'
	if (objective.status === 'touched') return '◐'
	return '○'
}

function markerClass(objective: ProgramObjective): string {
	if (objective.status === 'covered') return 'text-ink-green-6'
	if (objective.status === 'touched') return 'text-ink-green-5'
	return 'text-ink-gray-4'
}

function statusWord(objective: ProgramObjective): string {
	if (objective.status === 'covered') return __('covered')
	if (objective.status === 'touched') return __('touched in passing')
	return __('not yet')
}
</script>
