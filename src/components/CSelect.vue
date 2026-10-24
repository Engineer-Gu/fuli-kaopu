<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  modelValue: string
  options: { value: string; label: string }[]
  width?: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const open = ref(false)

const currentLabel = computed(() => {
  return props.options.find((o) => o.value === props.modelValue)?.label ?? props.modelValue
})

function toggle() {
  open.value = !open.value
}

function select(value: string) {
  emit('update:modelValue', value)
  open.value = false
}

function onDocumentClick() {
  open.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div class="cselect" :class="{ open }" :style="width ? { width } : undefined">
    <div class="cs-trigger" @click.stop="toggle">
      <span class="cs-label">{{ currentLabel }}</span>
      <span class="cs-arrow"></span>
    </div>
    <div class="cs-menu">
      <div
        v-for="opt in options"
        :key="opt.value"
        class="cs-opt"
        :class="{ active: opt.value === modelValue }"
        @click.stop="select(opt.value)"
      >
        {{ opt.label }}
      </div>
    </div>
  </div>
</template>
