<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useWelfareStore } from '../stores/welfare'
import { useUiStore } from '../stores/ui'

const welfare = useWelfareStore()
const ui = useUiStore()

function cleanText(text: string): string {
  return text.replace(/\uFFFD/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim()
}

// 轮播首页全部活动，保留审核与核验状态，不限制数量。
const items = computed(() => {
  const messages = welfare.activities.map(activity => {
    const title = cleanText(activity.title) || '未命名活动'
    const status = activity.status === 'pending'
      ? '待审核'
      : activity.verify === 'verified' ? '站内标记为已核验' : '存疑'
    return { activity, text: `「${title}」${status}，点击查看福利详情` }
  })
  return messages
})

const activeIndex = ref(0)
const hovered = ref(false)
const hidden = ref(false)
const isPaused = computed(() => hovered.value || hidden.value)
const currentItem = computed(() => items.value[activeIndex.value] ?? items.value[0])
const currentText = computed(() => currentItem.value?.text ?? '暂无活动，添加活动后将在这里自动轮播')

function openCurrentActivity() {
  if (currentItem.value) ui.openDetail(currentItem.value.activity)
}
let timer: ReturnType<typeof setInterval> | undefined
let mounted = false

function stop() {
  if (timer !== undefined) clearInterval(timer)
  timer = undefined
}

function restart() {
  stop()
  if (!mounted || isPaused.value || items.value.length < 2) return
  timer = setInterval(() => {
    activeIndex.value = (activeIndex.value + 1) % items.value.length
  }, 2800)
}

function syncVisibility() {
  hidden.value = document.hidden
}

// 更新消息时保留当前内容，不重新开始计时，避免频繁刷新导致一直停在第一条。
watch(items, (messages, previous) => {
  const id = previous[activeIndex.value]?.activity.id
  const index = messages.findIndex(message => message.activity.id === id)
  activeIndex.value = index >= 0 ? index : Math.max(0, Math.min(activeIndex.value, messages.length - 1))
})
watch(isPaused, restart)
watch(() => items.value.length > 1, restart)

onMounted(() => {
  mounted = true
  syncVisibility()
  document.addEventListener('visibilitychange', syncVisibility)
  restart()
})
onBeforeUnmount(() => {
  mounted = false
  stop()
  document.removeEventListener('visibilitychange', syncVisibility)
})
</script>

<template>
  <section
    class="live-ticker"
    aria-label="全部活动动态"
    :class="{ 'is-paused': isPaused }"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <span class="live-ticker-label">{{ isPaused ? '悬停' : '动态' }}</span>
    <div class="live-ticker-track" aria-live="off">
      <!-- 始终只渲染一条消息，禁止多条绝对定位叠放及并行循环动画。 -->
      <button
        v-if="currentItem"
        :key="currentItem.activity.id"
        class="live-ticker-item live-ticker-link"
        type="button"
        :title="currentText"
        @click="openCurrentActivity"
      >{{ currentText }}</button>
      <div v-else class="live-ticker-item">{{ currentText }}</div>
    </div>
  </section>
</template>

<style scoped>
.live-ticker {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  min-width: 0;
  padding: 10px 16px;
  margin-bottom: 16px;
  background: linear-gradient(90deg, var(--green-bg), var(--blue-bg));
  border: 1px solid var(--line);
  border-radius: 10px;
}
.live-ticker-label {
  flex-shrink: 0;
  min-width: 51px;
  box-sizing: border-box;
  text-align: center;
  padding: 2px 9px;
  border-radius: 6px;
  background: var(--green);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}
.live-ticker-track {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.live-ticker-item {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
  line-height: 24px;
  color: var(--sub);
  animation: tickerEnter 380ms cubic-bezier(0.22, 1, 0.36, 1);
}
.live-ticker-link {
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}
.live-ticker-link:hover {
  color: var(--brand);
  text-decoration: underline;
}
.live-ticker-link:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: -2px;
}
.is-paused .live-ticker-label {
  background: var(--sub);
}
@keyframes tickerEnter {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .live-ticker-item { animation: none; }
}
</style>
