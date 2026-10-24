<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'
import { useWelfareStore } from '../stores/welfare'

const ui = useUiStore()
const welfare = useWelfareStore()
const auth = useAuthStore()
const running = ref(false)
const changingTaskId = ref<string | null>(null)
const isAdmin = computed(() => auth.user?.role === 'admin')

async function runNow() {
  if (!isAdmin.value || running.value) return
  running.value = true
  try {
    await welfare.runDispatch()
    ui.showToast('搜索扫描已完成')
  } catch (error) {
    ui.showToast(error instanceof Error ? error.message : '搜索执行失败')
  } finally {
    running.value = false
  }
}

async function toggleTask(taskId: string, enabled: boolean) {
  if (!isAdmin.value || changingTaskId.value) return
  changingTaskId.value = taskId
  try {
    await welfare.setDispatchTask(taskId, enabled)
    ui.showToast(enabled ? '定时任务已开启' : '定时任务已关闭')
  } catch (error) {
    ui.showToast(error instanceof Error ? error.message : '任务状态更新失败')
  } finally {
    changingTaskId.value = null
  }
}

const tasks = computed(() => welfare.dispatch?.tasks ?? [])
const logs = computed(() => welfare.dispatch?.logs ?? [])

// 流水线指标：优先展示最近一次扫描的真实快照，未扫描则展示当前榜单状态
const pipeline = computed(() => {
  const run = welfare.dispatch?.lastRun
  const today = welfare.dispatch?.today
  const keywords = run?.keywords ?? today?.keywords ?? 0
  const hits = run?.hits ?? today?.hits ?? 0
  const verified = run?.verified ?? today?.verified ?? 0
  const unverified = run?.unverified ?? today?.unverified ?? 0
  return [
    { k: '词典关键词', v: `${keywords} 个`, c: '#2563eb' },
    { k: '导入活动', v: `${hits} 条`, c: '#0ea5e9' },
    { k: '已核验', v: `${verified} 条`, c: '#16a34a' },
    { k: '存疑待核实', v: `${unverified} 条`, c: '#dc2626' },
  ]
})

const lastRunText = computed(() => {
  const run = welfare.dispatch?.lastRun
  if (!run) return '尚未执行扫描'
  return `上次扫描 ${formatTime(run.createdAt)}`
})

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

onMounted(() => {
  welfare.loadDispatch().catch(() => ui.showToast('调度状态加载失败'))
})
</script>

<template>
  <div>
    <h2 class="h2">搜索调度</h2>
    <p class="desc">搜索调度按词典关键词检索全网活动并刷新流水线统计。仅管理员可手动执行扫描或调整定时任务。</p>
    <div v-if="isAdmin" class="dispatch-actions">
      <button class="btn btn-primary" :disabled="running" @click="runNow">
        {{ running ? '搜索执行中…' : '立即执行一次搜索' }}
      </button>
    </div>

    <div class="dispatch-grid">
      <div class="card panel">
        <div class="panel-title"><span class="pt-dot"></span>定时任务</div>
        <div v-for="task in tasks" :key="task.id" class="cron-row">
          <div class="t">
            <div class="tt">{{ task.name }}</div>
            <div class="ts">{{ task.description }}</div>
          </div>
          <button
            v-if="isAdmin"
            type="button"
            class="switch"
            :class="{ on: task.enabled, 'is-disabled': changingTaskId === task.id }"
            :aria-label="`${task.name}${task.enabled ? '关闭' : '开启'}`"
            :aria-pressed="task.enabled"
            :disabled="changingTaskId === task.id"
            @click="toggleTask(task.id, !task.enabled)"
          ></button>
          <span v-else class="switch is-disabled" :class="{ on: task.enabled }" aria-disabled="true" title="仅管理员可调整"></span>
        </div>
        <div class="mt">
          <span class="sort-hint" style="margin-left: 10px">{{ lastRunText }}</span>
          <span class="radar" style="margin-left: 12px; display: inline-flex; vertical-align: middle"></span>
        </div>
      </div>

      <div class="card panel">
        <div class="panel-title"><span class="pt-dot"></span>搜索运行日志</div>
        <div class="log-list">
          <div v-if="!logs.length" style="color: var(--sub); padding: 12px">暂无日志，后台扫描后可见。</div>
          <div v-for="l in logs" :key="l.id" class="log-item" :class="l.level">
            <span class="lt">{{ formatTime(l.createdAt) }}</span>
            <span class="lmsg">{{ l.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card panel mt">
      <div class="panel-title"><span class="pt-dot"></span>今日抓取与过滤流水线</div>
      <div class="row" style="gap: 16px">
        <div v-for="p in pipeline" :key="p.k" class="card" style="flex: 1; min-width: 130px; padding: 16px 18px">
          <div style="color: var(--sub); font-size: 13px">{{ p.k }}</div>
          <div class="pipeline-val" style="font-size: 24px; font-weight: 800; margin-top: 4px" :style="{ color: p.c }">{{ p.v }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
