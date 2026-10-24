<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { searchWeb } from '../services/api'
import { useUiStore } from '../stores/ui'
import { useWelfareStore } from '../stores/welfare'
import type { Activity, SearchHit } from '../types'

const ui = useUiStore()
const welfare = useWelfareStore()

const query = ref('')
const webResults = ref<SearchHit[]>([])
const webLoading = ref(false)
const webSearched = ref(false)
const webSearchedKey = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

// 元宝 AI 搜索内存缓存，同一关键词不重复消耗额度
const aiCache = new Map<string, SearchHit[]>()

// 站内福利匹配（本地实时、免费）
const localResults = computed<Activity[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return welfare.activities
    .filter((a) => (a.title + a.description + a.entry).toLowerCase().includes(q))
    .slice(0, 8)
})

// 输入变化时清空旧的全网结果，避免展示与当前关键词不符的缓存
watch(query, () => {
  if (query.value.trim() !== webSearchedKey.value) {
    webResults.value = []
    webSearched.value = false
  }
})

// 免费浏览器搜索：直接跳转百度 / 必应，不消耗任何额度
function openBrowser(engine: 'baidu' | 'bing') {
  const q = query.value.trim()
  if (!q) return
  const url =
    engine === 'baidu'
      ? `https://www.baidu.com/s?wd=${encodeURIComponent(q)}`
      : `https://www.bing.com/search?q=${encodeURIComponent(q)}`
  window.open(url, '_blank')
}

// 元宝 AI 搜索（手动触发，带缓存）
async function runAiSearch() {
  const q = query.value.trim()
  if (!q || webLoading.value) return
  const cached = aiCache.get(q)
  if (cached) {
    webResults.value = cached
    webSearched.value = true
    webSearchedKey.value = q
    return
  }
  webLoading.value = true
  webSearched.value = false
  try {
    const hits = await searchWeb(q)
    aiCache.set(q, hits)
    webResults.value = hits
    webSearched.value = true
    webSearchedKey.value = q
  } catch {
    webResults.value = []
    webSearched.value = true
    webSearchedKey.value = q
  } finally {
    webLoading.value = false
  }
}

function openLocal(a: Activity) {
  ui.closeSearch()
  ui.openDetail(a)
}

function openWeb(hit: SearchHit) {
  if (hit.url) window.open(hit.url, '_blank')
}

function close() {
  ui.closeSearch()
}

watch(
  () => ui.searchOpen,
  async (open) => {
    if (open) {
      await nextTick()
      inputEl.value?.focus()
    }
  },
)

onMounted(() => {
  if (ui.searchOpen) inputEl.value?.focus()
})
</script>

<template>
  <div class="overlay search-overlay" :class="{ show: ui.searchOpen }" @click.self="close">
    <div class="search-box">
      <div class="search-head">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
          <circle cx="11" cy="11" r="7"></circle>
          <path d="M20 20l-3.5-3.5"></path>
        </svg>
        <input
          ref="inputEl"
          v-model="query"
          class="search-input"
          placeholder="搜索福利关键词，回车元宝 AI 搜索，或用下方免费引擎…"
          @keydown.esc="close"
          @keydown.enter="runAiSearch"
        />
        <button class="search-esc" @click="close">ESC</button>
      </div>

      <div class="search-body">
        <div v-if="localResults.length" class="search-section">
          <div class="search-label">站内福利 · {{ localResults.length }} 条</div>
          <div v-for="a in localResults" :key="a.id" class="search-hit local" @click="openLocal(a)">
            <span class="sh-tag">福利</span>
            <span class="sh-title">{{ a.status === 'pending' ? '（待审核）' : '' }}{{ a.title }}</span>
          </div>
        </div>

        <div v-if="query.trim()" class="search-section">
          <div class="search-label">全网搜索</div>
          <div class="search-actions">
            <button class="sa-btn sa-btn-free" @click="openBrowser('baidu')">百度搜索</button>
            <button class="sa-btn sa-btn-free" @click="openBrowser('bing')">必应搜索</button>
            <button class="sa-btn sa-btn-ai" :disabled="webLoading" @click="runAiSearch">
              {{ webLoading ? '搜索中…' : '元宝 AI 搜索' }}
            </button>
          </div>
          <div class="search-tip-sm">免费引擎直达（不消耗额度）；元宝 AI 搜索消耗额度，已缓存避免重复</div>

          <div v-if="webLoading" class="search-empty">正在调用元宝搜索全网福利信息…</div>
          <div v-else-if="webSearched && !webResults.length" class="search-empty">全网暂无相关结果，换个关键词试试</div>
          <a v-for="hit in webResults" :key="hit.url" class="search-hit" :href="hit.url" target="_blank" rel="noopener" @click.prevent="openWeb(hit)">
            <span class="sh-tag web">{{ hit.source }}</span>
            <span class="sh-title">{{ hit.title }}</span>
            <span class="sh-passage">{{ hit.passage }}</span>
          </a>
        </div>

        <div v-if="!query.trim()" class="search-empty search-tip">
          <div>输入关键词，同时搜索「站内福利」与「全网真实活动」</div>
          <div class="search-hints">
            <span>试试：</span>
            <span v-for="k in ['云服务器', '话费', '外卖', '学生优惠', '免费AI']" :key="k" class="sh-chip" @click="query = k">{{ k }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
