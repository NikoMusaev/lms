<template>
	<div v-if="lessons.length" ref="root" class="course-map">
		<div
			v-for="chapter in chapters"
			:key="chapter.title"
			class="mb-6 last:mb-0"
		>
			<h3 class="text-ink-gray-7 mb-3 text-base font-semibold">
				{{ chapter.title }}
			</h3>
			<div class="relative" :style="{ height: chapterHeight(chapter) }">
				<button
					v-for="(lesson, index) in chapter.lessons"
					:key="lesson.id"
					:data-lesson="lesson.id"
					:data-state="stateOf(lesson)"
					:aria-label="labelOf(lesson)"
					:aria-expanded="openedId === lesson.id"
					:style="cellStyle(index)"
					type="button"
					class="hex absolute flex flex-col items-center justify-center gap-1 px-2 text-center"
					:class="[
						cellClass(stateOf(lesson)),
						pinned === lesson.id ? 'ring-outline-gray-4 ring-2' : '',
					]"
					@click="pin(lesson.id)"
					@mouseenter="hovered = lesson.id"
					@mouseleave="hovered = null"
					@focus="hovered = lesson.id"
					@blur="hovered = null"
				>
					<span
						v-if="lesson.icon"
						:class="`lucide-${lesson.icon} size-4`"
						aria-hidden="true"
					/>
					<span v-else class="text-sm font-semibold">{{ lesson.number }}</span>
					<span class="caption text-[0.6rem] leading-tight">
						{{ lesson.title }}
					</span>
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { cellState, hexPosition, type MapObjective } from '@/utils/courseMap'

type MapLesson = {
	id: string
	number: number
	title: string
	icon?: string | null
	objectives: MapObjective[]
}

type MapChapter = { title: string; lessons: MapLesson[] }

const props = defineProps<{ chapters: MapChapter[] }>()

/** Cell box in pixels: taller than wide, the proportions of a pointy-top hexagon. */
const CELL_WIDTH = 96
const CELL_HEIGHT = 108

const root = ref<HTMLElement | null>(null)
const columns = ref(3)
const pinned = ref<string | null>(null)
const hovered = ref<string | null>(null)

let observer: ResizeObserver | null = null

onMounted(() => {
	const measure = () => {
		const width = root.value?.clientWidth || 0
		// Two is the floor: a single column is a list, and the outline below is
		// already a list.
		columns.value = Math.max(2, Math.floor(width / CELL_WIDTH))
	}
	measure()
	if (typeof ResizeObserver !== 'undefined' && root.value) {
		observer = new ResizeObserver(measure)
		observer.observe(root.value)
	}
})

onBeforeUnmount(() => observer?.disconnect())

const lessons = computed<MapLesson[]>(() =>
	props.chapters.flatMap((chapter) => chapter.lessons)
)

/**
 * A pinned cell wins over a hovered one: a phone has no hover, so a tap has to
 * keep the objectives open while the reader actually reads them.
 */
const openedId = computed<string | null>(() => pinned.value || hovered.value)

const openedLesson = computed<MapLesson | undefined>(() =>
	lessons.value.find((lesson) => lesson.id === openedId.value)
)

function cellStyle(index: number) {
	const { x, y } = hexPosition(index, columns.value)
	return {
		left: `${x * CELL_WIDTH}px`,
		top: `${y * CELL_HEIGHT}px`,
		width: `${CELL_WIDTH}px`,
		height: `${CELL_HEIGHT}px`,
	}
}

function chapterHeight(chapter: MapChapter) {
	const rows = Math.ceil(chapter.lessons.length / columns.value)
	// Rows interlock: each one above the last covers a quarter of the next.
	return `${(rows - 1) * 0.75 * CELL_HEIGHT + CELL_HEIGHT}px`
}

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
 * applies no clip-path, showed the tests nothing wrong.
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

function pin(lesson: string) {
	pinned.value = pinned.value === lesson ? null : lesson
}
</script>

<style scoped>
/*
 * The honeycomb is a clip-path, not an image or an SVG per cell: a button stays
 * a button, so focus, keyboard and hit-testing keep working for free.
 */
.hex {
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

/* Three lines of a title is all a cell this size can hold honestly. */
.caption {
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
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
</style>
