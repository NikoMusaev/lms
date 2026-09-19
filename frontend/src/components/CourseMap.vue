<template>
	<div v-if="lessons.length" class="course-map">
		<div
			v-for="chapter in chapters"
			:key="chapter.title"
			class="mb-6 last:mb-0"
		>
			<h3 class="text-ink-gray-7 mb-3 text-base font-semibold">
				{{ chapter.title }}
			</h3>
			<div class="flex flex-wrap gap-2">
				<button
					v-for="lesson in chapter.lessons"
					:key="lesson.id"
					:data-lesson="lesson.id"
					:data-state="stateOf(lesson)"
					:aria-label="labelOf(lesson)"
					:aria-expanded="opened === lesson.id"
					type="button"
					class="hex flex items-center justify-center"
					:class="[
						cellClass(stateOf(lesson)),
						opened === lesson.id ? 'ring-2 ring-outline-gray-4' : '',
					]"
					@click="toggle(lesson.id)"
				>
					<span
						v-if="lesson.icon"
						:class="`lucide-${lesson.icon} size-5`"
						aria-hidden="true"
					/>
					<span v-else class="text-lg font-semibold">{{ lesson.number }}</span>
				</button>
			</div>
		</div>

		<div
			v-if="openedLesson"
			data-objectives
			class="border-outline-gray-2 bg-surface-gray-1 mt-2 rounded border p-4"
		>
			<p class="text-ink-gray-8 mb-2 font-semibold">
				{{ openedLesson.number }}. {{ openedLesson.title }}
			</p>
			<p v-if="!openedLesson.objectives.length" class="text-ink-gray-5 text-sm">
				{{ __('No objectives yet') }}
			</p>
			<ul v-else class="space-y-1">
				<li
					v-for="objective in openedLesson.objectives"
					:key="objective.text"
					:data-status="objective.status || 'none'"
					class="text-ink-gray-7 flex items-start gap-2 text-sm"
				>
					<span aria-hidden="true">{{ marker(objective) }}</span>
					<span>{{ objective.text }}</span>
				</li>
			</ul>
		</div>

		<div class="text-ink-gray-5 mt-4 flex flex-wrap gap-4 text-xs">
			<span class="flex items-center gap-1">
				<span class="legend bg-surface-gray-7" aria-hidden="true" />
				{{ __('Covered') }}
			</span>
			<span class="flex items-center gap-1">
				<span class="legend legend-partial" aria-hidden="true" />
				{{ __('Partly covered') }}
			</span>
			<span class="flex items-center gap-1">
				<span class="legend bg-surface-gray-2" aria-hidden="true" />
				{{ __('Not yet') }}
			</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { cellState, type MapObjective } from '@/utils/courseMap'

type MapLesson = {
	id: string
	number: number
	title: string
	icon?: string | null
	objectives: MapObjective[]
}

type MapChapter = { title: string; lessons: MapLesson[] }

const props = defineProps<{ chapters: MapChapter[] }>()

const opened = ref<string | null>(null)

const lessons = computed<MapLesson[]>(() =>
	props.chapters.flatMap((chapter) => chapter.lessons)
)

const openedLesson = computed<MapLesson | undefined>(() =>
	lessons.value.find((lesson) => lesson.id === opened.value)
)

function stateOf(lesson: MapLesson) {
	return cellState(lesson.objectives)
}

/**
 * A screen reader gets the same thing the eye does: which lesson, and how far
 * along it is. Fill and colour say nothing to it, so the counts are spelled out.
 */
function labelOf(lesson: MapLesson) {
	const covered = lesson.objectives.filter(
		(objective) => objective.status === 'covered'
	).length
	return `${lesson.number}. ${lesson.title} — ${covered}/${lesson.objectives.length}`
}

/*
 * Every state carries a background, never a border: the hexagon is a clip-path,
 * and it cuts a border down to two vertical slivers where the sides ran. An
 * outlined cell looked like a pair of sticks on the stand, while jsdom, which
 * does not apply clip-path, showed the tests nothing wrong.
 */
function cellClass(state: string) {
	if (state === 'full') return 'bg-surface-gray-7 text-ink-base'
	if (state === 'partial') return 'hex-partial text-ink-gray-8'
	return 'bg-surface-gray-2 text-ink-gray-6'
}

function marker(objective: MapObjective) {
	if (objective.status === 'covered') return '●'
	if (objective.status === 'touched') return '◐'
	return '○'
}

function toggle(lesson: string) {
	opened.value = opened.value === lesson ? null : lesson
}
</script>

<style scoped>
/*
 * The honeycomb is a clip-path, not an image or an SVG per cell: a button stays
 * a button, so focus, keyboard and hit-testing keep working for free.
 */
.hex {
	width: 4.5rem;
	height: 5rem;
	clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
}

/*
 * Half-covered is drawn as stripes rather than a lighter shade. A shade has to
 * be read against the cell next to it; stripes are legible on their own, in
 * both themes, and to anyone who does not separate those shades.
 */
.hex-partial {
	background: repeating-linear-gradient(
		45deg,
		var(--surface-gray-4) 0 6px,
		var(--surface-gray-2) 6px 12px
	);
}

.legend {
	width: 0.75rem;
	height: 0.75rem;
	display: inline-block;
	border-radius: 2px;
}

.legend-partial {
	background: repeating-linear-gradient(
		45deg,
		var(--surface-gray-4) 0 3px,
		var(--surface-gray-2) 3px 6px
	);
}

@media (max-width: 640px) {
	.hex {
		width: 3.5rem;
		height: 4rem;
	}
}
</style>
