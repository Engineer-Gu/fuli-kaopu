<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  adminActivities, adminApproveDictWord, adminDashboard, adminDeleteActivity, adminDeleteGuide,
  adminDictWords, adminGuides, adminRejectDictWord, adminSetActivityStatus, adminSetGuideStatus,
} from '../services/api'
import { useUiStore } from '../stores/ui'
import type { AdminActivity, AdminDashboard, AdminDictWord, AdminGuide } from '../types'

const ui = useUiStore()

type Tab = 'words' | 'activities' | 'guides'

const activeTab = ref<Tab>('words')
const dashboard = ref<AdminDashboard | null>(null)
const words = ref<AdminDictWord[]>([])
const activities = ref<AdminActivity[]>([])
const guides = ref<AdminGuide[]>([])
const loading = ref(false)

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

async function load() {
  loading.value = true
  try {
    dashboard.value = await adminDashboard()
    const tab = activeTab.value
    if (tab === 'words') words.value = await adminDictWords()
    if (tab === 'activities') activities.value = await adminActivities()
    if (tab === 'guides') guides.value = await adminGuides()
  } catch (e) {
    ui.showToast(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function switchTab(tab: Tab) {
  activeTab.value = tab
  await load()
}

async function approveWord(w: AdminDictWord) {
  try {
    await adminApproveDictWord(w.id)
    w.status = 'approved'
    ui.showToast(`已通过关键词「${w.kw}」`)
    refreshDashboard()
  } catch (e) {
    ui.showToast(e instanceof Error ? e.message : '操作失败')
  }
}

async function rejectWord(w: AdminDictWord) {
  if (!confirm(`确认删除关键词「${w.kw}」？此操作不可恢复。`)) return
  try {
    await adminRejectDictWord(w.id)
    words.value = words.value.filter((item) => item.id !== w.id)
    ui.showToast(`已删除关键词「${w.kw}」`)
    refreshDashboard()
  } catch (e) {
    ui.showToast(e instanceof Error ? e.message : '操作失败')
  }
}

async function toggleActivity(a: AdminActivity) {
  const next = a.status === 'approved' ? 'pending' : 'approved'
  try {
    await adminSetActivityStatus(a.id, next)
    a.status = next
    ui.showToast(next === 'approved' ? '活动已通过审核' : '活动已退回待审核')
    refreshDashboard()
  } catch (e) {
    ui.showToast(e instanceof Error ? e.message : '操作失败')
  }
}

async function deleteActivity(a: AdminActivity) {
  if (!confirm(`确认删除活动「${a.title}」？此操作不可恢复。`)) return
  try {
    await adminDeleteActivity(a.id)
    activities.value = activities.value.filter((item) => item.id !== a.id)
    ui.showToast('活动已删除')
    refreshDashboard()
  } catch (e) {
    ui.showToast(e instanceof Error ? e.message : '操作失败')
  }
}

async function toggleGuide(g: AdminGuide) {
  const next = g.status === 'approved' ? 'pending' : 'approved'
  try {
    await adminSetGuideStatus(g.id, next)
    g.status = next
    ui.showToast(next === 'approved' ? '攻略已通过审核' : '攻略已退回待审核')
    refreshDashboard()
  } catch (e) {
    ui.showToast(e instanceof Error ? e.message : '操作失败')
  }
}

async function deleteGuide(g: AdminGuide) {
  if (!confirm(`确认删除攻略「${g.title}」？此操作不可恢复。`)) return
  try {
    await adminDeleteGuide(g.id)
    guides.value = guides.value.filter((item) => item.id !== g.id)
    ui.showToast('攻略已删除')
    refreshDashboard()
  } catch (e) {
    ui.showToast(e instanceof Error ? e.message : '操作失败')
  }
}

async function refreshDashboard() {
  dashboard.value = await adminDashboard()
}

onMounted(load)
</script>

<template>
  <div>
    <h2 class="h2">管理后台</h2>
    <p class="desc">审核用户提交的关键词、福利活动和省钱攻略；仅管理员可见。</p>

    <div v-if="dashboard" class="stats" style="margin-bottom: 20px">
      <div class="stat"><div class="label">待审关键词</div><div class="num">{{ dashboard.dictWords.pending }}</div><div class="trend">共 {{ dashboard.dictWords.total }} 个</div></div>
      <div class="stat"><div class="label">待审活动</div><div class="num">{{ dashboard.activities.pending }}</div><div class="trend">共 {{ dashboard.activities.total }} 条</div></div>
      <div class="stat"><div class="label">待审攻略</div><div class="num">{{ dashboard.guides.pending }}</div><div class="trend">共 {{ dashboard.guides.total }} 条</div></div>
      <div class="stat"><div class="label">用户数</div><div class="num">{{ dashboard.users }}</div><div class="trend">注册用户总数</div></div>
    </div>

    <div class="submit-tabs" style="margin-bottom: 16px">
      <button class="submit-tab" :class="{ active: activeTab === 'words' }" @click="switchTab('words')">关键词审核</button>
      <button class="submit-tab" :class="{ active: activeTab === 'activities' }" @click="switchTab('activities')">活动审核</button>
      <button class="submit-tab" :class="{ active: activeTab === 'guides' }" @click="switchTab('guides')">攻略审核</button>
    </div>

    <div v-if="loading" class="empty"><div class="big">加载中</div></div>

    <div v-else-if="activeTab === 'words'" class="list">
      <div v-for="w in words" :key="w.id" class="card panel admin-row">
        <div class="admin-main">
          <div class="admin-title">{{ w.kw }}</div>
          <div class="admin-meta">
            <span class="tag" :class="w.status === 'approved' ? 'verify' : 'doubt'">{{ w.status === 'approved' ? '已通过' : '待审核' }}</span>
            <span class="tag quota">{{ w.cat }}</span>
            <span class="admin-time">{{ formatTime(w.createdAt) }}</span>
          </div>
        </div>
        <div class="admin-actions">
          <button v-if="w.status !== 'approved'" class="btn btn-primary btn-sm" @click="approveWord(w)">通过</button>
          <button class="btn btn-ghost btn-sm" @click="rejectWord(w)">删除</button>
        </div>
      </div>
      <div v-if="!words.length" class="empty"><div class="big">暂无关键词</div></div>
    </div>

    <div v-else-if="activeTab === 'activities'" class="list">
      <div v-for="a in activities" :key="a.id" class="card panel admin-row">
        <div class="admin-main">
          <div class="admin-title">{{ a.title }}</div>
          <div class="admin-meta">
            <span class="tag" :class="a.status === 'approved' ? 'verify' : 'doubt'">{{ a.status === 'approved' ? '已通过' : '待审核' }}</span>
            <span class="tag quota">{{ a.category }}</span>
            <span class="tag bank">{{ a.source }}</span>
            <span class="admin-time">{{ formatTime(a.createdAt) }}</span>
          </div>
        </div>
        <div class="admin-actions">
          <button class="btn btn-ghost btn-sm" @click="toggleActivity(a)">{{ a.status === 'approved' ? '退回' : '通过' }}</button>
          <button class="btn btn-ghost btn-sm" @click="deleteActivity(a)">删除</button>
        </div>
      </div>
      <div v-if="!activities.length" class="empty"><div class="big">暂无活动</div></div>
    </div>

    <div v-else class="list">
      <div v-for="g in guides" :key="g.id" class="card panel admin-row">
        <div class="admin-main">
          <div class="admin-title">{{ g.title }}</div>
          <div class="admin-meta">
            <span class="tag" :class="g.status === 'approved' ? 'verify' : 'doubt'">{{ g.status === 'approved' ? '已通过' : '待审核' }}</span>
            <span class="tag" :class="g.tone === 'warn' ? 'doubt' : 'quota'">{{ g.category }}</span>
            <span class="admin-time">{{ formatTime(g.createdAt) }}</span>
          </div>
        </div>
        <div class="admin-actions">
          <button class="btn btn-ghost btn-sm" @click="toggleGuide(g)">{{ g.status === 'approved' ? '退回' : '通过' }}</button>
          <button class="btn btn-ghost btn-sm" @click="deleteGuide(g)">删除</button>
        </div>
      </div>
      <div v-if="!guides.length" class="empty"><div class="big">暂无攻略</div></div>
    </div>
  </div>
</template>

<style scoped>
.admin-row { display: flex; align-items: center; gap: 16px; padding: 14px 16px; }
.admin-main { flex: 1; min-width: 0; }
.admin-title { font-weight: 600; font-size: 14px; margin-bottom: 6px; overflow-wrap: anywhere; }
.admin-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.admin-time { font-size: 12px; color: var(--muted); }
.admin-actions { display: flex; gap: 8px; flex-shrink: 0; }
@media (max-width: 640px) {
  .admin-row { flex-direction: column; align-items: stretch; }
  .admin-actions { justify-content: flex-end; }
}
</style>
