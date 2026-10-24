<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import WelfareTicker from './WelfareTicker.vue'
import { classifyActivity } from '../constants/activity-categories'
import { BANNERS, CAT_TAG, FILTERS, SORT_HINT, TYPE_TAG, VERIFY_TAG } from '../constants/app'
import { useUiStore } from '../stores/ui'
import { useWelfareStore } from '../stores/welfare'
import { openApp } from '../utils/deeplink'
import type { Activity } from '../types'

const welfare = useWelfareStore()
const ui = useUiStore()

const curFilter = ref('all')
const curSort = ref('recommend')
const searchQuery = ref('')
const expandedFilters = ref(false)
const visibleFilters = computed(() => expandedFilters.value
  ? FILTERS
  : FILTERS.filter((filter, index) => index < 7 || filter.value === curFilter.value))

// 首页数字跳动动画
const animVisits = ref(0)
const animApproved = ref(0)
let countUpTimer: ReturnType<typeof requestAnimationFrame> | undefined

function animateCount(target: number, refVal: { value: number }, duration = 800) {
  const start = refVal.value
  const diff = target - start
  if (diff === 0) return
  const startTime = performance.now()
  function step(now: number) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
    refVal.value = Math.round(start + diff * eased)
    if (progress < 1) countUpTimer = requestAnimationFrame(step)
  }
  countUpTimer = requestAnimationFrame(step)
}

function syncVisits() {
  animateCount(welfare.todayVisits, animVisits, 1000)
  animateCount(welfare.approvedCount, animApproved, 800)
}

onMounted(() => { syncVisits() })
welfare.$subscribe(() => {
  if (welfare.todayVisits !== animVisits.value || welfare.approvedCount !== animApproved.value) {
    syncVisits()
  }
})

// 用当天日期生成稳定伪随机扰动，保证同一天排序稳定、每天微变
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function linkValue(a: Activity) {
  return a.link && a.link !== '#' ? 1 : 0
}

function sortByRecommend(items: Activity[]) {
  const now = new Date()
  const daySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  return items.sort((a, b) => {
    const linkDiff = linkValue(b) - linkValue(a)
    if (linkDiff !== 0) return linkDiff
    if (b.score !== a.score) return b.score - a.score
    const ia = items.indexOf(a)
    const ib = items.indexOf(b)
    return seededRandom(daySeed * 37 + ia) - seededRandom(daySeed * 37 + ib)
  })
}

const banner = computed(() => {
  const now = new Date()
  const daySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  return BANNERS[Math.floor(seededRandom(daySeed) * BANNERS.length)]
})

const sortHint = computed(() => SORT_HINT[curSort.value] || '')

const filteredList = computed(() => {
  let items = [...welfare.activities]
  if (curFilter.value !== 'all') items = items.filter((a) => classifyActivity(a) === curFilter.value)
  const q = searchQuery.value.trim().toLowerCase()
  if (q) items = items.filter((a) => (a.title + a.description + a.entry).toLowerCase().includes(q))
  if (curSort.value === 'recommend') return sortByRecommend(items)
  if (curSort.value === 'newest') return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return items.sort((a, b) => Number(b.hot) - Number(a.hot) || b.score - a.score)
})

function tagOf(a: Activity) {
  return CAT_TAG[classifyActivity(a)] || TYPE_TAG[a.type] || { c: 'cash', l: a.category || '福利' }
}

function verifyOf(a: Activity) {
  return VERIFY_TAG[a.verify] || VERIFY_TAG.doubt
}

function displayDeadline(a: Activity) {
  const d = a.deadline
  if (d === '长期' || d.startsWith('长期')) return '长期有效'
  if (d === '无法确认') return '截止时间待确认'
  return `活动截止：${d.replace(/^至\s*/, '')}`
}

function displayTitle(a: Activity) {
  return a.status === 'pending' ? `（待审核）${a.title}` : a.title
}

