<template>
	<div class="space-y-4" data-testid="course-program">
		<ProgramMap
			:chapters="program.chapters"
			:nextLesson="program.next_lesson"
			:current="current"
			@select="select"
		/>

		<!-- overflow-hidden: the slides' own width must not leak into the page's
		scroll width, which it did through the layout's scrolling main. -->
		<div
			class="relative overflow-hidden"
			role="region"
			:aria-roledescription="__('carousel')"
			:aria-label="__('Lessons of the course')"
			tabindex="0"
			@keydown.left.prevent="select(current - 1)"
			@keydown.right.prevent="select(current + 1)"
		>
			<div ref="scroller" class="slides" data-testid="program-slides">
				<div
					v-for="(lesson, index) in lessons"
					:key="lesson.id"
					:ref="(el) => (slides[index] = el as HTMLElement)"
					class="slide"
					:class="{ 'is-current': index === current }"
					:data-index="index"
					:aria-hidden="index === current ? undefined : 'true'"
					@click="index !== current && select(index)"
				>
					<LessonSlide
						:lesson="lesson"
						:status="lessonStatus(lesson, program.next_lesson)"
						:position="index + 1"
						:total="lessons.length"
						:study="studies[lesson.id]"
						:fallbackUrl="lessonUrl(lesson)"
					/>
				</div>
			</div>

			<Button
				v-if="!isMobile"
				class="arrow start-0"
				variant="outline"
				:disabled="current === 0"
				:label="__('Previous lesson')"
				@click="select(current - 1)"
			>
				<template #icon>
					<span class="lucide-chevron-left size-4" />
				</template>
			</Button>
			<Button
				v-if="!isMobile"
				class="arrow end-0"
				variant="outline"
				:disabled="current === lessons.length - 1"
				:label="__('Next lesson')"
				@click="select(current + 1)"
			>
				<template #icon>
					<span class="lucide-chevron-right size-4" />
				</template>
			</Button>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	computed,
	nextTick,
	onBeforeUnmount,
	onMounted,
	reactive,
	ref,
	watch,
} from 'vue'
import { Button } from 'frappe-ui'
import { useRouter } from 'vue-router'
import { useScreenSize } from '@/utils/composables'
import ProgramMap from '@/components/CourseProgram/ProgramMap.vue'
import LessonSlide from '@/components/CourseProgram/LessonSlide.vue'
import {
	flattenLessons,
	lessonStatus,
	startIndex,
	type ProgramData,
} from '@/utils/courseProgram'

// The course program: a map of the lessons and a slider of lesson cards, in
// place of the honeycomb and the outline (learning-services#322). Data comes
// from lms_frappe_app's course_map; where to study a lesson, from lesson_entry,
// asked only for the slide on screen.

const props = defineProps<{
	program: ProgramData
	courseName: string
	enrolled: boolean
}>()

const router = useRouter()
const { isMobile } = useScreenSize()

const lessons = computed(() => flattenLessons(props.program.chapters))
const current = ref(startIndex(lessons.value, props.program.next_lesson))
const scroller = ref<HTMLElement | null>(null)
const slides: HTMLElement[] = []

type Study = { channel: 'web' | 'agent'; url: string }
const studies = reactive<Record<string, Study | null>>({})

const reducedMotion = (): boolean =>
	typeof window !== 'undefined' &&
	window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function scrollTo(index: number, smooth: boolean): void {
	const slide = slides[index]
	const box = scroller.value
	if (!slide || !box) return
	// The scroller alone moves: scrollIntoView would drag the page along with it.
	const left = slide.offsetLeft - (box.clientWidth - slide.clientWidth) / 2
	box.scrollTo?.({
		left,
		behavior: smooth && !reducedMotion() ? 'smooth' : 'auto',
	})
}

function select(index: number): void {
	if (index < 0 || index >= lessons.value.length) return
	current.value = index
	scrollTo(index, true)
}

// The page is the fallback: it offers the way in, or a log-in or enrolment to
// someone who cannot study yet.
function lessonUrl(lesson: { chapterIndex: number; id: string }): string {
	const chapter = props.program.chapters[lesson.chapterIndex]
	const lessonNumber = chapter.lessons.findIndex((l) => l.id === lesson.id) + 1
	return router.resolve({
		name: 'Lesson',
		params: {
			courseName: props.courseName,
			chapterNumber: lesson.chapterIndex + 1,
			lessonNumber,
		},
	}).href
}

// GET-only on the server, like the course map; asked once per lesson.
async function loadStudy(lessonId: string): Promise<void> {
	if (!props.enrolled || lessonId in studies) return
	studies[lessonId] = null
	try {
		const response = await fetch(
			`/api/method/lms_frappe_app.api.public.lesson_entry?lesson=${encodeURIComponent(
				lessonId
			)}`,
			{ headers: { Accept: 'application/json' }, credentials: 'same-origin' }
		)
		const body = response.ok ? await response.json() : null
		studies[lessonId] = body?.message?.data?.study ?? null
	} catch {
		studies[lessonId] = null
	}
}

watch(
	() => lessons.value[current.value]?.id,
	(id) => {
		if (id) loadStudy(id)
	},
	{ immediate: true }
)

let observer: IntersectionObserver | null = null

onMounted(async () => {
	await nextTick()
	scrollTo(current.value, false)
	if (typeof IntersectionObserver === 'undefined' || !scroller.value) return
	// A swipe moves the slides without telling us; the slide that settles in the
	// middle becomes the current one.
	observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting && entry.intersectionRatio >= 0.6)
					current.value = Number((entry.target as HTMLElement).dataset.index)
			}
		},
		{ root: scroller.value, threshold: [0.6] }
	)
	slides.forEach((slide) => slide && observer?.observe(slide))
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.slides {
	display: flex;
	/* Each card as tall as its own lesson: stretching to the longest left a gap
	   between a short lesson's topics and its button. */
	align-items: flex-start;
	gap: 1rem;
	overflow-x: auto;
	scroll-snap-type: x mandatory;
	scrollbar-width: none;
	/* Room for the first and last slides to sit in the middle too. */
	padding-inline: calc((100% - var(--slide-width)) / 2);
	--slide-width: min(35rem, 85%);
}

.slides::-webkit-scrollbar {
	display: none;
}

.slide {
	flex: 0 0 var(--slide-width);
	scroll-snap-align: center;
	opacity: 0.45;
	transition: opacity 150ms ease;
}

.slide.is-current {
	opacity: 1;
}

/* A neighbour's edge is a way to it, not a way into its lesson: a click there
   scrolls the slider rather than following the neighbour's button. */
.slide:not(.is-current) {
	cursor: pointer;
}

.slide:not(.is-current) > * {
	pointer-events: none;
}

@media (max-width: 639px) {
	.slides {
		--slide-width: calc(100% - 2rem);
		gap: 0.5rem;
	}
}

@media (prefers-reduced-motion: reduce) {
	.slide {
		transition: none;
	}
}

.arrow {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
}
</style>
