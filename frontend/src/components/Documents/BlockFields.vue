<template>
	<div class="grid gap-3 sm:grid-cols-2" data-testid="block-fields">
		<label v-for="field in fields" :key="field.key" class="block space-y-1">
			<span class="flex items-center gap-1 text-p-sm text-ink-gray-7">
				{{ field.title }}
				<span
					v-if="field.required"
					class="text-ink-red-4"
					:title="__('Required')"
					>*</span
				>
			</span>
			<select
				v-if="field.type === 'select'"
				class="field-input"
				:class="{ 'is-missing': missing(field) }"
				:value="values[field.key] ?? ''"
				@change="save(field, ($event.target as HTMLSelectElement).value)"
			>
				<option value="">—</option>
				<option v-for="o in field.options" :key="o" :value="o">{{ o }}</option>
			</select>
			<textarea
				v-else-if="field.type === 'longtext'"
				rows="3"
				class="field-input"
				:class="{ 'is-missing': missing(field) }"
				:value="(values[field.key] as string) ?? ''"
				@blur="save(field, ($event.target as HTMLTextAreaElement).value)"
			/>
			<input
				v-else
				:type="field.type === 'date' ? 'date' : 'text'"
				:inputmode="field.type === 'number' ? 'decimal' : undefined"
				class="field-input"
				:class="{ 'is-missing': missing(field) }"
				:value="values[field.key] ?? ''"
				@change="save(field, ($event.target as HTMLInputElement).value)"
				@keydown.enter.prevent=";($event.target as HTMLInputElement).blur()"
			/>
		</label>
	</div>
</template>

<script setup lang="ts">
import { isBlank, type CellValue, type DocField } from '@/utils/documentTable'

const props = defineProps<{
	fields: DocField[]
	values: Record<string, CellValue>
}>()

const emit = defineEmits<{ save: [key: string, value: CellValue] }>()

const missing = (field: DocField) =>
	Boolean(field.required) && isBlank(props.values[field.key])

function save(field: DocField, raw: string) {
	const value = raw.trim()
	if (String(props.values[field.key] ?? '') === value) return
	emit('save', field.key, value === '' ? null : value)
}
</script>

<style scoped>
.field-input {
	display: block;
	width: 100%;
	min-height: 2.25rem;
	padding: 0.4rem 0.625rem;
	font-size: 0.875rem;
	color: var(--ink-gray-9);
	background-color: var(--surface-base, #fff);
	border: 1px solid var(--outline-gray-2);
	border-radius: 0.375rem;
}

.field-input:focus {
	outline: 2px solid var(--outline-gray-4);
	outline-offset: -1px;
}

.field-input.is-missing {
	border-color: var(--outline-red-3);
	background-color: var(--surface-red-1);
}
</style>
