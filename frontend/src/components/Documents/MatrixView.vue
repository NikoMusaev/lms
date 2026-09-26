<template>
	<figure class="space-y-2" data-testid="doc-matrix">
		<figcaption class="text-p-sm font-medium text-ink-gray-8">
			{{ view.title || __('Matrix: {0} × {1}').format(yTitle, xTitle) }}
		</figcaption>
		<div class="flex gap-2">
			<!-- The y-axis reads upwards, as the eye expects of «more likely». -->
			<div class="flex items-center">
				<span class="axis-y text-p-xs text-ink-gray-5">{{ yTitle }}</span>
			</div>
			<div class="min-w-0 flex-1">
				<div
					class="grid gap-1"
					:style="{ gridTemplateColumns: `1.5rem repeat(${grid.xs.length}, minmax(0, 1fr))` }"
				>
					<template v-for="(line, i) in grid.cells" :key="i">
						<span class="self-center text-center text-p-xs text-ink-gray-5 tabular-nums">{{
							grid.ys[i]
						}}</span>
						<div
							v-for="cell in line"
							:key="`${cell.x}-${cell.y}`"
							class="matrix-cell"
							:class="{ 'is-hot': cell.highlighted }"
							:style="{ '--heat': heat(cell.x, cell.y) }"
							:aria-label="`${yTitle} ${cell.y}, ${xTitle} ${cell.x}: ${
								cell.rows.map((r) => r.id).join(', ') || __('none')
							}`"
						>
							<button
								v-for="row in cell.rows"
								:key="row.id"
								type="button"
								class="matrix-chip"
								:title="rowTitle(row)"
								@click="$emit('pickRow', row.id)"
							>
								{{ row.id }}
							</button>
						</div>
					</template>
					<span />
					<span
						v-for="x in grid.xs"
						:key="x"
						class="text-center text-p-xs text-ink-gray-5 tabular-nums"
						>{{ x }}</span
					>
				</div>
				<div class="mt-1 text-center text-p-xs text-ink-gray-5">{{ xTitle }}</div>
			</div>
		</div>
		<p v-if="grid.unplaced.length" class="text-p-xs text-ink-gray-5">
			{{
				__('Not scored yet: {0}').format(grid.unplaced.map((r) => r.id).join(', '))
			}}
		</p>
	</figure>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
	matrix,
	titleColumn,
	type DocRow,
	type DocTable,
	type MatrixView,
} from '@/utils/documentTable'

const props = defineProps<{ table: DocTable; view: MatrixView }>()
defineEmits<{ pickRow: [id: string] }>()

const grid = computed(() => matrix(props.table, props.view))
const columnTitle = (key: string) =>
	props.table.columns.find((c) => c.key === key)?.title ?? key
const xTitle = computed(() => columnTitle(props.view.x))
const yTitle = computed(() => columnTitle(props.view.y))
const name = computed(() => titleColumn(props.table))

const rowTitle = (row: DocRow): string =>
	name.value && row[name.value.key] ? `${row.id} — ${row[name.value.key]}` : row.id

// A quiet gradient by the product: the matrix sorts, it does not alarm.
const max = computed(
	() => Math.max(...grid.value.xs) * Math.max(...grid.value.ys) || 1
)
const heat = (x: number, y: number): string => ((x * y) / max.value).toFixed(2)
</script>

<style scoped>
.axis-y {
	writing-mode: vertical-rl;
	transform: rotate(180deg);
}

.matrix-cell {
	display: flex;
	flex-wrap: wrap;
	align-content: flex-start;
	gap: 0.25rem;
	min-height: 2.75rem;
	padding: 0.25rem;
	border-radius: 0.375rem;
	background-color: color-mix(
		in srgb,
		var(--surface-amber-2) calc(var(--heat) * 100%),
		var(--surface-gray-1)
	);
}

.matrix-cell.is-hot {
	box-shadow: inset 0 0 0 1.5px var(--outline-amber-5);
}

.matrix-chip {
	padding: 0 0.375rem;
	border-radius: 0.25rem;
	font-size: 0.75rem;
	font-weight: 500;
	line-height: 1.25rem;
	color: var(--ink-gray-8);
	background-color: var(--surface-base, #fff);
	box-shadow: 0 0 0 1px var(--outline-gray-2);
}

.matrix-chip:hover {
	box-shadow: 0 0 0 1px var(--outline-gray-4);
}
</style>