function setSort(sort: string) {
  curSort.value = sort
  ui.showToast(`已切换为「${sort === 'recommend' ? '推荐' : sort === 'newest' ? '最新' : '最热'}」排序`)
}

function goClaim(a: Activity) {
  if (a.appScheme) {
    const ok = openApp(a.appScheme)
    ui.showToast(ok ? `正在唤起 ${a.source}，请确认已安装该 App` : `请按入口自行前往：${a.entry}`)
    return
  }
  if (a.link && a.link !== '#') {
    const isWx = a.link.includes('weixin.qq.com') || a.link.includes('wechat')
    window.open(a.link, '_blank')
    ui.showToast(isWx ? '已打开微信页面，可复制到微信继续' : `已打开页面：${a.entry}`)
  } else {
    ui.showToast(`请按入口自行前往：${a.entry}`)
  }
}
</script>

<template>
  <div>
    <div class="banner">
      <h1>{{ banner.t }}</h1>
      <p>{{ banner.d }}</p>
      <span class="banner-tag">本日有效福利：{{ filteredList.length }} 条</span>
    </div>

    <div class="visit-strip">
      <span class="vs-dot"></span>
      本站今天已经有 <b class="countup" :class="{ running: animVisits > 0 && animVisits < welfare.todayVisits }">{{ animVisits.toLocaleString() }}</b> 人点击进入使用
    </div>

    <WelfareTicker />

    <div class="sort-tabs">
      <span class="stab" :class="{ active: curSort === 'recommend' }" @click="setSort('recommend')">推荐</span>
      <span class="stab" :class="{ active: curSort === 'newest' }" @click="setSort('newest')">最新</span>
      <span class="stab" :class="{ active: curSort === 'hot' }" @click="setSort('hot')">最热</span>
      <span class="sort-hint">{{ sortHint }}</span>
    </div>

    <div class="filters">
      <input class="input" v-model="searchQuery" placeholder="搜索福利关键词，按Ctrl+F唤起" />
      <span
        v-for="f in visibleFilters"
        :key="f.value"
        class="chip"
        :class="{ active: curFilter === f.value }"
        @click="curFilter = f.value"
      >{{ f.label }}</span>
      <button class="chip" type="button" :aria-expanded="expandedFilters" @click="expandedFilters = !expandedFilters">{{ expandedFilters ? '收起分类' : '更多分类' }}</button>
    </div>

    <div v-if="filteredList.length" class="list">
      <div v-for="(a, i) in filteredList" :key="a.id" class="wf-item" :class="{ 'just-added': a.status === 'pending' }" @click="ui.openDetail(a)">
        <div class="wf-rank" :class="{ hot: a.hot }">{{ i + 1 }}</div>
        <div class="wf-main">
          <div class="wf-deadline-top">{{ displayDeadline(a) }}</div>
          <div class="wf-title">
            <span class="title-text">{{ displayTitle(a) }}</span>
            <span v-if="a.hot" class="tag right">热门</span>
          </div>
          <div class="wf-sub">{{ a.description }}</div>
          <div class="wf-meta">
            <span class="tag" :class="tagOf(a).c">{{ tagOf(a).l }}</span>
            <span class="tag" :class="verifyOf(a).c">{{ verifyOf(a).l }}</span>
            <span class="tag bank">{{ a.source }}</span>
          </div>
        </div>
        <div class="wf-right">
          <div class="deadline"><b>{{ a.value }}</b></div>
          <button class="btn-go btn-go-primary" @click.stop="goClaim(a)">{{ a.appScheme ? '打开 App' : (a.link && a.link !== '#' ? '去官网' : '去领取') }}</button>
          <button class="btn-go btn-go-detail" @click.stop="ui.openDetail(a)">查证详情</button>
        </div>
      </div>
    </div>

    <div v-else class="empty">
      <div class="big">暂无匹配</div>
      <div>换个关键词或分类试试</div>
    </div>
  </div>
</template>
